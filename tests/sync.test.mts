// Skenario sync dijalankan di proses terpisah (sync/scenario.mts) karena tiap skenario butuh
// state store yang bersih (localStorage, modul singleton). Di sini hanya memeriksa hasilnya.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const worker = fileURLToPath(new URL("./sync/scenario.mts", import.meta.url));
const tsconfig = fileURLToPath(new URL("./tsconfig.json", import.meta.url));

let fail = 0;
const t = (name: string, ok: boolean, detail: unknown = "") => {
  if (!ok) {
    fail++;
    console.log("FAIL", name, JSON.stringify(detail)?.slice(0, 300));
  } else console.log("ok  ", name);
};

function run(scenario: string): Record<string, unknown> {
  const r = spawnSync(process.execPath, ["--import", "tsx", worker], {
    env: { ...process.env, SCENARIO: scenario, TSX_TSCONFIG_PATH: tsconfig },
    encoding: "utf8",
    timeout: 90_000,
  });
  const line = (r.stdout ?? "")
    .split("\n")
    .reverse()
    .find((l) => l.startsWith("{"));
  if (!line)
    throw new Error(`skenario ${scenario} tidak menghasilkan hasil:\n${r.stdout}\n${r.stderr}`);
  return JSON.parse(line);
}

const pagination = run("pagination");
t(
  "pull 1200 baris: semuanya sampai ke perangkat (bukan terpotong 1000)",
  pagination["pulledToDevice"] === 1200,
  pagination,
);

t(
  "baris dari perangkat berjam mundur tetap ketarik (kursor jam server)",
  run("clockskew")["rowWithPastClientClockPulled"] === true,
);

const nomig = run("nomigration");
t(
  "kolom server_updated_at belum ada: sync tetap jalan (fallback ke updated_at)",
  nomig["pulledOnFirstSync"] === 2 && nomig["pulledAfterSecondSync"] === 3,
  nomig,
);

const race = run("schedule-race");
t(
  "edit jadwal saat sync berjalan tidak hilang dan tetap ditandai belum terkirim",
  race["editedDuringSync"] === "R2-diedit-saat-sync" && race["stillMarkedDirty"] === true,
  race,
);

const cross = run("cross-account");
t(
  "akun B tidak menerima catatan akun A (server maupun lokal), dan ada konfirmasi",
  cross["promptWouldShow"] === true &&
    cross["subjectsLeakedIntoAccountB"] === 0 &&
    cross["localSubjectsVisibleToB"] === 0,
  cross,
);

const guest = run("guest-adopt");
t(
  "catatan tamu tetap ada saat login pertama dan untuk akun yang sama",
  guest["guestNotesKeptAfterFirstLogin"] === 1 && guest["stillKeptForSameAccount"] === 1,
  guest,
);

const remoteNewer = run("todo-remote-newer");
t(
  "todo: edit perangkat lain yang lebih baru menang dan tidak ditimpa push lama",
  remoteNewer["serverTitle"] === "edit di perangkat lain (lebih baru)" &&
    remoteNewer["localTitle"] === "edit di perangkat lain (lebih baru)" &&
    remoteNewer["pushedByThisDevice"] === 0,
  remoteNewer,
);

const localNewer = run("todo-local-newer");
t(
  "todo: edit lokal yang lebih baru ter-push dan tampil konsisten",
  localNewer["serverTitle"] === "edit lokal baru" && localNewer["localTitle"] === "edit lokal baru",
  localNewer,
);

t(
  "todo: salinan server yang lebih lama tidak menimpa baris lokal",
  run("todo-stale-echo")["localTitle"] === "versi terbaru lokal",
);

process.exit(fail ? 1 : 0);
