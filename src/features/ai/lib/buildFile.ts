import { buildDocx } from "./buildDocx";
import { buildPdf } from "./buildPdf";
import { buildXlsx } from "./buildXlsx";
import { downloadName, type FileSpec } from "./fileSpec";

export async function buildFileBlob(spec: FileSpec): Promise<Blob> {
  if (spec.format === "xlsx") return buildXlsx(spec.sheets);
  if (spec.format === "docx") return buildDocx(spec.title, spec.content);
  return buildPdf(spec.title, spec.content);
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function downloadFile(spec: FileSpec): Promise<void> {
  triggerDownload(await buildFileBlob(spec), downloadName(spec));
}
