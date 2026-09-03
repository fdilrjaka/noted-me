import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useNoteMeStore } from '@/lib/noteme/store';
import { 
  Plus, 
  Clock, 
  MapPin, 
  BookOpen, 
  Search, 
  MoreVertical, 
  Trash2, 
  FileText, 
  CheckSquare, 
  FolderKanban 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

export function RouteComponent() {
  const { subjects, items, addSubject, deleteSubject } = useNoteMeStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('Semua');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [day, setDay] = useState('Senin');
  const [startTime, setStartTime] = useState('10:30');
  const [endTime, setEndTime] = useState('13:00');
  const [room, setRoom] = useState('');

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addSubject({
      name: name.trim(),
      day,
      startTime,
      endTime,
      room: room.trim(),
    });

    setName('');
    setDay('Senin');
    setStartTime('10:30');
    setEndTime('13:00');
    setRoom('');
    setIsAddModalOpen(false);
  };

  const filteredSubjects = subjects.filter((subject) => {
    const matchesSearch =
      subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (subject.room && subject.room.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesDay = selectedDayFilter === 'Semua' || subject.day === selectedDayFilter;
    return matchesSearch && matchesDay;
  });

  return (
    <div className="container max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-primary" />
            Mata Kuliah
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pilih mata kuliah untuk membuka catatan, tugas, dan project perkuliahan kamu.
          </p>
        </div>

        <Button onClick={() => setIsAddModalOpen(true)} className="gap-2 self-start md:self-auto">
          <Plus className="w-4 h-4" />
          Tambah Mata Kuliah
        </Button>
      </div>

      {/* Control Search & Filter Hari */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari mata kuliah atau ruangan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Button
            variant={selectedDayFilter === 'Semua' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedDayFilter('Semua')}
          >
            Semua Hari
          </Button>
          {DAYS.map((d) => (
            <Button
              key={d}
              variant={selectedDayFilter === d ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedDayFilter(d)}
            >
              {d}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid Mata Kuliah */}
      {filteredSubjects.length === 0 ? (
        <div className="text-center py-12 border rounded-xl bg-card text-card-foreground p-8">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h3 className="text-lg font-medium">Tidak ada mata kuliah</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {searchQuery || selectedDayFilter !== 'Semua'
              ? 'Tidak ditemukan mata kuliah yang sesuai filter.'
              : 'Klik "Tambah Mata Kuliah" untuk membuat mata kuliah baru.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubjects.map((subject) => {
            const subjectItems = items.filter((i) => i.subjectId === subject.id);
            const notesCount = subjectItems.filter((i) => i.sectionId === 'catatan').length;
            const tasksCount = subjectItems.filter((i) => i.sectionId === 'tugas').length;
            const projectsCount = subjectItems.filter((i) => i.sectionId === 'project').length;

            return (
              <div
                key={subject.id}
                className="group relative rounded-xl border bg-card text-card-foreground p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-4"
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      to="/subject/$subjectId"
                      params={{ subjectId: subject.id }}
                      className="font-semibold text-lg hover:text-primary transition-colors line-clamp-2 leading-snug"
                    >
                      {subject.name}
                    </Link>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive gap-2 cursor-pointer"
                          onClick={() => deleteSubject(subject.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                          Hapus Mata Kuliah
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Jam & Hari (di bawah judul) */}
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                    <Clock className="w-4 h-4 text-primary shrink-0" />
                    <span>
                      {subject.day}, {subject.startTime} – {subject.endTime}
                    </span>
                  </div>

                  {/* Ruangan Opsional (langsung merapat jika tidak diisi) */}
                  {subject.room && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground/90 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>Ruang: {subject.room}</span>
                    </div>
                  )}
                </div>

                {/* Ringkasan Jumlah & Link */}
                <div className="pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1" title="Catatan">
                      <FileText className="w-3.5 h-3.5" /> {notesCount}
                    </span>
                    <span className="flex items-center gap-1" title="Tugas">
                      <CheckSquare className="w-3.5 h-3.5" /> {tasksCount}
                    </span>
                    <span className="flex items-center gap-1" title="Project">
                      <FolderKanban className="w-3.5 h-3.5" /> {projectsCount}
                    </span>
                  </div>

                  <Link
                    to="/subject/$subjectId"
                    params={{ subjectId: subject.id }}
                    className="font-medium text-primary hover:underline"
                  >
                    Buka Menu &rarr;
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Dialog Tambah Matkul */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Tambah Mata Kuliah Baru</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddSubject} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="subjectName">Nama Mata Kuliah *</Label>
              <Input
                id="subjectName"
                placeholder="Contoh: Metodologi Penelitian Bisnis"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="day">Hari *</Label>
                <Select value={day} onValueChange={setDay}>
                  <SelectTrigger id="day">
                    <SelectValue placeholder="Pilih Hari" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="room">Ruangan (Opsional)</Label>
                <Input
                  id="room"
                  placeholder="e.g. B.201"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="startTime">Jam Mulai *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">Jam Selesai *</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit">Simpan Mata Kuliah</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
