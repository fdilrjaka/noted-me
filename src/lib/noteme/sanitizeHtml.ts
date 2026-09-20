/**
 * Sanitizer untuk HTML catatan yang TERSIMPAN (content Page), dipakai di semua tempat yang
 * memasukkan content itu ke DOM lewat innerHTML: editor (saat buka halaman / terima update
 * dari device lain), import backup JSON, dan ekspor PDF.
 *
 * Beda dari `sanitizePastedHtml` (editor/domHelpers.ts): itu allowlist ketat untuk HTML hasil
 * paste dari luar. Yang ini sengaja lebih longgar, karena content tersimpan memang berisi
 * markup internal editor (span .img-resize-wrap, data-idb-id, style lebar gambar, dst) yang
 * tidak boleh ikut terbuang. Tugasnya cuma satu: membuang hal yang bisa mengeksekusi kode.
 *
 * Yang dibuang:
 *  - elemen aktif / pembawa konteks lain: script, iframe, object, embed, style, link, meta,
 *    base, svg, math, noscript, template (svg/math/noscript/template dibuang juga karena
 *    sumber klasik mutation-XSS saat HTML di-parse ulang oleh browser)
 *  - semua atribut event handler (on*), srcdoc, srcset
 *  - URL berskema berbahaya (javascript:, vbscript:, data:text/html, dst) di atribut URL
 *  - style inline yang memuat expression()/javascript:/@import
 *  - komentar HTML
 *
 * Parsing memakai DOMParser (dokumen inert: script tidak jalan, gambar tidak di-fetch), jadi
 * aman dipanggil pada input yang tidak dipercaya. Hanya jalan di browser.
 */

const BLOCKED_TAGS = new Set([
  "script",
  "iframe",
  "frame",
  "frameset",
  "object",
  "embed",
  "applet",
  "style",
  "link",
  "meta",
  "base",
  "svg",
  "math",
  "noscript",
  "template",
]);

const DROP_ATTRS = new Set(["srcdoc", "srcset", "ping"]);

const URL_ATTRS = new Set([
  "href",
  "src",
  "xlink:href",
  "action",
  "formaction",
  "poster",
  "background",
  "data",
  "cite",
  "longdesc",
  "manifest",
  "codebase",
  "icon",
]);

// idb: = referensi gambar lokal editor, blob: = URL sementara hasil resolve gambar.
const SAFE_SCHEMES = new Set(["http:", "https:", "mailto:", "tel:", "blob:", "idb:"]);
const SAFE_DATA_IMAGE = /^data:image\/(?:png|jpe?g|gif|webp|avif|bmp)[;,]/i;
const UNSAFE_STYLE = /expression\s*\(|javascript:|vbscript:|@import|behavior\s*:|-moz-binding/i;

// Karakter yang diabaikan browser di dalam skema URL ("java\tscript:") atau tak terlihat.
function isIgnorableInScheme(code: number): boolean {
  return (
    code <= 0x20 ||
    (code >= 0x7f && code <= 0x9f) ||
    code === 0xad ||
    (code >= 0x200b && code <= 0x200f) ||
    code === 0x2028 ||
    code === 0x2029 ||
    code === 0xfeff
  );
}

export function isSafeUrl(value: string): boolean {
  // Buang karakter tersebut sebelum skema dicek. Entity HTML (&#106;avascript:) sudah
  // didekode oleh parser saat atribut dibaca.
  let compact = "";
  for (const ch of value) {
    if (!isIgnorableInScheme(ch.codePointAt(0) ?? 0)) compact += ch;
  }
  const match = /^([a-z][a-z0-9+.-]*:)/i.exec(compact);
  if (!match) return true; // relatif, "#anchor", "//host/path"
  const scheme = match[1]!.toLowerCase();
  if (SAFE_SCHEMES.has(scheme)) return true;
  return scheme === "data:" && SAFE_DATA_IMAGE.test(compact);
}

export function sanitizeStoredHtml(html: string): string {
  if (!html) return "";
  if (typeof DOMParser === "undefined") return "";

  const doc = new DOMParser().parseFromString(html, "text/html");
  const body = doc.body;

  body.querySelectorAll("*").forEach((el) => {
    const tag = el.tagName.toLowerCase();
    if (BLOCKED_TAGS.has(tag)) {
      el.remove();
      return;
    }
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on") || DROP_ATTRS.has(name)) {
        el.removeAttribute(attr.name);
      } else if (URL_ATTRS.has(name) && !isSafeUrl(attr.value)) {
        el.removeAttribute(attr.name);
      } else if (name === "style" && UNSAFE_STYLE.test(attr.value)) {
        el.removeAttribute(attr.name);
      }
    }
    if (tag === "a" && el.hasAttribute("target")) {
      el.setAttribute("rel", "noopener noreferrer");
    }
  });

  const walker = doc.createTreeWalker(body, NodeFilter.SHOW_COMMENT);
  const comments: Node[] = [];
  while (walker.nextNode()) comments.push(walker.currentNode);
  comments.forEach((node) => node.parentNode?.removeChild(node));

  return body.innerHTML;
}
