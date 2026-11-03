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
import {
  SERVICIOS_SEMILLA,
  DENTISTAS_SEMILLA,
  PACIENTES_SEMILLA,
  CITAS_SEMILLA,
  TRATAMIENTOS_SEMILLA,
  HISTORIAL_SEMILLA,
  ODONTOGRAMAS_SEMILLA,
  generar32DientesConOverrides,
} from './seed';

// Estado en memoria del adaptador Mock (persiste durante la sesión del cliente)
let dbPacientes: Paciente[] = [...PACIENTES_SEMILLA];
let dbDentistas: Dentista[] = [...DENTISTAS_SEMILLA];
let dbCitas: Cita[] = [...CITAS_SEMILLA];
let dbTratamientos: Tratamiento[] = [...TRATAMIENTOS_SEMILLA];
let dbHistorial: EntradaHistorialClinico[] = [...HISTORIAL_SEMILLA];
let dbOdontogramas: Record<string, Odontograma> = {...ODONTOGRAMAS_SEMILLA};

export function verificarReglaCancelacion24h(
  fechaCita: string,
  horaCita: string,
  ahoraReferencia: Date = new Date('2026-11-03T12:00:00')
): {permitido: boolean; horasRestantes: number; mensaje?: string} {
  const fechaHoraCita = new Date(`${fechaCita}T${horaCita}:00`);
  const diffMs = fechaHoraCita.getTime() - ahoraReferencia.getTime();
  const horasRestantes = Math.round(diffMs / (1000 * 60 * 60));

  if (horasRestantes < 24) {
    return {
      permitido: false,
      horasRestantes,
      mensaje:
        'Las cancelaciones requieren al menos 24 horas de anticipación. Por favor comunícate con recepción para reprogramar sin cargo.',
    };
  }
  return {permitido: true, horasRestantes};
}

export class MockAuthRepository implements IAuthRepository {
  async login({email, password}: LoginPayload): Promise<UsuarioAutenticado> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || password.trim().length < 6) {
      throw new Error(
        'Credenciales inválidas. Verifica tu correo y contraseña (mínimo 6 caracteres).'
      );
    }

    // Buscar si es dentista
    const dentista = dbDentistas.find(
      (d) => d.email.toLowerCase() === cleanEmail
    );
    if (dentista || cleanEmail.includes('dentista')) {
      const targetDoc = dentista || dbDentistas[0];
      return {
        id: `usr-${targetDoc.id}`,
        email: targetDoc.email,
        nombreCompleto: targetDoc.nombreCompleto,
        rol: 'DENTISTA',
        dentistaId: targetDoc.id,
        accessToken: 'mock-jwt-access-token-dentista',
        refreshToken: 'mock-jwt-refresh-token-dentista',
      };
    }

    // Buscar si es paciente
    const paciente =
      dbPacientes.find((p) => p.email.toLowerCase() === cleanEmail) ||
      dbPacientes[0];

    return {
      id: `usr-${paciente.id}`,
      email: paciente.email,
      nombreCompleto: paciente.nombreCompleto,
      rol: 'PACIENTE',
      pacienteId: paciente.id,
      accessToken: 'mock-jwt-access-token-paciente',
      refreshToken: 'mock-jwt-refresh-token-paciente',
    };
  }

  async recoverPassword(email: string): Promise<{mensaje: string}> {
    if (!email.trim() || !email.includes('@')) {
      throw new Error('Ingresa un correo electrónico registrado válido.');
    }
    return {
      mensaje: `Se enviaron las instrucciones de recuperación de contraseña a ${email.trim()}.`,
    };
  }

  async refreshToken(): Promise<{accessToken: string}> {
    return {accessToken: `mock-jwt-refreshed-${Date.now()}`};
  }

  async logout(): Promise<void> {
    return;
  }
}

