import React from "react";
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  act,
} from "@testing-library/react";
import { AsyncForm } from "../components/ui/AsyncForm";
import { useQuery } from "../hooks/use-query";
import { QueryState } from "../components/ui/QueryState";
afterEach(cleanup);
test("formularios: doble submit produce una sola escritura y conserva el texto ante 409", async () => {
  let calls = 0,
    reject: ((e: unknown) => void) | undefined;
  render(
    <AsyncForm
      onSubmit={async () => {
        calls++;
        await new Promise((_, r) => {
          reject = r;
        });
      }}
    >
      <label htmlFor="note">Nota</label>
      <input id="note" defaultValue="Borrador clínico" />
      <button type="submit">Guardar</button>
    </AsyncForm>,
  );
  const button = screen.getByRole("button", { name: "Guardar" });
  const form = button.closest("form")!;
  fireEvent.submit(form);
  fireEvent.submit(form);
  assert.equal(calls, 1);
  assert.equal((button as HTMLButtonElement).disabled, false); // Fieldset supplies native inherited disabled state.
  assert.equal(button.closest("fieldset")?.disabled, true);
  await act(async () => {
    reject!({ status: 409 });
  });
  assert.match(screen.getByRole("alert").textContent!, /acaba de cambiar/);
  assert.equal(
    (screen.getByLabelText("Nota") as HTMLInputElement).value,
    "Borrador clínico",
  );
  assert.equal(button.closest("fieldset")?.disabled, false);
});
test("consultas: cambia expediente sin mostrar datos anteriores y descarta respuesta tardía", async () => {
  const pending = new Map<string, (value: string) => void>();
  function Profile({ id }: { id: string }) {
    const load = React.useCallback(
      () =>
        new Promise<string>((resolve) => {
          pending.set(id, resolve);
        }),
      [id],
    );
    const query = useQuery(id, load);
    return (
      <QueryState {...query} onRetry={query.reload}>
        <p>{query.data}</p>
      </QueryState>
    );
  }
  const view = render(<Profile id="A" />);
  view.rerender(<Profile id="B" />);
  await act(async () => {
    pending.get("B")!("Expediente B");
  });
  assert.ok(screen.getByText("Expediente B"));
  await act(async () => {
    pending.get("A")!("Expediente A");
  });
  assert.equal(screen.queryByText("Expediente A"), null);
  assert.ok(screen.getByText("Expediente B"));
  view.rerender(<Profile id="C" />);
  assert.equal(screen.queryByText("Expediente B"), null);
  assert.match(screen.getByRole("status").textContent!, /Cargando/);
});
test("consultas: caída de red se distingue del vacío y permite reintento", async () => {
  let calls = 0;
  function Query() {
    const load = React.useCallback(async () => {
      if (++calls === 1) throw new Error("Sin conexión");
      return [] as string[];
    }, []);
    const query = useQuery("data", load);
    return (
      <QueryState
        {...query}
        empty={query.data?.length === 0}
        onRetry={query.reload}
      >
        <p>Éxito</p>
      </QueryState>
    );
  }
  render(<Query />);
  await waitFor(() => assert.ok(screen.getByRole("alert")));
  assert.equal(screen.queryByText("No hay registros para mostrar."), null);
  fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
  await waitFor(() =>
    assert.match(screen.getByRole("status").textContent!, /No hay registros/),
  );
});

test("reagenda: cero horarios deshabilita envío; cambio rápido descarta disponibilidad anterior", async (t) => {
  const { RescheduleForm } = await import("../components/RescheduleForm");
  const { repositories } = await import("../data/factory");
  const { mapCitaDtoToDomain } = await import("../data/http/mappers");
  const { citaDto } = await import("./fixtures");
  let calls = 0;
  let late: ((values: string[]) => void) | undefined;
  t.mock.method(repositories.citas, "obtenerHorariosDisponibles", async () => {
    calls++;
    if (calls === 1)
      return new Promise<string[]>((r) => {
        late = r;
      });
    return [];
  });
  render(
    <RescheduleForm
      cita={mapCitaDtoToDomain(citaDto)}
      onSave={async () => {
        throw new Error("No debe enviar");
      }}
    />,
  );
  fireEvent.change(screen.getByLabelText("Nueva fecha"), {
    target: { value: "2030-01-05" },
  });
  await waitFor(() =>
    assert.match(screen.getByRole("status").textContent!, /No hay horarios/),
  );
  assert.equal(
    (
      screen.getByRole("button", {
        name: "Confirmar nuevo horario",
      }) as HTMLButtonElement
    ).disabled,
    true,
  );
  await act(async () => {
    late!(["09:00"]);
  });
  assert.equal(screen.queryByRole("option", { name: "09:00" }), null);
});
test("catálogo público no solicita citas ni directorio clínico", async (t) => {
  const { repositories } = await import("../data/factory");
  const { useCatalogoPublico } = await import("../hooks");
  let privateCalls = 0;
  t.mock.method(repositories.citas, "listarServicios", async () => []);
  t.mock.method(repositories.citas, "listarDentistas", async () => []);
  t.mock.method(repositories.citas, "listarCitasPorPaciente", async () => {
    privateCalls++;
    return [];
  });
  t.mock.method(repositories.pacientes, "listarPacientes", async () => {
    privateCalls++;
    return [];
  });
  function Catalog() {
    const q = useCatalogoPublico();
    return <p>{q.loading ? "Cargando" : "Catálogo listo"}</p>;
  }
  render(<Catalog />);
  await screen.findByText("Catálogo listo");
  assert.equal(privateCalls, 0);
});
test("portal paciente: cargar ficha propia no consulta el directorio", async (t) => {
  const { repositories } = await import("../data/factory");
  const { usePacientes } = await import("../hooks");
  let directory = 0;
  const requested: string[] = [];
  t.mock.method(repositories.pacientes, "listarPacientes", async () => {
    directory++;
    throw new Error("403");
  });
  t.mock.method(
    repositories.pacientes,
    "obtenerPacientePorId",
    async (id: string) => {
      requested.push(id);
      return null;
    },
  );
  t.mock.method(
    repositories.pacientes,
    "obtenerHistorialClinico",
    async () => [],
  );
  t.mock.method(
    repositories.pacientes,
    "obtenerTratamientosPorPaciente",
    async () => [],
  );
  function Patient() {
    const q = usePacientes("own-id", { directorio: false });
    return <p>{q.loading ? "Cargando" : "Ficha consultada"}</p>;
  }
  render(<Patient />);
  await screen.findByText("Ficha consultada");
  assert.equal(directory, 0);
  assert.deepEqual(requested, ["own-id"]);
});

test("operación clínica pendiente impide cambiar el contexto hasta finalizar", async () => {
  const { useAnyOperationPending } = await import("../hooks/use-operation");
  let finish: (() => void) | undefined;
  function Workspace() {
    const busy = useAnyOperationPending();
    return (
      <>
        <button disabled={busy}>Cambiar paciente</button>
        <AsyncForm
          onSubmit={() =>
            new Promise<void>((r) => {
              finish = r;
            })
          }
        >
          <button type="submit">Guardar nota</button>
        </AsyncForm>
      </>
    );
  }
  render(<Workspace />);
  fireEvent.click(screen.getByRole("button", { name: "Guardar nota" }));
  assert.equal(
    (
      screen.getByRole("button", {
        name: "Cambiar paciente",
      }) as HTMLButtonElement
    ).disabled,
    true,
  );
  await act(async () => finish!());
  assert.equal(
    (
      screen.getByRole("button", {
        name: "Cambiar paciente",
      }) as HTMLButtonElement
    ).disabled,
    false,
  );
});
