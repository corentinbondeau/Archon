export interface DateFormatee {
  jour: string;
  mois: string;
  annee: string;
  jourDeLaSemaine: string;
}

export function formaterDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function formaterHeure(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function detailDate(iso: string): DateFormatee {
  const date = new Date(iso);
  return {
    jour: date.toLocaleDateString("fr-FR", { weekday: "long" }),
    mois: date.toLocaleDateString("fr-FR", { month: "long" }),
    annee: String(date.getFullYear()),
    jourDeLaSemaine: String(date.getDate()),
  };
}

export function extraireJourMois(iso: string): { jour: number; mois: number } {
  const date = new Date(iso);
  return { jour: date.getDate(), mois: date.getMonth() };
}

export function initialesDe(prenom: string, nom: string): string {
  const prenomNormalise = prenom.trim();
  const nomNormalise = nom.trim();
  return `${prenomNormalise.charAt(0)}${nomNormalise.charAt(0)}`.toUpperCase();
}
