const SQLI =
  /(\bUNION\b[\s\S]{0,40}\bSELECT\b|\bDROP\s+TABLE\b|\bINSERT\s+INTO\b|\bDELETE\s+FROM\b|\bOR\s+1\s*=\s*1\b|\bSLEEP\s*\(|\bWAITFOR\b|\bINFORMATION_SCHEMA\b|\bxp_cmdshell\b|--\s|\/\*|\bEXEC\s*\()/i;

export function looksLikeSqli(value: string) {
  return SQLI.test(value);
}

export function sanitizeSearchQuery(value: unknown, max = 80) {
  if (typeof value !== "string") return "";
  const trimmed = value.replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
  if (!trimmed || looksLikeSqli(trimmed)) return "";
  return trimmed;
}

export function sanitizeSlug(value: unknown, max = 80) {
  if (typeof value !== "string") return "";
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "")
    .slice(0, max);
}
