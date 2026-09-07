import { Search, X } from "lucide-react";
import type { SearchHit } from "@/storage/local/dataCore";

export function SearchBar(props: {
  query: string;
  onQueryChange: (q: string) => void;
  searchHits: SearchHit[];
  onOpenHit: (subjectId: string, pageId: string) => void;
}) {
  const { query, onQueryChange, searchHits, onOpenHit } = props;
  return (
    <>
      <div className="glass-input flex items-center gap-2 rounded-2xl px-4 py-3">
        <Search className="size-4 flex-none text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Cari di semua catatan…"
          className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
        />
        {query && (
          <button
            onClick={() => onQueryChange("")}
            aria-label="Hapus pencarian"
            className="press-sm"
          >
            <X className="size-4 text-muted-foreground" />
          </button>
        )}
      </div>
      {query.trim() && (
        <section className="mt-4">
          <h2 className="mb-3 text-xs font-bold tracking-wider text-muted-foreground uppercase">
            Hasil pencarian
          </h2>
          {searchHits.length === 0 ? (
            <div className="glass-card rounded-2xl px-4 py-6 text-center text-sm text-muted-foreground">
              Tidak ada catatan yang cocok dengan &ldquo;{query}&rdquo;.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {searchHits.map((hit) => (
                <button
                  key={hit.page.id}
                  onClick={() => onOpenHit(hit.page.subject_id, hit.page.id)}
                  className="press glass-card flex w-full flex-col items-start gap-1 rounded-2xl px-4 py-3 text-left active:scale-[0.99]"
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">
                      {hit.page.title || "Tanpa judul"}
                    </span>
                    {hit.subject && (
                      <span className="flex-none truncate rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-muted-foreground">
                        {hit.subject.name}
                      </span>
                    )}
                  </div>
                  {hit.snippet && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">{hit.snippet}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}
