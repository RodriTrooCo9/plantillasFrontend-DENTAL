import {
  ServicioClinico,
  Dentista,
  Paciente,
  Cita,
  Tratamiento,
  EntradaHistorialClinico,
  Odontograma,
  Diente,
  EstadoDiente,
  SuperficieDental,
} from '@/domain';

export const SERVICIOS_SEMILLA: ServicioClinico[] = [
  {
    id: 'srv-limpieza',
    codigo: 'PREV-01',
    nombre: 'Profilaxis Ultrasónica y Pulido Airflow',
    categoria: 'Prevención',
    descripcionCorta:
      'Remoción indolora de cálculo y biofilm con ultrasonido piezoeléctrico tibio y fluorización.',
    protocoloClinico: 'Tinción de biofilm + ultrasonido EMS + pasta de hidroxiapatita',
    beneficioMedible: 'Elimina el 99% del biofilm subgingival en 45 minutos',
    precioBaseMXN: 1450,
    duracionMinutos: 45,
    garantiaAnios: 1,
  },
  {
    id: 'srv-ortodoncia',
    codigo: 'ORTO-02',
    nombre: 'Ortodoncia Invisible Digital 3D',
    categoria: 'Ortodoncia',
    descripcionCorta:
      'Alineadores transparentes personalizados mediante escaneo intraoral óptico iTero 5D.',
    protocoloClinico: 'Simulación ClinCheck 3D + recambio quincenal de alineadores',
    beneficioMedible: '35% menos tiempo clínico frente a brackets convencionales',
    precioBaseMXN: 42000,
    duracionMinutos: 60,
    garantiaAnios: 5,
  },
  {
    id: 'srv-blanqueamiento',
    codigo: 'ESTE-03',
    nombre: 'Blanqueamiento Dental Fotoactivado LED',
    categoria: 'Estética',
    descripcionCorta:
      'Aclaramiento clínico de baja sensibilidad con barrera gingival y kit ambulatorio nocturno.',
    protocoloClinico: 'Gel peróxido con desensibilizante + lámpara de arco frío',
    beneficioMedible: 'Hasta 6 tonos más claros en escala VITA en 1 sesión',
    precioBaseMXN: 4200,
    duracionMinutos: 50,
    garantiaAnios: 2,
  },
  {
    id: 'srv-endodoncia',
    codigo: 'ENDO-04',
    nombre: 'Endodoncia Microscópica Rotatoria',
    categoria: 'Endodoncia',
    descripcionCorta:
      'Tratamiento de conductos bajo magnificación óptica 25x para conservar piezas con infección o dolor.',
    protocoloClinico: 'Localizador apical electrónico + obturación termoplástica 3D',
    beneficioMedible: 'Alivio inmediato del dolor en una sola sesión de 60 min',
    precioBaseMXN: 5600,
    duracionMinutos: 60,
    garantiaAnios: 5,
  },
  {
    id: 'srv-implantes',
    codigo: 'IMPL-05',
    nombre: 'Implante de Titanio Guiado + Corona Zirconio',
    categoria: 'Implantología',
    descripcionCorta:
      'Rehabilitación fija guiada por tomografía CBCT 3D sin incisiones extensas.',
    protocoloClinico: 'Guía quirúrgica impresa en 3D + corona monolítica CAD/CAM',
    beneficioMedible: '98.6% de tasa de osteointegración documentada a 10 años',
    precioBaseMXN: 24500,
    duracionMinutos: 90,
    garantiaAnios: 10,
  },
  {
    id: 'srv-odontopediatria',
    codigo: 'PEDI-06',
    nombre: 'Odontopediatría Preventiva y Selladores',
    categoria: 'Odontopediatría',
    descripcionCorta:
      'Atención odontológica infantil adaptada con selladores de fosetas y barniz de flúor.',
    protocoloClinico: 'Adaptación conductual + resinas preventivas bioactivas',
    beneficioMedible: '85% de reducción en incidencia de caries en molares permanentes',
    precioBaseMXN: 1200,
    duracionMinutos: 40,
    garantiaAnios: 2,
  },
];

