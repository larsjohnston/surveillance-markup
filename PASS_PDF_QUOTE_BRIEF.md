# Pass Brief — PDF Quote Page

**Branch:** `sq-pdf-quote` (off main at `1e13c36`)  
**Scope:** Add Security Quote (Summary view) as an optional page in the proposal PDF export.  
**File:** `camera_markup_tool.html` only. Surgical edits — do not touch any existing PDF page function.

---

## Overview

The on-screen SQ wizard's SUMMARY step renders combined HW + Labour sell prices per line. This pass renders those same values as a static jsPDF page (`drawProposalQuote`) and wires it into the export modal + `runExportPDF`.

Customer-facing columns (always shown in PDF regardless of on-screen column-hide state):
**Qty · SKU · Description · Extended HW · Extended Labour · Total · GM%**

---

## Change 1 — Export modal markup

Find the exact string:
```
<label><input type="checkbox" id="export-takeoff" oninput="updateExportAllDisabledHint()" checked> Take-Off Page</label>
```

Insert immediately after it (before the Hardware Schedule label):
```html
<label><input type="checkbox" id="export-quote" oninput="updateExportAllDisabledHint()" checked> Security Quote</label>
```

---

## Change 2 — openExportModal: read checkbox state

Find:
```js
document.getElementById('export-takeoff').checked = sec.takeOff !== false;
```

Insert immediately after:
```js
document.getElementById('export-quote').checked   = sec.quote   !== false;
```

---

## Change 3 — updateExportAllDisabledHint: include quote in anyOn

Find:
```js
var anyOn = ['export-cover','export-bom','export-takeoff','export-riser','export-hardware','export-plans']
```

Replace with:
```js
var anyOn = ['export-cover','export-bom','export-takeoff','export-quote','export-riser','export-hardware','export-plans']
```

---

## Change 4 — runExportPDF: read + persist quote opt

Find:
```js
    takeOff:     document.getElementById('export-takeoff').checked,
```

Insert immediately after:
```js
    quote:       document.getElementById('export-quote').checked,
```

Find:
```js
  projectInfo.proposalSections = {
    cover:    opts.cover,
    bom:      opts.bom,
    takeOff:  opts.takeOff,
    riser:    opts.riser,
    hardware: opts.hardware,
    plans:    opts.plans
  };
```

Replace with:
```js
  projectInfo.proposalSections = {
    cover:    opts.cover,
    bom:      opts.bom,
    takeOff:  opts.takeOff,
    quote:    opts.quote,
    riser:    opts.riser,
    hardware: opts.hardware,
    plans:    opts.plans
  };
```

---

## Change 5 — runExportPDF: call drawProposalQuote

Find:
```js
  if(opts.takeOff && takeOffHasContent){
    showProgress('Composing Take-Off\u2026',20);
    startSection('letter','portrait');
    drawTakeOffPage(doc, pageW, pageH);
  }
```

Insert immediately before it:
```js
  if(opts.quote){
    showProgress('Composing security quote\u2026',18);
    startSection('letter','portrait');
    drawProposalQuote(doc, pageW, pageH);
  }
```

---

## Change 6 — drawProposalQuote function

Insert the complete function immediately before `function drawTakeOffPage(doc, W, H){` (line ~17090).

