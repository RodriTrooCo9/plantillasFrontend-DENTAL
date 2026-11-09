import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MockAuthRepository,
  MockPacientesRepository,
  MockOdontogramaRepository,
  MockChatRepository,
  verificarReglaCancelacion24h,
} from './repositories';

describe('Arquitectura Desacoplada — Repositorios Mock y Reglas Clínicas', () => {
  it('Autentica correctamente a paciente@demo.com y dentista@demo.com con su rol respectivo', async () => {
    const authRepo = new MockAuthRepository();

    const sesionPaciente = await authRepo.login({
      email: 'paciente@demo.com',
      password: '123456',
    });
    assert.equal(sesionPaciente.rol, 'PACIENTE');
    assert.equal(sesionPaciente.pacienteId, 'pac-1');

    const sesionDentista = await authRepo.login({
      email: 'dentista@demo.com',
      password: '123456',
    });
    assert.equal(sesionDentista.rol, 'DENTISTA');
    assert.ok(sesionDentista.dentistaId);
  });

  it('Entrega los pacientes de semilla y sus tratamientos e historial clínico', async () => {
    const pacientesRepo = new MockPacientesRepository();
    const lista = await pacientesRepo.listarPacientes();
    assert.ok(lista.length >= 5);

    const historial = await pacientesRepo.obtenerHistorialClinico('pac-1');
    assert.ok(historial.length >= 2);

    const tratamientos = await pacientesRepo.obtenerTratamientosPorPaciente('pac-1');
    assert.ok(tratamientos.length >= 2);
  });

  it('Inicializa el Odontograma FDI con los 32 dientes y registra auditoría al editar un diente', async () => {
    const odoRepo = new MockOdontogramaRepository();
    const odoInicial = await odoRepo.obtenerOdontograma('pac-1');
    assert.equal(odoInicial.dientes.length, 32);

    const cambiosPrevios = odoInicial.historialCambios.length;

    const odoActualizado = await odoRepo.registrarCambioDiente({
      pacienteId: 'pac-1',
      numeroFDI: 24,
      superficie: 'oclusal',
      nuevoEstado: 'OBTURADO',
      procedimiento: 'Resina compuesta fotopolimerizable',
      nota: 'Control oclusal satisfactorio',
      autorNombre: 'Dra. Valeria Mendoza',
    });

    const diente24 = odoActualizado.dientes.find((d) => d.numeroFDI === 24);
    assert.ok(diente24);
    assert.equal(diente24.superficies.oclusal, 'OBTURADO');
    assert.equal(odoActualizado.historialCambios.length, cambiosPrevios + 1);
    assert.equal(odoActualizado.historialCambios[0].numeroFDI, 24);
    assert.equal(odoActualizado.historialCambios[0].estadoNuevo, 'OBTURADO');
  });

  it('Valida la regla de cancelación con mínimo 24 horas de anticipación', () => {
    const ahora = new Date('2026-11-10T10:00:00');
    // Cita en 48 horas -> permitida
    const citaFutura = verificarReglaCancelacion24h('2026-11-12', '10:00', ahora);
    assert.equal(citaFutura.permitido, true);

    // Cita en 6 horas -> rechazada para paciente
    const citaProxima = verificarReglaCancelacion24h('2026-11-10', '16:00', ahora);
    assert.equal(citaProxima.permitido, false);
  });

  it('El Chatbot responde según el rol y exige confirmación antes de modificar el odontograma o cancelar citas', async () => {
    const chatRepo = new MockChatRepository();

    // 1. Visitante pide agendar cita personal -> solicita iniciar sesión
    const respVisitante = await chatRepo.sendMessage(
      'Quiero ver mis citas y mi odontograma',
      { rolActual: 'VISITANTE' }
    );
    assert.ok(respVisitante.texto.toLowerCase().includes('iniciar sesión'));

    // 2. Paciente consulta su odontograma -> devuelve tarjeta MINI_ODONTOGRAMA
    const respPaciente = await chatRepo.sendMessage(
      'Muéstrame mi odontograma',
      { rolActual: 'PACIENTE', pacienteActivoId: 'pac-1' }
    );
    assert.ok(respPaciente.componentes?.some((c) => c.tipo === 'MINI_ODONTOGRAMA'));

    // 3. Dentista solicita modificar diente -> requiere confirmación previa
    const respDentistaPropuesta = await chatRepo.sendMessage(
      'Modificar diente y registrar obturación',
      { rolActual: 'DENTISTA', pacienteActivoId: 'pac-1', dentistaActivoId: 'den-valeria' }
    );
    const accionMod = respDentistaPropuesta.acciones?.find(
      (a) => a.tipo === 'MODIFICAR_ODONTOGRAMA'
    );
    assert.ok(accionMod);
    assert.equal(accionMod.requiereConfirmacion, true);
  });
});
