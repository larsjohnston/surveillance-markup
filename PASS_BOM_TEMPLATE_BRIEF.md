# Pass: Complete BOM — two-tier heading template

## Goal (tightened)

Every device a user can place on a floor plan, from any left-pane heading, lands in the
BOM with a correct, pageMultiplier-aware quantity — and the BOM renders under a fixed
**two-tier heading template** (5 major sections, each with named sub-sections) that mirrors
the real customer deliverable (`BOM_2_5_2025.pdf`). Nothing placeable is silently dropped.

---

## The template — heading structure

Tier-1 (major) headings are fixed and always render in this order. Tier-2 sub-headings
render only when they have ≥1 line (zero-qty groups omitted, current behavior).

### 1. Cameras & Surveillance
- **1.1 Cameras and Networking** — cameras, network switches, bridges, CMVR/NVR, mounting hardware
  - feeds from tool: `cameras` + `recording` + `network` sections
  - sample lines: `Outdoor Vandal Dome 4Mpix … (36)`, `Network Switch SW10g 8-Port PoE+ (6)`, `CMVR 520 64TB Raw/48TB Useable (2)`

### 2. Access Control & Intercom
- **2.1 Access Control** — readers, reader boards, controllers, Trove, expansion chassis, transmitters/receivers
  - feeds from tool: `accessControl` (readers + controllers)
  - sample lines: `Single gang dual-tech reader, Brivo Mobile Pass, black (14)`, `2-Reader Main Board – Brivo (6)`, `Trove integrated access & power, 1–8 / 16-door (1)`, `Brivo ACS6100 Large Expansion Chassis (9)`, `WRR-22 Long-Range Receiver (1)`, `Brivo ACS300 IP/WiFi controller (1)`
- **2.2 Overhead Door and Intercom** — barrier-free / overhead door operators, video intercom, **credentials**
  - feeds from tool: `smartApartment` (intercom) + door operators + `accessControl` (credentials)
  - sample lines: `Video Intercom (1)`, `Brivo Smart KeyFob EV3 credential (32)`
  - note: REX, door contacts, and electric strikes moved to §5.1 Security Hardware

### 3. Parcel Lockers & Mailboxes
- **3.1 Parcel and Mailboxes** — parcel locker banks, mailbox banks
  - feeds from tool: `smartApartment` (parcel + mailbox)
  - (no parcel/mailbox lines in the sample PDF; section hides when empty)

### 4. Smart Suites
- **4.1 Smart Suites** — in-unit IoT: gateway, locks/keypads, thermostats, leak/water sensors, suite passage hardware
  - feeds from tool: `smartApartment` (in-unit IoT, per-unit-type counts)
  - sample lines: `Brivo Smart Suite Gateway, Z-Wave (314)`, `Z-Wave Multifamily Keypad (314)`, `Z-Wave Thermostat (314)`, `Z-Wave Water/Leak Sensor (1099)`, `Halifax Square Rose Passage Set, matte black (314)`

### 5. Door Hardware
All three sub-sections feed from the Door Hardware Module output.
- **5.1 Security Hardware** — electrified / security-rated opening hardware: electric strikes, REX/exit detectors, door position contacts, exit/panic devices, maglocks, electrified locksets
  - sample lines: `T.Rex Exit Detector + mounting plate (10)`, `Steel Door Contact + channel magnet (19)`, `Surface Mount Door Contact (1)`, `HES 5200/9500 Electric Strike Gr.1 (15)`
- **5.2 Door Hardware** — mechanical: locksets, hinges, closers, stops, kick plates, passage sets
  - sample lines: `Accentra 4600LN Storeroom SFIC, black suede (200)`, `Accentra 4600LN Passage, black suede (100)`
- **5.3 Key System** — cylinders, master keying, key-system design & install
  - sample lines: `Medeco SFIC Cylinders MK w/2 keys (200)`, `Master Key System Design & Install (1)`

---

## Engineering implications

- **This regroups the current flat 6-section BOM** (`cameras / recording / network /
  accessControl / smartApartment / other`) into a 2-tier hierarchy.
- **`smartApartment` gets split THREE ways:** intercom → §2.2, parcel+mailbox → §3.1,
  in-unit IoT → §4.1. The single `smartApartment` section no longer maps to one heading.
- **`cameras + recording + network` merge** under one tier-1 (§1) as a single
  "Cameras and Networking" sub-section.
- **Credentials move** from Access Control to §2.2 (per your instruction) — currently the
  `accessControl` auto-rows emit a credentials row alongside readers.
- **Door Hardware becomes a top-level BOM tier-1** (§5), fed by the Door Hardware Module,
  not the placed-device pipeline.

## Coverage gaps this surfaces (carryover from the goal)

- **Placed Network switch** (`switches[]`) emits no BOM row — only the camera-count-derived
  auto switch exists. §1.1 must reconcile placed vs. derived without double-count.
- **Placed head-end** has no standalone equipment line.
- **In-unit IoT is capped at 3 types** (Smart Lock / Thermostat / Water Sensor). The sample
  §4 needs at least: gateway, keypad, thermostat, water sensor, suite passage set — i.e. the
  IoT-type list must expand for §4 to match the real deliverable.
- **Mailbox rows carry no SKU/model.**

## Open decisions (confirm before this becomes canonical)

1. **Credentials under §2.2 (Overhead Door and Intercom)** — confirmed per your note, but the
   source PDF files them under Access Control. Keeping them in §2.2 as you specified.
2. **What "Overhead Door" includes** — now scoped to barrier-free / overhead door *operators* +
   video intercom + credentials. The security-rated door hardware (REX, contacts, strikes) is
   §5.1, not §2.2.
3. **Parcel as its own tier-1 (§3)** — the PDF groups parcel under "Intercom & Parcel Control
   System." You've split parcel+mailbox into §3. Confirmed.
4. **IoT-type expansion** — in scope for this pass (needed for §4 to match), or split out?
5. **Door Hardware tier-2s** — set to Security Hardware (5.1) / Door Hardware (5.2) / Key System
   (5.3) per your instruction. Confirm the Module can classify its lines into these three buckets
   (vs. its current manufacturer/opening grouping).
6. **§5.1 Security Hardware sourcing — RESOLVED.** REX, door contacts, electric strikes live in
   §5.1 (confirmed). They must NOT also emit in §2.2. Whatever tool path produces them (Door
   Hardware Module takeoff, or the AC pipeline) must route to §5.1 only.
