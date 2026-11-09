import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
} from "class-validator";

export class CreatePacienteDto {
  @ApiProperty({ example: "CURP-DEMO-1001" })
  @IsString()
  @MinLength(5)
  documento: string;

  @ApiProperty({ example: "Carlos Rivera Gómez" })
  @IsString()
  @MinLength(3)
  nombreCompleto: string;

  @ApiProperty({ example: "carlos.rivera@demo.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "+52 55 4433 2211" })
  @IsString()
  @Matches(/^[+\d][\d\s-]{7,19}$/, {
    message: "El teléfono debe contener entre 8 y 20 dígitos válidos.",
  })
  telefono: string;

  @ApiProperty({ example: "1990-05-15" })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fechaNacimiento: string;

  @ApiProperty({ example: 36 })
  @IsInt()
  @Min(0)
  edad: number;

  @ApiProperty({ example: "O+" })
  @IsString()
  @MinLength(2)
  grupoSanguineo: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  alergias?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  condicionesMedicas?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  alertasClinicas?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  odontologoCabeceraId?: string;

  @ApiPropertyOptional({ description: "Obligatorio si el paciente es menor de 18 años" })
  @IsOptional()
  @IsString()
  tutorNombre?: string;

  @ApiPropertyOptional({ description: "Obligatorio si el paciente es menor de 18 años" })
  @IsOptional()
  @IsString()
  tutorTelefono?: string;
}

export class CreateHistorialDto {
  @ApiProperty({
    enum: ["CONSULTA", "DIAGNOSTICO", "PROCEDIMIENTO", "CONTROL_PERIODONTAL"],
  })
  @IsIn(["CONSULTA", "DIAGNOSTICO", "PROCEDIMIENTO", "CONTROL_PERIODONTAL"])
  tipo: "CONSULTA" | "DIAGNOSTICO" | "PROCEDIMIENTO" | "CONTROL_PERIODONTAL";

  @ApiProperty()
  @IsString()
  @MinLength(3)
  diagnostico: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  procedimientoRealizado: string;

  @ApiProperty()
  @IsString()
  notasEvolucion: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dentistaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dentistaNombre?: string;
}

export class CreateTratamientoDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  servicioId: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  nombre: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  costoTotal: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  sesionesTotales: number;

  @ApiProperty({ type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  dientesInvolucrados: number[];

  @ApiProperty({ example: "2026-12-01" })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  proximaFechaSugerida: string;

  @ApiProperty()
  @IsString()
  notasEvolucion: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dentistaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dentistaNombre?: string;
}

export class UpdateTratamientoDto {
  @ApiProperty({ enum: ["PLANIFICADO", "EN_CURSO", "FINALIZADO"] })
  @IsIn(["PLANIFICADO", "EN_CURSO", "FINALIZADO"])
  estado: "PLANIFICADO" | "EN_CURSO" | "FINALIZADO";

  @ApiProperty()
  @IsInt()
  @Min(0)
  sesionesCompletadas: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  presupuestoAprobado?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  costoTotal?: number;
}

export class CreatePagoDto {
  @ApiProperty({ example: 1500.5 })
  @IsNumber()
  montoMXN: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  descuentoMXN?: number;

  @ApiProperty({ enum: ["EFECTIVO", "TARJETA", "TRANSFERENCIA"] })
  @IsIn(["EFECTIVO", "TARJETA", "TRANSFERENCIA"])
  metodoPago: "EFECTIVO" | "TARJETA" | "TRANSFERENCIA";

  @ApiPropertyOptional({ description: "Clave de idempotencia contra doble clic" })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notas?: string;
}
