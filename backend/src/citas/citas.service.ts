import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { randomUUID } from "node:crypto";
import {
  clinicInstant,
  dayNameInSpanish,
  isOfficialHoliday,
  minutes,
  overlaps,
} from "../common/clinical-time";
import type { UserResponseDto } from "../auth/dto/auth.dto";
import type {
  CancelCitaDto,
  CreateBloqueoDto,
  CreateCitaDto,
  ReagendarCitaDto,
} from "./dto/citas.dto";
import type { Cita } from "@prisma/client";

@Injectable()
export class CitasService {
  private bookingLockChain: Promise<unknown> = Promise.resolve();

  constructor(private readonly prisma: PrismaService) {}

  private withBookingLock<T>(task: () => Promise<T>): Promise<T> {
    const next = this.bookingLockChain.then(task, task);
    this.bookingLockChain = next.catch(() => undefined);
    return next;
  }

  mapCita(c: Cita) {
    return {
      id: c.id,
      pacienteId: c.pacienteId,
      pacienteNombre: c.pacienteNombre,
      dentistaId: c.dentistaId,
      dentistaNombre: c.dentistaNombre,
      servicioId: c.servicioId,
      servicioNombre: c.servicioNombre,
      tratamientoId: c.tratamientoId ?? null,
      fecha: c.fecha,
      horaInicio: c.horaInicio,
      estado: c.estado,
      motivo: c.motivo,
      costoMXN: c.costoMXN,
      ...(c.estadoNotificacion
        ? { estadoNotificacion: c.estadoNotificacion }
        : {}),
    };
  }

  async listarServicios() {
    return this.prisma.servicio.findMany({
      orderBy: { codigo: "asc" },
    });
  }

  async listarDentistasPublico() {
    const dentistas = await this.prisma.dentista.findMany({
      orderBy: { id: "asc" },
    });
    return dentistas.map((d) => ({
      id: d.id,
      nombreCompleto: d.nombreCompleto,
      email: d.email,
      cedulaProfesional: d.cedulaProfesional,
      especialidad: d.especialidad,
      biografiaCorta: d.biografiaCorta,
      diasAtencion: d.diasAtencion,
      horariosDisponibles: d.horariosDisponibles,
      bloqueos: [],
    }));
  }

  async listarBloqueosDentista(user: UserResponseDto, dentistaId: string) {
    if (user.rol !== "DENTISTA" || user.dentista_id !== dentistaId) {
      throw new ForbiddenException(
        "Solo el dentista titular puede consultar sus bloqueos de agenda.",
      );
    }
    const dentista = await this.prisma.dentista.findUnique({
      where: { id: dentistaId },
    });
    if (!dentista) {
      throw new NotFoundException("Especialista inexistente.");
    }
    return this.prisma.bloqueoDentista.findMany({
      where: { dentistaId },
      orderBy: [{ fecha: "asc" }, { horaInicio: "asc" }],
    });
  }

