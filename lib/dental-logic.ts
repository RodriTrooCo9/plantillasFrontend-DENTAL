export type ServiceCategory =
  | 'todos'
  | 'ortodoncia'
  | 'implantes'
  | 'estetica'
  | 'prevencion'
  | 'endodoncia';

export interface DentalService {
  id: string;
  indexNumber: string;
  name: string;
  category: Exclude<ServiceCategory, 'todos'>;
  categoryLabel: string;
  shortDescription: string;
  clinicalMechanism: string;
  measurableOutcome: string;
  priceMXN: number;
  durationMinutes: number;
  sessionsCount: string;
  warrantyYears: number;
  specialistName: string;
  specialistRole: string;
  featured?: boolean;
  visualType:
    | 'orthodontics'
    | 'implants'
    | 'aesthetics'
    | 'endodontics'
    | 'prevention'
    | 'periodontics';
}

export type UserRole = 'paciente' | 'especialista';

export interface UserSession {
  id: string;
  patientId: string;
  fullName: string;
  email: string;
  role: UserRole;
  patientCode: string;
  phone: string;
  nextCheckupDate: string;
  assignedDoctor: string;
}

export interface AppointmentRecord {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  serviceId: string;
  serviceName: string;
  specialistName: string;
  date: string;
  time: string;
  status: 'Confirmada' | 'En sala' | 'Completada' | 'Reprogramada';
  notes: string;
  priceMXN: number;
}

export type ToothCondition =
  | 'Sano'
  | 'Resina programada'
  | 'Corona cerámica'
  | 'Implante titanio'
  | 'Endodoncia previa'
  | 'Revisión prioritaria';

export interface ToothRecord {
  toothNumber: number;
  quadrant: 'Sup. Derecho' | 'Sup. Izquierdo' | 'Inf. Izquierdo' | 'Inf. Derecho';
  name: string;
  condition: ToothCondition;
  lastUpdated: string;
  clinicalNote: string;
}

export interface MedicalHistoryEntry {
  id: string;
  date: string;
  title: string;
  category: 'Antecedente Sistémico' | 'Diagnóstico Radiográfico' | 'Procedimiento Clínico' | 'Control Periodontal';
  specialistName: string;
  summary: string;
  vitalObservations: string;
}

export interface PatientTreatmentPlan {
  id: string;
  serviceId: string;
  treatmentName: string;
  specialistName: string;
  startDate: string;
  status: 'En curso' | 'Completado' | 'Programado';
  progressPercent: number;
  completedSessions: number;
  totalSessions: number;
  toothNumbers: number[];
  nextStepDescription: string;
  totalCostMXN: number;
}

export interface PatientClinicalProfile {
  id: string;
  fullName: string;
  email: string;
  patientCode: string;
  phone: string;
  age: number;
  bloodType: string;
  allergies: string;
  systemicNotes: string;
  assignedDoctor: string;
  nextCheckupDate: string;
  medicalHistory: MedicalHistoryEntry[];
  treatments: PatientTreatmentPlan[];
  odontogram: ToothRecord[];
}

export interface LoginValidationInput {
  email: string;
  password: string;
  role: UserRole;
  mode: 'login' | 'registro';
  fullName?: string;
  phone?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: {
    email?: string;
    password?: string;
    fullName?: string;
    phone?: string;
  };
}

export interface BookingInput {
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  serviceId: string;
  date: string;
  time: string;
  notes?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestedTab?: 'citas' | 'historial' | 'tratamientos' | 'odontograma' | 'servicios';
}

