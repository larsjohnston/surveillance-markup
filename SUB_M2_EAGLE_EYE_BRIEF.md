# SUB-M2 — Eagle Eye per-camera VMS subscription

## Summary
Adds a per-camera Eagle Eye VMS cloud-recording subscription line to the SQ
MATERIALS "6. Subscriptions" section as a new "6.2 Camera VMS" sub-section.

## Behaviour
- Qty = canvas camera count via multipliedTotal(cameras) (matches BOM camera row qty).
- SKU = EN-PR1-D{retention}{term}; retention ∈ {30,60,90,180,365,730},
  term suffix -1 (monthly) / -12 (annual) via _subTermSuffix().
- New project-wide projectInfo.cameraStorageRetention (default '30').
- 6.2 header: retention pill (30/60/90/180/365/730 Day) left, Monthly/Annual term pill right.
- Per-line sell override + amber reset reuse existing subscriptionOverrides path.
- Desc cleaner extended: strip trailing parenthetical + term word from EN-PR1 notes
  ("…Cloud Recording (24x7…) Monthly" → "…Cloud Recording"). AC rows unaffected.
- Web proposal: Eagle Eye rolls into the existing single generic subscription line
  (no separate customer-facing line).

## Schema
- v29 → v30: projectInfo.cameraStorageRetention. applyProjectState defaults '30' on older saves.

## Touch-points
- projectInfo init: cameraStorageRetention
- _subRetention() + _CAM_RET_VALID
- computeSubscriptionRows(): EN-PR1 push gated on camCount > 0
- _subRenderRetentionPill() + _subSetRetention()
- Subscriptions renderer split into 6.1 Access Control + 6.2 Camera VMS, each own subtotal
- _subRenderRow desc cleaner: strip-from-first-paren
- applyProjectState backfill
- CSS .sub-retention-pill / .sub-ret-btn (.active matches term pill blue)
- save version literals v30 (autosave + full save)
