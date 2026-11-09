/**
 * Utilidades de formato clínico y monetario (Bolivia / es-BO)
 */

/**
 * Formatea un monto numérico en Bolivianos (Bs) con números tabulares para alineación financiera.
 * Ejemplo: formatCurrencyBs(1250) -> "Bs 1.250,00"
 */
export function formatCurrencyBs(amount: number | null | undefined): string {
  const numeric = typeof amount === "number" && !isNaN(amount) ? amount : 0;
  const formatted = numeric.toLocaleString("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `Bs ${formatted}`;
}

/**
 * Formato abreviado de moneda en Bs para badges o espacios reducidos.
 */
export function formatCurrencyBsCompact(amount: number): string {
  const numeric = typeof amount === "number" && !isNaN(amount) ? amount : 0;
  return `Bs ${numeric.toLocaleString("es-BO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

/**
 * Formatea una fecha ISO a formato legible clínico en español (Bolivia).
 * Ejemplo: "2026-11-09" -> "09 nov 2026"
 */
export function formatFechaClinica(dateStr: string): string {
  if (!dateStr) return "Fecha no registrada";
  try {
    const parts = dateStr.split("T")[0].split("-");
    if (parts.length === 3) {
      const [year, month, day] = parts;
      const date = new Date(Number(year), Number(month) - 1, Number(day));
      return date.toLocaleDateString("es-BO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
    return new Date(dateStr).toLocaleDateString("es-BO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Calcula la edad a partir de la fecha de nacimiento.
 */
export function calcularEdad(fechaNacimiento: string): number {
  if (!fechaNacimiento) return 0;
  const hoy = new Date();
  const nac = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) {
    edad--;
  }
  return isNaN(edad) || edad < 0 ? 0 : edad;
}
