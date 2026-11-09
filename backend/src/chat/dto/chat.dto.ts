import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
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
