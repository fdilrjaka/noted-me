import { useState } from "react";

export type AIAction = "summarize" | "rewrite" | "fix" | "ideas" | "translate";

export function AICommandMenu({ onSelect }: { onSelect: (action: AIAction) => void }) {
  const [open, setOpen] = useState(false);
  const actions: { id: AIAction; label: string }[] = [
    { id: "summarize", label: "Ringkas catatan" },
    { id: "rewrite", label: "Tulis ulang" },
    { id: "fix", label: "Perbaiki grammar" },
    { id: "ideas", label: "Buat ide" },
    { id: "translate", label: "Terjemahkan" },
  ];

  return (
    <div className="noteme-ai-menu">
      <button onClick={() => setOpen(!open)}>✨ AI</button>
      {open && (
        <div className="noteme-ai-dropdown">
          {actions.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onSelect(item.id);
                setOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
