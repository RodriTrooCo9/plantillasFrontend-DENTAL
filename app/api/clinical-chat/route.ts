import {GoogleGenAI} from '@google/genai';
import {NextRequest, NextResponse} from 'next/server';
import {
  PatientClinicalProfile,
  AppointmentRecord,
  buildClinicalAssistantResponse,
  DENTAL_SERVICES,
  formatCurrencyMXN,
} from '@/lib/dental-logic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      message,
      patient,
      appointments,
    }: {
      message: string;
      patient: PatientClinicalProfile;
      appointments: AppointmentRecord[];
    } = body;

    if (!message || !patient) {
      return NextResponse.json(
        {error: 'Falta el mensaje o el perfil del paciente.'},
        {status: 400}
      );
    }

    const patientAppointments = (appointments || []).filter(
      (a) =>
        a.patientId === patient.id ||
        a.patientEmail.toLowerCase() === patient.email.toLowerCase()
    );

    const localAnalysis = buildClinicalAssistantResponse(
      message,
      patient,
      patientAppointments
    );

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
      return NextResponse.json({
        reply: localAnalysis.reply,
        suggestedTab: localAnalysis.suggestedTab,
        source: 'clinical-engine',
      });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const systemContext = `Eres el Asistente Clínico Digital del consultorio Lumina Odontología.
Responde siempre en español de manera clara, profesional, empática y concisa (máximo 130 palabras).
Tienes acceso en tiempo real al expediente clínico del paciente activo:

PACIENTE ACTIVO:
- Nombre: ${patient.fullName} (Expediente: ${patient.patientCode})
- Edad: ${patient.age} años | Tipo de sangre: ${patient.bloodType}
- Alergias: ${patient.allergies}
- Notas sistémicas: ${patient.systemicNotes}
- Especialista a cargo: ${patient.assignedDoctor}
- Próximo control: ${patient.nextCheckupDate}

HISTORIAL MÉDICO:
${patient.medicalHistory
  .map((h) => `- [${h.date}] ${h.title} (${h.specialistName}): ${h.summary} | ${h.vitalObservations}`)
  .join('\n')}

CITAS PROGRAMADAS DEL PACIENTE:
${
  patientAppointments.length > 0
    ? patientAppointments
        .map(
          (a) =>
            `- ${a.date} ${a.time} hrs: ${a.serviceName} con ${a.specialistName} (Estado: ${a.status}) - ${a.notes}`
        )
        .join('\n')
    : '- Sin citas pendientes registradas.'
}

TRATAMIENTOS DEL PACIENTE:
${patient.treatments
  .map(
    (t) =>
      `- ${t.treatmentName} (${t.status}, avance ${t.progressPercent}%, sesiones ${t.completedSessions}/${t.totalSessions}, piezas FDI: ${t.toothNumbers.join(', ')}). Siguiente paso: ${t.nextStepDescription}`
  )
  .join('\n')}

ODONTOGRAMA INDIVIDUAL DEL PACIENTE:
${patient.odontogram
  .map(
    (o) =>
      `- Pieza #${o.toothNumber} (${o.name}, ${o.quadrant}): Estado="${o.condition}", Nota="${o.clinicalNote}"`
  )
  .join('\n')}

CATÁLOGO DE SERVICIOS DEL CONSULTORIO:
${DENTAL_SERVICES.map(
  (s) => `- ${s.indexNumber}. ${s.name}: ${formatCurrencyMXN(s.priceMXN)} (${s.durationMinutes} min)`
).join('\n')}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: message,
        config: {
          systemInstruction: systemContext,
        },
      });

      const text = response.text;
      if (text && text.trim().length > 0) {
        return NextResponse.json({
          reply: text.trim(),
          suggestedTab: localAnalysis.suggestedTab,
          source: 'gemini',
        });
      }
    } catch {
      // Fallback cleanly to deterministic clinical record response if API quota or key fails
    }

    return NextResponse.json({
      reply: localAnalysis.reply,
      suggestedTab: localAnalysis.suggestedTab,
      source: 'clinical-engine',
    });
  } catch {
    return NextResponse.json(
      {error: 'No fue posible procesar la consulta clínica en este momento.'},
      {status: 500}
    );
  }
}
