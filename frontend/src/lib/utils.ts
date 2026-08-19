import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combina clases de Tailwind resolviendo conflictos (patrón shadcn). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Paleta cálida "bibliófila" para los lomos de libros: verdes profundos,
 * bordós, azules de biblioteca, mostazas y cueros. Se elige de forma
 * determinística a partir de un seed (id/título) para que un mismo libro
 * conserve siempre el mismo lomo.
 */
const LOMOS = [
  { spine: "#3f5c4c", edge: "#2c4436", ink: "#f4efe6" }, // verde biblioteca
  { spine: "#7a1c30", edge: "#5a1323", ink: "#f7e9d7" }, // bordó UNLa
  { spine: "#2e3d5c", edge: "#1f2a42", ink: "#eef1f8" }, // azul tinta
  { spine: "#b5842f", edge: "#8a6320", ink: "#2b2118" }, // mostaza / oro viejo
  { spine: "#8a4b2a", edge: "#663419", ink: "#f6e7d6" }, // cuero
  { spine: "#4a4f57", edge: "#33363c", ink: "#eef0f2" }, // grafito
  { spine: "#6b3f5e", edge: "#4c2b43", ink: "#f5e8f1" }, // ciruela
  { spine: "#2f6b6b", edge: "#1f4a4a", ink: "#e8f4f3" }, // verde azulado
] as const;

export type Lomo = (typeof LOMOS)[number];

export function colorLomo(seed: string): Lomo {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return LOMOS[h % LOMOS.length];
}

/** Alto relativo (%) pseudo-aleatorio pero estable para variar los lomos. */
export function altoLomo(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 17 + seed.charCodeAt(i)) >>> 0;
  return 82 + (h % 18); // 82–99%
}

/**
 * Paleta de zonas para colorear estantes en el mapa (diferenciar categorías de
 * un vistazo). Se usa como fallback cuando el estante no tiene `color` propio.
 */
const ZONA_PALETTE = [
  "#3B82F6", // azul   — Literatura
  "#22C55E", // verde  — Historia
  "#A855F7", // violeta— Ciencias
  "#F97316", // naranja— Infantil
  "#EC4899", // rosa   — Filosofía
  "#0EA5E9", // celeste
  "#14B8A6", // teal
] as const;

/** Colores predefinidos para el selector del editor de mapa. */
export const COLORES_ESTANTE = [
  "#7A1C30", ...ZONA_PALETTE, "#D97706", "#64748B",
] as const;

/** Oscurece un hex (#RRGGBB) un porcentaje dado, para bordes/sombras. */
export function oscurecer(hex: string, factor = 0.8): string {
  const m = /^#?([\da-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = Math.round(((n >> 16) & 255) * factor);
  const g = Math.round(((n >> 8) & 255) * factor);
  const b = Math.round((n & 255) * factor);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/** Color efectivo de un estante: el propio si existe, si no uno por zona. */
export function colorEstante(color: string | null, zonaId: string | null): string {
  if (color) return color;
  if (!zonaId) return "#94a3b8";
  let h = 0;
  for (let i = 0; i < zonaId.length; i++) h = (h * 31 + zonaId.charCodeAt(i)) >>> 0;
  return ZONA_PALETTE[h % ZONA_PALETTE.length];
}
