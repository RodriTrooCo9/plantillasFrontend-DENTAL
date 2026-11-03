import React from "react";
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import {
  AppRouterContext,
  type AppRouterInstance,
} from "next/dist/shared/lib/app-router-context.shared-runtime";
import { ChatbotAssistant } from "../features/chatbot/ChatbotAssistant";
import {
  MockChatRepository,
  MockOdontogramaRepository,
} from "../data/mock/repositories";
import { repositories } from "../data/factory";
import type { RespuestaChat } from "../domain";
const router: AppRouterInstance = {
  push() {},
  replace() {},
  back() {},
  forward() {},
  refresh() {},
  prefetch() {},
};
const wrap = (patient = "pac-1") => (
  <AppRouterContext.Provider value={router}>
    <ChatbotAssistant
      contexto={{
        rolActual: "DENTISTA",
        pacienteActivoId: patient,
        dentistaActivoId: "den-valeria",
      }}
    />
  </AppRouterContext.Provider>
);
afterEach(cleanup);
test("chat mock: token ligado a expediente/rol y confirmación idempotente, sin doble cambio clínico", async () => {
  const chat = new MockChatRepository(),
    teeth = new MockOdontogramaRepository();
  const context = {
    rolActual: "DENTISTA" as const,
    pacienteActivoId: "pac-1",
    dentistaActivoId: "den-valeria",
  };
  const before = (await teeth.obtenerOdontograma("pac-1")).historialCambios
    .length;
  const proposal = await chat.sendMessage("Modificar diente", context);
  const confirmation = proposal.acciones?.[0].payload.confirmarAccion as {
    id: string;
    token: string;
  };
  assert.ok(confirmation?.token);
  assert.equal(
    (await teeth.obtenerOdontograma("pac-1")).historialCambios.length,
    before,
  );
  await assert.rejects(
    chat.sendMessage(
      "Confirmar",
      { ...context, pacienteActivoId: "pac-2" },
      confirmation,
    ),
    { status: 403 },
  );
  await assert.rejects(
    chat.sendMessage(
      "Confirmar",
      { ...context, rolActual: "PACIENTE" },
      confirmation,
    ),
    { status: 403 },
  );
  await Promise.all([
    chat.sendMessage("Confirmar", context, confirmation),
    chat.sendMessage("Confirmar", context, confirmation),
  ]);
  await chat.sendMessage("Confirmar", context, confirmation);
  assert.equal(
    (await teeth.obtenerOdontograma("pac-1")).historialCambios.length,
    before + 1,
  );
});
test("chat UI: error de red conserva texto; conversación y acciones se reinician por expediente", async (t) => {
  t.mock.method(repositories.chat, "sendMessage", async () => {
    throw new Error("Sin conexión");
  });
  const view = render(wrap());
  fireEvent.click(
    screen.getByRole("button", { name: "Abrir Asistente Clínico" }),
  );
  const input = screen.getByLabelText("Mensaje para el asistente clínico");
  fireEvent.change(input, { target: { value: "Consulta privada de A" } });
  fireEvent.submit(input.closest("form")!);
  await waitFor(() =>
    assert.match(screen.getByRole("alert").textContent!, /Sin conexión/),
  );
  assert.equal((input as HTMLInputElement).value, "Consulta privada de A");
  assert.ok(screen.getByRole("button", { name: "Reintentar mensaje" }));
  view.rerender(wrap("pac-2"));
  fireEvent.click(
    screen.getByRole("button", { name: "Abrir Asistente Clínico" }),
  );
  assert.ok(!screen.queryByText("Consulta privada de A"));
  assert.ok(screen.getByRole("log"));
});
test("chat UI: propuesta usa segundo POST de chat, error no completa acción y permite reintento", async (t) => {
  const proposal: RespuestaChat = {
    texto: "Propuesta para A",
    acciones: [
      {
        id: "a",
        tipo: "MODIFICAR_ODONTOGRAMA",
        etiqueta: "Editar pieza 16 de A",
        requiereConfirmacion: true,
        payload: { confirmarAccion: { id: "a", token: "opaque" } },
      },
    ],
  };
  let confirmations = 0,
    directWrites = 0;
  t.mock.method(repositories.odontograma, "registrarCambioDiente", async () => {
    directWrites++;
    throw new Error("No usar repositorio directo");
  });
  t.mock.method(
    repositories.chat,
    "sendMessage",
    async (
      _text: string,
      _context: unknown,
      confirmation?: { id: string; token: string },
    ) => {
      if (!confirmation) return proposal;
      assert.deepEqual(confirmation, { id: "a", token: "opaque" });
      confirmations++;
      if (confirmations === 1) throw new Error("Conflicto de agenda");
      return { texto: "Cambio completado" };
    },
  );
  render(wrap());
  fireEvent.click(
    screen.getByRole("button", { name: "Abrir Asistente Clínico" }),
  );
  const input = screen.getByLabelText("Mensaje para el asistente clínico");
  fireEvent.change(input, { target: { value: "Modificar diente" } });
  fireEvent.submit(input.closest("form")!);
  await screen.findByRole("button", { name: "Editar pieza 16 de A" });
  fireEvent.click(screen.getByRole("button", { name: "Editar pieza 16 de A" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirmar y guardar" }));
  await waitFor(() =>
    assert.ok(
      screen
        .getAllByRole("alert")
        .some((a) => a.textContent?.includes("Conflicto")),
    ),
  );
  assert.ok(!screen.queryByRole("button", { name: "Ejecutada" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirmar y guardar" }));
  await screen.findByText("Cambio completado");
  assert.equal(confirmations, 2);
  assert.equal(directWrites, 0);
});
