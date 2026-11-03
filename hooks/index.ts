'use client';

import {useState, useEffect, useCallback} from 'react';
import {repositories} from '@/data/factory';
import {
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
  MensajeChat,
  ContextoChat,
  AccionEstructuradaChat,
} from '@/domain';

const STORAGE_AUTH_KEY = 'lumina_auth_session_v2';

export function useAuth() {
  const [user, setUser] = useState<UsuarioAutenticado | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(STORAGE_AUTH_KEY);
      if (saved) {
        try {
          setUser(JSON.parse(saved));
        } catch {
          window.localStorage.removeItem(STORAGE_AUTH_KEY);
        }
      }
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    setError(null);
    setLoading(true);
    try {
      const session = await repositories.auth.login(payload);
      setUser(session);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(session));
        document.cookie = `lumina_role=${session.rol}; path=/; max-age=86400`;
      }
      return session;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Error al iniciar sesión.';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const recoverPassword = useCallback(async (email: string) => {
    return repositories.auth.recoverPassword(email);
  }, []);

  const logout = useCallback(async () => {
    await repositories.auth.logout();
    setUser(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_AUTH_KEY);
      document.cookie = 'lumina_role=; path=/; max-age=0';
    }
  }, []);

  return {user, loading, error, login, recoverPassword, logout};
}

export function usePacientes(pacienteActivoId?: string) {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacienteActual, setPacienteActual] = useState<Paciente | null>(null);
  const [historial, setHistorial] = useState<EntradaHistorialClinico[]>([]);
  const [tratamientos, setTratamientos] = useState<Tratamiento[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const recargar = useCallback(
    async (busqueda?: string) => {
      setLoading(true);
      try {
        const lista = await repositories.pacientes.listarPacientes(busqueda);
        setPacientes(lista);
        const targetId = pacienteActivoId || lista[0]?.id;
        if (targetId) {
          const [pac, hist, trts] = await Promise.all([
            repositories.pacientes.obtenerPacientePorId(targetId),
            repositories.pacientes.obtenerHistorialClinico(targetId),
            repositories.pacientes.obtenerTratamientosPorPaciente(targetId),
          ]);
          setPacienteActual(pac);
          setHistorial(hist);
          setTratamientos(trts);
        }
      } finally {
        setLoading(false);
      }
    },
    [pacienteActivoId]
  );

  useEffect(() => {
    recargar();
  }, [recargar]);

  const agregarNotaHistorial = useCallback(
    async (payload: CrearEntradaHistorialPayload) => {
      const nueva =
        await repositories.pacientes.agregarEntradaHistorial(payload);
      setHistorial((prev) => [nueva, ...prev]);
      return nueva;
    },
    []
  );

  const crearTratamiento = useCallback(
    async (payload: CrearTratamientoPayload) => {
      const nuevo = await repositories.pacientes.crearTratamiento(payload);
      setTratamientos((prev) => [nuevo, ...prev]);
      return nuevo;
    },
    []
  );

  const actualizarTratamiento = useCallback(
    async (
      tratamientoId: string,
      estado: Tratamiento['estado'],
      sesionesCompletadas: number
    ) => {
      const act = await repositories.pacientes.actualizarEstadoTratamiento(
        tratamientoId,
        estado,
        sesionesCompletadas
      );
      setTratamientos((prev) =>
        prev.map((t) => (t.id === tratamientoId ? act : t))
      );
      return act;
    },
    []
  );

  return {
    pacientes,
    pacienteActual,
    historial,
    tratamientos,
    loading,
    buscarPacientes: recargar,
    agregarNotaHistorial,
    crearTratamiento,
    actualizarTratamiento,
  };
}

