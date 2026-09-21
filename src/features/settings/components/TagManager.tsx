import { useEffect, useMemo, useState } from "react";
import { Folder, Tag } from "lucide-react";
import {
  TODO_CATEGORIES,
  deleteTag,
  loadTodoLocal,
  renameTag,
  useTodoData,
} from "@/lib/noteme/todoStore";
import { sectionColor, tagColor } from "@/features/todo/utils";

function Swatch({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      className="size-7 flex-none rounded-lg"
      style={{ backgroundColor: color }}
    />
  );
}

/** Manajemen Kategori (bawaan, hanya tampil) & Tag (bisa ganti nama / hapus di semua task). */
export function TagManager() {
  const data = useTodoData();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    loadTodoLocal();
  }, []);

  const tags = useMemo(() => {
    const map = new Map<string, { tag: string; count: number }>();
    for (const t of data.tasks) {
      if (t.deleted) continue;
      for (const tag of t.tags ?? []) {
        const key = tag.toLowerCase();
        const cur = map.get(key);
        if (cur) cur.count += 1;
        else map.set(key, { tag, count: 1 });
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }, [data.tasks]);

  const commit = (tag: string) => {
    if (draft.trim() && draft.trim().replace(/^#+/, "") !== tag) renameTag(tag, draft);
    setEditing(null);
  };

  return (
    <section id="sec-tag" className="scroll-mt-4">
      <h2 className="text-xl font-bold tracking-tight">Manajemen Kategori & Tag</h2>

      <div className="glass-input mt-4 divide-y divide-border overflow-hidden rounded-2xl">
        {TODO_CATEGORIES.map((c, i) => (
          <div key={c.id} className="flex items-center gap-3 px-3.5 py-2.5">
            <Folder
              className="size-5 flex-none"
              style={{ color: sectionColor(i) }}
              fill={sectionColor(i)}
              fillOpacity={0.25}
            />
            <span className="min-w-0 flex-1 truncate text-[15px]">{c.label}</span>
            <Swatch color={sectionColor(i)} />
            <span className="w-14 flex-none text-right text-xs text-muted-foreground">Bawaan</span>
          </div>
        ))}
      </div>

      <h3 className="mb-2 mt-5 text-sm font-semibold text-muted-foreground">Tag</h3>
      {tags.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Belum ada tag. Tambahkan lewat edit task di To Do List.
        </p>
      ) : (
        <div className="glass-input divide-y divide-border overflow-hidden rounded-2xl">
          {tags.map(({ tag, count }) => (
            <div key={tag} className="flex items-center gap-3 px-3.5 py-2.5">
              <Tag className="size-5 flex-none" style={{ color: tagColor(tag) }} />
              {editing === tag ? (
                <>
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commit(tag);
                      if (e.key === "Escape") setEditing(null);
                    }}
                    maxLength={20}
                    aria-label={`Nama baru untuk tag ${tag}`}
                    className="min-w-0 flex-1 rounded-lg bg-black/5 px-2 py-1 text-[15px] outline-none dark:bg-white/10"
                  />
                  <button
                    onClick={() => commit(tag)}
                    className="press-sm text-xs font-semibold text-primary"
                  >
                    Simpan
                  </button>
                  <button
                    onClick={() => {
                      deleteTag(tag);
                      setEditing(null);
                    }}
                    className="press-sm text-xs font-semibold text-destructive"
                  >
                    Hapus
                  </button>
                </>
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate text-[15px]">
                    #{tag} <span className="text-xs text-muted-foreground">· {count} task</span>
                  </span>
                  <Swatch color={tagColor(tag)} />
                  <button
                    onClick={() => {
                      setDraft(tag);
                      setEditing(tag);
                    }}
                    className="press-sm w-14 flex-none rounded-lg border border-border px-2 py-1 text-xs font-medium hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    Edit
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
