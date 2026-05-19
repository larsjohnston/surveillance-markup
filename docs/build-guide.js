#!/usr/bin/env node
/**
 * build-guide.js — Surveillance Markup Tool user guide builder.
 *
 * Reads docs/user-guide.md and produces docs/output/surveillance_markup_user_guide.docx
 * and docs/output/surveillance_markup_user_guide.pdf.
 *
 * The markdown source uses simple block tags:
 *   %META … %ENDMETA         document metadata (key: value lines)
 *   %TOC … %ENDTOC           static table of contents entries
 *   %H1 / %H2 / %H3 text     headings
 *   %CALLOUT title … %ENDCALLOUT   accented info box
 *   %TABLE … %ENDTABLE       pipe-delimited table, first row is header
 *   %NUMLIST id … %ENDNUMLIST    numbered list (id makes it restart at 1)
 *   %PAGEBREAK               page break
 *
 * Standard markdown:
 *   - bullet lines beginning with "- "
 *   - **bold** inline
 *   - *italic* inline
 *   - blank lines separate paragraphs
 *
 * To regenerate after editing the markdown:
 *   node docs/build-guide.js
 */

const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat,
  HeadingLevel, BorderStyle, WidthType, ShadingType, PageNumber, PageBreak
} = require('docx');

// ─── Style constants ─────────────────────────────────────────────────────

const NAVY = "1F3A5F";
const ACCENT = "2E75B6";
const GREY_BORDER = "CCCCCC";
const GREY_BG = "F2F2F2";

const SOURCE_PATH = path.join(__dirname, "user-guide.md");
const OUTPUT_DIR = path.join(__dirname, "output");
const DOCX_PATH = path.join(OUTPUT_DIR, "surveillance_markup_user_guide.docx");

// ─── Inline run rendering (bold, italic) ─────────────────────────────────

function parseInlineRuns(text) {
  // Tokenize **bold** and *italic*. Markdown asterisk handling, simple.
  const runs = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      runs.push(new TextRun(text.slice(last, m.index)));
    }
    const tok = m[0];
    if (tok.startsWith("**")) {
      runs.push(new TextRun({ text: tok.slice(2, -2), bold: true }));
    } else {
      runs.push(new TextRun({ text: tok.slice(1, -1), italics: true }));
    }
    last = m.index + tok.length;
  }
  if (last < text.length) {
    runs.push(new TextRun(text.slice(last)));
  }
  return runs.length ? runs : [new TextRun(text)];
}

// ─── Block renderers ─────────────────────────────────────────────────────

function makeHeading(text, level) {
  const sizes = { 1: 36, 2: 28, 3: 24 };
  const spacingBefore = { 1: 360, 2: 280, 3: 200 };
  const spacingAfter = { 1: 200, 2: 140, 3: 100 };
  const headingLevels = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3,
  };
  return new Paragraph({
    heading: headingLevels[level],
    children: [new TextRun({ text, color: NAVY, size: sizes[level], bold: true })],
    spacing: { before: spacingBefore[level], after: spacingAfter[level] },
  });
}

function makeParagraph(text) {
  return new Paragraph({
    children: parseInlineRuns(text),
    spacing: { after: 120, line: 300 },
  });
}

function makeBullet(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    children: parseInlineRuns(text),
    spacing: { after: 80, line: 300 },
  });
}

function makeNumbered(text, listId) {
  return new Paragraph({
    numbering: { reference: listId, level: 0 },
    children: parseInlineRuns(text),
    spacing: { after: 80, line: 300 },
  });
}

function makeCallout(title, bodyLines) {
  const titlePara = new Paragraph({
    children: [new TextRun({ text: title, bold: true, color: NAVY })],
    spacing: { after: 100 },
  });
  const bodyParas = bodyLines.map(line => new Paragraph({
    children: parseInlineRuns(line),
    spacing: { after: 80, line: 280 },
  }));
  const border = { style: BorderStyle.SINGLE, size: 4, color: ACCENT };
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: { top: border, bottom: border, left: border, right: border },
            width: { size: 9360, type: WidthType.DXA },
            shading: { fill: "EAF2FA", type: ShadingType.CLEAR },
            margins: { top: 200, bottom: 200, left: 240, right: 240 },
            children: [titlePara, ...bodyParas],
          }),
        ],
      }),
    ],
  });
}

