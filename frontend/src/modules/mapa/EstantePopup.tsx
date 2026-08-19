import { useQuery } from "@tanstack/react-query";
import { Loader2, MapPin } from "lucide-react";
import { Modal } from "@/shared/components/ui/Modal";
import { listarLibros } from "@/modules/catalogo/api";
import type { Estante } from "@/shared/types";

function formatearPrecio(precio: string | null): string {
  if (precio === null) return "—";
  return Number(precio).toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

/** Popup con los libros de un estante (RF-03). Reusable en admin y público. */
export function EstantePopup({
  estante, onClose, mostrarPrecio = true,
}: { estante: Estante; onClose: () => void; mostrarPrecio?: boolean }) {
  const { data: libros, isLoading } = useQuery({
    queryKey: ["libros", { estante_id: estante.id }],
    queryFn: () => listarLibros({ estante_id: estante.id }),
  });

  return (
    <Modal
      abierto
      onClose={onClose}
      ancho="max-w-xl"
      titulo=""
    >
      <div className="-mt-2">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-unla px-3 py-1 text-sm font-semibold text-white">
            <MapPin className="h-4 w-4" /> {estante.codigo}
          </span>
          {estante.etiqueta && <span className="text-sm text-slate-500">{estante.etiqueta}</span>}
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 py-6 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" /> Cargando libros…
          </div>
        )}

        {libros && libros.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">Este estante no tiene libros asignados.</p>
        )}

        {libros && libros.length > 0 && (
          <div className="max-h-96 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2 font-medium">Título</th>
                  <th className="py-2 font-medium">Autor</th>
                  {mostrarPrecio && <th className="py-2 text-right font-medium">Precio</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {libros.map((l) => (
                  <tr key={l.id}>
                    <td className="py-2 pr-2 font-medium text-slate-800">{l.titulo}</td>
                    <td className="py-2 pr-2 text-slate-500">{l.autor}</td>
                    {mostrarPrecio && (
                      <td className="py-2 text-right tabular-nums text-slate-600">{formatearPrecio(l.precio)}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}
