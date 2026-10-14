/** Word (.docx) dari spesifikasi Markdown. `docx` di-import dinamis (berat). */
import { parseMarkdownBlocks, type Block, type Run } from "./mdBlocks";

export async function buildDocx(title: string, markdown: string): Promise<Blob> {
  const d = await import("docx");
  const blocks = parseMarkdownBlocks(markdown);

  const runs = (rs: Run[], base: { bold?: boolean; italics?: boolean; size?: number } = {}) =>
    rs.map(
      (r) =>
        new d.TextRun({
          text: r.text,
          ...(r.bold || base.bold ? { bold: true } : {}),
          ...(r.italic || base.italics ? { italics: true } : {}),
          ...(base.size ? { size: base.size } : {}),
          ...(r.code
            ? { font: "Consolas", shading: { type: d.ShadingType.CLEAR, fill: "EEEEEE" } }
            : {}),
        }),
    );

  const HEADINGS = [
    d.HeadingLevel.HEADING_1,
    d.HeadingLevel.HEADING_2,
    d.HeadingLevel.HEADING_3,
    d.HeadingLevel.HEADING_4,
    d.HeadingLevel.HEADING_5,
    d.HeadingLevel.HEADING_6,
  ];
  const ALIGN = {
    left: d.AlignmentType.LEFT,
    center: d.AlignmentType.CENTER,
    right: d.AlignmentType.RIGHT,
  } as const;

  const children: Array<InstanceType<typeof d.Paragraph> | InstanceType<typeof d.Table>> = [];
  // Daftar bernomor perlu "instance" baru tiap daftar supaya penomoran mulai dari 1 lagi.
  let numberedInstance = 0;

  const toNodes = (b: Block) => {
    switch (b.type) {
      case "heading":
        children.push(
          new d.Paragraph({
            heading: HEADINGS[Math.min(b.level, 6) - 1]!,
            spacing: { before: 240, after: 120 },
            children: runs(b.runs),
          }),
        );
        break;
      case "paragraph":
        children.push(new d.Paragraph({ spacing: { after: 140 }, children: runs(b.runs) }));
        break;
      case "list": {
        const instance = b.ordered ? ++numberedInstance : 0;
        for (const it of b.items) {
          children.push(
            new d.Paragraph({
              children: runs(it.runs),
              spacing: { after: 60 },
              ...(b.ordered
                ? { numbering: { reference: "ai-numbered", level: it.level, instance } }
                : { numbering: { reference: "ai-bullets", level: it.level } }),
            }),
          );
        }
        break;
      }
      case "quote":
        children.push(
          new d.Paragraph({
            indent: { left: 480 },
            spacing: { after: 140 },
            border: { left: { style: d.BorderStyle.SINGLE, size: 12, color: "999999", space: 8 } },
            children: runs(b.runs, { italics: true }),
          }),
        );
        break;
      case "code":
        for (const line of b.text.split("\n")) {
          children.push(
            new d.Paragraph({
              shading: { type: d.ShadingType.CLEAR, fill: "F3F3F3" },
              children: [new d.TextRun({ text: line || " ", font: "Consolas", size: 20 })],
            }),
          );
        }
        children.push(new d.Paragraph({ children: [] }));
        break;
      case "hr":
        children.push(
          new d.Paragraph({
            border: { bottom: { style: d.BorderStyle.SINGLE, size: 6, color: "AAAAAA", space: 1 } },
            children: [],
          }),
        );
        break;
      case "table": {
        const cell = (rs: Run[], i: number, header: boolean) =>
          new d.TableCell({
            ...(header ? { shading: { type: d.ShadingType.CLEAR, fill: "E8E8E8" } } : {}),
            margins: { top: 60, bottom: 60, left: 100, right: 100 },
            children: [
              new d.Paragraph({
                alignment: ALIGN[b.align[i] ?? "left"],
                children: runs(rs, { bold: header }),
              }),
            ],
          });
        children.push(
          new d.Table({
            width: { size: 100, type: d.WidthType.PERCENTAGE },
            rows: [
              new d.TableRow({
                tableHeader: true,
                children: b.head.map((c, i) => cell(c, i, true)),
              }),
              ...b.rows.map(
                (r) => new d.TableRow({ children: r.map((c, i) => cell(c, i, false)) }),
              ),
            ],
          }),
          new d.Paragraph({ children: [] }),
        );
        break;
      }
    }
  };

  if (title && !(blocks[0]?.type === "heading" && blocks[0].level === 1)) {
    children.push(
      new d.Paragraph({
        heading: d.HeadingLevel.TITLE,
        spacing: { after: 200 },
        children: [new d.TextRun({ text: title })],
      }),
    );
  }
  blocks.forEach(toNodes);

  const levels = (
    fmt: (typeof d.LevelFormat)[keyof typeof d.LevelFormat],
    text: (l: number) => string,
  ) =>
    [0, 1, 2, 3].map((level) => ({
      level,
      format: fmt,
      text: text(level),
      alignment: d.AlignmentType.START,
      style: { paragraph: { indent: { left: 720 + level * 360, hanging: 360 } } },
    }));

  const doc = new d.Document({
    ...(title ? { title } : {}),
    creator: "NoteMe",
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    numbering: {
      config: [
        { reference: "ai-bullets", levels: levels(d.LevelFormat.BULLET, () => "•") },
        { reference: "ai-numbered", levels: levels(d.LevelFormat.DECIMAL, (l) => `%${l + 1}.`) },
      ],
    },
    sections: [{ children }],
  });
  return d.Packer.toBlob(doc);
}
