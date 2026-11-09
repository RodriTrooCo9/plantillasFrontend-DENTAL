import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { PacientesService } from "./pacientes.service";
import { CurrentUser, JwtAuthGuard } from "../common/auth.guard";
import type { UserResponseDto } from "../auth/dto/auth.dto";
import {
  CreateHistorialDto,
  CreatePacienteDto,
  CreateTratamientoDto,
} from "./dto/pacientes.dto";

@ApiTags("Pacientes y Expediente Clínico")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("pacientes")
export class PacientesController {
  constructor(private readonly pacientesService: PacientesService) {}

  @Get()
  @ApiOperation({ summary: "Listar o buscar pacientes (exclusivo DENTISTA)" })
  @ApiQuery({ name: "q", required: false })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  listarPacientes(
    @CurrentUser() user: UserResponseDto,
    @Query("q") q?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.pacientesService.listarPacientes(
      user,
      q,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }

  @Post()
  @ApiOperation({
    summary: "Registrar nuevo paciente con validaciones de duplicados y tutor (exclusivo DENTISTA)",
  })
  crearPaciente(
    @CurrentUser() user: UserResponseDto,
    @Body() dto: CreatePacienteDto,
  ) {
    return this.pacientesService.crearPaciente(user, dto);
  }

  @Delete(":id")
  @ApiOperation({
    summary: "Eliminar paciente aplicando borrado lógico para proteger historial (exclusivo DENTISTA)",
  })
  eliminarPaciente(
    @CurrentUser() user: UserResponseDto,
    @Param("id") id: string,
  ) {
    return this.pacientesService.eliminarPaciente(user, id);
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtener ficha clínica de un paciente" })
  obtenerPaciente(
    @CurrentUser() user: UserResponseDto,
    @Param("id") id: string,
  ) {
    return this.pacientesService.obtenerPacientePorId(user, id);
  }

  @Get(":id/historial")
  @ApiOperation({ summary: "Obtener historial clínico de un paciente" })
  obtenerHistorial(
    @CurrentUser() user: UserResponseDto,
    @Param("id") id: string,
  ) {
    return this.pacientesService.obtenerHistorial(user, id);
  }

  @Post(":id/historial")
  @ApiOperation({
    summary: "Agregar nota de evolución al historial (exclusivo DENTISTA)",
  })
  agregarHistorial(
    @CurrentUser() user: UserResponseDto,
    @Param("id") id: string,
    @Body() dto: CreateHistorialDto,
  ) {
    return this.pacientesService.agregarHistorial(user, id, dto);
  }

  @Get(":id/tratamientos")
  @ApiOperation({ summary: "Listar planes de tratamiento del paciente" })
  obtenerTratamientos(
    @CurrentUser() user: UserResponseDto,
    @Param("id") id: string,
  ) {
    return this.pacientesService.obtenerTratamientos(user, id);
  }

  @Post(":id/tratamientos")
  @ApiOperation({
    summary: "Crear nuevo plan de tratamiento (exclusivo DENTISTA)",
  })
  crearTratamiento(
    @CurrentUser() user: UserResponseDto,
    @Param("id") id: string,
    @Body() dto: CreateTratamientoDto,
  ) {
    return this.pacientesService.crearTratamiento(user, id, dto);
  }
}