export const DENTAL_SERVICES: DentalService[] = [
  {
    id: 'srv-ortodoncia-3d',
    indexNumber: '01',
    name: 'Ortodoncia Invisible Digital 3D',
    category: 'ortodoncia',
    categoryLabel: 'Ortodoncia',
    shortDescription:
      'Alineadores transparentes termoformados a medida mediante escaneo intraoral óptico sin pastas ni moldes incómodos.',
    clinicalMechanism:
      'Escáner iTero 5D + secuencia de alineadores biocompatibles con recambio quincenal',
    measurableOutcome:
      'Reducción del 35% en tiempo de alineación frente a brackets convencionales',
    priceMXN: 42000,
    durationMinutes: 60,
    sessionsCount: 'Valoración + 12 controles',
    warrantyYears: 5,
    specialistName: 'Dra. Valeria Mendoza',
    specialistRole: 'Especialista en Ortodoncia y Ortopedia Maxilar',
    featured: true,
    visualType: 'orthodontics',
  },
  {
    id: 'srv-implante-zirconio',
    indexNumber: '02',
    name: 'Implantología Guiada y Corona de Zirconio',
    category: 'implantes',
    categoryLabel: 'Implantes y Cirugía',
    shortDescription:
      'Rehabilitación fija con implante de titanio grado médico guiado por tomografía CBCT y corona monolítica.',
    clinicalMechanism:
      'Guía quirúrgica impresa en 3D sin incisiones extensas + osteointegración acelerada',
    measurableOutcome: '98.6% de tasa de éxito clínico documentada a 10 años',
    priceMXN: 24500,
    durationMinutes: 90,
    sessionsCount: '3 sesiones clínicas',
    warrantyYears: 10,
    specialistName: 'Dr. Alejandro Silva',
    specialistRole: 'Cirujano Maxilofacial e Implantólogo',
    featured: true,
    visualType: 'implants',
  },
  {
    id: 'srv-diseno-sonrisa',
    indexNumber: '03',
    name: 'Diseño de Sonrisa con Lentes Cerámicos',
    category: 'estetica',
    categoryLabel: 'Estética Dental',
    shortDescription:
      'Microcarillas de disilicato de litio de 0.3 mm diseñadas digitalmente según la proporción áurea facial.',
    clinicalMechanism:
      'Mock-up físico de prueba en primera cita antes de tocar el esmalte dental',
    measurableOutcome:
      'Estabilidad de color y brillo natural por más de 12 años sin pigmentación',
    priceMXN: 8800,
    durationMinutes: 75,
    sessionsCount: '2 sesiones por arcada',
    warrantyYears: 8,
    specialistName: 'Dra. Camila Herrera',
    specialistRole: 'Rehabilitadora Oral y Estética Dental',
    featured: true,
    visualType: 'aesthetics',
  },
  {
    id: 'srv-blanqueamiento-led',
    indexNumber: '04',
    name: 'Aclaramiento Dental Fotoactivado + Kit Ambulatorio',
    category: 'estetica',
    categoryLabel: 'Estética Dental',
    shortDescription:
      'Protocolo combinado de baja sensibilidad con barrera gingival protectora y gel remineralizante con hidroxiapatita.',
    clinicalMechanism:
      'Lámpara de arco frío + férulas nocturnas personalizadas de refuerzo',
    measurableOutcome:
      'Hasta 6 tonos más claros en la escala VITA en una sola visita de 50 minutos',
    priceMXN: 4200,
    durationMinutes: 50,
    sessionsCount: '1 sesión en clínica',
    warrantyYears: 2,
    specialistName: 'Dra. Camila Herrera',
    specialistRole: 'Rehabilitadora Oral y Estética Dental',
    visualType: 'aesthetics',
  },
  {
    id: 'srv-endodoncia-microscopica',
    indexNumber: '05',
    name: 'Endodoncia Microscópica Rotatoria',
    category: 'endodoncia',
    categoryLabel: 'Endodoncia',
    shortDescription:
      'Tratamiento de conductos de alta precisión con magnificación óptica 25x para salvar piezas con dolor agudo.',
    clinicalMechanism:
      'Localización apical electrónica + obturación termoplástica tridimensional',
    measurableOutcome:
      'Alivio inmediato del dolor en 1 sesión de 60 minutos con anestesia computarizada',
    priceMXN: 5600,
    durationMinutes: 60,
    sessionsCount: '1 sesión única',
    warrantyYears: 5,
    specialistName: 'Dr. Mateo Ríos',
    specialistRole: 'Especialista en Endodoncia Microscópica',
    visualType: 'endodontics',
  },
  {
    id: 'srv-profilaxis-airflow',
    indexNumber: '06',
    name: 'Profilaxis Ultrasónica Guiada por Biofilm',
    category: 'prevencion',
    categoryLabel: 'Prevención y Periodoncia',
    shortDescription:
      'Limpieza profunda indolora con tecnología de eritritol templado, detección de placa por tinción y fluorización.',
    clinicalMechanism:
      'Ultrasonido piezoeléctrico con agua tibia + diagnóstico radiográfico digital',
    measurableOutcome:
      'Eliminación del 99% del biofilm subgingival sin desgaste del esmalte',
    priceMXN: 1450,
    durationMinutes: 45,
    sessionsCount: '1 sesión semestral',
    warrantyYears: 1,
    specialistName: 'Dra. Sofía Domínguez',
    specialistRole: 'Periodoncista e Higienista Clínica',
    visualType: 'prevention',
  },
];