export class MockPacientesRepository implements IPacientesRepository {
  async listarPacientes(busqueda?: string): Promise<Paciente[]> {
    if (!busqueda || !busqueda.trim()) return dbPacientes;
    const q = busqueda.trim().toLowerCase();
    return dbPacientes.filter(
      (p) =>
        p.nombreCompleto.toLowerCase().includes(q) ||
        p.codigoExpediente.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q)
    );
  }

  async obtenerPacientePorId(pacienteId: string): Promise<Paciente | null> {
    return dbPacientes.find((p) => p.id === pacienteId) || null;
  }

  async obtenerHistorialClinico(
    pacienteId: string
  ): Promise<EntradaHistorialClinico[]> {
    return dbHistorial.filter((h) => h.pacienteId === pacienteId);
  }

  async agregarEntradaHistorial(
    payload: CrearEntradaHistorialPayload
  ): Promise<EntradaHistorialClinico> {
    const nueva: EntradaHistorialClinico = {
      id: `his-${Date.now()}`,
      pacienteId: payload.pacienteId,
      fecha: new Date().toISOString().slice(0, 10),
      dentistaId: payload.dentistaId,
      dentistaNombre: payload.dentistaNombre,
      tipo: payload.tipo,
      diagnostico: payload.diagnostico,
      procedimientoRealizado: payload.procedimientoRealizado,
      notasClinicas: payload.notasClinicas,
    };
    dbHistorial = [nueva, ...dbHistorial];
    return nueva;
  }

  async obtenerTratamientosPorPaciente(
    pacienteId: string
  ): Promise<Tratamiento[]> {
    return dbTratamientos.filter((t) => t.pacienteId === pacienteId);
  }

  async crearTratamiento(payload: CrearTratamientoPayload): Promise<Tratamiento> {
    const dentista =
      dbDentistas.find((d) => d.id === payload.dentistaId) || dbDentistas[0];
    const nuevo: Tratamiento = {
      id: `trt-${Date.now()}`,
      pacienteId: payload.pacienteId,
      dentistaId: dentista.id,
      dentistaNombre: dentista.nombreCompleto,
      servicioId: payload.servicioId,
      nombre: payload.nombre,
      estado: 'PLANIFICADO',
      fechaInicio: new Date().toISOString().slice(0, 10),
      progresoPorcentaje: 0,
      sesionesCompletadas: 0,
      sesionesTotales: payload.sesionesTotales,
      costoTotalMXN: payload.costoTotalMXN,
      dientesFDI: payload.dientesFDI,
      proximaFechaSugerida: payload.proximaFechaSugerida,
      notasEvolucion: payload.notasEvolucion,
    };
    dbTratamientos = [nuevo, ...dbTratamientos];
    return nuevo;
  }

  async actualizarEstadoTratamiento(
    tratamientoId: string,
    estado: Tratamiento['estado'],
    sesionesCompletadas: number
  ): Promise<Tratamiento> {
    let actualizado: Tratamiento | null = null;
    dbTratamientos = dbTratamientos.map((t) => {
      if (t.id !== tratamientoId) return t;
      const progresoPorcentaje =
        estado === 'FINALIZADO'
          ? 100
          : Math.min(100, Math.round((sesionesCompletadas / t.sesionesTotales) * 100));
      actualizado = {
        ...t,
        estado,
        sesionesCompletadas,
        progresoPorcentaje,
      };
      return actualizado;
    });
    if (!actualizado) throw new Error('Tratamiento no encontrado.');
    return actualizado;
  }
}

export class MockCitasRepository implements ICitasRepository {
  async listarServicios(): Promise<ServicioClinico[]> {
    return SERVICIOS_SEMILLA;
  }

  async listarDentistas(): Promise<Dentista[]> {
    return dbDentistas;
  }

  async listarCitasPorPaciente(pacienteId: string): Promise<Cita[]> {
    return dbCitas.filter((c) => c.pacienteId === pacienteId);
  }

  async listarCitasPorDentista(
    dentistaId: string,
    fecha?: string
  ): Promise<Cita[]> {
    return dbCitas.filter((c) => {
      const matchDoc = !dentistaId || c.dentistaId === dentistaId;
      const matchFecha = !fecha || c.fecha === fecha;
      return matchDoc && matchFecha;
    });
  }

