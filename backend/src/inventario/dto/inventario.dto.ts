import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";

export class CreateMaterialInventarioDto {
  @ApiProperty({ example: "SKU-RES-A2" })
  @IsString()
  @MinLength(3)
  sku: string;

  @ApiProperty({ example: "Jeringa Resina Filtek Z350 XT Tonos A2" })
  @IsString()
  @MinLength(3)
  nombre: string;

  @ApiProperty({
    enum: [
      "CONSUMIBLE",
      "ANESTESIA",
      "ENDODONCIA",
      "RESTAURACION",
      "BIOSEGURIDAD",
    ],
  })
  @IsIn([
    "CONSUMIBLE",
    "ANESTESIA",
    "ENDODONCIA",
    "RESTAURACION",
    "BIOSEGURIDAD",
  ])
  categoria:
    | "CONSUMIBLE"
    | "ANESTESIA"
    | "ENDODONCIA"
    | "RESTAURACION"
    | "BIOSEGURIDAD";

  @ApiProperty({ example: "jeringa" })
  @IsString()
  @MinLength(2)
  unidad: string;

  @ApiProperty({ example: 25 })
  @IsInt()
  @Min(0, { message: "El stock inicial no puede ser negativo." })
  stockActual: number;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(0, { message: "El stock mínimo no puede ser negativo." })
  stockMinimo: number;

  @ApiProperty({ example: 850 })
  @IsNumber()
  @Min(0)
  costoUnitarioMXN: number;
}

export class MovimientoInventarioDto {
  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1, { message: "La cantidad debe ser al menos 1 unidad." })
  cantidad: number;

  @ApiProperty({ example: "Uso en obturación clase II diente #16" })
  @IsString()
  @MinLength(3)
  motivo: string;

  @ApiPropertyOptional({ example: "cit-1" })
  @IsOptional()
  @IsString()
  citaId?: string;
}
