import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { randomUUID } from "node:crypto";
import {
  isFDI,
  isValidToothSurface,
  ORDEN_32_DIENTES_FDI,
  todayInClinic,
} from "../common/clinical-time";
import type { UserResponseDto } from "../auth/dto/auth.dto";
import type { UpdateDienteDto } from "./dto/odontogramas.dto";

@Injectable()
export class OdontogramasService {
  private odontogramaLockChain: Promise<unknown> = Promise.resolve();

  constructor(private readonly prisma: PrismaService) {}

  private withOdontogramaLock<T>(task: () => Promise<T>): Promise<T> {
    const next = this.odontogramaLockChain.then(task, task);
    this.odontogramaLockChain = next.catch(() => undefined);
    return next;
  }

  async obtenerOdontograma(user: UserResponseDto, pacienteId: string) {
    if (user.rol === "PACIENTE" && user.paciente_id !== pacienteId) {
      throw new ForbiddenException(
        "No tienes permiso para consultar el odontograma de otro paciente.",
      );
    }

    const odontograma = await this.prisma.odontograma.findUnique({
      where: { pacienteId },
      include: {
        dientes: true,
        historialCambios: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!odontograma) {
      throw new NotFoundException(
        "Odontograma del paciente no encontrado.",
      );
    }

    const orderMap = new Map(
      ORDEN_32_DIENTES_FDI.map((fdi, index) => [fdi, index]),
    );
    const sortedTeeth = [...odontograma.dientes].sort(
      (a, b) =>
        (orderMap.get(a.numeroFDI) ?? 99) - (orderMap.get(b.numeroFDI) ?? 99),
    );

    return {
      pacienteId: odontograma.pacienteId,
      actualizadoEn: odontograma.actualizadoEn,
      dientes: sortedTeeth.map((d) => ({
        numeroFDI: d.numeroFDI,
        nombreAnatomico: d.nombreAnatomico,
        cuadrante: d.cuadrante as 1 | 2 | 3 | 4,
        estadoGeneral: d.estadoGeneral,
        superficies: {
          oclusal: d.supOclusal,
          vestibular: d.supVestibular,
          lingual: d.supLingual,
          mesial: d.supMesial,
          distal: d.supDistal,
        },
        ultimaActualizacion: d.ultimaActualizacion,
        notaClinica: d.notaClinica,
      })),
      historial_cambios: odontograma.historialCambios.map((c) => ({
        id: c.id,
        pacienteId: c.pacienteId,
        numeroFDI: c.numeroFDI,
        superficie: c.superficie,
        estadoAnterior: c.estadoAnterior,
        estadoNuevo: c.estadoNuevo,
        procedimiento: c.procedimiento,
        nota: c.nota,
        autorNombre: c.autorNombre,
        autorRol: "DENTISTA" as const,
        fechaHora: c.fechaHora,
      })),
    };
  }

  async actualizarDiente(
    user: UserResponseDto,
    pacienteId: string,
    numeroFDI: number,
    dto: UpdateDienteDto,
  ) {
    if (user.rol !== "DENTISTA" || !user.dentista_id) {
      throw new ForbiddenException(
        "Solo un odontólogo acreditado puede modificar el odontograma.",
      );
    }
    if (!isFDI(numeroFDI)) {
      throw new UnprocessableEntityException("Número de pieza FDI inválido.");
    }
    if (!isValidToothSurface(dto.superficie)) {
      throw new UnprocessableEntityException(
        "Superficie dental inválida. Valores permitidos: oclusal, vestibular, lingual, mesial, distal o GENERAL.",
      );
    }

    return this.withOdontogramaLock(async () => {
      const diente = await this.prisma.dienteOdontograma.findUnique({
        where: {
          pacienteId_numeroFDI: {
            pacienteId,
            numeroFDI,
          },
        },
      });
      if (!diente) {
        throw new NotFoundException(
          "Pieza dental o expediente no encontrado.",
        );
      }

      const surfaceMap: Record<string, string> = {
        oclusal: diente.supOclusal,
        vestibular: diente.supVestibular,
        lingual: diente.supLingual,
        mesial: diente.supMesial,
        distal: diente.supDistal,
      };

      const estadoAnterior =
        dto.superficie === "GENERAL"
          ? diente.estadoGeneral
          : surfaceMap[dto.superficie] || diente.estadoGeneral;

      let nuevoEstadoGeneral = diente.estadoGeneral;
      const nuevasSuperficies = {
        supOclusal: diente.supOclusal,
        supVestibular: diente.supVestibular,
        supLingual: diente.supLingual,
        supMesial: diente.supMesial,
        supDistal: diente.supDistal,
      };

      if (dto.superficie === "GENERAL") {
        nuevoEstadoGeneral = dto.estadoNuevo;
        if (
          ["SANO", "CORONA", "AUSENTE", "IMPLANTE"].includes(dto.estadoNuevo)
        ) {
          nuevasSuperficies.supOclusal = dto.estadoNuevo;
          nuevasSuperficies.supVestibular = dto.estadoNuevo;
          nuevasSuperficies.supLingual = dto.estadoNuevo;
          nuevasSuperficies.supMesial = dto.estadoNuevo;
          nuevasSuperficies.supDistal = dto.estadoNuevo;
        }
      } else {
        nuevoEstadoGeneral = dto.estadoNuevo;
        if (dto.superficie === "oclusal")
          nuevasSuperficies.supOclusal = dto.estadoNuevo;
        if (dto.superficie === "vestibular")
          nuevasSuperficies.supVestibular = dto.estadoNuevo;
        if (dto.superficie === "lingual")
          nuevasSuperficies.supLingual = dto.estadoNuevo;
        if (dto.superficie === "mesial")
          nuevasSuperficies.supMesial = dto.estadoNuevo;
        if (dto.superficie === "distal")
          nuevasSuperficies.supDistal = dto.estadoNuevo;
      }

      const hoy = todayInClinic();

      await this.prisma.$transaction([
        this.prisma.dienteOdontograma.update({
          where: { id: diente.id },
          data: {
            estadoGeneral: nuevoEstadoGeneral,
            ...nuevasSuperficies,
            ultimaActualizacion: hoy,
            notaClinica: dto.nota.trim() || diente.notaClinica,
          },
        }),
        this.prisma.odontograma.update({
          where: { pacienteId },
          data: { actualizadoEn: hoy },
        }),
        this.prisma.cambioOdontograma.create({
          data: {
            id: `aud-${randomUUID().slice(0, 8)}`,
            pacienteId,
            numeroFDI,
            superficie: dto.superficie,
            estadoAnterior,
            estadoNuevo: dto.estadoNuevo,
            procedimiento: dto.procedimiento.trim(),
            nota: dto.nota.trim() || "Cambio clínico registrado en consulta.",
            autorNombre: user.nombre_completo,
            autorRol: "DENTISTA",
            fechaHora: new Date().toISOString(),
          },
        }),
      ]);

      return this.obtenerOdontograma(user, pacienteId);
    });
  }
}
