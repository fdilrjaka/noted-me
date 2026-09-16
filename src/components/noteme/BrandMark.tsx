/** Fresh Light-style "NoteMe" wordmark */

export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-bold tracking-tight text-slate-800 ${className}`}>
      NoteMe
    </span>
  );
}

export function BrandMarkSm({ className = "" }: { className?: string }) {
  return (
    <span className={`font-semibold tracking-tight text-slate-700 ${className}`}>
      NoteMe
    </span>
  );
}
