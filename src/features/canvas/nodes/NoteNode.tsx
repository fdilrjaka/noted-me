import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { checkpoint, patchNode, type NoteCanvasNode } from "@/lib/noteme/canvasStore";
import { activeSubjects, subjectPages, useData } from "@/storage/local/dataCore";
import { createSubject } from "@/storage/local/subjectStore";
import { PALETTE } from "../palette";
import { NodeShell, type OnSize } from "./NodeShell";

/** Node Live: satu mata kuliah dari halaman Notes (jumlah & judul pertemuan terbaru). */
export function NoteNodeView({
  node,
  selected,
  onSize,
}: {
  node: NoteCanvasNode;
  selected: boolean;
  onSize: OnSize;
}) {
  const data = useData();
  const color = PALETTE[node.color].solid;
  const subjects = activeSubjects(data);
  const subject = subjects.find((s) => s.id === node.subjectId) ?? null;
  const pages = subject ? subjectPages(data, subject.id) : [];
  const [newName, setNewName] = useState("");

  const bind = (subjectId: string | null) => {
    checkpoint();
    patchNode(node.id, { subjectId });
  };

  const create = () => {
    if (!newName.trim()) return;
    // Mata kuliah baru langsung tersimpan di halaman Notes.
    const id = createSubject(newName);
    bind(id);
    setNewName("");
  };

  return (
    <NodeShell node={node} selected={selected} onSize={onSize} pill="live">
      <select
        value={node.subjectId ?? ""}
        onChange={(e) => bind(e.target.value || null)}
        aria-label="Mata kuliah"
        className="w-full rounded-lg bg-slate-100 px-2 py-1 text-xs outline-none dark:bg-slate-800"
      >
        <option value="">Pilih mata kuliah…</option>
        {subjects.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

      {subject ? (
        <>
          <p className="mt-2 truncate text-sm font-semibold">{subject.name}</p>
          <p className="text-xs text-muted-foreground">{pages.length} pertemuan</p>
          <ul className="mt-1.5 flex flex-col gap-0.5">
            {pages.slice(0, 3).map((p) => (
              <li key={p.id} className="truncate text-xs">
                • {p.title || "Tanpa judul"}
              </li>
            ))}
          </ul>
          <div className="mt-2 text-right text-[11px]">
            <Link
              to="/subject/$subjectId"
              params={{ subjectId: subject.id }}
              search={{ page: undefined }}
              className="font-medium hover:underline"
              style={{ color }}
            >
              Buka catatan →
            </Link>
          </div>
        </>
      ) : (
        <div className="mt-2 flex gap-1.5">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            placeholder="atau buat mata kuliah baru"
            className="min-w-0 flex-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs outline-none placeholder:text-muted-foreground dark:bg-slate-800"
          />
          <button
            type="button"
            onClick={create}
            className="flex-none rounded-lg px-2.5 py-1 text-xs font-medium text-white"
            style={{ backgroundColor: color }}
          >
            Buat
          </button>
        </div>
      )}
    </NodeShell>
  );
}
