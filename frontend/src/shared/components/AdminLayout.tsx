import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, BookOpen, Map, LibrarySquare, Upload, LogOut, BookMarked } from "lucide-react";
import { useAuth } from "@/modules/auth/AuthContext";
import { cn } from "@/lib/utils";

// Navegación del panel.
const nav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, enabled: true, end: true },
  { to: "/admin/catalogo", label: "Catálogo", icon: BookOpen, enabled: true },
  { to: "/admin/estantes", label: "Estantes", icon: LibrarySquare, enabled: true },
  { to: "/admin/mapa", label: "Mapa", icon: Map, enabled: true },
  { to: "/admin/importar", label: "Importar", icon: Upload, enabled: true },
];

export function AdminLayout() {
  const { usuario, logout } = useAuth();

  return (
    <div className="flex min-h-full">
      <aside className="flex w-60 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-unla text-white">
            <BookMarked className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight text-slate-900">LibrApp</p>
            <p className="text-xs text-slate-500">Rodolfo Walsh</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {nav.map(({ to, label, icon: Icon, enabled, end }) =>
            enabled ? (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                    isActive ? "bg-unla/10 text-unla" : "text-slate-600 hover:bg-slate-100",
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ) : (
              <span
                key={to}
                title="Disponible en próximas entregas"
                className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300"
              >
                <Icon className="h-4 w-4" />
                {label}
              </span>
            ),
          )}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <div className="mb-2 px-3">
            <p className="text-sm font-medium text-slate-700">{usuario?.nombre ?? usuario?.username}</p>
            <p className="text-xs text-slate-400">{usuario?.rol}</p>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
