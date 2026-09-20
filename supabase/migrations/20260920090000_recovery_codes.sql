-- Kode pemulihan password.
-- Akun memakai email palsu (<username>@noteme.app), jadi reset lewat email tidak mungkin.
-- Sebagai gantinya user memegang kode sekali pakai. Yang tersimpan di sini hanya HASH-nya.
--
-- Tabel ini HANYA boleh disentuh server (service role). RLS aktif tanpa satu pun policy
-- (= tolak semua untuk anon/authenticated) dan hak aksesnya dicabut eksplisit sebagai lapis kedua.

CREATE TABLE IF NOT EXISTS public.recovery_codes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username_key text NOT NULL,             -- username baku (lowercase), kunci pencarian saat reset
  batch_id    uuid NOT NULL,              -- satu batch = satu kali "buat kode baru"
  code_id     text NOT NULL,              -- 4 karakter pertama kode (bukan rahasia), untuk lookup
  salt        text NOT NULL,
  iterations  integer NOT NULL,
  code_hash   text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  used_at     timestamptz,
  CONSTRAINT recovery_codes_username_code_key UNIQUE (username_key, code_id)
);

CREATE INDEX IF NOT EXISTS recovery_codes_user_idx ON public.recovery_codes (user_id);

-- Pembatas percobaan salah, per username (juga untuk username yang tidak ada, supaya respons
-- dan perilakunya tidak membocorkan apakah username itu terdaftar).
CREATE TABLE IF NOT EXISTS public.recovery_throttle (
  key               text PRIMARY KEY,
  fails             integer NOT NULL DEFAULT 0,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  locked_until      timestamptz
);

ALTER TABLE public.recovery_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_throttle ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.recovery_codes FROM anon, authenticated;
REVOKE ALL ON TABLE public.recovery_throttle FROM anon, authenticated;
