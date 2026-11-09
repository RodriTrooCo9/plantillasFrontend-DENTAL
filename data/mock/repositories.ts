import {
  ClinicalError,
  clinicInstant,
  minutes,
  overlaps,
  today,
  addDays,
  futureAppointment,
} from "@/domain/clinical";
import {
  bookingInputSchema,
  blockInputSchema,
  treatmentInputSchema,
  toothInputSchema,
} from "@/domain/validation";
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
} from "@/data/repositories";
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
  AccionEstructuradaChat,
} from "@/domain";
import {
  SERVICIOS_SEMILLA,
  DENTISTAS_SEMILLA,
  PACIENTES_SEMILLA,
  CITAS_SEMILLA,
  TRATAMIENTOS_SEMILLA,
  HISTORIAL_SEMILLA,
  ODONTOGRAMAS_SEMILLA,
  generar32DientesConOverrides,
} from "./seed";

// Estado en memoria del adaptador Mock (persiste durante la sesión del cliente)
let dbPacientes: Paciente[] = [...PACIENTES_SEMILLA];
let dbDentistas: Dentista[] = [...DENTISTAS_SEMILLA];
let dbCitas: Cita[] = [...CITAS_SEMILLA];
let dbTratamientos: Tratamiento[] = [...TRATAMIENTOS_SEMILLA];
let dbHistorial: EntradaHistorialClinico[] = [...HISTORIAL_SEMILLA];
let dbOdontogramas: Record<string, Odontograma> = { ...ODONTOGRAMAS_SEMILLA };

export function verificarReglaCancelacion24h(
  fechaCita: string,
  horaCita: string,
  ahoraReferencia: Date = new Date(),
): { permitido: boolean; horasRestantes: number; mensaje?: string } {
  const fechaHoraCita = clinicInstant(fechaCita, horaCita);
  const diffMs = fechaHoraCita.getTime() - ahoraReferencia.getTime();
  const horasRestantes = diffMs / (1000 * 60 * 60);

  if (horasRestantes < 24) {
    return {
      permitido: false,
      horasRestantes,
      mensaje:
        "Las cancelaciones requieren al menos 24 horas de anticipación. Por favor comunícate con recepción para reprogramar sin cargo.",
    };
  }
  return { permitido: true, horasRestantes };
}

