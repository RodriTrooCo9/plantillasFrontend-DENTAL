import {
  UsuarioAutenticado,
  Paciente,
  Dentista,
  ServicioClinico,
  Cita,
  Tratamiento,
  EntradaHistorialClinico,
  Odontograma,
  EstadoDiente,
  SuperficieDental,
  BloqueoHorario,
  RespuestaChat,
  ContextoChat,
} from "@/domain";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface CrearCitaPayload {
  pacienteId: string;
  dentistaId: string;
  servicioId: string;
  tratamientoId?: string;
  fecha: string;
  hora: string;
  motivoConsulta: string;
}

export interface ReagendarCitaPayload {
  citaId: string;
  nuevaFecha: string;
  nuevaHora: string;
  motivo?: string;
}

export interface EditarDientePayload {
  pacienteId: string;
  numeroFDI: number;
  superficie: SuperficieDental | "GENERAL";
  nuevoEstado: EstadoDiente;
  procedimiento: string;
  nota: string;
  autorNombre: string;
  autorId?: string;
}

export interface CrearEntradaHistorialPayload {
  pacienteId: string;
  dentistaId: string;
  dentistaNombre: string;
  tipo: EntradaHistorialClinico["tipo"];
  diagnostico: string;
  procedimientoRealizado: string;
  notasClinicas: string;
}

export interface CrearTratamientoPayload {
  pacienteId: string;
  dentistaId: string;
  servicioId: string;
  nombre: string;
  sesionesTotales: number;
  costoTotalMXN: number;
  dientesFDI: number[];
  proximaFechaSugerida: string;
  notasEvolucion: string;
}

export interface IAuthRepository {
  login(payload: LoginPayload): Promise<UsuarioAutenticado>;
  getSession(): Promise<UsuarioAutenticado | null>;
  recoverPassword(email: string): Promise<{ mensaje: string }>;
  refreshToken(refreshToken?: string): Promise<UsuarioAutenticado>;
  logout(): Promise<void>;
}

export interface IPacientesRepository {
  listarPacientes(busqueda?: string): Promise<Paciente[]>;
  obtenerPacientePorId(pacienteId: string): Promise<Paciente | null>;
  obtenerHistorialClinico(
    pacienteId: string,
  ): Promise<EntradaHistorialClinico[]>;
  agregarEntradaHistorial(
    payload: CrearEntradaHistorialPayload,
  ): Promise<EntradaHistorialClinico>;
  obtenerTratamientosPorPaciente(pacienteId: string): Promise<Tratamiento[]>;
  crearTratamiento(payload: CrearTratamientoPayload): Promise<Tratamiento>;
  actualizarEstadoTratamiento(
    tratamientoId: string,
    estado: Tratamiento["estado"],
    sesionesCompletadas: number,
  ): Promise<Tratamiento>;
}

export interface ICitasRepository {
  listarServicios(): Promise<ServicioClinico[]>;
  listarDentistas(): Promise<Dentista[]>;
  listarBloqueosDentista(dentistaId: string): Promise<BloqueoHorario[]>;
  listarCitasPorPaciente(pacienteId: string): Promise<Cita[]>;
  listarCitasPorDentista(dentistaId: string, fecha?: string): Promise<Cita[]>;
  obtenerHorariosDisponibles(
    dentistaId: string,
    fecha: string,
    servicioId?: string,
  ): Promise<string[]>;
  agendarCita(payload: CrearCitaPayload): Promise<Cita>;
  cancelarCita(citaId: string, motivo: string): Promise<Cita>;
  reagendarCita(payload: ReagendarCitaPayload): Promise<Cita>;
  bloquearHorarioDentista(
    dentistaId: string,
    fecha: string,
    horaInicio: string,
    horaFin: string,
    motivo: string,
  ): Promise<BloqueoHorario>;
}

export interface IOdontogramaRepository {
  obtenerOdontograma(pacienteId: string): Promise<Odontograma>;
  registrarCambioDiente(payload: EditarDientePayload): Promise<Odontograma>;
}

export interface IChatRepository {
  sendMessage(
    mensaje: string,
    contexto: ContextoChat,
    confirmarAccion?: { id: string; token: string },
  ): Promise<RespuestaChat>;
}
