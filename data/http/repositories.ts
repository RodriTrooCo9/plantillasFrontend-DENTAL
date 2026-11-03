import {
  IAuthRepository,
  IPacientesRepository,
  ICitasRepository,
  IOdontogramaRepository,
  IChatRepository,
  LoginPayload,
  CrearCitaPayload,
  ReagendarCitaPayload,
  EditarDientePayload,
  CrearEntradaHistorialPayload,
  CrearTratamientoPayload,
} from '@/data/repositories';
import {
  UsuarioAutenticado,
  Paciente,
  Dentista,
  ServicioClinico,
  Cita,
  Tratamiento,
  EntradaHistorialClinico,
  Odontograma,
  BloqueoHorario,
  RespuestaChat,
  ContextoChat,
} from '@/domain';
import {httpClient, setHttpTokens} from './client';
import {
  PacienteDto,
  CitaDto,
  mapPacienteDtoToDomain,
  mapCitaDtoToDomain,
  mapOdontogramaDtoToDomain,
  mapTratamientoDtoToDomain,
  mapHistorialDtoToDomain,
} from './mappers';

export class HttpAuthRepository implements IAuthRepository {
  async login(payload: LoginPayload): Promise<UsuarioAutenticado> {
    const res = await httpClient<UsuarioAutenticado>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setHttpTokens(res.accessToken, res.refreshToken);
    return res;
  }

  async recoverPassword(email: string): Promise<{mensaje: string}> {
    return httpClient<{mensaje: string}>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({email}),
    });
  }

  async refreshToken(refreshToken: string): Promise<{accessToken: string}> {
    return httpClient<{accessToken: string}>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({refreshToken}),
    });
  }

  async logout(): Promise<void> {
    await httpClient('/auth/logout', {method: 'POST'});
    setHttpTokens(null, null);
  }
}

export class HttpPacientesRepository implements IPacientesRepository {
  async listarPacientes(busqueda?: string): Promise<Paciente[]> {
    const q = busqueda ? `?search=${encodeURIComponent(busqueda)}` : '';
    const dtos = await httpClient<PacienteDto[]>(`/patients${q}`);
    return dtos.map(mapPacienteDtoToDomain);
  }

  async obtenerPacientePorId(pacienteId: string): Promise<Paciente | null> {
    const dto = await httpClient<PacienteDto>(`/patients/${pacienteId}`);
    return mapPacienteDtoToDomain(dto);
  }

  async obtenerHistorialClinico(
    pacienteId: string
  ): Promise<EntradaHistorialClinico[]> {
    const dtos = await httpClient<EntradaHistorialClinico[]>(
      `/patients/${pacienteId}/clinical-history`
    );
    return dtos.map(mapHistorialDtoToDomain);
  }

  async agregarEntradaHistorial(
    payload: CrearEntradaHistorialPayload
  ): Promise<EntradaHistorialClinico> {
    return httpClient<EntradaHistorialClinico>(
      `/patients/${payload.pacienteId}/clinical-history`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  async obtenerTratamientosPorPaciente(
    pacienteId: string
  ): Promise<Tratamiento[]> {
    const dtos = await httpClient<Tratamiento[]>(
      `/patients/${pacienteId}/treatments`
    );
    return dtos.map(mapTratamientoDtoToDomain);
  }

  async crearTratamiento(payload: CrearTratamientoPayload): Promise<Tratamiento> {
    return httpClient<Tratamiento>(
      `/patients/${payload.pacienteId}/treatments`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  async actualizarEstadoTratamiento(
    tratamientoId: string,
    estado: Tratamiento['estado'],
    sesionesCompletadas: number
  ): Promise<Tratamiento> {
    return httpClient<Tratamiento>(`/treatments/${tratamientoId}`, {
      method: 'PATCH',
      body: JSON.stringify({estado, sesionesCompletadas}),
    });
  }
}

export class HttpCitasRepository implements ICitasRepository {
  async listarServicios(): Promise<ServicioClinico[]> {
    return httpClient<ServicioClinico[]>('/services');
  }

  async listarDentistas(): Promise<Dentista[]> {
    return httpClient<Dentista[]>('/dentists');
  }

  async listarCitasPorPaciente(pacienteId: string): Promise<Cita[]> {
    const dtos = await httpClient<CitaDto[]>(
      `/appointments?patientId=${encodeURIComponent(pacienteId)}`
    );
    return dtos.map(mapCitaDtoToDomain);
  }

  async listarCitasPorDentista(
    dentistaId: string,
    fecha?: string
  ): Promise<Cita[]> {
    const params = new URLSearchParams({dentistId: dentistaId});
    if (fecha) params.set('date', fecha);
    const dtos = await httpClient<CitaDto[]>(
      `/appointments?${params.toString()}`
    );
    return dtos.map(mapCitaDtoToDomain);
  }

  async obtenerHorariosDisponibles(
    dentistaId: string,
    fecha: string
  ): Promise<string[]> {
    return httpClient<string[]>(
      `/dentists/${dentistaId}/availability?date=${encodeURIComponent(fecha)}`
    );
  }

  async agendarCita(payload: CrearCitaPayload): Promise<Cita> {
    const dto = await httpClient<CitaDto>('/appointments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return mapCitaDtoToDomain(dto);
  }

  async cancelarCita(citaId: string, motivo: string): Promise<Cita> {
    const dto = await httpClient<CitaDto>(`/appointments/${citaId}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({motivo}),
    });
    return mapCitaDtoToDomain(dto);
  }

  async reagendarCita(payload: ReagendarCitaPayload): Promise<Cita> {
    const dto = await httpClient<CitaDto>(
      `/appointments/${payload.citaId}/reschedule`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    );
    return mapCitaDtoToDomain(dto);
  }

  async bloquearHorarioDentista(
    dentistaId: string,
    fecha: string,
    horaInicio: string,
    horaFin: string,
    motivo: string
  ): Promise<BloqueoHorario> {
    return httpClient<BloqueoHorario>(`/dentists/${dentistaId}/blocks`, {
      method: 'POST',
      body: JSON.stringify({fecha, horaInicio, horaFin, motivo}),
    });
  }
}

export class HttpOdontogramaRepository implements IOdontogramaRepository {
  async obtenerOdontograma(pacienteId: string): Promise<Odontograma> {
    const dto = await httpClient<Odontograma>(
      `/patients/${pacienteId}/odontogram`
    );
    return mapOdontogramaDtoToDomain(dto);
  }

  async registrarCambioDiente(
    payload: EditarDientePayload
  ): Promise<Odontograma> {
    const dto = await httpClient<Odontograma>(
      `/patients/${payload.pacienteId}/odontogram/teeth/${payload.numeroFDI}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    );
    return mapOdontogramaDtoToDomain(dto);
  }
}

export class HttpChatRepository implements IChatRepository {
  async sendMessage(
    mensaje: string,
    contexto: ContextoChat
  ): Promise<RespuestaChat> {
    return httpClient<RespuestaChat>('/chat', {
      method: 'POST',
      body: JSON.stringify({mensaje, contexto}),
    });
  }
}
