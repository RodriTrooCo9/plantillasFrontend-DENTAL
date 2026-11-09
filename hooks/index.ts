"use client";

import {
  useState,
  useEffect,
  useCallback,
  useSyncExternalStore,
  useRef,
} from "react";
import { useQuery } from "./use-query";
import {
  subscribeSession,
  getSessionSnapshot,
  getServerSessionSnapshot,
  bootstrapSession,
  loginSession,
  logoutSession,
} from "@/data/auth/session";
import {
  authService,
  patientsService,
  appointmentsService,
  odontogramService,
  chatService,
} from "@/services";
import type {
  LoginPayload,
  CrearCitaPayload,
  ReagendarCitaPayload,
  EditarDientePayload,
  CrearEntradaHistorialPayload,
  CrearTratamientoPayload,
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
} from "@/types";

export function useAuth() {
  const session = useSyncExternalStore(
    subscribeSession,
    getSessionSnapshot,
    getServerSessionSnapshot,
  );
  useEffect(() => {
    void bootstrapSession();
  }, []);
  return {
    ...session,
    login: loginSession,
    logout: logoutSession,
    recoverPassword: authService.recoverPassword,
  };
}

export function usePacientes(
  pacienteActivoId?: string,
  options: { directorio: boolean } = { directorio: true },
) {
  const [search, setSearch] = useState("");
  const loadDirectory = useCallback(
    () => patientsService.listarPacientes(search),
    [search],
  );
  const directory = useQuery(
    `patients:${search}`,
    loadDirectory,
    options.directorio,
  );
  const reloadDirectory = directory.reload;
  const pacientes = directory.data || [];
  const target =
    pacienteActivoId || (options.directorio ? pacientes[0]?.id : undefined);
  const loadPatient = useCallback(async () => {
    if (!target) throw new Error("No hay un expediente seleccionado.");
    const [pacienteActual, historial, tratamientos] = await Promise.all([
      patientsService.obtenerPacientePorId(target),
      patientsService.obtenerHistorialClinico(target),
      patientsService.obtenerTratamientosPorPaciente(target),
    ]);
    return { pacienteActual, historial, tratamientos };
  }, [target]);
  const query = useQuery(`patient:${target}`, loadPatient, !!target);
  const reload = query.reload;
  const buscarPacientes = useCallback(
    async (busqueda?: string) => {
      if (busqueda !== undefined) setSearch(busqueda);
      else {
        reloadDirectory();
        reload();
      }
    },
    [reloadDirectory, reload],
  );
  const agregarNotaHistorial = useCallback(
    async (payload: CrearEntradaHistorialPayload) => {
      const value =
        await patientsService.agregarEntradaHistorial(payload);
      reload();
      return value;
    },
    [reload],
  );
  const crearTratamiento = useCallback(
    async (payload: CrearTratamientoPayload) => {
      const value = await patientsService.crearTratamiento(payload);
      reload();
      return value;
    },
    [reload],
  );
  const actualizarTratamiento = useCallback(
    async (id: string, estado: Tratamiento["estado"], sesiones: number) => {
      const value = await patientsService.actualizarEstadoTratamiento(
        id,
        estado,
        sesiones,
      );
      reload();
      return value;
    },
    [reload],
  );
  return {
    pacientes,
    pacienteActual: query.data?.pacienteActual || null,
    historial: query.data?.historial || [],
    tratamientos: query.data?.tratamientos || [],
    loading: directory.loading || query.loading,
    error: directory.error || query.error,
    buscarPacientes,
    agregarNotaHistorial,
    crearTratamiento,
    actualizarTratamiento,
  };
}

export function useCitas(pacienteId?: string, dentistaId?: string) {
  const [mutationError, setMutationError] = useState<string | null>(null);
  const load = useCallback(async () => {
    const [servicios, dentistas, citas, bloqueos] = await Promise.all([
      appointmentsService.listarServicios(),
      appointmentsService.listarDentistas(),
      dentistaId
        ? appointmentsService.listarCitasPorDentista(dentistaId)
        : pacienteId
          ? appointmentsService.listarCitasPorPaciente(pacienteId)
          : Promise.resolve([] as Cita[]),
      dentistaId
        ? appointmentsService.listarBloqueosDentista(dentistaId)
        : Promise.resolve([]),
    ]);
    return {
      servicios,
      dentistas: dentistas.map((d) =>
        d.id === dentistaId ? { ...d, bloqueos } : d,
      ),
      citas,
    };
  }, [pacienteId, dentistaId]);
  const query = useQuery(`appointments:${pacienteId}:${dentistaId}`, load);
  const reload = query.reload;
  const mutate = useCallback(
    async <T>(operation: () => Promise<T>) => {
      setMutationError(null);
      try {
        const result = await operation();
        reload();
        return result;
      } catch (e) {
        setMutationError(
          e instanceof Error
            ? e.message
            : "No fue posible completar la operación.",
        );
        throw e;
      }
    },
    [reload],
  );
  const agendarCita = useCallback(
    (p: CrearCitaPayload) => mutate(() => appointmentsService.agendarCita(p)),
    [mutate],
  );
  const cancelarCita = useCallback(
    (id: string, motivo: string) =>
      mutate(() => appointmentsService.cancelarCita(id, motivo)),
    [mutate],
  );
  const reagendarCita = useCallback(
    (p: ReagendarCitaPayload) =>
      mutate(() => appointmentsService.reagendarCita(p)),
    [mutate],
  );
  const bloquearHorario = useCallback(
    (id: string, fecha: string, inicio: string, fin: string, motivo: string) =>
      mutate(() =>
        appointmentsService.bloquearHorarioDentista(
          id,
          fecha,
          inicio,
          fin,
          motivo,
        ),
      ),
    [mutate],
  );
  const recargarCitas = useCallback(() => {
    setMutationError(null);
    reload();
  }, [reload]);
  return {
    servicios: query.data?.servicios || [],
    dentistas: query.data?.dentistas || [],
    citas: query.data?.citas || [],
    loading: query.loading,
    error: mutationError || query.error,
    recargarCitas,
    agendarCita,
    cancelarCita,
    reagendarCita,
    bloquearHorario,
  };
}