export class MockAuthRepository implements IAuthRepository {
  async login({ email, password }: LoginPayload): Promise<UsuarioAutenticado> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || password.trim().length < 6) {
      throw new Error(
        "Credenciales inválidas. Verifica tu correo y contraseña (mínimo 6 caracteres).",
      );
    }

    // Buscar si es dentista
    const dentista = dbDentistas.find(
      (d) => d.email.toLowerCase() === cleanEmail,
    );
    if (password !== "123456")
      throw new Error("Correo o contraseña incorrectos.");
    if (dentista) {
      const targetDoc = dentista || dbDentistas[0];
      if (typeof window !== "undefined")
        window.sessionStorage.setItem("lumina_demo_email", cleanEmail);
      return {
        id: `usr-${targetDoc.id}`,
        email: targetDoc.email,
        nombreCompleto: targetDoc.nombreCompleto,
        rol: "DENTISTA",
        dentistaId: targetDoc.id,
      };
    }

    // Buscar si es paciente
    const paciente =
      dbPacientes.find((p) => p.email.toLowerCase() === cleanEmail) ||
      (cleanEmail === "paciente@demo.com" ? dbPacientes[0] : null);
    if (!paciente) throw new Error("Correo o contraseña incorrectos.");

    if (typeof window !== "undefined")
      window.sessionStorage.setItem("lumina_demo_email", cleanEmail);
    return {
      id: `usr-${paciente.id}`,
      email: paciente.email,
      nombreCompleto: paciente.nombreCompleto,
      rol: "PACIENTE",
      pacienteId: paciente.id,
    };
  }

  async recoverPassword(email: string): Promise<{ mensaje: string }> {
    if (!email.trim() || !email.includes("@")) {
      throw new Error("Ingresa un correo electrónico registrado válido.");
    }
    return {
      mensaje: `Se enviaron las instrucciones de recuperación de contraseña a ${email.trim()}.`,
    };
  }

  async getSession(): Promise<UsuarioAutenticado | null> {
    if (typeof window === "undefined") return null;
    const email = window.sessionStorage.getItem("lumina_demo_email");
    return email ? this.login({ email, password: "123456" }) : null;
  }
  async refreshToken(): Promise<UsuarioAutenticado> {
    const session = await this.getSession();
    if (!session) throw new Error("Inicia sesión en la demostración.");
    return session;
  }
  async logout(): Promise<void> {
    if (typeof window !== "undefined")
      window.sessionStorage.removeItem("lumina_demo_email");
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
        p.email.toLowerCase().includes(q),
    );
  }

  async obtenerPacientePorId(pacienteId: string): Promise<Paciente | null> {
    return dbPacientes.find((p) => p.id === pacienteId) || null;
  }

  async obtenerHistorialClinico(
    pacienteId: string,
  ): Promise<EntradaHistorialClinico[]> {
    return dbHistorial.filter((h) => h.pacienteId === pacienteId);
  }

  async agregarEntradaHistorial(
    payload: CrearEntradaHistorialPayload,
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
    pacienteId: string,
  ): Promise<Tratamiento[]> {
    return dbTratamientos.filter((t) => t.pacienteId === pacienteId);
  }

  async crearTratamiento(
    payload: CrearTratamientoPayload,
  ): Promise<Tratamiento> {
    const valid = treatmentInputSchema.safeParse(payload);
    if (!valid.success)
      throw new ClinicalError(422, valid.error.issues[0].message);
    const dentista =
      dbDentistas.find((d) => d.id === payload.dentistaId) || dbDentistas[0];
    const nuevo: Tratamiento = {
      id: `trt-${Date.now()}`,
      pacienteId: payload.pacienteId,
      dentistaId: dentista.id,
      dentistaNombre: dentista.nombreCompleto,
      servicioId: payload.servicioId,
      nombre: payload.nombre,
      estado: "PLANIFICADO",
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
    estado: Tratamiento["estado"],
    sesionesCompletadas: number,
  ): Promise<Tratamiento> {
    let actualizado: Tratamiento | null = null;
    dbTratamientos = dbTratamientos.map((t) => {
      if (t.id !== tratamientoId) return t;
      const progresoPorcentaje =
        estado === "FINALIZADO"
          ? 100
          : Math.min(
              100,
              Math.round((sesionesCompletadas / t.sesionesTotales) * 100),
            );
      actualizado = {
        ...t,
        estado,
        sesionesCompletadas,
        progresoPorcentaje,
      };
      return actualizado;
    });
    if (!actualizado) throw new Error("Tratamiento no encontrado.");
    return actualizado;
  }
}

