import test from "node:test";
import assert from "node:assert/strict";
import {
  MockAuthRepository,
  MockCitasRepository,
  MockPacientesRepository,
  MockOdontogramaRepository,
  verificarReglaCancelacion24h,
} from "../data/mock/repositories";
import { clinicInstant, futureAppointment } from "../domain/clinical";
import { treatmentInputSchema, blockInputSchema } from "../domain/validation";
import { citaDto } from "./fixtures";
import { mapCitaDtoToDomain } from "../data/http/mappers";
test("mock: rechaza contraseñas incorrectas, correos desconocidos y elevación por palabra dentista", async () => {
  const auth = new MockAuthRepository();
  for (const [email, password] of [
    ["dentista-falso@example.com", "123456"],
    ["desconocido@example.com", "123456"],
    ["dentista@demo.com", "incorrecta"],
  ])
    await assert.rejects(auth.login({ email, password }), /incorrectos/);
});
test("regla 24h: reloj real inyectado, sin redondeo, límite exacto", () => {
  const now = clinicInstant("2030-01-01", "12:00");
  assert.equal(
    verificarReglaCancelacion24h("2030-01-02", "11:40", now).permitido,
    false,
  );
  assert.equal(
    verificarReglaCancelacion24h("2030-01-02", "12:00", now).permitido,
    true,
  );
  assert.equal(
    verificarReglaCancelacion24h("2030-01-02", "12:01", now).permitido,
    true,
  );
});
test("mock: doble reserva, solapamiento por duración, bloqueo completo y cancelación libera horario", async () => {
  const repo = new MockCitasRepository(() =>
    clinicInstant("2030-01-01", "09:00"),
  );
  const input = {
    pacienteId: "pac-1",
    dentistaId: "den-valeria",
    servicioId: "srv-limpieza",
    fecha: "2030-01-03",
    hora: "09:00",
    motivoConsulta: "Prueba",
  };
  const available = await repo.obtenerHorariosDisponibles(
    input.dentistaId,
    input.fecha,
    input.servicioId,
  );
  input.hora = available[0];
  assert.ok(input.hora);
  const cita = await repo.agendarCita(input);
  await assert.rejects(repo.agendarCita(input), { status: 409 });
  assert.equal(
    (
      await repo.obtenerHorariosDisponibles(
        input.dentistaId,
        input.fecha,
        input.servicioId,
      )
    ).includes(input.hora),
    false,
  );
  await repo.cancelarCita(cita.id, "Prueba");
  assert.ok(
    (
      await repo.obtenerHorariosDisponibles(
        input.dentistaId,
        input.fecha,
        input.servicioId,
      )
    ).includes(input.hora),
  );
  await repo.bloquearHorarioDentista(
    "den-valeria",
    "2030-01-04",
    "09:00",
    "18:00",
    "Prueba",
  );
  assert.equal(
    (
      await repo.obtenerHorariosDisponibles(
        "den-valeria",
        "2030-01-04",
        "srv-limpieza",
      )
    ).some((h) => h >= "09:00" && h < "18:00"),
    false,
  );
  await assert.rejects(
    repo.bloquearHorarioDentista(
      "den-valeria",
      "2030-01-04",
      "10:00",
      "11:00",
      "Solapado",
    ),
    { status: 409 },
  );
  await assert.rejects(
    repo.bloquearHorarioDentista(
      "den-valeria",
      "2030-01-05",
      "18:00",
      "09:00",
      "Invertido",
    ),
    { status: 422 },
  );
});
test("validación clínica: costo negativo, cero sesiones, FDI 99 y bloqueo invertido", async () => {
  const valid = {
    nombre: "Plan",
    sesionesTotales: 3,
    costoTotalMXN: 1000,
    dientesFDI: [16, 26],
  };
  for (const invalid of [
    { ...valid, costoTotalMXN: -1 },
    { ...valid, sesionesTotales: 0 },
    { ...valid, dientesFDI: [99] },
  ])
    assert.equal(treatmentInputSchema.safeParse(invalid).success, false);
  assert.equal(
    blockInputSchema.safeParse({
      fecha: "2030-01-05",
      horaInicio: "18:00",
      horaFin: "09:00",
      motivo: "Prueba",
    }).success,
    false,
  );
  const repo = new MockPacientesRepository();
  await assert.rejects(
    repo.crearTratamiento({
      ...valid,
      pacienteId: "pac-1",
      dentistaId: "den-valeria",
      servicioId: "srv-limpieza",
      proximaFechaSugerida: "2030-01-05",
      notasEvolucion: "",
      dientesFDI: [99],
    }),
    { status: 422 },
  );
  await assert.rejects(
    new MockOdontogramaRepository().registrarCambioDiente({
      pacienteId: "pac-1",
      numeroFDI: 99,
      superficie: "oclusal",
      nuevoEstado: "OBTURADO",
      procedimiento: "Resina",
      nota: "Nota",
      autorNombre: "Demo",
    }),
    { status: 422 },
  );
});
test("cita confirmada antigua no se clasifica como futura", () => {
  assert.equal(
    futureAppointment(mapCitaDtoToDomain(citaDto), new Date("2030-01-01")),
    false,
  );
});

test("calendario: siete días desde lunes y cambio de semana cruzando año", async () => {
  const { weekDays, addDays } = await import("../domain/clinical");
  assert.deepEqual(weekDays("2026-11-03"), [
    "2026-11-02",
    "2026-11-03",
    "2026-11-04",
    "2026-11-05",
    "2026-11-06",
    "2026-11-07",
    "2026-11-08",
  ]);
  assert.equal(addDays("2026-12-28", 7), "2027-01-04");
});

test("disponibilidad: un bloqueo parcial descuenta la duración completa del servicio", async () => {
  const repo = new MockCitasRepository(() =>
    clinicInstant("2030-01-01", "09:00"),
  );
  await repo.bloquearHorarioDentista(
    "den-valeria",
    "2030-01-07",
    "09:30",
    "10:00",
    "Bloqueo parcial",
  );
  const slots = await repo.obtenerHorariosDisponibles(
    "den-valeria",
    "2030-01-07",
    "srv-limpieza",
  );
  assert.equal(slots.includes("09:00"), false);
  assert.equal(slots.includes("10:30"), true);
});
