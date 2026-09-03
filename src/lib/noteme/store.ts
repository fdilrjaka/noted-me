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
}

interface NoteMeState {
  subjects: Subject[];
  items: SectionItem[];

  // Subject Actions
  addSubject: (data: { name: string; day: string; startTime: string; endTime: string; room?: string }) => void;
  updateSubject: (id: string, data: Partial<Omit<Subject, 'id' | 'createdAt'>>) => void;
  deleteSubject: (id: string) => void;

  // Section Actions inside a Subject
  addSection: (subjectId: string, sectionName: string) => void;
  deleteSection: (subjectId: string, sectionId: string) => void;

  // Item Actions
  addItem: (data: { subjectId: string; sectionId: string; title: string; content?: string; dueDate?: string }) => void;
  updateItem: (id: string, data: Partial<Omit<SectionItem, 'id' | 'subjectId' | 'sectionId' | 'createdAt'>>) => void;
  deleteItem: (id: string) => void;
  toggleItemComplete: (id: string) => void;
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
    (set) => ({
      subjects: INITIAL_SUBJECTS,
      items: [],

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
        set((state) => ({
          subjects: state.subjects.filter((sbj) => sbj.id !== id),
          items: state.items.filter((item) => item.subjectId !== id),
        }));
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
        set((state) => ({
          subjects: state.subjects.map((sbj) => {
            if (sbj.id === subjectId) {
              return {
                ...sbj,
                sections: sbj.sections.filter((sec) => sec.id !== sectionId),
              };
            }
            return sbj;
          }),
          items: state.items.filter(
            (item) => !(item.subjectId === subjectId && item.sectionId === sectionId)
          ),
        }));
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
        };
        set((state) => ({ items: [newItem, ...state.items] }));
      },

      updateItem: (id, data) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? { ...item, ...data, updatedAt: new Date().toISOString() }
              : item
          ),
        }));
      },

      deleteItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      },

      toggleItemComplete: (id) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, completed: !item.completed } : item
          ),
        }));
      },
    }),
    {
      name: 'noteme-subjects-storage',
    }
  )
);
