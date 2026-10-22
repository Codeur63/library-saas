export const ROUTES = {
  home: "/",
  bibliotheque: "/bibliotheque",
  filieres: "/filieres",
  favoris: "/favoris",
  upload: "/upload",
  login: "/auth/login",
  register: "/auth/register",
  changePassword: "/auth/change-password",
  dashboard: "/dashboard",
  dashboardEtudiants: "/dashboard/etudiants",
  dashboardNouvelEtudiant: "/dashboard/etudiants/nouveau",
  dashboardAdministrateurs: "/dashboard/administrateurs",
  dashboardNouvelAdministrateur: "/dashboard/administrateurs/nouveau",
} as const;

export const documentRoute = (id: number | string) => `/documents/${id}`;