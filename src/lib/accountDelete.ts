export const ACCOUNT_DELETE_PHRASE = "HESABIMI SİL";

export function isDeletePhrase(value: string) {
  return value.trim().toLocaleUpperCase("tr-TR") === ACCOUNT_DELETE_PHRASE;
}
