/**
 * CAPA DE DOMINIO PURA (Frontend Desacoplado)
 * Ningún componente visual ni hook conoce DTOs crudos de NestJS.
 * Toda la aplicación opera exclusivamente sobre estas entidades de dominio.
 */

export type RolUsuario = "PACIENTE" | "DENTISTA";

export interface UsuarioAutenticado {
  id: string;
  email: string;
  nombreCompleto: string;
  rol: RolUsuario;
  pacienteId?: string;
  dentistaId?: string;
}

export interface ServicioClinico {
  id: string;
  codigo: string;
  nombre: string;
  categoria:
    | "Prevención"
    | "Ortodoncia"
    | "Estética"
    | "Endodoncia"
    | "Implantología"
    | "Odontopediatría";
  descripcionCorta: string;
  protocoloClinico: string;
  beneficioMedible: string;
  precioBaseMXN: number;
  duracionMinutos: number;
  garantiaAnios: number;
}

export interface BloqueoHorario {
  id: string;
  dentistaId: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  motivo: string;
}

export interface Dentista {
  id: string;
  nombreCompleto: string;
  email: string;
  cedulaProfesional: string;
  especialidad: string;
  biografiaCorta: string;
  diasAtencion: string[];
  horariosDisponibles: string[];
  bloqueos: BloqueoHorario[];
}

export type EstadoCita =
  "CONFIRMADA" | "EN_SALA" | "COMPLETADA" | "CANCELADA" | "REPROGRAMADA";

export interface Cita {
  id: string;
  pacienteId: string;
  pacienteNombre: string;
  dentistaId: string;
  dentistaNombre: string;
  servicioId: string;
  servicioNombre: string;
  tratamientoId?: string;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:mm
  estado: EstadoCita;
  motivoConsulta: string;
  costoMXN: number;
  estadoNotificacion?: "solicitada" | "pendiente" | "enviada";
}

export type EstadoTratamiento = "PLANIFICADO" | "EN_CURSO" | "FINALIZADO";

export interface Tratamiento {
  id: string;
  pacienteId: string;
  dentistaId: string;
  dentistaNombre: string;
  servicioId: string;
  nombre: string;
  estado: EstadoTratamiento;
  fechaInicio: string;
  progresoPorcentaje: number;
  sesionesCompletadas: number;
  sesionesTotales: number;
  costoTotalMXN: number;
  dientesFDI: number[];
  proximaFechaSugerida: string;
  notasEvolucion: string;
}

export interface EntradaHistorialClinico {
  id: string;
  pacienteId: string;
  fecha: string;
  dentistaId: string;
  dentistaNombre: string;
  tipo: "CONSULTA" | "DIAGNOSTICO" | "PROCEDIMIENTO" | "CONTROL_PERIODONTAL";
  diagnostico: string;
  procedimientoRealizado: string;
  notasClinicas: string;
}

export type EstadoDiente =
  | "SANO"
  | "CARIES"
  | "OBTURADO"
  | "ENDODONCIA"
  | "CORONA"
  | "AUSENTE"
  | "IMPLANTE";

export type SuperficieDental =
  "oclusal" | "vestibular" | "lingual" | "mesial" | "distal";

export interface Diente {
  numeroFDI: number; // 11-18, 21-28, 31-38, 41-48 (32 dientes)
  nombreAnatomico: string;
  cuadrante: 1 | 2 | 3 | 4;
  estadoGeneral: EstadoDiente;
  superficies: Record<SuperficieDental, EstadoDiente>;
  ultimaActualizacion: string;
  notaClinica: string;
}

export interface CambioOdontograma {
  id: string;
  pacienteId: string;
  numeroFDI: number;
  superficie?: SuperficieDental | "GENERAL";
  estadoAnterior: EstadoDiente;
  estadoNuevo: EstadoDiente;
  procedimiento: string;
  nota: string;
  autorNombre: string;
  autorRol: RolUsuario;
  fechaHora: string;
}

export interface Odontograma {
  pacienteId: string;
  actualizadoEn: string;
  dientes: Diente[]; // Los 32 dientes FDI
  historialCambios: CambioOdontograma[];
}

export interface Paciente {
  id: string;
  codigoExpediente: string;
  nombreCompleto: string;
  email: string;
  telefono: string;
  fechaNacimiento: string;
  edad: number;
  tipoSangre: string;
  alergias: string[];
  alertasMedicas: string;
  dentistaAsignadoId: string;
  dentistaAsignadoNombre: string;
}

export type TipoAccionChat =
  | "MOSTRAR_SERVICIOS"
  | "MOSTRAR_CITAS"
  | "AGENDAR_CITA"
  | "CANCELAR_CITA"
  | "REAGENDAR_CITA"
  | "CONTINUAR_TRATAMIENTO"
  | "ABRIR_ODONTOGRAMA"
  | "MODIFICAR_ODONTOGRAMA"
  | "IR_A_LOGIN";

export interface AccionEstructuradaChat {
  id: string;
  tipo: TipoAccionChat;
  etiqueta: string;
  requiereConfirmacion: boolean;
  confirmada?: boolean;
  estado?: "pendiente" | "completada" | "fallida";
  error?: string;
  payload: Record<string, unknown>;
}

export interface ComponenteembebidoChat {
  tipo:
    | "TARJETA_CITAS"
    | "MINI_ODONTOGRAMA"
    | "RESUMEN_TRATAMIENTOS"
    | "TABLA_SERVICIOS";
  datos: unknown;
}

export interface RespuestaChat {
  texto: string;
  acciones?: AccionEstructuradaChat[];
  componentes?: ComponenteembebidoChat[];
}

export interface MensajeChat {
  id: string;
  emisor: "USUARIO" | "ASISTENTE";
  texto: string;
  fechaHora: string;
  acciones?: AccionEstructuradaChat[];
  componentes?: ComponenteembebidoChat[];
}

export interface ContextoChat {
  rolActual: RolUsuario | "VISITANTE";
  pacienteActivoId?: string;
  dentistaActivoId?: string;
}
