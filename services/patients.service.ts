import { repositories } from "@/data/factory";
import { httpClient } from "@/data/http/client";
import type {
  Paciente,
  EntradaHistorialClinico,
  Tratamiento,
  CrearEntradaHistorialPayload,
  CrearTratamientoPayload,
} from "@/types";

export interface PagoRecord {
  id: string;
  tratamientoId: string;
  montoMXN: number;
  descuentoMXN: number;
  metodoPago: "EFECTIVO" | "TARJETA" | "TRANSFERENCIA";
  idempotencyKey?: string;
  notas?: string;
  createdAt: string;
}

export interface EstadoCuentaTratamiento {
  tratamientoId: string;
  pacienteId: string;
  costoTotal: number;
  presupuestoAprobado: boolean;
  totalPagado: number;
  totalDescuentos: number;
  saldoPendiente: number;
  pagos: PagoRecord[];
}

export interface RegistrarPagoPayload {
  montoMXN: number;
  descuentoMXN?: number;
  metodoPago: "EFECTIVO" | "TARJETA" | "TRANSFERENCIA";
  idempotencyKey?: string;
  notas?: string;
}

/**
 * Servicio de Pacientes, Historial Médico, Planes de Tratamiento y Pagos / Caja
 */
export const patientsService = {
  listarPacientes(busqueda?: string): Promise<Paciente[]> {
    return repositories.pacientes.listarPacientes(busqueda);
  },

  obtenerPacientePorId(pacienteId: string): Promise<Paciente | null> {
    return repositories.pacientes.obtenerPacientePorId(pacienteId);
  },

  obtenerHistorialClinico(
    pacienteId: string,
  ): Promise<EntradaHistorialClinico[]> {
    return repositories.pacientes.obtenerHistorialClinico(pacienteId);
  },

  agregarEntradaHistorial(
    payload: CrearEntradaHistorialPayload,
  ): Promise<EntradaHistorialClinico> {
    return repositories.pacientes.agregarEntradaHistorial(payload);
  },

  obtenerTratamientosPorPaciente(pacienteId: string): Promise<Tratamiento[]> {
    return repositories.pacientes.obtenerTratamientosPorPaciente(pacienteId);
  },

  crearTratamiento(payload: CrearTratamientoPayload): Promise<Tratamiento> {
    return repositories.pacientes.crearTratamiento(payload);
  },

  actualizarEstadoTratamiento(
    tratamientoId: string,
    estado: Tratamiento["estado"],
    sesionesCompletadas: number,
  ): Promise<Tratamiento> {
    return repositories.pacientes.actualizarEstadoTratamiento(
      tratamientoId,
      estado,
      sesionesCompletadas,
    );
  },

  async obtenerEstadoCuenta(
    tratamientoId: string,
  ): Promise<EstadoCuentaTratamiento> {
    try {
      return await httpClient<EstadoCuentaTratamiento>(
        `/tratamientos/${encodeURIComponent(tratamientoId)}/pagos`,
        {},
      );
    } catch {
      return {
        tratamientoId,
        pacienteId: "",
        costoTotal: 0,
        presupuestoAprobado: false,
        totalPagado: 0,
        totalDescuentos: 0,
        saldoPendiente: 0,
        pagos: [],
      };
    }
  },

  async registrarPago(
    tratamientoId: string,
    payload: RegistrarPagoPayload,
  ): Promise<unknown> {
    return httpClient(
      `/tratamientos/${encodeURIComponent(tratamientoId)}/pagos`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
  },

  async aprobarPresupuesto(tratamientoId: string): Promise<unknown> {
    return httpClient(
      `/tratamientos/${encodeURIComponent(tratamientoId)}/aprobar-presupuesto`,
      {
        method: "POST",
      },
    );
  },
};
