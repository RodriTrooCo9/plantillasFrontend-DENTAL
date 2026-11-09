import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, MinLength } from "class-validator";

export class UpdateDienteDto {
  @ApiProperty({
    enum: ["oclusal", "vestibular", "lingual", "mesial", "distal", "GENERAL"],
  })
  @IsIn(["oclusal", "vestibular", "lingual", "mesial", "distal", "GENERAL"])
  superficie:
    | "oclusal"
    | "vestibular"
    | "lingual"
    | "mesial"
    | "distal"
    | "GENERAL";

  @ApiProperty({
    enum: [
      "SANO",
      "CARIES",
      "OBTURADO",
      "ENDODONCIA",
      "CORONA",
      "AUSENTE",
      "IMPLANTE",
    ],
  })
  @IsIn([
    "SANO",
    "CARIES",
    "OBTURADO",
    "ENDODONCIA",
    "CORONA",
    "AUSENTE",
    "IMPLANTE",
  ])
  estadoNuevo:
    | "SANO"
    | "CARIES"
    | "OBTURADO"
    | "ENDODONCIA"
    | "CORONA"
    | "AUSENTE"
    | "IMPLANTE";

  @ApiProperty()
  @IsString()
  @MinLength(3)
  procedimiento: string;

  @ApiProperty()
  @IsString()
  nota: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dentistaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dentistaNombre?: string;
}
