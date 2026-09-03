import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SubjectSection {
  id: string;
  name: string;
  isDefault?: boolean;
}

export interface Subject {
  id: string;
  name: string;
  day: string;
  startTime: string;
  endTime: string;
  room?: string;
  sections: SubjectSection[];
  createdAt: string;
}

export interface SectionItem {
  id: string;
  subjectId: string;
  sectionId: string;
  title: string;
  content?: string;
  completed?: boolean;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  isDirty?: boolean;
}

// Aliases untuk kompatibilitas file bawaan proyek
export type Note = SectionItem;
export type NoteSubject = Subject;

export interface NoteMeState {
  subjects: Subject[];
  items: SectionItem[];
  notes: SectionItem[];
  trash: SectionItem[];
  activeSubjectId: string | null;
  activeNoteId: string | null;

  // Subject Actions
  addSubject: (data: { name: string; day: string; startTime: string; endTime: string; room?: string }) => void;
  updateSubject: (id: string, data: Partial<Omit<Subject, 'id' | 'createdAt'>>) => void;
  deleteSubject: (id: string) => void;

  // Section Actions
  addSection: (subjectId: string, sectionName: string) => void;
  deleteSection: (subjectId: string, sectionId: string) => void;

  // Item Actions
  addItem: (data: { subjectId: string; sectionId: string; title: string; content?: string; dueDate?: string }) => void;
  updateItem: (id: string, data: Partial<Omit<SectionItem, 'id' | 'subjectId' | 'sectionId' | 'createdAt'>>) => void;
  deleteItem: (id: string) => void;
  toggleItemComplete: (id: string) => void;

  // Legacy Actions (Trash, Sync, Auth, Editor)
  addNote: (note: Partial<SectionItem>) => void;
  updateNote: (id: string, data: Partial<SectionItem>) => void;
  deleteNote: (id: string) => void;
  restoreNote: (id: string) => void;
  purgeNote: (id: string) => void;
  emptyTrash: () => void;
  setActiveNoteId: (id: string | null) => void;
  setActiveSubjectId: (id: string | null) => void;
  setItems: (items: SectionItem[]) => void;
  setNotes: (notes: SectionItem[]) => void;
  setSubjects: (subjects: Subject[]) => void;
}

const DEFAULT_SECTIONS: SubjectSection[] = [
  { id: 'catatan', name: 'Catatan', isDefault: true },
  { id: 'tugas', name: 'Tugas', isDefault: true },
  { id: 'project', name: 'Project', isDefault: true },
];

const INITIAL_SUBJECTS: Subject[] = [
  {
    id: 'sbj-1',
    name: 'Inovasi Teknologi Finansial',
    day: 'Senin',
    startTime: '10:30',
    endTime: '13:00',
    room: '',
    sections: [...DEFAULT_SECTIONS],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sbj-2',
    name: 'Kapita Selekta Analitik Data',
    day: 'Selasa',
    startTime: '13:30',
    endTime: '16:00',
    room: '',
    sections: [...DEFAULT_SECTIONS],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sbj-3',
    name: 'Metode Ketangkasan',
    day: 'Kamis',
    startTime: '07:30',
    endTime: '10:00',
    room: '',
    sections: [...DEFAULT_SECTIONS],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sbj-4',
    name: 'Arsitektur Perusahaan untuk Transformasi Digital',
    day: 'Kamis',
    startTime: '10:30',
    endTime: '13:00',
    room: '',
    sections: [...DEFAULT_SECTIONS],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sbj-5',
    name: 'Pengembangan Produk',
    day: 'Jumat',
    startTime: '07:00',
    endTime: '09:30',
    room: '',
    sections: [...DEFAULT_SECTIONS],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sbj-6',
    name: 'Metodologi Penelitian Bisnis',
    day: 'Jumat',
    startTime: '09:40',
    endTime: '11:40',
    room: '',
    sections: [...DEFAULT_SECTIONS],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sbj-7',
    name: 'Manajemen Strategis',
    day: 'Jumat',
    startTime: '13:30',
    endTime: '16:00',
    room: '',
    sections: [...DEFAULT_SECTIONS],
    createdAt: new Date().toISOString(),
  },
];

