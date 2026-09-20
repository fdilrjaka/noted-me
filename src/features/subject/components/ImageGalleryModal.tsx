import { X } from "lucide-react";

export function ImageGalleryModal({ images, onClose }: { images: string[]; onClose: () => void }) {
  return (
    <div className="fade-in-ios fixed inset-0 z-40 flex items-end justify-center bg-background/70 p-3 backdrop-blur-sm sm:items-center">
      <div className="glass-sheet sheet-up max-h-[80dvh] w-full max-w-2xl overflow-y-auto rounded-3xl p-5 safe-bottom">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Galeri gambar</h3>
          <button onClick={onClose} aria-label="Tutup" className="press-sm">
            <X className="size-4" />
          </button>
        </div>
        {images.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Belum ada gambar di halaman ini.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {images.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`Gambar catatan ${i + 1}`}
                loading="lazy"
                className="aspect-square w-full rounded-2xl border border-border object-cover"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
