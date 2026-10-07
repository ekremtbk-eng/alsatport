const FOLD: Record<string, string> = {
  ı: "i",
  i̇: "i",
  ş: "s",
  ç: "c",
  ğ: "g",
  ö: "o",
  ü: "u",
  â: "a",
  î: "i",
  û: "u",
};

/** Lowercase, Turkish-folded, punctuation-free text with single spaces; keeps digits, `+` and `.`/`,` inside numbers. */
export function foldText(value: string) {
  return value
    .toLocaleLowerCase("tr")
    .normalize("NFC")
    .replace(/[ışçğöüâîû]|i̇/g, (ch) => FOLD[ch] ?? ch)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’`´]/g, " ")
    .replace(/(\d)[.,](?=\d)/g, "$1\u0001")
    .replace(/[^a-z0-9+\u0001\s]/g, " ")
    .replace(/\u0001/g, ".")
    .replace(/\s+/g, " ")
    .trim();
}

/** Folded phrase used as a match term; `null` for terms too short or generic to be a reliable signal. */
export function termOf(value: string, min = 3) {
  const t = foldText(value);
  return t.length >= min ? t : null;
}
