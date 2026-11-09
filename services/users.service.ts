import { authService } from "./auth.service";
import { patientsService } from "./patients.service";
import { repositories } from "@/data/factory";
import type { Dentista, Paciente, UsuarioAutenticado } from "@/types";

/**
 * Servicio de Usuarios (Unifica consulta de perfil autenticado, pacientes y especialistas)
 */
export const usersService = {
  getCurrentUser(): Promise<UsuarioAutenticado | null> {
    return authService.getSession();
  },

  listPatients(query?: string): Promise<Paciente[]> {
    return patientsService.listarPacientes(query);
  },

  getPatientById(id: string): Promise<Paciente | null> {
    return patientsService.obtenerPacientePorId(id);
  },

  listDentists(): Promise<Dentista[]> {
    return repositories.citas.listarDentistas();
  },
};
