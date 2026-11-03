import { z } from "zod";

export const idSchema = z.string().min(1).max(200);
export const dateSchema = z.iso.date();
export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const fdiSchema = z
  .number()
  .int()
  .refine(
    (n) =>
      [1, 2, 3, 4].includes(Math.floor(n / 10)) && n % 10 >= 1 && n % 10 <= 8,
    "Pieza FDI inválida",
  );
export const toothStateSchema = z.enum([
  "SANO",
  "CARIES",
  "OBTURADO",
  "ENDODONCIA",
  "CORONA",
  "AUSENTE",
  "IMPLANTE",
]);
export const surfaceSchema = z.enum([
  "oclusal",
  "vestibular",
  "lingual",
  "mesial",
  "distal",
  "GENERAL",
]);
export const userSchema = z
  .object({
    id: idSchema,
    email: z.email(),
    nombre_completo: z.string().min(1),
    rol: z.enum(["PACIENTE", "DENTISTA"]),
    paciente_id: idSchema.nullish(),
    dentista_id: idSchema.nullish(),
    avatar_url: z.string().nullable().optional(),
  })
  .refine(
    (u) => (u.rol === "PACIENTE" ? !!u.paciente_id : !!u.dentista_id),
    "Identidad clínica incompleta",
  );
export const authSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
  expires_in: z.number().positive(),
  user: userSchema,
});
export const recoverySchema = z.object({ message: z.string().min(1) });
export const pacienteSchema = z.object({
  id: idSchema,
  documento: z.string(),
  codigo_expediente: z.string().min(1),
  nombre_completo: z.string().min(1),
  email: z.email(),
  telefono: z.string(),
  fecha_nacimiento: dateSchema,
  edad: z.number().int().nonnegative(),
  grupo_sanguineo: z.string(),
  alergias: z.array(z.string()),
  condiciones_medicas: z.array(z.string()),
  alertas_clinicas: z.array(z.string()),
  fecha_registro: dateSchema,
  odontologo_cabecera_id: idSchema,
  odontologo_cabecera_nombre: z.string().min(1),
});
export const citaSchema = z.object({
  id: idSchema,
  pacienteId: idSchema,
  pacienteNombre: z.string(),
  dentistaId: idSchema,
  dentistaNombre: z.string(),
  servicioId: idSchema,
  servicioNombre: z.string(),
  tratamientoId: idSchema.nullish(),
  fecha: dateSchema,
  horaInicio: timeSchema,
  estado: z.enum([
    "CONFIRMADA",
    "EN_SALA",
    "COMPLETADA",
    "CANCELADA",
    "REPROGRAMADA",
  ]),
  motivo: z.string(),
  costoMXN: z.number().nonnegative(),
  estadoNotificacion: z.enum(["solicitada", "pendiente", "enviada"]).optional(),
});
export const historialSchema = z.object({
  id: idSchema,
  pacienteId: idSchema,
  fecha: dateSchema,
  dentistaId: idSchema,
  dentistaNombre: z.string(),
  tipo: z.enum([
    "CONSULTA",
    "DIAGNOSTICO",
    "PROCEDIMIENTO",
    "CONTROL_PERIODONTAL",
  ]),
  diagnostico: z.string(),
  procedimientoRealizado: z.string(),
  notasEvolucion: z.string(),
});
export const tratamientoSchema = z
  .object({
    id: idSchema,
    pacienteId: idSchema,
    dentistaId: idSchema,
    dentistaNombre: z.string(),
    servicioId: idSchema,
    nombre: z.string(),
    estado: z.enum(["PLANIFICADO", "EN_CURSO", "FINALIZADO"]),
    fechaInicio: dateSchema,
    progresoPorcentaje: z.number().min(0).max(100),
    sesionesCompletadas: z.number().int().nonnegative(),
    sesionesTotales: z.number().int().positive(),
    costoTotal: z.number().nonnegative(),
    dientesInvolucrados: z.array(fdiSchema),
    proximaFechaSugerida: dateSchema,
    notasEvolucion: z.string(),
  })
  .refine(
    (t) => t.sesionesCompletadas <= t.sesionesTotales,
    "Sesiones incoherentes",
  );
export const bloqueoSchema = z
  .object({
    id: idSchema,
    dentistaId: idSchema,
    fecha: dateSchema,
    horaInicio: timeSchema,
    horaFin: timeSchema,
    motivo: z.string(),
  })
  .refine((b) => b.horaFin > b.horaInicio, "Rango invertido");
