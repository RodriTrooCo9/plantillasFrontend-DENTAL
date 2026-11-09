import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { PacientesService } from "./pacientes.service";
import { CurrentUser, JwtAuthGuard } from "../common/auth.guard";
import type { UserResponseDto } from "../auth/dto/auth.dto";
import { CreatePagoDto, UpdateTratamientoDto } from "./dto/pacientes.dto";

@ApiTags("Tratamientos y Pagos")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("tratamientos")
export class TratamientosController {
  constructor(private readonly pacientesService: PacientesService) {}

  @Patch(":id")
  @ApiOperation({
    summary: "Actualizar avance y estado de tratamiento (exclusivo DENTISTA)",
  })
  actualizarTratamiento(
    @CurrentUser() user: UserResponseDto,
    @Param("id") id: string,
    @Body() dto: UpdateTratamientoDto,
  ) {
    return this.pacientesService.actualizarTratamiento(user, id, dto);
  }

  @Post(":id/aprobar-presupuesto")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Aprobar presupuesto de tratamiento (congela el precio pactado)",
  })
  aprobarPresupuesto(
    @CurrentUser() user: UserResponseDto,
    @Param("id") id: string,
  ) {
    return this.pacientesService.aprobarPresupuesto(user, id);
  }

  @Get(":id/pagos")
  @ApiOperation({
    summary: "Consultar estado de cuenta, saldo pendiente y abonos del tratamiento",
  })
  obtenerEstadoCuenta(
    @CurrentUser() user: UserResponseDto,
    @Param("id") id: string,
  ) {
    return this.pacientesService.obtenerEstadoCuentaTratamiento(user, id);
  }

  @Post(":id/pagos")
  @ApiOperation({
    summary: "Registrar abono o pago parcial al tratamiento (exclusivo DENTISTA)",
  })
  registrarPago(
    @CurrentUser() user: UserResponseDto,
    @Param("id") id: string,
    @Body() dto: CreatePagoDto,
  ) {
    return this.pacientesService.registrarPago(user, id, dto);
  }
}