export function useCitas(pacienteId?: string, dentistaId?: string) {
  const [servicios, setServicios] = useState<ServicioClinico[]>([]);
  const [dentistas, setDentistas] = useState<Dentista[]>([]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const cargarCitas = useCallback(async () => {
    setLoading(true);
    try {
      const [srvs, docs] = await Promise.all([
        repositories.citas.listarServicios(),
        repositories.citas.listarDentistas(),
      ]);
      setServicios(srvs);
      setDentistas(docs);

      if (dentistaId) {
        const c = await repositories.citas.listarCitasPorDentista(dentistaId);
        setCitas(c);
      } else if (pacienteId) {
        const c = await repositories.citas.listarCitasPorPaciente(pacienteId);
        setCitas(c);
      } else {
        const c = await repositories.citas.listarCitasPorPaciente('pac-1');
        setCitas(c);
      }
    } finally {
      setLoading(false);
    }
  }, [pacienteId, dentistaId]);

  useEffect(() => {
    cargarCitas();
  }, [cargarCitas]);

  const agendarCita = useCallback(async (payload: CrearCitaPayload) => {
    setError(null);
    const nueva = await repositories.citas.agendarCita(payload);
    setCitas((prev) => [nueva, ...prev]);
    return nueva;
  }, []);

  const cancelarCita = useCallback(async (citaId: string, motivo: string) => {
    setError(null);
    try {
      const act = await repositories.citas.cancelarCita(citaId, motivo);
      setCitas((prev) => prev.map((c) => (c.id === citaId ? act : c)));
      return act;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'No fue posible cancelar la cita.';
      setError(msg);
      throw err;
    }
  }, []);

  const reagendarCita = useCallback(async (payload: ReagendarCitaPayload) => {
    setError(null);
    const act = await repositories.citas.reagendarCita(payload);
    setCitas((prev) => prev.map((c) => (c.id === payload.citaId ? act : c)));
    return act;
  }, []);

  const bloquearHorario = useCallback(
    async (
      docId: string,
      fecha: string,
      horaInicio: string,
      horaFin: string,
      motivo: string
    ) => {
      await repositories.citas.bloquearHorarioDentista(
        docId,
        fecha,
        horaInicio,
        horaFin,
        motivo
      );
      await cargarCitas();
    },
    [cargarCitas]
  );

  return {
    servicios,
    dentistas,
    citas,
    loading,
    error,
    recargarCitas: cargarCitas,
    agendarCita,
    cancelarCita,
    reagendarCita,
    bloquearHorario,
  };
}

export function useOdontograma(pacienteId: string) {
  const [odontograma, setOdontograma] = useState<Odontograma | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const cargar = useCallback(async () => {
    if (!pacienteId) return;
    setLoading(true);
    try {
      const data = await repositories.odontograma.obtenerOdontograma(pacienteId);
      setOdontograma(data);
    } finally {
      setLoading(false);
    }
  }, [pacienteId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const editarDiente = useCallback(async (payload: EditarDientePayload) => {
    const actualizado =
      await repositories.odontograma.registrarCambioDiente(payload);
    setOdontograma(actualizado);
    return actualizado;
  }, []);

  return {odontograma, loading, recargarOdontograma: cargar, editarDiente};
}

export function useChatbot(contexto: ContextoChat) {
  const [mensajes, setMensajes] = useState<MensajeChat[]>([
    {
      id: 'msg-init',
      emisor: 'ASISTENTE',
      texto:
        contexto.rolActual === 'VISITANTE'
          ? '¡Hola! Soy el Asistente Digital de Lumina Odontología. Puedo informarte sobre servicios, horarios, precios o guiarte para iniciar sesión.'
          : contexto.rolActual === 'DENTISTA'
          ? 'Modo Clínico Dentista activo. Puedes consultar expedientes, revisar tu agenda, reagendar citas o proponer cambios al odontograma con confirmación.'
          : '¡Hola! Estoy sincronizado con tu Portal de Paciente. Puedo ayudarte a revisar tu historial, consultar tu odontograma, seguir un tratamiento o agendar/cancelar citas.',
      fechaHora: 'Ahora',
    },
  ]);
  const [escribiendo, setEscribiendo] = useState<boolean>(false);

  const enviarMensaje = useCallback(
    async (textoUsuario: string) => {
      const limpio = textoUsuario.trim();
      if (!limpio) return;

      const msgUser: MensajeChat = {
        id: `usr-${Date.now()}`,
        emisor: 'USUARIO',
        texto: limpio,
        fechaHora: new Date().toLocaleTimeString('es-MX', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      setMensajes((prev) => [...prev, msgUser]);
      setEscribiendo(true);

      try {
        const respuesta = await repositories.chat.sendMessage(limpio, contexto);
        const msgBot: MensajeChat = {
          id: `bot-${Date.now()}`,
          emisor: 'ASISTENTE',
          texto: respuesta.texto,
          fechaHora: new Date().toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          acciones: respuesta.acciones,
          componentes: respuesta.componentes,
        };
        setMensajes((prev) => [...prev, msgBot]);
      } finally {
        setEscribiendo(false);
      }
    },
    [contexto]
  );

  const marcarAccionConfirmada = useCallback(
    (accionId: string, textoConfirmacion: string) => {
      setMensajes((prev) => [
        ...prev.map((m) => ({
          ...m,
          acciones: m.acciones?.map((a) =>
            a.id === accionId ? {...a, confirmada: true} : a
          ),
        })),
        {
          id: `sys-${Date.now()}`,
          emisor: 'ASISTENTE',
          texto: textoConfirmacion,
          fechaHora: 'Ahora',
        },
      ]);
    },
    []
  );

  return {mensajes, escribiendo, enviarMensaje, marcarAccionConfirmada};
}