  private async evaluateSlotAvailability(
    dentistaId: string,
    fecha: string,
    hora: string,
    durationMinutes: number,
    ignoreCitaId?: string,
    pacienteId?: string,
  ): Promise<{ disponible: boolean; motivoNoDisponible?: string }> {
    const dentista = await this.prisma.dentista.findUnique({
      where: { id: dentistaId },
      include: { bloqueos: { where: { fecha } } },
    });
    if (!dentista) {
      throw new NotFoundException("Especialista inexistente.");
    }

    if (isOfficialHoliday(fecha)) {
      return {
        disponible: false,
        motivoNoDisponible: "Día feriado no laborable",
      };
    }

    const diaNombre = dayNameInSpanish(fecha);
    if (
      Array.isArray(dentista.diasAtencion) &&
      dentista.diasAtencion.length > 0 &&
      !dentista.diasAtencion.includes(diaNombre)
    ) {
      return {
        disponible: false,
        motivoNoDisponible: "Día no laborable para el especialista",
      };
    }

    const start = minutes(hora);
    const end = start + durationMinutes;

    if (!dentista.horariosDisponibles.includes(hora)) {
      return { disponible: false, motivoNoDisponible: "Fuera de horario" };
    }
    if (clinicInstant(fecha, hora) <= new Date()) {
      return { disponible: false, motivoNoDisponible: "Horario pasado" };
    }
    if (end > 20 * 60) {
      return {
        disponible: false,
        motivoNoDisponible: "Excede horario de cierre",
      };
    }

    if (
      dentista.bloqueos.some((b) =>
        overlaps(start, end, minutes(b.horaInicio), minutes(b.horaFin)),
      )
    ) {
      return { disponible: false, motivoNoDisponible: "Horario bloqueado" };
    }

    const citasDia = await this.prisma.cita.findMany({
      where: {
        dentistaId,
        fecha,
        estado: { not: "CANCELADA" },
        ...(ignoreCitaId ? { id: { not: ignoreCitaId } } : {}),
      },
      include: { servicio: true },
    });

    const hasConflict = citasDia.some((c) => {
      const cStart = minutes(c.horaInicio);
      const cEnd = cStart + (c.servicio?.duracionMinutos || 60);
      return overlaps(start, end, cStart, cEnd);
    });

    if (hasConflict) {
      return { disponible: false, motivoNoDisponible: "Horario reservado" };
    }

    if (pacienteId) {
      const citasPacienteDia = await this.prisma.cita.findMany({
        where: {
          pacienteId,
          fecha,
          estado: { not: "CANCELADA" },
          ...(ignoreCitaId ? { id: { not: ignoreCitaId } } : {}),
        },
        include: { servicio: true },
      });
      const hasPatientConflict = citasPacienteDia.some((c) => {
        const cStart = minutes(c.horaInicio);
        const cEnd = cStart + (c.servicio?.duracionMinutos || 60);
        return overlaps(start, end, cStart, cEnd);
      });
      if (hasPatientConflict) {
        return {
          disponible: false,
          motivoNoDisponible:
            "El paciente ya cuenta con otra cita agendada en ese horario",
        };
      }
    }

    return { disponible: true };
  }

  async obtenerDisponibilidad(
    dentistaId: string,
    fecha: string,
    servicioId?: string,
  ) {
    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      throw new BadRequestException("Formato de fecha inválido (YYYY-MM-DD).");
    }
    const dentista = await this.prisma.dentista.findUnique({
      where: { id: dentistaId },
    });
    if (!dentista) {
      throw new NotFoundException("Especialista inexistente.");
    }
    let duration = 30;
    if (servicioId) {
      const srv = await this.prisma.servicio.findUnique({
        where: { id: servicioId },
      });
      if (srv) duration = srv.duracionMinutos;
    }

