import { repositories } from "@/data/factory";
import type {
  ServicioClinico,
  Dentista,
  BloqueoHorario,
  Cita,
  CrearCitaPayload,
  ReagendarCitaPayload,
} from "@/types";

/**
 * Servicio de Catálogo Clínico, Disponibilidad, Bloqueos y Citas
 */
export const appointmentsService = {
  listarServicios(): Promise<ServicioClinico[]> {
    return repositories.citas.listarServicios();
  },

  listarDentistas(): Promise<Dentista[]> {
    return repositories.citas.listarDentistas();
  },

  listarBloqueosDentista(dentistaId: string): Promise<BloqueoHorario[]> {
    return repositories.citas.listarBloqueosDentista(dentistaId);
  },

  listarCitasPorPaciente(pacienteId: string): Promise<Cita[]> {
    return repositories.citas.listarCitasPorPaciente(pacienteId);
  },

  listarCitasPorDentista(dentistaId: string, fecha?: string): Promise<Cita[]> {
    return repositories.citas.listarCitasPorDentista(dentistaId, fecha);
  },

  obtenerHorariosDisponibles(
    dentistaId: string,
    fecha: string,
    servicioId?: string,
  ): Promise<string[]> {
    return repositories.citas.obtenerHorariosDisponibles(
      dentistaId,
      fecha,
      servicioId,
    );
  },

  agendarCita(payload: CrearCitaPayload): Promise<Cita> {
    return repositories.citas.agendarCita(payload);
  },

  cancelarCita(citaId: string, motivo: string): Promise<Cita> {
    return repositories.citas.cancelarCita(citaId, motivo);
  },

  reagendarCita(payload: ReagendarCitaPayload): Promise<Cita> {
    return repositories.citas.reagendarCita(payload);
  },

  bloquearHorarioDentista(
    dentistaId: string,
    fecha: string,
    horaInicio: string,
    horaFin: string,
    motivo: string,
  ): Promise<BloqueoHorario> {
    return repositories.citas.bloquearHorarioDentista(
      dentistaId,
      fecha,
      horaInicio,
      horaFin,
      motivo,
    );
  },
};