function makeTable(rows) {
  const border = { style: BorderStyle.SINGLE, size: 1, color: GREY_BORDER };
  const borders = { top: border, bottom: border, left: border, right: border };
  const colWidths = [2600, 6760];
  const header = rows[0];
  const headerRow = new TableRow({
    tableHeader: true,
    children: header.map((cell, i) => new TableCell({
      borders, width: { size: colWidths[i], type: WidthType.DXA },
      shading: { fill: GREY_BG, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: cell, bold: true })] })],
    })),
  });
  const bodyRows = rows.slice(1).map(r => new TableRow({
    children: r.map((cell, i) => new TableCell({
      borders, width: { size: colWidths[i], type: WidthType.DXA },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: i === 0 ? [new TextRun({ text: cell, bold: true })] : parseInlineRuns(cell) })],
    })),
  }));
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [headerRow, ...bodyRows],
  });
}

function makeTocEntry(text, indent = 0) {
  return new Paragraph({
    children: [new TextRun({ text, color: NAVY, size: indent === 0 ? 24 : 22, bold: indent === 0 })],
    spacing: { after: indent === 0 ? 100 : 60 },
    indent: { left: indent * 360 },
  });
}

function makePageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

// ─── Parser ──────────────────────────────────────────────────────────────

function parseSource(src) {
  const lines = src.split(/\r?\n/);
  const blocks = [];
  const meta = {};
  let toc = null;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "%META") {
      i++;
      while (i < lines.length && lines[i].trim() !== "%ENDMETA") {
        const m = lines[i].match(/^(\w+):\s*(.+)$/);
        if (m) meta[m[1]] = m[2].trim();
        i++;
      }
      i++; // skip %ENDMETA
    }
    else if (trimmed === "%TOC") {
      toc = [];
      i++;
      while (i < lines.length && lines[i].trim() !== "%ENDTOC") {
        const raw = lines[i];
        if (raw.trim()) {
          const indented = raw.startsWith("    ");
          toc.push({ text: raw.trim(), indent: indented ? 1 : 0 });
        }
        i++;
      }
      i++; // skip %ENDTOC
    }
    else if (/^%H[123]\s/.test(trimmed)) {
      const level = parseInt(trimmed[2], 10);
      const text = trimmed.slice(3).trim();
      blocks.push({ kind: "heading", level, text });
      i++;
    }
    else if (trimmed === "%PAGEBREAK") {
      blocks.push({ kind: "pagebreak" });
      i++;
    }
    else if (trimmed.startsWith("%CALLOUT ")) {
      const title = trimmed.slice(9).trim();
      i++;
      const bodyLines = [];
      while (i < lines.length && lines[i].trim() !== "%ENDCALLOUT") {
        if (lines[i].trim()) bodyLines.push(lines[i].trim());
        i++;
      }
      blocks.push({ kind: "callout", title, bodyLines });
      i++;
    }
    else if (trimmed === "%TABLE") {
      i++;
      const rows = [];
      while (i < lines.length && lines[i].trim() !== "%ENDTABLE") {
        const raw = lines[i].trim();
        if (raw) {
          rows.push(raw.split("|").map(c => c.trim()));
        }
        i++;
      }
      blocks.push({ kind: "table", rows });
      i++;
    }
    else if (trimmed.startsWith("%NUMLIST ")) {
      const listId = "n_" + trimmed.slice(9).trim();
      i++;
      const items = [];
      while (i < lines.length && lines[i].trim() !== "%ENDNUMLIST") {
        const raw = lines[i].trim();
        if (raw) {
          // Strip leading "N. " from the markdown line — we use docx numbering
          const m = raw.match(/^\d+\.\s*(.+)$/);
          items.push(m ? m[1] : raw);
        }
        i++;
      }
      blocks.push({ kind: "numlist", listId, items });
      i++;
    }
    else if (trimmed.startsWith("- ")) {
      // Collect a bullet group
      const items = [];
      while (i < lines.length && lines[i].trim().startsWith("- ")) {
        items.push(lines[i].trim().slice(2));
        i++;
      }
      blocks.push({ kind: "bullets", items });
    }
    else if (trimmed === "") {
      i++;
    }
    else if (trimmed.startsWith("#")) {
      // Top-level markdown header — used as document title in the source,
      // not rendered (cover page comes from meta).
      i++;
    }
    else {
      // Plain paragraph (may span multiple lines until blank)
      const para = [trimmed];
      i++;
      while (i < lines.length && lines[i].trim() && !lines[i].trim().startsWith("%") && !lines[i].trim().startsWith("- ") && !lines[i].trim().startsWith("#")) {
        para.push(lines[i].trim());
        i++;
      }
      blocks.push({ kind: "paragraph", text: para.join(" ") });
    }
  }

  return { meta, toc, blocks };
}

// ─── Cover & TOC pages ───────────────────────────────────────────────────

