import { repositories } from "@/data/factory";
import type {
  Paciente,
  EntradaHistorialClinico,
  Tratamiento,
  CrearEntradaHistorialPayload,
  CrearTratamientoPayload,
} from "@/types";

/**
 * Servicio de Pacientes, Historial Médico y Planes de Tratamiento
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
};
