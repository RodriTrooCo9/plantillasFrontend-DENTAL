import {
  Paciente,
  Cita,
  Odontograma,
  Tratamiento,
  EntradaHistorialClinico,
} from '@/domain';

/**
 * MAPPERS Y DTOs (Adaptador anticorrupción entre NestJS y el Dominio del Frontend)
 * Si NestJS cambia nombres de campos o se divide en microservicios, solo se actualiza este archivo.
 */

export interface PacienteDto {
  id: string;
  medical_record_code: string;
  full_name: string;
  email: string;
  phone: string;
  birth_date: string;
  age: number;
  blood_type: string;
  allergies: string[];
  medical_alerts: string;
  assigned_dentist_id: string;
  assigned_dentist_name: string;
}

export function mapPacienteDtoToDomain(dto: PacienteDto): Paciente {
  return {
    id: dto.id,
    codigoExpediente: dto.medical_record_code,
    nombreCompleto: dto.full_name,
    email: dto.email,
    telefono: dto.phone,
    fechaNacimiento: dto.birth_date,
    edad: dto.age,
    tipoSangre: dto.blood_type,
    alergias: dto.allergies || [],
    alertasMedicas: dto.medical_alerts || '',
    dentistaAsignadoId: dto.assigned_dentist_id,
    dentistaAsignadoNombre: dto.assigned_dentist_name,
  };
}

export interface CitaDto {
  id: string;
  patient_id: string;
  patient_name: string;
  dentist_id: string;
  dentist_name: string;
  service_id: string;
  service_name: string;
  treatment_id?: string;
  date: string;
  time: string;
  status: Cita['estado'];
  reason: string;
  cost_mxn: number;
}

export function mapCitaDtoToDomain(dto: CitaDto): Cita {
  return {
    id: dto.id,
    pacienteId: dto.patient_id,
    pacienteNombre: dto.patient_name,
    dentistaId: dto.dentist_id,
    dentistaNombre: dto.dentist_name,
    servicioId: dto.service_id,
    servicioNombre: dto.service_name,
    tratamientoId: dto.treatment_id,
    fecha: dto.date,
    hora: dto.time,
    estado: dto.status,
    motivoConsulta: dto.reason,
    costoMXN: dto.cost_mxn,
  };
}

export function mapOdontogramaDtoToDomain(dto: Odontograma): Odontograma {
  return dto;
}

export function mapTratamientoDtoToDomain(dto: Tratamiento): Tratamiento {
  return dto;
}

export function mapHistorialDtoToDomain(
  dto: EntradaHistorialClinico
): EntradaHistorialClinico {
  return dto;
}