export const DENTISTAS_SEMILLA: Dentista[] = [
  {
    id: 'den-valeria',
    nombreCompleto: 'Dra. Valeria Mendoza',
    email: 'dentista@demo.com',
    cedulaProfesional: 'CED-8492014',
    especialidad: 'Ortodoncia Digital, Rehabilitación y Estética',
    biografiaCorta:
      'Especialista por la UNAM con certificación internacional en alineadores invisibles y diseño digital de sonrisa.',
    diasAtencion: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
    horariosDisponibles: ['09:00', '10:30', '12:00', '16:00', '17:30'],
    bloqueos: [
      {
        id: 'bloq-1',
        dentistaId: 'den-valeria',
        fecha: '2026-11-10',
        horaInicio: '16:00',
        horaFin: '18:00',
        motivo: 'Junta clínica interdisciplinaria de ortodoncia',
      },
    ],
  },
  {
    id: 'den-alejandro',
    nombreCompleto: 'Dr. Alejandro Silva',
    email: 'alejandro.silva@demo.com',
    cedulaProfesional: 'CED-7103948',
    especialidad: 'Implantología Guiada, Cirugía y Endodoncia Microscópica',
    biografiaCorta:
      'Cirujano maxilofacial e implantólogo con más de 1,400 rehabilitaciones asistidas por computadora.',
    diasAtencion: ['Lunes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
    horariosDisponibles: ['09:00', '11:00', '13:00', '16:30', '18:00'],
    bloqueos: [],
  },
];

export const PACIENTES_SEMILLA: Paciente[] = [
  {
    id: 'pac-1',
    codigoExpediente: 'EXP-2026-0842',
    nombreCompleto: 'Lucía Fernández Vega',
    email: 'paciente@demo.com',
    telefono: '+52 55 4182 9012',
    fechaNacimiento: '1995-04-18',
    edad: 31,
    tipoSangre: 'O+',
    alergias: ['Ninguna alergia medicamentosa conocida'],
    alertasMedicas: 'Bruxismo nocturno leve controlado con alineadores.',
    dentistaAsignadoId: 'den-valeria',
    dentistaAsignadoNombre: 'Dra. Valeria Mendoza',
  },
  {
    id: 'pac-2',
    codigoExpediente: 'EXP-2026-1190',
    nombreCompleto: 'Carlos Eduardo Navarro',
    email: 'carlos.navarro@demo.com',
    telefono: '+52 55 8923 1104',
    fechaNacimiento: '1982-08-25',
    edad: 44,
    tipoSangre: 'A+',
    alergias: ['Penicilina', 'Amoxicilina'],
    alertasMedicas: 'Hipertensión controlada con Losartán 50mg. Evitar beta-lactámicos.',
    dentistaAsignadoId: 'den-alejandro',
    dentistaAsignadoNombre: 'Dr. Alejandro Silva',
  },
  {
    id: 'pac-3',
    codigoExpediente: 'EXP-2026-0519',
    nombreCompleto: 'Roberto Méndez Soto',
    email: 'roberto.mendez@demo.com',
    telefono: '+52 55 3391 7740',
    fechaNacimiento: '1988-02-11',
    edad: 38,
    tipoSangre: 'B+',
    alergias: ['Ninguna conocida'],
    alertasMedicas: 'Sin patologías sistémicas. Portador de lentes cerámicos anteriores.',
    dentistaAsignadoId: 'den-valeria',
    dentistaAsignadoNombre: 'Dra. Valeria Mendoza',
  },
  {
    id: 'pac-4',
    codigoExpediente: 'EXP-2026-1402',
    nombreCompleto: 'Sofía Ramírez Luna',
    email: 'sofia.ramirez@demo.com',
    telefono: '+52 55 6712 4490',
    fechaNacimiento: '1999-11-30',
    edad: 26,
    tipoSangre: 'O-',
    alergias: ['Látex (usar guantes de nitrilo)'],
    alertasMedicas: 'Sensibilidad dentinaria moderada en sector premolar inferior.',
    dentistaAsignadoId: 'den-valeria',
    dentistaAsignadoNombre: 'Dra. Valeria Mendoza',
  },
  {
    id: 'pac-5',
    codigoExpediente: 'EXP-2026-1688',
    nombreCompleto: 'Miguel Ángel Torres',
    email: 'miguel.torres@demo.com',
    telefono: '+52 55 2109 8831',
    fechaNacimiento: '1975-06-04',
    edad: 51,
    tipoSangre: 'AB+',
    alergias: ['AINEs (preferir paracetamol)'],
    alertasMedicas: 'Rehabilitación implantológica en cuadrante inferior derecho.',
    dentistaAsignadoId: 'den-alejandro',
    dentistaAsignadoNombre: 'Dr. Alejandro Silva',
  },
];

// Nombres anatómicos para los 32 dientes FDI (11..18, 21..28, 31..38, 41..48)
const NOMBRES_POSICION: Record<number, string> = {
  1: 'Incisivo Central',
  2: 'Incisivo Lateral',
  3: 'Canino',
  4: 'Primer Premolar',
  5: 'Segundo Premolar',
  6: 'Primer Molar',
  7: 'Segundo Molar',
  8: 'Tercer Molar',
};

const ETIQUETA_CUADRANTE: Record<1 | 2 | 3 | 4, string> = {
  1: 'Sup. Der.',
  2: 'Sup. Izq.',
  3: 'Inf. Izq.',
  4: 'Inf. Der.',
};

export const ORDEN_32_DIENTES_FDI: number[] = [
  // Arcada Superior: Cuadrante 1 (18->11) y Cuadrante 2 (21->28)
  18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
  // Arcada Inferior: Cuadrante 4 (48->41) y Cuadrante 3 (31->38)
  48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
];

function crearSuperficiesBase(estado: EstadoDiente = 'SANO'): Record<SuperficieDental, EstadoDiente> {
  return {
    oclusal: estado,
    vestibular: estado,
    lingual: estado,
    mesial: estado,
    distal: estado,
  };
}

export function generar32DientesConOverrides(
  overrides: Partial<
    Record<
      number,
      {
        estadoGeneral: EstadoDiente;
        superficies?: Partial<Record<SuperficieDental, EstadoDiente>>;
        notaClinica: string;
        ultimaActualizacion?: string;
      }
    >
  >
): Diente[] {
  return ORDEN_32_DIENTES_FDI.map((fdi) => {
    const cuadrante = Math.floor(fdi / 10) as 1 | 2 | 3 | 4;
    const posicion = fdi % 10;
    const nombreAnatomico = `${NOMBRES_POSICION[posicion]} ${ETIQUETA_CUADRANTE[cuadrante]}`;
    const custom = overrides[fdi];

    const estadoGeneral = custom?.estadoGeneral || 'SANO';
    const baseSup = crearSuperficiesBase(
      estadoGeneral === 'CORONA' || estadoGeneral === 'AUSENTE' || estadoGeneral === 'IMPLANTE'
        ? estadoGeneral
        : 'SANO'
    );

    if (custom?.superficies) {
      Object.assign(baseSup, custom.superficies);
    } else if (estadoGeneral === 'CARIES' || estadoGeneral === 'OBTURADO') {
      baseSup.oclusal = estadoGeneral;
    }

    return {
      numeroFDI: fdi,
      nombreAnatomico,
      cuadrante,
      estadoGeneral,
      superficies: baseSup,
      ultimaActualizacion: custom?.ultimaActualizacion || '2026-10-15',
      notaClinica:
        custom?.notaClinica ||
        'Esmalte y periodonto íntegros sin hallazgos patológicos.',
    };
  });
}

export const ODONTOGRAMAS_SEMILLA: Record<string, Odontograma> = {
  'pac-1': {
    pacienteId: 'pac-1',
    actualizadoEn: '2026-10-28',
    dientes: generar32DientesConOverrides({
      18: {
        estadoGeneral: 'AUSENTE',
        notaClinica: 'Tercer molar extraído quirúrgicamente en 2023.',
      },
      16: {
        estadoGeneral: 'CARIES',
        superficies: {oclusal: 'CARIES', mesial: 'OBTURADO'},
        notaClinica: 'Lesión cariosa en fosa oclusal; programada resina.',
        ultimaActualizacion: '2026-10-28',
      },
      12: {
        estadoGeneral: 'CORONA',
        notaClinica: 'Carilla cerámica de disilicato cementada en 2025.',
      },
      24: {
        estadoGeneral: 'OBTURADO',
        superficies: {oclusal: 'OBTURADO', distal: 'OBTURADO'},
        notaClinica: 'Resina compuesta nano-híbrida en buen estado.',
      },
      28: {
        estadoGeneral: 'AUSENTE',
        notaClinica: 'Agenesia de tercer molar superior izquierdo.',
      },
      36: {
        estadoGeneral: 'ENDODONCIA',
        superficies: {oclusal: 'OBTURADO'},
        notaClinica: 'Conductos obturados sin lesión periapical.',
      },
      46: {
        estadoGeneral: 'IMPLANTE',
        notaClinica: 'Implante de titanio osteointegrado con corona de zirconio.',
        ultimaActualizacion: '2026-08-12',
      },
    }),
    historialCambios: [
      {
        id: 'aud-1',
        pacienteId: 'pac-1',
        numeroFDI: 16,
        superficie: 'oclusal',
        estadoAnterior: 'OBTURADO',
        estadoNuevo: 'CARIES',
        procedimiento: 'Diagnóstico con cámara intraoral',
        nota: 'Se detecta filtración marginal en resina antigua de pieza #16.',
        autorNombre: 'Dra. Valeria Mendoza',
        autorRol: 'DENTISTA',
        fechaHora: '2026-10-28 11:20',
      },
      {
        id: 'aud-2',
        pacienteId: 'pac-1',
        numeroFDI: 46,
        superficie: 'GENERAL',
        estadoAnterior: 'AUSENTE',
        estadoNuevo: 'IMPLANTE',
        procedimiento: 'Rehabilitación definitiva sobre implante',
        nota: 'Torque a 35 Ncm y verificación oclusal de corona de zirconio.',
        autorNombre: 'Dr. Alejandro Silva',
        autorRol: 'DENTISTA',
        fechaHora: '2026-08-12 17:05',
      },
    ],
  },
  'pac-2': {
    pacienteId: 'pac-2',
    actualizadoEn: '2026-10-22',
    dientes: generar32DientesConOverrides({
      16: {
        estadoGeneral: 'CORONA',
        notaClinica: 'Incrustación onlay cerámica funcional.',
      },
      24: {
        estadoGeneral: 'ENDODONCIA',
        superficies: {oclusal: 'ENDODONCIA'},
        notaClinica: 'Endodoncia microscópica finalizada; pendiente incrustación.',
        ultimaActualizacion: '2026-10-22',
      },
      26: {
        estadoGeneral: 'CARIES',
        superficies: {mesial: 'CARIES'},
        notaClinica: 'Caries interproximal incipiente detectada en radiografía.',
      },
      46: {
        estadoGeneral: 'OBTURADO',
        superficies: {oclusal: 'OBTURADO'},
        notaClinica: 'Restauración oclusal sellada.',
      },
    }),
    historialCambios: [
      {
        id: 'aud-3',
        pacienteId: 'pac-2',
        numeroFDI: 24,
        superficie: 'oclusal',
        estadoAnterior: 'CARIES',
        estadoNuevo: 'ENDODONCIA',
        procedimiento: 'Endodoncia rotatoria bajo microscopio',
        nota: 'Obturación tridimensional de conducto único sin dolor post-operatorio.',
        autorNombre: 'Dr. Alejandro Silva',
        autorRol: 'DENTISTA',
        fechaHora: '2026-10-22 13:15',
      },
    ],
  },
  'pac-3': {
    pacienteId: 'pac-3',
    actualizadoEn: '2026-10-05',
    dientes: generar32DientesConOverrides({
      12: {estadoGeneral: 'CORONA', notaClinica: 'Lente cerámico disilicato BL3.'},
      11: {estadoGeneral: 'CORONA', notaClinica: 'Lente cerámico disilicato BL3.'},
      21: {estadoGeneral: 'CORONA', notaClinica: 'Lente cerámico disilicato BL3.'},
      22: {estadoGeneral: 'CORONA', notaClinica: 'Lente cerámico disilicato BL3.'},
    }),
    historialCambios: [],
  },
  'pac-4': {
    pacienteId: 'pac-4',
    actualizadoEn: '2026-10-19',
    dientes: generar32DientesConOverrides({
      35: {
        estadoGeneral: 'CARIES',
        superficies: {vestibular: 'CARIES'},
        notaClinica: 'Lesión cervical no cariosa + desmineralización vestibular.',
      },
      45: {
        estadoGeneral: 'OBTURADO',
        superficies: {vestibular: 'OBTURADO'},
        notaClinica: 'Ionómero de vidrio modificado con resina en cuello dental.',
      },
    }),
    historialCambios: [],
  },
  'pac-5': {
    pacienteId: 'pac-5',
    actualizadoEn: '2026-10-11',
    dientes: generar32DientesConOverrides({
      46: {estadoGeneral: 'IMPLANTE', notaClinica: 'Implante guiado osteointegrado.'},
      47: {estadoGeneral: 'IMPLANTE', notaClinica: 'Implante guiado osteointegrado.'},
      17: {estadoGeneral: 'CORONA', notaClinica: 'Corona metal-porcelana antigua estable.'},
    }),
    historialCambios: [],
  },
};

export const CITAS_SEMILLA: Cita[] = [
  {
    id: 'cit-101',
    pacienteId: 'pac-1',
    pacienteNombre: 'Lucía Fernández Vega',
    dentistaId: 'den-valeria',
    dentistaNombre: 'Dra. Valeria Mendoza',
    servicioId: 'srv-ortodoncia',
    servicioNombre: 'Ortodoncia Invisible Digital 3D',
    tratamientoId: 'trt-1',
    fecha: '2026-11-10',
    hora: '10:30',
    estado: 'CONFIRMADA',
    motivoConsulta: 'Entrega de juegos de alineadores #10 al #12 y control de ataches.',
    costoMXN: 3500,
  },
  {
    id: 'cit-102',
    pacienteId: 'pac-1',
    pacienteNombre: 'Lucía Fernández Vega',
    dentistaId: 'den-valeria',
    dentistaNombre: 'Dra. Valeria Mendoza',
    servicioId: 'srv-blanqueamiento',
    servicioNombre: 'Blanqueamiento Dental Fotoactivado LED',
    fecha: '2026-11-24',
    hora: '16:00',
    estado: 'CONFIRMADA',
    motivoConsulta: 'Sesión de aclaramiento fotoactivado previo a fin de tratamiento.',
    costoMXN: 4200,
  },
  {
    id: 'cit-103',
    pacienteId: 'pac-1',
    pacienteNombre: 'Lucía Fernández Vega',
    dentistaId: 'den-alejandro',
    dentistaNombre: 'Dr. Alejandro Silva',
    servicioId: 'srv-implantes',
    servicioNombre: 'Implante de Titanio Guiado + Corona Zirconio',
    tratamientoId: 'trt-2',
    fecha: '2026-08-12',
    hora: '12:00',
    estado: 'COMPLETADA',
    motivoConsulta: 'Colocación definitiva de corona de zirconio sobre implante #46.',
    costoMXN: 24500,
  },
  {
    id: 'cit-104',
    pacienteId: 'pac-2',
    pacienteNombre: 'Carlos Eduardo Navarro',
    dentistaId: 'den-alejandro',
    dentistaNombre: 'Dr. Alejandro Silva',
    servicioId: 'srv-endodoncia',
    servicioNombre: 'Endodoncia Microscópica Rotatoria',
    tratamientoId: 'trt-3',
    fecha: '2026-11-10',
    hora: '11:00',
    estado: 'CONFIRMADA',
    motivoConsulta: 'Reconstrucción post-endodóntica en premolar superior #24.',
    costoMXN: 5600,
  },
  {
    id: 'cit-105',
    pacienteId: 'pac-3',
    pacienteNombre: 'Roberto Méndez Soto',
    dentistaId: 'den-valeria',
    dentistaNombre: 'Dra. Valeria Mendoza',
    servicioId: 'srv-limpieza',
    servicioNombre: 'Profilaxis Ultrasónica y Pulido Airflow',
    fecha: '2026-11-10',
    hora: '12:00',
    estado: 'EN_SALA',
    motivoConsulta: 'Mantenimiento semestral de carillas cerámicas con Airflow.',
    costoMXN: 1450,
  },
];

export const TRATAMIENTOS_SEMILLA: Tratamiento[] = [
  {
    id: 'trt-1',
    pacienteId: 'pac-1',
    dentistaId: 'den-valeria',
    dentistaNombre: 'Dra. Valeria Mendoza',
    servicioId: 'srv-ortodoncia',
    nombre: 'Ortodoncia Invisible Digital 3D (Arcada Dual)',
    estado: 'EN_CURSO',
    fechaInicio: '2026-05-15',
    progresoPorcentaje: 75,
    sesionesCompletadas: 9,
    sesionesTotales: 12,
    costoTotalMXN: 42000,
    dientesFDI: [11, 12, 13, 21, 22, 23],
    proximaFechaSugerida: '2026-11-10',
    notasEvolucion: 'Alineación anterior completada al 85%. Excelente colaboración.',
  },
  {
    id: 'trt-2',
    pacienteId: 'pac-1',
    dentistaId: 'den-alejandro',
    dentistaNombre: 'Dr. Alejandro Silva',
    servicioId: 'srv-implantes',
    nombre: 'Rehabilitación sobre Implante de Titanio (#46)',
    estado: 'FINALIZADO',
    fechaInicio: '2026-03-10',
    progresoPorcentaje: 100,
    sesionesCompletadas: 3,
    sesionesTotales: 3,
    costoTotalMXN: 24500,
    dientesFDI: [46],
    proximaFechaSugerida: '2027-08-12',
    notasEvolucion: 'Corona de zirconio cementada con éxito. Control anual.',
  },
  {
    id: 'trt-3',
    pacienteId: 'pac-1',
    dentistaId: 'den-valeria',
    dentistaNombre: 'Dra. Valeria Mendoza',
    servicioId: 'srv-blanqueamiento',
    nombre: 'Resina Estética Oclusal (#16) + Aclaramiento LED',
    estado: 'PLANIFICADO',
    fechaInicio: '2026-11-24',
    progresoPorcentaje: 10,
    sesionesCompletadas: 0,
    sesionesTotales: 2,
    costoTotalMXN: 5800,
    dientesFDI: [16, 11, 21],
    proximaFechaSugerida: '2026-11-24',
    notasEvolucion: 'Recambio de resina filtrada en #16 seguido de aclaramiento.',
  },
  {
    id: 'trt-4',
    pacienteId: 'pac-2',
    dentistaId: 'den-alejandro',
    dentistaNombre: 'Dr. Alejandro Silva',
    servicioId: 'srv-endodoncia',
    nombre: 'Endodoncia Microscópica y Corona Cerámica (#24)',
    estado: 'EN_CURSO',
    fechaInicio: '2026-10-22',
    progresoPorcentaje: 60,
    completedSessions: 1,
    sesionesCompletadas: 1,
    sesionesTotales: 2,
    costoTotalMXN: 9800,
    dientesFDI: [24],
    proximaFechaSugerida: '2026-11-10',
    notasEvolucion: 'Conducto obturado; siguiente sesión cementación de incrustación.',
  } as Tratamiento,
];

export const HISTORIAL_SEMILLA: EntradaHistorialClinico[] = [
  {
    id: 'his-1',
    pacienteId: 'pac-1',
    fecha: '2026-10-28',
    dentistaId: 'den-valeria',
    dentistaNombre: 'Dra. Valeria Mendoza',
    tipo: 'DIAGNOSTICO',
    diagnostico: 'Filtración marginal en resina oclusal de primer molar superior derecho (#16).',
    procedimientoRealizado: 'Inspección con cámara intraoral y escaneo iTero 5D.',
    notasClinicas:
      'Paciente asintomática. Se programa recambio de resina en #16 y entrega de alineadores #10-#12.',
  },
  {
    id: 'his-2',
    pacienteId: 'pac-1',
    fecha: '2026-08-12',
    dentistaId: 'den-alejandro',
    dentistaNombre: 'Dr. Alejandro Silva',
    tipo: 'PROCEDIMIENTO',
    diagnostico: 'Edentulismo parcial unitario en zona de molar #46 rehabilitado con implante.',
    procedimientoRealizado: 'Torque protésico a 35 Ncm de corona monolítica de zirconio en #46.',
    notasClinicas:
      'Radiografía periapical de control muestra ajuste pasivo y cresta ósea estable.',
  },
  {
    id: 'his-3',
    pacienteId: 'pac-1',
    fecha: '2026-05-15',
    dentistaId: 'den-valeria',
    dentistaNombre: 'Dra. Valeria Mendoza',
    tipo: 'CONSULTA',
    diagnostico: 'Maloclusión Clase I con apiñamiento leve anterior superior e inferior.',
    procedimientoRealizado: 'Colocación de ataches ópticos y entrega de alineadores etapa 1.',
    notasClinicas: 'Se instruye uso de 22 horas diarias e higiene interproximal.',
  },
  {
    id: 'his-4',
    pacienteId: 'pac-2',
    fecha: '2026-10-22',
    dentistaId: 'den-alejandro',
    dentistaNombre: 'Dr. Alejandro Silva',
    tipo: 'PROCEDIMIENTO',
    diagnostico: 'Pulpitis irreversible sintomática en primer premolar superior izquierdo (#24).',
    procedimientoRealizado: 'Endodoncia rotatoria bajo microscopio óptico 25x y obturación 3D.',
    notasClinicas:
      'Paciente alérgico a penicilina; se maneja analgesia antiinflamatoria sin antibiótico beta-lactámico.',
  },
];
