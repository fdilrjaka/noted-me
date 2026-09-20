/** Fresh Light-style "NoteMe" wordmark */

export function BrandMark({ className = "" }: { className?: string }) {
  return <span className={`font-bold tracking-tight text-foreground ${className}`}>NoteMe</span>;
}

export function BrandMarkSm({ className = "" }: { className?: string }) {
  return (
    <span className={`font-semibold tracking-tight text-foreground ${className}`}>NoteMe</span>
  );
}
