export function ComingSoonRow({ label, sublabel }: { label: string; sublabel?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 opacity-60">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{label}</p>
        {sublabel && <p className="truncate text-xs text-muted-foreground">{sublabel}</p>}
      </div>
      <span className="flex-none rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">
        Segera hadir
      </span>
    </div>
  );
}
