# Pass C: Calibration-Aware Cone Rendering

## Context

The tool's FOV cones don't resize when the page calibration changes. This was discovered during Pass B testing.

Root cause: `cam.reach` is stored as pixels at placement time. The cone-drawing function uses `cam.reach × viewScale` for the rendered cone radius. When the user calibrates a page (typed scale or two-point), `pixelsPerMeter` updates but `cam.reach` doesn't — so cones stay at whatever pixel size they were at placement, regardless of real-world coverage.

In DORI mode, cones DO scale correctly because that path computes radii live from `pixelsPerMeter × DORI distance in meters`. But DORI mode is off by default, and most users never turn it on.

This is a meaningful design issue. The user's original feedback ("FOV is now linked to manufacturer spec but the scale is off") was about exactly this. Pass B added typed-scale calibration but the cone math still doesn't respond to calibration. This PR fixes that.

## What changes for the user

**Today:**
1. Place a camera on uncalibrated drawing → cone shows at default pixel size
2. Calibrate the page → cone size doesn't change
3. Cone still shows at old pixel size, regardless of real-world reach

**After this PR:**
1. Place a camera → cone reflects manufacturer-spec reach in real-world meters
2. Calibrate the page → cone immediately resizes to match real-world coverage
3. Recalibrate (e.g., switch from typed scale to two-point measurement) → cone resizes again
4. Switch pages → cone size adjusts based on each page's calibration

## Data model change

`cam.reach` is currently a stored pixel value (e.g., `150` meaning "150 pixels at the current viewScale at placement time"). Change it to meters.

**Before:**
```javascript
cam = {
  ...,
  reach: 150,  // pixels
  fov: 75      // degrees
}
```

**After:**
```javascript
cam = {
  ...,
  reachM: 30,  // meters (e.g., 100 ft of reach for an outdoor camera)
  fov: 75      // degrees (unchanged)
}
```

Two design decisions baked in:

1. **Meters as the canonical unit.** Convert at render time and at user-input time using `cam.page`'s calibration. Avoids dual storage.

2. **Don't migrate `cam.reach` from old saves.** The old pixel value is meaningless without knowing the calibration at placement. Migration would silently produce wrong values. Instead: when loading an old save, give every camera a default `reachM` based on its model spec (or a sensible default for custom cameras). User sees correct cones; the old pixel value is discarded.

