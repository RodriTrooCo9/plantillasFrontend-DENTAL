import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { CitasService } from "./citas.service";
import { CurrentUser, JwtAuthGuard } from "../common/auth.guard";
import type { UserResponseDto } from "../auth/dto/auth.dto";
import {
  CancelCitaDto,
  CreateBloqueoDto,
  CreateCitaDto,
  ReagendarCitaDto,
} from "./dto/citas.dto";

@ApiTags("Catálogo de Servicios")
@Controller("servicios")
export class ServiciosController {
  constructor(private readonly citasService: CitasService) {}

  @Get()
  @ApiOperation({ summary: "Listar catálogo público de servicios clínicos" })
  listarServicios() {
    return this.citasService.listarServicios();
  }
}

@ApiTags("Dentistas y Disponibilidad")
@Controller("dentistas")
export class DentistasController {
  constructor(private readonly citasService: CitasService) {}

  @Get()
  @ApiOperation({
    summary: "Listar catálogo público de odontólogos (sin bloqueos privados)",
  })
  listarDentistas() {
    return this.citasService.listarDentistasPublico();
  }

  @Get(":id/disponibilidad")
  @ApiOperation({
    summary: "Consultar horarios disponibles de un especialista para una fecha",
  })
  @ApiQuery({ name: "fecha", required: true, example: "2026-12-01" })
  @ApiQuery({ name: "servicioId", required: false })
  obtenerDisponibilidad(
    @Param("id") id: string,
    @Query("fecha") fecha: string,
    @Query("servicioId") servicioId?: string,
  ) {
    return this.citasService.obtenerDisponibilidad(id, fecha, servicioId);
  }

  @Get(":id/bloqueos")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Listar bloqueos de agenda propios del dentista",
  })
  listarBloqueos(
    @CurrentUser() user: UserResponseDto,
    @Param("id") id: string,
  ) {
    return this.citasService.listarBloqueosDentista(user, id);
  }

  @Post(":id/bloqueos")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Registrar bloqueo de horario (dentista propio)" })
  crearBloqueo(
    @CurrentUser() user: UserResponseDto,
    @Param("id") id: string,
    @Body() dto: CreateBloqueoDto,
  ) {
    return this.citasService.crearBloqueo(user, id, dto);
  }
}

@ApiTags("Citas Clínicas")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("citas")
export class CitasController {
  constructor(private readonly citasService: CitasService) {}

  @Get()
  @ApiOperation({ summary: "Listar citas filtradas por paciente, dentista o fecha" })
  @ApiQuery({ name: "pacienteId", required: false })
  @ApiQuery({ name: "dentistaId", required: false })
  @ApiQuery({ name: "fecha", required: false })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  listarCitas(
    @CurrentUser() user: UserResponseDto,
    @Query("pacienteId") pacienteId?: string,
    @Query("dentistaId") dentistaId?: string,
    @Query("fecha") fecha?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.citasService.listarCitas(
      user,
      pacienteId,
      dentistaId,
      fecha,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }

  @Post()
  @ApiOperation({ summary: "Agendar nueva cita clínica" })
  agendarCita(
    @CurrentUser() user: UserResponseDto,
    @Body() dto: CreateCitaDto,
  ) {
    return this.citasService.agendarCita(user, dto);
  }

  @Post(":id/cancelar")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Cancelar cita existente (regla 24h para pacientes)" })
  cancelarCita(
    @CurrentUser() user: UserResponseDto,
    @Param("id") id: string,
    @Body() dto: CancelCitaDto,
  ) {
    return this.citasService.cancelarCita(user, id, dto);
  }

  @Patch(":id/reagendar")
  @ApiOperation({ summary: "Reagendar cita a una nueva fecha y hora" })
  reagendarCita(
    @CurrentUser() user: UserResponseDto,
    @Param("id") id: string,
    @Body() dto: ReagendarCitaDto,
  ) {
    return this.citasService.reagendarCita(user, id, dto);
  }
}
