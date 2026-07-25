import type { StudyMaterial } from "./generate.functions";

const KEY = "flashgenius:study";

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
