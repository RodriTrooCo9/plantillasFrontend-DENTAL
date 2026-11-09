import { ConflictException, ForbiddenException } from "@nestjs/common";
import { ChatService } from "./chat.service";
import { PrismaService } from "../prisma/prisma.service";
import { CitasService } from "../citas/citas.service";
import { OdontogramasService } from "../odontogramas/odontogramas.service";
import { PacientesService } from "../pacientes/pacientes.service";
import type { UserResponseDto } from "../auth/dto/auth.dto";

describe("Servicio de Asistente Clínico Conversacional (ChatService)", () => {
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
    const prisma = {
      paciente: {
        findFirst: jest.fn().mockResolvedValue({ id: "pac-prueba1" }),
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
      listarServicios: jest.fn().mockResolvedValue([
        { id: "srv-limpieza", nombre: "Profilaxis", precioBaseMXN: 950 },
      ]),
      listarCitas: jest.fn().mockResolvedValue([
        { id: "cit-1", estado: "CONFIRMADA", fecha: "2027-07-01" },
      ]),
      obtenerDisponibilidad: jest
        .fn()
        .mockResolvedValue([{ hora: "09:00", disponible: true }]),
      agendarCita: jest.fn().mockResolvedValue({}),
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
      service: new ChatService(
        prisma,
        citasService,
        odontogramasService,
        pacientesService,
      ),
      citasService,
      odontogramasService,
    };
  };

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
