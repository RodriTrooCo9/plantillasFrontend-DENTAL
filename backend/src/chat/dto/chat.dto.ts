import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class ConfirmarAccionDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  token: string;
}

export class ChatRequestDto {
  @ApiProperty()
  @IsString()
  mensaje: string;

  @ApiPropertyOptional({ enum: ["VISITANTE", "PACIENTE", "DENTISTA"] })
  @IsOptional()
  @IsIn(["VISITANTE", "PACIENTE", "DENTISTA"])
  rol?: "VISITANTE" | "PACIENTE" | "DENTISTA";

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  pacienteId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  dentistaId?: string | null;

  @ApiPropertyOptional({ type: ConfirmarAccionDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => ConfirmarAccionDto)
  confirmarAccion?: ConfirmarAccionDto | null;
}

export class ChatStreamRequestDto {
  @ApiPropertyOptional({
    description: "Lista de mensajes UI compatibles con Vercel AI SDK useChat",
  })
  @IsOptional()
  @IsArray()
  messages?: Array<Record<string, unknown>>;

  @ApiPropertyOptional({
    description: "Mensaje textual directo en caso de cliente simplificado",
  })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({
    description: "ID de expediente de paciente opcional para contexto",
  })
  @IsOptional()
  @IsString()
  pacienteId?: string;

  @ApiPropertyOptional({
    description: "ID del odontólogo para contexto de consulta",
  })
  @IsOptional()
  @IsString()
  dentistaId?: string;

  @ApiPropertyOptional({ enum: ["VISITANTE", "PACIENTE", "DENTISTA"] })
  @IsOptional()
  @IsIn(["VISITANTE", "PACIENTE", "DENTISTA"])
  rol?: "VISITANTE" | "PACIENTE" | "DENTISTA";
}
