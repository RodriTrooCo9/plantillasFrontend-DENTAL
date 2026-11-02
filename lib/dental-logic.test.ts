import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DENTAL_SERVICES,
  PATIENTS_DIRECTORY,
  INITIAL_APPOINTMENTS,
  filterDentalServices,
  calculateTreatmentBudget,
  validateAuthCredentials,
  validateBookingInput,
  cycleToothCondition,
  buildClinicalAssistantResponse,
} from './dental-logic';

test('filterDentalServices filters by category and search query accurately', () => {
  const all = filterDentalServices(DENTAL_SERVICES, 'todos', '');
  assert.equal(all.length, 6);

  const estetica = filterDentalServices(DENTAL_SERVICES, 'estetica', '');
  assert.equal(estetica.length, 2);

  const searchZirconio = filterDentalServices(DENTAL_SERVICES, 'todos', 'zirconio');
  assert.equal(searchZirconio.length, 1);
  assert.equal(searchZirconio[0].id, 'srv-implante-zirconio');
});

test('calculateTreatmentBudget computes multi-service bundle and insurance discounts', () => {
  const single = calculateTreatmentBudget(DENTAL_SERVICES, ['srv-profilaxis-airflow'], 3, false);
  assert.equal(single.subtotalMXN, 1450);
  assert.equal(single.discountMXN, 0);
  assert.equal(single.totalMXN, 1450);

  const bundle = calculateTreatmentBudget(
    DENTAL_SERVICES,
    ['srv-profilaxis-airflow', 'srv-blanqueamiento-led'],
    6,
    false
  );
  assert.equal(bundle.subtotalMXN, 5650);
  assert.equal(bundle.discountMXN, 452);
  assert.equal(bundle.totalMXN, 5198);
  assert.equal(bundle.totalDurationMinutes, 95);
});

test('validateAuthCredentials enforces valid email, password length, and registration fields', () => {
  const emptyLogin = validateAuthCredentials({
    email: '',
    password: '123',
    role: 'paciente',
    mode: 'login',
  });
  assert.equal(emptyLogin.valid, false);
  assert.ok(emptyLogin.errors.email);
  assert.ok(emptyLogin.errors.password);

  const validLogin = validateAuthCredentials({
    email: 'lucia.fernandez@ejemplo.mx',
    password: 'password123',
    role: 'paciente',
    mode: 'login',
  });
  assert.equal(validLogin.valid, true);
});

test('validateBookingInput rejects missing fields and accepts complete booking', () => {
  const bad = validateBookingInput({
    patientName: 'Ana',
    patientEmail: 'correo-invalido',
    patientPhone: '5512345678',
    serviceId: 'srv-ortodoncia-3d',
    date: '2026-11-10',
    time: '11:00',
  });
  assert.equal(bad.valid, false);

  const good = validateBookingInput({
    patientName: 'Ana Sofía Gómez',
    patientEmail: 'ana.gomez@ejemplo.mx',
    patientPhone: '+52 55 1234 5678',
    serviceId: 'srv-ortodoncia-3d',
    date: '2026-11-10',
    time: '11:00',
  });
  assert.equal(good.valid, true);
});

test('cycleToothCondition transitions sequentially through clinical states', () => {
  assert.equal(cycleToothCondition('Sano'), 'Resina programada');
  assert.equal(cycleToothCondition('Resina programada'), 'Corona cerámica');
  assert.equal(cycleToothCondition('Corona cerámica'), 'Implante titanio');
  assert.equal(cycleToothCondition('Implante titanio'), 'Endodoncia previa');
  assert.equal(cycleToothCondition('Endodoncia previa'), 'Revisión prioritaria');
  assert.equal(cycleToothCondition('Revisión prioritaria'), 'Sano');
});

test('each patient in PATIENTS_DIRECTORY has an independent odontogram, medical history, and treatments', () => {
  assert.equal(PATIENTS_DIRECTORY.length, 3);
  const [lucia, carlos, roberto] = PATIENTS_DIRECTORY;

  assert.notEqual(lucia.patientCode, carlos.patientCode);
  assert.notEqual(carlos.patientCode, roberto.patientCode);

  // Verify distinct odontograms per patient
  const luciaTooth46 = lucia.odontogram.find((t) => t.toothNumber === 46);
  const carlosTooth24 = carlos.odontogram.find((t) => t.toothNumber === 24);
  assert.equal(luciaTooth46?.condition, 'Implante titanio');
  assert.equal(carlosTooth24?.condition, 'Endodoncia previa');
});

test('buildClinicalAssistantResponse answers accurately about medical history, appointments, treatments, and odontogram', () => {
  const carlos = PATIENTS_DIRECTORY[1];
  const carlosAppts = INITIAL_APPOINTMENTS.filter((a) => a.patientId === carlos.id);

  const histRes = buildClinicalAssistantResponse('Revisar mi historial médico y alergias', carlos, carlosAppts);
  assert.equal(histRes.suggestedTab, 'historial');
  assert.ok(histRes.reply.includes('penicilina'));

  const citasRes = buildClinicalAssistantResponse('¿Cuáles son mis citas programadas?', carlos, carlosAppts);
  assert.equal(citasRes.suggestedTab, 'citas');
  assert.ok(citasRes.reply.includes('Profilaxis Ultrasónica'));

  const trtRes = buildClinicalAssistantResponse('Ver mis tratamientos', carlos, carlosAppts);
  assert.equal(trtRes.suggestedTab, 'tratamientos');
  assert.ok(trtRes.reply.includes('Endodoncia Microscópica'));

  const odoRes = buildClinicalAssistantResponse('Resumen de mi odontograma', carlos, carlosAppts);
  assert.equal(odoRes.suggestedTab, 'odontograma');
  assert.ok(odoRes.reply.includes('#24'));
});
