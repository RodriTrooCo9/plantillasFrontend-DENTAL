import React from "react";
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { render, screen, act, cleanup, waitFor } from "@testing-library/react";
import {
  AppRouterContext,
  type AppRouterInstance,
} from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  PathnameContext,
  SearchParamsContext,
} from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { AuthGate } from "../components/AuthGate";
import { repositories } from "../data/factory";
import { retrySession, getSessionSnapshot } from "../data/auth/session";
import type { UsuarioAutenticado } from "../domain";
afterEach(cleanup);
test("AuthGate: espera validación antes de montar recursos; rol incorrecto y cierre entre pestañas desmontan contenido", async (t) => {
  let finish: ((user: UsuarioAutenticado) => void) | undefined;
  t.mock.method(
    repositories.auth,
    "getSession",
    () =>
      new Promise<UsuarioAutenticado>((r) => {
        finish = r;
      }),
  );
  const pending = retrySession();
  let mounts = 0;
  const redirects: string[] = [];
  const router: AppRouterInstance = {
    push() {},
    replace(path) {
      redirects.push(path);
    },
    back() {},
    forward() {},
    refresh() {},
    prefetch() {},
  };
  function Gate({ role = "PACIENTE" }: { role?: "PACIENTE" | "DENTISTA" }) {
    return (
      <AppRouterContext.Provider value={router}>
        <PathnameContext.Provider value="/paciente">
          <SearchParamsContext.Provider
            value={new URLSearchParams("servicio=s-a")}
          >
            <AuthGate role={role}>
              {(user) => {
                mounts++;
                return <p>Expediente propio: {user.pacienteId}</p>;
              }}
            </AuthGate>
          </SearchParamsContext.Provider>
        </PathnameContext.Provider>
      </AppRouterContext.Provider>
    );
  }
  const view = render(<Gate />);
  assert.equal(mounts, 0);
  assert.match(screen.getByRole("status").textContent!, /Verificando/);
  await act(async () => {
    finish!({
      id: "u-a",
      email: "ana@example.com",
      rol: "PACIENTE",
      nombreCompleto: "Ana",
      pacienteId: "own-id",
    });
    await pending;
  });
  assert.ok(screen.getByText("Expediente propio: own-id"));
  assert.ok(mounts > 0);
  const before = mounts;
  view.rerender(<Gate role="DENTISTA" />);
  assert.equal(mounts, before);
  await waitFor(() => assert.ok(redirects.includes("/paciente")));
  view.rerender(<Gate />);
  act(() =>
    window.dispatchEvent(
      new window.StorageEvent("storage", {
        key: "lumina_session_event",
        newValue: "logout",
      }),
    ),
  );
  assert.ok(screen.queryByText("Expediente propio: own-id") === null);
  assert.equal(getSessionSnapshot().user, null);
  await waitFor(() =>
    assert.ok(redirects.some((path) => path.startsWith("/login?next="))),
  );
  assert.equal(window.localStorage.getItem("lumina_auth_session_v2"), null);
});
