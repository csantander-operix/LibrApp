import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { BookMarked, Search, MapPin, Loader2 } from "lucide-react";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { listarLibros, listarEstantes, listarZonas } from "@/modules/catalogo/api";
import { MapaCanvas } from "@/modules/mapa/MapaCanvas";
import { EstantePopup } from "@/modules/mapa/EstantePopup";
import type { Estante } from "@/shared/types";

export function PublicSearchPage() {
  const [texto, setTexto] = useState("");
  const [popup, setPopup] = useState<Estante | null>(null);
  const [zonaId, setZonaId] = useState("");
  // Búsqueda desde 2 caracteres (CU-01). Antes de eso no filtramos.
  const q = texto.trim().length >= 2 ? texto.trim() : "";

  const { data: libros, isLoading } = useQuery({
    queryKey: ["public-libros", q],
    queryFn: () => listarLibros(q ? { q } : {}),
  });
  const { data: estantes = [] } = useQuery({ queryKey: ["estantes"], queryFn: listarEstantes });
  const { data: zonas = [] } = useQuery({ queryKey: ["zonas"], queryFn: listarZonas });

  // Zona por defecto: la primera.
  useEffect(() => {
    if (!zonaId && zonas.length) setZonaId(zonas[0].id);
  }, [zonas, zonaId]);

  // RF-13: resaltar en el plano los estantes que contienen resultados de la búsqueda.
  const resaltados = useMemo(() => {
    if (!q || !libros) return new Set<string>();
    return new Set(libros.map((l) => l.estante_id).filter((id): id is string => !!id));
  }, [q, libros]);

  // Estantes de la zona seleccionada (RF-11: mapa multi-piso).
  const estantesZona = useMemo(
    () => estantes.filter((e) => (zonaId ? e.zona_id === zonaId : true)),
    [estantes, zonaId],
  );

  // Zonas que contienen coincidencias (para orientar cuando están en otro piso).
  const zonasConMatch = useMemo(() => {
    if (resaltados.size === 0) return [];
    return zonas.filter((z) => estantes.some((e) => e.zona_id === z.id && resaltados.has(e.id)));
  }, [zonas, estantes, resaltados]);

  return (
    <div className="mx-auto max-w-5xl p-6">
      <header className="mb-6 flex flex-col items-center gap-2 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-unla text-white">
          <BookMarked className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Consultá dónde está tu libro</h1>
        <p className="text-sm text-slate-500">
          Librería Rodolfo Walsh — UNLa. Buscá por título, autor o ISBN.
        </p>
        <Link to="/login" className="text-xs font-medium text-unla hover:underline">
          Acceso administrador
        </Link>
      </header>

      <div className="relative mx-auto max-w-2xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Ej: Perón, Ciccus, 978-987…"
          className="pl-9"
          autoFocus
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.1fr]">
        {/* Resultados */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-600">
            {q ? "Resultados" : "Catálogo"}
            {libros ? ` (${libros.length})` : ""}
          </h2>
          {isLoading && (
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" /> Buscando…
            </div>
          )}
          {libros && libros.length === 0 && (
            <p className="rounded-lg bg-slate-100 px-4 py-3 text-center text-sm text-slate-500">
              Libro no encontrado.
            </p>
          )}
          <div className="max-h-[28rem] space-y-2 overflow-auto">
            {libros?.map((libro) => (
              <div
                key={libro.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{libro.titulo}</p>
                  <p className="truncate text-sm text-slate-500">
                    {libro.autor} · {libro.editorial}
                  </p>
                </div>
                <div className="ml-3 shrink-0">
                  {libro.estante_codigo ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-unla/10 px-3 py-1 text-sm font-medium text-unla">
                      <MapPin className="h-3.5 w-3.5" /> {libro.estante_codigo}
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700">
                      Sin ubicar
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mapa (RF-01 / RF-13 / RF-11) */}
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-600">Mapa de la librería</h2>
            {zonas.length > 1 && (
              <Select value={zonaId} onChange={(e) => setZonaId(e.target.value)} className="w-40">
                {zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
              </Select>
            )}
          </div>

          {/* Pista: si hay coincidencias en zonas distintas a la mostrada. */}
          {zonasConMatch.length > 0 && !zonasConMatch.some((z) => z.id === zonaId) && (
            <p className="mb-2 rounded-lg bg-unla/10 px-3 py-2 text-xs text-unla">
              Hay coincidencias en: {zonasConMatch.map((z) => z.nombre).join(", ")}. Cambiá de zona para verlas.
            </p>
          )}

          <MapaCanvas
            estantes={estantesZona}
            modo="ver"
            resaltados={resaltados}
            onSeleccionar={setPopup}
          />
          <p className="mt-2 text-xs text-slate-400">
            {q
              ? "Los estantes resaltados contienen tu búsqueda. Tocá uno para ver sus libros."
              : "Tocá un estante para ver qué libros tiene."}
          </p>
        </div>
      </div>

      {popup && <EstantePopup estante={popup} onClose={() => setPopup(null)} mostrarPrecio={false} />}
    </div>
  );
}
