import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { BookMarked, Search, MapPin, Loader2, Lock } from "lucide-react";
import { Select } from "@/shared/components/ui/Select";
import { listarLibros, listarEstantes, listarZonas, listarAnotaciones } from "@/modules/catalogo/api";
import { MapaCanvas } from "@/modules/mapa/MapaCanvas";
import { EstantePopup } from "@/modules/mapa/EstantePopup";
import { colorLomo, cn } from "@/lib/utils";
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
  const { data: anotaciones = [] } = useQuery({ queryKey: ["anotaciones"], queryFn: listarAnotaciones });

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
  const anotacionesZona = useMemo(
    () => anotaciones.filter((a) => (zonaId ? a.zona_id === zonaId : true)),
    [anotaciones, zonaId],
  );

  // Zonas que contienen coincidencias (para orientar cuando están en otro piso).
  const zonasConMatch = useMemo(() => {
    if (resaltados.size === 0) return [];
    return zonas.filter((z) => estantes.some((e) => e.zona_id === z.id && resaltados.has(e.id)));
  }, [zonas, estantes, resaltados]);

  return (
    <div className="min-h-full">
      {/* Barra superior institucional */}
      <div className="border-b border-stone-200 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-unla text-white shadow-sm shadow-unla/30">
              <BookMarked className="h-5 w-5" />
            </div>
            <div>
              <p className="font-serif text-sm font-bold leading-tight text-stone-900">LibrApp</p>
              <p className="text-[11px] text-stone-500">Librería Rodolfo Walsh — UNLa</p>
            </div>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-unla"
          >
            <Lock className="h-3.5 w-3.5" /> Acceso administrador
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Hero + buscador spotlight */}
        <header className="mb-8 text-center">
          <h1 className="font-serif text-4xl font-bold tracking-tight text-stone-900">
            Encontrá dónde está tu libro
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-stone-500">
            Buscá en el catálogo de la Librería Rodolfo Walsh y te mostramos el estante exacto sobre el
            plano de la sala.
          </p>

          <div className="mx-auto mt-6 flex max-w-2xl items-center gap-2 rounded-2xl border border-stone-200 bg-white p-2 shadow-lg shadow-stone-900/5 ring-1 ring-black/[0.02] focus-within:border-unla/40 focus-within:ring-2 focus-within:ring-unla/20">
            <Search className="ml-2 h-5 w-5 shrink-0 text-stone-400" />
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Buscar por título, autor, editorial o ISBN…"
              autoFocus
              className="min-w-0 flex-1 bg-transparent px-1 py-2 text-[15px] text-stone-900 placeholder:text-stone-400 focus:outline-none"
            />
            <button
              type="button"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-unla px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-unla/30 transition-all duration-200 hover:bg-unla-dark active:scale-95"
            >
              <Search className="h-4 w-4" /> Buscar
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.15fr]">
          {/* Resultados */}
          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-serif text-lg font-semibold text-stone-900">
                {q ? "Resultados" : "Catálogo"}
              </h2>
              {libros && (
                <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-500">
                  {libros.length} libro(s)
                </span>
              )}
            </div>

            {isLoading && (
              <div className="flex items-center gap-2 text-stone-500">
                <Loader2 className="h-5 w-5 animate-spin" /> Buscando…
              </div>
            )}
            {libros && libros.length === 0 && (
              <p className="rounded-xl border border-dashed border-stone-300 bg-white/60 px-4 py-8 text-center text-sm text-stone-500">
                No encontramos coincidencias. Probá con otro término.
              </p>
            )}

            <div className="max-h-[30rem] space-y-2 overflow-auto pr-1">
              {libros?.map((libro) => {
                const lomo = colorLomo(libro.id);
                return (
                  <div
                    key={libro.id}
                    className="group flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-3 py-3 shadow-sm shadow-stone-900/5 transition-all hover:border-unla/30 hover:shadow-md"
                  >
                    {/* Mini-lomo del libro */}
                    <div
                      className="h-11 w-2.5 shrink-0 rounded-sm shadow-sm ring-1 ring-black/10"
                      style={{ background: lomo.spine }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-serif font-semibold text-stone-900">{libro.titulo}</p>
                      <p className="truncate text-sm text-stone-500">
                        {libro.autor} · {libro.editorial}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {libro.estante_codigo ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                          <MapPin className="h-3.5 w-3.5" /> {libro.estante_codigo}
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">
                          Sin ubicar ⚠️
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mapa (RF-01 / RF-13 / RF-11) */}
          <div>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-serif text-lg font-semibold text-stone-900">Mapa de la sala</h2>
              {zonas.length > 1 && (
                <Select value={zonaId} onChange={(e) => setZonaId(e.target.value)} className="w-44">
                  {zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                </Select>
              )}
            </div>

            {/* Pista: si hay coincidencias en zonas distintas a la mostrada. */}
            {zonasConMatch.length > 0 && !zonasConMatch.some((z) => z.id === zonaId) && (
              <p className="mb-2 rounded-lg bg-unla/10 px-3 py-2 text-xs font-medium text-unla">
                Hay coincidencias en: {zonasConMatch.map((z) => z.nombre).join(", ")}. Cambiá de zona para
                verlas.
              </p>
            )}

            <MapaCanvas
              estantes={estantesZona}
              anotaciones={anotacionesZona}
              modo="ver"
              resaltados={resaltados}
              onSeleccionar={setPopup}
            />
            <p className={cn("mt-2 text-xs", q ? "text-unla" : "text-stone-400")}>
              {q
                ? "Los estantes con brillo dorado contienen tu búsqueda. Tocá uno para ver sus libros."
                : "Tocá un estante para ver qué libros tiene."}
            </p>
          </div>
        </div>
      </div>

      {popup && <EstantePopup estante={popup} onClose={() => setPopup(null)} mostrarPrecio={false} />}
    </div>
  );
}
