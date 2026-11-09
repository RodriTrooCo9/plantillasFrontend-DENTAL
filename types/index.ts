/**
 * INTERFACES Y TIPOS TYPESCRIPT COMPARTIDOS
 * Punto único de exportación para entidades de dominio, payloads de servicio y DTOs de API.
 */

export type {
  RolUsuario,
  UsuarioAutenticado,
  ServicioClinico,
  BloqueoHorario,
  Dentista,
  EstadoCita,
  Cita,
  EstadoTratamiento,
  Tratamiento,
  EntradaHistorialClinico,
  EstadoDiente,
  SuperficieDental,
  Diente,
  CambioOdontograma,
  Odontograma,
  Paciente,
  TipoAccionChat,
  AccionEstructuradaChat,
  ComponenteembebidoChat,
  RespuestaChat,
  MensajeChat,
  ContextoChat,
} from "@/domain";

export type {
  LoginPayload,
  CrearCitaPayload,
  ReagendarCitaPayload,
  EditarDientePayload,
  CrearEntradaHistorialPayload,
  CrearTratamientoPayload,
  IAuthRepository,
  IPacientesRepository,
  ICitasRepository,
  IOdontogramaRepository,
  IChatRepository,
} from "@/data/repositories";

export type {
  AuthDto,
  UserDto,
  PacienteDto,
  CitaDto,
  HistorialDto,
  TratamientoDto,
  OdontogramaDto,
  ChatDto,
} from "@/data/http/schemas";

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}
