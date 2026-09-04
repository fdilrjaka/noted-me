type Typist = {
  deviceId: string;
  name: string;
  avatarUrl: string | null;
  avatarColor: string;
};

function initialOf(name: string) {
  return (name.trim()[0] || "?").toUpperCase();
}

/**
 * Muncul mengambang di atas isi catatan kalau ada device lain (login akun yang
 * sama) yang lagi ngetik di catatan yang sedang kamu buka juga. Cuma nampilin
 * satu pin utama (yang paling baru ngirim sinyal); kalau lebih dari satu device
 * lain lagi ngetik bareng, sisanya diringkas jadi "+N lainnya".
 */
export function TypingIndicator({ typists }: { typists: Typist[] }) {
  const lead = typists[0];
  if (!lead) return null;
  const extra = typists.length - 1;

  return (
    <div
      className="spring-in pointer-events-none absolute left-1/2 top-3 z-30 flex -translate-x-1/2 flex-col items-center"
      aria-live="polite"
    >
      {/* Pin ala Google Maps: bulatan foto/inisial di atas, ekor lancip di bawah. */}
      <div className="pin-bob relative flex flex-col items-center drop-shadow-lg">
        <div className="glass-floating flex size-11 items-center justify-center overflow-hidden rounded-full border-2 border-background">
          {lead.avatarUrl ? (
            <img src={lead.avatarUrl} alt="" className="size-full object-cover" />
          ) : (
            <span
              className="flex size-full items-center justify-center text-sm font-bold text-white"
              style={{ backgroundColor: lead.avatarColor }}
            >
              {initialOf(lead.name)}
            </span>
          )}
        </div>
        {/* Ekor pin: persegi diputar 45°, ketutup setengah biar keliatan lancip di bawah. */}
        <div
          className="glass-floating -mt-2 size-3.5 rotate-45 border-2 border-background"
          style={{ borderTop: "none", borderLeft: "none" }}
          aria-hidden="true"
        />
      </div>

      <span className="typing-pulse glass-toolbar mt-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium text-foreground">
        {lead.name || "Seseorang"} sedang mengetik{extra > 0 ? ` +${extra} lainnya` : ""}
      </span>
    </div>
  );
}