  async obtenerHorariosDisponibles(
    dentistaId: string,
    fecha: string
  ): Promise<string[]> {
    const dentista =
      dbDentistas.find((d) => d.id === dentistaId) || dbDentistas[0];
    const ocupados = dbCitas
      .filter(
        (c) =>
          c.dentistaId === dentista.id &&
          c.fecha === fecha &&
          c.estado !== 'CANCELADA'
      )
      .map((c) => c.hora);
    const bloqueados = dentista.bloqueos
      .filter((b) => b.fecha === fecha)
      .map((b) => b.horaInicio);

    return dentista.horariosDisponibles.filter(
      (h) => !ocupados.includes(h) && !bloqueados.includes(h)
    );
  }

  async agendarCita(payload: CrearCitaPayload): Promise<Cita> {
    const paciente =
      dbPacientes.find((p) => p.id === payload.pacienteId) || dbPacientes[0];
    const dentista =
      dbDentistas.find((d) => d.id === payload.dentistaId) || dbDentistas[0];
    const servicio =
      SERVICIOS_SEMILLA.find((s) => s.id === payload.servicioId) ||
      SERVICIOS_SEMILLA[0];

    const nueva: Cita = {
      id: `cit-${Date.now().toString().slice(-4)}`,
      pacienteId: paciente.id,
      pacienteNombre: paciente.nombreCompleto,
      dentistaId: dentista.id,
      dentistaNombre: dentista.nombreCompleto,
      servicioId: servicio.id,
      servicioNombre: servicio.nombre,
      tratamientoId: payload.tratamientoId,
      fecha: payload.fecha,
      hora: payload.hora,
      estado: 'CONFIRMADA',
      motivoConsulta:
        payload.motivoConsulta.trim() || `Consulta de ${servicio.nombre}`,
      costoMXN: servicio.precioBaseMXN,
    };

    dbCitas = [nueva, ...dbCitas];
    return nueva;
  }

  async cancelarCita(citaId: string, motivo: string): Promise<Cita> {
    const target = dbCitas.find((c) => c.id === citaId);
    if (!target) throw new Error('La cita solicitada no existe.');

    const regla = verificarReglaCancelacion24h(target.fecha, target.hora);
    if (!regla.permitido) {
      throw new Error(regla.mensaje);
    }

    const actualizada: Cita = {
      ...target,
      estado: 'CANCELADA',
      motivoConsulta: `${target.motivoConsulta} [Cancelada: ${motivo}]`,
    };
    dbCitas = dbCitas.map((c) => (c.id === citaId ? actualizada : c));
    return actualizada;
  }

  async reagendarCita(payload: ReagendarCitaPayload): Promise<Cita> {
    const target = dbCitas.find((c) => c.id === payload.citaId);
    if (!target) throw new Error('Cita no encontrada para reagendar.');

    const actualizada: Cita = {
      ...target,
      fecha: payload.nuevaFecha,
      hora: payload.nuevaHora,
      estado: 'REPROGRAMADA',
      notificacionEnviada: true,
      motivoConsulta: payload.motivo
        ? `${target.motivoConsulta} (Reagendada: ${payload.motivo})`
        : target.motivoConsulta,
    };
    dbCitas = dbCitas.map((c) => (c.id === payload.citaId ? actualizada : c));
    return actualizada;
  }

  async bloquearHorarioDentista(
    dentistaId: string,
    fecha: string,
    horaInicio: string,
    horaFin: string,
    motivo: string
  ): Promise<BloqueoHorario> {
    const nuevoBloqueo: BloqueoHorario = {
      id: `bloq-${Date.now()}`,
      dentistaId,
      fecha,
      horaInicio,
      horaFin,
      motivo,
    };
    dbDentistas = dbDentistas.map((d) =>
      d.id === dentistaId ? {...d, bloqueos: [...d.bloqueos, nuevoBloqueo]} : d
    );
    return nuevoBloqueo;
  }
}

export class MockOdontogramaRepository implements IOdontogramaRepository {
  async obtenerOdontograma(pacienteId: string): Promise<Odontograma> {
    if (!dbOdontogramas[pacienteId]) {
      dbOdontogramas[pacienteId] = {
        pacienteId,
        actualizadoEn: new Date().toISOString().slice(0, 10),
        dientes: generar32DientesConOverrides({}),
        historialCambios: [],
      };
    }
    return dbOdontogramas[pacienteId];
  }

