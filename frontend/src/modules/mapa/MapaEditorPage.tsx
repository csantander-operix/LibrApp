import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Save, Plus, Trash2, BookOpen, Loader2, Info, Layers,
  Type, ArrowRight, RotateCcw, RotateCw,
} from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { cn, COLORES_ESTANTE, colorEstante } from "@/lib/utils";
import type { Estante, Anotacion, AnotacionTipo } from "@/shared/types";
import {
  listarEstantes, listarZonas, listarAnotaciones,
  guardarPosiciones, crearEstante, eliminarEstante,
  crearAnotacion, guardarAnotaciones, eliminarAnotacion,
  type PosicionEstante, type AnotacionPosicion,
} from "@/modules/catalogo/api";
import { MapaCanvas } from "./MapaCanvas";
import { EstantePopup } from "./EstantePopup";
import { ZonasModal } from "./ZonasModal";

/** Fila de swatches de color reutilizable. */
function ColorPicker({ value, onChange }: { value: string | null; onChange: (c: string | null) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {COLORES_ESTANTE.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          title={c}
          className={cn(
            "h-6 w-6 rounded-full border transition-transform hover:scale-110",
            value?.toLowerCase() === c.toLowerCase() ? "border-stone-900 ring-2 ring-ambar" : "border-black/10",
          )}
          style={{ background: c }}
        />
      ))}
      <button
        onClick={() => onChange(null)}
        title="Automático (color de zona)"
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-full border bg-white text-[9px] font-bold text-stone-500 transition-transform hover:scale-110",
          value === null ? "border-stone-900 ring-2 ring-ambar" : "border-stone-300",
        )}
      >
        Aa
      </button>
    </div>
  );
}

