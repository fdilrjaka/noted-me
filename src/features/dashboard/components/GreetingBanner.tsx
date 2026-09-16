import { Sun } from "lucide-react";

export function GreetingBanner({ name }: { name?: string }) {
  const displayName = name || "Fadhil";

  return (
    <section className="glass-card relative overflow-hidden rounded-3xl p-6 sm:p-7 border border-white/80 dark:border-white/10 shadow-sm bg-gradient-to-r from-white/80 via-white/50 to-emerald-50/40 dark:from-white/5 dark:via-white/0 dark:to-emerald-400/5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Good Morning, {displayName}!
            </h1>
            <Sun className="size-6 text-amber-400 fill-amber-300 animate-pulse" />
          </div>
          <p className="text-sm font-medium text-muted-foreground max-w-md leading-relaxed">
            Hari ini adalah kesempatan baru untuk jadi versi terbaik dari diri kamu.
          </p>
        </div>

        {/* Note Coretan / Hand-written 'Progress not perfection' */}
        <div className="relative z-10 sm:self-center self-end pr-2 pt-2 sm:pt-0">
          <div className="rotate-[-6deg] font-handwriting text-foreground/80 text-xl sm:text-2xl font-bold flex flex-col items-center">
            <span>Progress</span>
            <span className="flex items-center gap-1 -mt-1">
              not perfection
              <span className="text-lg"></span>
            </span>
            <svg width="100" height="12" viewBox="0 0 100 12" className="text-muted-foreground/60 stroke-current fill-none">
              <path d="M 5 6 Q 50 12 95 4" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
