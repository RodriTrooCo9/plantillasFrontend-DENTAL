import type {
  Paciente,
  Cita,
  Odontograma,
  Tratamiento,
  EntradaHistorialClinico,
  RespuestaChat,
  UsuarioAutenticado,
} from "@/domain";
import type {
  AuthDto,
  UserDto,
  PacienteDto,
  CitaDto,
  OdontogramaDto,
  TratamientoDto,
  HistorialDto,
  ChatDto,
} from "./schemas";
export type { PacienteDto, CitaDto } from "./schemas";
export function mapUserDtoToDomain(dto: UserDto): UsuarioAutenticado {
  return {
    id: dto.id,
    email: dto.email,
    nombreCompleto: dto.nombre_completo,
    rol: dto.rol,
    pacienteId: dto.paciente_id ?? undefined,
    dentistaId: dto.dentista_id ?? undefined,
  };
}
export function mapAuthDtoToDomain(dto: AuthDto): UsuarioAutenticado {
  return mapUserDtoToDomain(dto.user);
}
export function mapPacienteDtoToDomain(dto: PacienteDto): Paciente {
  return {
    id: dto.id,
    codigoExpediente: dto.codigo_expediente,
    nombreCompleto: dto.nombre_completo,
    email: dto.email,
    telefono: dto.telefono,
    fechaNacimiento: dto.fecha_nacimiento,
    edad: dto.edad,
    tipoSangre: dto.grupo_sanguineo,
    alergias: dto.alergias,
    alertasMedicas: [...dto.condiciones_medicas, ...dto.alertas_clinicas].join(
      "\n",
    ),
    dentistaAsignadoId: dto.odontologo_cabecera_id,
    dentistaAsignadoNombre: dto.odontologo_cabecera_nombre,
  };
}
export function mapCitaDtoToDomain(dto: CitaDto): Cita {
  return {
    id: dto.id,
    pacienteId: dto.pacienteId,
    pacienteNombre: dto.pacienteNombre,
    dentistaId: dto.dentistaId,
    dentistaNombre: dto.dentistaNombre,
    servicioId: dto.servicioId,
    servicioNombre: dto.servicioNombre,
    tratamientoId: dto.tratamientoId ?? undefined,
    fecha: dto.fecha,
    hora: dto.horaInicio,
    estado: dto.estado,
    motivoConsulta: dto.motivo,
    costoMXN: dto.costoMXN,
    estadoNotificacion: dto.estadoNotificacion,
  };
}
export function mapOdontogramaDtoToDomain(dto: OdontogramaDto): Odontograma {
  return {
    pacienteId: dto.pacienteId,
    actualizadoEn: dto.actualizadoEn,
    dientes: dto.dientes,
    historialCambios: dto.historial_cambios,
  };
}
export function mapTratamientoDtoToDomain(dto: TratamientoDto): Tratamiento {
  const { costoTotal, dientesInvolucrados, ...rest } = dto;
  return {
    ...rest,
    costoTotalMXN: costoTotal,
    dientesFDI: dientesInvolucrados,
  };
}
export function mapHistorialDtoToDomain(
  dto: HistorialDto,
): EntradaHistorialClinico {
  const { notasEvolucion, ...rest } = dto;
  return { ...rest, notasClinicas: notasEvolucion };
}
export function mapChatDtoToDomain(dto: ChatDto): RespuestaChat {
  const a = dto.accion_ejecutada;
  return {
    texto: dto.mensaje,
    componentes: dto.tarjetas.map((t) => {
      switch (t.tipo) {
        case "TARJETA_CITAS":
          return { tipo: t.tipo, datos: t.datos.map(mapCitaDtoToDomain) };
        case "MINI_ODONTOGRAMA":
          return {
            tipo: t.tipo,
            datos: mapOdontogramaDtoToDomain(t.datos).dientes,
          };
        case "RESUMEN_TRATAMIENTOS":
          return {
            tipo: t.tipo,
            datos: t.datos.map(mapTratamientoDtoToDomain),
          };
        case "TABLA_SERVICIOS":
          return { tipo: t.tipo, datos: t.datos };
      }
    }),
    acciones:
      a.tipo === "NINGUNA"
        ? []
        : [
            {
              id: a.payload_confirmacion?.id ?? a.tipo,
              tipo: a.tipo,
              etiqueta: a.descripcion,
              requiereConfirmacion: a.requiere_confirmacion,
              confirmada: !a.requiere_confirmacion,
              payload: a.payload_confirmacion
                ? { confirmarAccion: a.payload_confirmacion }
                : {},
            },
          ],
  };
}