  async registrarCambioDiente(
    payload: EditarDientePayload
  ): Promise<Odontograma> {
    const actual = await this.obtenerOdontograma(payload.pacienteId);
    let estadoPrevio = payload.nuevoEstado;

    const nuevosDientes = actual.dientes.map((diente) => {
      if (diente.numeroFDI !== payload.numeroFDI) return diente;

      estadoPrevio =
        payload.superficie === 'GENERAL'
          ? diente.estadoGeneral
          : diente.superficies[payload.superficie];

      const nuevasSuperficies = {...diente.superficies};
      let nuevoEstadoGeneral = diente.estadoGeneral;

      if (payload.superficie === 'GENERAL') {
        nuevoEstadoGeneral = payload.nuevoEstado;
        if (
          payload.nuevoEstado === 'SANO' ||
          payload.nuevoEstado === 'CORONA' ||
          payload.nuevoEstado === 'AUSENTE' ||
          payload.nuevoEstado === 'IMPLANTE'
        ) {
          nuevasSuperficies.oclusal = payload.nuevoEstado;
          nuevasSuperficies.vestibular = payload.nuevoEstado;
          nuevasSuperficies.lingual = payload.nuevoEstado;
          nuevasSuperficies.mesial = payload.nuevoEstado;
          nuevasSuperficies.distal = payload.nuevoEstado;
        }
      } else {
        nuevasSuperficies[payload.superficie] = payload.nuevoEstado;
        nuevoEstadoGeneral = payload.nuevoEstado;
      }

      return {
        ...diente,
        estadoGeneral: nuevoEstadoGeneral,
        superficies: nuevasSuperficies,
        ultimaActualizacion: new Date().toISOString().slice(0, 10),
        notaClinica: payload.nota.trim() || diente.notaClinica,
      };
    });

    const registroAuditoria = {
      id: `aud-${Date.now()}`,
      pacienteId: payload.pacienteId,
      numeroFDI: payload.numeroFDI,
      superficie: payload.superficie,
      estadoAnterior: estadoPrevio,
      estadoNuevo: payload.nuevoEstado,
      procedimiento: payload.procedimiento.trim() || 'Actualización clínica',
      nota: payload.nota.trim() || 'Cambio registrado en consulta.',
      autorNombre: payload.autorNombre,
      autorRol: 'DENTISTA' as const,
      fechaHora: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };

    const nuevoOdontograma: Odontograma = {
      pacienteId: payload.pacienteId,
      actualizadoEn: new Date().toISOString().slice(0, 10),
      dientes: nuevosDientes,
      historialCambios: [registroAuditoria, ...actual.historialCambios],
    };

    dbOdontogramas[payload.pacienteId] = nuevoOdontograma;
    return nuevoOdontograma;
  }
}