export const useNoteMeStore = create<NoteMeState>()(
  persist(
    (set, get) => ({
      subjects: INITIAL_SUBJECTS,
      items: [],
      notes: [],
      trash: [],
      activeSubjectId: null,
      activeNoteId: null,

      addSubject: (data) => {
        const newSubject: Subject = {
          id: `sbj-${Date.now()}`,
          name: data.name,
          day: data.day,
          startTime: data.startTime,
          endTime: data.endTime,
          room: data.room || '',
          sections: [
            { id: 'catatan', name: 'Catatan', isDefault: true },
            { id: 'tugas', name: 'Tugas', isDefault: true },
            { id: 'project', name: 'Project', isDefault: true },
          ],
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ subjects: [newSubject, ...state.subjects] }));
      },

      updateSubject: (id, data) => {
        set((state) => ({
          subjects: state.subjects.map((sbj) =>
            sbj.id === id ? { ...sbj, ...data } : sbj
          ),
        }));
      },

      deleteSubject: (id) => {
        set((state) => {
          const newItems = state.items.filter((item) => item.subjectId !== id);
          return {
            subjects: state.subjects.filter((sbj) => sbj.id !== id),
            items: newItems,
            notes: newItems,
          };
        });
      },

      addSection: (subjectId, sectionName) => {
        const sectionId = `sec-${Date.now()}`;
        set((state) => ({
          subjects: state.subjects.map((sbj) => {
            if (sbj.id === subjectId) {
              return {
                ...sbj,
                sections: [...sbj.sections, { id: sectionId, name: sectionName }],
              };
            }
            return sbj;
          }),
        }));
      },

      deleteSection: (subjectId, sectionId) => {
        set((state) => {
          const newItems = state.items.filter(
            (item) => !(item.subjectId === subjectId && item.sectionId === sectionId)
          );
          return {
            subjects: state.subjects.map((sbj) => {
              if (sbj.id === subjectId) {
                return {
                  ...sbj,
                  sections: sbj.sections.filter((sec) => sec.id !== sectionId),
                };
              }
              return sbj;
            }),
            items: newItems,
            notes: newItems,
          };
        });
      },

      addItem: (data) => {
        const newItem: SectionItem = {
          id: `item-${Date.now()}`,
          subjectId: data.subjectId,
          sectionId: data.sectionId,
          title: data.title,
          content: data.content || '',
          completed: false,
          dueDate: data.dueDate,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isDirty: true,
        };
        set((state) => {
          const newItems = [newItem, ...state.items];
          return { items: newItems, notes: newItems };
        });
      },

      updateItem: (id, data) => {
        set((state) => {
          const newItems = state.items.map((item) =>
            item.id === id
              ? { ...item, ...data, isDirty: true, updatedAt: new Date().toISOString() }
              : item
          );
          return { items: newItems, notes: newItems };
        });
      },

      deleteItem: (id) => {
        const itemToDelete = get().items.find((i) => i.id === id);
        if (!itemToDelete) return;

        set((state) => {
          const newItems = state.items.filter((item) => item.id !== id);
          return {
            items: newItems,
            notes: newItems,
            trash: [itemToDelete, ...state.trash],
          };
        });
      },

      toggleItemComplete: (id) => {
        set((state) => {
          const newItems = state.items.map((item) =>
            item.id === id ? { ...item, completed: !item.completed, isDirty: true } : item
          );
          return { items: newItems, notes: newItems };
        });
      },

      addNote: (noteData) => {
        const newItem: SectionItem = {
          id: noteData.id || `item-${Date.now()}`,
          subjectId: noteData.subjectId || 'sbj-1',
          sectionId: noteData.sectionId || 'catatan',
          title: noteData.title || 'Untitled Note',
          content: noteData.content || '',
          completed: noteData.completed || false,
          dueDate: noteData.dueDate,
          createdAt: noteData.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isDirty: true,
        };
        set((state) => {
          const newItems = [newItem, ...state.items];
          return { items: newItems, notes: newItems };
        });
      },

      updateNote: (id, data) => {
        get().updateItem(id, data);
      },

      deleteNote: (id) => {
        get().deleteItem(id);
      },

      restoreNote: (id) => {
        const itemToRestore = get().trash.find((i) => i.id === id);
        if (!itemToRestore) return;

        set((state) => {
          const newItems = [itemToRestore, ...state.items];
          return {
            trash: state.trash.filter((i) => i.id !== id),
            items: newItems,
            notes: newItems,
          };
        });
      },

      purgeNote: (id) => {
        set((state) => ({
          trash: state.trash.filter((i) => i.id !== id),
        }));
      },

      emptyTrash: () => {
        set({ trash: [] });
      },

      setActiveNoteId: (id) => set({ activeNoteId: id }),
      setActiveSubjectId: (id) => set({ activeSubjectId: id }),
      setItems: (items) => set({ items, notes: items }),
      setNotes: (notes) => set({ items: notes, notes }),
      setSubjects: (subjects) => set({ subjects }),
    }),
    {
      name: 'noteme-subjects-storage',
    }
  )
);

