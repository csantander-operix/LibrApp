import { useRef, type PointerEvent } from "react";
import { cn } from "@/lib/utils";
import type { Estante } from "@/shared/types";

interface Props {
  estantes: Estante[];
  modo?: "ver" | "editar";
  seleccionadoId?: string | null;
  resaltados?: Set<string>;
  onSeleccionar?: (estante: Estante) => void;
  /** En modo editar: se llama en cada movimiento con la nueva posición (en %). */
  onMover?: (id: string, pos_x: number, pos_y: number) => void;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function MapaCanvas({
  estantes, modo = "ver", seleccionadoId, resaltados, onSeleccionar, onMover,
}: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  // Estado del drag en curso (sin re-render: usamos ref).
  const drag = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  function onPointerDown(e: PointerEvent, est: Estante) {
    if (modo !== "editar" || !onMover) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Offset del click dentro del bloque, en %, para que no "salte" al arrastrar.
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;
    drag.current = { id: est.id, offsetX: px - est.pos_x, offsetY: py - est.pos_y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent, est: Estante) {
    if (!drag.current || drag.current.id !== est.id) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !onMover) return;
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;
    const nx = clamp(px - drag.current.offsetX, 0, 100 - est.ancho);
    const ny = clamp(py - drag.current.offsetY, 0, 100 - est.alto);
    onMover(est.id, Math.round(nx * 100) / 100, Math.round(ny * 100) / 100);
  }

  function onPointerUp(e: PointerEvent) {
    if (drag.current) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      drag.current = null;
    }
  }

  return (
    <div
      ref={canvasRef}
      className="relative w-full overflow-hidden rounded-xl border border-slate-300 bg-slate-100"
      style={{ aspectRatio: "3 / 2", backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)", backgroundSize: "24px 24px" }}
    >
      {estantes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
          No hay estantes en esta zona.
        </div>
      )}
      {estantes.map((est) => {
        const resaltado = resaltados?.has(est.id);
        const seleccionado = seleccionadoId === est.id;
        return (
          <button
            key={est.id}
            onPointerDown={(e) => onPointerDown(e, est)}
            onPointerMove={(e) => onPointerMove(e, est)}
            onPointerUp={onPointerUp}
            onClick={() => onSeleccionar?.(est)}
            className={cn(
              "absolute flex flex-col items-center justify-center rounded-lg border-2 p-1 text-center transition-colors",
              modo === "editar" ? "cursor-move touch-none" : "cursor-pointer",
              resaltado
                ? "border-unla bg-unla text-white shadow-lg ring-4 ring-unla/30 animate-pulse"
                : seleccionado
                ? "border-unla bg-unla/15 text-unla"
                : "border-slate-400 bg-white text-slate-700 hover:border-unla hover:bg-unla/5",
            )}
            style={{
              left: `${est.pos_x}%`,
              top: `${est.pos_y}%`,
              width: `${est.ancho}%`,
              height: `${est.alto}%`,
            }}
            title={est.etiqueta ?? est.codigo}
          >
            <span className="text-xs font-bold leading-tight">{est.codigo}</span>
            {est.etiqueta && (
              <span className="max-w-full truncate text-[10px] leading-tight opacity-80">{est.etiqueta}</span>
            )}
            <span className="text-[10px] opacity-70">{est.total_libros} libro(s)</span>
          </button>
        );
      })}
    </div>
  );
}
