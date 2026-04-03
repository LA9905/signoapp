/**
 * Elimina acentos, normaliza espacios extremos y pasa a minúsculas.
 * Usado para búsquedas insensibles a acentos en el frontend.
 */
export function normalizeSearch(text: string): string {
  return text
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}