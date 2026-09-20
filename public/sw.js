// NoteMe offline shell. Catatan sendiri tersimpan di localStorage/IndexedDB, jadi SW ini hanya
// perlu menjaga aplikasi tetap bisa dibuka tanpa jaringan.
//
// Aturan penting (semuanya pernah salah di versi sebelumnya):
//  - Naikkan VERSION setiap mengubah perilaku SW; cache versi lama dibuang saat activate.
//  - Cache "/" (app shell) JANGAN ditimpa oleh navigasi ke halaman lain. Tiap halaman disimpan
//    di URL-nya sendiri; "/" hanya jadi cadangan terakhir untuk halaman yang belum pernah dibuka.
//  - Hanya respons HTML yang OK dan bukan hasil redirect yang boleh disimpan (respons redirect
//    tidak boleh dipakai untuk navigasi, dan halaman error tidak boleh jadi "cadangan offline").
//  - Server function (/_serverFn), API, dan OAuth SELALU ke jaringan. Kalau di-cache, hasil GET
//    seperti getRecoveryStatus akan basi selamanya.
//  - Jumlah entri dibatasi, karena nama file hasil build berganti tiap deploy.
const VERSION = "v2";
const CACHE = `noteme-shell-${VERSION}`;
const MAX_ENTRIES = 150;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(["/"])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function bypass(url) {
  const p = url.pathname;
  return (
    p.startsWith("/~oauth") ||
    p.startsWith("/api") ||
    p.startsWith("/_serverFn") ||
    p.startsWith("/_server")
  );
}

function isCacheableHtml(response) {
  const type = response.headers.get("content-type") || "";
  return response.ok && !response.redirected && type.includes("text/html");
}

async function put(request, response) {
  const cache = await caches.open(CACHE);
  await cache.put(request, response);
  const keys = await cache.keys();
  if (keys.length > MAX_ENTRIES) {
    const removable = keys.filter((k) => new URL(k.url).pathname !== "/");
    await Promise.all(removable.slice(0, keys.length - MAX_ENTRIES).map((k) => cache.delete(k)));
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (bypass(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (isCacheableHtml(response)) event.waitUntil(put(request, response.clone()));
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE);
          return (await cache.match(request)) ?? (await cache.match("/")) ?? Response.error();
        }),
    );
    return;
  }

  // File hasil build bernama hash: isinya tidak pernah berubah, jadi cache-first aman.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok && response.type === "basic")
              event.waitUntil(put(request, response.clone()));
            return response;
          }),
      ),
    );
    return;
  }

  // Sisanya (ikon, manifest, gambar): sajikan cache dulu tapi segarkan di belakang layar,
  // supaya perubahan tidak tertahan selamanya.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok && response.type === "basic")
            event.waitUntil(put(request, response.clone()));
          return response;
        })
        .catch(() => null);
      if (cached) {
        event.waitUntil(network);
        return cached;
      }
      return network.then((response) => response ?? Response.error());
    }),
  );
});
