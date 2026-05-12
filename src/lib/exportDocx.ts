/**
 * Converts a Markdown string to a .docx file and triggers a browser download.
 * Handles: H1-H4 headings, bold/italic inline, bullet & numbered lists, tables, paragraphs.
 */
import {
  Document, Packer, Paragraph, TextRun,
  HeadingLevel, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType,
  convertInchesToTwip,
} from "docx";
import { saveAs } from "file-saver";

// ── Inline parser ─────────────────────────────────────────────────────────────
// Turns a raw markdown inline string into an array of TextRun objects.
function parseInline(raw: string): TextRun[] {
  const runs: TextRun[] = [];
  // Strip link syntax [text](url) → text
  const text = raw.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  // Tokenise bold, italic, code, plain
  const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|([^*`]+))/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m[2]) runs.push(new TextRun({ text: m[2], bold: true, italics: true }));
    else if (m[3]) runs.push(new TextRun({ text: m[3], bold: true }));
    else if (m[4]) runs.push(new TextRun({ text: m[4], italics: true }));
    else if (m[5]) runs.push(new TextRun({ text: m[5], font: "Courier New", size: 18 }));
    else if (m[6]) runs.push(new TextRun({ text: m[6] }));
  }
  return runs.length ? runs : [new TextRun({ text })];
}

// ── Table builder ─────────────────────────────────────────────────────────────
function buildTable(rows: string[][]): Table {
  const solidBorder = {
    style: BorderStyle.SINGLE,
    size: 1,
    color: "AAAAAA",
  };
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((cells, rowIdx) =>
      new TableRow({
        children: cells.map((cell) =>
          new TableCell({
            width: { size: Math.floor(100 / cells.length), type: WidthType.PERCENTAGE },
            borders: { top: solidBorder, bottom: solidBorder, left: solidBorder, right: solidBorder },
            shading: rowIdx === 0 ? { fill: "F0F0F0" } : undefined,
            children: [
              new Paragraph({
                children: parseInline(cell.trim()),
                spacing: { before: convertInchesToTwip(0.04), after: convertInchesToTwip(0.04) },
                alignment: AlignmentType.LEFT,
              }),
            ],
          }),
        ),
      }),
    ),
  });
}

// ── Heading level map ─────────────────────────────────────────────────────────
const HEADING_MAP: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
};

// ── Main converter ────────────────────────────────────────────────────────────
function markdownToDocxChildren(markdown: string): (Paragraph | Table)[] {
  const lines = markdown.split("\n");
  const children: (Paragraph | Table)[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Heading
    const headingMatch = line.match(/^(#{1,4})\s+(.*)/);
    if (headingMatch) {
      const level = Math.min(headingMatch[1].length, 4);
      children.push(
        new Paragraph({
          heading: HEADING_MAP[level],
          children: parseInline(headingMatch[2]),
        }),
      );
      i++;
      continue;
    }

    // Horizontal rule — skip
    if (/^[-*_]{3,}\s*$/.test(line)) { i++; continue; }

    // Table — collect consecutive | lines
    if (line.trimStart().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      // Skip separator rows (|---|---|)
      const dataRows = tableLines
        .filter((l) => !/^\s*\|[\s|:-]+\|\s*$/.test(l))
        .map((l) =>
          l.split("|")
            .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
            .map((c) => c.trim()),
        )
        .filter((cells) => cells.some((c) => c.length > 0));
      if (dataRows.length > 0) children.push(buildTable(dataRows));
      continue;
    }

    // Unordered list item
    const ulMatch = line.match(/^[\s]*[-*+]\s+(.*)/);
    if (ulMatch) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          children: parseInline(ulMatch[1]),
        }),
      );
      i++;
      continue;
    }

    // Ordered list item
    const olMatch = line.match(/^[\s]*\d+\.\s+(.*)/);
    if (olMatch) {
      children.push(
        new Paragraph({
          numbering: { reference: "default-numbering", level: 0 },
          children: parseInline(olMatch[1]),
        }),
      );
      i++;
      continue;
    }

    // Blockquote — treat as indented paragraph
    const bqMatch = line.match(/^>\s?(.*)/);
    if (bqMatch) {
      children.push(
        new Paragraph({
          indent: { left: convertInchesToTwip(0.4) },
          children: parseInline(bqMatch[1]),
        }),
      );
      i++;
      continue;
    }

    // Empty line → blank paragraph (spacing)
    if (line.trim() === "") {
      children.push(new Paragraph({ children: [new TextRun("")] }));
      i++;
      continue;
    }

    // Regular paragraph
    children.push(
      new Paragraph({
        children: parseInline(line),
        spacing: { after: convertInchesToTwip(0.08) },
      }),
    );
    i++;
  }

  return children;
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function exportMarkdownToDocx(markdown: string, filename: string): Promise<void> {
  const safeFilename = filename.endsWith(".docx") ? filename : `${filename}.docx`;
  const children = markdownToDocxChildren(markdown);

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "default-numbering",
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.25),
              right: convertInchesToTwip(1.25),
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, safeFilename);
}
