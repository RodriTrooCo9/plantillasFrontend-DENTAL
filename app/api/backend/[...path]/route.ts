import { NextRequest, NextResponse } from "next/server";
import { backendUrl, sessionCookie, SESSION_COOKIE } from "@/data/auth/server";
import { authSchema } from "@/data/http/schemas";
export const dynamic = "force-dynamic";
const paths =
  /^(auth\/(login|refresh|me|logout|forgot-password)|pacientes(?:\/[^/]+(?:\/(historial|tratamientos))?)?|tratamientos\/[^/]+|servicios|dentistas(?:\/[^/]+\/(disponibilidad|bloqueos))?|citas(?:\/[^/]+\/(cancelar|reagendar))?|odontogramas\/[^/]+(?:\/dientes\/\d{2})?|chat)$/;
function failure(message: string, status: number) {
  return NextResponse.json(
    { message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  if (process.env.NEXT_PUBLIC_DATA_SOURCE !== "http")
    return failure("API real deshabilitada en modo demo.", 404);
  const { path } = await context.params;
  if (
    path.some((p) => !p || /[\\/.%?#]/.test(p)) ||
    !paths.test(path.join("/"))
  )
    return failure("Ruta no permitida.", 404);
  const endpoint = path.join("/");
  if (
    request.method !== "GET" &&
    request.headers.get("origin") !== request.nextUrl.origin
  )
    return failure("Origen no permitido.", 403);
  const cookie = sessionCookie(request.headers.get("cookie"));
  try {
    const headers = new Headers();
    if (cookie) headers.set("cookie", cookie);
    const bearer = request.headers.get("authorization");
    if (bearer?.startsWith("Bearer ")) headers.set("authorization", bearer);
    let payload: string | undefined;
    if (request.method !== "GET") {
      const raw = await request.text();
      if (raw.length > 64 * 1024)
        return failure("Solicitud demasiado grande.", 413);
      if (raw) {
        try {
          JSON.parse(raw);
        } catch {
          return failure("JSON de solicitud inválido.", 400);
        }
        payload = raw;
        headers.set("content-type", "application/json");
      }
    }
    const query = new URLSearchParams();
    for (const key of ["q", "pacienteId", "dentistaId", "fecha", "servicioId"])
      for (const value of request.nextUrl.searchParams.getAll(key))
        query.append(key, value);
    const response = await fetch(
      backendUrl(`/${endpoint}${query.size ? `?${query}` : ""}`),
      {
        method: request.method,
        headers,
        body: payload,
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(15000),
      },
    );
    const text = await response.text();
    let value: unknown = text ? JSON.parse(text) : undefined;
    if (
      response.ok &&
      (endpoint === "auth/login" || endpoint === "auth/refresh")
    ) {
      const parsed = authSchema.safeParse(value);
      if (!parsed.success)
        return failure("Respuesta de autenticación inválida.", 502);
      const { refresh_token: ignored, ...publicSession } = parsed.data;
      void ignored;
      value = publicSession;
    }
    const output =
      response.status === 204
        ? new NextResponse(null, { status: 204 })
        : NextResponse.json(value ?? null, { status: response.status });
    output.headers.set("Cache-Control", "no-store");
    // Only the documented refresh cookie crosses the proxy boundary.
    const cookies = response.headers.getSetCookie();
    const refreshCookie = cookies.find((c) =>
      c.startsWith(`${SESSION_COOKIE}=`),
    );
    if (refreshCookie) {
      const parts = refreshCookie.split(";");
      const pair = parts[0];
      const age = parts.find((p) => /^\s*max-age=/i.test(p));
      const expires = parts.find((p) => /^\s*expires=/i.test(p));
      output.headers.append(
        "Set-Cookie",
        [
          pair,
          "Path=/",
          "HttpOnly",
          "SameSite=Lax",
          process.env.NODE_ENV === "production" ? "Secure" : "",
          age,
          expires,
        ]
          .filter(Boolean)
          .join("; "),
      );
    } else if (response.ok && endpoint === "auth/login")
      return failure("El servidor no estableció la cookie de sesión.", 502);
    if (endpoint === "auth/logout")
      output.cookies.set(SESSION_COOKIE, "", {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 0,
      });
    return output;
  } catch {
    const output = failure("No fue posible conectar con el servidor.", 502);
    if (endpoint === "auth/logout")
      output.cookies.set(SESSION_COOKIE, "", {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 0,
      });
    return output;
  }
}
export { proxy as GET, proxy as POST, proxy as PATCH };