export class MockCitasRepository implements ICitasRepository {
  constructor(private readonly now: () => Date = () => new Date()) {}
  private available(
    dentistaId: string,
    fecha: string,
    hora: string,
    duration: number,
    ignore?: string,
    pacienteId?: string,
  ) {
    const dentist = dbDentistas.find((d) => d.id === dentistaId);
    if (!dentist) throw new ClinicalError(404, "Especialista inexistente.");
    const mmdd = fecha.slice(5, 10);
    if (["01-01", "05-01", "09-16", "12-25"].includes(mmdd)) return false;
    const diasSemana = [
      "Domingo",
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
    ];
    const diaNombre =
      diasSemana[new Date(`${fecha}T12:00:00Z`).getUTCDay()] || "";
    if (
      Array.isArray(dentist.diasAtencion) &&
      dentist.diasAtencion.length > 0 &&
      !dentist.diasAtencion.includes(diaNombre)
    )
      return false;
    const start = minutes(hora),
      end = start + duration;
    if (
      !dentist.horariosDisponibles.includes(hora) ||
      clinicInstant(fecha, hora) <= this.now() ||
      end > 20 * 60
    )
      return false;
    if (
      dentist.bloqueos.some(
        (b) =>
          b.fecha === fecha &&
          overlaps(start, end, minutes(b.horaInicio), minutes(b.horaFin)),
      )
    )
      return false;
    if (
      pacienteId &&
      dbCitas.some(
        (c) =>
          c.id !== ignore &&
          c.pacienteId === pacienteId &&
          c.fecha === fecha &&
          c.estado !== "CANCELADA" &&
          overlaps(
            start,
            end,
            minutes(c.hora),
            minutes(c.hora) +
              (SERVICIOS_SEMILLA.find((s) => s.id === c.servicioId)
                ?.duracionMinutos || 60),
          ),
      )
    )
      return false;
    return !dbCitas.some(
      (c) =>
        c.id !== ignore &&
        c.dentistaId === dentistaId &&
        c.fecha === fecha &&
        c.estado !== "CANCELADA" &&
        overlaps(
          start,
          end,
          minutes(c.hora),
          minutes(c.hora) +
            (SERVICIOS_SEMILLA.find((s) => s.id === c.servicioId)
              ?.duracionMinutos || 60),
        ),
    );
  }
  async listarServicios(): Promise<ServicioClinico[]> {
    return SERVICIOS_SEMILLA;
  }

  async listarDentistas(): Promise<Dentista[]> {
    return dbDentistas;
  }

  async listarBloqueosDentista(id: string): Promise<BloqueoHorario[]> {
    const dentist = dbDentistas.find((d) => d.id === id);
    if (!dentist) throw new ClinicalError(404, "Especialista inexistente.");
    return dentist.bloqueos;
  }
  async listarCitasPorPaciente(pacienteId: string): Promise<Cita[]> {
    return dbCitas.filter((c) => c.pacienteId === pacienteId);
  }

  async listarCitasPorDentista(
    dentistaId: string,
    fecha?: string,
  ): Promise<Cita[]> {
    return dbCitas.filter((c) => {
      const matchDoc = !dentistaId || c.dentistaId === dentistaId;
      const matchFecha = !fecha || c.fecha === fecha;
      return matchDoc && matchFecha;
    });
  }

  async obtenerHorariosDisponibles(
    dentistaId: string,
    fecha: string,
    servicioId?: string,
  ): Promise<string[]> {
    const dentista = dbDentistas.find((d) => d.id === dentistaId);
    if (!dentista) throw new ClinicalError(404, "Especialista inexistente.");
    const duration =
      SERVICIOS_SEMILLA.find((s) => s.id === servicioId)?.duracionMinutos || 30;
    return dentista.horariosDisponibles.filter((h) =>
      this.available(dentistaId, fecha, h, duration),
    );
  }

  async agendarCita(payload: CrearCitaPayload): Promise<Cita> {
    const validated = bookingInputSchema.safeParse(payload);
    if (!validated.success)
      throw new ClinicalError(422, "Revisa los datos de la cita.");
    const paciente = dbPacientes.find((p) => p.id === payload.pacienteId);
    const dentista = dbDentistas.find((d) => d.id === payload.dentistaId);
    const servicio = SERVICIOS_SEMILLA.find((s) => s.id === payload.servicioId);
    if (!paciente || !dentista || !servicio)
      throw new ClinicalError(
        404,
        "Paciente, especialista o servicio inexistente.",
      );
    if (
      !this.available(
        dentista.id,
        payload.fecha,
        payload.hora,
        servicio.duracionMinutos,
        undefined,
        paciente.id,
      )
    )
      throw new ClinicalError(409, "El horario ya no está disponible.");

    const nueva: Cita = {
      id: `cit-${crypto.randomUUID()}`,
      pacienteId: paciente.id,
      pacienteNombre: paciente.nombreCompleto,
      dentistaId: dentista.id,
      dentistaNombre: dentista.nombreCompleto,
      servicioId: servicio.id,
      servicioNombre: servicio.nombre,
      tratamientoId: payload.tratamientoId,
      fecha: payload.fecha,
      hora: payload.hora,
      estado: "CONFIRMADA",
      motivoConsulta:
        payload.motivoConsulta.trim() || `Consulta de ${servicio.nombre}`,
      costoMXN: servicio.precioBaseMXN,
    };

    dbCitas = [nueva, ...dbCitas];
    return nueva;
  }

