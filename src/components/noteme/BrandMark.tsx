/** iOS 26-style "NoteMe" wordmark: SF Pro Display, tight tracking, glassy gradient. */

export function BrandMark({ className = "" }: { className?: string }) {
  return <span className={`brand-ios26 ${className}`}>NoteMe</span>;
}

export function BrandMarkSm({ className = "" }: { className?: string }) {
  return <span className={`brand-ios26-sm ${className}`}>NoteMe</span>;
}