// Alias Hook Exports
export const useData = useNoteMeStore;
export default useNoteMeStore;

// Standalone Helper Function Exports (Diimpor langsung oleh trash.tsx, auth.tsx, sync.ts, dll.)
export const dirtyCount = (state?: Partial<NoteMeState>) => {
  if (!state) {
    try {
      state = useNoteMeStore.getState();
    } catch {
      return 0;
    }
  }
  const itemsList = state?.items || state?.notes || [];
  return itemsList.filter((item) => item.isDirty).length;
};

export const emptyTrash = () => useNoteMeStore.getState().emptyTrash();
export const restoreNote = (id: string) => useNoteMeStore.getState().restoreNote(id);
export const purgeNote = (id: string) => useNoteMeStore.getState().purgeNote(id);
export const addNote = (note: Partial<SectionItem>) => useNoteMeStore.getState().addNote(note);
export const updateNote = (id: string, data: Partial<SectionItem>) => useNoteMeStore.getState().updateNote(id, data);
export const deleteNote = (id: string) => useNoteMeStore.getState().deleteNote(id);
export const addSubject = (data: { name: string; day: string; startTime: string; endTime: string; room?: string }) => useNoteMeStore.getState().addSubject(data);
export const updateSubject = (id: string, data: Partial<Omit<Subject, 'id' | 'createdAt'>>) => useNoteMeStore.getState().updateSubject(id, data);
export const deleteSubject = (id: string) => useNoteMeStore.getState().deleteSubject(id);
export const addSection = (subjectId: string, sectionName: string) => useNoteMeStore.getState().addSection(subjectId, sectionName);
export const deleteSection = (subjectId: string, sectionId: string) => useNoteMeStore.getState().deleteSection(subjectId, sectionId);
export const addItem = (data: { subjectId: string; sectionId: string; title: string; content?: string; dueDate?: string }) => useNoteMeStore.getState().addItem(data);
export const updateItem = (id: string, data: Partial<Omit<SectionItem, 'id' | 'subjectId' | 'sectionId' | 'createdAt'>>) => useNoteMeStore.getState().updateItem(id, data);
export const deleteItem = (id: string) => useNoteMeStore.getState().deleteItem(id);
export const toggleItemComplete = (id: string) => useNoteMeStore.getState().toggleItemComplete(id);
export const setActiveNoteId = (id: string | null) => useNoteMeStore.getState().setActiveNoteId(id);
export const setActiveSubjectId = (id: string | null) => useNoteMeStore.getState().setActiveSubjectId(id);
export const setItems = (items: SectionItem[]) => useNoteMeStore.getState().setItems(items);
export const setNotes = (notes: SectionItem[]) => useNoteMeStore.getState().setNotes(notes);
export const setSubjects = (subjects: Subject[]) => useNoteMeStore.getState().setSubjects(subjects);
