export type DocumentVisibility = "GLOBAL" | "PROGRAM";

export type Semester = "S1" | "S2" | "ANNUAL";

export interface LibraryDocumentSubject {
  id: string;
  name: string;
  program: { id: string; name: string };
  level: { id: string; code: string };
}

/**
 * Représentation frontend d'un document servi par le backend (Supabase/Prisma).
 * Les dates sont sérialisées par React (Date supporté côté RSC/server actions).
 */
export interface LibraryDocument {
  id: string;
  title: string;
  description: string | null;
  fileExtension: string;
  mimeType: string;
  fileSize: number;
  originalFileName: string;
  downloadCount: number;
  isPublished: boolean;
  visibility: DocumentVisibility;
  semester: Semester | null;
  createdAt: Date;
  updatedAt: Date;
  subject: LibraryDocumentSubject;
  category: { id: string; name: string; code: string };
  academicYear: { id: string; label: string } | null;
  accessProgram: { id: string; name: string } | null;
  uploadedBy: { id: string; firstName: string; lastName: string } | null;
}

export interface LibraryOption {
  value: string;
  label: string;
}

export interface LibrarySubjectOption extends LibraryOption {
  programId: string;
  levelId: string;
}

export interface LibraryFilterOptions {
  programs: LibraryOption[];
  levels: LibraryOption[];
  subjects: LibrarySubjectOption[];
  categories: LibraryOption[];
}

export interface LibraryOverviewTotals {
  documents: number;
  programs: number;
  subjects: number;
  categories: number;
}

export interface LibraryOverviewCategory {
  id: string;
  name: string;
  code: string;
  count: number;
}

export interface LibraryOverviewSubject {
  id: string;
  name: string;
  count: number;
}

export interface LibraryOverviewProgram {
  id: string;
  name: string;
  code: string;
  description: string | null;
  count: number;
  subjectNames: string[];
}

export interface LibraryOverview {
  totals: LibraryOverviewTotals;
  recentDocuments: LibraryDocument[];
  categories: LibraryOverviewCategory[];
  topSubjects: LibraryOverviewSubject[];
  programs: LibraryOverviewProgram[];
}

/** Enveloppe de pagination commune aux services, actions et composants. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Élément de la liste des favoris (document + date d'ajout). */
export interface FavoriteListItem {
  addedAt: Date;
  document: LibraryDocument;
}
