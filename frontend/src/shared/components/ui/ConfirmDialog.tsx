import type { ReactNode } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";

interface ConfirmDialogProps {
  abierto: boolean;
  onClose: () => void;
  onConfirm: () => void;
  titulo: string;
  mensaje: ReactNode;
  textoConfirmar?: string;
  textoCancelar?: string;
  cargando?: boolean;
}

export function ConfirmDialog({
  abierto,
  onClose,
  onConfirm,
  titulo,
  mensaje,
  textoConfirmar = "Eliminar",
  textoCancelar = "Cancelar",
  cargando = false,
}: ConfirmDialogProps) {
  return (
    <Modal abierto={abierto} onClose={onClose} titulo={titulo} ancho="max-w-md">
      <div className="flex gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="text-sm text-stone-600">{mensaje}</div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={cargando}>
          {textoCancelar}
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={cargando}>
          {cargando && <Loader2 className="h-4 w-4 animate-spin" />}
          {textoConfirmar}
        </Button>
      </div>
    </Modal>
  );
}
