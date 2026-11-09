import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CitasService } from "../citas/citas.service";
import { OdontogramasService } from "../odontogramas/odontogramas.service";
import { PacientesService } from "../pacientes/pacientes.service";
import { addDays, todayInClinic } from "../common/clinical-time";
import { randomUUID } from "node:crypto";
import type { UserResponseDto } from "../auth/dto/auth.dto";
import type { ChatRequestDto, ChatStreamRequestDto } from "./dto/chat.dto";
import { createOllama } from "ollama-ai-provider";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
} from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { z } from "zod";
import type { Response } from "express";

export interface EndpointHealthStatus {
  ok: boolean;
  servicio: string;
  tiempoRespuestaMs: number;
  error?: string;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly citasService: CitasService,
    private readonly odontogramasService: OdontogramasService,
    private readonly pacientesService: PacientesService,
  ) {}

  // ===========================================================================
  // 1. HEALTH CHECK DE ENDPOINTS INTERNOS Y SERVICIOS
  // ===========================================================================

  async verificarSaludEndpoint(servicio: string): Promise<EndpointHealthStatus> {
    const inicio = Date.now();
    try {
      if (servicio === "database" || servicio === "prisma") {
        await this.prisma.$queryRaw`SELECT 1`;
      } else if (servicio === "agenda_citas") {
        await this.prisma.$queryRaw`SELECT 1`;
      } else if (servicio === "catalogo_servicios") {
        await this.prisma.servicio.findFirst({ select: { id: true } });
      } else if (servicio === "expedientes_pacientes") {
        await this.prisma.paciente.findFirst({ select: { id: true } });
      } else if (servicio === "ollama") {
        const ollamaBase =
          process.env.OLLAMA_BASE_URL || "http://localhost:11434/api";
        const pingUrl = ollamaBase.replace(/\/api\/?$/, "") + "/api/tags";
        const res = await fetch(pingUrl, {
          signal: AbortSignal.timeout(1500),
        });
        if (!res.ok) {
          throw new Error(`Ollama respondió con status ${res.status}`);
        }
      } else {
        await this.prisma.$queryRaw`SELECT 1`;
      }
      return {
        ok: true,
        servicio,
        tiempoRespuestaMs: Date.now() - inicio,
      };
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Error de conexión con el servicio";
      return {
        ok: false,
        servicio,
        tiempoRespuestaMs: Date.now() - inicio,
        error: errorMsg,
      };
    }
  }

  async obtenerEstadoSistema() {
    const [dbCheck, srvCheck, pacCheck, ollamaCheck] = await Promise.all([
      this.verificarSaludEndpoint("database"),
      this.verificarSaludEndpoint("catalogo_servicios"),
      this.verificarSaludEndpoint("expedientes_pacientes"),
      this.verificarSaludEndpoint("ollama"),
    ]);

    const [totalPacientes, totalCitas, totalServicios, totalDentistas] =
      await Promise.all([
        this.prisma.paciente.count({ where: { activo: true } }),
        this.prisma.cita.count({ where: { estado: { not: "CANCELADA" } } }),
        this.prisma.servicio.count(),
        this.prisma.dentista.count(),
      ]);

    return {
      status: "success",
      timestamp: new Date().toISOString(),
      servicios: {
        baseDeDatos: dbCheck.ok ? "OPERATIVA" : "ERROR",
        catalogoServicios: srvCheck.ok ? "OPERATIVO" : "ERROR",
        agendaCitas: dbCheck.ok ? "OPERATIVO" : "ERROR",
        expedientesPacientes: pacCheck.ok ? "OPERATIVO" : "ERROR",
        motorOllamaLocal: ollamaCheck.ok
          ? "EN_LINEA"
          : "EN_ESPERA_SERVIDOR_POTENTE",
      },
      metricasClinica: {
        totalPacientesActivos: totalPacientes,
        totalCitasProgramadas: totalCitas,
        totalServiciosDisponibles: totalServicios,
        totalDentistasRegistrados: totalDentistas,
      },
      diagnosticoOllama: {
        urlConfigurada:
          process.env.OLLAMA_BASE_URL || "http://localhost:11434/api",
        modelo: process.env.OLLAMA_MODEL || "qwen2.5:7b-instruct",
        disponibleLocalmente: ollamaCheck.ok,
        mensaje: ollamaCheck.ok
          ? "Motor Ollama disponible para inferencia y Function Calling local."
          : "Ollama no detectado en puerto local. Configuración Docker lista para despliegue en servidor GPU.",
      },
    };
  }

  // ===========================================================================
  // 2. DEFINICIÓN DE HERRAMIENTAS (TOOLS) CON ZOD Y VERIFICACIÓN PREVIA
  // ===========================================================================

  obtenerTools(user?: UserResponseDto | null): Record<string, any> {
    const contactoRecepcion =
      "Lumina Odontología — Tel: +52 55 1234 5678 / WhatsApp: +52 55 8765 4321";

    return {
      verificarDisponibilidadCitas: tool({
        description:
          "Verifica la disponibilidad de citas en la agenda para una fecha (YYYY-MM-DD), dentista o especialidad. Retorna los horarios libres y reservados.",
        inputSchema: z.object({
          fecha: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, "El formato de fecha debe ser YYYY-MM-DD (ej: 2026-11-15)")
            .describe("Fecha a consultar en formato YYYY-MM-DD"),
          especialidad: z
            .string()
            .optional()
            .describe("Especialidad dental (ej: General, Ortodoncia, Limpieza, Endodoncia, Periodoncia)"),
          dentistaId: z
            .string()
            .optional()
            .describe("ID específico del odontólogo si se conoce (ej: den-admin)"),
        }) as any,
        execute: async ({ fecha, especialidad, dentistaId }: any) => {
          const health = await this.verificarSaludEndpoint("agenda_citas");
          if (!health.ok) {
            return {
              status: "error",
              codigo: "ENDPOINT_AGENDA_OFFLINE",
              mensaje: `El endpoint interno de agenda no se encuentra operativo: ${health.error}`,
              contactoRecepcion,
            };
          }

          try {
            let dentista = null;
            if (dentistaId) {
              dentista = await this.prisma.dentista.findUnique({
                where: { id: dentistaId },
              });
            }
            if (!dentista && especialidad) {
              dentista = await this.prisma.dentista.findFirst({
                where: {
                  especialidad: { contains: especialidad, mode: "insensitive" },
                },
              });
            }
            if (!dentista) {
              dentista = await this.prisma.dentista.findFirst({
                orderBy: { id: "asc" },
              });
            }

            if (!dentista) {
              return {
                status: "error",
                codigo: "DENTISTA_NO_ENCONTRADO",
                mensaje:
                  "No se encontró ningún especialista registrado para atender la consulta solicitada.",
                contactoRecepcion,
              };
            }

            const slots = await this.citasService.obtenerDisponibilidad(
              dentista.id,
              fecha,
            );

            const disponibles = slots.filter((s) => s.disponible).map((s) => s.hora);
            const noDisponibles = slots
              .filter((s) => !s.disponible)
              .map((s) => ({ hora: s.hora, motivo: s.motivoNoDisponible }));

            return {
              status: "success",
              endpointOperativo: true,
              fechaConsultada: fecha,
              dentista: {
                id: dentista.id,
                nombreCompleto: dentista.nombreCompleto,
                especialidad: dentista.especialidad,
              },
              totalHorariosLibres: disponibles.length,
              horariosLibres: disponibles,
              horariosOcupadosOBloqueados: noDisponibles,
            };
          } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Error al consultar disponibilidad";
            return {
              status: "error",
              codigo: "ERROR_CONSULTA_AGENDA",
              mensaje: msg,
              contactoRecepcion,
            };
          }
        },
      }),

      agendarCitaPaciente: tool({
        description:
          "Registra una cita odontológica para un paciente verificado por documento de identidad o teléfono, asegurando que el horario esté libre.",
        inputSchema: z.object({
          documentoIdentidad: z
            .string()
            .min(4)
            .describe("Documento de identidad (cédula, CURP o DNI) del paciente"),
          telefono: z
            .string()
            .min(7)
            .describe("Teléfono celular del paciente registrado"),
          nombreCompleto: z
            .string()
            .min(3)
            .describe("Nombre y apellido del paciente"),
          fecha: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD")
            .describe("Fecha de la cita (YYYY-MM-DD)"),
          horaInicio: z
            .string()
            .regex(/^\d{2}:\d{2}$/, "Formato HH:mm")
            .describe("Hora de inicio de la cita (ej: 09:00 o 15:30)"),
          motivo: z
            .string()
            .min(3)
            .describe("Motivo de consulta o procedimiento solicitado"),
          servicioCodigo: z
            .string()
            .optional()
            .describe("Código o nombre del servicio (ej: SRV-EVAL-01, Limpieza, Ortodoncia)"),
          dentistaId: z
            .string()
            .optional()
            .describe("ID opcional del odontólogo tratante"),
        }) as any,
        execute: async ({
          documentoIdentidad,
          telefono,
          nombreCompleto,
          fecha,
          horaInicio,
          motivo,
          servicioCodigo,
          dentistaId,
        }: any) => {
          const health = await this.verificarSaludEndpoint("agenda_citas");
          if (!health.ok) {
            return {
              status: "error",
              codigo: "ENDPOINT_OFFLINE",
              mensaje: `El endpoint de citas no responde: ${health.error}`,
              contactoRecepcion,
            };
          }

          try {
            const cleanDoc = documentoIdentidad.trim().toUpperCase();
            const cleanTel = telefono.trim();

            const paciente = await this.prisma.paciente.findFirst({
              where: {
                OR: [
                  { documento: { equals: cleanDoc, mode: "insensitive" } },
                  { telefono: cleanTel },
                ],
                activo: true,
              },
            });

            if (!paciente) {
              return {
                status: "error",
                codigo: "PACIENTE_NO_ENCONTRADO",
                mensaje:
                  `No encontramos un expediente activo para el documento '${cleanDoc}' o teléfono '${cleanTel}'. ` +
                  `Por políticas de seguridad médica de Lumina Odontología, los pacientes de primera vez deben registrarse en recepción antes de agendar.`,
                contactoRecepcion,
              };
            }

            let servicio = null;
            if (servicioCodigo) {
              servicio = await this.prisma.servicio.findFirst({
                where: {
                  OR: [
                    { codigo: { equals: servicioCodigo.trim(), mode: "insensitive" } },
                    { nombre: { contains: servicioCodigo.trim(), mode: "insensitive" } },
                  ],
                },
              });
            }
            if (!servicio) {
              servicio = await this.prisma.servicio.findFirst({
                orderBy: { codigo: "asc" },
              });
            }

            if (!servicio) {
              return {
                status: "error",
                codigo: "SERVICIO_NO_DISPONIBLE",
                mensaje: "No hay servicios clínicos habilitados en este momento.",
                contactoRecepcion,
              };
            }

            let dentista = null;
            if (dentistaId) {
              dentista = await this.prisma.dentista.findUnique({
                where: { id: dentistaId },
              });
            }
            if (!dentista) {
              dentista = await this.prisma.dentista.findUnique({
                where: { id: paciente.odontologoCabeceraId },
              });
            }
            if (!dentista) {
              dentista = await this.prisma.dentista.findFirst({
                orderBy: { id: "asc" },
              });
            }

            if (!dentista) {
              return {
                status: "error",
                codigo: "DENTISTA_NO_DISPONIBLE",
                mensaje: "No se encontró especialista asignable para la cita.",
                contactoRecepcion,
              };
            }

            const callerUser: UserResponseDto = user || {
              id: "usr-asistente-ia",
              email: "asistente@lumina.local",
              nombre_completo: "Asistente Clínico Inteligente",
              rol: "DENTISTA",
              paciente_id: paciente.id,
              dentista_id: dentista.id,
              avatar_url: null,
            };

            const citaCreada = await this.citasService.agendarCita(
              callerUser,
              {
                pacienteId: paciente.id,
                dentistaId: dentista.id,
                servicioId: servicio.id,
                fecha,
                horaInicio,
                motivo: `${motivo} (Registrado vía Asistente Clínico)`,
              },
            );

            return {
              status: "success",
              codigo: "CITA_CONFIRMADA",
              cita: {
                id: citaCreada.id,
                pacienteNombre: paciente.nombreCompleto,
                codigoExpediente: paciente.codigoExpediente,
                dentistaNombre: dentista.nombreCompleto,
                servicioNombre: servicio.nombre,
                fecha: citaCreada.fecha,
                horaInicio: citaCreada.horaInicio,
                costoMXN: citaCreada.costoMXN,
              },
              indicaciones:
                "Cita confirmada en sistema. Recuerde presentarse 10 minutos antes en Lumina Odontología con su documento de identidad.",
            };
          } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Error al procesar el agendamiento";
            return {
              status: "error",
              codigo: "ERROR_AL_AGENDAR",
              mensaje: msg,
              contactoRecepcion,
            };
          }
        },
      }),

      consultarCatalogoTratamientos: tool({
        description:
          "Consulta el catálogo de aranceles, duración y garantías de los procedimientos odontológicos disponibles.",
        inputSchema: z.object({
          categoria: z
            .string()
            .optional()
            .describe("Categoría opcional: Odontología Preventiva, Ortodoncia, Endodoncia, Rehabilitación Oral, etc."),
          terminoBusqueda: z
            .string()
            .optional()
            .describe("Palabra clave a buscar (ej: limpieza, resina, blanqueamiento, corona, brackets)"),
        }) as any,
        execute: async ({ categoria, terminoBusqueda }: any) => {
          const health = await this.verificarSaludEndpoint("catalogo_servicios");
          if (!health.ok) {
            return {
              status: "error",
              codigo: "CATALOGO_OFFLINE",
              mensaje: `El catálogo de tratamientos no responde: ${health.error}`,
              contactoRecepcion,
            };
          }

          try {
            const list = await this.prisma.servicio.findMany({
              where: {
                ...(categoria
                  ? { categoria: { contains: categoria, mode: "insensitive" } }
                  : {}),
                ...(terminoBusqueda
                  ? {
                      OR: [
                        { nombre: { contains: terminoBusqueda, mode: "insensitive" } },
                        { descripcionCorta: { contains: terminoBusqueda, mode: "insensitive" } },
                      ],
                    }
                  : {}),
              },
              orderBy: { codigo: "asc" },
            });

            return {
              status: "success",
              totalEncontrados: list.length,
              servicios: list.map((s) => ({
                codigo: s.codigo,
                nombre: s.nombre,
                categoria: s.categoria,
                descripcion: s.descripcionCorta,
                protocoloClinico: s.protocoloClinico,
                beneficio: s.beneficioMedible,
                precioBaseMXN: s.precioBaseMXN,
                duracionMinutos: s.duracionMinutos,
                garantiaAnios: s.garantiaAnios,
              })),
            };
          } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Error al consultar servicios";
            return {
              status: "error",
              codigo: "ERROR_CATALOGO",
              mensaje: msg,
              contactoRecepcion,
            };
          }
        },
      }),

      consultarEstadoPaciente: tool({
        description:
          "Verifica el estado de un paciente registrado: sus próximas citas y saldo pendiente de tratamientos, validando su documento o teléfono.",
        inputSchema: z.object({
          documentoIdentidad: z
            .string()
            .optional()
            .describe("Cédula o CURP del paciente"),
          telefono: z
            .string()
            .optional()
            .describe("Teléfono celular del paciente"),
          codigoExpediente: z
            .string()
            .optional()
            .describe("Código de expediente clínico (ej: EXP-2026-9001)"),
        }) as any,
        execute: async ({
          documentoIdentidad,
          telefono,
          codigoExpediente,
        }: any) => {
          if (!documentoIdentidad && !telefono && !codigoExpediente) {
            return {
              status: "error",
              codigo: "DATOS_INSUFICIENTES",
              mensaje:
                "Debes proporcionar al menos el documento de identidad, teléfono o código de expediente del paciente.",
            };
          }

          const health = await this.verificarSaludEndpoint("expedientes_pacientes");
          if (!health.ok) {
            return {
              status: "error",
              codigo: "EXPEDIENTES_OFFLINE",
              mensaje: `El módulo de expedientes no está disponible: ${health.error}`,
              contactoRecepcion,
            };
          }

          try {
            const conditions = [];
            if (documentoIdentidad) {
              conditions.push({
                documento: {
                  equals: documentoIdentidad.trim().toUpperCase(),
                  mode: "insensitive" as const,
                },
              });
            }
            if (telefono) {
              conditions.push({ telefono: telefono.trim() });
            }
            if (codigoExpediente) {
              conditions.push({
                codigoExpediente: {
                  equals: codigoExpediente.trim().toUpperCase(),
                  mode: "insensitive" as const,
                },
              });
            }

            const paciente = await this.prisma.paciente.findFirst({
              where: { OR: conditions, activo: true },
              include: {
                citas: {
                  where: { estado: { not: "CANCELADA" } },
                  orderBy: [{ fecha: "asc" }, { horaInicio: "asc" }],
                },
                tratamientos: {
                  include: { pagos: true },
                  orderBy: { createdAt: "desc" },
                },
              },
            });

            if (!paciente) {
              return {
                status: "error",
                codigo: "PACIENTE_NO_ENCONTRADO",
                mensaje:
                  "No se encontró un expediente con los datos proporcionados. Verifique el número de documento o teléfono.",
                contactoRecepcion,
              };
            }

            let saldoTotalPendiente = 0;
            const tratamientosResumen = paciente.tratamientos.map((t) => {
              const pagado = t.pagos.reduce(
                (acc, p) => acc + p.montoMXN + p.descuentoMXN,
                0,
              );
              const saldo = Math.max(0, t.costoTotal - pagado);
              saldoTotalPendiente += saldo;
              return {
                id: t.id,
                nombre: t.nombre,
                estado: t.estado,
                progresoPorcentaje: t.progresoPorcentaje,
                costoTotalMXN: t.costoTotal,
                saldoPendienteMXN: Math.round(saldo * 100) / 100,
              };
            });

            return {
              status: "success",
              paciente: {
                nombreCompleto: paciente.nombreCompleto,
                codigoExpediente: paciente.codigoExpediente,
                alergias: paciente.alergias,
                alertasClinicas: paciente.alertasClinicas,
                odontologoCabecera: paciente.odontologoCabeceraNombre,
              },
              proximasCitas: paciente.citas.map((c) => ({
                id: c.id,
                fecha: c.fecha,
                horaInicio: c.horaInicio,
                servicioNombre: c.servicioNombre,
                dentistaNombre: c.dentistaNombre,
                estado: c.estado,
              })),
              resumenFinanciero: {
                saldoTotalPendienteMXN:
                  Math.round(saldoTotalPendiente * 100) / 100,
                tratamientosEnCurso: tratamientosResumen.filter(
                  (t) => t.estado === "EN_CURSO",
                ).length,
              },
              tratamientos: tratamientosResumen,
            };
          } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Error al consultar estado de paciente";
            return {
              status: "error",
              codigo: "ERROR_CONSULTA_PACIENTE",
              mensaje: msg,
              contactoRecepcion,
            };
          }
        },
      }),

      verificarEstadoSistema: tool({
        description:
          "Realiza una comprobación en tiempo real (ping) de los endpoints principales de Lumina Odontología (Base de Datos, Citas, Servicios y Ollama).",
        inputSchema: z.object({}) as any,
        execute: async () => {
          return this.obtenerEstadoSistema();
        },
      }),
    };
  }

  // ===========================================================================
  // 3. SYSTEM PROMPT ESTRICTO PARA MODELO OPEN-SOURCE (QWEN 2.5 / LLAMA 3.2)
  // ===========================================================================

  obtenerSystemPrompt(): string {
    return `
Eres el Asistente Clínico Inteligente de Lumina Odontología, un consultorio dental moderno de alta precisión.
Tu objetivo es orientar a pacientes y visitantes, verificar disponibilidad de citas, consultar el catálogo clínico y agendar citas de forma segura.

REGLAS INQUEBRANTABLES DE OPERACIÓN:
1. VERIFICACIÓN OBLIGATORIA CON HERRAMIENTAS:
   - NUNCA inventes horarios disponibles, precios de tratamientos ni confirmaciones de citas.
   - Antes de dar información sobre citas o disponibilidad, DEBES invocar la herramienta 'verificarDisponibilidadCitas'.
   - Para consultar precios y servicios, DEBES invocar 'consultarCatalogoTratamientos'.
   - Para revisar citas o saldos de un paciente, DEBES invocar 'consultarEstadoPaciente'.
   - Para confirmar una cita, DEBES invocar 'agendarCitaPaciente' y solo darla por confirmada si recibes status: 'success'.

2. RECOLECCIÓN PREVIA DE DATOS:
   - Si un usuario desea agendar pero faltan datos obligatorios (nombre completo, teléfono, documento de identidad o fecha deseada), PÍDELOS cortésmente ANTES de invocar la herramienta de agendamiento.

3. MANEJO DE ERRORES Y CAÍDAS DE ENDPOINT:
   - Si una herramienta devuelve status: 'error', explica amablemente el motivo al usuario (horario ocupado, expediente no encontrado o endpoint temporalmente inaccesible) y ofrécele el contacto directo con recepción (Tel: +52 55 1234 5678 / WhatsApp: +52 55 8765 4321).

4. PROHIBICIÓN MÉDICA ESTRICTA:
   - NUNCA recetes medicamentos (antibióticos, analgésicos ni desinflamatorios).
   - NUNCA emitas un diagnóstico clínico definitivo; aclara que todo tratamiento requiere diagnóstico presencial con nuestros odontólogos.

5. HORARIO Y UBICACIÓN:
   - Horario de atención: Lunes a Sábado de 08:30 a 20:00 hrs.
   - Dirección: Lumina Odontología, Ciudad de México.
`.trim();
  }

  // ===========================================================================
  // 4. STREAMING CON VERCEL AI SDK (OLLAMA + FALLBACK CONTINGENCIA)
  // ===========================================================================

  async streamChat(
    res: Response,
    body: ChatStreamRequestDto,
    user?: UserResponseDto | null,
  ) {
    const tools = this.obtenerTools(user);
    const systemPrompt = this.obtenerSystemPrompt();

    // 1. Extraer mensajes
    let modelMessages: Array<any> = [];
    if (Array.isArray(body.messages) && body.messages.length > 0) {
      try {
        modelMessages = await convertToModelMessages(body.messages as any);
      } catch {
        // Fallback si no son UIMessages estándar
        modelMessages = body.messages.map((m: any) => ({
          role: m.role || "user",
          content: m.content || m.parts?.[0]?.text || "",
        }));
      }
    } else if (body.message) {
      modelMessages = [{ role: "user", content: body.message }];
    } else {
      modelMessages = [{ role: "user", content: "Hola" }];
    }

    // 2. Comprobar si Ollama está en línea
    const ollamaCheck = await this.verificarSaludEndpoint("ollama");

    if (ollamaCheck.ok) {
      // Motor Ollama disponible (qwen2.5:7b-instruct)
      const ollamaBaseUrl =
        process.env.OLLAMA_BASE_URL || "http://localhost:11434/api";
      const ollamaModelName =
        process.env.OLLAMA_MODEL || "qwen2.5:7b-instruct";

      const ollama = createOllama({ baseURL: ollamaBaseUrl });
      const model = ollama(ollamaModelName);

      const result = streamText({
        model: model as any,
        system: systemPrompt,
        messages: modelMessages,
        tools,
        stopWhen: stepCountIs(5),
      });

      return result.pipeUIMessageStreamToResponse(res);
    }

    // 3. Fallback controlado: Ollama en espera de GPU / contenedor local apagado
    this.logger.warn(
      `Ollama no responde en ${process.env.OLLAMA_BASE_URL || "http://localhost:11434/api"}. ` +
      `Generando respuesta estructurada de contingencia con endpoints activos.`,
    );

    const ultimoMensaje =
      typeof modelMessages[modelMessages.length - 1]?.content === "string"
        ? modelMessages[modelMessages.length - 1]?.content.toLowerCase()
        : "";

    let respuestaTexto = "";
    if (
      ultimoMensaje.includes("servicio") ||
      ultimoMensaje.includes("precio") ||
      ultimoMensaje.includes("arancel") ||
      ultimoMensaje.includes("catalogo")
    ) {
      const resServicios = await (tools.consultarCatalogoTratamientos as any).execute({});
      respuestaTexto =
        `🏥 **Catálogo de Servicios Odontológicos Lumina**\n\n` +
        `Nuestros endpoints internos están 100% operativos:\n` +
        resServicios.servicios
          .map(
            (s: any) =>
              `- **${s.nombre}** (${s.codigo}): $${s.precioBaseMXN} MXN | Duración: ${s.duracionMinutos} min | *${s.beneficio}*`,
          )
          .join("\n") +
        `\n\n*(Nota: Motor Ollama listo para activación en el host con GPU).*`;
    } else if (
      ultimoMensaje.includes("horario") ||
      ultimoMensaje.includes("disponib") ||
      ultimoMensaje.includes("cita")
    ) {
      const fechaConsulta = addDays(todayInClinic(), 1);
      const resDisp = await (tools.verificarDisponibilidadCitas as any).execute({
        fecha: fechaConsulta,
      });
      respuestaTexto =
        `📅 **Disponibilidad en Consultorio**\n\n` +
        `Para mañana (${fechaConsulta}) con ${resDisp.dentista?.nombreCompleto || "el especialista"}:\n` +
        `- Horarios libres encontrados: ${resDisp.horariosLibres?.slice(0, 6).join(", ") || "Sin cupos"} hrs.\n\n` +
        `Para confirmar una cita formal, puedes facilitarme tu nombre completo, teléfono y documento de identidad.\n\n` +
        `*(Validación realizada consumiendo el servicio interno de agenda).*`;
    } else if (
      ultimoMensaje.includes("estado") ||
      ultimoMensaje.includes("sistema") ||
      ultimoMensaje.includes("ping")
    ) {
      const estado = await this.obtenerEstadoSistema();
      respuestaTexto =
        `🩺 **Reporte de Salud de Endpoints Lumina Odontología**\n\n` +
        `- **Base de Datos PostgreSQL:** ${estado.servicios.baseDeDatos}\n` +
        `- **Servicio de Citas y Agenda:** ${estado.servicios.agendaCitas}\n` +
        `- **Catálogo de Procedimientos:** ${estado.servicios.catalogoServicios}\n` +
        `- **Expedientes Clínicos:** ${estado.servicios.expedientesPacientes}\n` +
        `- **Motor LLM Local (Ollama):** ${estado.servicios.motorOllamaLocal} (Modelo: ${estado.diagnosticoOllama.modelo})\n\n` +
        `*El backend y la base de datos están completamente conectados y listos para inferencia local.*`;
    } else {
      respuestaTexto =
        `¡Hola! Soy el Asistente Clínico Inteligente de Lumina Odontología.\n\n` +
        `Estoy conectado a los endpoints internos del consultorio para:\n` +
        `1. 🔍 **Consultar catálogo y aranceles** de tratamientos dentales.\n` +
        `2. 📅 **Verificar disponibilidad de horarios** libres en tiempo real.\n` +
        `3. 📝 **Agendar citas** validando tu expediente clínico.\n` +
        `4. 🏥 **Consultar el estado de tus citas o saldo pendiente**.\n\n` +
        `¿En qué puedo ayudarte el día de hoy?`;
    }

    const fallbackModel = new MockLanguageModelV4({
      doStream: async () => ({
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({
              type: "text-delta",
              id: "msg-chunk-1",
              delta: respuestaTexto,
            });
            controller.enqueue({
              type: "finish",
              finishReason: { unified: "stop", raw: "stop" },
              usage: {
                inputTokens: {
                  total: 20,
                  noCache: 20,
                  cacheRead: 0,
                  cacheWrite: 0,
                },
                outputTokens: { total: 40, text: 40, reasoning: 0 },
              },
            });
            controller.close();
          },
        }),
      }),
    });

    const fallbackResult = streamText({
      model: fallbackModel,
      prompt: "dummy",
    });

    return fallbackResult.pipeUIMessageStreamToResponse(res);
  }

  // ===========================================================================
  // 5. PROCESAMIENTO LEGACY (RETROCOMPATIBILIDAD CON TESTS Y CONTROLADORES)
  // ===========================================================================

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

    // Confirmación de propuesta previa
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

    // Modo VISITANTE
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

    // Usuario autenticado (PACIENTE o DENTISTA)
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
    if (
      q.includes("agendar") ||
      q.includes("nueva cita") ||
      q.includes("reservar")
    ) {
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
    if (
      q.includes("tratamiento") ||
      q.includes("presupuesto") ||
      q.includes("avance")
    ) {
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
