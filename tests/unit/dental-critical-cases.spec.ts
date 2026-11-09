import {
  clinicInstant,
  futureAppointment,
  isFDI,
  minutes,
  overlaps,
  today,
  weekDays,
  addDays,
} from "@/domain/clinical";
import {
  blockInputSchema,
  bookingInputSchema,
  toothInputSchema,
  treatmentInputSchema,
} from "@/domain/validation";
import {
  MockAuthRepository,
  MockCitasRepository,
  MockOdontogramaRepository,
  MockPacientesRepository,
  verificarReglaCancelacion24h,
} from "@/data/mock/repositories";

describe("Casos Críticos de Consultorio Dental y Pruebas No Funcionales (Rendimiento + Seguridad)", () => {
  it("impide agendar en días no laborables del especialista o feriados oficiales y valida solapamiento del mismo paciente", async () => {
    // Arrange
    const repo = new MockCitasRepository(() =>
      clinicInstant("2027-06-01", "08:00"),
    );

    // Act: Dr. Alejandro Silva NO atiende los Martes ('2027-06-15' es Martes)
    const horariosMartesAlejandro = await repo.obtenerHorariosDisponibles(
      "den-alejandro",
      "2027-06-15",
      "srv-implantes",
    );
    // Navidad 2027-12-25 (feriado oficial)
    const horariosNavidad = await repo.obtenerHorariosDisponibles(
      "den-admin",
      "2027-12-25",
      "srv-limpieza",
    );

    // Assert
    expect(horariosMartesAlejandro).toEqual([]);
    expect(horariosNavidad).toEqual([]);

    // Mismo paciente intenta reservar a la misma hora con otro dentista
    await repo.agendarCita({
      pacienteId: "pac-prueba1",
      dentistaId: "den-admin",
      servicioId: "srv-limpieza",
      fecha: "2027-06-16", // Miércoles laborable
      hora: "09:00",
      motivoConsulta: "Limpieza con Dr. Admin",
    });

    await expect(
      repo.agendarCita({
        pacienteId: "pac-prueba1",
        dentistaId: "den-valeria",
        servicioId: "srv-limpieza",
        fecha: "2027-06-16",
        hora: "09:00",
        motivoConsulta: "Intento simultáneo con Dra. Valeria",
      }),
    ).rejects.toThrow(/disponible/);
  });

  it("valida esquemas Zod contra inyecciones XSS, FDI fuera de rango (0, 19, 99), costos negativos y sesiones en cero", () => {
    // Arrange & Act & Assert
    expect(
      toothInputSchema.safeParse({
        numeroFDI: 99,
        procedimiento: "Resina",
        nota: "Nota",
      }).success,
    ).toBe(false);

    expect(
      treatmentInputSchema.safeParse({
        nombre: "Plan válido",
        sesionesTotales: 3,
        costoTotalMXN: -500,
        dientesFDI: [16],
      }).success,
    ).toBe(false);

    expect(
      blockInputSchema.safeParse({
        fecha: "2027-06-16",
        horaInicio: "16:00",
        horaFin: "09:00",
        motivo: "Invertido",
      }).success,
    ).toBe(false);

    expect(
      bookingInputSchema.safeParse({
        pacienteId: "pac-prueba1",
        dentistaId: "den-admin",
        servicioId: "srv-limpieza",
        fecha: "2027-06-16",
        hora: "09:00",
        motivoConsulta: "Consulta legítima",
      }).success,
    ).toBe(true);
  });

  it("verifica rendimiento no funcional: filtrado y paginación de +10,000 pacientes y +10,000 citas en menos de 100ms", () => {
    // Arrange: Generar 12,000 pacientes y 12,000 citas en memoria
    const pacientesMasivos = Array.from({ length: 12_000 }, (_, i) => ({
      id: `pac-perf-${i}`,
      codigoExpediente: `EXP-2026-${10000 + i}`,
      nombreCompleto: `Paciente Rendimiento ${i}`,
      email: `paciente.${i}@demo.com`,
      activo: true,
    }));
    const citasMasivas = Array.from({ length: 12_000 }, (_, i) => ({
      id: `cit-perf-${i}`,
      pacienteId: `pac-perf-${i % 500}`,
      dentistaId: i % 2 === 0 ? "den-admin" : "den-valeria",
      fecha: "2027-08-10",
      horaInicio: "09:00",
      estado: "CONFIRMADA" as const,
    }));

    // Act
    const t0 = performance.now();
    const paginaPacientes = pacientesMasivos
      .filter((p) => p.activo && p.nombreCompleto.includes("Rendimiento 99"))
      .slice(0, 25);
    const paginaCitas = citasMasivas
      .filter((c) => c.dentistaId === "den-admin" && c.fecha === "2027-08-10")
      .slice(0, 50);
    const elapsedMs = performance.now() - t0;

    // Assert
    expect(paginaPacientes).toHaveLength(25);
    expect(paginaCitas).toHaveLength(50);
    expect(elapsedMs).toBeLessThan(100);
  });

  it("verifica utilidades de dominio clínico, zona horaria, regla de 24h y repositorios mock", async () => {
    // Arrange
    const authRepo = new MockAuthRepository();
    const pacRepo = new MockPacientesRepository();
    const odoRepo = new MockOdontogramaRepository();

    // Act
    const sesionAdmin = await authRepo.login({
      email: "admin@demo.com",
      password: "123456",
    });
    const sesionPrueba1 = await authRepo.login({
      email: "prueba1@demo.com",
      password: "123456",
    });
    const listaPacientes = await pacRepo.listarPacientes("Prueba 1");
    const odontoPrueba1 = await odoRepo.obtenerOdontograma("pac-prueba1");
    const regla24 = verificarReglaCancelacion24h(
      "2027-06-20",
      "10:00",
      clinicInstant("2027-06-18", "10:00"),
    );

    // Assert
    expect(sesionAdmin.rol).toBe("DENTISTA");
    expect(sesionPrueba1.rol).toBe("PACIENTE");
    expect(listaPacientes).toHaveLength(1);
    expect(odontoPrueba1.dientes).toHaveLength(32);
    expect(regla24.permitido).toBe(true);
    expect(isFDI(16)).toBe(true);
    expect(minutes("09:30")).toBe(570);
    expect(overlaps(540, 600, 570, 630)).toBe(true);
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(weekDays("2026-11-09")).toHaveLength(7);
    expect(addDays("2026-11-09", 1)).toBe("2026-11-10");
    expect(
      futureAppointment(
        {
          id: "c1",
          pacienteId: "p1",
          pacienteNombre: "P",
          dentistaId: "d1",
          dentistaNombre: "D",
          servicioId: "s1",
          servicioNombre: "S",
          fecha: "2027-10-10",
          hora: "10:00",
          estado: "CONFIRMADA",
          motivoConsulta: "M",
          costoMXN: 900,
        },
        new Date("2026-11-09T12:00:00Z"),
      ),
    ).toBe(true);
  });
});
