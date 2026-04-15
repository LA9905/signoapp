/**
 * Detecta la unidad de medida según el nombre del producto.
 * Retorna: "unidades" | "kg" | "lt" | "cajas" | "PQT"
 * (estos son los values usados en los <select> de toda la app)
 */
export function detectUnit(name: string): string {
  if (!name || !name.trim()) return "unidades";

  const n = name.trim();

  // ── Prepicado / Prepicada / Rollo → siempre UND (aunque tenga KG en el nombre)
  if (/prepicad[ao]/i.test(n) || /\brollo\b/i.test(n)) {
    return "unidades";
  }

  // ── LT: solo si dice "x 1 LT", "x 1 lt", "x 1 litro(s)" (exactamente 1, no 2,3,4...)
  if (/x\s*1\s*(lt|litros?)\b/i.test(n)) {
    return "lt";
  }

  // ── KG
  if (/\b(kg|kilogramos?)\b/i.test(n)) {
    return "kg";
  }

  // ── CAJA
  if (/\b(cajas?|cajitas?|cj)\b/i.test(n)) {
    return "cajas";
  }

  // ── PQT
  if (/\b(pqt|paquetes?|pack)\b/i.test(n)) {
    return "PQT";
  }

  // ── UND (incluye variantes con y sin "x" delante: "x UND", "UND", etc.)
  if (/\b(und|unds|un|unidades?)\b/i.test(n)) {
    return "unidades";
  }

  // ── Default
  return "unidades";
}