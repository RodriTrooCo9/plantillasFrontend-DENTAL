import test from "node:test";
import assert from "node:assert/strict";
import {
  HttpAuthRepository,
  HttpCitasRepository,
  HttpPacientesRepository,
} from "../data/http/repositories";
import { setHttpTokens, httpClient } from "../data/http/client";
import * as f from "./fixtures";
test("contrato simulado: login → recurso propio → alta/reagenda/cancelación → recarga → refresh → logout; 403 ajeno", async (t) => {
  const auth = new HttpAuthRepository(),
    appointments = new HttpCitasRepository(),
    patients = new HttpPacientesRepository();
  let signedIn = false,
    token = "access-1",
    expires = false,
    refreshes = 0;
  let stored: typeof f.citaDto = { ...f.citaDto };
  t.mock.method(
    globalThis,
    "fetch",
    async (input: string, init?: RequestInit) => {
      const url = new URL(input, "http://clinic");
      const path = url.pathname.replace("/api/backend", "");
      if (path === "/auth/login") {
        signedIn = true;
        return Response.json({ ...f.authDto, access_token: token });
      }
      if (path === "/auth/me")
        return signedIn
          ? Response.json(f.patientUser)
          : Response.json({ message: "Sin sesión" }, { status: 401 });
      if (path === "/auth/refresh") {
        if (!signedIn)
          return Response.json({ message: "Sin sesión" }, { status: 401 });
        refreshes++;
        expires = false;
        token = `access-${refreshes + 1}`;
        return Response.json({ ...f.authDto, access_token: token });
      }
      if (path === "/auth/logout") {
        signedIn = false;
        return new Response(null, { status: 204 });
      }
      if (
        !signedIn ||
        expires ||
        new Headers(init?.headers).get("authorization") !== `Bearer ${token}`
      )
        return Response.json({ message: "Expirada" }, { status: 401 });
      if (
        path.startsWith("/pacientes/p-b") ||
        path === "/odontogramas/p-b/dientes/16"
      )
        return Response.json({ message: "Sin permiso" }, { status: 403 });
      if (path === "/pacientes/p-a") return Response.json(f.pacienteDto);
      if (path === "/citas" && init?.method === "POST") {
        stored = { ...stored, ...JSON.parse(init.body as string) };
        return Response.json(stored, { status: 201 });
      }
      if (path === "/citas/c-a/reagendar") {
        const p = JSON.parse(init?.body as string);
        stored = {
          ...stored,
          fecha: p.nuevaFecha,
          horaInicio: p.nuevaHoraInicio,
        };
        return Response.json(stored);
      }
      if (path === "/citas/c-a/cancelar")
        return Response.json({ ...stored, estado: "CANCELADA" });
      if (path === "/citas") return Response.json([stored]);
      return Response.json([]);
    },
  );
  setHttpTokens(null);
  const user = await auth.login({
    email: "ana@example.com",
    password: "123456",
  });
  assert.equal(
    (await patients.obtenerPacientePorId(user.pacienteId!))?.id,
    "p-a",
  );
  await assert.rejects(patients.obtenerPacientePorId("p-b"), { status: 403 });
  await assert.rejects(
    httpClient("/odontogramas/p-b/dientes/16", {
      method: "PATCH",
      body: JSON.stringify({ estadoNuevo: "OBTURADO" }),
    }),
    { status: 403 },
  );
  const booked = await appointments.agendarCita({
    pacienteId: "p-a",
    dentistaId: "d-a",
    servicioId: "s-a",
    fecha: "2030-01-02",
    hora: "09:00",
    motivoConsulta: "Revisión",
  });
  assert.equal(booked.fecha, "2030-01-02");
  await appointments.reagendarCita({
    citaId: "c-a",
    nuevaFecha: "2030-01-03",
    nuevaHora: "10:00",
  });
  // Simulate a browser reload: only the fixture's server session/data survive.
  setHttpTokens(null);
  assert.equal((await auth.getSession())?.id, user.id);
  assert.equal(
    (await appointments.listarCitasPorPaciente("p-a"))[0].fecha,
    "2030-01-03",
  );
  expires = true;
  await appointments.listarCitasPorPaciente("p-a");
  assert.equal(refreshes, 2);
  assert.equal(
    (await appointments.cancelarCita("c-a", "Imprevisto")).estado,
    "CANCELADA",
  );
  await auth.logout();
  assert.equal(await auth.getSession(), null);
});
