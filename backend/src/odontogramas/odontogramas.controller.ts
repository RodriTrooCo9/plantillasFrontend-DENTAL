import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { OdontogramasService } from "./odontogramas.service";
import { CurrentUser, JwtAuthGuard } from "../common/auth.guard";
import type { UserResponseDto } from "../auth/dto/auth.dto";
import { UpdateDienteDto } from "./dto/odontogramas.dto";

@ApiTags("Odontograma 32 Piezas FDI")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("odontogramas")
export class OdontogramasController {
  constructor(private readonly odontogramasService: OdontogramasService) {}

  @Get(":pacienteId")
  @ApiOperation({
    summary: "Obtener odontograma de 32 piezas FDI y auditoría de cambios",
  })
  obtenerOdontograma(
    @CurrentUser() user: UserResponseDto,
    @Param("pacienteId") pacienteId: string,
  ) {
    return this.odontogramasService.obtenerOdontograma(user, pacienteId);
  }

  @Patch(":pacienteId/dientes/:numero")
  @ApiOperation({
    summary: "Registrar cambio clínico en pieza FDI (exclusivo DENTISTA)",
  })
  actualizarDiente(
    @CurrentUser() user: UserResponseDto,
    @Param("pacienteId") pacienteId: string,
    @Param("numero", ParseIntPipe) numero: number,
    @Body() dto: UpdateDienteDto,
  ) {
    return this.odontogramasService.actualizarDiente(
      user,
      pacienteId,
      numero,
      dto,
    );
  }
}