JSON format bumps to v13 (assuming Pass A.7 hasn't shipped yet). If A.7 takes v13 first, this becomes v14. The version bump is for the data shape change.

## Default reach values

For DB models, look up the spec's reach:

```javascript
var spec = CAMERA_DB[cam.model];
cam.reachM = spec ? spec.reachM : 30;  // default to 30m for custom cameras
```

For custom cameras (no model), default to 30 meters (~100 ft) — a reasonable middle-ground for an indoor camera. User can edit via the right panel.

## Math at render time

Replace the cone-drawing math:

**Before (non-DORI path):**
```javascript
var reachPx = cam.reach * viewScale;
```

**After:**
```javascript
var ppm = getPPM(cam.page);
var reachPx;
if (ppm) {
  reachPx = cam.reachM * ppm * viewScale;
} else {
  // Page uncalibrated: fall back to a default visual size that doesn't claim accuracy
  reachPx = cam.reachM * DEFAULT_PIXELS_PER_METER * viewScale;
  // DEFAULT_PIXELS_PER_METER is a reasonable visual placeholder, e.g., 30 px/m
  // The discoverability banner already nags the user about this case.
}
```

The DORI path doesn't need to change — it already works correctly.

The same math applies to:
- `getCameraReachPx(cam, pageIdx)` (used by hit-testing, blind-mode, heatmap, rotate-handle)
- `drawCamCone` non-DORI path
- Any other site that converts cam reach to a pixel radius

## Right-panel reach input

The right-panel currently has a "Reach" slider that ranges 20–600 in pixels. After this PR, the slider becomes a real-world distance.

**Imperial pages** (calibration unit `'ft'`): slider shows feet, 10 ft to 500 ft, increment 5 ft. Default value is `cam.reachM × 3.281` (meters → feet).

**Metric pages** (calibration unit `'m'`): slider shows meters, 5 m to 150 m, increment 1 m. Default value is `cam.reachM`.

When the user adjusts the slider, write back to `cam.reachM` (converting from feet if Imperial). Mirror this for the FOV input — that one stays as degrees, no change needed.

The slider's unit suffix in the panel updates based on calibration unit:
- Imperial: "100 ft"
- Metric: "30 m"

If the page is uncalibrated, default to Imperial display (100 ft default) and let the user adjust. After calibration, the slider auto-converts.

## Backwards compatibility

Loading old saves (v9-v12 with `cam.reach` in pixels):

1. Read each camera's `reach` field (old)
2. Discard it (don't try to derive `reachM` from it — calibrations may differ)
3. Look up the camera's model and use the spec's `reachM`
4. For custom cameras (no model), default to 30 meters
5. Save going forward as v13 with `reachM`

This means a project saved before Pass C, when reloaded, may have visually different cones than before — because the cones now reflect real-world reach instead of placement-time pixel reach. That's the point of the fix. Users will see correct cones, even if it's a one-time visual change.

Add a one-time info banner on first load of a v9-v12 file: "Camera reach values updated to reflect manufacturer specs. FOV cones now scale to real-world coverage."

## Edge cases

**Page never calibrated, user adjusts reach slider.**
The slider works in feet/meters of intent. Cone renders using DEFAULT_PIXELS_PER_METER as a placeholder. When the page is later calibrated, the cone snaps to the correct real-world size. No data loss.

**User changes calibration on a page that already has cameras.**
All cameras on that page resize immediately. The user's existing reach values (in meters) are preserved.

**Same camera duplicated to a different page.**
`cam.page` changes, calibration on the new page applies. Cone resizes to match the new page's calibration.

**Calibration unit changes (e.g., user switches from imperial to metric).**
`cam.reachM` is the same; the slider display unit changes. Math is unchanged.

## Out of scope

- Per-page reach overrides (a camera with the same model on two pages always has the same `cam.reachM`)
- Auto-recalibration when manufacturer spec changes (one-time spec lookup at placement is fine)
- Letting user choose reach as a function of focal length (too complex for now)

## Constraints

- Don't change FOV (degrees) — already calibration-independent
- Don't change DORI mode rendering — already correct
- Don't change cable run math — already uses `getPPM` for length calculations
- The data migration is one-way: v13 saves use `reachM`. Loading v13 in older code would crash, but that's expected for forward-incompatible changes.

## Process

1. Read camera_markup_tool.html and CLAUDE.md.
2. Lay out implementation as a numbered checklist before edits. Confirm with me.
3. Execute in this order:
   a. Add `reachM` to data model. Default it on placement (`addCamera`) using `CAMERA_DB[model].reachM` or 30m for custom. Bump JSON to v13.
   b. Backwards-compat in `applyProjectState`: when loading v9-v12, derive `cam.reachM` from model spec or default 30m. Discard old `cam.reach`. Show one-time info banner.
   c. Add `DEFAULT_PIXELS_PER_METER` constant near the top of the script.
   d. Update `getCameraReachPx(cam, pageIdx)`: read `getPPM(pageIdx)` → if calibrated, `cam.reachM × ppm`; else `cam.reachM × DEFAULT_PIXELS_PER_METER`. This change cascades to drawCamCone, blind/heatmap wedges, rotate-handle hit-test, and anywhere else that converts reach to pixels.
   e. Update right-panel reach slider: range and unit display switch on calibration unit (`getCalibUnit(cam.page)`). Slider value reads/writes `cam.reachM` with conversion if Imperial.
   f. Verify FOV cones resize on calibration change for non-DORI mode.
4. JS syntax check after each step.
5. Tell me what to test.

## Test cases

- Place a camera (e.g., Eagle Eye DD08, spec reach 45m) on uncalibrated page → cone renders at default visual size
- Calibrate the page (typed or two-point) → cone immediately resizes to 45m of real coverage
- Switch to a page calibrated at a different ratio → cone resizes to that calibration
- Right-panel slider on imperial page shows reach in feet (e.g., "148 ft" for 45m)
- Right-panel slider on metric page shows reach in meters (e.g., "45 m")
- Adjust slider → cam.reachM updates → cone resizes
- Switch from imperial to metric calibration on same page → slider unit changes, cone size unchanged (because reachM is preserved)
- Load a v11 save → all cameras get correct reachM from model spec → cones reflect real coverage → one-time info banner appears
- Save a v13 file → reload → reachM persists, cones correct
- DORI mode still works correctly (no regression)
- Hit-testing (clicking near a camera's edge to select it) still works at the new cone radius
