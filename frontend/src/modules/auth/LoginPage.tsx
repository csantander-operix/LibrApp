import { useState, type FormEvent } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { BookMarked, Loader2 } from "lucide-react";
import { useAuth } from "./AuthContext";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destino = (location.state as { from?: string } | null)?.from ?? "/admin";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await login(username.trim(), password);
      navigate(destino, { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "No se pudo iniciar sesión");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-unla text-white">
            <BookMarked className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">LibrApp</h1>
          <p className="text-sm text-slate-500">Librería Rodolfo Walsh — Panel de administración</p>
        </div>

        <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="mb-1 block text-sm font-medium text-slate-700">Usuario</label>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
            autoFocus
            required
          />

          <label className="mb-1 mt-4 block text-sm font-medium text-slate-700">Contraseña</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <Button type="submit" className="mt-5 w-full" disabled={enviando}>
            {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
            {enviando ? "Ingresando…" : "Ingresar"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          <Link to="/" className="font-medium text-unla hover:underline">
            Ir a la consulta pública
          </Link>
        </p>
      </div>
    </div>
  );
}
