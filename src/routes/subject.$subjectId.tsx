import { useState } from 'react';
import { useParams, Link } from '@tanstack/react-router';
import { useNoteMeStore } from '@/lib/noteme/store';
import {
  ArrowLeft,
  Plus,
  Clock,
  MapPin,
  Trash2,
  CheckCircle2,
  Circle,
  FileText,
  Calendar as CalendarIcon,
  X,
  FolderPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export function RouteComponent() {
  const { subjectId } = useParams({ from: '/subject/$subjectId' });
  const {
    subjects,
    items,
    addSection,
    deleteSection,
    addItem,
    deleteItem,
    toggleItemComplete,
  } = useNoteMeStore();

  const subject = subjects.find((s) => s.id === subjectId);

  const [activeTab, setActiveTab] = useState<string>('catatan');

  // Modal State Tambah Kategori Baru
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');

  // Modal State Tambah Item
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [itemTitle, setItemTitle] = useState('');
  const [itemContent, setItemContent] = useState('');
  const [itemDueDate, setItemDueDate] = useState('');

  if (!subject) {
    return (
      <div className="container max-w-4xl mx-auto p-6 text-center py-20">
        <h2 className="text-xl font-semibold mb-2">Mata Kuliah Tidak Ditemukan</h2>
        <p className="text-muted-foreground mb-4">
          Mata kuliah ini mungkin telah dihapus.
        </p>
        <Link to="/">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Kembali ke Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const currentSectionItems = items.filter(
    (item) => item.subjectId === subject.id && item.sectionId === activeTab
  );

  const handleAddSectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionName.trim()) return;

    addSection(subject.id, newSectionName.trim());
    setNewSectionName('');
    setIsAddSectionOpen(false);
  };

  const handleAddItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemTitle.trim()) return;

    addItem({
      subjectId: subject.id,
      sectionId: activeTab,
      title: itemTitle.trim(),
      content: itemContent.trim(),
      dueDate: itemDueDate || undefined,
    });

    setItemTitle('');
    setItemContent('');
    setItemDueDate('');
    setIsAddItemOpen(false);
  };

  const activeSectionObj = subject.sections.find((sec) => sec.id === activeTab);

  return (
    <div className="container max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header Info */}
      <div className="space-y-4">
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Kembali ke Dashboard
          </Button>
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              {subject.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1 font-medium bg-muted px-2.5 py-1 rounded-md">
                <Clock className="w-4 h-4 text-primary" />
                {subject.day}, {subject.startTime} – {subject.endTime}
              </span>

              {subject.room && (
                <span className="flex items-center gap-1 font-medium bg-muted px-2.5 py-1 rounded-md">
                  <MapPin className="w-4 h-4 text-rose-500" />
                  Ruang: {subject.room}
                </span>
              )}
            </div>
          </div>

          <Button onClick={() => setIsAddItemOpen(true)} className="gap-2 self-start md:self-auto">
            <Plus className="w-4 h-4" />
            Tambah {activeSectionObj?.name || 'Item'} Baru
          </Button>
        </div>
      </div>

      {/* Tabs Menu (Catatan, Tugas, Project, + Custom) */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 border-b">
          <TabsList className="h-auto p-1 bg-muted/60 rounded-lg flex flex-wrap gap-1">
            {subject.sections.map((sec) => (
              <TabsTrigger
                key={sec.id}
                value={sec.id}
                className="px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center gap-2"
              >
                {sec.name}
                {!sec.isDefault && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSection(subject.id, sec.id);
                      if (activeTab === sec.id) setActiveTab('catatan');
                    }}
                    className="hover:text-destructive p-0.5 rounded transition-colors"
                    title="Hapus Kategori Ini"
                  >
                    <X className="w-3.5 h-3.5" />
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddSectionOpen(true)}
            className="gap-1.5 text-xs shrink-0"
          >
            <FolderPlus className="w-3.5 h-3.5 text-primary" />
            + Tambah Kategori
          </Button>
        </div>

        {/* Isi Tab */}
        <TabsContent value={activeTab} className="mt-0 space-y-4">
          {currentSectionItems.length === 0 ? (
            <div className="text-center py-16 border border-dashed rounded-xl p-6 bg-card">
              <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="text-base font-medium">Belum ada {activeSectionObj?.name.toLowerCase()}</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Klik tombol "Tambah {activeSectionObj?.name || 'Item'} Baru" di atas untuk menambahkan isi di kategori ini.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentSectionItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border bg-card text-card-foreground shadow-sm space-y-3 transition-all ${
                    item.completed ? 'opacity-60 bg-muted/30' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 flex-1">
                      {(activeTab === 'tugas' || activeTab === 'project') && (
                        <button
                          onClick={() => toggleItemComplete(item.id)}
                          className="mt-0.5 text-muted-foreground hover:text-primary transition-colors shrink-0"
                        >
                          {item.completed ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </button>
                      )}

                      <div className="space-y-1 flex-1">
                        <h4
                          className={`font-semibold text-base leading-tight ${
                            item.completed ? 'line-through text-muted-foreground' : ''
                          }`}
                        >
                          {item.title}
                        </h4>

                        {item.dueDate && (
                          <div className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                            <CalendarIcon className="w-3.5 h-3.5" />
                            <span>Tenggat: {item.dueDate}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteItem(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {item.content && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed border-t pt-2 mt-2">
                      {item.content}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal Tambah Kategori Custom */}
      <Dialog open={isAddSectionOpen} onOpenChange={setIsAddSectionOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Tambah Kategori Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddSectionSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="secName">Nama Kategori *</Label>
              <Input
                id="secName"
                placeholder="Contoh: Bahan Ujian, Reference, Quiz"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                required
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddSectionOpen(false)}>
                Batal
              </Button>
              <Button type="submit">Tambah Kategori</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Tambah Item */}
      <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Tambah {activeSectionObj?.name || 'Item'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddItemSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="itemTitle">Judul / Topik *</Label>
              <Input
                id="itemTitle"
                placeholder="Contoh: Pertemuan 1 - Pengenalan / Final Project Draft"
                value={itemTitle}
                onChange={(e) => setItemTitle(e.target.value)}
                required
              />
            </div>

            {(activeTab === 'tugas' || activeTab === 'project') && (
              <div className="space-y-2">
                <Label htmlFor="dueDate">Tanggal Tenggat / Deadline (Opsional)</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={itemDueDate}
                  onChange={(e) => setItemDueDate(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="itemContent">Isi / Deskripsi (Opsional)</Label>
              <Textarea
                id="itemContent"
                placeholder="Tulis detail catatan, instruksi tugas, atau link penting..."
                rows={4}
                value={itemContent}
                onChange={(e) => setItemContent(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddItemOpen(false)}>
                Batal
              </Button>
              <Button type="submit">Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
