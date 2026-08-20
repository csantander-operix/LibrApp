import { useRef, useState, type PointerEvent } from "react";
import { Pencil, Plus, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { cn, colorEstante, oscurecer } from "@/lib/utils";
import type { Estante, Anotacion } from "@/shared/types";

interface Props {
  estantes: Estante[];
  anotaciones?: Anotacion[];
  modo?: "ver" | "editar";
  seleccionadoId?: string | null;
  seleccionadoAnotId?: string | null;
  resaltados?: Set<string>;
  onSeleccionar?: (estante: Estante) => void;
  onSeleccionarAnotacion?: (a: Anotacion) => void;
  /** En modo editar: mover/redimensionar (valores en % del plano). */
  onMover?: (id: string, pos_x: number, pos_y: number) => void;
  onResize?: (id: string, ancho: number, alto: number) => void;
  onMoverAnotacion?: (id: string, pos_x: number, pos_y: number) => void;
  onResizeAnotacion?: (id: string, ancho: number, alto: number) => void;
  /** Controles flotantes contextuales (opcionales). */
  onEditar?: () => void;
  onAgregar?: () => void;
  /** Altura máxima del viewport del plano (ej: "38vh", "320px"). Sin valor = 100% del aspect-ratio. */
  maxHeight?: string;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const ZOOM_MIN = 0.6;
const ZOOM_MAX = 2.4;
const MIN_ESTANTE = 4;
const MIN_ANOT = 3;

type Kind = "shelf" | "anot";
type Mode = "move" | "resize";
interface DragState {
  kind: Kind;
  mode: Mode;
  id: string;
  // move: offset del click respecto al top-left; resize: tamaño y punto iniciales.
  ox: number; oy: number;
  startW: number; startH: number; startPx: number; startPy: number;
  posX: number; posY: number;
}

/** Botón circular flotante en bordó UNLa. */
function CtrlBtn({
  label, onClick, children,
}: { label: string; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-unla text-white shadow-lg shadow-unla/30 ring-1 ring-white/20 transition-all duration-200 hover:bg-unla-dark hover:shadow-xl active:scale-95"
    >
      {children}
    </button>
  );
}

/** Flecha direccional que escala con el ancho de la caja. */
function Flecha({ color }: { color: string }) {
  return (
    <div className="flex h-full w-full items-center" style={{ color }}>
      <div className="h-[4px] flex-1 rounded-full" style={{ background: color }} />
      <div
        style={{
          width: 0, height: 0,
          borderTop: "9px solid transparent",
          borderBottom: "9px solid transparent",
          borderLeft: `15px solid ${color}`,
        }}
      />
    </div>
  );
}

export function MapaCanvas({
  estantes, anotaciones = [], modo = "ver",
  seleccionadoId, seleccionadoAnotId, resaltados,
  onSeleccionar, onSeleccionarAnotacion, onMover, onResize,
  onMoverAnotacion, onResizeAnotacion, onEditar, onAgregar,
  maxHeight,
}: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const drag = useRef<DragState | null>(null);

  function pct(e: PointerEvent): { px: number; py: number } | null {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      px: ((e.clientX - rect.left) / rect.width) * 100,
      py: ((e.clientY - rect.top) / rect.height) * 100,
    };
  }

  function beginMove(e: PointerEvent, item: { id: string; pos_x: number; pos_y: number; ancho: number; alto: number }, kind: Kind) {
    if (modo !== "editar") return;
    const p = pct(e);
    if (!p) return;
    drag.current = {
      kind, mode: "move", id: item.id,
      ox: p.px - item.pos_x, oy: p.py - item.pos_y,
      startW: item.ancho, startH: item.alto, startPx: p.px, startPy: p.py,
      posX: item.pos_x, posY: item.pos_y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function beginResize(e: PointerEvent, item: { id: string; pos_x: number; pos_y: number; ancho: number; alto: number }, kind: Kind) {
    if (modo !== "editar") return;
    e.stopPropagation();
    const p = pct(e);
    if (!p) return;
    drag.current = {
      kind, mode: "resize", id: item.id,
      ox: 0, oy: 0,
      startW: item.ancho, startH: item.alto, startPx: p.px, startPy: p.py,
      posX: item.pos_x, posY: item.pos_y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onMove(e: PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const p = pct(e);
    if (!p) return;
    const min = d.kind === "shelf" ? MIN_ESTANTE : MIN_ANOT;
    if (d.mode === "move") {
      const nx = clamp(p.px - d.ox, 0, 100 - d.startW);
      const ny = clamp(p.py - d.oy, 0, 100 - d.startH);
      const cb = d.kind === "shelf" ? onMover : onMoverAnotacion;
      cb?.(d.id, Math.round(nx * 100) / 100, Math.round(ny * 100) / 100);
    } else {
      const nw = clamp(d.startW + (p.px - d.startPx), min, 100 - d.posX);
      const nh = clamp(d.startH + (p.py - d.startPy), min, 100 - d.posY);
      const cb = d.kind === "shelf" ? onResize : onResizeAnotacion;
      cb?.(d.id, Math.round(nw * 100) / 100, Math.round(nh * 100) / 100);
    }
  }

  function onUp(e: PointerEvent) {
    if (drag.current) {
      try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
      drag.current = null;
    }
  }

  /** Handle de redimensionado (esquina inferior derecha). */
  const handle = (item: { id: string; pos_x: number; pos_y: number; ancho: number; alto: number }, kind: Kind) => (
    <span
      onPointerDown={(e) => beginResize(e, item, kind)}
      onPointerMove={onMove}
      onPointerUp={onUp}
      className="absolute -bottom-1.5 -right-1.5 z-20 h-4 w-4 cursor-se-resize rounded-full border-2 border-white bg-unla shadow-md"
      title="Redimensionar"
    />
  );

  return (
    <div className="relative">
      {/* Viewport del plano: ancho 100% del padre; el canvas interno mantiene el aspect-ratio. */}
      <div
        className="w-full overflow-auto rounded-2xl border border-stone-300/80 shadow-inner shadow-stone-900/10"
        style={maxHeight ? { maxHeight } : undefined}
      >
        <div style={{ width: `${zoom * 100}%` }} className="transition-[width] duration-200">
          <div ref={canvasRef} className="map-floor relative w-full" style={{ aspectRatio: "3 / 2" }}>
            {/* Paredes de la sala */}
            <div className="pointer-events-none absolute inset-2 z-0 rounded border-[2.5px] border-stone-400/70" />

            {estantes.length === 0 && anotaciones.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-stone-400">
                No hay estantes en esta zona.
              </div>
            )}

            {/* ── Anotaciones (debajo de los estantes) ───────────────────── */}
            {anotaciones.map((a) => {
              const sel = seleccionadoAnotId === a.id;
              const color = a.color ?? "#7A1C30";
              return (
                <div
                  key={a.id}
                  onPointerDown={(e) => beginMove(e, a, "anot")}
                  onPointerMove={onMove}
                  onPointerUp={onUp}
                  onClick={() => onSeleccionarAnotacion?.(a)}
                  className={cn(
                    "absolute z-[4] flex items-center justify-center",
                    modo === "editar" ? "cursor-move touch-none" : "pointer-events-none",
                  )}
                  style={{
                    left: `${a.pos_x}%`, top: `${a.pos_y}%`,
                    width: `${a.ancho}%`, height: `${a.alto}%`,
                    transform: `rotate(${a.rotacion}deg)`,
                  }}
                >
                  {a.tipo === "flecha" ? (
                    <Flecha color={color} />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center rounded-md border-2 border-dashed bg-white/75 px-1 text-center font-sans text-[11px] font-bold uppercase leading-none tracking-wide backdrop-blur-[1px]"
                      style={{ color, borderColor: `${color}66` }}
                    >
                      <span className="truncate">{a.texto || "Texto"}</span>
                    </div>
                  )}
                  {modo === "editar" && sel && (
                    <>
                      <span className="pointer-events-none absolute -inset-1 rounded-md ring-2 ring-ambar" />
                      {handle(a, "anot")}
                    </>
                  )}
                </div>
              );
            })}

            {/* ── Estantes ───────────────────────────────────────────────── */}
            {estantes.map((est) => {
              const resaltado = resaltados?.has(est.id);
              const seleccionado = seleccionadoId === est.id;
              const color = colorEstante(est.color, est.zona_id);
              const borde = oscurecer(color, 0.78);
              return (
                <button
                  key={est.id}
                  onPointerDown={(e) => beginMove(e, est, "shelf")}
                  onPointerMove={onMove}
                  onPointerUp={onUp}
                  onClick={() => onSeleccionar?.(est)}
                  className={cn(
                    "group absolute z-[5] flex items-center justify-center rounded-md p-1 text-center transition-shadow duration-200",
                    modo === "editar" ? "cursor-move touch-none" : "cursor-pointer",
                    "hover:z-[6]",
                  )}
                  style={{
                    left: `${est.pos_x}%`, top: `${est.pos_y}%`,
                    width: `${est.ancho}%`, height: `${est.alto}%`,
                    background: color,
                    border: `2px solid ${borde}`,
                    boxShadow: resaltado
                      ? "0 0 0 3px #F9F8F6, 0 0 0 6px #E69D45, 0 0 22px 4px rgba(230,157,69,0.6)"
                      : seleccionado
                      ? "0 0 0 3px #F9F8F6, 0 0 0 6px #E69D45, 0 4px 12px rgba(0,0,0,0.2)"
                      : "0 1px 4px rgba(0,0,0,0.18)",
                  }}
                  title={est.etiqueta ?? est.codigo}
                >
                  <span className="pointer-events-none max-w-full truncate rounded bg-black/25 px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wide text-white">
                    {est.codigo}
                  </span>
                  {modo === "editar" && seleccionado && handle(est, "shelf")}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Controles contextuales (arriba-derecha) */}
      {(onEditar || onAgregar) && (
        <div className="absolute right-3 top-3 flex flex-col gap-2">
          {onEditar && (
            <CtrlBtn label="Editar mapa" onClick={onEditar}>
              <Pencil className="h-[18px] w-[18px]" />
            </CtrlBtn>
          )}
          {onAgregar && (
            <CtrlBtn label="Agregar estante" onClick={onAgregar}>
              <Plus className="h-[18px] w-[18px]" />
            </CtrlBtn>
          )}
        </div>
      )}

      {/* Zoom (abajo-derecha) */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-2">
        <CtrlBtn label="Acercar" onClick={() => setZoom((z) => clamp(+(z + 0.2).toFixed(2), ZOOM_MIN, ZOOM_MAX))}>
          <ZoomIn className="h-[18px] w-[18px]" />
        </CtrlBtn>
        <CtrlBtn label="Alejar" onClick={() => setZoom((z) => clamp(+(z - 0.2).toFixed(2), ZOOM_MIN, ZOOM_MAX))}>
          <ZoomOut className="h-[18px] w-[18px]" />
        </CtrlBtn>
        <CtrlBtn label="Restablecer vista" onClick={() => setZoom(1)}>
          <Maximize className="h-[18px] w-[18px]" />
        </CtrlBtn>
      </div>
    </div>
  );
}