  async cancelarCita(citaId: string, motivo: string): Promise<Cita> {
    const target = dbCitas.find((c) => c.id === citaId);
    if (!target) throw new Error("La cita solicitada no existe.");

    const regla = verificarReglaCancelacion24h(
      target.fecha,
      target.hora,
      this.now(),
    );
    if (!regla.permitido) {
      throw new Error(regla.mensaje);
    }

    const actualizada: Cita = {
      ...target,
      estado: "CANCELADA",
      motivoConsulta: `${target.motivoConsulta} [Cancelada: ${motivo}]`,
    };
    dbCitas = dbCitas.map((c) => (c.id === citaId ? actualizada : c));
    return actualizada;
  }

  async reagendarCita(payload: ReagendarCitaPayload): Promise<Cita> {
    const target = dbCitas.find((c) => c.id === payload.citaId);
    if (!target) throw new Error("Cita no encontrada para reagendar.");

    const sessionEmail =
      typeof window !== "undefined"
        ? window.sessionStorage.getItem("lumina_demo_email")?.toLowerCase()
        : null;
    const isPatientSession =
      !!sessionEmail &&
      !dbDentistas.some((d) => d.email.toLowerCase() === sessionEmail);

    if (isPatientSession) {
      const regla = verificarReglaCancelacion24h(
        target.fecha,
        target.hora,
        this.now(),
      );
      if (!regla.permitido) {
        throw new ClinicalError(
          409,
          regla.mensaje ||
            "Las reprogramaciones requieren al menos 24 horas de anticipación.",
        );
      }
    }

    const duration =
      SERVICIOS_SEMILLA.find((s) => s.id === target.servicioId)
        ?.duracionMinutos || 60;
    if (
      !this.available(
        target.dentistaId,
        payload.nuevaFecha,
        payload.nuevaHora,
        duration,
        target.id,
        target.pacienteId,
      )
    )
      throw new ClinicalError(409, "El nuevo horario ya no está disponible.");
    const actualizada: Cita = {
      ...target,
      fecha: payload.nuevaFecha,
      hora: payload.nuevaHora,
      estado: "REPROGRAMADA",
      estadoNotificacion: "solicitada",
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
    motivo: string,
  ): Promise<BloqueoHorario> {
    const valid = blockInputSchema.safeParse({
      fecha,
      horaInicio,
      horaFin,
      motivo,
    });
    if (!valid.success)
      throw new ClinicalError(422, valid.error.issues[0].message);
    const dentist = dbDentistas.find((d) => d.id === dentistaId);
    if (!dentist) throw new ClinicalError(404, "Especialista inexistente.");
    const start = minutes(horaInicio),
      end = minutes(horaFin);
    if (
      dentist.bloqueos.some(
        (b) =>
          b.fecha === fecha &&
          overlaps(start, end, minutes(b.horaInicio), minutes(b.horaFin)),
      ) ||
      dbCitas.some(
        (c) =>
          c.dentistaId === dentistaId &&
          c.fecha === fecha &&
          c.estado !== "CANCELADA" &&
          overlaps(
            start,
            end,
            minutes(c.hora),
            minutes(c.hora) +
              (SERVICIOS_SEMILLA.find((s) => s.id === c.servicioId)
                ?.duracionMinutos || 60),
          ),
      )
    )
      throw new ClinicalError(
        409,
        "El bloqueo se solapa con otro horario ocupado.",
      );
    const nuevoBloqueo: BloqueoHorario = {
      id: `bloq-${Date.now()}`,
      dentistaId,
      fecha,
      horaInicio,
      horaFin,
      motivo,
    };
    dbDentistas = dbDentistas.map((d) =>
      d.id === dentistaId
        ? { ...d, bloqueos: [...d.bloqueos, nuevoBloqueo] }
        : d,
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
    payload: EditarDientePayload,
  ): Promise<Odontograma> {
    const valid = toothInputSchema.safeParse(payload);
    if (!valid.success)
      throw new ClinicalError(422, valid.error.issues[0].message);
    const actual = await this.obtenerOdontograma(payload.pacienteId);
    let estadoPrevio = payload.nuevoEstado;

    const nuevosDientes = actual.dientes.map((diente) => {
      if (diente.numeroFDI !== payload.numeroFDI) return diente;

      estadoPrevio =
        payload.superficie === "GENERAL"
          ? diente.estadoGeneral
          : diente.superficies[payload.superficie];

      const nuevasSuperficies = { ...diente.superficies };
      let nuevoEstadoGeneral = diente.estadoGeneral;

      if (payload.superficie === "GENERAL") {
        nuevoEstadoGeneral = payload.nuevoEstado;
        if (
          payload.nuevoEstado === "SANO" ||
          payload.nuevoEstado === "CORONA" ||
          payload.nuevoEstado === "AUSENTE" ||
          payload.nuevoEstado === "IMPLANTE"
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
      procedimiento: payload.procedimiento.trim() || "Actualización clínica",
      nota: payload.nota.trim() || "Cambio registrado en consulta.",
      autorNombre: payload.autorNombre,
      autorRol: "DENTISTA" as const,
      fechaHora: new Date().toISOString(),
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
  private proposals = new Map<
    string,
    {
      token: string;
      context: string;
      action: AccionEstructuradaChat;
      expires: number;
      result?: RespuestaChat;
      running?: Promise<RespuestaChat>;
    }
  >();
  async sendMessage(
    mensaje: string,
    contexto: ContextoChat,
    confirmation?: { id: string; token: string },
  ): Promise<RespuestaChat> {
    const context = JSON.stringify([
      contexto.rolActual,
      contexto.pacienteActivoId,
      contexto.dentistaActivoId,
    ]);
    if (confirmation) {
      const entry = this.proposals.get(confirmation.id);
      if (
        !entry ||
        entry.token !== confirmation.token ||
        entry.context !== context
      )
        throw new ClinicalError(
          403,
          "La confirmación no corresponde a este expediente.",
        );
      if (entry.result) return entry.result;
      if (entry.expires < Date.now())
        throw new ClinicalError(
          409,
          "La propuesta expiró. Solicita una nueva.",
        );
      if (entry.running) return entry.running;
      entry.running = (async () => {
        const p = entry.action.payload;
        const citas = new MockCitasRepository();
        switch (entry.action.tipo) {
          case "AGENDAR_CITA":
          case "CONTINUAR_TRATAMIENTO":
            await citas.agendarCita(p as unknown as CrearCitaPayload);
            break;
          case "CANCELAR_CITA":
            await citas.cancelarCita(String(p.citaId), String(p.motivo));
            break;
          case "REAGENDAR_CITA":
            await citas.reagendarCita(p as unknown as ReagendarCitaPayload);
            break;
          case "MODIFICAR_ODONTOGRAMA":
            if (contexto.rolActual !== "DENTISTA")
              throw new ClinicalError(
                403,
                "Solo un dentista puede editar el odontograma.",
              );
            await new MockOdontogramaRepository().registrarCambioDiente(
              p as unknown as EditarDientePayload,
            );
            break;
          default:
            throw new ClinicalError(422, "Acción no válida.");
        }
        entry.result = {
          texto:
            "Cambio completado en el expediente indicado. Las notificaciones solicitadas están pendientes de entrega en esta demostración.",
        };
        return entry.result;
      })();
      try {
        return await entry.running;
      } finally {
        entry.running = undefined;
      }
    }
    const response = await this.buildResponse(mensaje, contexto);
    const writes = [
      "AGENDAR_CITA",
      "CONTINUAR_TRATAMIENTO",
      "CANCELAR_CITA",
      "REAGENDAR_CITA",
      "MODIFICAR_ODONTOGRAMA",
    ];
    for (const action of response.acciones || []) {
      if (!writes.includes(action.tipo)) continue;
      if (
        ["AGENDAR_CITA", "CONTINUAR_TRATAMIENTO", "REAGENDAR_CITA"].includes(
          action.tipo,
        )
      ) {
        const p = action.payload;
        const existing = dbCitas.find((c) => c.id === p.citaId);
        const dentistId = String(
          p.dentistaId ||
            existing?.dentistaId ||
            contexto.dentistaActivoId ||
            dbPacientes.find((p) => p.id === contexto.pacienteActivoId)
              ?.dentistaAsignadoId ||
            "",
        );
        const serviceId = String(
          p.servicioId || existing?.servicioId || SERVICIOS_SEMILLA[0].id,
        );
        let date = "",
          time = "";
        for (let i = 1; i <= 30; i++) {
          const day = addDays(today(), i);
          const slots =
            await new MockCitasRepository().obtenerHorariosDisponibles(
              dentistId,
              day,
              serviceId,
            );
          if (slots.length) {
            date = day;
            time = slots[0];
            break;
          }
        }
        if (!time)
          return {
            texto:
              "No encontré horarios disponibles. Consulta la agenda o contacta a recepción.",
          };
        if (action.tipo === "REAGENDAR_CITA") {
          p.nuevaFecha = date;
          p.nuevaHora = time;
        } else {
          p.fecha = date;
          p.hora = time;
        }
        action.etiqueta = `${action.tipo === "REAGENDAR_CITA" ? "Reagendar" : "Agendar"} para ${contexto.pacienteActivoId}: ${date} ${time}`;
        response.texto = `Propuesta de cita: ${date} a las ${time}. Confirma para aplicar el cambio.`;
      }
      const id = crypto.randomUUID(),
        token = crypto.randomUUID();
      this.proposals.set(id, {
        token,
        context,
        action: structuredClone(action),
        expires: Date.now() + 5 * 60 * 1000,
      });
      action.id = id;
      action.requiereConfirmacion = true;
      action.estado = "pendiente";
      action.payload = { confirmarAccion: { id, token } };
    }
    return response;
  }
  private async buildResponse(
    mensaje: string,
    contexto: ContextoChat,
  ): Promise<RespuestaChat> {
    const q = mensaje.trim().toLowerCase();

    // 1. MODO VISITANTE
    if (contexto.rolActual === "VISITANTE") {
      if (
        q.includes("cita") ||
        q.includes("agendar") ||
        q.includes("historial") ||
        q.includes("odontograma") ||
        q.includes("cancelar")
      ) {
        return {
          texto:
            "Para consultar tu expediente personal, ver tu odontograma o agendar/cancelar citas a tu nombre, necesitas iniciar sesión en el portal del consultorio.",
          acciones: [
            {
              id: `act-login-${Date.now()}`,
              tipo: "IR_A_LOGIN",
              etiqueta: "Iniciar sesión ahora",
              requiereConfirmacion: false,
              payload: { ruta: "/login" },
            },
          ],
          componentes: [
            {
              tipo: "TABLA_SERVICIOS",
              datos: SERVICIOS_SEMILLA.slice(0, 3),
            },
          ],
        };
      }

      return {
        texto:
          "¡Hola! Soy el Asistente Digital de Lumina Odontología. Atendemos de Lunes a Sábado de 08:30 a 20:00 hrs en Av. Presidente Masaryk 340, Polanco. Estos son nuestros servicios clínicos y aranceles orientativos:",
        acciones: [
          {
            id: `act-srv-${Date.now()}`,
            tipo: "IR_A_LOGIN",
            etiqueta: "Iniciar sesión para agendar",
            requiereConfirmacion: false,
            payload: { ruta: "/login" },
          },
        ],
        componentes: [
          {
            tipo: "TABLA_SERVICIOS",
            datos: SERVICIOS_SEMILLA,
          },
        ],
      };
    }

    const pacId = contexto.pacienteActivoId;
    const paciente = dbPacientes.find((p) => p.id === pacId);
    if (!paciente) throw new ClinicalError(404, "Expediente no encontrado.");
    const citasPac = dbCitas.filter((c) => c.pacienteId === paciente.id);
    const tratamientosPac = dbTratamientos.filter(
      (t) => t.pacienteId === paciente.id,
    );
    const odontogramaPac = dbOdontogramas[paciente.id];

    // 2. INTENCIONES DE CITAS (VER, AGENDAR, CANCELAR, REAGENDAR)
    if (q.includes("cancelar")) {
      const proximaActiva = citasPac.find((c) => futureAppointment(c));
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
            tipo: "CANCELAR_CITA",
            etiqueta: `Confirmar cancelación (${proximaActiva.fecha} ${proximaActiva.hora})`,
            requiereConfirmacion: true,
            payload: {
              citaId: proximaActiva.id,
              motivo: "Solicitada desde el Asistente Clínico",
            },
          },
        ],
      };
    }

    if (q.includes("reagendar")) {
      const proxima = citasPac.find((c) => futureAppointment(c));
      if (!proxima) return { texto: "No hay citas futuras para reagendar." };
      return {
        texto: `Puedes reagendar la cita de ${proxima.pacienteNombre} (${proxima.servicioNombre}) al próximo horario disponible (2026-11-12 a las 11:00 hrs) notificando automáticamente al paciente. Confirma la acción:`,
        acciones: [
          {
            id: `act-reagendar-${Date.now()}`,
            tipo: "REAGENDAR_CITA",
            etiqueta: `Confirmar reagendado a 2026-11-12 11:00`,
            requiereConfirmacion: true,
            payload: {
              citaId: proxima.id,
              nuevaFecha: "2026-11-12",
              nuevaHora: "11:00",
              motivo: "Ajuste de agenda clínica por el especialista",
            },
          },
        ],
      };
    }

    if (q.includes("agendar") || q.includes("nueva cita")) {
      return {
        texto: `Puedo agendar una sesión de Profilaxis Ultrasónica para ${paciente.nombreCompleto} con la Dra. Valeria Mendoza el 2026-11-16 a las 10:30 hrs:`,
        acciones: [
          {
            id: `act-book-${Date.now()}`,
            tipo: "AGENDAR_CITA",
            etiqueta: "Agendar Profilaxis (16 Nov · 10:30 hrs)",
            requiereConfirmacion: false,
            payload: {
              pacienteId: paciente.id,
              dentistaId: paciente.dentistaAsignadoId,
              servicioId: "srv-limpieza",
              fecha: "2026-11-16",
              hora: "10:30",
              motivoConsulta: "Cita agendada mediante el Asistente Clínico",
            },
          },
        ],
      };
    }

    if (q.includes("cita") || q.includes("agenda")) {
      return {
        texto: `Aquí tienes las citas registradas de ${paciente.nombreCompleto} (${paciente.codigoExpediente}):`,
        componentes: [
          {
            tipo: "TARJETA_CITAS",
            datos: citasPac,
          },
        ],
      };
    }

    // 3. INTENCIONES DE ODONTOGRAMA (CONSULTAR O MODIFICAR CON CONFIRMACIÓN PARA DENTISTA)
    if (
      (q.includes("modificar") ||
        q.includes("cambiar") ||
        q.includes("registrar obturación") ||
        q.includes("editar diente")) &&
      contexto.rolActual === "DENTISTA"
    ) {
      return {
        texto: `Propuesta clínica para ${paciente.nombreCompleto}: Registrar estado OBTURADO (Resina compuesta) en la superficie oclusal del diente #16. Esta acción requiere tu confirmación explícita antes de guardarse en el odontograma:`,
        acciones: [
          {
            id: `act-odo-edit-${Date.now()}`,
            tipo: "MODIFICAR_ODONTOGRAMA",
            etiqueta: "Confirmar obturación en diente #16",
            requiereConfirmacion: true,
            payload: {
              pacienteId: paciente.id,
              numeroFDI: 16,
              superficie: "oclusal",
              nuevoEstado: "OBTURADO",
              procedimiento: "Restauración con resina compuesta en #16",
              nota: "Eliminación de caries oclusal y sellado adhesivo registrado vía asistente.",
              autorNombre:
                dbDentistas.find((d) => d.id === contexto.dentistaActivoId)
                  ?.nombreCompleto || "",
            },
          },
        ],
      };
    }

    if (
      q.includes("odontograma") ||
      q.includes("diente") ||
      q.includes("muela")
    ) {
      const piezasConHallazgo = odontogramaPac.dientes.filter(
        (d) => d.estadoGeneral !== "SANO",
      );
      return {
        texto: `Odontograma FDI de ${paciente.nombreCompleto} (32 dientes evaluados, ${piezasConHallazgo.length} con hallazgos clínicos o restauraciones):`,
        componentes: [
          {
            tipo: "MINI_ODONTOGRAMA",
            datos: piezasConHallazgo,
          },
        ],
        acciones: [
          {
            id: `act-open-odo-${Date.now()}`,
            tipo: "ABRIR_ODONTOGRAMA",
            etiqueta: "Ver Odontograma Completo de 32 Dientes",
            requiereConfirmacion: false,
            payload: { pacienteId: paciente.id },
          },
        ],
      };
    }

    // 4. INTENCIONES DE TRATAMIENTOS
    if (q.includes("tratamiento") || q.includes("continuar")) {
      const enCurso = tratamientosPac.find((t) => t.estado === "EN_CURSO");
      return {
        texto: `Plan de tratamientos de ${paciente.nombreCompleto} (${tratamientosPac.length} registrados):`,
        componentes: [
          {
            tipo: "RESUMEN_TRATAMIENTOS",
            datos: tratamientosPac,
          },
        ],
        acciones: enCurso
          ? [
              {
                id: `act-cont-trt-${Date.now()}`,
                tipo: "CONTINUAR_TRATAMIENTO",
                etiqueta: `Agendar siguiente sesión: ${enCurso.nombre}`,
                requiereConfirmacion: false,
                payload: {
                  pacienteId: paciente.id,
                  dentistaId: enCurso.dentistaId,
                  servicioId: enCurso.servicioId,
                  tratamientoId: enCurso.id,
                  fecha: "2026-11-19",
                  hora: "12:00",
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
      .join("\n");

    return {
      texto:
        `Expediente Clínico ${paciente.codigoExpediente} — ${paciente.nombreCompleto}:\n` +
        `• Alergias: ${paciente.alergias.join(", ")}\n` +
        `• Alertas médicas: ${paciente.alertasMedicas}\n` +
        `• Tipo de sangre: ${paciente.tipoSangre}\n\n` +
        `Últimas notas del historial:\n${resumenHist}`,
    };
  }
}
