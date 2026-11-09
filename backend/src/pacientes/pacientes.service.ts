import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { randomUUID } from "node:crypto";
import { isFDI, todayInClinic } from "../common/clinical-time";
import type { UserResponseDto } from "../auth/dto/auth.dto";
import type {
  CreateHistorialDto,
  CreatePacienteDto,
  CreatePagoDto,
  CreateTratamientoDto,
  UpdateTratamientoDto,
} from "./dto/pacientes.dto";
import type {
  HistorialClinico,
  Paciente,
  Tratamiento,
} from "@prisma/client";

export function roundMoney(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function calculateAgeFromBirthdate(
  birthIso: string,
  refIso = todayInClinic(),
): number {
  const [by, bm, bd] = birthIso.split("-").map(Number);
  const [ry, rm, rd] = refIso.split("-").map(Number);
  let age = ry - by;
  if (rm < bm || (rm === bm && rd < bd)) {
    age -= 1;
  }
  return age;
}

@Injectable()
export class PacientesService {
  private paymentLockChain: Promise<unknown> = Promise.resolve();

  constructor(private readonly prisma: PrismaService) {}

  private withPaymentLock<T>(task: () => Promise<T>): Promise<T> {
    const next = this.paymentLockChain.then(task, task);
    this.paymentLockChain = next.catch(() => undefined);
    return next;
  }

  private assertReadAccess(user: UserResponseDto, pacienteId: string): void {
    if (user.rol === "DENTISTA") return;
    if (user.rol === "PACIENTE" && user.paciente_id === pacienteId) return;
    throw new ForbiddenException(
      "No tienes permiso para acceder a este expediente clínico.",
    );
  }

  private assertDentistWrite(user: UserResponseDto): {
    dentistaId: string;
    dentistaNombre: string;
  } {
    if (user.rol !== "DENTISTA" || !user.dentista_id) {
      throw new ForbiddenException(
        "Solo un dentista acreditado puede registrar cambios clínicos.",
      );
    }
    return {
      dentistaId: user.dentista_id,
      dentistaNombre: user.nombre_completo,
    };
  }

  mapPaciente(p: Paciente) {
    return {
      id: p.id,
      documento: p.documento,
      codigo_expediente: p.codigoExpediente,
      nombre_completo: p.nombreCompleto,
      email: p.email,
      telefono: p.telefono,
      fecha_nacimiento: p.fechaNacimiento,
      edad: p.edad,
      grupo_sanguineo: p.grupoSanguineo,
      alergias: p.alergias,
      condiciones_medicas: p.condicionesMedicas,
      alertas_clinicas: p.alertasClinicas,
      fecha_registro: p.fechaRegistro,
      odontologo_cabecera_id: p.odontologoCabeceraId,
      odontologo_cabecera_nombre: p.odontologoCabeceraNombre,
      ...(p.tutorNombre ? { tutor_nombre: p.tutorNombre } : {}),
      ...(p.tutorTelefono ? { tutor_telefono: p.tutorTelefono } : {}),
      activo: p.activo ?? true,
    };
  }

  mapHistorial(h: HistorialClinico) {
    return {
      id: h.id,
      pacienteId: h.pacienteId,
      fecha: h.fecha,
      dentistaId: h.dentistaId,
      dentistaNombre: h.dentistaNombre,
      tipo: h.tipo,
      diagnostico: h.diagnostico,
      procedimientoRealizado: h.procedimientoRealizado,
      notasEvolucion: h.notasEvolucion,
    };
  }

  mapTratamiento(t: Tratamiento) {
    return {
      id: t.id,
      pacienteId: t.pacienteId,
      dentistaId: t.dentistaId,
      dentistaNombre: t.dentistaNombre,
      servicioId: t.servicioId,
      nombre: t.nombre,
      estado: t.estado,
      fechaInicio: t.fechaInicio,
      progresoPorcentaje: t.progresoPorcentaje,
      sesionesCompletadas: t.sesionesCompletadas,
      sesionesTotales: t.sesionesTotales,
      costoTotal: t.costoTotal,
      presupuestoAprobado: t.presupuestoAprobado ?? false,
      dientesInvolucrados: t.dientesInvolucrados,
      proximaFechaSugerida: t.proximaFechaSugerida,
      notasEvolucion: t.notasEvolucion,
    };
  }

  async listarPacientes(
    user: UserResponseDto,
    q?: string,
    page?: number,
    limit?: number,
  ) {
    if (user.rol !== "DENTISTA") {
      throw new ForbiddenException(
        "El directorio clínico es exclusivo para odontólogos.",
      );
    }
    const safeLimit =
      limit && Number.isFinite(limit) && limit > 0
        ? Math.min(Math.floor(limit), 500)
        : undefined;
    const safeSkip =
      safeLimit && page && Number.isFinite(page) && page > 1
        ? (Math.floor(page) - 1) * safeLimit
        : undefined;

    const query = q?.trim();
    const list = await this.prisma.paciente.findMany({
      where: {
        activo: true,
        ...(query
          ? {
              OR: [
                { nombreCompleto: { contains: query, mode: "insensitive" } },
                { codigoExpediente: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { id: "asc" },
      ...(safeLimit ? { take: safeLimit } : {}),
      ...(safeSkip ? { skip: safeSkip } : {}),
    });
    return list.map((p) => this.mapPaciente(p));
  }

  async crearPaciente(user: UserResponseDto, dto: CreatePacienteDto) {
    const author = this.assertDentistWrite(user);

    const hoy = todayInClinic();
    if (dto.fechaNacimiento > hoy) {
      throw new UnprocessableEntityException(
        "La fecha de nacimiento no puede ser una fecha futura.",
      );
    }

    const calculatedAge = calculateAgeFromBirthdate(dto.fechaNacimiento, hoy);
    if (Math.abs(calculatedAge - dto.edad) > 1) {
      throw new UnprocessableEntityException(
        `La edad declarada (${dto.edad}) es inconsistente con la fecha de nacimiento (${dto.fechaNacimiento}).`,
      );
    }

    if (calculatedAge < 18) {
      if (!dto.tutorNombre?.trim() || !dto.tutorTelefono?.trim()) {
        throw new UnprocessableEntityException(
          "Los pacientes menores de edad deben contar con nombre y teléfono de su tutor legal.",
        );
      }
    }

    const cleanEmail = dto.email.trim().toLowerCase();
    const cleanDoc = dto.documento.trim().toUpperCase();
    const cleanPhone = dto.telefono.trim();

    const duplicado = await this.prisma.paciente.findFirst({
      where: {
        OR: [
          { email: { equals: cleanEmail, mode: "insensitive" } },
          { documento: { equals: cleanDoc, mode: "insensitive" } },
          { telefono: cleanPhone },
        ],
      },
    });
    if (duplicado) {
      throw new ConflictException(
        "Ya existe un paciente registrado con el mismo documento, correo electrónico o teléfono.",
      );
    }

    const created = await this.prisma.paciente.create({
      data: {
        id: `pac-${randomUUID().slice(0, 8)}`,
        documento: cleanDoc,
        codigoExpediente: `EXP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        nombreCompleto: dto.nombreCompleto.trim(),
        email: cleanEmail,
        telefono: cleanPhone,
        fechaNacimiento: dto.fechaNacimiento,
        edad: dto.edad,
        grupoSanguineo: dto.grupoSanguineo.trim(),
        alergias: dto.alergias ?? ["Ninguna conocida"],
        condicionesMedicas: dto.condicionesMedicas ?? ["Sin antecedentes"],
        alertasClinicas: dto.alertasClinicas ?? [],
        fechaRegistro: hoy,
        odontologoCabeceraId: dto.odontologoCabeceraId || author.dentistaId,
        odontologoCabeceraNombre: author.dentistaNombre,
        tutorNombre: dto.tutorNombre?.trim() || null,
        tutorTelefono: dto.tutorTelefono?.trim() || null,
        activo: true,
      },
    });
    return this.mapPaciente(created);
  }

  async eliminarPaciente(user: UserResponseDto, id: string) {
    this.assertDentistWrite(user);
    const paciente = await this.prisma.paciente.findUnique({
      where: { id },
      include: {
        citas: { select: { id: true }, take: 1 },
        historial: { select: { id: true }, take: 1 },
        tratamientos: { select: { id: true }, take: 1 },
      },
    });
    if (!paciente) {
      throw new NotFoundException("Expediente de paciente no encontrado.");
    }

    // Borrado lógico obligatorio para preservar integridad médico-legal (NOM-004 / HIPAA)
    const deletedAt = new Date();
    const updated = await this.prisma.paciente.update({
      where: { id },
      data: {
        activo: false,
        deletedAt,
      },
    });

    return {
      id: updated.id,
      activo: false,
      borradoLogico: true,
      tieneRegistrosAsociados:
        (paciente.citas?.length ?? 0) > 0 ||
        (paciente.historial?.length ?? 0) > 0 ||
        (paciente.tratamientos?.length ?? 0) > 0,
      deletedAt: deletedAt.toISOString(),
    };
  }

  async obtenerPacientePorId(user: UserResponseDto, id: string) {
    this.assertReadAccess(user, id);
    const paciente = await this.prisma.paciente.findUnique({ where: { id } });
    if (!paciente || paciente.activo === false) {
      throw new NotFoundException("Expediente de paciente no encontrado.");
    }
    return this.mapPaciente(paciente);
  }

  async obtenerHistorial(user: UserResponseDto, pacienteId: string) {
    this.assertReadAccess(user, pacienteId);
    const paciente = await this.prisma.paciente.findUnique({
      where: { id: pacienteId },
    });
    if (!paciente) {
      throw new NotFoundException("Expediente de paciente no encontrado.");
    }
    const entries = await this.prisma.historialClinico.findMany({
      where: { pacienteId },
      orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
    });
    return entries.map((h) => this.mapHistorial(h));
  }

  async agregarHistorial(
    user: UserResponseDto,
    pacienteId: string,
    dto: CreateHistorialDto,
  ) {
    const author = this.assertDentistWrite(user);
    const paciente = await this.prisma.paciente.findUnique({
      where: { id: pacienteId },
    });
    if (!paciente) {
      throw new NotFoundException("Expediente de paciente no encontrado.");
    }
    const created = await this.prisma.historialClinico.create({
      data: {
        id: `his-${randomUUID().slice(0, 8)}`,
        pacienteId,
        fecha: todayInClinic(),
        dentistaId: author.dentistaId,
        dentistaNombre: author.dentistaNombre,
        tipo: dto.tipo,
        diagnostico: dto.diagnostico.trim(),
        procedimientoRealizado: dto.procedimientoRealizado.trim(),
        notasEvolucion: dto.notasEvolucion.trim(),
      },
    });
    return this.mapHistorial(created);
  }

  async obtenerTratamientos(user: UserResponseDto, pacienteId: string) {
    this.assertReadAccess(user, pacienteId);
    const paciente = await this.prisma.paciente.findUnique({
      where: { id: pacienteId },
    });
    if (!paciente) {
      throw new NotFoundException("Expediente de paciente no encontrado.");
    }
    const list = await this.prisma.tratamiento.findMany({
      where: { pacienteId },
      orderBy: [{ createdAt: "desc" }],
    });
    return list.map((t) => this.mapTratamiento(t));
  }

  async crearTratamiento(
    user: UserResponseDto,
    pacienteId: string,
    dto: CreateTratamientoDto,
  ) {
    const author = this.assertDentistWrite(user);
    if (
      !dto.dientesInvolucrados.length ||
      dto.dientesInvolucrados.some((n) => !isFDI(n))
    ) {
      throw new UnprocessableEntityException(
        "Las piezas dentales deben ser números FDI válidos (11–48).",
      );
    }

    const [paciente, servicio] = await Promise.all([
      this.prisma.paciente.findUnique({ where: { id: pacienteId } }),
      this.prisma.servicio.findUnique({ where: { id: dto.servicioId } }),
    ]);
    if (!paciente || !servicio) {
      throw new NotFoundException("Paciente o servicio clínico no encontrado.");
    }

    const created = await this.prisma.tratamiento.create({
      data: {
        id: `trt-${randomUUID().slice(0, 8)}`,
        pacienteId,
        dentistaId: author.dentistaId,
        dentistaNombre: author.dentistaNombre,
        servicioId: servicio.id,
        nombre: dto.nombre.trim(),
        estado: "PLANIFICADO",
        fechaInicio: todayInClinic(),
        progresoPorcentaje: 0,
        sesionesCompletadas: 0,
        sesionesTotales: dto.sesionesTotales,
        costoTotal: roundMoney(dto.costoTotal),
        presupuestoAprobado: false,
        dientesInvolucrados: dto.dientesInvolucrados,
        proximaFechaSugerida: dto.proximaFechaSugerida,
        notasEvolucion: dto.notasEvolucion.trim(),
      },
    });
    return this.mapTratamiento(created);
  }

  async actualizarTratamiento(
    user: UserResponseDto,
    id: string,
    dto: UpdateTratamientoDto,
  ) {
    this.assertDentistWrite(user);
    const existing = await this.prisma.tratamiento.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException("Tratamiento no encontrado.");
    }
    if (dto.sesionesCompletadas > existing.sesionesTotales) {
      throw new UnprocessableEntityException(
        "Las sesiones completadas no pueden exceder las sesiones totales.",
      );
    }
    if (
      dto.costoTotal !== undefined &&
      existing.presupuestoAprobado &&
      roundMoney(dto.costoTotal) !== roundMoney(existing.costoTotal)
    ) {
      throw new ConflictException(
        "No se puede modificar el costo total de un presupuesto que ya fue aprobado.",
      );
    }

    const progresoPorcentaje =
      dto.estado === "FINALIZADO"
        ? 100
        : Math.min(
            100,
            Math.round(
              (dto.sesionesCompletadas / existing.sesionesTotales) * 100,
            ),
          );

    const updated = await this.prisma.tratamiento.update({
      where: { id },
      data: {
        estado: dto.estado,
        sesionesCompletadas: dto.sesionesCompletadas,
        progresoPorcentaje,
        ...(dto.presupuestoAprobado !== undefined
          ? { presupuestoAprobado: dto.presupuestoAprobado }
          : {}),
        ...(dto.costoTotal !== undefined && !existing.presupuestoAprobado
          ? { costoTotal: roundMoney(dto.costoTotal) }
          : {}),
      },
    });
    return this.mapTratamiento(updated);
  }

  async aprobarPresupuesto(user: UserResponseDto, tratamientoId: string) {
    const existing = await this.prisma.tratamiento.findUnique({
      where: { id: tratamientoId },
    });
    if (!existing) {
      throw new NotFoundException("Tratamiento o presupuesto no encontrado.");
    }
    this.assertReadAccess(user, existing.pacienteId);
    const updated = await this.prisma.tratamiento.update({
      where: { id: tratamientoId },
      data: { presupuestoAprobado: true },
    });
    return this.mapTratamiento(updated);
  }

  async obtenerEstadoCuentaTratamiento(
    user: UserResponseDto,
    tratamientoId: string,
  ) {
    const tratamiento = await this.prisma.tratamiento.findUnique({
      where: { id: tratamientoId },
    });
    if (!tratamiento) {
      throw new NotFoundException("Tratamiento no encontrado.");
    }
    this.assertReadAccess(user, tratamiento.pacienteId);

    const pagos = await this.prisma.pago.findMany({
      where: { tratamientoId },
      orderBy: { createdAt: "asc" },
    });

    const totalPagado = roundMoney(
      pagos.reduce((acc, p) => acc + p.montoMXN, 0),
    );
    const totalDescuentos = roundMoney(
      pagos.reduce((acc, p) => acc + p.descuentoMXN, 0),
    );
    const saldoPendiente = roundMoney(
      Math.max(0, tratamiento.costoTotal - totalPagado - totalDescuentos),
    );

    return {
      tratamientoId: tratamiento.id,
      pacienteId: tratamiento.pacienteId,
      costoTotal: roundMoney(tratamiento.costoTotal),
      presupuestoAprobado: tratamiento.presupuestoAprobado,
      totalPagado,
      totalDescuentos,
      saldoPendiente,
      pagos,
    };
  }

  async registrarPago(
    user: UserResponseDto,
    tratamientoId: string,
    dto: CreatePagoDto,
  ) {
    this.assertDentistWrite(user);

    const monto = roundMoney(dto.montoMXN);
    const descuento = roundMoney(dto.descuentoMXN ?? 0);

    if (descuento < 0) {
      throw new UnprocessableEntityException(
        "El descuento no puede ser un valor negativo.",
      );
    }
    if (monto <= 0) {
      throw new UnprocessableEntityException(
        "El monto del pago debe ser mayor a 0.",
      );
    }

    return this.withPaymentLock(async () => {
      if (dto.idempotencyKey) {
        const dup = await this.prisma.pago.findUnique({
          where: { idempotencyKey: dto.idempotencyKey },
        });
        if (dup) {
          throw new ConflictException(
            "Pago duplicado detectado (idempotencyKey ya procesada).",
          );
        }
      }

      const tratamiento = await this.prisma.tratamiento.findUnique({
        where: { id: tratamientoId },
      });
      if (!tratamiento) {
        throw new NotFoundException("Tratamiento no encontrado.");
      }

      const pagosPrevios = await this.prisma.pago.findMany({
        where: { tratamientoId },
      });
      const pagadoPrevio = roundMoney(
        pagosPrevios.reduce((acc, p) => acc + p.montoMXN + p.descuentoMXN, 0),
      );
      const saldoPendiente = roundMoney(tratamiento.costoTotal - pagadoPrevio);

      if (roundMoney(monto + descuento) > roundMoney(saldoPendiente + 0.001)) {
        throw new UnprocessableEntityException(
          `El abono más descuento (${roundMoney(monto + descuento)} MXN) excede el saldo pendiente (${saldoPendiente} MXN).`,
        );
      }

      const pago = await this.prisma.pago.create({
        data: {
          id: `pag-${randomUUID().slice(0, 8)}`,
          pacienteId: tratamiento.pacienteId,
          tratamientoId: tratamiento.id,
          montoMXN: monto,
          descuentoMXN: descuento,
          metodoPago: dto.metodoPago,
          idempotencyKey: dto.idempotencyKey || null,
          fechaPago: todayInClinic(),
          notas: dto.notas?.trim() || "Abono a tratamiento",
        },
      });

      const nuevoSaldo = roundMoney(saldoPendiente - monto - descuento);
      return {
        pago,
        saldoPendiente: nuevoSaldo,
        liquidado: nuevoSaldo === 0,
      };
    });
  }
}
