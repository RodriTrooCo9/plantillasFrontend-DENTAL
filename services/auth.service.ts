import { repositories } from "@/data/factory";
import type { LoginPayload, UsuarioAutenticado } from "@/types";

/**
 * Servicio de Autenticación y Sesión (JWT + Cookie HttpOnly)
 */
export const authService = {
  login(payload: LoginPayload): Promise<UsuarioAutenticado> {
    return repositories.auth.login(payload);
  },

  getSession(): Promise<UsuarioAutenticado | null> {
    return repositories.auth.getSession();
  },

  recoverPassword(email: string): Promise<{ mensaje: string }> {
    return repositories.auth.recoverPassword(email);
  },

  refreshToken(): Promise<UsuarioAutenticado> {
    return repositories.auth.refreshToken();
  },

  logout(): Promise<void> {
    return repositories.auth.logout();
  },
};
