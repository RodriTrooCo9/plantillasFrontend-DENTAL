import {
  ConflictException,
  ForbiddenException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { CitasService } from "./citas.service";
import { PrismaService } from "../prisma/prisma.service";
import type { UserResponseDto } from "../auth/dto/auth.dto";

describe("Servicio de Agenda y Citas Clínicas (CitasService)", () => {
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

  const createInMemoryPrisma = () => {
    const citasStore: Array<Record<string, unknown>> = [];
    const bloqueosStore: Array<Record<string, unknown>> = [];

    const dentistaMock = {
      id: "den-admin",
      nombreCompleto: "Dr. Admin Principal",
      email: "admin@demo.com",
      cedulaProfesional: "CED-9900001",
      especialidad: "Rehabilitación",
      biografiaCorta: "Bio",
      diasAtencion: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
      horariosDisponibles: ["09:00", "10:30", "12:00", "16:00"],
      bloqueos: bloqueosStore,
    };

    const servicioMock = {
      id: "srv-limpieza",
      codigo: "SRV-01",
      nombre: "Profilaxis Ultrasónica",
      duracionMinutos: 60,
      precioBaseMXN: 950,
    };

    const pacienteMock = {
      id: "pac-prueba1",
      nombreCompleto: "Usuario Prueba 1",
      activo: true,
    };

    const prisma = {
      paciente: {
        findUnique: jest.fn().mockResolvedValue(pacienteMock),
      },
      dentista: {
        findMany: jest.fn().mockResolvedValue([dentistaMock]),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === "den-admin" || where.id === "den-2") {
            return Promise.resolve({
              ...dentistaMock,
              id: where.id,
              bloqueos: bloqueosStore.filter((b) => b.dentistaId === where.id),
            });
          }
          return Promise.resolve(null);
        }),
      },
      servicio: {
        findMany: jest.fn().mockResolvedValue([servicioMock]),
        findUnique: jest.fn().mockResolvedValue(servicioMock),
      },
      bloqueoDentista: {
        findMany: jest.fn().mockResolvedValue(bloqueosStore),
        create: jest.fn().mockImplementation(({ data }) => {
          bloqueosStore.push(data);
          return Promise.resolve(data);
        }),
      },
      cita: {
        findMany: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(
            citasStore
              .filter((c) => {
                if (where?.dentistaId && c.dentistaId !== where.dentistaId)
                  return false;
                if (where?.pacienteId && c.pacienteId !== where.pacienteId)
                  return false;
                if (where?.fecha && c.fecha !== where.fecha) return false;
                if (where?.estado?.not && c.estado === where.estado.not)
                  return false;
                if (where?.id?.not && c.id === where.id.not) return false;
                return true;
              })
              .map((c) => ({ ...c, servicio: servicioMock })),
          );
        }),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          const found = citasStore.find((c) => c.id === where.id);
          return Promise.resolve(
            found ? { ...found, servicio: servicioMock } : null,
          );
        }),
        create: jest.fn().mockImplementation(({ data }) => {
          citasStore.push(data);
          return Promise.resolve(data);
        }),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const idx = citasStore.findIndex((c) => c.id === where.id);
          citasStore[idx] = { ...citasStore[idx], ...data };
          return Promise.resolve(citasStore[idx]);
        }),
      },
    } as unknown as PrismaService;

    return { prisma, citasStore, bloqueosStore, service: new CitasService(prisma) };
  };

  it("no permite agendar dos citas al mismo dentista en el mismo horario ni bajo peticiones concurrentes (race condition)", async () => {
    // Arrange
    const { service, citasStore } = createInMemoryPrisma();
    const dto = {
      pacienteId: "pac-prueba1",
      dentistaId: "den-admin",
      servicioId: "srv-limpieza",
      fecha: "2027-06-15", // Martes laborable
      horaInicio: "09:00",
      motivo: "Limpieza dental anual",
    };

    // Act: dos solicitudes simultáneas al mismo horario
    const resultados = await Promise.allSettled([
      service.agendarCita(dentistaUser, dto),
      service.agendarCita(dentistaUser, dto),
    ]);

    // Assert
    const exitosas = resultados.filter((r) => r.status === "fulfilled");
    const rechazadas = resultados.filter((r) => r.status === "rejected");
    expect(exitosas).toHaveLength(1);
    expect(rechazadas).toHaveLength(1);
    expect(citasStore).toHaveLength(1);
  });

  it("no permite que el mismo paciente reserve dos citas simultáneas con distintos dentistas", async () => {
    // Arrange
    const { service } = createInMemoryPrisma();
    await service.agendarCita(dentistaUser, {
      pacienteId: "pac-prueba1",
      dentistaId: "den-admin",
      servicioId: "srv-limpieza",
      fecha: "2027-06-16", // Miércoles
      horaInicio: "10:30",
      motivo: "Cita con Dentista 1",
    });

    // Act & Assert
    await expect(
      service.agendarCita(dentistaUser, {
        pacienteId: "pac-prueba1",
        dentistaId: "den-2",
        servicioId: "srv-limpieza",
        fecha: "2027-06-16",
        horaInicio: "10:30",
        motivo: "Cita simultánea con Dentista 2",
      }),
    ).rejects.toThrow(ConflictException);
  });

  it("rechaza agendar citas en el pasado, fuera del horario laboral, en domingos no laborables o en días feriados oficiales", async () => {
    // Arrange
    const { service } = createInMemoryPrisma();
    const baseDto = {
      pacienteId: "pac-prueba1",
      dentistaId: "den-admin",
      servicioId: "srv-limpieza",
      motivo: "Consulta general",
    };

    // Act & Assert: 1. Fecha en el pasado
    await expect(
      service.agendarCita(dentistaUser, {
        ...baseDto,
        fecha: "2020-05-11",
        horaInicio: "09:00",
      }),
    ).rejects.toThrow(ConflictException);

    // 2. Fuera del horario laboral (22:00)
    await expect(
      service.agendarCita(dentistaUser, {
        ...baseDto,
        fecha: "2027-06-15",
        horaInicio: "22:00",
      }),
    ).rejects.toThrow(ConflictException);

    // 3. Domingo no laborable (2027-06-13 es Domingo)
    await expect(
      service.agendarCita(dentistaUser, {
        ...baseDto,
        fecha: "2027-06-13",
        horaInicio: "09:00",
      }),
    ).rejects.toThrow(/Día no laborable/);

    // 4. Feriado oficial (25 de diciembre)
    await expect(
      service.agendarCita(dentistaUser, {
        ...baseDto,
        fecha: "2027-12-25",
        horaInicio: "09:00",
      }),
    ).rejects.toThrow(/Día feriado/);
  });

  it("impide que un paciente cancele o reagende una cita con menos de 24 horas de anticipación", async () => {
    // Arrange
    const { service, citasStore } = createInMemoryPrisma();
    const enDosHoras = new Date(Date.now() + 2 * 3600 * 1000);
    const fechaProxima = enDosHoras.toISOString().slice(0, 10);
    citasStore.push({
      id: "cit-inminente",
      pacienteId: "pac-prueba1",
      pacienteNombre: "Usuario Prueba 1",
      dentistaId: "den-admin",
      dentistaNombre: "Dr. Admin Principal",
      servicioId: "srv-limpieza",
      servicioNombre: "Profilaxis Ultrasónica",
      fecha: fechaProxima,
      horaInicio: "09:00",
      estado: "CONFIRMADA",
      motivo: "Cita próxima",
      costoMXN: 950,
    });

    // Act & Assert
    await expect(
      service.cancelarCita(pacienteUser, "cit-inminente", {
        motivoCancelacion: "Imprevisto",
      }),
    ).rejects.toThrow(/24 horas/);

    await expect(
      service.reagendarCita(pacienteUser, "cit-inminente", {
        nuevaFecha: "2027-06-18",
        nuevaHoraInicio: "10:30",
        notificarPaciente: true,
      }),
    ).rejects.toThrow(/24 horas/);
  });

  it("valida bloqueos de agenda del dentista e impide rangos horarios invertidos o solapados", async () => {
    // Arrange
    const { service } = createInMemoryPrisma();

    // Act & Assert: Rango invertido (18:00 a 09:00)
    await expect(
      service.crearBloqueo(dentistaUser, "den-admin", {
        fecha: "2027-06-17",
        horaInicio: "18:00",
        horaFin: "09:00",
        motivo: "Rango inválido",
      }),
    ).rejects.toThrow(UnprocessableEntityException);

    // Bloqueo válido
    const creado = await service.crearBloqueo(dentistaUser, "den-admin", {
      fecha: "2027-06-17",
      horaInicio: "09:00",
      horaFin: "11:00",
      motivo: "Congreso clínico",
    });
    expect(creado.id).toMatch(/^bloq-/);

    // Paciente no puede consultar ni crear bloqueos de un dentista
    await expect(
      service.listarBloqueosDentista(pacienteUser, "den-admin"),
    ).rejects.toThrow(ForbiddenException);
  });

  it("lista servicios, catálogo público de dentistas, disponibilidad, citas con paginación y permite cancelar/reagendar con más de 24h", async () => {
    // Arrange
    const { service } = createInMemoryPrisma();
    const citaLejana = await service.agendarCita(dentistaUser, {
      pacienteId: "pac-prueba1",
      dentistaId: "den-admin",
      servicioId: "srv-limpieza",
      fecha: "2027-07-06",
      horaInicio: "09:00",
      motivo: "Profilaxis lejana",
    });

    // Act
    const servicios = await service.listarServicios();
    const dentistas = await service.listarDentistasPublico();
    const disp = await service.obtenerDisponibilidad(
      "den-admin",
      "2027-07-06",
      "srv-limpieza",
    );
    const citasDentista = await service.listarCitas(
      dentistaUser,
      undefined,
      "den-admin",
      "2027-07-06",
      1,
      10,
    );
    const citasPaciente = await service.listarCitas(
      pacienteUser,
      "pac-prueba1",
      undefined,
      undefined,
      1,
      10,
    );
    const reagendada = await service.reagendarCita(pacienteUser, citaLejana.id, {
      nuevaFecha: "2027-07-07",
      nuevaHoraInicio: "10:30",
      notificarPaciente: true,
    });
    const cancelada = await service.cancelarCita(pacienteUser, citaLejana.id, {
      motivoCancelacion: "Viaje de trabajo",
    });

    // Assert
    expect(servicios.length).toBeGreaterThan(0);
    expect(dentistas[0].bloqueos).toEqual([]);
    expect(disp.find((s) => s.hora === "09:00")?.disponible).toBe(false);
    expect(citasDentista).toHaveLength(1);
    expect(citasPaciente).toHaveLength(1);
    expect(reagendada.estado).toBe("REPROGRAMADA");
    expect(cancelada.estado).toBe("CANCELADA");
  });
});
