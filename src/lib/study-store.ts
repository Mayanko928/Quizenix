import type { StudyMaterial } from "./generate.functions";

const KEY = "quizenix:study";
const NOTES_KEY = "quizenix:notes";
const FAV_KEY = "quizenix:favorites";

export function saveStudyMaterial(material: StudyMaterial) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(material));
  } catch {}
}

export function loadStudyMaterial(): StudyMaterial | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StudyMaterial) : null;
  } catch {
    return null;
  }
}

export function clearStudyMaterial() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}

export function saveNotes(notes: string) {
  try {
    sessionStorage.setItem(NOTES_KEY, notes);
  } catch {}
}

export function loadNotes(): string {
  try {
    return sessionStorage.getItem(NOTES_KEY) ?? "";
  } catch {
    return "";
  }
}

export function getFavorites(): number[] {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}

export function toggleFavorite(id: number): number[] {
  const cur = getFavorites();
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(next));
  } catch {}
  return next;
}
