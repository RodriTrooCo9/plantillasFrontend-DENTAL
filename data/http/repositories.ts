import type {
  IAuthRepository,
  IPacientesRepository,
  ICitasRepository,
  IOdontogramaRepository,
  IChatRepository,
  LoginPayload,
  CrearCitaPayload,
  ReagendarCitaPayload,
  EditarDientePayload,
  CrearEntradaHistorialPayload,
  CrearTratamientoPayload,
} from "@/data/repositories";
import type { Tratamiento, ContextoChat } from "@/domain";
import { z } from "zod";
import {
  httpClient,
  HttpApiError,
  setHttpTokens,
  refreshHttpSession,
} from "./client";
import {
  authSchema,
  userSchema,
  recoverySchema,
  pacienteSchema,
  citaSchema,
  historialSchema,
  tratamientoSchema,
  servicioSchema,
  dentistaSchema,
  disponibilidadSchema,
  bloqueoSchema,
  odontogramaSchema,
  chatSchema,
} from "./schemas";
import {
  mapAuthDtoToDomain,
  mapUserDtoToDomain,
  mapPacienteDtoToDomain,
  mapCitaDtoToDomain,
  mapHistorialDtoToDomain,
  mapTratamientoDtoToDomain,
  mapOdontogramaDtoToDomain,
  mapChatDtoToDomain,
} from "./mappers";
const segment = (value: string) => encodeURIComponent(value);
async function clinicalAuthor() {
  const user = await httpClient("/auth/me", {}, userSchema);
  if (user.rol !== "DENTISTA")
    throw new HttpApiError(
      403,
      "Solo un dentista puede registrar cambios clínicos.",
    );
  return user;
}
const json = (method: string, value: unknown): RequestInit => ({
  method,
  body: JSON.stringify(value),
});
export class HttpAuthRepository implements IAuthRepository {
  async login(payload: LoginPayload) {
    const dto = await httpClient(
      "/auth/login",
      json("POST", payload),
      authSchema,
    );
    setHttpTokens(dto.access_token);
    return mapAuthDtoToDomain(dto);
  }
  async getSession() {
    try {
      const dto = await httpClient("/auth/me", {}, userSchema);
      const refreshed = await refreshHttpSession();
      if (dto.id !== refreshed.user.id || dto.rol !== refreshed.user.rol) {
        setHttpTokens(null);
        throw new HttpApiError(
          401,
          "La sesión cambió. Inicia sesión nuevamente.",
        );
      }
      return mapAuthDtoToDomain(refreshed);
    } catch (e) {
      if (e instanceof HttpApiError && e.status === 401) return null;
      throw e;
    }
  }
  async recoverPassword(email: string) {
    const dto = await httpClient(
      "/auth/forgot-password",
      json("POST", { email }),
      recoverySchema,
    );
    return { mensaje: dto.message };
  }
  async refreshToken() {
    return mapAuthDtoToDomain(await refreshHttpSession());
  }
  async logout() {
    try {
      await httpClient(
        "/auth/logout",
        { method: "POST" },
        z.union([z.object({ ok: z.literal(true) }), z.undefined()]),
      );
    } finally {
      setHttpTokens(null);
    }
  }
}
export class HttpPacientesRepository implements IPacientesRepository {
  async listarPacientes(busqueda?: string) {
    return (
      await httpClient(
        `/pacientes${busqueda ? `?q=${encodeURIComponent(busqueda)}` : ""}`,
        {},
        z.array(pacienteSchema),
      )
    ).map(mapPacienteDtoToDomain);
  }
  async obtenerPacientePorId(id: string) {
    return mapPacienteDtoToDomain(
      await httpClient(`/pacientes/${segment(id)}`, {}, pacienteSchema),
    );
  }
  async obtenerHistorialClinico(id: string) {
    return (
      await httpClient(
        `/pacientes/${segment(id)}/historial`,
        {},
        z.array(historialSchema),
      )
    ).map(mapHistorialDtoToDomain);
  }
  async agregarEntradaHistorial(p: CrearEntradaHistorialPayload) {
    const user = await clinicalAuthor();
    return mapHistorialDtoToDomain(
      await httpClient(
        `/pacientes/${segment(p.pacienteId)}/historial`,
        json("POST", {
          tipo: p.tipo,
          diagnostico: p.diagnostico,
          procedimientoRealizado: p.procedimientoRealizado,
          notasEvolucion: p.notasClinicas,
          dentistaId: user.dentista_id,
          dentistaNombre: user.nombre_completo,
        }),
        historialSchema,
      ),
    );
  }
  async obtenerTratamientosPorPaciente(id: string) {
    return (
      await httpClient(
        `/pacientes/${segment(id)}/tratamientos`,
        {},
        z.array(tratamientoSchema),
      )
    ).map(mapTratamientoDtoToDomain);
  }
  async crearTratamiento(p: CrearTratamientoPayload) {
    const user = await clinicalAuthor();
    return mapTratamientoDtoToDomain(
      await httpClient(
        `/pacientes/${segment(p.pacienteId)}/tratamientos`,
        json("POST", {
          servicioId: p.servicioId,
          nombre: p.nombre,
          dentistaId: user.dentista_id,
          dentistaNombre: user.nombre_completo,
          costoTotal: p.costoTotalMXN,
          sesionesTotales: p.sesionesTotales,
          dientesInvolucrados: p.dientesFDI,
          proximaFechaSugerida: p.proximaFechaSugerida,
          notasEvolucion: p.notasEvolucion,
        }),
        tratamientoSchema,
      ),
    );
  }
  async actualizarEstadoTratamiento(
    id: string,
    estado: Tratamiento["estado"],
    sesionesCompletadas: number,
  ) {
    return mapTratamientoDtoToDomain(
      await httpClient(
        `/tratamientos/${segment(id)}`,
        json("PATCH", { estado, sesionesCompletadas }),
        tratamientoSchema,
      ),
    );
  }
}
export class HttpCitasRepository implements ICitasRepository {
  listarServicios() {
    return httpClient("/servicios", {}, z.array(servicioSchema));
  }
  listarDentistas() {
    return httpClient("/dentistas", {}, z.array(dentistaSchema));
  }
  listarBloqueosDentista(id: string) {
    return httpClient(
      `/dentistas/${segment(id)}/bloqueos`,
      {},
      z.array(bloqueoSchema),
    );
  }
  async listarCitasPorPaciente(id: string) {
    return (
      await httpClient(
        `/citas?${new URLSearchParams({ pacienteId: id })}`,
        {},
        z.array(citaSchema),
      )
    ).map(mapCitaDtoToDomain);
  }
  async listarCitasPorDentista(id: string, fecha?: string) {
    const q = new URLSearchParams({ dentistaId: id });
    if (fecha) q.set("fecha", fecha);
    return (await httpClient(`/citas?${q}`, {}, z.array(citaSchema))).map(
      mapCitaDtoToDomain,
    );
  }
  async obtenerHorariosDisponibles(
    id: string,
    fecha: string,
    servicioId?: string,
  ) {
    return (
      await httpClient(
        `/dentistas/${segment(id)}/disponibilidad?${new URLSearchParams({ fecha, ...(servicioId ? { servicioId } : {}) })}`,
        {},
        disponibilidadSchema,
      )
    )
      .filter((h) => h.disponible)
      .map((h) => h.hora);
  }
  async agendarCita(p: CrearCitaPayload) {
    return mapCitaDtoToDomain(
      await httpClient(
        "/citas",
        json("POST", {
          pacienteId: p.pacienteId,
          dentistaId: p.dentistaId,
          servicioId: p.servicioId,
          tratamientoId: p.tratamientoId,
          fecha: p.fecha,
          horaInicio: p.hora,
          motivo: p.motivoConsulta,
        }),
        citaSchema,
      ),
    );
  }
  async cancelarCita(id: string, motivo: string) {
    return mapCitaDtoToDomain(
      await httpClient(
        `/citas/${segment(id)}/cancelar`,
        json("POST", { motivoCancelacion: motivo }),
        citaSchema,
      ),
    );
  }
  async reagendarCita(p: ReagendarCitaPayload) {
    return mapCitaDtoToDomain(
      await httpClient(
        `/citas/${segment(p.citaId)}/reagendar`,
        json("PATCH", {
          nuevaFecha: p.nuevaFecha,
          nuevaHoraInicio: p.nuevaHora,
          notificarPaciente: true,
        }),
        citaSchema,
      ),
    );
  }
  bloquearHorarioDentista(
    id: string,
    fecha: string,
    horaInicio: string,
    horaFin: string,
    motivo: string,
  ) {
    return httpClient(
      `/dentistas/${segment(id)}/bloqueos`,
      json("POST", { fecha, horaInicio, horaFin, motivo }),
      bloqueoSchema,
    );
  }
}
export class HttpOdontogramaRepository implements IOdontogramaRepository {
  async obtenerOdontograma(id: string) {
    return mapOdontogramaDtoToDomain(
      await httpClient(`/odontogramas/${segment(id)}`, {}, odontogramaSchema),
    );
  }
  async registrarCambioDiente(p: EditarDientePayload) {
    const user = await clinicalAuthor();
    return mapOdontogramaDtoToDomain(
      await httpClient(
        `/odontogramas/${segment(p.pacienteId)}/dientes/${p.numeroFDI}`,
        json("PATCH", {
          superficie: p.superficie,
          estadoNuevo: p.nuevoEstado,
          procedimiento: p.procedimiento,
          nota: p.nota,
          dentistaId: user.dentista_id,
          dentistaNombre: user.nombre_completo,
        }),
        odontogramaSchema,
      ),
    );
  }
}
export class HttpChatRepository implements IChatRepository {
  async sendMessage(
    mensaje: string,
    c: ContextoChat,
    confirmarAccion?: { id: string; token: string },
  ) {
    return mapChatDtoToDomain(
      await httpClient(
        "/chat",
        json("POST", {
          mensaje,
          rol: c.rolActual,
          pacienteId: c.pacienteActivoId ?? null,
          dentistaId: c.dentistaActivoId ?? null,
          confirmarAccion: confirmarAccion ?? null,
        }),
        chatSchema,
      ),
    );
  }
}
