/** Fresh Light-style "NoteMe" wordmark */

export function BrandMark({ className = "" }: { className?: string }) {
  return <span className={`font-bold tracking-tight text-foreground ${className}`}>NoteMe</span>;
}

export function BrandMarkSm({ className = "" }: { className?: string }) {
  return (
    <span className={`font-semibold tracking-tight text-foreground ${className}`}>NoteMe</span>
  );
}

/** Logo persegi kecil NoteMe (dipakai di top bar & sidebar yang mengecil). */
export function BrandLogo({ className = "size-9" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`flex flex-none items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-[55%]"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      >
        <path d="M7 8h10M7 12h10M7 16h6" />
      </svg>
    </span>
  );
}
