import {
  Bell,
  Tags,
  Link2,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
  User,
  type LucideIcon,
} from "lucide-react";

const SETTINGS_SECTIONS: { id: string; title: string; sub: string; icon: LucideIcon }[] = [
  { id: "sec-akun", title: "Akun & Profil", sub: "Account & Profile", icon: User },
  { id: "sec-keamanan", title: "Keamanan & Sandi", sub: "Security & Password", icon: ShieldCheck },
  {
    id: "sec-preferensi",
    title: "Preferensi Penggunaan",
    sub: "Usage Preferences",
    icon: SlidersHorizontal,
  },
  {
    id: "sec-notifikasi",
    title: "Notifikasi & Pengingat",
    sub: "Notifications & Reminders",
    icon: Bell,
  },
  { id: "sec-tag", title: "Kategori & Tag", sub: "Categories & Tags", icon: Tags },
  { id: "sec-data", title: "Fungsi Impor & Ekspor", sub: "Import & Export", icon: Upload },
  { id: "sec-integrasi", title: "Integrasi & API", sub: "Integrations & API", icon: Link2 },
];

/** Menu kiri: klik untuk melompat (scroll halus) ke section di panel isi. */
export function SettingsNav({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav
      aria-label="Bagian pengaturan"
      className="flex gap-1.5 overflow-x-auto p-3 lg:flex-col lg:overflow-visible lg:p-4"
    >
      {SETTINGS_SECTIONS.map(({ id, title, sub, icon: Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-current={isActive ? "true" : undefined}
            className={`press-sm flex flex-none items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left transition-colors lg:w-full ${
              isActive
                ? "bg-primary/15 text-foreground"
                : "text-muted-foreground hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
            }`}
          >
            <Icon className={`size-5 flex-none ${isActive ? "text-primary" : ""}`} />
            <span className="min-w-0">
              <span className="block whitespace-nowrap text-sm font-semibold leading-tight lg:whitespace-normal">
                {title}
              </span>
              <span className="mt-0.5 hidden text-xs leading-tight opacity-80 lg:block">{sub}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
