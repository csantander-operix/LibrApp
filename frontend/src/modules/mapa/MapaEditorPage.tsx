import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Plus, Trash2, BookOpen, Loader2, Info, Layers } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { Select } from "@/shared/components/ui/Select";
import type { Estante } from "@/shared/types";
import {
  listarEstantes, listarZonas, guardarPosiciones, crearEstante, eliminarEstante,
  type PosicionEstante,
} from "@/modules/catalogo/api";
import { MapaCanvas } from "./MapaCanvas";
import { EstantePopup } from "./EstantePopup";
import { ZonasModal } from "./ZonasModal";

export function MapaEditorPage() {
  const qc = useQueryClient();
  const { data: estantesServer, isLoading } = useQuery({ queryKey: ["estantes"], queryFn: listarEstantes });
  const { data: zonas = [] } = useQuery({ queryKey: ["zonas"], queryFn: listarZonas });

  const [zonaId, setZonaId] = useState<string>("");
  const [local, setLocal] = useState<Estante[]>([]);
  const [dirty, setDirty] = useState(false);
  const [seleccionado, setSeleccionado] = useState<Estante | null>(null);
  const [popup, setPopup] = useState<Estante | null>(null);
  const [zonasModal, setZonasModal] = useState(false);

  // Sincroniza la copia local desde el server salvo que haya cambios sin guardar.
  useEffect(() => {
    if (estantesServer && !dirty) setLocal(estantesServer);
  }, [estantesServer, dirty]);

  // Zona seleccionada válida: la primera si no hay ninguna, o si la actual se borró.
  useEffect(() => {
    if (!zonas.length) return;
    if (!zonaId || !zonas.some((z) => z.id === zonaId)) setZonaId(zonas[0].id);
  }, [zonas, zonaId]);

  const visibles = useMemo(
    () => local.filter((e) => (zonaId ? e.zona_id === zonaId : true)),
    [local, zonaId],
  );

  const guardar = useMutation({
    mutationFn: () => {
      const payload: PosicionEstante[] = local.map((e) => ({
        id: e.id, pos_x: e.pos_x, pos_y: e.pos_y, ancho: e.ancho, alto: e.alto,
      }));
      return guardarPosiciones(payload);
    },
    onSuccess: () => {
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["estantes"] });
    },
  });

  const agregar = useMutation({
    mutationFn: (codigo: string) =>
      crearEstante({ codigo, etiqueta: null, zona_id: zonaId || null }),
    onSuccess: () => {
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["estantes"] });
    },
    onError: (err: any) => window.alert(err?.response?.data?.detail ?? "No se pudo crear el estante"),
  });

  const eliminar = useMutation({
    mutationFn: eliminarEstante,
    onSuccess: () => {
      setSeleccionado(null);
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["estantes"] });
    },
    onError: (err: any) => window.alert(err?.response?.data?.detail ?? "No se pudo eliminar"),
  });

  function onMover(id: string, pos_x: number, pos_y: number) {
    setDirty(true);
    setLocal((prev) => prev.map((e) => (e.id === id ? { ...e, pos_x, pos_y } : e)));
    setSeleccionado((s) => (s && s.id === id ? { ...s, pos_x, pos_y } : s));
  }

  function agregarEstante() {
    const codigo = window.prompt("Código del nuevo estante (ej: E6, MESA-2):");
    if (codigo?.trim()) agregar.mutate(codigo.trim().toUpperCase());
  }

  function eliminarEstanteSel() {
    if (!seleccionado) return;
    if (seleccionado.total_libros > 0) {
      window.alert(
        `El estante "${seleccionado.codigo}" tiene ${seleccionado.total_libros} libro(s). ` +
        "Reasignalos antes de eliminarlo (RN-08).",
      );
      return;
    }
    if (window.confirm(`¿Eliminar el estante "${seleccionado.codigo}"?`)) eliminar.mutate(seleccionado.id);
  }

  return (
    <div>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Editor de mapa</h1>
          <p className="text-sm text-slate-500">
            Arrastrá los estantes para reubicarlos y guardá los cambios (RF-01/RF-10).
          </p>
        </div>
        <div className="flex items-center gap-2">
          {zonas.length > 0 && (
            <Select value={zonaId} onChange={(e) => setZonaId(e.target.value)} className="w-44">
              {zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
            </Select>
          )}
          <Button variant="outline" onClick={() => setZonasModal(true)}>
            <Layers className="h-4 w-4" /> Zonas
          </Button>
          <Button variant="outline" onClick={agregarEstante}>
            <Plus className="h-4 w-4" /> Agregar
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px]">
        <div>
          {isLoading ? (
            <div className="flex h-64 items-center justify-center text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <MapaCanvas
              estantes={visibles}
              modo="editar"
              seleccionadoId={seleccionado?.id ?? null}
              onSeleccionar={setSeleccionado}
              onMover={onMover}
            />
          )}
        </div>

        {/* Panel del estante seleccionado */}
        <aside className="rounded-xl border border-slate-200 bg-white p-4">
          {seleccionado ? (
            <div>
              <span className="inline-flex items-center rounded-full bg-unla/10 px-3 py-1 text-sm font-semibold text-unla">
                {seleccionado.codigo}
              </span>
              {seleccionado.etiqueta && <p className="mt-2 text-sm text-slate-600">{seleccionado.etiqueta}</p>}
              <p className="mt-2 text-sm text-slate-500">{seleccionado.total_libros} libro(s) asignado(s)</p>
              <div className="mt-4 space-y-2">
                <Button variant="outline" className="w-full" onClick={() => setPopup(seleccionado)}>
                  <BookOpen className="h-4 w-4" /> Ver libros
                </Button>
                <Button variant="outline" className="w-full text-red-600" onClick={eliminarEstanteSel}>
                  <Trash2 className="h-4 w-4" /> Eliminar
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Hacé click en un estante para ver sus acciones.</p>
          )}
        </aside>
      </div>

      {popup && <EstantePopup estante={popup} onClose={() => setPopup(null)} />}
      {zonasModal && <ZonasModal zonas={zonas} onClose={() => setZonasModal(false)} />}
    </div>
  );
}
