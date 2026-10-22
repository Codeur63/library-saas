import {
  BookMarked,
  Cpu,
  Globe2,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";

export interface FacultyDepartment {
  name: string;
  filieres: { label: string; options?: string[] }[];
}

export interface Faculty {
  code: string;
  name: string;
  established?: number;
  description: string;
  icon: LucideIcon;
  departments: FacultyDepartment[];
}

export const FACULTIES: Faculty[] = [
  {
    code: "FTPSR",
    name: "Faculté de Théologie Protestante et des Sciences Religieuses",
    established: 1962,
    description:
      "Première institution universitaire créée à l'UPAC, elle propose des formations théologiques et religieuses à travers ses départements.",
    icon: BookMarked,
    departments: [
      {
        name: "Département des Sciences Bibliques",
        filieres: [],
      },
      {
        name: "Département de Théologie Systématique",
        filieres: [],
      },
      {
        name: "Département de Théologie Pratique et Histoire du Christianisme",
        filieres: [],
      },
      {
        name: "Filières spécialisées",
        filieres: [
          { label: "Master en Relations Islamo-Chrétiennes" },
          { label: "Programmes aménagés" },
        ],
      },
    ],
  },
  {
    code: "FSSRI",
    name: "Faculté des Sciences Sociales et des Relations Internationales",
    description:
      "Développement, communication et sciences sociales pour former aux carrières du continent et des organisations.",
    icon: Globe2,
    departments: [
      {
        name: "Paix et Développement",
        filieres: [
          { label: "Paix et Développement (PD)" },
          { label: "Journalisme de Paix (JP)" },
          { label: "Sciences Économiques" },
          { label: "Chaire Nelson Mandela" },
        ],
      },
      {
        name: "Sciences de la Communication",
        filieres: [
          { label: "Gestion des ressources humaines" },
          { label: "Gestion des organisations et des administrations publiques" },
        ],
      },
      {
        name: "Sciences de l'Information Documentaire",
        filieres: [
          { label: "SIDCOM" },
          { label: "Sciences de l'Information (SI)" },
        ],
      },
      {
        name: "Traduction / Interprétariat",
        filieres: [{ label: "Traduction / Interprétariat (TI)" }],
      },
    ],
  },
  {
    code: "FTIC",
    name: "Faculté des Technologies de l'Information et de la Communication",
    description:
      "Technologies modernes et ingénierie numérique pour répondre aux besoins du secteur technologique.",
    icon: Cpu,
    departments: [
      {
        name: "Génie",
        filieres: [
          { label: "Génie Informatique" },
          { label: "Génie Électronique" },
          { label: "Génie des Télécommunications" },
          { label: "Génie Industriel" },
        ],
      },
    ],
  },
  {
    code: "FSS",
    name: "Faculté des Sciences de la Santé",
    description:
      "Cycles de Licence, de Master et formations professionnelles, dont plusieurs en lien avec les exigences du MINSANTE.",
    icon: Stethoscope,
    departments: [
      {
        name: "Sciences Infirmières",
        filieres: [
          {
            label: "Sciences Infirmières",
            options: ["Chirurgie et Bloc opératoire", "Pédiatrie-Néonatalogie", "Médecine et Spécialités"],
          },
        ],
      },
      {
        name: "Biologie Clinique",
        filieres: [
          {
            label: "Biologie Clinique",
            options: ["Biochimie Clinique", "Hématologie Sérologie", "Microbiologie Parasitologie"],
          },
        ],
      },
      {
        name: "Maïeutique",
        filieres: [{ label: "Sages-femmes / Maïeuticiens" }],
      },
      {
        name: "Filières professionnelles (CQP / MINSANTE)",
        filieres: [
          { label: "Infirmiers Diplômés d'État (IDE)" },
          {
            label: "Techniciens Principaux Médico-Sanitaires",
            options: ["Analyses Médicales", "Génie Sanitaire", "Sciences Pharmaceutiques", "Kinésithérapie"],
          },
        ],
      },
    ],
  },
];