export const PATIENTS_DIRECTORY: PatientClinicalProfile[] = [
  {
    id: 'pat-lucia',
    fullName: 'Lucía Fernández Vega',
    email: 'lucia.fernandez@ejemplo.mx',
    patientCode: 'EXP-2026-0842',
    phone: '+52 55 4182 9012',
    age: 31,
    bloodType: 'O+',
    allergies: 'Ninguna alergia medicamentosa conocida',
    systemicNotes: 'Bruxismo nocturno leve controlado con alineadores; presión arterial 110/70 mmHg.',
    assignedDoctor: 'Dra. Valeria Mendoza',
    nextCheckupDate: '05 Nov 2026 · 10:30 hrs',
    medicalHistory: [
      {
        id: 'mh-lucia-1',
        date: '2026-10-14',
        title: 'Control de Ortodoncia Invisible #4 y Escaneo iTero',
        category: 'Procedimiento Clínico',
        specialistName: 'Dra. Valeria Mendoza',
        summary:
          'Se verificó ajuste de alineadores superiores e inferiores. Movimiento radicular en sector anterior superior al 78% de lo planificado.',
        vitalObservations: 'Encías sin inflamación, excelente higiene interproximal.',
      },
      {
        id: 'mh-lucia-2',
        date: '2026-08-12',
        title: 'Rehabilitación de Corona sobre Implante en Molar #46',
        category: 'Procedimiento Clínico',
        specialistName: 'Dr. Alejandro Silva',
        summary:
          'Colocación definitiva de corona monolítica de zirconio sobre implante de titanio en primer molar inferior derecho (#46) con torque de 35 Ncm.',
        vitalObservations: 'Radiografía periapical confirma sellado marginal hermético.',
      },
      {
        id: 'mh-lucia-3',
        date: '2026-05-03',
        title: 'Valoración Inicial, Tomografía CBCT y Apertura de Expediente',
        category: 'Diagnóstico Radiográfico',
        specialistName: 'Dra. Valeria Mendoza',
        summary:
          'Tomografía volumétrica de haz cónico sin hallazgos patológicos en senos maxilares. Apiñamiento leve anterior y filtración marginal en resina de pieza #16.',
        vitalObservations: 'Sin antecedentes sistémicos de riesgo; anestesia con articaína bien tolerada.',
      },
    ],
    treatments: [
      {
        id: 'trt-lucia-1',
        serviceId: 'srv-ortodoncia-3d',
        treatmentName: 'Ortodoncia Invisible Digital 3D (Arcada Completa)',
        specialistName: 'Dra. Valeria Mendoza',
        startDate: '2026-05-15',
        status: 'En curso',
        progressPercent: 75,
        completedSessions: 9,
        totalSessions: 12,
        toothNumbers: [11, 12, 14, 21, 22, 24],
        nextStepDescription: 'Entrega de juegos de alineadores #10 a #12 el 05 de noviembre.',
        totalCostMXN: 42000,
      },
      {
        id: 'trt-lucia-2',
        serviceId: 'srv-blanqueamiento-led',
        treatmentName: 'Aclaramiento Dental Fotoactivado + Refuerzo',
        specialistName: 'Dra. Camila Herrera',
        startDate: '2026-11-18',
        status: 'Programado',
        progressPercent: 15,
        completedSessions: 0,
        totalSessions: 1,
        toothNumbers: [11, 12, 21, 22],
        nextStepDescription: 'Sesión fotoactivada programada para el 18 de noviembre a las 16:00 hrs.',
        totalCostMXN: 4200,
      },
      {
        id: 'trt-lucia-3',
        serviceId: 'srv-implante-zirconio',
        treatmentName: 'Implante Guiado y Corona de Zirconio (#46)',
        specialistName: 'Dr. Alejandro Silva',
        startDate: '2026-03-10',
        status: 'Completado',
        progressPercent: 100,
        completedSessions: 3,
        totalSessions: 3,
        toothNumbers: [46],
        nextStepDescription: 'Alta protésica completada; revisión radiográfica anual en agosto 2027.',
        totalCostMXN: 24500,
      },
    ],
    odontogram: [
      {
        toothNumber: 18,
        quadrant: 'Sup. Derecho',
        name: 'Tercer Molar Sup. Der.',
        condition: 'Sano',
        lastUpdated: '2026-10-14',
        clinicalNote: 'Ausente / extraído previamente sin secuelas.',
      },
      {
        toothNumber: 16,
        quadrant: 'Sup. Derecho',
        name: 'Primer Molar Sup. Der.',
        condition: 'Resina programada',
        lastUpdated: '2026-10-28',
        clinicalNote: 'Filtración marginal leve en resina oclusal; programado recambio estético.',
      },
      {
        toothNumber: 14,
        quadrant: 'Sup. Derecho',
        name: 'Primer Premolar Sup. Der.',
        condition: 'Sano',
        lastUpdated: '2026-10-14',
        clinicalNote: 'Atache de ortodoncia activo en cara vestibular.',
      },
      {
        toothNumber: 12,
        quadrant: 'Sup. Derecho',
        name: 'Incisivo Lateral Sup. Der.',
        condition: 'Corona cerámica',
        lastUpdated: '2026-09-20',
        clinicalNote: 'Lente cerámico de disilicato cementado en óptimas condiciones.',
      },
      {
        toothNumber: 11,
        quadrant: 'Sup. Derecho',
        name: 'Incisivo Central Sup. Der.',
        condition: 'Sano',
        lastUpdated: '2026-10-14',
        clinicalNote: 'Esmalte íntegro, sin movilidad ni sensibilidad térmica.',
      },
      {
        toothNumber: 21,
        quadrant: 'Sup. Izquierdo',
        name: 'Incisivo Central Sup. Izq.',
        condition: 'Sano',
        lastUpdated: '2026-10-14',
        clinicalNote: 'Alineación completada al 95% según plan digital.',
      },
      {
        toothNumber: 22,
        quadrant: 'Sup. Izquierdo',
        name: 'Incisivo Lateral Sup. Izq.',
        condition: 'Sano',
        lastUpdated: '2026-10-14',
        clinicalNote: 'Respuesta pulpar normal, bordes incisales armónicos.',
      },
      {
        toothNumber: 24,
        quadrant: 'Sup. Izquierdo',
        name: 'Primer Premolar Sup. Izq.',
        condition: 'Sano',
        lastUpdated: '2026-10-14',
        clinicalNote: 'Encía adherida saludable, sondeo periodontal de 2 mm.',
      },
      {
        toothNumber: 26,
        quadrant: 'Sup. Izquierdo',
        name: 'Primer Molar Sup. Izq.',
        condition: 'Sano',
        lastUpdated: '2026-10-14',
        clinicalNote: 'Sellador de fosetas y fisuras intacto.',
      },
      {
        toothNumber: 36,
        quadrant: 'Inf. Izquierdo',
        name: 'Primer Molar Inf. Izq.',
        condition: 'Revisión prioritaria',
        lastUpdated: '2026-11-01',
        clinicalNote: 'Sensibilidad leve al frío reportada; valorar cuello gingival en cita del 05 Nov.',
      },
      {
        toothNumber: 34,
        quadrant: 'Inf. Izquierdo',
        name: 'Primer Premolar Inf. Izq.',
        condition: 'Sano',
        lastUpdated: '2026-10-14',
        clinicalNote: 'Sin cálculo subgingival, tejido periodontal sano.',
      },
      {
        toothNumber: 46,
        quadrant: 'Inf. Derecho',
        name: 'Primer Molar Inf. Der.',
        condition: 'Implante titanio',
        lastUpdated: '2026-08-12',
        clinicalNote: 'Implante osteointegrado con corona de zirconio monolítico (#46).',
      },
    ],
  },
  {
    id: 'pat-carlos',
    fullName: 'Carlos Eduardo Navarro',
    email: 'c.navarro@ejemplo.mx',
    patientCode: 'EXP-2026-1190',
    phone: '+52 55 8923 1104',
    age: 44,
    bloodType: 'A+',
    allergies: 'Alergia a penicilina (usar clindamicina o azitromicina si requiere profilaxis)',
    systemicNotes: 'Hipertensión arterial controlada con losartán 50 mg/día. Sin sangrado anormal.',
    assignedDoctor: 'Dr. Mateo Ríos',
    nextCheckupDate: '05 Nov 2026 · 12:00 hrs',
    medicalHistory: [
      {
        id: 'mh-carlos-1',
        date: '2026-10-22',
        title: 'Endodoncia Microscópica Unirradicular en Premolar #24',
        category: 'Procedimiento Clínico',
        specialistName: 'Dr. Mateo Ríos',
        summary:
          'Obturación tridimensional termoplástica bajo microscopio 25x en pieza #24 por pulpitis irreversible sintomática. Remisión completa del dolor.',
        vitalObservations: 'Se indicó analgésico antiinflamatorio por 48 horas; sin prescripción de beta-lactámicos por alergia.',
      },
      {
        id: 'mh-carlos-2',
        date: '2026-09-10',
        title: 'Sondeo Periodontal y Detartraje Ultrasónico',
        category: 'Control Periodontal',
        specialistName: 'Dra. Sofía Domínguez',
        summary:
          'Reducción de bolsas periodontales de 4 mm a 2 mm en cuadrante inferior izquierdo tras terapia con ultrasonido piezoeléctrico.',
        vitalObservations: 'Índice de sangrado gingival reducido a menos del 8%.',
      },
    ],
    treatments: [
      {
        id: 'trt-carlos-1',
        serviceId: 'srv-endodoncia-microscopica',
        treatmentName: 'Endodoncia Microscópica y Reconstrucción Post-Endodóntica (#24)',
        specialistName: 'Dr. Mateo Ríos',
        startDate: '2026-10-22',
        status: 'En curso',
        progressPercent: 80,
        completedSessions: 1,
        totalSessions: 2,
        toothNumbers: [24],
        nextStepDescription: 'Cementación de incrustación cerámica de protección cuspídea en #24.',
        totalCostMXN: 5600,
      },
      {
        id: 'trt-carlos-2',
        serviceId: 'srv-profilaxis-airflow',
        treatmentName: 'Mantenimiento Periodontal Ultrasónico Semestral',
        specialistName: 'Dra. Sofía Domínguez',
        startDate: '2026-11-05',
        status: 'Programado',
        progressPercent: 50,
        completedSessions: 1,
        totalSessions: 2,
        toothNumbers: [34, 36, 46],
        nextStepDescription: 'Cita programada para el 05 de noviembre a las 12:00 hrs.',
        totalCostMXN: 1450,
      },
    ],
    odontogram: [
      {
        toothNumber: 16,
        quadrant: 'Sup. Derecho',
        name: 'Primer Molar Sup. Der.',
        condition: 'Corona cerámica',
        lastUpdated: '2026-09-10',
        clinicalNote: 'Incrustación onlay cerámica funcional sin interferencias oclusales.',
      },
      {
        toothNumber: 11,
        quadrant: 'Sup. Derecho',
        name: 'Incisivo Central Sup. Der.',
        condition: 'Sano',
        lastUpdated: '2026-09-10',
        clinicalNote: 'Desgaste incisal fisiológico leve.',
      },
      {
        toothNumber: 21,
        quadrant: 'Sup. Izquierdo',
        name: 'Incisivo Central Sup. Izq.',
        condition: 'Sano',
        lastUpdated: '2026-09-10',
        clinicalNote: 'Tejido de soporte sano.',
      },
      {
        toothNumber: 24,
        quadrant: 'Sup. Izquierdo',
        name: 'Primer Premolar Sup. Izq.',
        condition: 'Endodoncia previa',
        lastUpdated: '2026-10-22',
        clinicalNote: 'Endodoncia microscópica finalizada sin dolor; lista para incrustación.',
      },
      {
        toothNumber: 26,
        quadrant: 'Sup. Izquierdo',
        name: 'Primer Molar Sup. Izq.',
        condition: 'Resina programada',
        lastUpdated: '2026-10-22',
        clinicalNote: 'Caries incipiente en surco mesial; programada resina compuesta.',
      },
      {
        toothNumber: 36,
        quadrant: 'Inf. Izquierdo',
        name: 'Primer Molar Inf. Izq.',
        condition: 'Sano',
        lastUpdated: '2026-09-10',
        clinicalNote: 'Encía recuperada tras profilaxis ultrasónica.',
      },
      {
        toothNumber: 34,
        quadrant: 'Inf. Izquierdo',
        name: 'Primer Premolar Inf. Izq.',
        condition: 'Sano',
        lastUpdated: '2026-09-10',
        clinicalNote: 'Sin movilidad dental.',
      },
      {
        toothNumber: 46,
        quadrant: 'Inf. Derecho',
        name: 'Primer Molar Inf. Der.',
        condition: 'Revisión prioritaria',
        lastUpdated: '2026-10-22',
        clinicalNote: 'Revisar punto de contacto distal en cita del 05 Nov.',
      },
    ],
  },
  {
    id: 'pat-roberto',
    fullName: 'Roberto Méndez Soto',
    email: 'roberto.mendez@ejemplo.mx',
    patientCode: 'EXP-2026-0519',
    phone: '+52 55 3391 7740',
    age: 38,
    bloodType: 'B+',
    allergies: 'Ninguna alergia reportada',
    systemicNotes: 'Paciente deportista, sin patologías crónicas.',
    assignedDoctor: 'Dra. Camila Herrera',
    nextCheckupDate: '14 Nov 2026 · 17:00 hrs',
    medicalHistory: [
      {
        id: 'mh-roberto-1',
        date: '2026-10-05',
        title: 'Cementación Adhesiva de 6 Lentes Cerámicos Superiores',
        category: 'Procedimiento Clínico',
        specialistName: 'Dra. Camila Herrera',
        summary:
          'Cementación bajo aislamiento absoluto de microcarillas de disilicato de litio en piezas #13 a #23 color BL3 natural.',
        vitalObservations: 'Oclusión mutuamente protegida y guía canina verificada.',
      },
    ],
    treatments: [
      {
        id: 'trt-roberto-1',
        serviceId: 'srv-diseno-sonrisa',
        treatmentName: 'Diseño de Sonrisa con Lentes Cerámicos (Sector Anterior)',
        specialistName: 'Dra. Camila Herrera',
        startDate: '2026-09-15',
        status: 'Completado',
        progressPercent: 100,
        completedSessions: 2,
        totalSessions: 2,
        toothNumbers: [11, 12, 21, 22],
        nextStepDescription: 'Control fotográfico de revisión estética el 14 de noviembre.',
        totalCostMXN: 35200,
      },
    ],
    odontogram: [
      {
        toothNumber: 12,
        quadrant: 'Sup. Derecho',
        name: 'Incisivo Lateral Sup. Der.',
        condition: 'Corona cerámica',
        lastUpdated: '2026-10-05',
        clinicalNote: 'Lente cerámico BL3 con adaptación gingival impecable.',
      },
      {
        toothNumber: 11,
        quadrant: 'Sup. Derecho',
        name: 'Incisivo Central Sup. Der.',
        condition: 'Corona cerámica',
        lastUpdated: '2026-10-05',
        clinicalNote: 'Lente cerámico BL3 cementado bajo microscopio.',
      },
      {
        toothNumber: 21,
        quadrant: 'Sup. Izquierdo',
        name: 'Incisivo Central Sup. Izq.',
        condition: 'Corona cerámica',
        lastUpdated: '2026-10-05',
        clinicalNote: 'Simetría central verificada con guía digital.',
      },
      {
        toothNumber: 22,
        quadrant: 'Sup. Izquierdo',
        name: 'Incisivo Lateral Sup. Izq.',
        condition: 'Corona cerámica',
        lastUpdated: '2026-10-05',
        clinicalNote: 'Lente cerámico sin sensibilidad post-operatoria.',
      },
      {
        toothNumber: 36,
        quadrant: 'Inf. Izquierdo',
        name: 'Primer Molar Inf. Izq.',
        condition: 'Sano',
        lastUpdated: '2026-10-05',
        clinicalNote: 'Pieza íntegra.',
      },
      {
        toothNumber: 46,
        quadrant: 'Inf. Derecho',
        name: 'Primer Molar Inf. Der.',
        condition: 'Sano',
        lastUpdated: '2026-10-05',
        clinicalNote: 'Pieza íntegra.',
      },
    ],
  },
];

