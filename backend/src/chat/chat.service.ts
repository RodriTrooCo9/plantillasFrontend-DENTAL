import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CitasService } from "../citas/citas.service";
import { OdontogramasService } from "../odontogramas/odontogramas.service";
import { PacientesService } from "../pacientes/pacientes.service";
import { addDays, todayInClinic } from "../common/clinical-time";
import { randomUUID } from "node:crypto";
import type { UserResponseDto } from "../auth/dto/auth.dto";
import type { ChatRequestDto } from "./dto/chat.dto";

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly citasService: CitasService,
    private readonly odontogramasService: OdontogramasService,
    private readonly pacientesService: PacientesService,
  ) {}

  async processChat(user: UserResponseDto | null, dto: ChatRequestDto) {
    const effectiveRole = user ? user.rol : "VISITANTE";
    const effectivePacienteId =
      user?.rol === "PACIENTE"
        ? user.paciente_id
        : dto.pacienteId ?? null;
    const effectiveDentistaId =
      user?.rol === "DENTISTA"
        ? user.dentista_id
        : dto.dentistaId ?? null;

    const contextKey = JSON.stringify([
      effectiveRole,
      effectivePacienteId,
      effectiveDentistaId,
    ]);

    // 1. Confirmación de propuesta previa
    if (dto.confirmarAccion) {
      if (!user) {
        throw new ForbiddenException(
          "Debes iniciar sesión para confirmar operaciones clínicas.",
        );
      }
      const proposal = await this.prisma.chatPropuesta.findUnique({
        where: { id: dto.confirmarAccion.id },
      });
      if (
        !proposal ||
        proposal.token !== dto.confirmarAccion.token ||
        proposal.contextKey !== contextKey
      ) {
        throw new ForbiddenException(
          "La confirmación no corresponde a esta sesión o expediente.",
        );
      }
      if (proposal.ejecutada && proposal.resultadoJson) {
        return JSON.parse(proposal.resultadoJson);
      }
      if (proposal.expiresAt.getTime() < Date.now()) {
        throw new ConflictException(
          "La propuesta expiró. Solicita una nueva operación.",
        );
      }

      const payload = JSON.parse(proposal.payloadJson) as Record<
        string,
        unknown
      >;
      if (
        proposal.tipoAccion === "AGENDAR_CITA" ||
        proposal.tipoAccion === "CONTINUAR_TRATAMIENTO"
      ) {
        await this.citasService.agendarCita(user, {
          pacienteId: String(payload.pacienteId),
          dentistaId: String(payload.dentistaId),
          servicioId: String(payload.servicioId),
          tratamientoId: payload.tratamientoId
            ? String(payload.tratamientoId)
            : null,
          fecha: String(payload.fecha),
          horaInicio: String(payload.hora),
          motivo: String(payload.motivoConsulta || "Agendada vía asistente"),
        });
      } else if (proposal.tipoAccion === "CANCELAR_CITA") {
        await this.citasService.cancelarCita(user, String(payload.citaId), {
          motivoCancelacion: String(
            payload.motivo || "Cancelada vía asistente clínico",
          ),
        });
      } else if (proposal.tipoAccion === "REAGENDAR_CITA") {
        await this.citasService.reagendarCita(user, String(payload.citaId), {
          nuevaFecha: String(payload.nuevaFecha),
          nuevaHoraInicio: String(payload.nuevaHora),
          notificarPaciente: true,
        });
      } else if (proposal.tipoAccion === "MODIFICAR_ODONTOGRAMA") {
        await this.odontogramasService.actualizarDiente(
          user,
          String(payload.pacienteId),
          Number(payload.numeroFDI),
          {
            superficie: (payload.superficie as "oclusal") || "oclusal",
            estadoNuevo: (payload.nuevoEstado as "OBTURADO") || "OBTURADO",
            procedimiento: String(
              payload.procedimiento || "Actualización vía asistente clínico",
            ),
            nota: String(payload.nota || "Registrado con confirmación"),
          },
        );
      }

      const completedResponse = {
        mensaje:
          "Operación confirmada y aplicada exitosamente en el expediente clínico.",
        tarjetas: [],
        sugerencias: ["Ver mis citas", "Consultar odontograma"],
        accion_ejecutada: {
          tipo: proposal.tipoAccion,
          descripcion: proposal.descripcion,
          requiere_confirmacion: false,
        },
      };

      await this.prisma.chatPropuesta.update({
        where: { id: proposal.id },
        data: {
          ejecutada: true,
          resultadoJson: JSON.stringify(completedResponse),
        },
      });

      return completedResponse;
    }

    const q = dto.mensaje.trim().toLowerCase();

    // 2. Modo VISITANTE
    if (!user || effectiveRole === "VISITANTE") {
      const servicios = await this.citasService.listarServicios();
      if (
        q.includes("cita") ||
        q.includes("agendar") ||
        q.includes("historial") ||
        q.includes("odontograma") ||
        q.includes("cancelar")
      ) {
        return {
          mensaje:
            "Para consultar tu expediente personal, ver tu odontograma o agendar/cancelar citas a tu nombre, necesitas iniciar sesión en el portal del consultorio.",
          tarjetas: [
            {
              tipo: "TABLA_SERVICIOS",
              datos: servicios.slice(0, 3),
            },
          ],
          sugerencias: ["Ver servicios", "Iniciar sesión"],
          accion_ejecutada: {
            tipo: "IR_A_LOGIN",
            descripcion: "Iniciar sesión ahora",
            requiere_confirmacion: false,
          },
        };
      }

      return {
        mensaje:
          "¡Hola! Soy el Asistente Digital de Lumina Odontología. Atendemos de Lunes a Sábado de 08:30 a 20:00 hrs. Estos son nuestros servicios clínicos y aranceles orientativos:",
        tarjetas: [
          {
            tipo: "TABLA_SERVICIOS",
            datos: servicios,
          },
        ],
        sugerencias: ["Ver horarios", "Iniciar sesión para agendar"],
        accion_ejecutada: {
          tipo: "MOSTRAR_SERVICIOS",
          descripcion: "Catálogo de servicios odontológicos",
          requiere_confirmacion: false,
        },
      };
    }

    // 3. Usuario autenticado (PACIENTE o DENTISTA)
    const pacId =
      effectivePacienteId ||
      (await this.prisma.paciente.findFirst({ orderBy: { id: "asc" } }))?.id;
    if (!pacId) {
      throw new NotFoundException("Expediente clínico no encontrado.");
    }

    const [paciente, citas, tratamientos, odontograma, servicios] =
      await Promise.all([
        this.pacientesService.obtenerPacientePorId(user, pacId),
        this.citasService.listarCitas(user, pacId),
        this.pacientesService.obtenerTratamientos(user, pacId),
        this.odontogramasService.obtenerOdontograma(user, pacId),
        this.citasService.listarServicios(),
      ]);

    // Propuesta de modificación de odontograma (solo DENTISTA)
    if (
      user.rol === "DENTISTA" &&
      (q.includes("marcar") ||
        q.includes("registrar") ||
        q.includes("obturado") ||
        q.includes("caries"))
    ) {
      const fdiMatch = q.match(/\b(1[1-8]|2[1-8]|3[1-8]|4[1-8])\b/);
      const numeroFDI = fdiMatch ? Number(fdiMatch[1]) : 16;
      const nuevoEstado = q.includes("caries") ? "CARIES" : "OBTURADO";
      const descripcion = `Actualizar diente #${numeroFDI} a ${nuevoEstado} en expediente de ${paciente.nombre_completo}`;
      const proposal = await this.createProposal(
        contextKey,
        "MODIFICAR_ODONTOGRAMA",
        descripcion,
        {
          pacienteId: pacId,
          numeroFDI,
          superficie: "oclusal",
          nuevoEstado,
          procedimiento: `Actualización clínica asistida en #${numeroFDI}`,
          nota: `Cambio a ${nuevoEstado} confirmado por ${user.nombre_completo}`,
        },
      );

      return {
        mensaje: `He preparado la actualización del diente #${numeroFDI} (${nuevoEstado}) para ${paciente.nombre_completo}. Confirma para guardarla en el odontograma y el registro de auditoría:`,
        tarjetas: [
          {
            tipo: "MINI_ODONTOGRAMA",
            datos: odontograma,
          },
        ],
        sugerencias: ["Ver odontograma", "Ver tratamientos"],
        accion_ejecutada: {
          tipo: "MODIFICAR_ODONTOGRAMA",
          descripcion,
          requiere_confirmacion: true,
          payload_confirmacion: proposal,
        },
      };
    }

    // Propuesta para agendar cita
    if (q.includes("agendar") || q.includes("nueva cita") || q.includes("reservar")) {
      const dentistId = effectiveDentistaId || paciente.odontologo_cabecera_id;
      const service = servicios[0];
      let targetDate = addDays(todayInClinic(), 2);
      let targetTime = "09:00";

      for (let i = 1; i <= 14; i++) {
        const day = addDays(todayInClinic(), i);
        const slots = await this.citasService.obtenerDisponibilidad(
          dentistId,
          day,
          service.id,
        );
        const firstAvailable = slots.find((s) => s.disponible);
        if (firstAvailable) {
          targetDate = day;
          targetTime = firstAvailable.hora;
          break;
        }
      }

      const descripcion = `Agendar ${service.nombre} el ${targetDate} a las ${targetTime}`;
      const proposal = await this.createProposal(
        contextKey,
        "AGENDAR_CITA",
        descripcion,
        {
          pacienteId: pacId,
          dentistaId: dentistId,
          servicioId: service.id,
          fecha: targetDate,
          hora: targetTime,
          motivoConsulta: `Cita de ${service.nombre} solicitada por asistente`,
        },
      );

      return {
        mensaje: `Propuesta de cita disponible para ${paciente.nombre_completo}: ${service.nombre} el ${targetDate} a las ${targetTime} hrs. Confirma para agendar:`,
        tarjetas: [
          {
            tipo: "TARJETA_CITAS",
            datos: citas.slice(0, 3),
          },
        ],
        sugerencias: ["Ver mis citas", "Ver servicios"],
        accion_ejecutada: {
          tipo: "AGENDAR_CITA",
          descripcion,
          requiere_confirmacion: true,
          payload_confirmacion: proposal,
        },
      };
    }

    // Consulta de odontograma
    if (q.includes("odontograma") || q.includes("diente")) {
      return {
        mensaje: `Aquí tienes el estado actual del odontograma de 32 piezas FDI de ${paciente.nombre_completo}:`,
        tarjetas: [
          {
            tipo: "MINI_ODONTOGRAMA",
            datos: odontograma,
          },
        ],
        sugerencias: ["Ver tratamientos", "Ver citas"],
        accion_ejecutada: {
          tipo: "ABRIR_ODONTOGRAMA",
          descripcion: "Visualización de odontograma FDI",
          requiere_confirmacion: false,
        },
      };
    }

    // Consulta de tratamientos
    if (q.includes("tratamiento") || q.includes("presupuesto") || q.includes("avance")) {
      return {
        mensaje: `Estos son los planes de tratamiento registrados en el expediente de ${paciente.nombre_completo}:`,
        tarjetas: [
          {
            tipo: "RESUMEN_TRATAMIENTOS",
            datos: tratamientos,
          },
        ],
        sugerencias: ["Agendar cita", "Ver odontograma"],
        accion_ejecutada: {
          tipo: "NINGUNA",
          descripcion: "Resumen de tratamientos",
          requiere_confirmacion: false,
        },
      };
    }

    // Respuesta por defecto con resumen de citas
    return {
      mensaje: `Expediente activo: ${paciente.nombre_completo} (${paciente.codigo_expediente}). Tienes ${citas.filter((c) => c.estado !== "CANCELADA").length} citas registradas y ${tratamientos.length} planes de tratamiento.`,
      tarjetas: [
        {
          tipo: "TARJETA_CITAS",
          datos: citas,
        },
      ],
      sugerencias: [
        "Ver odontograma",
        "Ver tratamientos",
        "Agendar nueva cita",
      ],
      accion_ejecutada: {
        tipo: "MOSTRAR_CITAS",
        descripcion: "Listado de citas del expediente",
        requiere_confirmacion: false,
      },
    };
  }

  private async createProposal(
    contextKey: string,
    tipoAccion: string,
    descripcion: string,
    payload: Record<string, unknown>,
  ): Promise<{ id: string; token: string }> {
    const id = `prop-${randomUUID().slice(0, 8)}`;
    const token = randomUUID();
    await this.prisma.chatPropuesta.create({
      data: {
        id,
        token,
        contextKey,
        tipoAccion,
        descripcion,
        payloadJson: JSON.stringify(payload),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });
    return { id, token };
  }
}
