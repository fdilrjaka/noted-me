import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { MessageSquare, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/ui/sheet";
import type { AiChat } from "../types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chats: AiChat[];
  activeId: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
};

export function HistorySheet({ open, onOpenChange, chats, activeId, onSelect, onDelete }: Props) {
  const [toDelete, setToDelete] = useState<AiChat | null>(null);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-[88vw] max-w-sm overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Riwayat chat</SheetTitle>
            <SheetDescription>Tersimpan di perangkat ini, per akun.</SheetDescription>
          </SheetHeader>

          {chats.length === 0 ? (
            <p className="mt-8 text-center text-sm text-muted-foreground">
              Belum ada percakapan. Kirim pesan pertamamu.
            </p>
          ) : (
            <ul className="mt-4 space-y-1">
              {chats.map((chat) => (
                <li key={chat.id} className="group flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(chat.id);
                      onOpenChange(false);
                    }}
                    aria-current={chat.id === activeId ? "true" : undefined}
                    className={`press-sm flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-left ${
                      chat.id === activeId ? "bg-primary/15" : "hover:bg-primary/10"
                    }`}
                  >
                    <MessageSquare
                      className="size-4 flex-none text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{chat.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(chat.updatedAt), {
                          addSuffix: true,
                          locale: idLocale,
                        })}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setToDelete(chat)}
                    aria-label={`Hapus percakapan ${chat.title}`}
                    className="press-sm flex size-9 flex-none items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={toDelete !== null} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus percakapan ini?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{toDelete?.title}&rdquo; akan dihapus dari perangkat ini dan tidak bisa
              dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toDelete) onDelete(toDelete.id);
                setToDelete(null);
              }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