export function useOdontograma(pacienteId: string) {
  const load = useCallback(
    () => odontogramService.obtenerOdontograma(pacienteId),
    [pacienteId],
  );
  const query = useQuery(`odontogram:${pacienteId}`, load, !!pacienteId);
  const reload = query.reload;
  const editarDiente = useCallback(
    async (p: EditarDientePayload) => {
      const result = await odontogramService.registrarCambioDiente(p);
      reload();
      return result;
    },
    [reload],
  );
  return {
    odontograma: query.data || null,
    loading: query.loading,
    error: query.error,
    recargarOdontograma: reload,
    editarDiente,
  };
}

export function useChatbot(contexto: ContextoChat) {
  const [mensajes, setMensajes] = useState<MensajeChat[]>([
    {
      id: "welcome",
      emisor: "ASISTENTE",
      texto:
        contexto.rolActual === "VISITANTE"
          ? "Hola. Puedo ayudarte con servicios, horarios y acceso al portal."
          : "Puedo ayudarte a consultar tu expediente y gestionar citas. Cada cambio requiere tu confirmación.",
      fechaHora: "Ahora",
    },
  ]);
  const [escribiendo, setEscribiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ultimoMensaje, setUltimoMensaje] = useState("");
  const lock = useRef(false);
  const enviarMensaje = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || lock.current) return false;
      lock.current = true;
      setEscribiendo(true);
      setError(null);
      setMensajes((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          emisor: "USUARIO",
          texto: message,
          fechaHora: "Ahora",
        },
      ]);
      try {
        const response = await chatService.sendMessage(message, contexto);
        setMensajes((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            emisor: "ASISTENTE",
            texto: response.texto,
            acciones: response.acciones,
            componentes: response.componentes,
            fechaHora: "Ahora",
          },
        ]);
        setUltimoMensaje("");
        return true;
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "No se pudo enviar el mensaje.",
        );
        setUltimoMensaje(message);
        return false;
      } finally {
        lock.current = false;
        setEscribiendo(false);
      }
    },
    [contexto],
  );
  const marcarAccionConfirmada = useCallback((id: string, text: string) => {
    setMensajes((prev) => [
      ...prev.map((m) => ({
        ...m,
        acciones: m.acciones?.map((a) =>
          a.id === id
            ? {
                ...a,
                confirmada: true,
                estado: "completada" as const,
                error: undefined,
              }
            : a,
        ),
      })),
      {
        id: crypto.randomUUID(),
        emisor: "ASISTENTE",
        texto: text,
        fechaHora: "Ahora",
      },
    ]);
  }, []);
  const marcarAccionFallida = useCallback((id: string, text: string) => {
    setMensajes((prev) =>
      prev.map((m) => ({
        ...m,
        acciones: m.acciones?.map((a) =>
          a.id === id
            ? {
                ...a,
                confirmada: false,
                estado: "fallida" as const,
                error: text,
              }
            : a,
        ),
      })),
    );
  }, []);
  return {
    mensajes,
    escribiendo,
    error,
    ultimoMensaje,
    enviarMensaje,
    marcarAccionConfirmada,
    marcarAccionFallida,
  };
}

export function useCatalogoPublico() {
  const load = useCallback(async () => {
    const [servicios, dentistas] = await Promise.all([
      appointmentsService.listarServicios(),
      appointmentsService.listarDentistas(),
    ]);
    return { servicios, dentistas };
  }, []);
  const query = useQuery("public-catalog", load);
  return {
    servicios: query.data?.servicios || [],
    dentistas: query.data?.dentistas || [],
    loading: query.loading,
    error: query.error,
    reload: query.reload,
  };
}
export function useDisponibilidad(
  dentistaId: string,
  fecha: string,
  servicioId: string,
) {
  const load = useCallback(
    () =>
      appointmentsService.obtenerHorariosDisponibles(
        dentistaId,
        fecha,
        servicioId,
      ),
    [dentistaId, fecha, servicioId],
  );
  const query = useQuery(
    `slots:${dentistaId}:${fecha}:${servicioId}`,
    load,
    !!dentistaId && !!fecha && !!servicioId,
  );
  const reload = query.reload;
  const revalidate = useCallback(
    async (hora: string) => {
      const values = await load();
      if (!hora || !values.includes(hora)) {
        reload();
        throw new Error(
          "Ese horario ya no está disponible. Elige otro horario.",
        );
      }
    },
    [load, reload],
  );
  return { ...query, horarios: query.data || [], revalidate };
}
