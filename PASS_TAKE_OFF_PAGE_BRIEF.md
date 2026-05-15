# Pass: Take-Off Page (PDF Export Section)

## Context

A take-off (or "schedule of quantities") is a standard deliverable in commercial bid documents. It's a tabular page that summarizes every device, length, and labor item proposed for a project — used by competing integrators, project managers, and procurement teams to verify bid completeness and compare across vendors.

Today's proposal PDF has 4 page types: Cover / BOM / Riser / Floor Plan Markups. The take-off page would be a 5th type, slotted between BOM and Riser.

The BOM is customer-facing ("here's what it costs"). The take-off is integrator-facing ("here's what's being installed"). Different audience, different content, different formatting.

## What the take-off shows

A single tabular page (or multi-page if quantities are large) with these rows, grouped:

### Section 1 — Cameras
| Floor | Label | Brand | Model | Type | Mount | Resolution | FOV | Reach (m) |

### Section 2 — Access Control
| Floor | Label | Brand | Model | Type | Subcategory | Variant |

### Section 3 — Smart Apartment
| Floor | Label | Brand | Model | Type | Variant |

### Section 4 — Suites
| Floor | Label | Unit Type | Bedrooms | Bathrooms |

### Section 5 — Head-End Equipment
| Floor | Label | Type | Model |

### Section 6 — Cabling Summary
- Total camera cable runs: N
- Total reader cable runs: N (when Pass N.5 adds reader cables)
- Total length (m): X
- Average run length (m): X

### Section 7 — Labor Summary
- Camera install hours: N × 1.5 = X
- Reader install hours: N × Y = X
- Configuration & commissioning: N hours
- Total: N hours

## What the take-off does NOT show

- Prices (those are on the BOM)
- Manufacturer wholesale cost
- Project margin / taxes
- Customer-facing prose ("our team will...")

## Format

- US Letter portrait (matching existing PDF pages)
- Tabular: monospace font (`Courier New` to match existing aesthetic), thin borders, alternating row shading
- Header row in dark navy with white text (matching existing schedule header style)
- Subsection headers in red accent (matching cover summary GRAND TOTAL color)
- Page break: automatic when content exceeds page height; multi-page take-off gets "Page N of M" footer

## Export integration

- Pass A.6 added per-section export toggles in the export modal
- Take-off gets a new toggle: ☑ Take-Off Page (default ON)
- Section order in PDF export: Cover → BOM → Take-Off → Riser → Floor Plans
- Take-off section toggle: when off, page is skipped; when on, page renders

## Scope (milestones)

### M1 — Data extraction helpers

- New `buildTakeOffData()` function: returns structured data for each section
- Reuses existing `computeRiserModel()` for zone iteration and counts
- Pulls camera fields: brand, model, type, mount height, resolution, FOV, reach
- Pulls AC fields: subcategory, variant, sku, label
- Pulls smart apartment fields: type, model, variant
- Pulls suite fields: unit type, bedrooms, bathrooms
- Pulls head-end fields: NVR / Switch / UPS labels and models
- Pulls cable run totals from existing cable-routing computation

### M2 — Take-off page draw

- New `drawTakeOffPage(doc)` function
- Title header (matching cover/BOM/riser style)
- Six sections with their own subheaders
- Row rendering with column-aligned data
- Page break logic when content overflows
- Footer with page numbering

### M3 — Export integration

- Add `'takeOff'` to `projectInfo.proposalSections` (default ON)
- Update export modal HTML to include the new toggle
- Update PDF generation flow to insert take-off page between BOM and Riser
- Update Pass A.6 first-used logic to acknowledge take-off as a content-bearing section
- Update export-empty alert to consider take-off content too

### M4 — Visual review + polish

- Verify table column widths fit largest expected values without truncation
- Verify multi-page behavior with a project containing 100+ devices
- Verify alignment looks correct alongside the cover, BOM, and riser pages
- Add take-off page to the existing visual regression spot-checks

## Constraints

- No new dependencies
- US Letter portrait only (matching existing PDF format)
- Monospace font + flat aesthetic, no decorative graphics
- Take-off must work for any project state — cameras only, AC only, smart apartment only, suites only, or any combination
- Take-off section must be skippable via the export modal toggle

## Test cases

- Project with cameras only → take-off shows Cameras section + Labor Summary; other sections hidden or note "None placed"
- Project with mixed cameras + AC + smart apartment + suites → all sections populated
- Project with 100+ devices → take-off paginates correctly with "Page N of M" footer
- Empty project → take-off page skipped (matches Pass N export-gate logic)
- Toggle off in export modal → no take-off page in resulting PDF
- Subsection ordering: cameras → AC → smart apt → suites → head-end → cabling → labor

## Out of scope

- Take-off as a separate exportable file (Excel, CSV) — future enhancement if requested
- Take-off translation / multi-language support
- Take-off with embedded thumbnails of camera FOV cones
- Per-floor take-off rollups (the BOM already does counts by category)
- Custom row ordering beyond the documented section order
