import type { Cita } from "./index";
export const CLINIC_TIME_ZONE =
  process.env.NEXT_PUBLIC_CLINIC_TIME_ZONE || "America/Mexico_City";
export class ClinicalError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "CLINICAL_VALIDATION",
  ) {
    super(message);
    this.name = "ClinicalError";
  }
}
export function isFDI(n: number) {
  return (
    Number.isInteger(n) &&
    [1, 2, 3, 4].includes(Math.floor(n / 10)) &&
    n % 10 >= 1 &&
    n % 10 <= 8
  );
}
export function today(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CLINIC_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function clinicInstant(date: string, time: string) {
  const local = Date.parse(`${date}T${time}:00Z`);
  let result = local;
  for (let i = 0; i < 2; i++) {
    const name =
      new Intl.DateTimeFormat("en", {
        timeZone: CLINIC_TIME_ZONE,
        timeZoneName: "longOffset",
      })
        .formatToParts(new Date(result))
        .find((p) => p.type === "timeZoneName")?.value || "GMT";
    const parts = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
    const offset = parts
      ? (Number(parts[2]) * 60 + Number(parts[3])) * (parts[1] === "+" ? 1 : -1)
      : 0;
    result = local - offset * 60000;
  }
  return new Date(result);
}
export function minutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
export function overlaps(
  start: number,
  end: number,
  otherStart: number,
  otherEnd: number,
) {
  return start < otherEnd && end > otherStart;
}
export function futureAppointment(c: Cita, now = new Date()) {
  return (
    ["CONFIRMADA", "REPROGRAMADA", "EN_SALA"].includes(c.estado) &&
    clinicInstant(c.fecha, c.hora) >= now
  );
}
export function notificationText(state: Cita["estadoNotificacion"]) {
  return state === "enviada"
    ? "Notificación enviada."
    : state === "pendiente"
      ? "Notificación pendiente."
      : state === "solicitada"
        ? "Notificación solicitada."
        : "Sin confirmación de notificación.";
}
export function operationError(error: unknown) {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? error.status
      : undefined;
  if (status === 409)
    return "Ese horario o recurso acaba de cambiar. Actualiza los datos e inténtalo nuevamente.";
  if (status === 401) return "Tu sesión expiró. Inicia sesión nuevamente.";
  if (status === 403) return "No tienes permiso para realizar esta operación.";
  return error instanceof Error
    ? error.message
    : "No fue posible completar la operación. Vuelve a intentarlo.";
}
export function weekDays(anchor: string) {
  const date = new Date(`${anchor}T12:00:00Z`);
  const monday = addDays(anchor, -((date.getUTCDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}
