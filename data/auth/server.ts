import { userSchema } from "@/data/http/schemas";
export const SESSION_COOKIE = "lumina_refresh";
export function backendUrl(path: string) {
  const base =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:4000/api/v1";
  return `${base.replace(/\/$/, "")}${path}`;
}
export function sessionCookie(cookie: string | null): string {
  return (
    (cookie || "")
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith(`${SESSION_COOKIE}=`)) || ""
  );
}
export async function validateServerSession(cookie: string | null) {
  const value = sessionCookie(cookie);
  if (!value) return null;
  const response = await fetch(backendUrl("/auth/me"), {
    headers: { cookie: value },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(5000),
  });
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) throw new Error("No fue posible verificar la sesión.");
  return userSchema.parse(await response.json());
}
