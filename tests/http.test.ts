import test from "node:test";
import assert from "node:assert/strict";
import {
  HttpAuthRepository,
  HttpPacientesRepository,
  HttpCitasRepository,
  HttpOdontogramaRepository,
  HttpChatRepository,
} from "../data/http/repositories";
import {
  httpClient,
  setHttpTokens,
  HttpApiError,
  refreshHttpSession,
} from "../data/http/client";
import {
  mapPacienteDtoToDomain,
  mapChatDtoToDomain,
} from "../data/http/mappers";
import * as f from "./fixtures";
import { z } from "zod";
const auth = new HttpAuthRepository(),
  patients = new HttpPacientesRepository(),
  appointments = new HttpCitasRepository(),
  teeth = new HttpOdontogramaRepository(),
  chat = new HttpChatRepository();
const booking = {
  pacienteId: "p-a",
  dentistaId: "d-a",
  servicioId: "s-a",
  fecha: "2026-12-01",
  hora: "09:00",
  motivoConsulta: "Revisión",
};
test("mappers: conserva expediente, condiciones clínicas, tarjetas y confirmación opaca", () => {
  const patient = mapPacienteDtoToDomain(f.pacienteDto);
  assert.equal(patient.codigoExpediente, "EXP-A");
  assert.equal(patient.dentistaAsignadoNombre, "Doctor Prueba");
  assert.ok(patient.alertasMedicas.includes("Condición sintética"));
  assert.ok(patient.alertasMedicas.includes("Alerta sintética"));
  const response = mapChatDtoToDomain(f.chatDto);
  assert.equal(response.texto, f.chatDto.mensaje);
  assert.deepEqual(response.acciones?.[0].payload, {
    confirmarAccion: { id: "proposal-a", token: "opaque-a" },
  });
  assert.equal(
    (response.componentes?.[0].datos as { hora: string }[])[0].hora,
    "09:00",
  );
});
test("cada operación HTTP: ruta, método, entrada, respuesta y rechazo de DTO inválido", async (t) => {
  const operations: [
    string,
    string,
    string,
    unknown,
    () => Promise<unknown>,
    unknown?,
  ][] = [
    [
      "login",
      "/auth/login",
      "POST",
      f.authDto,
      () => auth.login({ email: "ana@example.com", password: "123456" }),
      { email: "ana@example.com", password: "123456" },
    ],
    [
      "recuperación",
      "/auth/forgot-password",
      "POST",
      { message: "Recibido" },
      () => auth.recoverPassword("ana@example.com"),
      { email: "ana@example.com" },
    ],
    [
      "directorio",
      "/pacientes?q=Ana+Prueba",
      "GET",
      [f.pacienteDto],
      () => patients.listarPacientes("Ana Prueba"),
    ],
    [
      "ficha",
      "/pacientes/p-a",
      "GET",
      f.pacienteDto,
      () => patients.obtenerPacientePorId("p-a"),
    ],
    [
      "historial",
      "/pacientes/p-a/historial",
      "GET",
      [f.historialDto],
      () => patients.obtenerHistorialClinico("p-a"),
    ],
    [
      "evolución",
      "/pacientes/p-a/historial",
      "POST",
      f.historialDto,
      () =>
        patients.agregarEntradaHistorial({
          pacienteId: "p-a",
          dentistaId: "tampered",
          dentistaNombre: "tampered",
          tipo: "CONSULTA",
          diagnostico: "Diagnóstico sintético",
          procedimientoRealizado: "Revisión sintética",
          notasClinicas: "Evolución sintética",
        }),
      {
        tipo: "CONSULTA",
        diagnostico: "Diagnóstico sintético",
        procedimientoRealizado: "Revisión sintética",
        notasEvolucion: "Evolución sintética",
        dentistaId: "d-a",
        dentistaNombre: "Doctor Prueba",
      },
    ],
    [
      "tratamientos",
      "/pacientes/p-a/tratamientos",
      "GET",
      [f.tratamientoDto],
      () => patients.obtenerTratamientosPorPaciente("p-a"),
    ],
    [
      "crear tratamiento",
      "/pacientes/p-a/tratamientos",
      "POST",
      f.tratamientoDto,
      () =>
        patients.crearTratamiento({
          pacienteId: "p-a",
          dentistaId: "tampered",
          servicioId: "s-a",
          nombre: "Plan",
          sesionesTotales: 3,
          costoTotalMXN: 1500,
          dientesFDI: [16, 26],
          proximaFechaSugerida: "2026-12-01",
          notasEvolucion: "Nota",
        }),
      {
        servicioId: "s-a",
        nombre: "Plan",
        dentistaId: "d-a",
        dentistaNombre: "Doctor Prueba",
        costoTotal: 1500,
        sesionesTotales: 3,
        dientesInvolucrados: [16, 26],
        proximaFechaSugerida: "2026-12-01",
        notasEvolucion: "Nota",
      },
    ],
    [
      "actualizar tratamiento",
      "/tratamientos/t-a",
      "PATCH",
      f.tratamientoDto,
      () => patients.actualizarEstadoTratamiento("t-a", "EN_CURSO", 1),
      { estado: "EN_CURSO", sesionesCompletadas: 1 },
    ],
    [
      "servicios",
      "/servicios",
      "GET",
      [f.servicioDto],
      () => appointments.listarServicios(),
    ],
    [
      "dentistas",
      "/dentistas",
      "GET",
      [f.dentistaDto],
      () => appointments.listarDentistas(),
    ],
    [
      "listar bloqueos",
      "/dentistas/d-a/bloqueos",
      "GET",
      [f.bloqueoDto],
      () => appointments.listarBloqueosDentista("d-a"),
    ],
    [
      "citas paciente",
      "/citas?pacienteId=p-a",
      "GET",
      [f.citaDto],
      () => appointments.listarCitasPorPaciente("p-a"),
    ],
    [
      "citas dentista",
      "/citas?dentistaId=d-a&fecha=2026-12-01",
      "GET",
      [f.citaDto],
      () => appointments.listarCitasPorDentista("d-a", "2026-12-01"),
    ],
    [
      "disponibilidad",
      "/dentistas/d-a/disponibilidad?fecha=2026-12-01",
      "GET",
      [
        { hora: "09:00", disponible: true },
        { hora: "10:00", disponible: false },
      ],
      () => appointments.obtenerHorariosDisponibles("d-a", "2026-12-01"),
    ],
    [
      "alta cita",
      "/citas",
      "POST",
      f.citaDto,
      () => appointments.agendarCita(booking),
      {
        pacienteId: "p-a",
        dentistaId: "d-a",
        servicioId: "s-a",
        fecha: "2026-12-01",
        horaInicio: "09:00",
        motivo: "Revisión",
      },
    ],
    [
      "cancelar",
      "/citas/c-a/cancelar",
      "POST",
      f.citaDto,
      () => appointments.cancelarCita("c-a", "Imprevisto"),
      { motivoCancelacion: "Imprevisto" },
    ],
    [
      "reagendar",
      "/citas/c-a/reagendar",
      "PATCH",
      f.citaDto,
      () =>
        appointments.reagendarCita({
          citaId: "c-a",
          nuevaFecha: "2026-12-02",
          nuevaHora: "11:00",
        }),
      {
        nuevaFecha: "2026-12-02",
        nuevaHoraInicio: "11:00",
        notificarPaciente: true,
      },
    ],
    [
      "bloquear",
      "/dentistas/d-a/bloqueos",
      "POST",
      f.bloqueoDto,
      () =>
        appointments.bloquearHorarioDentista(
          "d-a",
          "2026-12-01",
          "12:00",
          "13:00",
          "No disponible",
        ),
      {
        fecha: "2026-12-01",
        horaInicio: "12:00",
        horaFin: "13:00",
        motivo: "No disponible",
      },
    ],
    [
      "odontograma",
      "/odontogramas/p-a",
      "GET",
      f.odontogramaDto,
      () => teeth.obtenerOdontograma("p-a"),
    ],
    [
      "editar diente",
      "/odontogramas/p-a/dientes/16",
      "PATCH",
      f.odontogramaDto,
      () =>
        teeth.registrarCambioDiente({
          pacienteId: "p-a",
          numeroFDI: 16,
          superficie: "oclusal",
          nuevoEstado: "OBTURADO",
          procedimiento: "Resina",
          nota: "Control",
          autorNombre: "tampered",
        }),
      {
        superficie: "oclusal",
        estadoNuevo: "OBTURADO",
        procedimiento: "Resina",
        nota: "Control",
        dentistaId: "d-a",
        dentistaNombre: "Doctor Prueba",
      },
    ],
    [
      "chat",
      "/chat",
      "POST",
      f.chatDto,
      () =>
        chat.sendMessage(
          "Cancelar",
          { rolActual: "PACIENTE", pacienteActivoId: "p-a" },
          { id: "proposal-a", token: "opaque-a" },
        ),
      {
        mensaje: "Cancelar",
        rol: "PACIENTE",
        pacienteId: "p-a",
        dentistaId: null,
        confirmarAccion: { id: "proposal-a", token: "opaque-a" },
      },
    ],
  ];
  for (const [name, path, method, response, run, payload] of operations)
    await t.test(name, async (st) => {
      let invalid = false;
      st.mock.method(
        globalThis,
        "fetch",
        async (input: string, init?: RequestInit) => {
          if (input.endsWith("/auth/me")) return Response.json(f.doctorUser);
          // Compare encoded queries semantically, retaining the exact endpoint and keys.
          const actual = new URL(input, "http://test");
          const expected = new URL(`/api/backend${path}`, "http://test");
          assert.equal(actual.pathname, expected.pathname);
          assert.deepEqual(
            [...actual.searchParams],
            [...expected.searchParams],
          );
          assert.equal(init?.method || "GET", method);
          if (payload)
            assert.deepEqual(JSON.parse(init?.body as string), payload);
          return Response.json(invalid ? { unexpected: true } : response);
        },
      );
      const result = await run();
      assert.ok(result);
      if (name === "disponibilidad") assert.deepEqual(result, ["09:00"]);
      if (name === "recuperación")
        assert.deepEqual(result, { mensaje: "Recibido" });
      invalid = true;
      await assert.rejects(
        run(),
        (e: unknown) =>
          e instanceof HttpApiError && e.code === "INVALID_RESPONSE",
      );
    });
});
test("HTTP: 204, cuerpo vacío, JSON inválido, validación y errores 403/409/422", async (t) => {
  let response = new Response(null, { status: 204 });
  t.mock.method(globalThis, "fetch", async () => response.clone());
  assert.equal(await httpClient("/empty"), undefined);
  response = new Response("");
  assert.equal(await httpClient("/empty"), undefined);
  response = new Response("no-json");
  await assert.rejects(httpClient("/bad"), { code: "INVALID_JSON" });
  response = Response.json({});
  await assert.rejects(httpClient("/bad", {}, z.object({ id: z.string() })), {
    code: "INVALID_RESPONSE",
  });
  for (const status of [403, 409, 422]) {
    response = Response.json(
      { message: ["Error útil"], code: "CLINICAL_ERROR" },
      { status },
    );
    await assert.rejects(httpClient("/error"), {
      status,
      message: "Error útil",
      code: "CLINICAL_ERROR",
    });
  }
  response = new Response(null, { status: 204 });
  await auth.logout();
});
test("HTTP: rehidrata sesión validada y restaura Bearer sin localStorage", async (t) => {
  setHttpTokens(null);
  let bearer = "";
  t.mock.method(
    globalThis,
    "fetch",
    async (path: string, init?: RequestInit) => {
      if (path.endsWith("/auth/me")) return Response.json(f.patientUser);
      if (path.endsWith("/auth/refresh")) return Response.json(f.authDto);
      bearer = new Headers(init?.headers).get("authorization") || "";
      return Response.json([]);
    },
  );
  const user = await auth.getSession();
  assert.equal(user?.pacienteId, "p-a");
  assert.equal("accessToken" in user!, false);
  assert.equal("refreshToken" in user!, false);
  await appointments.listarServicios();
  assert.equal(bearer, "Bearer access-a");
});
test("HTTP: varios 401 comparten una sola renovación y se reintentan con Bearer nuevo", async (t) => {
  setHttpTokens("old");
  let renewals = 0;
  t.mock.method(
    globalThis,
    "fetch",
    async (path: string, init?: RequestInit) => {
      if (path.endsWith("/auth/refresh")) {
        renewals++;
        await new Promise((r) => setTimeout(r, 10));
        return Response.json({ ...f.authDto, access_token: "new" });
      }
      return new Headers(init?.headers).get("authorization") === "Bearer new"
        ? Response.json([])
        : Response.json({ message: "Expirada" }, { status: 401 });
    },
  );
  await Promise.all([
    appointments.listarServicios(),
    appointments.listarDentistas(),
    appointments.listarCitasPorPaciente("p-a"),
  ]);
  assert.equal(renewals, 1);
});
test("HTTP: refresh fallido y caída de red no se convierten en datos vacíos", async (t) => {
  setHttpTokens("old");
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ message: "Sesión expirada" }, { status: 401 }),
  );
  await assert.rejects(appointments.listarServicios(), { status: 401 });
  t.mock.restoreAll();
  t.mock.method(globalThis, "fetch", async () => {
    throw new TypeError("Failed to fetch");
  });
  await assert.rejects(appointments.listarServicios(), /Failed to fetch/);
});
test("HTTP: logout limpia Bearer aun si Nest falla; refresh en vuelo no revive sesión", async (t) => {
  setHttpTokens("before-logout");
  let finish: ((r: Response) => void) | undefined;
  t.mock.method(globalThis, "fetch", async (path: string) =>
    path.endsWith("/auth/refresh")
      ? new Promise<Response>((r) => {
          finish = r;
        })
      : Response.json({ message: "Caído" }, { status: 503 }),
  );
  const pending = refreshHttpSession();
  await assert.rejects(auth.logout(), { status: 503 });
  finish!(Response.json(f.authDto));
  await assert.rejects(pending, { status: 401 });
});
test("HTTP: un paciente no puede enviar cambios clínicos, aunque falsee autor en el payload", async (t) => {
  let clinicalWrites = 0;
  t.mock.method(globalThis, "fetch", async (path: string) => {
    if (path.endsWith("/auth/me")) return Response.json(f.patientUser);
    clinicalWrites++;
    return Response.json({});
  });
  await assert.rejects(
    teeth.registrarCambioDiente({
      pacienteId: "p-b",
      numeroFDI: 16,
      superficie: "oclusal",
      nuevoEstado: "OBTURADO",
      procedimiento: "Resina",
      nota: "",
      autorNombre: "Doctor falso",
    }),
    { status: 403 },
  );
  assert.equal(clinicalWrites, 0);
});
