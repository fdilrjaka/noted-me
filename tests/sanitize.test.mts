const SRC = new URL("../src", import.meta.url).pathname;
import { JSDOM } from "jsdom";
const dom = new JSDOM("<!doctype html><html><body></body></html>");
(globalThis as any).DOMParser = dom.window.DOMParser;
(globalThis as any).NodeFilter = dom.window.NodeFilter;
const { sanitizeStoredHtml, isSafeUrl } = await import(`${SRC}/lib/noteme/sanitizeHtml.ts`);

let fail = 0;
function check(name: string, cond: boolean, extra = "") {
  if (!cond) {
    fail++;
    console.log("FAIL", name, extra);
  } else console.log("ok  ", name);
}

const attacks: Array<[string, string]> = [
  ["script tag", `<p>a</p><script>alert(1)</script>`],
  ["leading script (head)", `<script>alert(1)</script><p>a</p>`],
  ["img onerror", `<img src=x onerror="alert(1)">`],
  ["svg onload", `<svg onload=alert(1)><circle/></svg>`],
  ["math", `<math><mi xlink:href="javascript:alert(1)">x</mi></math>`],
  ["a javascript", `<a href="javascript:alert(1)">x</a>`],
  ["a java\\tscript", `<a href="java\tscript:alert(1)">x</a>`],
  ["a entity js", `<a href="&#106;avascript:alert(1)">x</a>`],
  ["a data html", `<a href="data:text/html;base64,PHNjcmlwdD4=">x</a>`],
  ["iframe srcdoc", `<iframe srcdoc="<script>alert(1)</script>"></iframe>`],
  ["object", `<object data="javascript:alert(1)"></object>`],
  ["style tag", `<style>*{x:y}</style><p>a</p>`],
  ["meta refresh", `<meta http-equiv="refresh" content="0;url=javascript:alert(1)"><p>a</p>`],
  [
    "form action",
    `<form action="javascript:alert(1)"><button formaction="javascript:alert(2)">x</button></form>`,
  ],
  ["style expression", `<div style="width:expression(alert(1))">x</div>`],
  ["body onload", `<body onload=alert(1)><p>a</p>`],
  ["comment", `<p>a</p><!--[if IE]><script>alert(1)</script><![endif]-->`],
  ["img srcset", `<img srcset="javascript:alert(1) 1x" src="idb:1">`],
  ["template", `<template><script>alert(1)</script></template>`],
  ["noscript mxss", `<noscript><p title="</noscript><img src=x onerror=alert(1)>"></noscript>`],
];
for (const [name, html] of attacks) {
  const out = sanitizeStoredHtml(html);
  // Cek berbasis DOM: parse ulang hasilnya persis seperti browser saat innerHTML, lalu cari yang berbahaya.
  const host = dom.window.document.createElement("div");
  host.innerHTML = out;
  const badEl = host.querySelector(
    "script,iframe,object,embed,svg,math,style,meta,link,base,template,noscript,form [formaction],[srcdoc],[srcset]",
  );
  let badAttr = false;
  host.querySelectorAll("*").forEach((el) => {
    for (const a of Array.from(el.attributes)) {
      if (/^on/i.test(a.name)) badAttr = true;
      if (
        /^(href|src|action|formaction|data|poster|xlink:href)$/i.test(a.name) &&
        /^\s*(javascript|vbscript|data:text)/i.test(a.value.replace(/[\u0000-\u0020]/g, ""))
      )
        badAttr = true;
      if (a.name === "style" && /expression\(|javascript:/i.test(a.value)) badAttr = true;
    }
  });
  const hasComment = /<!--/.test(out);
  check("blocks: " + name, !badEl && !badAttr && !hasComment, out);
}

// Konten sah harus lolos utuh
const legit =
  `<p>Halo <strong>dunia</strong> <a href="https://x.id" target="_blank">link</a></p>` +
  `<span class="img-resize-wrap" contenteditable="false"><img src="idb:abc-123" data-idb-id="abc-123" alt="Gambar catatan" style="width: 240px;"><span class="img-resize-handle" contenteditable="false"></span><span class="img-resize-delete" contenteditable="false" role="button" aria-label="Hapus gambar">×</span></span>` +
  `<table><colgroup><col style="width: 120px;"></colgroup><thead><tr><th>Kolom 1</th></tr></thead><tbody><tr><td><br></td></tr></tbody></table>` +
  `<ul><li>a</li></ul><ol><li>b</li></ol><p style="text-align: center;">c</p><img src="data:image/png;base64,iVBORw0KGgo=">`;
const out = sanitizeStoredHtml(legit);
check("keeps idb src", out.includes(`src="idb:abc-123"`));
check("keeps data-idb-id", out.includes(`data-idb-id="abc-123"`));
check(
  "keeps wrapper classes",
  out.includes("img-resize-wrap") && out.includes("img-resize-delete"),
);
check(
  "keeps contenteditable/role/aria",
  out.includes(`contenteditable="false"`) &&
    out.includes(`role="button"`) &&
    out.includes(`aria-label="Hapus gambar"`),
);
check(
  "keeps table",
  out.includes("<colgroup>") && out.includes("<thead>") && out.includes("<th>Kolom 1</th>"),
);
check(
  "keeps https link + adds rel",
  out.includes(`href="https://x.id"`) && out.includes("noopener"),
);
check("keeps png data image", out.includes("data:image/png;base64"));
check("keeps style width", out.includes("width: 240px"));
check("keeps lists", out.includes("<ul><li>a</li></ul>") && out.includes("<ol><li>b</li></ol>"));
check("empty in -> empty out", sanitizeStoredHtml("") === "");
check("isSafeUrl blob", isSafeUrl("blob:https://x/uuid"));
check("isSafeUrl relative", isSafeUrl("/a/b") && isSafeUrl("#x"));
check("isSafeUrl svg data blocked", !isSafeUrl("data:image/svg+xml;base64,AAAA"));
// idempoten: dua kali sanitize hasilnya sama
check("idempotent", sanitizeStoredHtml(out) === out);
console.log(fail ? `\n${fail} FAILED` : "\nALL PASSED");
process.exit(fail ? 1 : 0);
