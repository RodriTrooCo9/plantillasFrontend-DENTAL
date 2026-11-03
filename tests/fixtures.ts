import { generar32DientesConOverrides } from "../data/mock/seed";
export const patientUser = {
  id: "u-p",
  email: "ana@example.com",
  nombre_completo: "Ana Prueba",
  rol: "PACIENTE" as const,
  paciente_id: "p-a",
};
export const doctorUser = {
  id: "u-d",
  email: "doctor@example.com",
  nombre_completo: "Doctor Prueba",
  rol: "DENTISTA" as const,
  dentista_id: "d-a",
};
export const authDto = {
  access_token: "access-a",
  refresh_token: "secret-refresh",
  expires_in: 3600,
  user: patientUser,
};
export const pacienteDto = {
  id: "p-a",
  documento: "123456",
  codigo_expediente: "EXP-A",
  nombre_completo: "Ana Prueba",
  email: "ana@example.com",
  telefono: "555123456",
  fecha_nacimiento: "1990-01-02",
  edad: 36,
  grupo_sanguineo: "O+",
  alergias: ["Látex"],
  condiciones_medicas: ["Condición sintética"],
  alertas_clinicas: ["Alerta sintética"],
  fecha_registro: "2026-01-01",
  odontologo_cabecera_id: "d-a",
  odontologo_cabecera_nombre: "Doctor Prueba",
};
export const citaDto = {
  id: "c-a",
  pacienteId: "p-a",
  pacienteNombre: "Ana Prueba",
  dentistaId: "d-a",
  dentistaNombre: "Doctor Prueba",
  servicioId: "s-a",
  servicioNombre: "Consulta",
  fecha: "2026-12-01",
  horaInicio: "09:00",
  estado: "CONFIRMADA" as const,
  motivo: "Revisión",
  costoMXN: 500,
  estadoNotificacion: "pendiente" as const,
};
export const historialDto = {
  id: "h-a",
  pacienteId: "p-a",
  fecha: "2026-11-03",
  dentistaId: "d-a",
  dentistaNombre: "Doctor Prueba",
  tipo: "CONSULTA" as const,
  diagnostico: "Diagnóstico sintético",
  procedimientoRealizado: "Revisión sintética",
  notasEvolucion: "Evolución sintética",
};
export const tratamientoDto = {
  id: "t-a",
  pacienteId: "p-a",
  dentistaId: "d-a",
  dentistaNombre: "Doctor Prueba",
  servicioId: "s-a",
  nombre: "Plan sintético",
  estado: "PLANIFICADO" as const,
  fechaInicio: "2026-11-03",
  progresoPorcentaje: 0,
  sesionesCompletadas: 0,
  sesionesTotales: 3,
  costoTotal: 1500,
  dientesInvolucrados: [16, 26],
  proximaFechaSugerida: "2026-12-01",
  notasEvolucion: "Nota sintética",
};
export const servicioDto = {
  id: "s-a",
  codigo: "CON-1",
  nombre: "Consulta",
  categoria: "Prevención" as const,
  descripcionCorta: "Revisión",
  protocoloClinico: "Revisión",
  beneficioMedible: "Prevención",
  precioBaseMXN: 500,
  duracionMinutos: 60,
  garantiaAnios: 0,
};
export const bloqueoDto = {
  id: "b-a",
  dentistaId: "d-a",
  fecha: "2026-12-01",
  horaInicio: "12:00",
  horaFin: "13:00",
  motivo: "No disponible",
};
export const dentistaDto = {
  id: "d-a",
  nombreCompleto: "Doctor Prueba",
  email: "doctor@example.com",
  cedulaProfesional: "123",
  especialidad: "General",
  biografiaCorta: "Profesional",
  diasAtencion: ["Lunes"],
  horariosDisponibles: ["09:00"],
  bloqueos: [],
};
export const odontogramaDto = {
  pacienteId: "p-a",
  actualizadoEn: "2026-11-03",
  dientes: generar32DientesConOverrides({}),
  historial_cambios: [],
};
export const chatDto = {
  mensaje: "Confirma la cancelación.",
  tarjetas: [{ tipo: "TARJETA_CITAS" as const, datos: [citaDto] }],
  sugerencias: [],
  accion_ejecutada: {
    tipo: "CANCELAR_CITA" as const,
    descripcion: "Cancelar cita",
    requiere_confirmacion: true,
    payload_confirmacion: { id: "proposal-a", token: "opaque-a" },
  },
};
