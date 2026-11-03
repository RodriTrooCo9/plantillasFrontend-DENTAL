import React from "react";
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
  act,
} from "@testing-library/react";
import { Modal, Tabs, TabPanel, Input } from "../components/ui";
import { Odontograma32View } from "../features/odontograma/Odontograma32View";
import { mapOdontogramaDtoToDomain } from "../data/http/mappers";
import { odontogramaDto } from "./fixtures";
afterEach(cleanup);
test("modal: foco inicial, Tab/Shift+Tab, Escape, fondo inerte y retorno al disparador", () => {
  function Example() {
    const [open, setOpen] = React.useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>Abrir</button>
        <Modal isOpen={open} onClose={() => setOpen(false)} title="Confirmar">
          <Input label="Nota" />
          <button type="button">Guardar</button>
        </Modal>
      </>
    );
  }
  const view = render(<Example />);
  const trigger = screen.getByRole("button", { name: "Abrir" });
  trigger.focus();
  fireEvent.click(trigger);
  const close = screen.getByRole("button", { name: "Cerrar ventana" }),
    save = screen.getByRole("button", { name: "Guardar" }),
    dialog = screen.getByRole("dialog");
  assert.ok(document.activeElement === close, "el foco debe estar en cerrar");
  assert.equal(view.container.hasAttribute("inert"), true);
  save.focus();
  fireEvent.keyDown(dialog, { key: "Tab" });
  assert.ok(document.activeElement === close, "el foco debe estar en cerrar");
  fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
  assert.ok(document.activeElement === save, "el foco debe estar en guardar");
  fireEvent.keyDown(dialog, { key: "Escape" });
  assert.ok(screen.queryByRole("dialog") === null, "modal cerrado");
  assert.ok(
    document.activeElement === trigger,
    "el foco debe volver al disparador",
  );
  assert.equal(view.container.hasAttribute("inert"), false);
});
test("pestañas: flechas, Home/End, tabulación y panel asociado", () => {
  function Example() {
    const [active, setActive] = React.useState("a");
    return (
      <>
        <Tabs
          id="example"
          tabs={[
            { id: "a", label: "Agenda" },
            { id: "b", label: "Historial" },
            { id: "c", label: "Tratamientos" },
          ]}
          activeTab={active}
          onChange={setActive}
          ariaLabel="Portal"
        />
        <TabPanel id="example" activeTab={active}>
          {active}
        </TabPanel>
      </>
    );
  }
  render(<Example />);
  const a = screen.getByRole("tab", { name: "Agenda" });
  a.focus();
  fireEvent.keyDown(a, { key: "ArrowRight" });
  const b = screen.getByRole("tab", { name: "Historial" });
  assert.ok(document.activeElement === b, "foco en segunda pestaña");
  assert.equal(b.getAttribute("aria-selected"), "true");
  assert.equal(a.tabIndex, -1);
  assert.equal(
    screen.getByRole("tabpanel").id,
    b.getAttribute("aria-controls"),
  );
  fireEvent.keyDown(b, { key: "End" });
  assert.ok(
    document.activeElement ===
      screen.getByRole("tab", { name: "Tratamientos" }),
    "foco en última pestaña",
  );
  fireEvent.keyDown(document.activeElement!, { key: "Home" });
  assert.ok(document.activeElement === a, "foco en primera pestaña");
  fireEvent.keyDown(a, { key: "ArrowLeft" });
  assert.ok(
    document.activeElement ===
      screen.getByRole("tab", { name: "Tratamientos" }),
    "foco en última pestaña",
  );
});
test("input: etiqueta automática, aria-invalid y descripción de error vinculada", () => {
  render(
    <Input
      label="Sesiones"
      error="Debe haber al menos una sesión"
      aria-describedby="help"
    />,
  );
  const input = screen.getByLabelText("Sesiones");
  assert.equal(input.getAttribute("aria-invalid"), "true");
  const error = screen.getByRole("alert");
  assert.ok(error.id);
  assert.ok(
    input.getAttribute("aria-describedby")!.split(" ").includes(error.id),
  );
  assert.match(input.getAttribute("aria-describedby")!, /help/);
});
test("odontograma: sin nuevo estado por defecto, limpia borrador por pieza/paciente y lectura del paciente", () => {
  const odontograma = mapOdontogramaDtoToDomain(odontogramaDto);
  const view = render(
    <Odontograma32View
      odontograma={odontograma}
      pacienteNombre="Ana"
      editable
      onGuardarCambio={async () => {}}
    />,
  );
  assert.equal(
    (screen.getByLabelText("Nuevo estado clínico") as HTMLSelectElement).value,
    "",
  );
  fireEvent.change(screen.getByLabelText("Nota clínica de evolución"), {
    target: { value: "Borrador de pieza 16" },
  });
  fireEvent.change(screen.getByLabelText("Nuevo estado clínico"), {
    target: { value: "OBTURADO" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Diente FDI 26 / }));
  assert.equal(
    (screen.getByLabelText("Nota clínica de evolución") as HTMLInputElement)
      .value,
    "",
  );
  assert.equal(
    (screen.getByLabelText("Nuevo estado clínico") as HTMLSelectElement).value,
    "",
  );
  assert.equal(
    screen
      .getByRole("button", { name: /Diente FDI 26 / })
      .getAttribute("aria-pressed"),
    "true",
  );
  view.rerender(
    <Odontograma32View
      odontograma={{ ...odontograma, pacienteId: "other" }}
      pacienteNombre="Otro"
      editable
    />,
  );
  assert.equal(
    (screen.getByLabelText("Nuevo estado clínico") as HTMLSelectElement).value,
    "",
  );
  view.rerender(
    <Odontograma32View
      odontograma={odontograma}
      pacienteNombre="Ana"
      editable={false}
    />,
  );
  assert.equal(screen.queryByRole("button", { name: /Guardar Cambio/ }), null);
  view.rerender(
    <Odontograma32View
      odontograma={{ ...odontograma, dientes: [] }}
      pacienteNombre="Ana"
      editable={false}
    />,
  );
  assert.match(screen.getByRole("alert").textContent!, /incompletos/);
});
test("odontograma: error de guardado conserva procedimiento y permite reintento", async () => {
  render(
    <Odontograma32View
      odontograma={mapOdontogramaDtoToDomain(odontogramaDto)}
      pacienteNombre="Ana"
      editable
      onGuardarCambio={async () => {
        throw { status: 409 };
      }}
    />,
  );
  fireEvent.change(screen.getByLabelText("Nuevo estado clínico"), {
    target: { value: "OBTURADO" },
  });
  fireEvent.change(screen.getByLabelText("Procedimiento realizado"), {
    target: { value: "Resina sintética" },
  });
  fireEvent.change(screen.getByLabelText("Nota clínica de evolución"), {
    target: { value: "Nota sintética" },
  });
  fireEvent.click(
    screen.getByRole("button", {
      name: "Guardar Cambio y Registrar en Auditoría",
    }),
  );
  await waitFor(() =>
    assert.match(screen.getByRole("alert").textContent!, /acaba de cambiar/),
  );
  assert.equal(
    (screen.getByLabelText("Procedimiento realizado") as HTMLInputElement)
      .value,
    "Resina sintética",
  );
});
