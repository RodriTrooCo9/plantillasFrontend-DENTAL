import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { InventarioService } from "./inventario.service";
import { CurrentUser, JwtAuthGuard } from "../common/auth.guard";
import type { UserResponseDto } from "../auth/dto/auth.dto";
import {
  CreateMaterialInventarioDto,
  MovimientoInventarioDto,
} from "./dto/inventario.dto";

@ApiTags("Inventario Clínico")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("inventario")
export class InventarioController {
  constructor(private readonly inventarioService: InventarioService) {}

  @Get()
  @ApiOperation({ summary: "Listar materiales e insumos del inventario clínico" })
  listarInventario(@CurrentUser() user: UserResponseDto) {
    return this.inventarioService.listarInventario(user);
  }

  @Post()
  @ApiOperation({ summary: "Registrar nuevo insumo en inventario" })
  crearMaterial(
    @CurrentUser() user: UserResponseDto,
    @Body() dto: CreateMaterialInventarioDto,
  ) {
    return this.inventarioService.crearMaterial(user, dto);
  }

  @Post(":id/consumir")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Descontar material de inventario por uso clínico (impide stock negativo)",
  })
  consumirMaterial(
    @CurrentUser() user: UserResponseDto,
    @Param("id") id: string,
    @Body() dto: MovimientoInventarioDto,
  ) {
    return this.inventarioService.consumirMaterial(user, id, dto);
  }

  @Post(":id/reabastecer")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Registrar entrada de stock al inventario" })
  reabastecerMaterial(
    @CurrentUser() user: UserResponseDto,
    @Param("id") id: string,
    @Body() dto: MovimientoInventarioDto,
  ) {
    return this.inventarioService.reabastecerMaterial(user, id, dto);
  }
}