export const INITIAL_APPOINTMENTS: AppointmentRecord[] = [
  {
    id: 'apt-101',
    patientId: 'pat-lucia',
    patientName: 'Lucía Fernández Vega',
    patientEmail: 'lucia.fernandez@ejemplo.mx',
    patientPhone: '+52 55 4182 9012',
    serviceId: 'srv-ortodoncia-3d',
    serviceName: 'Ortodoncia Invisible Digital 3D',
    specialistName: 'Dra. Valeria Mendoza',
    date: '2026-11-05',
    time: '10:30',
    status: 'Confirmada',
    notes: 'Entrega de juegos de alineadores #10 al #12 y revisión de ataches.',
    priceMXN: 42000,
  },
  {
    id: 'apt-102',
    patientId: 'pat-carlos',
    patientName: 'Carlos Eduardo Navarro',
    patientEmail: 'c.navarro@ejemplo.mx',
    patientPhone: '+52 55 8923 1104',
    serviceId: 'srv-profilaxis-airflow',
    serviceName: 'Profilaxis Ultrasónica Guiada por Biofilm',
    specialistName: 'Dra. Sofía Domínguez',
    date: '2026-11-05',
    time: '12:00',
    status: 'En sala',
    notes: 'Mantenimiento periodontal semestral + valoración de incrustación en #24.',
    priceMXN: 1450,
  },
  {
    id: 'apt-103',
    patientId: 'pat-lucia',
    patientName: 'Lucía Fernández Vega',
    patientEmail: 'lucia.fernandez@ejemplo.mx',
    patientPhone: '+52 55 4182 9012',
    serviceId: 'srv-blanqueamiento-led',
    serviceName: 'Aclaramiento Dental Fotoactivado + Kit Ambulatorio',
    specialistName: 'Dra. Camila Herrera',
    date: '2026-11-18',
    time: '16:00',
    status: 'Confirmada',
    notes: 'Sesión fotoactivada previa a finalización de ortodoncia.',
    priceMXN: 4200,
  },
  {
    id: 'apt-104',
    patientId: 'pat-roberto',
    patientName: 'Roberto Méndez Soto',
    patientEmail: 'roberto.mendez@ejemplo.mx',
    patientPhone: '+52 55 3391 7740',
    serviceId: 'srv-diseno-sonrisa',
    serviceName: 'Diseño de Sonrisa con Lentes Cerámicos',
    specialistName: 'Dra. Camila Herrera',
    date: '2026-11-14',
    time: '17:00',
    status: 'Confirmada',
    notes: 'Control oclusal y registro fotográfico final de lentes cerámicos.',
    priceMXN: 8800,
  },
];

