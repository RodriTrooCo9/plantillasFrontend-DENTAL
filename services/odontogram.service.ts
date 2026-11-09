import { repositories } from "@/data/factory";
import type { Odontograma, EditarDientePayload } from "@/types";

/**
 * Servicio de Odontograma Digital FDI (32 piezas y auditoría clínica)
 */
export const odontogramService = {
  obtenerOdontograma(pacienteId: string): Promise<Odontograma> {
    return repositories.odontograma.obtenerOdontograma(pacienteId);
  },

  registrarCambioDiente(payload: EditarDientePayload): Promise<Odontograma> {
    return repositories.odontograma.registrarCambioDiente(payload);
  },
};
