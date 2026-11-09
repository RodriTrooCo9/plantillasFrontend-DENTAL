import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from "class-validator";

export class CreateBloqueoDto {
  @ApiProperty({ example: "2026-12-01" })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fecha: string;

  @ApiProperty({ example: "12:00" })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  horaInicio: string;

  @ApiProperty({ example: "13:00" })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  horaFin: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  motivo: string;
}

export class CreateCitaDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  pacienteId: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  dentistaId: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  servicioId: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  tratamientoId?: string | null;

  @ApiProperty({ example: "2026-12-01" })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fecha: string;

  @ApiProperty({ example: "09:00" })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  horaInicio: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  motivo: string;
}

export class CancelCitaDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  motivoCancelacion: string;
}

export class ReagendarCitaDto {
  @ApiProperty({ example: "2026-12-02" })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  nuevaFecha: string;

  @ApiProperty({ example: "10:30" })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  nuevaHoraInicio: string;

  @ApiProperty()
  @IsBoolean()
  notificarPaciente: boolean;
}
