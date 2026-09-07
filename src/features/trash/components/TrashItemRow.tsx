import { RotateCcw, Trash2 } from "lucide-react";

export function TrashItemRow(props: {
  title: string;
  subtitle: string;
  onRestore: () => void;
  onPurge: () => void;
}) {
  const { title, subtitle, onRestore, onPurge } = props;
  return (
    <div className="glass-card glass-card-press spring-in flex items-center gap-3 rounded-2xl px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <button
        aria-label="Pulihkan"
        onClick={onRestore}
        className="press-sm flex size-9 items-center justify-center rounded-full bg-input active:scale-90"
      >
        <RotateCcw className="size-4" />
      </button>
      <button
        aria-label="Hapus permanen"
        onClick={onPurge}
        className="press-sm flex size-9 items-center justify-center rounded-full bg-input text-destructive active:scale-90"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
