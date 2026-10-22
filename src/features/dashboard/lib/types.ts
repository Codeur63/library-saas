export interface StudentCatalog {
  faculties: { id: string; code: string; name: string }[];
  programs: { id: string; code: string; name: string; facultyId: string }[];
  levels: { id: string; code: string; name: string }[];
  options: { id: string; name: string; programId: string }[];
}
