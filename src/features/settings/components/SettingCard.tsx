/** Kartu wadah generik dipakai di semua section — biar konsisten & gampang diedit. */
export function SettingCard({
  icon: Icon,
  title,
  children,
  className = "",
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`glass-card rounded-3xl p-5 ${className}`}>
      <div className="mb-4 flex items-center gap-2.5">
        <Icon className="size-4.5 text-primary" />
        <h2 className="text-sm font-bold tracking-wide uppercase">{title}</h2>
      </div>
      {children}
    </div>
  );
}