```js
// ─── Security Quote PDF Page ──────────────────────────────────────────────────
// drawProposalQuote renders the customer-facing price summary — the SUMMARY
// step of the SQ wizard — as a static jsPDF page. Columns: Qty · SKU ·
// Description · Extended HW · Extended Labour · Total · GM%.
// Data: computeBomTree() + deriveSell + _sqRowLabour. Multi-page overflow
// via ensureSpace + doc.addPage. Integrator-only columns (cost, margin $)
// are intentionally omitted.
function drawProposalQuote(doc, W, H){
  drawPageHeader(doc, W, 'Security Quote');
  var y = 80;
  var L = 40;          // left margin
  var R = W - 40;      // right margin

  // Column x-positions (right-edge for right-aligned; left-edge for left)
  var COL = {
    qty:      { x: 70,  align: 'right', label: 'QTY',          maxW: 28 },
    sku:      { x: 78,  align: 'left',  label: 'SKU',           maxW: 100 },
    desc:     { x: 183, align: 'left',  label: 'DESCRIPTION',   maxW: 155 },
    hwSell:   { x: 360, align: 'right', label: 'EXT HW',        maxW: 60 },
    labSell:  { x: 430, align: 'right', label: 'EXT LABOUR',    maxW: 65 },
    total:    { x: 505, align: 'right', label: 'TOTAL',         maxW: 60 },
    gm:       { x: 572, align: 'right', label: 'GM %',          maxW: 45 }
  };
  var COL_ORDER = ['qty','sku','desc','hwSell','labSell','total','gm'];

  var buckets = computeBomTree();
  var taxPct  = _sqReadNum('bom-tax-pct');

  function _fit(v, maxW){
    var s = (v == null) ? '' : String(v);
    // Approximate character truncation at ~6pt per char for 8pt Courier
    var limit = Math.floor(maxW / 5.5);
    if(s.length > limit) s = s.slice(0, limit - 1) + '\u2026';
    return s;
  }
  function _money(n){ return '$' + (Math.round((n||0)*100)/100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,','); }
  function _pct(n){ return (n == null || !isFinite(n)) ? '\u2014' : n.toFixed(1) + '%'; }

  function ensureSpace(needed){
    if(y + needed > H - 50){
      drawPageFooter(doc, W, H);
      doc.addPage('letter','portrait');
      drawPageHeader(doc, W, 'Security Quote (cont.)');
      y = 80;
    }
  }

  // Subtitle
  doc.setFont('courier','normal'); doc.setFontSize(9); doc.setTextColor(120,120,140);
  var sub = projectInfo.name || 'Security Proposal';
  if(projectInfo.date) sub += '  \u00b7  ' + projectInfo.date;
  doc.text(sub, L, y);
  y += 16;

  // Column header row
  function drawColHeader(){
    ensureSpace(16);
    doc.setFillColor(31,41,55);
    doc.rect(L, y - 10, R - L, 14, 'F');
    doc.setFont('courier','bold'); doc.setFontSize(7); doc.setTextColor(255,255,255);
    COL_ORDER.forEach(function(k){
      var c = COL[k];
      doc.text(c.label, c.x, y, c.align === 'right' ? {align:'right'} : undefined);
    });
    y += 6;
  }
  drawColHeader();

  var grandHwSell = 0, grandLabSell = 0, grandTotal = 0;
  var rowIdx = 0;

  function drawDataRow(vals, isSub){
    var needed = isSub ? 13 : 12;
    ensureSpace(needed);
    if(!isSub && rowIdx % 2 === 1){
      doc.setFillColor(245,244,240);
      doc.rect(L, y - 9, R - L, 12, 'F');
    }
    if(isSub){
      doc.setFillColor(237,239,243);
      doc.rect(L, y - 9, R - L, 13, 'F');
    }
    doc.setFont('courier', isSub ? 'bold' : 'normal');
    doc.setFontSize(8);
    doc.setTextColor(isSub ? 31 : 40, isSub ? 41 : 40, isSub ? 55 : 60);
    COL_ORDER.forEach(function(k){
      var c = COL[k];
      var v = vals[k] != null ? vals[k] : '';
      doc.text(_fit(String(v), c.maxW), c.x, y, c.align === 'right' ? {align:'right'} : undefined);
    });
    y += isSub ? 13 : 12;
    if(!isSub) rowIdx++;
  }

  BOM_TEMPLATE.tiers.forEach(function(tier){
    var anyRows = tier.subs.some(function(sub){
      var b = buckets[sub.id];
      if(!b) return false;
      return b.auto.filter(function(r){return !r.warn;}).length > 0 || b.custom.length > 0;
    });
    if(!anyRows) return;

    // Tier-1 label
    ensureSpace(30);
    doc.setFont('courier','bold'); doc.setFontSize(10); doc.setTextColor(200,32,44);
    doc.text(tier.title.toUpperCase(), L, y);
    y += 14;

    tier.subs.forEach(function(sub){
      var b = buckets[sub.id];
      if(!b) return;
      var realAuto = b.auto.filter(function(r){return !r.warn;});
      if(realAuto.length === 0 && b.custom.length === 0) return;

      var sectionRule = getSectionRule(sub.id);
      var secHwSell = 0, secLabSell = 0, secTotal = 0;

      // Tier-2 sub-label
      ensureSpace(24);
      doc.setFont('courier','bold'); doc.setFontSize(8); doc.setTextColor(80,80,100);
      doc.text(sub.title, L + 6, y);
      y += 12;

      realAuto.forEach(function(r){
        var cost = (typeof r.cost === 'number') ? r.cost : 0;
        var list = (typeof r.list === 'number' && isFinite(r.list)) ? r.list : null;
        var qty  = (typeof r.qty  === 'number') ? r.qty  : 0;
        var sell = deriveSell(cost, list, sectionRule);
        var hws  = qty * sell;
        var lab  = _sqRowLabour(sub.id, r.key || '', qty);
        var lbs  = bomLabourSupplyOnly ? 0 : lab.extSell;
        var tot  = hws + lbs;
        var gm   = tot > 0 ? ((tot - (qty*cost + (bomLabourSupplyOnly?0:lab.extCost))) / tot * 100) : null;
        secHwSell  += hws; secLabSell += lbs; secTotal += tot;
        drawDataRow({
          qty:     qty,
          sku:     _fit(r.sku || r.key || '', COL.sku.maxW),
          desc:    r.desc || '',
          hwSell:  _money(hws),
          labSell: _money(lbs),
          total:   _money(tot),
          gm:      _pct(gm)
        }, false);
      });

      b.custom.forEach(function(cust){
        var line = cust.line || {};
        var cost = (typeof line.unit === 'number') ? line.unit : 0;
        var qty  = (typeof line.qty  === 'number') ? line.qty  : 0;
        var sell = deriveSell(cost, null, sectionRule);
        var hws  = qty * sell;
        var lab  = _sqRowLabour(sub.id, line.id || '', qty);
        var lbs  = bomLabourSupplyOnly ? 0 : lab.extSell;
        var tot  = hws + lbs;
        var gm   = tot > 0 ? ((tot - (qty*cost + (bomLabourSupplyOnly?0:lab.extCost))) / tot * 100) : null;
        secHwSell  += hws; secLabSell += lbs; secTotal += tot;
        drawDataRow({
          qty:     qty,
          sku:     _fit(line.sku || '', COL.sku.maxW),
          desc:    line.desc || '',
          hwSell:  _money(hws),
          labSell: _money(lbs),
          total:   _money(tot),
          gm:      _pct(gm)
        }, false);
      });

      // Section subtotal
      var secGm = secTotal > 0 ? ((secTotal - (secHwSell - secLabSell + secLabSell - (secTotal - secTotal))) / secTotal * 100) : null;
      drawDataRow({
        qty: '', sku: '', desc: 'Subtotal — ' + sub.title,
        hwSell: _money(secHwSell), labSell: _money(secLabSell),
        total:  _money(secTotal),  gm: ''
      }, true);

      grandHwSell  += secHwSell;
      grandLabSell += secLabSell;
      grandTotal   += secTotal;
    });

    y += 4; // inter-tier gap
  });

  // Grand subtotal
  ensureSpace(36);
  y += 4;
  doc.setFillColor(31,41,55);
  doc.rect(L, y - 10, R - L, 14, 'F');
  doc.setFont('courier','bold'); doc.setFontSize(8); doc.setTextColor(255,255,255);
  doc.text('SUBTOTAL', L + 4, y);
  doc.text(_money(grandHwSell),  COL.hwSell.x,  y, {align:'right'});
  doc.text(_money(grandLabSell), COL.labSell.x, y, {align:'right'});
  doc.text(_money(grandTotal),   COL.total.x,   y, {align:'right'});
  y += 16;

  // Tax row
  if(taxPct > 0){
    var taxAmt = grandTotal * (taxPct / 100);
    ensureSpace(14);
    doc.setFont('courier','normal'); doc.setFontSize(8); doc.setTextColor(60,60,70);
    doc.text('Tax (' + taxPct.toFixed(2) + '%)', L + 4, y);
    doc.text(_money(taxAmt), COL.total.x, y, {align:'right'});
    y += 12;
    grandTotal += taxAmt;
  }

  // Grand total
  ensureSpace(16);
  doc.setFont('courier','bold'); doc.setFontSize(9); doc.setTextColor(200,32,44);
  doc.text('GRAND TOTAL', L + 4, y);
  doc.text(_money(grandTotal), COL.total.x, y, {align:'right'});
  y += 6;

  drawPageFooter(doc, W, H);
}
```

---

## Verification steps

1. `node --check camera_markup_tool.html` — must pass
2. Browser: open Export modal → confirm "Security Quote" checkbox appears between Take-Off and Hardware Schedule, checked by default
3. Export PDF with Quote checked → confirm page renders with correct data, section headers, subtotals, grand total
4. Export PDF with Quote unchecked → confirm page absent
5. Save project, reload → confirm Quote checkbox state persists

---

## Commit message

```
PDF export: add Security Quote page (drawProposalQuote)
```

Fold this brief file into the commit:
```
git add camera_markup_tool.html PASS_PDF_QUOTE_BRIEF.md
```
