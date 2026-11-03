import test from "node:test";
import assert from "node:assert/strict";
import {
  authSchema,
  disponibilidadSchema,
  fdiSchema,
  chatSchema,
} from "../data/http/schemas";
test("contrato: login anidado y datos clínicos obligatorios por rol", () => {
  const dto = {
    access_token: "a",
    expires_in: 3600,
    user: {
      id: "u",
      email: "a@example.com",
      nombre_completo: "Ana",
      rol: "PACIENTE",
      paciente_id: "p",
    },
  };
  assert.equal(authSchema.parse(dto).user.paciente_id, "p");
  assert.equal(
    authSchema.safeParse({ ...dto, user: { ...dto.user, paciente_id: null } })
      .success,
    false,
  );
  assert.equal(
    authSchema.safeParse({ accessToken: "a", rol: "PACIENTE" }).success,
    false,
  );
});
test("contrato: disponibilidad es una lista de objetos con disponibilidad explícita", () => {
  assert.equal(
    disponibilidadSchema.parse([{ hora: "09:00", disponible: false }])[0]
      .disponible,
    false,
  );
  assert.equal(disponibilidadSchema.safeParse(["09:00"]).success, false);
});
test("dominio FDI: únicamente las 32 piezas permanentes", () => {
  for (const q of [1, 2, 3, 4])
    for (let i = 1; i <= 8; i++)
      assert.equal(fdiSchema.parse(q * 10 + i), q * 10 + i);
  for (const n of [0, 10, 19, 29, 39, 49, 99, 16.5])
    assert.equal(fdiSchema.safeParse(n).success, false);
});
test("chat: no aceptar acciones sensibles sin token de confirmación", () => {
  assert.equal(
    chatSchema.safeParse({
      mensaje: "Confirmar",
      tarjetas: [],
      sugerencias: [],
      accion_ejecutada: {
        tipo: "CANCELAR_CITA",
        descripcion: "Cancelar",
        requiere_confirmacion: true,
      },
    }).success,
    false,
  );
});
