import { ConflictException, ForbiddenException } from "@nestjs/common";
import type { UserResponseDto } from "../auth/dto/auth.dto";

jest.mock("ollama-ai-provider", () => ({
  createOllama: jest.fn(() => jest.fn()),
}));

jest.mock("ai", () => ({
  tool: jest.fn((def) => def),
  streamText: jest.fn(() => ({
    pipeUIMessageStreamToResponse: jest.fn(),
  })),
  stepCountIs: jest.fn(() => () => false),
  convertToModelMessages: jest.fn(async (msgs) => msgs),
}));

jest.mock("ai/test", () => ({
  MockLanguageModelV4: jest.fn(),
}));

import { ChatService } from "./chat.service";
import { PrismaService } from "../prisma/prisma.service";
import { CitasService } from "../citas/citas.service";
import { OdontogramasService } from "../odontogramas/odontogramas.service";
import { PacientesService } from "../pacientes/pacientes.service";

describe("Servicio de Asistente Clínico Inteligente (ChatService)", () => {
  const dentistaUser: UserResponseDto = {
    id: "usr-admin",
    email: "admin@demo.com",
    nombre_completo: "Dr. Admin Principal",
    rol: "DENTISTA",
    paciente_id: null,
    dentista_id: "den-admin",
    avatar_url: null,
  };

  const pacienteUser: UserResponseDto = {
    id: "usr-prueba1",
    email: "prueba1@demo.com",
    nombre_completo: "Usuario Prueba 1",
    rol: "PACIENTE",
    paciente_id: "pac-prueba1",
    dentista_id: null,
    avatar_url: null,
  };

  const createSetup = () => {
    const propuestas = new Map<string, Record<string, unknown>>();
    const mockPaciente = {
      id: "pac-prueba1",
      documento: "CI-123456",
      codigoExpediente: "EXP-2026-9001",
      nombreCompleto: "Usuario Prueba 1",
      email: "prueba1@demo.com",
      telefono: "+52 55 9999 0001",
      edad: 32,
      alergias: ["Penicilina"],
      alertasClinicas: ["Hipertensión controlada"],
      odontologoCabeceraId: "den-admin",
      odontologoCabeceraNombre: "Dr. Admin Principal",
      activo: true,
      citas: [
        {
          id: "cit-1",
          fecha: "2026-11-25",
          horaInicio: "10:00",
          servicioNombre: "Profilaxis",
          dentistaNombre: "Dr. Admin Principal",
          estado: "CONFIRMADA",
        },
      ],
      tratamientos: [
        {
          id: "trt-1",
          nombre: "Profilaxis",
          estado: "PLANIFICADO",
          progresoPorcentaje: 0,
          costoTotal: 950,
          pagos: [],
        },
      ],
    };

    const mockDentista = {
      id: "den-admin",
      nombreCompleto: "Dr. Admin Principal",
      especialidad: "Odontología Integral y Rehabilitación",
    };

    const mockServicio = {
      id: "srv-eval-01",
      codigo: "SRV-EVAL-01",
      nombre: "Diagnóstico Integral y Profilaxis",
      categoria: "Odontología Preventiva",
      descripcionCorta: "Limpieza profunda y valoración dental",
      protocoloClinico: "NOM-013-SSA2",
      beneficioMedible: "Eliminación de sarro y biopelícula",
      precioBaseMXN: 950,
      duracionMinutos: 45,
      garantiaAnios: 1,
    };

    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
      paciente: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          if (where?.OR) {
            return Promise.resolve(mockPaciente);
          }
          return Promise.resolve(mockPaciente);
        }),
        findUnique: jest.fn().mockResolvedValue(mockPaciente),
        count: jest.fn().mockResolvedValue(1),
      },
      dentista: {
        findUnique: jest.fn().mockResolvedValue(mockDentista),
        findFirst: jest.fn().mockResolvedValue(mockDentista),
        count: jest.fn().mockResolvedValue(1),
      },
      servicio: {
        findMany: jest.fn().mockResolvedValue([mockServicio]),
        findFirst: jest.fn().mockResolvedValue(mockServicio),
        count: jest.fn().mockResolvedValue(1),
      },
      cita: {
        count: jest.fn().mockResolvedValue(3),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve(data)),
      },
      tratamiento: {
        count: jest.fn().mockResolvedValue(2),
      },
      chatPropuesta: {
        create: jest.fn().mockImplementation(({ data }) => {
          propuestas.set(data.id, data);
          return Promise.resolve(data);
        }),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(propuestas.get(where.id) || null);
        }),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const item = propuestas.get(where.id)!;
          Object.assign(item, data);
          return Promise.resolve(item);
        }),
      },
    } as unknown as PrismaService;

    const citasService = {
      listarServicios: jest.fn().mockResolvedValue([mockServicio]),
      listarCitas: jest.fn().mockResolvedValue([
        { id: "cit-1", estado: "CONFIRMADA", fecha: "2027-07-01" },
      ]),
      obtenerDisponibilidad: jest.fn().mockResolvedValue([
        { hora: "09:00", disponible: true },
        { hora: "09:30", disponible: false, motivoNoDisponible: "Horario reservado" },
      ]),
      agendarCita: jest.fn().mockResolvedValue({
        id: "cit-nueva-1",
        fecha: "2026-11-20",
        horaInicio: "09:00",
        costoMXN: 950,
      }),
      cancelarCita: jest.fn().mockResolvedValue({}),
      reagendarCita: jest.fn().mockResolvedValue({}),
    } as unknown as CitasService;

    const odontogramasService = {
      obtenerOdontograma: jest.fn().mockResolvedValue({
        pacienteId: "pac-prueba1",
        dientes: [],
        historial_cambios: [],
      }),
      actualizarDiente: jest.fn().mockResolvedValue({}),
    } as unknown as OdontogramasService;

    const pacientesService = {
      obtenerPacientePorId: jest.fn().mockResolvedValue({
        id: "pac-prueba1",
        nombre_completo: "Usuario Prueba 1",
        codigo_expediente: "EXP-2026-9001",
        odontologo_cabecera_id: "den-admin",
      }),
      obtenerTratamientos: jest.fn().mockResolvedValue([
        { id: "trt-1", nombre: "Ortodoncia", progresoPorcentaje: 50 },
      ]),
    } as unknown as PacientesService;

    return {
      propuestas,
      prisma,
      service: new ChatService(
        prisma,
        citasService,
        odontogramasService,
        pacientesService,
      ),
      citasService,
      odontogramasService,
      pacientesService,
      mockPaciente,
      mockServicio,
      mockDentista,
    };
  };

  describe("Health Check de Endpoints y Servicios", () => {
    it("verifica la salud de la base de datos y endpoints internos devolviendo status ok", async () => {
      // Arrange
      const { service } = createSetup();

      // Act
      const healthDb = await service.verificarSaludEndpoint("database");
      const healthAgenda = await service.verificarSaludEndpoint("agenda_citas");
      const healthCatalog = await service.verificarSaludEndpoint("catalogo_servicios");
      const estado = await service.obtenerEstadoSistema();

      // Assert
      expect(healthDb.ok).toBe(true);
      expect(healthAgenda.ok).toBe(true);
      expect(healthCatalog.ok).toBe(true);
      expect(estado.status).toBe("success");
      expect(estado.servicios.baseDeDatos).toBe("OPERATIVA");
      expect(estado.servicios.catalogoServicios).toBe("OPERATIVO");
    });

    it("captura caídas de endpoint de base de datos reportando error estructurado", async () => {
      // Arrange
      const { service, prisma } = createSetup();
      (prisma.$queryRaw as jest.Mock).mockRejectedValueOnce(
        new Error("Conexión rechazada en postgres:5432"),
      );

      // Act
      const health = await service.verificarSaludEndpoint("database");

      // Assert
      expect(health.ok).toBe(false);
      expect(health.error).toContain("Conexión rechazada");
    });
  });

  describe("Herramientas de Tool Calling (AI SDK Tools con Zod)", () => {
    it("verificarDisponibilidadCitas retorna los horarios libres de la agenda", async () => {
      // Arrange
      const { service } = createSetup();
      const tools = service.obtenerTools();

      // Act
      const res = await (tools.verificarDisponibilidadCitas as any).execute({
        fecha: "2026-11-20",
        especialidad: "General",
      });

      // Assert
      expect(res.status).toBe("success");
      expect(res.endpointOperativo).toBe(true);
      expect(res.horariosLibres).toContain("09:00");
      expect(res.totalHorariosLibres).toBe(1);
    });

    it("agendarCitaPaciente valida existencia del paciente y agenda la cita con éxito", async () => {
      // Arrange
      const { service, citasService } = createSetup();
      const tools = service.obtenerTools();

      // Act
      const res = await (tools.agendarCitaPaciente as any).execute({
        documentoIdentidad: "CI-123456",
        telefono: "+52 55 9999 0001",
        nombreCompleto: "Usuario Prueba 1",
        fecha: "2026-11-20",
        horaInicio: "09:00",
        motivo: "Revisión general semestral",
      });

      // Assert
      expect(res.status).toBe("success");
      expect(res.codigo).toBe("CITA_CONFIRMADA");
      expect(res.cita.id).toBe("cit-nueva-1");
      expect(citasService.agendarCita).toHaveBeenCalledTimes(1);
    });

    it("agendarCitaPaciente reporta error si el paciente no tiene expediente registrado", async () => {
      // Arrange
      const { service, prisma } = createSetup();
      (prisma.paciente.findFirst as jest.Mock).mockResolvedValueOnce(null);
      const tools = service.obtenerTools();

      // Act
      const res = await (tools.agendarCitaPaciente as any).execute({
        documentoIdentidad: "INEXISTENTE-999",
        telefono: "+52 55 0000 0000",
        nombreCompleto: "Persona No Registrada",
        fecha: "2026-11-20",
        horaInicio: "09:00",
        motivo: "Dolor",
      });

      // Assert
      expect(res.status).toBe("error");
      expect(res.codigo).toBe("PACIENTE_NO_ENCONTRADO");
      expect(res.contactoRecepcion).toContain("Lumina Odontología");
    });

    it("consultarCatalogoTratamientos consulta aranceles y protocolos de servicios", async () => {
      // Arrange
      const { service } = createSetup();
      const tools = service.obtenerTools();

      // Act
      const res = await (tools.consultarCatalogoTratamientos as any).execute({
        categoria: "Odontología Preventiva",
      });

      // Assert
      expect(res.status).toBe("success");
      expect(res.servicios.length).toBeGreaterThan(0);
      expect(res.servicios[0].codigo).toBe("SRV-EVAL-01");
      expect(res.servicios[0].precioBaseMXN).toBe(950);
    });

    it("consultarEstadoPaciente reporta próximas citas y saldo pendiente validando documento", async () => {
      // Arrange
      const { service } = createSetup();
      const tools = service.obtenerTools();

      // Act
      const res = await (tools.consultarEstadoPaciente as any).execute({
        documentoIdentidad: "CI-123456",
      });

      // Assert
      expect(res.status).toBe("success");
      expect(res.paciente.nombreCompleto).toBe("Usuario Prueba 1");
      expect(res.proximasCitas.length).toBeDefined();
    });

    it("verificarEstadoSistema ejecuta el diagnóstico en tiempo real", async () => {
      // Arrange
      const { service } = createSetup();
      const tools = service.obtenerTools();

      // Act
      const res = await (tools.verificarEstadoSistema as any).execute({});

      // Assert
      expect(res.status).toBe("success");
      expect(res.servicios.baseDeDatos).toBe("OPERATIVA");
    });
  });

  describe("System Prompt Estricto", () => {
    it("incluye reglas médicas y de validación obligatoria con herramientas", () => {
      // Arrange
      const { service } = createSetup();

      // Act
      const prompt = service.obtenerSystemPrompt();

      // Assert
      expect(prompt).toContain("NUNCA inventes horarios disponibles");
      expect(prompt).toContain("NUNCA recetes medicamentos");
      expect(prompt).toContain("Lumina Odontología");
      expect(prompt).toContain("verificarDisponibilidadCitas");
    });
  });

  describe("Procesamiento Legacy y Confirmación de Operaciones Clínicas", () => {
    it("responde a un visitante mostrando catálogo público o pidiendo iniciar sesión para consultas privadas", async () => {
      // Arrange
      const { service } = createSetup();

      // Act
      const resCatalogo = await service.processChat(null, {
        mensaje: "¿Cuáles son sus horarios y servicios?",
        rol: "VISITANTE",
      });
      const resPrivado = await service.processChat(null, {
        mensaje: "Quiero ver mis citas y mi odontograma",
        rol: "VISITANTE",
      });

      // Assert
      expect(resCatalogo.accion_ejecutada.tipo).toBe("MOSTRAR_SERVICIOS");
      expect(resPrivado.accion_ejecutada.tipo).toBe("IR_A_LOGIN");
    });

    it("consulta odontograma, tratamientos, citas y genera propuesta de agendamiento para paciente autenticado", async () => {
      // Arrange
      const { service, citasService } = createSetup();

      // Act
      const resOdonto = await service.processChat(pacienteUser, {
        mensaje: "Ver mi odontograma",
        rol: "PACIENTE",
        pacienteId: "pac-prueba1",
      });
      const resTrt = await service.processChat(pacienteUser, {
        mensaje: "Ver avance de mi tratamiento",
        rol: "PACIENTE",
        pacienteId: "pac-prueba1",
      });
      const resResumen = await service.processChat(pacienteUser, {
        mensaje: "Mostrar mis citas programadas",
        rol: "PACIENTE",
        pacienteId: "pac-prueba1",
      });
      const resAgendar = await service.processChat(pacienteUser, {
        mensaje: "Quiero agendar una nueva cita",
        rol: "PACIENTE",
        pacienteId: "pac-prueba1",
      });

      // Assert
      expect(resOdonto.accion_ejecutada.tipo).toBe("ABRIR_ODONTOGRAMA");
      expect(resTrt.tarjetas[0].tipo).toBe("RESUMEN_TRATAMIENTOS");
      expect(resResumen.accion_ejecutada.tipo).toBe("MOSTRAR_CITAS");
      expect(resAgendar.accion_ejecutada.requiere_confirmacion).toBe(true);

      // Confirmar la cita agendada
      const confirmacionCita = resAgendar.accion_ejecutada
        .payload_confirmacion as { id: string; token: string };
      await service.processChat(pacienteUser, {
        mensaje: "Confirmar",
        rol: "PACIENTE",
        pacienteId: "pac-prueba1",
        confirmarAccion: confirmacionCita,
      });
      expect(citasService.agendarCita).toHaveBeenCalledTimes(1);
    });

    it("genera propuesta con token criptográfico para modificar odontograma y exige el mismo contexto para ejecutarla", async () => {
      // Arrange
      const { service, odontogramasService, propuestas } = createSetup();

      // Act: Solicitar modificación
      const respuestaPropuesta = await service.processChat(dentistaUser, {
        mensaje: "Registrar obturación en diente 16",
        rol: "DENTISTA",
        pacienteId: "pac-prueba1",
        dentistaId: "den-admin",
      });

      // Assert
      expect(respuestaPropuesta.accion_ejecutada.tipo).toBe(
        "MODIFICAR_ODONTOGRAMA",
      );
      expect(respuestaPropuesta.accion_ejecutada.requiere_confirmacion).toBe(
        true,
      );
      const confirmPayload = respuestaPropuesta.accion_ejecutada
        .payload_confirmacion as { id: string; token: string };

      // Intento de confirmar sin sesión o cambiando de paciente -> 403 Forbidden
      await expect(
        service.processChat(null, {
          mensaje: "Confirmar",
          rol: "VISITANTE",
          confirmarAccion: confirmPayload,
        }),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.processChat(dentistaUser, {
          mensaje: "Confirmar",
          rol: "DENTISTA",
          pacienteId: "pac-otro",
          dentistaId: "den-admin",
          confirmarAccion: confirmPayload,
        }),
      ).rejects.toThrow(ForbiddenException);

      // Confirmación legítima e idempotente
      const confirmada1 = await service.processChat(dentistaUser, {
        mensaje: "Confirmar",
        rol: "DENTISTA",
        pacienteId: "pac-prueba1",
        dentistaId: "den-admin",
        confirmarAccion: confirmPayload,
      });
      const confirmada2 = await service.processChat(dentistaUser, {
        mensaje: "Confirmar",
        rol: "DENTISTA",
        pacienteId: "pac-prueba1",
        dentistaId: "den-admin",
        confirmarAccion: confirmPayload,
      });
      expect(confirmada1.mensaje).toMatch(/confirmada y aplicada exitosamente/i);
      expect(confirmada2.mensaje).toEqual(confirmada1.mensaje);
      expect(odontogramasService.actualizarDiente).toHaveBeenCalledTimes(1);

      // Propuesta expirada lanza 409 Conflict
      propuestas.set("prop-exp", {
        id: "prop-exp",
        token: "tok-exp",
        contextKey: JSON.stringify(["DENTISTA", "pac-prueba1", "den-admin"]),
        tipoAccion: "CANCELAR_CITA",
        descripcion: "Cancelar",
        payloadJson: JSON.stringify({ citaId: "cit-1" }),
        expiresAt: new Date(Date.now() - 1000),
        ejecutada: false,
      });
      await expect(
        service.processChat(dentistaUser, {
          mensaje: "Confirmar",
          rol: "DENTISTA",
          pacienteId: "pac-prueba1",
          dentistaId: "den-admin",
          confirmarAccion: { id: "prop-exp", token: "tok-exp" },
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