export const servicioSchema = z.object({
  id: idSchema,
  codigo: z.string(),
  nombre: z.string(),
  categoria: z.enum([
    "Prevención",
    "Ortodoncia",
    "Estética",
    "Endodoncia",
    "Implantología",
    "Odontopediatría",
  ]),
  descripcionCorta: z.string(),
  protocoloClinico: z.string(),
  beneficioMedible: z.string(),
  precioBaseMXN: z.number().nonnegative(),
  duracionMinutos: z.number().int().positive(),
  garantiaAnios: z.number().nonnegative(),
});
export const dentistaSchema = z.object({
  id: idSchema,
  nombreCompleto: z.string(),
  email: z.email(),
  cedulaProfesional: z.string(),
  especialidad: z.string(),
  biografiaCorta: z.string(),
  diasAtencion: z.array(z.string()),
  horariosDisponibles: z.array(timeSchema),
  bloqueos: z.array(bloqueoSchema),
});
export const disponibilidadSchema = z.array(
  z.object({
    hora: timeSchema,
    disponible: z.boolean(),
    motivoNoDisponible: z.string().optional(),
  }),
);
export const dienteSchema = z
  .object({
    numeroFDI: fdiSchema,
    nombreAnatomico: z.string(),
    cuadrante: z.union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
    ]),
    estadoGeneral: toothStateSchema,
    superficies: z.object({
      oclusal: toothStateSchema,
      vestibular: toothStateSchema,
      lingual: toothStateSchema,
      mesial: toothStateSchema,
      distal: toothStateSchema,
    }),
    ultimaActualizacion: dateSchema,
    notaClinica: z.string(),
  })
  .refine(
    (d) => Math.floor(d.numeroFDI / 10) === d.cuadrante,
    "Cuadrante incoherente",
  );
export const cambioSchema = z.object({
  id: idSchema,
  pacienteId: idSchema,
  numeroFDI: fdiSchema,
  superficie: surfaceSchema,
  estadoAnterior: toothStateSchema,
  estadoNuevo: toothStateSchema,
  procedimiento: z.string(),
  nota: z.string(),
  autorNombre: z.string(),
  autorRol: z.literal("DENTISTA"),
  fechaHora: z.iso.datetime({ offset: true }),
});
export const odontogramaSchema = z
  .object({
    pacienteId: idSchema,
    actualizadoEn: dateSchema,
    dientes: z.array(dienteSchema).length(32),
    historial_cambios: z.array(cambioSchema),
  })
  .refine(
    (o) =>
      new Set(o.dientes.map((d) => d.numeroFDI)).size === 32 &&
      o.historial_cambios.every((c) => c.pacienteId === o.pacienteId),
    "Odontograma incoherente",
  );
export const actionTypeSchema = z.enum([
  "MOSTRAR_SERVICIOS",
  "MOSTRAR_CITAS",
  "AGENDAR_CITA",
  "CANCELAR_CITA",
  "REAGENDAR_CITA",
  "CONTINUAR_TRATAMIENTO",
  "ABRIR_ODONTOGRAMA",
  "MODIFICAR_ODONTOGRAMA",
  "IR_A_LOGIN",
]);
export const confirmacionSchema = z.object({
  id: idSchema,
  token: z.string().min(1),
});
const actionSchema = z
  .object({
    tipo: z.union([actionTypeSchema, z.literal("NINGUNA")]),
    descripcion: z.string(),
    requiere_confirmacion: z.boolean(),
    payload_confirmacion: confirmacionSchema.optional(),
  })
  .refine(
    (a) => !a.requiere_confirmacion || !!a.payload_confirmacion,
    "Falta confirmación",
  );
export const chatSchema = z.object({
  mensaje: z.string(),
  tarjetas: z.array(
    z.discriminatedUnion("tipo", [
      z.object({
        tipo: z.literal("TARJETA_CITAS"),
        datos: z.array(citaSchema),
      }),
      z.object({
        tipo: z.literal("MINI_ODONTOGRAMA"),
        datos: odontogramaSchema,
      }),
      z.object({
        tipo: z.literal("RESUMEN_TRATAMIENTOS"),
        datos: z.array(tratamientoSchema),
      }),
      z.object({
        tipo: z.literal("TABLA_SERVICIOS"),
        datos: z.array(servicioSchema),
      }),
    ]),
  ),
  sugerencias: z.array(z.string()),
  accion_ejecutada: actionSchema,
});
export type AuthDto = z.infer<typeof authSchema>;
export type UserDto = z.infer<typeof userSchema>;
export type PacienteDto = z.infer<typeof pacienteSchema>;
export type CitaDto = z.infer<typeof citaSchema>;
export type HistorialDto = z.infer<typeof historialSchema>;
export type TratamientoDto = z.infer<typeof tratamientoSchema>;
export type OdontogramaDto = z.infer<typeof odontogramaSchema>;
export type ChatDto = z.infer<typeof chatSchema>;