export class MockChatRepository implements IChatRepository {
  async sendMessage(
    mensaje: string,
    contexto: ContextoChat
  ): Promise<RespuestaChat> {
    const q = mensaje.trim().toLowerCase();

    // 1. MODO VISITANTE
    if (contexto.rolActual === 'VISITANTE') {
      if (
        q.includes('cita') ||
        q.includes('agendar') ||
        q.includes('historial') ||
        q.includes('odontograma') ||
        q.includes('cancelar')
      ) {
        return {
          texto:
            'Para consultar tu expediente personal, ver tu odontograma o agendar/cancelar citas a tu nombre, necesitas iniciar sesión en el portal del consultorio.',
          acciones: [
            {
              id: `act-login-${Date.now()}`,
              tipo: 'IR_A_LOGIN',
              etiqueta: 'Iniciar sesión ahora',
              requiereConfirmacion: false,
              payload: {ruta: '/login'},
            },
          ],
          componentes: [
            {
              tipo: 'TABLA_SERVICIOS',
              datos: SERVICIOS_SEMILLA.slice(0, 3),
            },
          ],
        };
      }

      return {
        texto:
          '¡Hola! Soy el Asistente Digital de Lumina Odontología. Atendemos de Lunes a Sábado de 08:30 a 20:00 hrs en Av. Presidente Masaryk 340, Polanco. Estos son nuestros servicios clínicos y aranceles orientativos:',
        acciones: [
          {
            id: `act-srv-${Date.now()}`,
            tipo: 'IR_A_LOGIN',
            etiqueta: 'Iniciar sesión para agendar',
            requiereConfirmacion: false,
            payload: {ruta: '/login'},
          },
        ],
        componentes: [
          {
            tipo: 'TABLA_SERVICIOS',
            datos: SERVICIOS_SEMILLA,
          },
        ],
      };
    }

    const pacId = contexto.pacienteActivoId || 'pac-1';
    const paciente =
      dbPacientes.find((p) => p.id === pacId) || dbPacientes[0];
    const citasPac = dbCitas.filter((c) => c.pacienteId === paciente.id);
    const tratamientosPac = dbTratamientos.filter(
      (t) => t.pacienteId === paciente.id
    );
    const odontogramaPac =
      dbOdontogramas[paciente.id] || ODONTOGRAMAS_SEMILLA['pac-1'];

    // 2. INTENCIONES DE CITAS (VER, AGENDAR, CANCELAR, REAGENDAR)
    if (q.includes('cancelar')) {
      const proximaActiva = citasPac.find((c) => c.estado === 'CONFIRMADA');
      if (!proximaActiva) {
        return {
          texto: `No encontré citas confirmadas pendientes para ${paciente.nombreCompleto} que puedan cancelarse.`,
        };
      }
      return {
        texto: `He localizado la cita de ${proximaActiva.servicioNombre} del ${proximaActiva.fecha} a las ${proximaActiva.hora} hrs. Por seguridad clínica, confirma abajo si deseas proceder con la cancelación:`,
        acciones: [
          {
            id: `act-cancel-${Date.now()}`,
            tipo: 'CANCELAR_CITA',
            etiqueta: `Confirmar cancelación (${proximaActiva.fecha} ${proximaActiva.hora})`,
            requiereConfirmacion: true,
            payload: {
              citaId: proximaActiva.id,
              motivo: 'Solicitada desde el Asistente Clínico',
            },
          },
        ],
      };
    }

    if (q.includes('reagendar') && contexto.rolActual === 'DENTISTA') {
      const proxima = citasPac.find((c) => c.estado === 'CONFIRMADA') || dbCitas[0];
      return {
        texto: `Como dentista, puedes reagendar la cita de ${proxima.pacienteNombre} (${proxima.servicioNombre}) al próximo horario disponible (2026-11-12 a las 11:00 hrs) notificando automáticamente al paciente. Confirma la acción:`,
        acciones: [
          {
            id: `act-reagendar-${Date.now()}`,
            tipo: 'REAGENDAR_CITA',
            etiqueta: `Confirmar reagendado a 2026-11-12 11:00`,
            requiereConfirmacion: true,
            payload: {
              citaId: proxima.id,
              nuevaFecha: '2026-11-12',
              nuevaHora: '11:00',
              motivo: 'Ajuste de agenda clínica por el especialista',
            },
          },
        ],
      };
    }

    if (q.includes('agendar') || q.includes('nueva cita')) {
      return {
        texto: `Puedo agendar una sesión de Profilaxis Ultrasónica para ${paciente.nombreCompleto} con la Dra. Valeria Mendoza el 2026-11-16 a las 10:30 hrs:`,
        acciones: [
          {
            id: `act-book-${Date.now()}`,
            tipo: 'AGENDAR_CITA',
            etiqueta: 'Agendar Profilaxis (16 Nov · 10:30 hrs)',
            requiereConfirmacion: false,
            payload: {
              pacienteId: paciente.id,
              dentistaId: 'den-valeria',
              servicioId: 'srv-limpieza',
              fecha: '2026-11-16',
              hora: '10:30',
              motivoConsulta: 'Cita agendada mediante el Asistente Clínico',
            },
          },
        ],
      };
    }

    if (q.includes('cita') || q.includes('agenda')) {
      return {
        texto: `Aquí tienes las citas registradas de ${paciente.nombreCompleto} (${paciente.codigoExpediente}):`,
        componentes: [
          {
            tipo: 'TARJETA_CITAS',
            datos: citasPac,
          },
        ],
      };
    }

    // 3. INTENCIONES DE ODONTOGRAMA (CONSULTAR O MODIFICAR CON CONFIRMACIÓN PARA DENTISTA)
    if (
      (q.includes('modificar') ||
        q.includes('cambiar') ||
        q.includes('registrar obturación') ||
        q.includes('editar diente')) &&
      contexto.rolActual === 'DENTISTA'
    ) {
      return {
        texto: `Propuesta clínica para ${paciente.nombreCompleto}: Registrar estado OBTURADO (Resina compuesta) en la superficie oclusal del diente #16. Esta acción requiere tu confirmación explícita antes de guardarse en el odontograma:`,
        acciones: [
          {
            id: `act-odo-edit-${Date.now()}`,
            tipo: 'MODIFICAR_ODONTOGRAMA',
            etiqueta: 'Confirmar obturación en diente #16',
            requiereConfirmacion: true,
            payload: {
              pacienteId: paciente.id,
              numeroFDI: 16,
              superficie: 'oclusal',
              nuevoEstado: 'OBTURADO',
              procedimiento: 'Restauración con resina compuesta en #16',
              nota: 'Eliminación de caries oclusal y sellado adhesivo registrado vía asistente.',
              autorNombre: 'Dra. Valeria Mendoza',
            },
          },
        ],
      };
    }

    if (q.includes('odontograma') || q.includes('diente') || q.includes('muela')) {
      const piezasConHallazgo = odontogramaPac.dientes.filter(
        (d) => d.estadoGeneral !== 'SANO'
      );
      return {
        texto: `Odontograma FDI de ${paciente.nombreCompleto} (32 dientes evaluados, ${piezasConHallazgo.length} con hallazgos clínicos o restauraciones):`,
        componentes: [
          {
            tipo: 'MINI_ODONTOGRAMA',
            datos: piezasConHallazgo,
          },
        ],
        acciones: [
          {
            id: `act-open-odo-${Date.now()}`,
            tipo: 'ABRIR_ODONTOGRAMA',
            etiqueta: 'Ver Odontograma Completo de 32 Dientes',
            requiereConfirmacion: false,
            payload: {pacienteId: paciente.id},
          },
        ],
      };
    }

    // 4. INTENCIONES DE TRATAMIENTOS
    if (q.includes('tratamiento') || q.includes('continuar')) {
      const enCurso = tratamientosPac.find((t) => t.estado === 'EN_CURSO');
      return {
        texto: `Plan de tratamientos de ${paciente.nombreCompleto} (${tratamientosPac.length} registrados):`,
        componentes: [
          {
            tipo: 'RESUMEN_TRATAMIENTOS',
            datos: tratamientosPac,
          },
        ],
        acciones: enCurso
          ? [
              {
                id: `act-cont-trt-${Date.now()}`,
                tipo: 'CONTINUAR_TRATAMIENTO',
                etiqueta: `Agendar siguiente sesión: ${enCurso.nombre}`,
                requiereConfirmacion: false,
                payload: {
                  pacienteId: paciente.id,
                  dentistaId: enCurso.dentistaId,
                  servicioId: enCurso.servicioId,
                  tratamientoId: enCurso.id,
                  fecha: '2026-11-19',
                  hora: '12:00',
                  motivoConsulta: `Continuación de tratamiento: ${enCurso.nombre}`,
                },
              },
            ]
          : undefined,
      };
    }

    // 5. HISTORIAL CLÍNICO Y RESUMEN POR DEFECTO
    const histPac = dbHistorial.filter((h) => h.pacienteId === paciente.id);
    const resumenHist = histPac
      .map((h) => `• ${h.fecha}: ${h.diagnostico} (${h.dentistaNombre})`)
      .join('\n');

    return {
      texto:
        `Expediente Clínico ${paciente.codigoExpediente} — ${paciente.nombreCompleto}:\n` +
        `• Alergias: ${paciente.alergias.join(', ')}\n` +
        `• Alertas médicas: ${paciente.alertasMedicas}\n` +
        `• Tipo de sangre: ${paciente.tipoSangre}\n\n` +
        `Últimas notas del historial:\n${resumenHist}`,
    };
  }
}