function buildCoverPage(meta) {
  return [
    new Paragraph({ children: [new TextRun("")], spacing: { before: 2400 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: meta.title || "Untitled", bold: true, size: 56, color: NAVY })],
      spacing: { after: 200 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: meta.subtitle || "", size: 40, color: ACCENT })],
      spacing: { after: 800 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: meta.tagline || "", italics: true, size: 24, color: "555555" })],
      spacing: { after: 2400 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "Version " + (meta.version || "0.0"), size: 24, bold: true })],
      spacing: { after: 100 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: meta.date || "", size: 22, color: "555555" })],
      spacing: { after: 100 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: meta.org || "", size: 22, color: "555555" })],
    }),
    makePageBreak(),
  ];
}

function buildTocPage(toc) {
  const entries = (toc || []).map(t => makeTocEntry(t.text, t.indent));
  return [makeHeading("Contents", 1), ...entries, makePageBreak()];
}

// ─── Block-to-docx render dispatcher ─────────────────────────────────────

function renderBlocks(blocks) {
  return blocks.map(b => {
    switch (b.kind) {
      case "heading":
        return makeHeading(b.text, b.level);
      case "paragraph":
        return makeParagraph(b.text);
      case "bullets":
        return b.items.map(i => makeBullet(i));
      case "numlist":
        return b.items.map(i => makeNumbered(i, b.listId));
      case "callout":
        return [makeCallout(b.title, b.bodyLines), new Paragraph({ children: [new TextRun("")], spacing: { after: 120 } })];
      case "table":
        return [makeTable(b.rows), new Paragraph({ children: [new TextRun("")], spacing: { after: 120 } })];
      case "pagebreak":
        return makePageBreak();
      default:
        return null;
    }
  }).flat().filter(Boolean);
}

// ─── Numbering refs (one per numlist id encountered) ─────────────────────

function collectNumlistIds(blocks) {
  const ids = new Set();
  for (const b of blocks) if (b.kind === "numlist") ids.add(b.listId);
  return Array.from(ids);
}

function buildNumberingConfig(numlistIds) {
  const config = [
    { reference: "bullets",
      levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
  ];
  for (const id of numlistIds) {
    config.push({
      reference: id,
      levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
    });
  }
  return { config };
}

// ─── Main ────────────────────────────────────────────────────────────────

function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const src = fs.readFileSync(SOURCE_PATH, "utf-8");
  const { meta, toc, blocks } = parseSource(src);

  const numlistIds = collectNumlistIds(blocks);

  const children = [
    ...buildCoverPage(meta),
    ...buildTocPage(toc),
    ...renderBlocks(blocks),
  ];

  const doc = new Document({
    creator: meta.org || "Calgary Lock and Safe",
    title: meta.title + " — " + meta.subtitle,
    styles: {
      default: { document: { run: { font: "Arial", size: 22 } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 36, bold: true, font: "Arial", color: NAVY },
          paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 28, bold: true, font: "Arial", color: NAVY },
          paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 1 } },
        { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 24, bold: true, font: "Arial", color: NAVY },
          paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } },
      ],
    },
    numbering: buildNumberingConfig(numlistIds),
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: (meta.title || "") + " — " + (meta.subtitle || ""), size: 18, color: "888888" })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "Page ", size: 18, color: "888888" }),
              new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "888888" }),
              new TextRun({ text: " of ", size: 18, color: "888888" }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: "888888" }),
            ],
          })],
        }),
      },
      children,
    }],
  });

  Packer.toBuffer(doc).then(buffer => {
    fs.writeFileSync(DOCX_PATH, buffer);
    console.log("[build-guide] docx written: " + DOCX_PATH + " (" + buffer.length + " bytes)");
    console.log("[build-guide] " + blocks.length + " blocks rendered, " + numlistIds.length + " numbered lists");

    // Attempt PDF conversion via LibreOffice. Optional — only runs if soffice is available.
    const sofficeScript = "/mnt/skills/public/docx/scripts/office/soffice.py";
    if (fs.existsSync(sofficeScript)) {
      const { execSync } = require("child_process");
      try {
        execSync("python3 " + sofficeScript + " --headless --convert-to pdf " + DOCX_PATH + " --outdir " + OUTPUT_DIR, { stdio: "pipe" });
        console.log("[build-guide] pdf written: " + path.join(OUTPUT_DIR, "surveillance_markup_user_guide.pdf"));
      } catch (err) {
        console.warn("[build-guide] PDF conversion skipped (soffice failed): " + err.message);
        console.warn("[build-guide] Run manually: python3 " + sofficeScript + " --headless --convert-to pdf " + DOCX_PATH);
      }
    } else {
      console.log("[build-guide] PDF conversion skipped (soffice not available on this system).");
      console.log("[build-guide] To convert manually, open the docx in Word/LibreOffice and Export as PDF.");
    }
  }).catch(err => {
    console.error("[build-guide] FAILED:", err);
    process.exit(1);
  });
}

main();
