import { useQuery } from "@tanstack/react-query";
import { BookOpen, Map, Library, MapPinOff, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Card } from "@/shared/components/ui/Card";
import type { DashboardStats } from "@/shared/types";

async function fetchStats(): Promise<DashboardStats> {
  const { data } = await api.get<DashboardStats>("/dashboard");
  return data;
}

const kpis = [
  { key: "total_libros", label: "Libros en catálogo", icon: BookOpen, color: "text-unla", bg: "bg-unla/10" },
  { key: "total_estantes", label: "Estantes", icon: Map, color: "text-amber-700", bg: "bg-amber-100" },
  { key: "total_colecciones", label: "Colecciones", icon: Library, color: "text-emerald-700", bg: "bg-emerald-100" },
  { key: "libros_sin_ubicar", label: "Sin ubicar", icon: MapPinOff, color: "text-oro", bg: "bg-amber-100" },
] as const;

export function DashboardPage() {
  const { data, isLoading, isError } = useQuery({ queryKey: ["dashboard"], queryFn: fetchStats });

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-serif text-3xl font-bold text-stone-900">Dashboard</h1>
        <p className="text-sm text-stone-500">Resumen del catálogo de la Librería Rodolfo Walsh.</p>
      </header>

      {isLoading && (
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" /> Cargando indicadores…
        </div>
      )}

      {isError && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          No se pudieron cargar los indicadores.
        </p>
      )}

      {data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map(({ key, label, icon: Icon, color, bg }) => (
            <Card key={key} className="flex items-center gap-4 hover:shadow-md">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${bg} ${color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="font-serif text-3xl font-bold text-stone-900">{data[key]}</p>
                <p className="text-sm text-stone-500">{label}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-6">
        <h2 className="font-serif text-base font-semibold text-stone-800">Funcionalidades disponibles</h2>
        <p className="mt-1 text-sm text-stone-500">
          Catálogo con ABM de libros (RF-04/RF-09), gestión de estantes (RF-02),
          importación desde Excel/CSV (RF-05), mapa interactivo con editor drag &amp; drop
          (RF-01/RF-10) y vista pública de autoconsulta con resaltado en el plano (RF-07/RF-13).
        </p>
      </Card>
    </div>
  );
}
