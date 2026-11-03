import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { middleware } from "../middleware";
import { GET, POST } from "../app/api/backend/[...path]/route";
import { safeNext } from "../domain/auth-routing";
import { sessionCookie } from "../data/auth/server";
import * as f from "./fixtures";
function configure(t: import("node:test").TestContext) {
  const oldMode = process.env.NEXT_PUBLIC_DATA_SOURCE,
    oldApi = process.env.API_URL;
  process.env.NEXT_PUBLIC_DATA_SOURCE = "http";
  process.env.API_URL = "https://nest.example.invalid/api/v1";
  t.after(() => {
    if (oldMode === undefined) delete process.env.NEXT_PUBLIC_DATA_SOURCE;
    else process.env.NEXT_PUBLIC_DATA_SOURCE = oldMode;
    if (oldApi === undefined) delete process.env.API_URL;
    else process.env.API_URL = oldApi;
  });
}
function request(
  path: string,
  method = "GET",
  body?: unknown,
  origin = "https://clinic.example.invalid",
) {
  return new NextRequest(`https://clinic.example.invalid${path}`, {
    method,
    headers: {
      origin,
      cookie: "lumina_refresh=session-a; other_secret=not-forwarded",
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}
const context = (...path: string[]) => ({ params: Promise.resolve({ path }) });
test("middleware: sin sesión o con cookie de rol falsificada redirige a login conservando destino", async (t) => {
  configure(t);
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return Response.json(f.doctorUser);
  });
  const response = await middleware(
    new NextRequest("https://clinic.example.invalid/paciente?servicio=s-a", {
      headers: { cookie: "lumina_role=DENTISTA" },
    }),
  );
  assert.equal(response.status, 307);
  const destination = new URL(response.headers.get("location")!);
  assert.equal(destination.pathname, "/login");
  assert.equal(destination.searchParams.get("next"), "/paciente?servicio=s-a");
  assert.equal(calls, 0);
});
test("middleware: valida en Nest, permite recurso propio y redirige rol incorrecto", async (t) => {
  configure(t);
  t.mock.method(
    globalThis,
    "fetch",
    async (input: string, init?: RequestInit) => {
      assert.equal(input, "https://nest.example.invalid/api/v1/auth/me");
      assert.equal(
        new Headers(init?.headers).get("cookie"),
        "lumina_refresh=session-a",
      );
      assert.equal(init?.cache, "no-store");
      return Response.json(f.patientUser);
    },
  );
  const allowed = await middleware(request("/paciente"));
  assert.equal(allowed.headers.get("x-middleware-next"), "1");
  const rejected = await middleware(request("/dentista"));
  assert.equal(
    new URL(rejected.headers.get("location")!).pathname,
    "/paciente",
  );
});
test("middleware: sesión revocada, respuesta malformada y red caída nunca dan acceso", async (t) => {
  configure(t);
  for (const [mode, status] of [
    ["revoked", 307],
    ["malformed", 503],
    ["network", 503],
  ] as const) {
    t.mock.method(globalThis, "fetch", async () => {
      if (mode === "network") throw new TypeError("Network");
      return mode === "revoked"
        ? Response.json({ message: "Revocada" }, { status: 401 })
        : Response.json({ rol: "DENTISTA" });
    });
    assert.equal((await middleware(request("/dentista"))).status, status);
    t.mock.restoreAll();
  }
});
test("destino next: solo admite ruta local del rol; bloquea URL externa y rutas de otro rol", () => {
  assert.equal(
    safeNext("/paciente?servicio=s-a", "PACIENTE"),
    "/paciente?servicio=s-a",
  );
  for (const next of [
    "//evil.example",
    "https://evil.example",
    "/dentista",
    "/paciente/../../dentista",
    "/paciente\\evil",
  ])
    assert.equal(safeNext(next, "PACIENTE"), "/paciente");
  assert.equal(
    sessionCookie("other=x; lumina_refresh=a; role=DENTISTA"),
    "lumina_refresh=a",
  );
});
test("proxy: solo destino configurado, cookie HttpOnly normalizada y refresh fuera del cuerpo", async (t) => {
  configure(t);
  t.mock.method(
    globalThis,
    "fetch",
    async (input: string, init?: RequestInit) => {
      assert.equal(input, "https://nest.example.invalid/api/v1/auth/login");
      assert.equal(init?.redirect, "error");
      assert.equal(
        new Headers(init?.headers).get("cookie"),
        "lumina_refresh=session-a",
      );
      return Response.json(f.authDto, {
        headers: {
          "set-cookie":
            "lumina_refresh=rotated; Domain=nest.example.invalid; Path=/auth; Max-Age=3600",
        },
      });
    },
  );
  const response = await POST(
    request("/api/backend/auth/login", "POST", {
      email: "ana@example.com",
      password: "123456",
    }),
    context("auth", "login"),
  );
  assert.equal(response.status, 200);
  const dto = await response.json();
  assert.equal(dto.access_token, "access-a");
  assert.equal(dto.refresh_token, undefined);
  const cookie = response.headers.get("set-cookie")!;
  assert.ok(cookie.includes("HttpOnly"));
  assert.ok(cookie.includes("Path=/"));
  assert.ok(cookie.includes("SameSite=Lax"));
  assert.ok(!cookie.includes("Domain="));
  assert.equal(response.headers.get("cache-control"), "no-store");
});
test("proxy: rechaza otro origen, ruta arbitraria, JSON inválido y login sin cookie", async (t) => {
  configure(t);
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return Response.json(f.authDto);
  });
  assert.equal(
    (
      await POST(
        request("/api/backend/auth/login", "POST", {}, "https://evil.example"),
        context("auth", "login"),
      )
    ).status,
    403,
  );
  assert.equal(
    (await GET(request("/api/backend/admin"), context("admin"))).status,
    404,
  );
  assert.equal(
    (
      await GET(
        request("/api/backend/pacientes/escape"),
        context("pacientes", ".."),
      )
    ).status,
    404,
  );
  const invalid = new NextRequest(
    "https://clinic.example.invalid/api/backend/auth/login",
    {
      method: "POST",
      headers: { origin: "https://clinic.example.invalid" },
      body: "invalid",
    },
  );
  assert.equal((await POST(invalid, context("auth", "login"))).status, 400);
  assert.equal(calls, 0);
  assert.equal(
    (
      await POST(
        request("/api/backend/auth/login", "POST", {}),
        context("auth", "login"),
      )
    ).status,
    502,
  );
});
test("proxy: logout elimina cookie aunque Nest falle; soporta 204", async (t) => {
  configure(t);
  t.mock.method(globalThis, "fetch", async () => {
    throw new TypeError("Offline");
  });
  const failed = await POST(
    request("/api/backend/auth/logout", "POST"),
    context("auth", "logout"),
  );
  assert.equal(failed.status, 502);
  assert.match(failed.headers.get("set-cookie")!, /Max-Age=0/);
  t.mock.restoreAll();
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response(null, { status: 204 }),
  );
  const success = await POST(
    request("/api/backend/auth/logout", "POST"),
    context("auth", "logout"),
  );
  assert.equal(success.status, 204);
  assert.equal(await success.text(), "");
  assert.match(success.headers.get("set-cookie")!, /Max-Age=0/);
});
test("proxy: modo demo no expone acceso al servidor real", async (t) => {
  configure(t);
  process.env.NEXT_PUBLIC_DATA_SOURCE = "mock";
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return Response.json([]);
  });
  assert.equal(
    (await GET(request("/api/backend/pacientes"), context("pacientes"))).status,
    404,
  );
  assert.equal(calls, 0);
});

test("reservar conserva servicio y destino tras login, también con sesión existente", async () => {
  const { bookingDestination } = await import("../domain/auth-routing");
  const url = new URL(bookingDestination("s-a"), "http://local");
  assert.equal(url.pathname, "/login");
  assert.equal(url.searchParams.get("next"), "/paciente?servicio=s-a");
  assert.equal(bookingDestination("s-a", "PACIENTE"), "/paciente?servicio=s-a");
});