export const INITIAL_ODONTOGRAM: ToothRecord[] = PATIENTS_DIRECTORY[0].odontogram;

export function filterDentalServices(
  services: DentalService[],
  category: ServiceCategory,
  searchQuery: string
): DentalService[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  return services.filter((service) => {
    const matchesCategory = category === 'todos' || service.category === category;
    if (!matchesCategory) return false;
    if (!normalizedQuery) return true;
    return (
      service.name.toLowerCase().includes(normalizedQuery) ||
      service.shortDescription.toLowerCase().includes(normalizedQuery) ||
      service.categoryLabel.toLowerCase().includes(normalizedQuery) ||
      service.specialistName.toLowerCase().includes(normalizedQuery)
    );
  });
}

export interface BudgetSummary {
  selectedServices: DentalService[];
  subtotalMXN: number;
  discountMXN: number;
  totalMXN: number;
  monthlyInstallmentMXN: number;
  totalDurationMinutes: number;
}

export function calculateTreatmentBudget(
  services: DentalService[],
  selectedIds: string[],
  monthsFinancing: 1 | 3 | 6 | 12 = 6,
  hasInsurancePlan: boolean = false
): BudgetSummary {
  const selectedServices = services.filter((s) => selectedIds.includes(s.id));
  const subtotalMXN = selectedServices.reduce((acc, item) => acc + item.priceMXN, 0);
  const discountRate = hasInsurancePlan ? 0.12 : selectedServices.length >= 2 ? 0.08 : 0;
  const discountMXN = Math.round(subtotalMXN * discountRate);
  const totalMXN = subtotalMXN - discountMXN;
  const monthlyInstallmentMXN = Math.round(totalMXN / monthsFinancing);
  const totalDurationMinutes = selectedServices.reduce(
    (acc, item) => acc + item.durationMinutes,
    0
  );

  return {
    selectedServices,
    subtotalMXN,
    discountMXN,
    totalMXN,
    monthlyInstallmentMXN,
    totalDurationMinutes,
  };
}

