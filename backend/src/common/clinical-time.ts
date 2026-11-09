export const CLINIC_TIME_ZONE =
  process.env.CLINIC_TIME_ZONE || "America/Mexico_City";

export const ORDEN_32_DIENTES_FDI: number[] = [
  18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
  48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
];

export const DIAS_SEMANA_ES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

export const FERIADOS_OFICIALES_MMDD = [
  "01-01", // Año Nuevo
  "05-01", // Día del Trabajo
  "09-16", // Día de la Independencia
  "12-25", // Navidad
];

export const SUPERFICIES_DENTALES_VALIDAS = [
  "oclusal",
  "vestibular",
  "lingual",
  "mesial",
  "distal",
  "GENERAL",
] as const;

export function isFDI(n: number): boolean {
  return (
    Number.isInteger(n) &&
    [1, 2, 3, 4].includes(Math.floor(n / 10)) &&
    n % 10 >= 1 &&
    n % 10 <= 8
  );
}

export function isValidToothSurface(surface: string): boolean {
  return (SUPERFICIES_DENTALES_VALIDAS as readonly string[]).includes(surface);
}

export function dayNameInSpanish(dateIso: string): string {
  const d = new Date(`${dateIso}T12:00:00Z`);
  return DIAS_SEMANA_ES[d.getUTCDay()] || "";
}

export function isOfficialHoliday(dateIso: string): boolean {
  const mmdd = dateIso.slice(5, 10);
  return FERIADOS_OFICIALES_MMDD.includes(mmdd);
}

export function todayInClinic(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CLINIC_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function clinicInstant(date: string, time: string): Date {
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
      ? (Number(parts[2]) * 60 + Number(parts[3])) *
        (parts[1] === "+" ? 1 : -1)
      : 0;
    result = local - offset * 60000;
  }
  return new Date(result);
}

export function minutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function overlaps(
  start: number,
  end: number,
  otherStart: number,
  otherEnd: number,
): boolean {
  return start < otherEnd && end > otherStart;
}
