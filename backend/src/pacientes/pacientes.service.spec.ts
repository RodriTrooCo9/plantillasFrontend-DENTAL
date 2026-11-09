import {
  ConflictException,
  ForbiddenException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { PacientesService, roundMoney } from "./pacientes.service";
import { PrismaService } from "../prisma/prisma.service";
import type { UserResponseDto } from "../auth/dto/auth.dto";

describe("Servicio de Pacientes, Tratamientos, Presupuestos y Pagos (PacientesService)", () => {
  const dentistaUser: UserResponseDto = {
    id: "usr-admin",
    email: "admin@demo.com",
    nombre_completo: "Dr. Admin Principal",
    rol: "DENTISTA",
    paciente_id: null,
    dentista_id: "den-admin",
    avatar_url: null,
  };

  const paciente1User: UserResponseDto = {
    id: "usr-prueba1",
    email: "prueba1@demo.com",
    nombre_completo: "Usuario Prueba 1",
    rol: "PACIENTE",
    paciente_id: "pac-prueba1",
    dentista_id: null,
    avatar_url: null,
  };

  const createInMemorySetup = () => {
    const pacientesStore: Array<Record<string, unknown>> = [
      {
        id: "pac-prueba1",
        documento: "DOC-PRUEBA-0001",
        codigoExpediente: "EXP-2026-9001",
        nombreCompleto: "Usuario Prueba 1",
        email: "prueba1@demo.com",
        telefono: "+52 55 9000 0001",
        fechaNacimiento: "1995-03-10",
        edad: 31,
        grupoSanguineo: "O+",
        alergias: ["Ninguna"],
        condicionesMedicas: ["Ninguna"],
        alertasClinicas: [],
        fechaRegistro: "2026-11-01",
        odontologoCabeceraId: "den-admin",
        odontologoCabeceraNombre: "Dr. Admin Principal",
        activo: true,
        citas: [{ id: "cit-1" }],
        historial: [{ id: "his-1" }],
        tratamientos: [{ id: "trt-1" }],
      },
    ];

    const tratamientosStore: Array<Record<string, unknown>> = [
      {
        id: "trt-1",
        pacienteId: "pac-prueba1",
        dentistaId: "den-admin",
        dentistaNombre: "Dr. Admin Principal",
        servicioId: "srv-ortodoncia",
        nombre: "Ortodoncia Invisible",
        estado: "EN_CURSO",
        fechaInicio: "2026-10-01",
        progresoPorcentaje: 50,
        sesionesCompletadas: 3,
        sesionesTotales: 6,
        costoTotal: 1000,
        presupuestoAprobado: false,
        dientesInvolucrados: [11, 21],
        proximaFechaSugerida: "2026-12-01",
        notasEvolucion: "En curso",
      },
    ];

    const pagosStore: Array<Record<string, unknown>> = [];

    const prisma = {
      historialClinico: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve(data)),
      },
      paciente: {
        findMany: jest.fn().mockImplementation(({ take, skip }) => {
          const active = pacientesStore.filter((p) => p.activo !== false);
          const start = skip || 0;
          const end = take ? start + take : undefined;
          return Promise.resolve(active.slice(start, end));
        }),
        findFirst: jest.fn().mockImplementation(({ where }) => {
          const match = pacientesStore.find((p) =>
            where.OR.some(
              (cond: Record<string, { equals?: string } | string>) =>
                (typeof cond.email === "object" &&
                  String(p.email).toLowerCase() ===
                    cond.email.equals?.toLowerCase()) ||
                (typeof cond.documento === "object" &&
                  String(p.documento).toUpperCase() ===
                    cond.documento.equals?.toUpperCase()) ||
                (typeof cond.telefono === "string" &&
                  p.telefono === cond.telefono),
            ),
          );
          return Promise.resolve(match || null);
        }),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(
            pacientesStore.find((p) => p.id === where.id) || null,
          );
        }),
        create: jest.fn().mockImplementation(({ data }) => {
          pacientesStore.push(data);
          return Promise.resolve(data);
        }),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const idx = pacientesStore.findIndex((p) => p.id === where.id);
          pacientesStore[idx] = { ...pacientesStore[idx], ...data };
          return Promise.resolve(pacientesStore[idx]);
        }),
      },
      servicio: {
        findUnique: jest.fn().mockResolvedValue({
          id: "srv-ortodoncia",
          nombre: "Ortodoncia",
        }),
      },
      tratamiento: {
        findMany: jest.fn().mockResolvedValue(tratamientosStore),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(
            tratamientosStore.find((t) => t.id === where.id) || null,
          );
        }),
        create: jest.fn().mockImplementation(({ data }) => {
          tratamientosStore.push(data);
          return Promise.resolve(data);
        }),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const idx = tratamientosStore.findIndex((t) => t.id === where.id);
          tratamientosStore[idx] = { ...tratamientosStore[idx], ...data };
          return Promise.resolve(tratamientosStore[idx]);
        }),
      },
      pago: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(
            pagosStore.find(
              (p) => p.idempotencyKey === where.idempotencyKey,
            ) || null,
          );
        }),
        findMany: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(
            pagosStore.filter((p) => p.tratamientoId === where.tratamientoId),
          );
        }),
        create: jest.fn().mockImplementation(({ data }) => {
          pagosStore.push(data);
          return Promise.resolve(data);
        }),
      },
    } as unknown as PrismaService;

    return {
      prisma,
      pacientesStore,
      tratamientosStore,
      pagosStore,
      service: new PacientesService(prisma),
    };
  };

  it("rechaza el registro de un paciente duplicado por documento, correo o teléfono", async () => {
    // Arrange
    const { service } = createInMemorySetup();

    // Act & Assert
    await expect(
      service.crearPaciente(dentistaUser, {
        documento: "DOC-PRUEBA-0001", // Duplicado
        nombreCompleto: "Clon Paciente",
        email: "nuevo@demo.com",
        telefono: "+52 55 1111 2222",
        fechaNacimiento: "1995-03-10",
        edad: 31,
        grupoSanguineo: "A+",
      }),
    ).rejects.toThrow(ConflictException);
  });

  it("rechaza fechas de nacimiento futuras, edades inconsistentes y pacientes menores de edad sin tutor", async () => {
    // Arrange
    const { service } = createInMemorySetup();

    // Act & Assert: 1. Fecha de nacimiento futura
    await expect(
      service.crearPaciente(dentistaUser, {
        documento: "DOC-NUEVO-01",
        nombreCompleto: "Bebé Futuro",
        email: "futuro@demo.com",
        telefono: "+52 55 8888 7777",
        fechaNacimiento: "2099-01-01",
        edad: 0,
        grupoSanguineo: "O+",
      }),
    ).rejects.toThrow(/fecha futura/);

    // 2. Edad inconsistente con fecha de nacimiento
    await expect(
      service.crearPaciente(dentistaUser, {
        documento: "DOC-NUEVO-02",
        nombreCompleto: "Edad Inconsistente",
        email: "inconsistente@demo.com",
        telefono: "+52 55 8888 6666",
        fechaNacimiento: "1990-01-01",
        edad: 12, // Debería ser ~36
        grupoSanguineo: "O+",
      }),
    ).rejects.toThrow(/inconsistente/);

    // 3. Menor de edad sin tutor registrado
    await expect(
      service.crearPaciente(dentistaUser, {
        documento: "DOC-MENOR-01",
        nombreCompleto: "Menor Sin Tutor",
        email: "menor@demo.com",
        telefono: "+52 55 8888 5555",
        fechaNacimiento: "2016-05-10",
        edad: 10,
        grupoSanguineo: "O+",
      }),
    ).rejects.toThrow(/tutor legal/);
  });

  it("aplica borrado lógico al eliminar un paciente con historial, citas o tratamientos asociados", async () => {
    // Arrange
    const { service, pacientesStore } = createInMemorySetup();

    // Act
    const resultado = await service.eliminarPaciente(dentistaUser, "pac-prueba1");

    // Assert
    expect(resultado.borradoLogico).toBe(true);
    expect(resultado.activo).toBe(false);
    expect(resultado.tieneRegistrosAsociados).toBe(true);
    expect(pacientesStore[0].activo).toBe(false);
    expect(pacientesStore[0].deletedAt).toBeDefined();
  });

  it("congela el precio del tratamiento cuando el presupuesto ya fue aprobado e impide cambiar su costo después", async () => {
    // Arrange
    const { service } = createInMemorySetup();
    await service.aprobarPresupuesto(dentistaUser, "trt-1");

    // Act & Assert
    await expect(
      service.actualizarTratamiento(dentistaUser, "trt-1", {
        estado: "EN_CURSO",
        sesionesCompletadas: 4,
        costoTotal: 1500, // Intento de subir precio tras aprobar presupuesto
      }),
    ).rejects.toThrow(ConflictException);
  });

  it("valida pagos parciales: redondeo de decimales, rechazo de descuentos negativos, pagos mayores al saldo y doble clic (idempotencia)", async () => {
    // Arrange
    const { service } = createInMemorySetup();

    // Act & Assert 1: Descuento negativo rechazado
    await expect(
      service.registrarPago(dentistaUser, "trt-1", {
        montoMXN: 200,
        descuentoMXN: -50,
        metodoPago: "TARJETA",
      }),
    ).rejects.toThrow(UnprocessableEntityException);

    // 2: Primer pago parcial con decimales y clave de idempotencia
    const primerAbono = await service.registrarPago(dentistaUser, "trt-1", {
      montoMXN: 333.333,
      descuentoMXN: 66.667,
      metodoPago: "TARJETA",
      idempotencyKey: "clic-1",
    });
    expect(primerAbono.pago.montoMXN).toBe(roundMoney(333.33));
    expect(primerAbono.saldoPendiente).toBe(600);

    // 3: Doble clic con misma idempotencyKey -> rechazado con 409 Conflict
    await expect(
      service.registrarPago(dentistaUser, "trt-1", {
        montoMXN: 333.33,
        metodoPago: "TARJETA",
        idempotencyKey: "clic-1",
      }),
    ).rejects.toThrow(ConflictException);

    // 4: Pago mayor al saldo pendiente (600 MXN restantes) -> rechazado con 422
    await expect(
      service.registrarPago(dentistaUser, "trt-1", {
        montoMXN: 650,
        metodoPago: "EFECTIVO",
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it("impide que un paciente acceda al expediente o historial clínico de otro paciente (control de acceso)", async () => {
    // Arrange
    const { service } = createInMemorySetup();

    // Act & Assert
    await expect(
      service.obtenerPacientePorId(paciente1User, "pac-2"),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      service.listarPacientes(paciente1User),
    ).rejects.toThrow(ForbiddenException);
  });

  it("permite listar pacientes paginados, consultar ficha propia, agregar evolución al historial, crear tratamientos y obtener estado de cuenta", async () => {
    // Arrange
    const { service } = createInMemorySetup();

    // Act
    const lista = await service.listarPacientes(dentistaUser, "Prueba", 1, 10);
    const ficha = await service.obtenerPacientePorId(
      paciente1User,
      "pac-prueba1",
    );
    const histNota = await service.agregarHistorial(
      dentistaUser,
      "pac-prueba1",
      {
        tipo: "PROCEDIMIENTO",
        diagnostico: "Caries dentinaria",
        procedimientoRealizado: "Resina compuesta",
        notasEvolucion: "Control en 15 días",
      },
    );
    const histList = await service.obtenerHistorial(
      paciente1User,
      "pac-prueba1",
    );
    const nuevoTrt = await service.crearTratamiento(
      dentistaUser,
      "pac-prueba1",
      {
        servicioId: "srv-ortodoncia",
        nombre: "Rehabilitación Estética",
        costoTotal: 5000,
        sesionesTotales: 4,
        dientesInvolucrados: [11, 21],
        proximaFechaSugerida: "2027-07-01",
        notasEvolucion: "Inicio",
      },
    );
    const trtList = await service.obtenerTratamientos(
      paciente1User,
      "pac-prueba1",
    );
    const estadoCuenta = await service.obtenerEstadoCuentaTratamiento(
      paciente1User,
      "trt-1",
    );

    // Assert
    expect(lista).toHaveLength(1);
    expect(ficha.id).toBe("pac-prueba1");
    expect(histNota.tipo).toBe("PROCEDIMIENTO");
    expect(Array.isArray(histList)).toBe(true);
    expect(nuevoTrt.estado).toBe("PLANIFICADO");
    expect(trtList.length).toBeGreaterThanOrEqual(1);
    expect(estadoCuenta.costoTotal).toBe(1000);
  });
});