export function validateAuthCredentials(input: LoginValidationInput): ValidationResult {
  const errors: ValidationResult['errors'] = {};
  const emailTrimmed = input.email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailTrimmed) {
    errors.email = 'Ingresa tu correo electrónico registrado.';
  } else if (!emailRegex.test(emailTrimmed)) {
    errors.email = 'El formato del correo electrónico no es válido.';
  }

  if (!input.password || input.password.trim().length < 6) {
    errors.password = 'La contraseña debe contener al menos 6 caracteres.';
  }

  if (input.mode === 'registro') {
    if (!input.fullName || input.fullName.trim().length < 3) {
      errors.fullName = 'Ingresa tu nombre y apellido completos.';
    }
    if (!input.phone || input.phone.replace(/\D/g, '').length < 8) {
      errors.phone = 'Ingresa un teléfono de contacto válido (mínimo 8 dígitos).';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateBookingInput(input: BookingInput): {
  valid: boolean;
  error?: string;
} {
  if (!input.patientName.trim() || input.patientName.trim().length < 3) {
    return {valid: false, error: 'Por favor ingresa el nombre completo del paciente.'};
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!input.patientEmail.trim() || !emailRegex.test(input.patientEmail.trim())) {
    return {valid: false, error: 'Por favor ingresa un correo electrónico válido.'};
  }
  if (!input.patientPhone.trim() || input.patientPhone.replace(/\D/g, '').length < 8) {
    return {
      valid: false,
      error: 'Por favor ingresa un número telefónico de al menos 8 dígitos.',
    };
  }
  if (!input.serviceId) {
    return {valid: false, error: 'Selecciona el servicio dental que deseas agendar.'};
  }
  if (!input.date) {
    return {valid: false, error: 'Selecciona la fecha para tu cita.'};
  }
  if (!input.time) {
    return {valid: false, error: 'Selecciona un horario disponible.'};
  }
  return {valid: true};
}

export function cycleToothCondition(current: ToothCondition): ToothCondition {
  const order: ToothCondition[] = [
    'Sano',
    'Resina programada',
    'Corona cerámica',
    'Implante titanio',
    'Endodoncia previa',
    'Revisión prioritaria',
  ];
  const idx = order.indexOf(current);
  return order[(idx + 1) % order.length];
}

export function formatCurrencyMXN(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Generates a structured clinical assistant reply grounded in the patient's real record
 * (medical history, scheduled appointments, active treatments, and personal odontogram).
 * Used both to construct context for Gemini and as a deterministic fallback.
 */
export function buildClinicalAssistantResponse(
  query: string,
  patient: PatientClinicalProfile,
  patientAppointments: AppointmentRecord[]
): {
  reply: string;
  suggestedTab?: 'citas' | 'historial' | 'tratamientos' | 'odontograma' | 'servicios';
} {
  const q = query.trim().toLowerCase();

  if (
    q.includes('historial') ||
    q.includes('alergia') ||
    q.includes('antecedente') ||
    q.includes('médico') ||
    q.includes('medico') ||
    q.includes('sangre')
  ) {
    const historyLines = patient.medicalHistory
      .map((h) => `• ${h.date} — ${h.title} (${h.specialistName}): ${h.summary}`)
      .join('\n');
    return {
      reply:
        `Expediente médico de ${patient.fullName} (${patient.patientCode}):\n` +
        `• Tipo de sangre: ${patient.bloodType} | Edad: ${patient.age} años\n` +
        `• Alergias: ${patient.allergies}\n` +
        `• Notas sistémicas: ${patient.systemicNotes}\n\n` +
        `Registros clínicos recientes:\n${historyLines}`,
      suggestedTab: 'historial',
    };
  }

  if (
    q.includes('cita') ||
    q.includes('agenda') ||
    q.includes('próxima') ||
    q.includes('proxima') ||
    q.includes('horario') ||
    q.includes('cuándo') ||
    q.includes('cuando')
  ) {
    if (patientAppointments.length === 0) {
      return {
        reply: `${patient.fullName} no tiene citas pendientes en este momento. Puedes programar una nueva consulta desde la pestaña de Citas o el Catálogo de Servicios.`,
        suggestedTab: 'citas',
      };
    }
    const apptLines = patientAppointments
      .map(
        (a) =>
          `• ${a.date} a las ${a.time} hrs — ${a.serviceName} con ${a.specialistName} [Estado: ${a.status}] (${a.notes})`
      )
      .join('\n');
    return {
      reply:
        `Citas programadas para ${patient.fullName} (${patientAppointments.length}):\n` +
        `${apptLines}\n\n` +
        `Próximo control principal: ${patient.nextCheckupDate}.`,
      suggestedTab: 'citas',
    };
  }

  if (
    q.includes('tratamiento') ||
    q.includes('avance') ||
    q.includes('progreso') ||
    q.includes('sesiones') ||
    q.includes('plan')
  ) {
    const trtLines = patient.treatments
      .map(
        (t) =>
          `• ${t.treatmentName} [${t.status} — ${t.progressPercent}% completado, ${t.completedSessions}/${t.totalSessions} sesiones]. Siguiente paso: ${t.nextStepDescription}`
      )
      .join('\n');
    return {
      reply:
        `Plan de tratamientos de ${patient.fullName}:\n${trtLines}`,
      suggestedTab: 'tratamientos',
    };
  }

  if (
    q.includes('odontograma') ||
    q.includes('diente') ||
    q.includes('pieza') ||
    q.includes('muela') ||
    q.includes('caries') ||
    q.includes('resina') ||
    q.includes('implante')
  ) {
    const priorityTeeth = patient.odontogram.filter((t) => t.condition !== 'Sano');
    const summaryTeeth =
      priorityTeeth.length > 0
        ? priorityTeeth
            .map(
              (t) =>
                `• Pieza #${t.toothNumber} (${t.name}): ${t.condition} — ${t.clinicalNote}`
            )
            .join('\n')
        : 'Todas las piezas registradas se encuentran sanas.';
    return {
      reply:
        `Resumen del Odontograma FDI de ${patient.fullName} (${patient.odontogram.length} piezas monitoreadas):\n` +
        `${summaryTeeth}`,
      suggestedTab: 'odontograma',
    };
  }

  if (q.includes('servicio') || q.includes('precio') || q.includes('costo')) {
    const srvLines = DENTAL_SERVICES.map(
      (s) => `• ${s.indexNumber}. ${s.name}: ${formatCurrencyMXN(s.priceMXN)} (${s.durationMinutes} min)`
    ).join('\n');
    return {
      reply: `En Lumina Odontología ofrecemos los siguientes servicios especializados:\n${srvLines}`,
      suggestedTab: 'servicios',
    };
  }

  return {
    reply:
      `Hola, soy el Asistente Clínico de Lumina Odontología. Estoy sincronizado con el expediente ${patient.patientCode} de ${patient.fullName}.\n\n` +
      `• Próxima cita: ${patient.nextCheckupDate} con ${patient.assignedDoctor}\n` +
      `• Tratamientos registrados: ${patient.treatments.length}\n` +
      `• Alergias registradas: ${patient.allergies}\n\n` +
      `Pregúntame por tu historial médico, citas programadas, avance de tratamientos o el estado de cualquier pieza en tu odontograma.`,
    suggestedTab: 'historial',
  };
}
