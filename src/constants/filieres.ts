import {
  Binary,
  BookCopy,
  Cpu,
  Languages,
  Radio,
  Stethoscope,
  Users,
  type LucideIcon,
} from "lucide-react";

export const FILIERE_ICONS: Record<string, LucideIcon> = {
  "Génie informatique": Binary,
  Théologie: BookCopy,
  Électronique: Cpu,
  Télécoms: Radio,
  "Sciences sociales": Users,
  Traduction: Languages,
  Médecine: Stethoscope,
};

export const FILIERE_DESCRIPTIONS: Record<string, string> = {
  "Génie informatique":
    "Algorithmique, programmation, bases de données et intelligence artificielle.",
  Théologie:
    "Études bibliques, théologie systématique et éthique chrétienne.",
  Électronique:
    "Circuits, systèmes numériques et conception de dispositifs embarqués.",
  Télécoms:
    "Réseaux, télécommunications et systèmes de transmission.",
  "Sciences sociales":
    "Droit, sociologie, économie et sciences politiques.",
  Traduction:
    "Traduction littéraire, interprétation et langues vivantes.",
  Médecine:
    "Sciences fondamentales et cliniques pour la formation médicale.",
};