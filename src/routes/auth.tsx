import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, LogOut, Trash2, Camera, X } from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "@/components/noteme/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useSession, usernameToEmail } from "@/hooks/useSession";
import { registerNavDragTarget } from "@/lib/noteme/navDrag";
import { dirtyCount, trashItems, useData } from "@/lib/noteme/store";
import { syncNow } from "@/lib/noteme/sync";

// Warna fallback avatar kalau user belum (atau gak mau) pasang foto profil.
const AVATAR_COLORS = ["#7c3aed", "#be185d", "#0369a1", "#047857", "#c2410c", "#525252"];

const AVATAR_SIZE_PX = 160; // sisi persegi thumbnail avatar sebelum dikompres

/** Kompres foto yang dipilih jadi thumbnail persegi kecil (data URL), biar muat nyaman
 * disimpan di user_metadata (gak butuh bucket Storage terpisah buat sesuatu sekecil ini). */
function fileToAvatarDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("File bukan gambar yang valid"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = AVATAR_SIZE_PX;
        canvas.height = AVATAR_SIZE_PX;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas tidak didukung"));
          return;
        }
        // Crop persegi dari tengah gambar (cover), baru resize ke ukuran thumbnail.
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_SIZE_PX, AVATAR_SIZE_PX);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function initialLetter(nickname: string, username: string) {
  const source = nickname.trim() || username.trim();
  return source ? source[0]!.toUpperCase() : "?";
}

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Masuk — NoteMe" },
      {
        name: "description",
        content:
          "Masuk ke NoteMe dengan username dan password untuk menyinkronkan catatan kuliahmu.",
      },
      { property: "og:title", content: "Masuk — NoteMe" },
      {
        property: "og:description",
        content: "Login sederhana dengan username dan password untuk sinkronisasi catatan NoteMe.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user } = useSession();
  const data = useData();
  const { subjects: trashedSubjects, pages: trashedPages } = trashItems(data);
  const trashCount = trashedSubjects.length + trashedPages.length;
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [nickname, setNickname] = useState("");
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileDirty, setProfileDirty] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Muat nickname/foto/warna dari user_metadata tiap kali user (login/logout) berubah —
  // sengaja gak diikat ke seluruh objek `user` biar gak nimpa field yang lagi diedit user
  // di kartu ini gara-gara metadata di-refresh sama updateUser() kita sendiri.
  useEffect(() => {
    const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
    setNickname(typeof meta["nickname"] === "string" ? meta["nickname"] : "");
    setAvatarColor(
      typeof meta["avatar_color"] === "string" ? meta["avatar_color"] : AVATAR_COLORS[0],
    );
    setAvatarUrl(typeof meta["avatar_url"] === "string" ? meta["avatar_url"] : null);
    setProfileDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const usernameLabel = user?.email?.replace("@noteme.app", "") ?? "";

  async function saveProfile(overrides?: { avatar_url?: string | null }) {
    if (!user) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          nickname: nickname.trim(),
          avatar_color: avatarColor,
          avatar_url: overrides && "avatar_url" in overrides ? overrides.avatar_url : avatarUrl,
        },
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      setProfileDirty(false);
      toast.success("Profil disimpan");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePickPhoto(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Pilih file gambar");
      return;
    }
    setUploadingPhoto(true);
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      setAvatarUrl(dataUrl);
      await saveProfile({ avatar_url: dataUrl });
    } catch {
      toast.error("Gagal memproses foto");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleRemovePhoto() {
    setAvatarUrl(null);
    await saveProfile({ avatar_url: null });
  }

  const submit = async () => {
    const clean = username.trim();
    if (clean.length < 3) {
      toast.error("Username minimal 3 karakter");
      return;
    }
    if (password.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }
    setBusy(true);
    const email = usernameToEmail(username);

    try {
      if (mode === "up") {
        const { data: signUpData, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          const msg = error.message.toLowerCase();
          if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
            toast.error("Username sudah dipakai — coba masuk saja");
            setMode("in");
            return;
          }
          toast.error(error.message);
          return;
        }
        // No session means the project still requires confirmation — sign in explicitly.
        if (!signUpData.session) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (signInError) {
            toast.error(signInError.message);
            return;
          }
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          toast.error(
            error.message.toLowerCase().includes("invalid")
              ? "Username atau password salah"
              : error.message,
          );
          return;
        }
      }

      const { data: sess } = await supabase.auth.getSession();
      if (sess.session) {
        try {
          // Full pull so catatan dari perangkat lain langsung muncul di sini.
          await syncNow(sess.session.user.id, { full: true });
        } catch {
          toast("Masuk berhasil, sinkronisasi dicoba lagi otomatis");
        }
      }
      toast.success(mode === "in" ? "Selamat datang kembali" : "Akun dibuat");
      void navigate({ to: "/" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main
      ref={registerNavDragTarget}
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 safe-top safe-bottom-lg"
    >
      <header className="flex items-center gap-2 py-3">
        <Link
          to="/"
          aria-label="Kembali"
          className="press glass-floating flex size-10 items-center justify-center rounded-full active:scale-90"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="text-lg font-bold tracking-tight">Akun</h1>
      </header>

      {user ? (
        <div className="glass-card spring-in mt-6 rounded-3xl p-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Foto profil"
                  className="size-16 rounded-full object-cover"
                />
              ) : (
                <div
                  className="flex size-16 items-center justify-center rounded-full text-xl font-semibold text-white"
                  style={{ backgroundColor: avatarColor }}
                >
                  {initialLetter(nickname, usernameLabel)}
                </div>
              )}
              <button
                aria-label="Ubah foto profil"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="press-sm absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground active:scale-90 disabled:opacity-60"
              >
                <Camera className="size-3.5" />
              </button>
              {avatarUrl && (
                <button
                  aria-label="Hapus foto profil"
                  onClick={() => void handleRemovePhoto()}
                  className="press-sm absolute -top-1 -right-1 flex size-6 items-center justify-center rounded-full bg-input text-foreground active:scale-90"
                >
                  <X className="size-3.5" />
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void handlePickPhoto(e.target.files?.[0])}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted-foreground">Masuk sebagai</p>
              <p className="truncate text-lg font-semibold">{usernameLabel}</p>
            </div>
          </div>

          <div className="mt-5">
            <label className="text-sm font-medium text-muted-foreground">Nama panggilan</label>
            <input
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                setProfileDirty(true);
              }}
              placeholder="Panggil aku apa?"
              maxLength={40}
              className="glass-input mt-1.5 w-full rounded-2xl px-4 py-3 text-[15px] outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="mt-4">
            <label className="text-sm font-medium text-muted-foreground">
              Warna avatar (dipakai kalau tanpa foto)
            </label>
            <div className="mt-2 flex gap-2.5">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  aria-label={`Pilih warna ${c}`}
                  onClick={() => {
                    setAvatarColor(c);
                    setProfileDirty(true);
                  }}
                  className="press-sm size-8 rounded-full active:scale-90"
                  style={{
                    backgroundColor: c,
                    outline: avatarColor === c ? "2px solid var(--ring)" : "none",
                    outlineOffset: 2,
                  }}
                />
              ))}
            </div>
          </div>

          {profileDirty && (
            <button
              onClick={() => void saveProfile()}
              disabled={savingProfile}
              className="press mt-4 w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground active:scale-95 disabled:opacity-60"
            >
              {savingProfile ? "Menyimpan…" : "Simpan profil"}
            </button>
          )}

          <p className="mt-5 text-sm text-muted-foreground">
            {dirtyCount() > 0
              ? `${dirtyCount()} perubahan menunggu sinkronisasi.`
              : "Semua catatan tersinkron."}
          </p>

          <Link
            to="/trash"
            className="press-sm mt-3 flex items-center gap-3 rounded-2xl border border-border px-4 py-3 active:scale-[0.98]"
          >
            <Trash2 className="size-4 text-muted-foreground" />
            <span className="flex-1 text-sm font-medium">Trash</span>
            {trashCount > 0 && (
              <span className="rounded-full bg-input px-2 py-0.5 text-xs text-muted-foreground">
                {trashCount}
              </span>
            )}
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>

          <button
            onClick={async () => {
              await syncNow(user.id).catch(() => toast.error("Sinkronisasi gagal"));
              await supabase.auth.signOut();
              toast.success("Keluar — catatan tetap ada di perangkat");
              void navigate({ to: "/" });
            }}
            className="press mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-border py-3 text-sm font-medium active:scale-95"
          >
            <LogOut className="size-4" /> Sinkron lalu keluar
          </button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {data.subjects.filter((s) => !s.deleted).length} mata kuliah tersimpan
          </p>
        </div>
      ) : (
        <div className="glass-card spring-in mt-6 rounded-3xl p-6">
          <h2 className="text-xl font-bold tracking-tight">
            {mode === "in" ? "Masuk" : "Buat akun"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Catatan tetap berjalan offline. Akun hanya untuk sinkronisasi antar perangkat.
          </p>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            autoCapitalize="none"
            autoComplete="username"
            className="glass-input mt-5 w-full rounded-2xl px-4 py-3 text-[15px] outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
            type="password"
            placeholder="Password"
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            className="glass-input mt-2 w-full rounded-2xl px-4 py-3 text-[15px] outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          />
          <button
            disabled={busy}
            onClick={() => void submit()}
            className="press mt-4 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground active:scale-95 disabled:opacity-60"
          >
            {busy ? "Memproses…" : mode === "in" ? "Masuk" : "Daftar"}
          </button>
          <button
            onClick={() => setMode(mode === "in" ? "up" : "in")}
            className="press-sm mt-4 w-full text-center text-sm text-muted-foreground"
          >
            {mode === "in" ? (
              <>
                Belum punya akun?{" "}
                <span className="font-semibold text-primary underline underline-offset-2">
                  Daftar
                </span>
              </>
            ) : (
              <>
                Sudah punya akun?{" "}
                <span className="font-semibold text-primary underline underline-offset-2">
                  Masuk
                </span>
              </>
            )}
          </button>
          <Link to="/" className="press-sm mt-3 block text-center text-sm text-primary underline">
            Lanjut tanpa akun
          </Link>
        </div>
      )}

      <BottomNav />
    </main>
  );
}
