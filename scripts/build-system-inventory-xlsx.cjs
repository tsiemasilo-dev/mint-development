// Build system-inventory.xlsx from system-inventory.csv.
// Uses adm-zip (already a project dep) to assemble the OOXML package by hand
// so we don't need to install an Excel library just for this one report.
const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");

const ROOT = path.resolve(__dirname, "..");
const CSV_PATH = path.join(ROOT, "system-inventory.csv");
const OUT_PATH = path.join(ROOT, "system-inventory.xlsx");

if (!fs.existsSync(CSV_PATH)) {
  console.error("Missing", CSV_PATH);
  process.exit(1);
}

const csv = fs.readFileSync(CSV_PATH, "utf8").replace(/^﻿/, "");
const rows = csv
  .split(/\r?\n/)
  .filter((line) => line.length > 0)
  .map((line) => line.split(",")); // CSV was authored with ; inside cells so naive split is safe.

const header = rows[0];
const data = rows.slice(1);
const colCount = header.length;
const rowCount = rows.length;

// ── Build shared strings table ──────────────────────────────────────────────
const sharedStrings = [];
const sharedIndex = new Map();
function sharedRef(v) {
  if (sharedIndex.has(v)) return sharedIndex.get(v);
  const idx = sharedStrings.length;
  sharedStrings.push(v);
  sharedIndex.set(v, idx);
  return idx;
}

function colLetter(n) {
  // 1-indexed to A..Z, AA..AZ, ...
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function xmlEscape(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Pre-register every cell value as a shared string so the worksheet stays small.
const cellRefs = rows.map((row) => row.map((cell) => sharedRef(cell)));

// ── sharedStrings.xml ───────────────────────────────────────────────────────
const sharedStringsXml =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sharedStrings.length}" uniqueCount="${sharedStrings.length}">
${sharedStrings.map((s) => `<si><t xml:space="preserve">${xmlEscape(s)}</t></si>`).join("")}
</sst>`;

// ── sheet1.xml ──────────────────────────────────────────────────────────────
// Column widths tuned for readability without manual resize.
const colWidths = [
  24, // Business Function
  30, // Data Element
  26, // Source System/Module
  26, // Source DB Table
  32, // Source Field(s)
  60, // Calculation/Transformation Logic
  44, // Consuming Screens/APIs
  16, // System Owner
  32, // Validation Method
  16, // Last Verified Date
  60, // Notes/Risks
];

const colsXml = colWidths
  .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
  .join("");

const sheetRowsXml = cellRefs
  .map((row, rIdx) => {
    const rowNum = rIdx + 1;
    const isHeader = rIdx === 0;
    const styleAttr = isHeader ? ' s="1"' : ' s="2"';
    const cellsXml = row
      .map((sRef, cIdx) => {
        const ref = `${colLetter(cIdx + 1)}${rowNum}`;
        return `<c r="${ref}" t="s"${styleAttr}><v>${sRef}</v></c>`;
      })
      .join("");
    const heightAttr = isHeader ? ' ht="22" customHeight="1"' : ' ht="42" customHeight="1"';
    return `<row r="${rowNum}"${heightAttr}>${cellsXml}</row>`;
  })
  .join("");

const dimension = `A1:${colLetter(colCount)}${rowCount}`;

const sheetXml =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
           xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<dimension ref="${dimension}"/>
<sheetViews>
  <sheetView tabSelected="1" workbookViewId="0">
    <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
    <selection pane="bottomLeft" activeCell="A2" sqref="A2"/>
  </sheetView>
</sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${colsXml}</cols>
<sheetData>${sheetRowsXml}</sheetData>
<autoFilter ref="${dimension}"/>
</worksheet>`;

// ── styles.xml ──────────────────────────────────────────────────────────────
// Two cell styles: 1 = header (bold, fill, wrap), 2 = body (wrap, top-align).
const stylesXml =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2">
  <font><sz val="11"/><name val="Calibri"/></font>
  <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
</fonts>
<fills count="3">
  <fill><patternFill patternType="none"/></fill>
  <fill><patternFill patternType="gray125"/></fill>
  <fill><patternFill patternType="solid"><fgColor rgb="FF1E1B4B"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
  <border><left/><right/><top/><bottom/><diagonal/></border>
  <border>
    <left style="thin"><color rgb="FFE2E8F0"/></left>
    <right style="thin"><color rgb="FFE2E8F0"/></right>
    <top style="thin"><color rgb="FFE2E8F0"/></top>
    <bottom style="thin"><color rgb="FFE2E8F0"/></bottom>
    <diagonal/>
  </border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="3">
  <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
  <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
    <alignment horizontal="left" vertical="center" wrapText="1"/>
  </xf>
  <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1">
    <alignment horizontal="left" vertical="top" wrapText="1"/>
  </xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

// ── workbook + relationships + content types ────────────────────────────────
const workbookXml =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>
  <sheet name="System Inventory" sheetId="1" r:id="rId1"/>
</sheets>
</workbook>`;

const workbookRels =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`;

const rootRels =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

const contentTypes =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`;

// ── Assemble zip ────────────────────────────────────────────────────────────
const zip = new AdmZip();
zip.addFile("[Content_Types].xml", Buffer.from(contentTypes, "utf8"));
zip.addFile("_rels/.rels", Buffer.from(rootRels, "utf8"));
zip.addFile("xl/workbook.xml", Buffer.from(workbookXml, "utf8"));
zip.addFile("xl/_rels/workbook.xml.rels", Buffer.from(workbookRels, "utf8"));
zip.addFile("xl/styles.xml", Buffer.from(stylesXml, "utf8"));
zip.addFile("xl/sharedStrings.xml", Buffer.from(sharedStringsXml, "utf8"));
zip.addFile("xl/worksheets/sheet1.xml", Buffer.from(sheetXml, "utf8"));

zip.writeZip(OUT_PATH);
console.log(`Wrote ${OUT_PATH} (${rowCount - 1} rows, ${colCount} cols)`);
