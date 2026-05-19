# User Guide — Build & Maintenance

This folder produces the customer-facing **Surveillance Markup Tool — User Guide** PDF.

## Files

- `user-guide.md` — single source of truth. Edit this.
- `build-guide.js` — converts the markdown to docx + PDF.
- `output/surveillance_markup_user_guide.docx` — editable Word version (generated).
- `output/surveillance_markup_user_guide.pdf` — distribution PDF (generated).

## Workflow

### To rebuild after editing the markdown

```bash
node docs/build-guide.js
```

Outputs both the `.docx` and `.pdf` (assuming LibreOffice is available — if not,
open the docx and export as PDF manually).

### To add coverage for new features (per major pass)

1. Edit `user-guide.md`.
2. Add a new `%H2 Version X.Y — <Month Year>` block at the **top** of the
   Version History section, summarizing what shipped.
3. Patch the relevant feature sections in the body of the doc.
4. Bump the `version:` field in the `%META` block.
5. Run `node docs/build-guide.js`.
6. Commit the markdown source AND the regenerated output:

```bash
git add docs/user-guide.md docs/output/
git commit -m "Docs: user guide v<X.Y> covering <pass-name>"
```

## Markdown source syntax

Standard markdown for inline formatting (`**bold**`, `*italic*`) and bullet lists
(`- item`). Custom block tags for everything else:

| Tag | Purpose |
|---|---|
| `%META … %ENDMETA` | Document metadata: title, subtitle, version, date, org |
| `%TOC … %ENDTOC` | Static table of contents (4-space indent for sub-entries) |
| `%H1 / %H2 / %H3 text` | Headings |
| `%CALLOUT title … %ENDCALLOUT` | Accented info box |
| `%TABLE … %ENDTABLE` | Pipe-delimited table, first row is header |
| `%NUMLIST id … %ENDNUMLIST` | Numbered list (the `id` makes the list restart at 1) |
| `%PAGEBREAK` | Hard page break |

`%NUMLIST id` is important — each numbered list in the doc needs a **unique id**
or the numbers continue across lists. Use any short identifier (`scale`,
`working`, `export`).

## When NOT to use this build pipeline

This is for the customer-facing user guide. Release notes, changelogs, milestone
step reports, and internal design docs stay in their normal locations
(`CHANGELOG.md`, `PASS_*_BRIEF.md`, commit messages).