    const results = [];
    for (const hora of dentista.horariosDisponibles) {
      const check = await this.evaluateSlotAvailability(
        dentistaId,
        fecha,
        hora,
        duration,
      );
      results.push({
        hora,
        disponible: check.disponible,
        ...(check.motivoNoDisponible
          ? { motivoNoDisponible: check.motivoNoDisponible }
          : {}),
      });
    }
    return results;
  }

  async crearBloqueo(
    user: UserResponseDto,
    dentistaId: string,
    dto: CreateBloqueoDto,
  ) {
    if (user.rol !== "DENTISTA" || user.dentista_id !== dentistaId) {
      throw new ForbiddenException(
        "Solo el dentista titular puede bloquear su horario.",
      );
    }
    const start = minutes(dto.horaInicio);
    const end = minutes(dto.horaFin);
    if (end <= start) {
      throw new UnprocessableEntityException(
        "La hora de fin debe ser posterior a la hora de inicio.",
      );
    }

    const dentista = await this.prisma.dentista.findUnique({
      where: { id: dentistaId },
      include: { bloqueos: { where: { fecha: dto.fecha } } },
    });
    if (!dentista) {
      throw new NotFoundException("Especialista inexistente.");
    }

    if (
      dentista.bloqueos.some((b) =>
        overlaps(start, end, minutes(b.horaInicio), minutes(b.horaFin)),
      )
    ) {
      throw new ConflictException(
        "El bloqueo se solapa con otro bloqueo registrado.",
      );
    }

    const citasDia = await this.prisma.cita.findMany({
      where: {
        dentistaId,
        fecha: dto.fecha,
        estado: { not: "CANCELADA" },
      },
      include: { servicio: true },
    });
    if (
      citasDia.some((c) =>
        overlaps(
          start,
          end,
          minutes(c.horaInicio),
          minutes(c.horaInicio) + (c.servicio?.duracionMinutos || 60),
        ),
      )
    ) {
      throw new ConflictException(
        "El bloqueo se solapa con una cita activa en agenda.",
      );
    }

    return this.prisma.bloqueoDentista.create({
      data: {
        id: `bloq-${randomUUID().slice(0, 8)}`,
        dentistaId,
        fecha: dto.fecha,
        horaInicio: dto.horaInicio,
        horaFin: dto.horaFin,
        motivo: dto.motivo.trim(),
      },
    });
  }

  async listarCitas(
    user: UserResponseDto,
    pacienteId?: string,
    dentistaId?: string,
    fecha?: string,
    page?: number,
    limit?: number,
  ) {
    const safeLimit =
      limit && Number.isFinite(limit) && limit > 0
        ? Math.min(Math.floor(limit), 500)
        : undefined;
    const safeSkip =
      safeLimit && page && Number.isFinite(page) && page > 1
        ? (Math.floor(page) - 1) * safeLimit
        : undefined;

    if (user.rol === "PACIENTE") {
      if ((pacienteId && pacienteId !== user.paciente_id) || dentistaId) {
        throw new ForbiddenException(
          "Un paciente solo puede consultar sus propias citas.",
        );
      }
      const list = await this.prisma.cita.findMany({
        where: {
          pacienteId: user.paciente_id!,
          ...(fecha ? { fecha } : {}),
        },
        orderBy: [{ fecha: "desc" }, { horaInicio: "asc" }],
        ...(safeLimit ? { take: safeLimit } : {}),
        ...(safeSkip ? { skip: safeSkip } : {}),
      });
      return list.map((c) => this.mapCita(c));
    }

    const list = await this.prisma.cita.findMany({
      where: {
        ...(pacienteId ? { pacienteId } : {}),
        ...(dentistaId ? { dentistaId } : {}),
        ...(fecha ? { fecha } : {}),
      },
      orderBy: [{ fecha: "asc" }, { horaInicio: "asc" }],
      ...(safeLimit ? { take: safeLimit } : {}),
      ...(safeSkip ? { skip: safeSkip } : {}),
    });
    return list.map((c) => this.mapCita(c));
  }

  async agendarCita(user: UserResponseDto, dto: CreateCitaDto) {
    if (user.rol === "PACIENTE" && user.paciente_id !== dto.pacienteId) {
      throw new ForbiddenException(
        "No puedes agendar citas a nombre de otro paciente.",
      );
    }

    return this.withBookingLock(async () => {
      const [paciente, dentista, servicio] = await Promise.all([
        this.prisma.paciente.findUnique({ where: { id: dto.pacienteId } }),
        this.prisma.dentista.findUnique({ where: { id: dto.dentistaId } }),
        this.prisma.servicio.findUnique({ where: { id: dto.servicioId } }),
      ]);

      if (!paciente || !dentista || !servicio || paciente.activo === false) {
        throw new NotFoundException(
          "Paciente, especialista o servicio inexistente.",
        );
      }

      const slot = await this.evaluateSlotAvailability(
        dentista.id,
        dto.fecha,
        dto.horaInicio,
        servicio.duracionMinutos,
        undefined,
        paciente.id,
      );
      if (!slot.disponible) {
        throw new ConflictException(
          slot.motivoNoDisponible ||
            "El horario seleccionado ya no está disponible.",
        );
      }

      const created = await this.prisma.cita.create({
        data: {
          id: `cit-${randomUUID().slice(0, 8)}`,
          pacienteId: paciente.id,
          pacienteNombre: paciente.nombreCompleto,
          dentistaId: dentista.id,
          dentistaNombre: dentista.nombreCompleto,
          servicioId: servicio.id,
          servicioNombre: servicio.nombre,
          tratamientoId: dto.tratamientoId ?? null,
          fecha: dto.fecha,
          horaInicio: dto.horaInicio,
          estado: "CONFIRMADA",
          motivo: dto.motivo.trim() || `Consulta de ${servicio.nombre}`,
          costoMXN: servicio.precioBaseMXN,
        },
      });
      return this.mapCita(created);
    });
  }

  async cancelarCita(
    user: UserResponseDto,
    id: string,
    dto: CancelCitaDto,
  ) {
    const target = await this.prisma.cita.findUnique({ where: { id } });
    if (!target) {
      throw new NotFoundException("La cita solicitada no existe.");
    }
    if (user.rol === "PACIENTE" && target.pacienteId !== user.paciente_id) {
      throw new ForbiddenException(
        "No tienes permiso para cancelar esta cita.",
      );
    }

    if (user.rol === "PACIENTE") {
      const citaInstant = clinicInstant(target.fecha, target.horaInicio);
      const diffHours =
        (citaInstant.getTime() - Date.now()) / (1000 * 60 * 60);
      if (diffHours < 24) {
        throw new ConflictException(
          "Las cancelaciones requieren al menos 24 horas de anticipación. Por favor comunícate con recepción.",
        );
      }
    }

    const updated = await this.prisma.cita.update({
      where: { id },
      data: {
        estado: "CANCELADA",
        motivo: `${target.motivo} [Cancelada: ${dto.motivoCancelacion.trim()}]`,
      },
    });
    return this.mapCita(updated);
  }

  async reagendarCita(
    user: UserResponseDto,
    id: string,
    dto: ReagendarCitaDto,
  ) {
    return this.withBookingLock(async () => {
      const target = await this.prisma.cita.findUnique({
        where: { id },
        include: { servicio: true },
      });
      if (!target) {
        throw new NotFoundException("Cita no encontrada para reagendar.");
      }
      if (user.rol === "PACIENTE" && target.pacienteId !== user.paciente_id) {
        throw new ForbiddenException(
          "No tienes permiso para reagendar esta cita.",
        );
      }

      if (user.rol === "PACIENTE") {
        const citaInstant = clinicInstant(target.fecha, target.horaInicio);
        const diffHours =
          (citaInstant.getTime() - Date.now()) / (1000 * 60 * 60);
        if (diffHours < 24) {
          throw new ConflictException(
            "Las reprogramaciones por portal requieren al menos 24 horas de anticipación.",
          );
        }
      }

      const duration = target.servicio?.duracionMinutos || 60;
      const slot = await this.evaluateSlotAvailability(
        target.dentistaId,
        dto.nuevaFecha,
        dto.nuevaHoraInicio,
        duration,
        target.id,
        target.pacienteId,
      );
      if (!slot.disponible) {
        throw new ConflictException(
          slot.motivoNoDisponible || "El nuevo horario ya no está disponible.",
        );
      }

      const updated = await this.prisma.cita.update({
        where: { id },
        data: {
          fecha: dto.nuevaFecha,
          horaInicio: dto.nuevaHoraInicio,
          estado: "REPROGRAMADA",
          estadoNotificacion: dto.notificarPaciente ? "solicitada" : null,
        },
      });
      return this.mapCita(updated);
    });
  }
}
