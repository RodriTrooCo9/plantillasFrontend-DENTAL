import { z } from "zod";
import { isFDI } from "./clinical";
const date = z.iso.date();
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horario inválido");
export const treatmentInputSchema = z.object({
  nombre: z.string().trim().min(1, "Escribe el nombre del tratamiento"),
  sesionesTotales: z.number().int().min(1, "Debe haber al menos una sesión"),
  costoTotalMXN: z.number().min(0, "El costo no puede ser negativo"),
  dientesFDI: z
    .array(z.number().refine(isFDI, "Pieza FDI inválida"))
    .min(1, "Selecciona al menos una pieza"),
});
export const blockInputSchema = z
  .object({
    fecha: date,
    horaInicio: time,
    horaFin: time,
    motivo: z.string().trim().min(1, "Escribe un motivo"),
  })
  .refine((b) => b.horaFin > b.horaInicio, {
    path: ["horaFin"],
    message: "La hora final debe ser posterior a la inicial",
  });
export const bookingInputSchema = z.object({
  pacienteId: z.string().min(1),
  dentistaId: z.string().min(1),
  servicioId: z.string().min(1),
  fecha: date,
  hora: time,
  motivoConsulta: z.string(),
});
export const toothInputSchema = z.object({
  numeroFDI: z.number().refine(isFDI, "Pieza FDI inválida"),
  procedimiento: z.string().trim().min(1, "Describe el procedimiento"),
  nota: z.string().trim().min(1, "Escribe una nota clínica"),
});
