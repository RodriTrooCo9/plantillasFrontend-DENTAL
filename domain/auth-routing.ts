import type { RolUsuario } from "./index";
export function roleDestination(role: RolUsuario) {
  return role === "DENTISTA" ? "/dentista" : "/paciente";
}
export function safeNext(value: string | null | undefined, role: RolUsuario) {
  const home = roleDestination(role);
  if (!value || !value.startsWith("/") || value.includes("\\")) return home;
  try {
    const url = new URL(value, "http://local.invalid");
    if (
      url.origin !== "http://local.invalid" ||
      (url.pathname !== home && !url.pathname.startsWith(`${home}/`))
    )
      return home;
    return url.pathname + url.search + url.hash;
  } catch {
    return home;
  }
}
export function bookingDestination(
  serviceId: string | undefined,
  role?: RolUsuario,
) {
  const target = `/paciente${serviceId ? `?servicio=${encodeURIComponent(serviceId)}` : ""}`;
  return role
    ? safeNext(target, role)
    : `/login?next=${encodeURIComponent(target)}`;
}
