"use client";

import {
  BookOpen,
  Building2,
  Calculator,
  FlaskConical,
  Globe,
  GraduationCap,
  Home,
  Landmark,
  Languages,
  Leaf,
  MapPin,
  Monitor,
  PenLine,
  School,
  Sparkles,
  User,
  type LucideIcon,
} from "lucide-react";

export type TutorChipKind = "tutorSubject" | "tutorLevel" | "tutorPlace";

const SUBJECT_ICONS: Record<string, LucideIcon> = {
  Matematik: Calculator,
  Türkçe: BookOpen,
  "Fen Bilgisi": FlaskConical,
  "Sosyal Bilgiler": Landmark,
  İngilizce: Languages,
  "Hayat Bilgisi": Leaf,
  "Okuma-Yazma": PenLine,
  Almanca: Languages,
  Fransızca: Languages,
  İspanyolca: Languages,
  Rusça: Languages,
  Arapça: Languages,
  "Türkçe (Yabancılar İçin)": Globe,
  Fizik: Sparkles,
  Kimya: FlaskConical,
  Biyoloji: Leaf,
  Edebiyat: BookOpen,
  Tarih: Landmark,
  Coğrafya: Globe,
  "Üniversiteye Hazırlık (YKS/AYT)": GraduationCap,
};

const LEVEL_ICONS: Record<string, LucideIcon> = {
  İlkokul: School,
  Ortaokul: School,
  Lise: GraduationCap,
  Üniversite: GraduationCap,
  Mezun: GraduationCap,
  "Yabancı Dil": Languages,
};

const PLACE_ICONS: Record<string, LucideIcon> = {
  "Öğretmenin Evi": Home,
  "Öğrencinin Evi": User,
  "Online (Uzaktan Eğitim)": Monitor,
  "Ofis / Dershane": Building2,
};

function iconFor(kind: TutorChipKind, option: string): LucideIcon {
  if (kind === "tutorPlace") return PLACE_ICONS[option] ?? MapPin;
  if (kind === "tutorLevel") {
    if (LEVEL_ICONS[option]) return LEVEL_ICONS[option];
    if (option.startsWith("İlkokul") || option.startsWith("Ortaokul")) return School;
    if (option.startsWith("Lise") || option === "Mezun" || option === "Üniversite") return GraduationCap;
    return BookOpen;
  }
  return SUBJECT_ICONS[option] ?? BookOpen;
}

export function TutorFilterChips({
  options,
  value,
  onChange,
  kind,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  kind: TutorChipKind;
}) {
  return (
    <div className="flt-chips" role="listbox" aria-multiselectable={false}>
      {options.map((option) => {
        const Icon = iconFor(kind, option);
        const on = value === option;
        return (
          <button
            key={option}
            type="button"
            role="option"
            aria-selected={on}
            className={`flt-chip ${on ? "is-on" : ""}`}
            onClick={() => onChange(on ? "" : option)}
          >
            <Icon className="flt-chip-ico" strokeWidth={1.9} />
            <span>{option}</span>
          </button>
        );
      })}
    </div>
  );
}
