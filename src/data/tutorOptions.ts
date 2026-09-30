export const TUTOR_SCHOOL_SUBJECTS = [
  "Matematik",
  "Türkçe",
  "Fen Bilgisi",
  "Sosyal Bilgiler",
  "İngilizce",
  "Hayat Bilgisi",
  "Okuma-Yazma",
] as const;

export const TUTOR_LANG_SUBJECTS = [
  "İngilizce",
  "Almanca",
  "Fransızca",
  "İspanyolca",
  "Rusça",
  "Arapça",
  "Türkçe (Yabancılar İçin)",
] as const;

export const TUTOR_UNI_SUBJECTS = [
  "Matematik",
  "Fizik",
  "Kimya",
  "Biyoloji",
  "Edebiyat",
  "Tarih",
  "Coğrafya",
  "Üniversiteye Hazırlık (YKS/AYT)",
] as const;

export const TUTOR_SCHOOL_LEVELS = [
  "İlkokul 1. Sınıf",
  "İlkokul 2. Sınıf",
  "İlkokul 3. Sınıf",
  "İlkokul 4. Sınıf",
  "Ortaokul 5. Sınıf",
  "Ortaokul 6. Sınıf",
  "Ortaokul 7. Sınıf",
  "Ortaokul 8. Sınıf",
] as const;

export const TUTOR_UNI_LEVELS = [
  "Lise 9. Sınıf",
  "Lise 10. Sınıf",
  "Lise 11. Sınıf",
  "Lise 12. Sınıf",
  "Mezun",
  "Üniversite",
] as const;

export const TUTOR_LANG_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2", "Konuşma"] as const;

export const TUTOR_ROOT_LEVELS = ["İlkokul", "Ortaokul", "Lise", "Üniversite", "Mezun", "Yabancı Dil"] as const;

export const TUTOR_PLACES = [
  "Öğretmenin Evi",
  "Öğrencinin Evi",
  "Online (Uzaktan Eğitim)",
  "Ofis / Dershane",
] as const;

function unique(list: readonly string[]) {
  return [...new Set(list)];
}

export function tutorSubjectsFor(categoryId: string): string[] {
  if (categoryId === "tutors-school" || categoryId.includes("ilkokul")) return [...TUTOR_SCHOOL_SUBJECTS];
  if (categoryId === "tutors-lang" || categoryId.includes("yabanci")) return [...TUTOR_LANG_SUBJECTS];
  if (categoryId === "tutors-uni" || categoryId.includes("lise-universite") || categoryId.includes("universite")) {
    return [...TUTOR_UNI_SUBJECTS];
  }
  return unique([...TUTOR_SCHOOL_SUBJECTS, ...TUTOR_UNI_SUBJECTS, ...TUTOR_LANG_SUBJECTS]);
}

export function tutorLevelsFor(categoryId: string): string[] {
  if (categoryId === "tutors-school" || categoryId.includes("ilkokul")) return [...TUTOR_SCHOOL_LEVELS];
  if (categoryId === "tutors-lang" || categoryId.includes("yabanci")) return [...TUTOR_LANG_LEVELS];
  if (categoryId === "tutors-uni" || categoryId.includes("lise-universite") || categoryId.includes("universite")) {
    return [...TUTOR_UNI_LEVELS];
  }
  return [...TUTOR_ROOT_LEVELS];
}

export function isTutorCategoryId(categoryId?: string | null) {
  return Boolean(categoryId && (categoryId === "tutors" || categoryId.startsWith("tutors-")));
}
