/**
 * Tes pembuatan file dari jawaban AI: parser blok ```noteme-file, parser Markdown -> blok,
 * dan pembuat Word/Excel/PDF yang hasilnya dibaca ulang untuk memastikan isinya benar.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SRC = new URL("../src", import.meta.url).pathname;
const spec = await import(`${SRC}/features/ai/lib/fileSpec.ts`);
const mdb = await import(`${SRC}/features/ai/lib/mdBlocks.ts`);
const build = await import(`${SRC}/features/ai/lib/buildFile.ts`);
const pdfLib = await import(`${SRC}/features/ai/lib/buildPdf.ts`);
const server = await import(`${SRC}/features/ai/chat.server.ts`);

let fail = 0;
function check(name: string, cond: boolean, extra = "") {
  if (!cond) {
    fail++;
    console.log("FAIL", name, extra);
  } else console.log("ok  ", name);
}
const fence = (obj: unknown) => "```noteme-file\n" + JSON.stringify(obj) + "\n```";
const tmp = mkdtempSync(join(tmpdir(), "noteme-files-"));
async function save(blob: Blob, name: string) {
  const p = join(tmp, name);
  writeFileSync(p, Buffer.from(await blob.arrayBuffer()));
  return p;
}

// ---------- extractFiles ----------
{
  const reply = `Ini filenya.\n\n${fence({ format: "docx", filename: "Laporan Praktikum.docx", content: "# Hai\n\nIsi" })}\n\nSelesai.`;
  const r = spec.extractFiles(reply);
  check("extract: satu file docx", r.files.length === 1 && r.files[0].format === "docx");
  check("extract: nama dibersihkan", r.files[0].filename === "Laporan Praktikum");
  check(
    "extract: blok dibuang dari teks",
    !r.text.includes("noteme-file") &&
      r.text.includes("Ini filenya.") &&
      r.text.includes("Selesai."),
  );
  check("extract: tidak ada yang rusak", r.brokenCount === 0);
}
{
  const r = spec.extractFiles("Halo, tanpa file.");
  check(
    "extract: jawaban biasa tidak berubah",
    r.text === "Halo, tanpa file." && r.files.length === 0 && r.brokenCount === 0,
  );
}
{
  const r = spec.extractFiles('Tadi:\n```noteme-file\n{"format":"pdf","content":"# Terpotong');
  check(
    "extract: blok terpotong disembunyikan & dihitung rusak",
    r.files.length === 0 && r.brokenCount === 1 && !r.text.includes("noteme-file"),
  );
}
{
  const r = spec.extractFiles("```noteme-file\n{bukan json}\n```");
  check("extract: JSON rusak dihitung rusak", r.files.length === 0 && r.brokenCount === 1);
}
{
  const many = Array.from({ length: 6 }, (_, i) =>
    fence({ format: "pdf", filename: `f${i}`, content: "x" }),
  ).join("\n");
  const r = spec.extractFiles(many);
  check("extract: maksimal 4 file", r.files.length === 4 && r.brokenCount === 2);
}
check(
  "spec: format tak dikenal ditolak",
  spec.parseFileSpec({ format: "exe", content: "x" }) === null,
);
check(
  "spec: konten kosong ditolak",
  spec.parseFileSpec({ format: "docx", content: "  " }) === null,
);
check(
  "spec: filename berbahaya dibersihkan",
  !/[\\/:*?"<>|]/.test(spec.safeFilename("../../etc/pa:ss*wd?.pdf", "x")),
);
check("spec: filename kosong pakai cadangan", spec.safeFilename("   ", "dokumen") === "dokumen");
{
  const s = spec.parseFileSpec({
    format: "xlsx",
    sheets: [
      { name: "Data: [1]", rows: [["a", 1, true, null, { x: 1 }, NaN]] },
      { name: "data: [1]", rows: [["b"]] },
      { name: "kosong", rows: [] },
      "bukan objek",
    ],
  });
  check("xlsx spec: lembar kosong dibuang", s?.format === "xlsx" && s.sheets.length === 2);
  check(
    "xlsx spec: nama lembar bersih & unik",
    s?.format === "xlsx" && s.sheets[0].name === "Data 1" && s.sheets[1].name === "data 1 2",
    JSON.stringify(s?.sheets?.map((x: any) => x.name)),
  );
  check(
    "xlsx spec: sel dibersihkan",
    s?.format === "xlsx" && s.sheets[0].rows[0].join("|") === "a|1|true||[object Object]|",
    JSON.stringify(s?.sheets?.[0]?.rows),
  );
}

// ---------- Markdown -> blok ----------
{
  const blocks = mdb.parseMarkdownBlocks(
    "# Judul\n\nTeks **tebal** dan *miring* dengan `kode` [tautan](https://a.id).\n\n- satu\n  - dua\n- tiga\n\n1. a\n2. b\n\n> kutipan\n\n| A | B |\n|:--|--:|\n| 1 | 2 |\n\n```js\nlet x = 1;\n```\n\n---",
  );
  const types = blocks.map((b: any) => b.type).join(",");
  check("md: urutan blok", types === "heading,paragraph,list,list,quote,table,code,hr", types);
  const para = blocks[1];
  check(
    "md: tebal/miring/kode",
    para.runs.some((r: any) => r.bold && r.text === "tebal") &&
      para.runs.some((r: any) => r.italic && r.text === "miring") &&
      para.runs.some((r: any) => r.code && r.text === "kode"),
  );
  check("md: tautan jadi teks + URL", mdb.runsToText(para.runs).includes("tautan (https://a.id)"));
  check(
    "md: daftar bersarang punya level",
    blocks[2].items[1].level === 1 && blocks[2].items[0].level === 0,
  );
  check("md: rata kolom tabel", blocks[5].align.join() === "left,right");
}

// ---------- pembuat file ----------
const MD = [
  "# Laporan Praktikum Fisika",
  "",
  "Ringkasan **penting**: hasil *sesuai* teori. Café, naïve, “kutipan” – dash.",
  "",
  "## Data",
  "",
  "| No | Nama | Nilai |",
  "|---|:---|---:|",
  "| 1 | Andi | 90 |",
  "| 2 | Budi | 85 |",
  "",
  "- Poin pertama",
  "  - Sub poin",
  "- Poin kedua",
  "",
  "1. Langkah satu",
  "2. Langkah dua",
  "",
  "> Catatan kaki penting",
  "",
  "```",
  "print('halo')",
  "```",
].join("\n");

{
  const blob = await build.buildFileBlob({
    format: "docx",
    filename: "l",
    title: "Laporan",
    content: MD,
  });
  const p = await save(blob, "t.docx");
  const xml = execFileSync("unzip", ["-p", p, "word/document.xml"]).toString();
  check(
    "docx: zip valid & ada teks",
    xml.includes("Laporan Praktikum Fisika") &&
      xml.includes("Andi") &&
      xml.includes("Poin pertama"),
  );
  check(
    "docx: ada tabel dan heading",
    xml.includes("<w:tbl>") && xml.includes("Heading1") && xml.includes("Heading2"),
  );
  check("docx: tebal ada", xml.includes("<w:b/>") || xml.includes("<w:b "));
  const text = execFileSync("python3", [
    "-c",
    `import docx,sys;d=docx.Document(sys.argv[1]);print(len(d.paragraphs),len(d.tables),d.tables[0].cell(1,1).text)`,
    p,
  ])
    .toString()
    .trim();
  check(
    "docx: terbaca python-docx (tabel 1, sel=Andi)",
    text.endsWith(" 1 Andi") || /\b1 Andi$/.test(text),
    text,
  );
}
{
  const blob = await build.buildFileBlob({
    format: "xlsx",
    filename: "n",
    title: "",
    sheets: [
      {
        name: "Nilai",
        rows: [
          ["Nama", "Nilai"],
          ["Andi", 90],
          ["Budi", 85],
          ["Rata-rata", "=AVERAGE(B2:B3)"],
        ],
      },
      { name: "Kedua", rows: [["x"], ["y"]] },
    ],
  });
  const p = await save(blob, "t.xlsx");
  const out = execFileSync("python3", [
    "-c",
    `
import openpyxl,sys
wb=openpyxl.load_workbook(sys.argv[1])
ws=wb["Nilai"]
print(wb.sheetnames, ws["A2"].value, ws["B2"].value, type(ws["B2"].value).__name__, ws["B4"].value, ws["A1"].font.b, ws.freeze_panes)`,
    p,
  ])
    .toString()
    .trim();
  check(
    "xlsx: dua lembar, angka tetap angka, rumus, header tebal, freeze",
    out === "['Nilai', 'Kedua'] Andi 90 int =AVERAGE(B2:B3) True A2",
    out,
  );
}
{
  const blob = await build.buildFileBlob({
    format: "pdf",
    filename: "p",
    title: "Laporan",
    content: MD,
  });
  const p = await save(blob, "t.pdf");
  const head = execFileSync("head", ["-c", "5", p]).toString();
  check("pdf: header %PDF", head === "%PDF-");
  const txt = execFileSync("pdftotext", ["-layout", p, "-"]).toString();
  check(
    "pdf: teks asli bisa diekstrak",
    txt.includes("Laporan Praktikum Fisika") &&
      txt.includes("Andi") &&
      txt.includes("Poin pertama") &&
      txt.includes("print('halo')"),
    txt.slice(0, 200),
  );
  check("pdf: aksen Latin & tanda baca", txt.includes("Café") && txt.includes("naïve"));
}
{
  // Dokumen panjang -> beberapa halaman, tidak error
  const long = Array.from(
    { length: 120 },
    (_, i) =>
      `## Bagian ${i + 1}\n\n${"Kalimat contoh yang cukup panjang untuk membungkus baris. ".repeat(8)}`,
  ).join("\n\n");
  const blob = await build.buildFileBlob({
    format: "pdf",
    filename: "p",
    title: "",
    content: long,
  });
  const p = await save(blob, "long.pdf");
  const pages = Number(/Pages:\s+(\d+)/.exec(execFileSync("pdfinfo", [p]).toString())?.[1]);
  check("pdf panjang: banyak halaman", pages > 10, String(pages));
}
check(
  "pdf: emoji dibuang, simbol tak dikenal jadi ?",
  pdfLib.toPdfText("Halo 😀 世") === "Halo  ?",
);
// ---------- artifacts, ekspor, util sheet ----------
{
  const art = await import(`${SRC}/features/ai/lib/artifacts.ts`);
  const exp = await import(`${SRC}/features/ai/lib/exportFile.ts`);
  const su = await import(`${SRC}/features/ai/lib/sheetUtils.ts`);
  const f = (name: string, body: string) =>
    fence({ format: "docx", filename: name, content: body });
  const msgs: any[] = [
    { id: "u1", role: "user", text: "buat", createdAt: "" },
    {
      id: "a1",
      role: "assistant",
      text: `ok\n${f("Laporan", "v1")}\n${f("Lain", "x")}`,
      createdAt: "",
    },
    { id: "a2", role: "assistant", text: "galat", error: true, createdAt: "" },
    { id: "a3", role: "assistant", text: f("laporan", "v2"), createdAt: "" },
  ];
  const list = art.collectArtifacts(msgs);
  check("artifacts: 3 file, galat diabaikan", list.length === 3);
  check("artifacts: kunci berformat id:indeks", list[0].key === "a1:0" && list[1].key === "a1:1");
  check(
    "artifacts: versi dihitung per nama (tanpa peduli huruf besar)",
    list[0].version === 1 &&
      list[2].version === 2 &&
      list[0].versions === 2 &&
      list[1].versions === 1,
  );
  check(
    "artifacts: kunci file pertama pesan terakhir",
    art.firstArtifactKeyOf(msgs[3]) === "a3:0" &&
      art.firstArtifactKeyOf(msgs[0]) === null &&
      art.firstArtifactKeyOf(msgs[2]) === null,
  );

  check(
    "csv: kutip, koma, baris baru, null",
    exp.toCsv([
      ["a,b", 'x"y', null, 1],
      ["l1\nl2", true, "", 2.5],
    ]) === '"a,b","x""y",,1\r\n"l1\nl2",true,,2.5',
  );
  const xs = {
    format: "xlsx",
    filename: "n",
    title: "Judul",
    sheets: [
      {
        name: "S1",
        rows: [
          ["A", "B|c"],
          ["x", 1],
        ],
      },
    ],
  };
  const md = exp.specToMarkdown(xs);
  check(
    "markdown dari xlsx: judul, lembar, tabel, | di-escape",
    md.startsWith("# Judul\n\n## S1") &&
      md.includes("| A | B\\|c |") &&
      md.includes("| --- | --- |") &&
      md.includes("| x | 1 |"),
    md,
  );
  check(
    "markdown dari dokumen: judul ditambah jika belum ada H1",
    exp.specToMarkdown({ format: "pdf", filename: "p", title: "T", content: "isi" }) ===
      "# T\n\nisi" &&
      exp.specToMarkdown({ format: "pdf", filename: "p", title: "T", content: "# Sudah\n" }) ===
        "# Sudah\n",
  );
  check(
    "target ekspor: xlsx punya csv, dokumen tidak",
    exp.exportTargets(xs).some((t: any) => t.target === "csv") &&
      !exp
        .exportTargets({ format: "docx", filename: "d", title: "", content: "x" })
        .some((t: any) => t.target === "csv" || t.target === "xlsx"),
  );
  check(
    "kolom: A, Z, AA, AB, AZ, BA",
    ["A", "Z", "AA", "AB", "AZ", "BA"].every(
      (c, i) => su.columnLetter([0, 25, 26, 27, 51, 52][i]!) === c,
    ),
  );
  check(
    "sel: angka, desimal koma, kosong, teks",
    su.parseCellInput(" 42 ") === 42 &&
      su.parseCellInput("95,5") === 95.5 &&
      su.parseCellInput("-3.2") === -3.2 &&
      su.parseCellInput("  ") === null &&
      su.parseCellInput("12abc") === "12abc" &&
      su.parseCellInput("=SUM(A1:A2)") === "=SUM(A1:A2)",
  );

  // Konversi nyata: Excel -> Word, dokumen -> PDF
  const made: Blob[] = [];
  const origUrl = URL.createObjectURL;
  (globalThis as any).document = {
    createElement: () => ({ click() {}, remove() {} }),
    body: { appendChild() {} },
  };
  URL.createObjectURL = ((b: Blob) => (made.push(b), "blob:x")) as any;
  await exp.exportAs(xs, "docx");
  await exp.exportAs({ format: "docx", filename: "d", title: "", content: "# Hai\n\nIsi" }, "pdf");
  URL.createObjectURL = origUrl;
  delete (globalThis as any).document;
  const p1 = await save(made[0]!, "konv.docx");
  const x1 = execFileSync("unzip", ["-p", p1, "word/document.xml"]).toString();
  check("konversi: xlsx -> docx memuat tabel", x1.includes("<w:tbl>") && x1.includes("B|c"));
  const p2 = await save(made[1]!, "konv.pdf");
  check(
    "konversi: docx -> pdf valid",
    execFileSync("pdftotext", [p2, "-"]).toString().includes("Isi"),
  );
}

check(
  "prompt sistem memuat petunjuk file",
  server.SYSTEM_PROMPT.includes("noteme-file") && server.SYSTEM_PROMPT.includes("xlsx"),
);

console.log(fail === 0 ? "\nSEMUA OK" : `\n${fail} GAGAL`);
process.exit(fail === 0 ? 0 : 1);