export function MapaEditorPage() {
  const qc = useQueryClient();
  const { data: estantesServer, isLoading } = useQuery({ queryKey: ["estantes"], queryFn: listarEstantes });
  const { data: anotServer } = useQuery({ queryKey: ["anotaciones"], queryFn: listarAnotaciones });
  const { data: zonas = [] } = useQuery({ queryKey: ["zonas"], queryFn: listarZonas });

  const [zonaId, setZonaId] = useState<string>("");
  const [localEst, setLocalEst] = useState<Estante[]>([]);
  const [localAnot, setLocalAnot] = useState<Anotacion[]>([]);
  const [dirty, setDirty] = useState(false);
  const [selEstId, setSelEstId] = useState<string | null>(null);
  const [selAnotId, setSelAnotId] = useState<string | null>(null);
  const [popup, setPopup] = useState<Estante | null>(null);
  const [zonasModal, setZonasModal] = useState(false);

  // Sincroniza copias locales desde el server salvo que haya cambios sin guardar.
  useEffect(() => {
    if (estantesServer && !dirty) setLocalEst(estantesServer);
  }, [estantesServer, dirty]);
  useEffect(() => {
    if (anotServer && !dirty) setLocalAnot(anotServer);
  }, [anotServer, dirty]);

  useEffect(() => {
    if (!zonas.length) return;
    if (!zonaId || !zonas.some((z) => z.id === zonaId)) setZonaId(zonas[0].id);
  }, [zonas, zonaId]);

  const estVisibles = useMemo(
    () => localEst.filter((e) => (zonaId ? e.zona_id === zonaId : true)),
    [localEst, zonaId],
  );
  const anotVisibles = useMemo(
    () => localAnot.filter((a) => (zonaId ? a.zona_id === zonaId : true)),
    [localAnot, zonaId],
  );

  const selEstante = localEst.find((e) => e.id === selEstId) ?? null;
  const selAnot = localAnot.find((a) => a.id === selAnotId) ?? null;

  // ── Guardado en lote (estantes + anotaciones) ───────────────────────────────
  const guardar = useMutation({
    mutationFn: async () => {
      const estPayload: PosicionEstante[] = localEst.map((e) => ({
        id: e.id, pos_x: e.pos_x, pos_y: e.pos_y, ancho: e.ancho, alto: e.alto, color: e.color,
      }));
      const anotPayload: AnotacionPosicion[] = localAnot.map((a) => ({
        id: a.id, texto: a.texto, pos_x: a.pos_x, pos_y: a.pos_y,
        ancho: a.ancho, alto: a.alto, rotacion: a.rotacion, color: a.color,
      }));
      await guardarPosiciones(estPayload);
      await guardarAnotaciones(anotPayload);
    },
    onSuccess: () => {
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["estantes"] });
      qc.invalidateQueries({ queryKey: ["anotaciones"] });
    },
  });

  // ── Alta de estante ─────────────────────────────────────────────────────────
  const agregarEst = useMutation({
    mutationFn: (codigo: string) => crearEstante({ codigo, etiqueta: null, zona_id: zonaId || null }),
    onSuccess: (nuevo) => {
      setLocalEst((prev) => [...prev, nuevo]);
      setSelEstId(nuevo.id);
      setSelAnotId(null);
      qc.invalidateQueries({ queryKey: ["estantes"] });
    },
    onError: (err: any) => window.alert(err?.response?.data?.detail ?? "No se pudo crear el estante"),
  });

  const eliminarEst = useMutation({
    mutationFn: eliminarEstante,
    onSuccess: (_d, id) => {
      setLocalEst((prev) => prev.filter((e) => e.id !== id));
      setSelEstId(null);
      qc.invalidateQueries({ queryKey: ["estantes"] });
    },
    onError: (err: any) => window.alert(err?.response?.data?.detail ?? "No se pudo eliminar"),
  });

  // ── Alta / baja de anotaciones ──────────────────────────────────────────────
  const agregarAnot = useMutation({
    mutationFn: (tipo: AnotacionTipo) =>
      crearAnotacion({
        tipo, zona_id: zonaId || null,
        texto: tipo === "texto" ? "NUEVO TEXTO" : null,
        pos_x: 42, pos_y: 44, ancho: tipo === "flecha" ? 14 : 18, alto: 6,
        color: "#7A1C30",
      }),
    onSuccess: (nueva) => {
      setLocalAnot((prev) => [...prev, nueva]);
      setSelAnotId(nueva.id);
      setSelEstId(null);
      qc.invalidateQueries({ queryKey: ["anotaciones"] });
    },
  });

  const eliminarAnot = useMutation({
    mutationFn: eliminarAnotacion,
    onSuccess: (_d, id) => {
      setLocalAnot((prev) => prev.filter((a) => a.id !== id));
      setSelAnotId(null);
      qc.invalidateQueries({ queryKey: ["anotaciones"] });
    },
  });

  // ── Ediciones locales (marcan dirty) ────────────────────────────────────────
  function patchEst(id: string, patch: Partial<Estante>) {
    setDirty(true);
    setLocalEst((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }
  function patchAnot(id: string, patch: Partial<Anotacion>) {
    setDirty(true);
    setLocalAnot((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  function agregarEstante() {
    const codigo = window.prompt("Código del nuevo estante (ej: E6, MESA-2):");
    if (codigo?.trim()) agregarEst.mutate(codigo.trim().toUpperCase());
  }

  function eliminarEstanteSel() {
    if (!selEstante) return;
    if (selEstante.total_libros > 0) {
      window.alert(
        `El estante "${selEstante.codigo}" tiene ${selEstante.total_libros} libro(s). ` +
        "Reasignalos antes de eliminarlo (RN-08).",
      );
      return;
    }
    if (window.confirm(`¿Eliminar el estante "${selEstante.codigo}"?`)) eliminarEst.mutate(selEstante.id);
  }

  return (
    <div>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-stone-900">Editor de mapa</h1>
          <p className="text-sm text-stone-500">
            Arrastrá y redimensioná los estantes, pintalos por categoría y agregá flechas o textos
            (entrada, escalera, ventanas). Guardá al terminar (RF-01/RF-10).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {zonas.length > 0 && (
            <Select value={zonaId} onChange={(e) => setZonaId(e.target.value)} className="w-40">
              {zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
            </Select>
          )}
          <Button variant="outline" onClick={() => setZonasModal(true)}>
            <Layers className="h-4 w-4" /> Zonas
          </Button>
          <Button variant="outline" onClick={agregarEstante}>
            <Plus className="h-4 w-4" /> Estante
          </Button>
          <Button variant="outline" onClick={() => agregarAnot.mutate("texto")}>
            <Type className="h-4 w-4" /> Texto
          </Button>
          <Button variant="outline" onClick={() => agregarAnot.mutate("flecha")}>
            <ArrowRight className="h-4 w-4" /> Flecha
          </Button>
          <Button onClick={() => guardar.mutate()} disabled={!dirty || guardar.isPending}>
            {guardar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar
          </Button>
        </div>
      </header>

      {dirty && (
        <p className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          <Info className="h-4 w-4" /> Tenés cambios sin guardar.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
        <div>
          {isLoading ? (
            <div className="flex h-64 items-center justify-center text-stone-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <MapaCanvas
              estantes={estVisibles}
              anotaciones={anotVisibles}
              modo="editar"
              seleccionadoId={selEstId}
              seleccionadoAnotId={selAnotId}
              onSeleccionar={(e) => { setSelEstId(e.id); setSelAnotId(null); }}
              onSeleccionarAnotacion={(a) => { setSelAnotId(a.id); setSelEstId(null); }}
              onMover={(id, x, y) => patchEst(id, { pos_x: x, pos_y: y })}
              onResize={(id, w, h) => patchEst(id, { ancho: w, alto: h })}
              onMoverAnotacion={(id, x, y) => patchAnot(id, { pos_x: x, pos_y: y })}
              onResizeAnotacion={(id, w, h) => patchAnot(id, { ancho: w, alto: h })}
              onAgregar={agregarEstante}
            />
          )}
        </div>

        {/* Panel lateral contextual */}
        <aside className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm shadow-stone-900/5">
          {selEstante ? (
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold text-white shadow-sm"
                  style={{ background: colorEstante(selEstante.color, selEstante.zona_id) }}
                >
                  {selEstante.codigo}
                </span>
                <span className="text-xs text-stone-400">Estante</span>
              </div>
              {selEstante.etiqueta && (
                <p className="mt-3 font-serif text-base font-semibold text-stone-800">{selEstante.etiqueta}</p>
              )}
              <p className="mt-1 text-sm text-stone-500">{selEstante.total_libros} libro(s) asignado(s)</p>
              <p className="mt-1 text-xs text-stone-400">
                {Math.round(selEstante.ancho)} × {Math.round(selEstante.alto)} (arrastrá la esquina para
                redimensionar)
              </p>

              <div className="mt-4">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500">Color / categoría</p>
                <ColorPicker value={selEstante.color} onChange={(c) => patchEst(selEstante.id, { color: c })} />
              </div>

              <div className="mt-4 space-y-2">
                <Button variant="outline" className="w-full" onClick={() => setPopup(selEstante)}>
                  <BookOpen className="h-4 w-4" /> Ver libros
                </Button>
                <Button variant="danger" className="w-full" onClick={eliminarEstanteSel}>
                  <Trash2 className="h-4 w-4" /> Eliminar
                </Button>
              </div>
            </div>
          ) : selAnot ? (
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-stone-800 px-3 py-1 text-sm font-semibold text-white">
                  {selAnot.tipo === "flecha" ? <ArrowRight className="h-3.5 w-3.5" /> : <Type className="h-3.5 w-3.5" />}
                  {selAnot.tipo === "flecha" ? "Flecha" : "Texto"}
                </span>
                <span className="text-xs text-stone-400">Anotación</span>
              </div>

              {selAnot.tipo === "texto" && (
                <div className="mt-4">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">Texto</label>
                  <Input
                    value={selAnot.texto ?? ""}
                    onChange={(e) => patchAnot(selAnot.id, { texto: e.target.value })}
                    placeholder="Ej: ESCALERA, VENTANA…"
                  />
                </div>
              )}

              <div className="mt-4">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500">Color</p>
                <ColorPicker value={selAnot.color} onChange={(c) => patchAnot(selAnot.id, { color: c ?? "#7A1C30" })} />
              </div>

              <div className="mt-4">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Rotación ({Math.round(selAnot.rotacion)}°)
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => patchAnot(selAnot.id, { rotacion: selAnot.rotacion - 15 })}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={() => patchAnot(selAnot.id, { rotacion: selAnot.rotacion + 15 })}>
                    <RotateCw className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" onClick={() => patchAnot(selAnot.id, { rotacion: 0 })}>
                    Reset
                  </Button>
                </div>
              </div>

              <p className="mt-3 text-xs text-stone-400">
                Arrastrá para mover; la esquina inferior derecha redimensiona.
              </p>

              <Button variant="danger" className="mt-4 w-full" onClick={() => eliminarAnot.mutate(selAnot.id)}>
                <Trash2 className="h-4 w-4" /> Eliminar anotación
              </Button>
            </div>
          ) : (
            <div className="text-sm text-stone-400">
              <p>Seleccioná un estante o una anotación para editarlo.</p>
              <p className="mt-3 text-xs">
                Usá <span className="font-semibold text-stone-500">Texto</span> y{" "}
                <span className="font-semibold text-stone-500">Flecha</span> para señalizar entrada, salida,
                escaleras o ventanas.
              </p>
            </div>
          )}
        </aside>
      </div>

      {popup && <EstantePopup estante={popup} onClose={() => setPopup(null)} />}
      {zonasModal && <ZonasModal zonas={zonas} onClose={() => setZonasModal(false)} />}
    </div>
  );
}
