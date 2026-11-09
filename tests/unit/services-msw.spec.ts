import {
  authService,
  patientsService,
  usersService,
  appointmentsService,
  odontogramService,
  chatService,
  inventoryService,
  serverApiFetch,
  HttpApiError,
} from "@/services";

describe("Capa de Servicios Frontend, Cliente HTTP e Interceptor JWT", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("ejecuta el flujo de autenticación con authService y consulta de usuarios con usersService", async () => {
    // Arrange & Act
    const sesionAdmin = await authService.login({
      email: "admin@demo.com",
      password: "123456",
    });
    const actual = await usersService.getCurrentUser();
    const recov = await authService.recoverPassword("admin@demo.com");
    const renovada = await authService.refreshToken();
    const pacientes = await usersService.listPatients("Prueba 1");
    const fichaPrueba1 = await usersService.getPatientById("pac-prueba1");
    const dentistas = await usersService.listDentists();
    await authService.logout();
    const postLogout = await authService.getSession();

    // Assert
    expect(sesionAdmin.rol).toBe("DENTISTA");
    expect(actual?.email).toBe("admin@demo.com");
    expect(recov.mensaje).toMatch(/admin@demo\.com/);
    expect(renovada.id).toBe(sesionAdmin.id);
    expect(pacientes).toHaveLength(1);
    expect(fichaPrueba1?.email).toBe("prueba1@demo.com");
    expect(dentistas.length).toBeGreaterThanOrEqual(3);
    expect(postLogout).toBeNull();
  });

  it("gestiona expediente clínico, historial y planes de tratamiento con patientsService", async () => {
    // Arrange & Act
    const lista = await patientsService.listarPacientes();
    const ficha = await patientsService.obtenerPacientePorId("pac-1");
    const nuevaEntrada = await patientsService.agregarEntradaHistorial({
      pacienteId: "pac-1",
      dentistaId: "den-admin",
      dentistaNombre: "Dr. Admin Principal",
      tipo: "PROCEDIMIENTO",
      diagnostico: "Desgaste incisal leve",
      procedimientoRealizado: "Pulido y sellado",
      notasClinicas: "Control en 6 meses",
    });
    const historial = await patientsService.obtenerHistorialClinico("pac-1");
    const nuevoTrt = await patientsService.crearTratamiento({
      pacienteId: "pac-1",
      dentistaId: "den-admin",
      servicioId: "srv-limpieza",
      nombre: "Mantenimiento Periodontal",
      costoTotalMXN: 1900,
      sesionesTotales: 2,
      dientesFDI: [16, 26],
      proximaFechaSugerida: "2027-07-01",
      notasEvolucion: "Plan creado en prueba",
    });
    const tratamientos =
      await patientsService.obtenerTratamientosPorPaciente("pac-1");
    const actualizado = await patientsService.actualizarEstadoTratamiento(
      nuevoTrt.id,
      "FINALIZADO",
      2,
    );

    // Assert
    expect(lista.length).toBeGreaterThanOrEqual(5);
    expect(ficha?.id).toBe("pac-1");
    expect(historial.length).toBeGreaterThanOrEqual(1);
    expect(nuevaEntrada.diagnostico).toBe("Desgaste incisal leve");
    expect(tratamientos.length).toBeGreaterThanOrEqual(1);
    expect(actualizado.estado).toBe("FINALIZADO");
    expect(actualizado.progresoPorcentaje).toBe(100);
  });

  it("gestiona agenda, citas, bloqueos, odontograma, asistente y control de inventario", async () => {
    // Arrange & Act
    const servicios = await appointmentsService.listarServicios();
    const dentistas = await appointmentsService.listarDentistas();
    const bloqueos =
      await appointmentsService.listarBloqueosDentista("den-valeria");
    const citasPac =
      await appointmentsService.listarCitasPorPaciente("pac-1");
    const citasDoc =
      await appointmentsService.listarCitasPorDentista("den-valeria");
    const disponibles = await appointmentsService.obtenerHorariosDisponibles(
      "den-admin",
      "2027-08-04",
      "srv-limpieza",
    );
    const nuevaCita = await appointmentsService.agendarCita({
      pacienteId: "pac-prueba1",
      dentistaId: "den-admin",
      servicioId: "srv-limpieza",
      fecha: "2027-08-04",
      hora: disponibles[0],
      motivoConsulta: "Cita de control E2E",
    });
    const reagendada = await appointmentsService.reagendarCita({
      citaId: nuevaCita.id,
      nuevaFecha: "2027-08-05",
      nuevaHora: "10:30",
      motivo: "Ajuste de agenda",
    });
    const cancelada = await appointmentsService.cancelarCita(
      nuevaCita.id,
      "Cancelación con anticipación",
    );
    const bloqueo = await appointmentsService.bloquearHorarioDentista(
      "den-admin",
      "2027-08-06",
      "12:00",
      "14:00",
      "Sesión académica",
    );
    const odo = await odontogramService.obtenerOdontograma("pac-prueba1");
    const odoEdit = await odontogramService.registrarCambioDiente({
      pacienteId: "pac-prueba1",
      numeroFDI: 16,
      superficie: "oclusal",
      nuevoEstado: "OBTURADO",
      procedimiento: "Resina compuesta",
      nota: "Sellado marginal",
      autorNombre: "Dr. Admin Principal",
    });
    const chatResp = await chatService.sendMessage("Ver servicios", {
      rolActual: "VISITANTE",
    });

    // Mock de globalThis.fetch para inventoryService y serverApiFetch
    const itemMock = {
      id: "inv-resina-a2",
      sku: "SKU-RES-A2",
      nombre: "Resina A2",
      categoria: "RESTAURACION",
      unidad: "jeringa",
      stockActual: 8,
      stockMinimo: 2,
      costoUnitarioMXN: 820,
      alertaBajoStock: false,
      activo: true,
    };
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify([itemMock]),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ material: itemMock }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ material: itemMock }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [{ id: "srv-1" }],
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ message: "Error" }),
      }) as unknown as typeof fetch;

    const invItems = await inventoryService.listarInventario();
    const invConsumo = await inventoryService.consumirMaterial("inv-resina-a2", {
      cantidad: 2,
      motivo: "Obturación #16",
    });
    const invReabastecer = await inventoryService.reabastecerMaterial(
      "inv-resina-a2",
      {
        cantidad: 5,
        motivo: "Entrada almacén",
      },
    );
    const srvData = await serverApiFetch<Array<{ id: string }>>("/servicios");
    await expect(serverApiFetch("/servicios")).rejects.toThrow(HttpApiError);

    // Assert
    expect(servicios.length).toBeGreaterThan(0);
    expect(dentistas.length).toBeGreaterThan(0);
    expect(bloqueos.length).toBeGreaterThanOrEqual(1);
    expect(citasPac.length).toBeGreaterThanOrEqual(1);
    expect(citasDoc.length).toBeGreaterThanOrEqual(1);
    expect(reagendada.estado).toBe("REPROGRAMADA");
    expect(cancelada.estado).toBe("CANCELADA");
    expect(bloqueo.motivo).toBe("Sesión académica");
    expect(odo.dientes).toHaveLength(32);
    expect(odoEdit.historialCambios[0].numeroFDI).toBe(16);
    expect(chatResp.texto).toBeDefined();
    expect(invItems).toHaveLength(1);
    expect(invConsumo.material.stockActual).toBe(8);
    expect(invReabastecer.material.stockActual).toBe(8);
    expect(srvData[0].id).toBe("srv-1");
  });
});
