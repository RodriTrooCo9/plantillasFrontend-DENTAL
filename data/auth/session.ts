"use client";
import type { UsuarioAutenticado } from "@/domain";
import type { LoginPayload } from "@/data/repositories";
import { repositories } from "@/data/factory";
import { setHttpTokens, onHttpSessionExpired } from "@/data/http/client";
interface SessionState {
  user: UsuarioAutenticado | null;
  loading: boolean;
  error: string | null;
}
const initial: SessionState = { user: null, loading: true, error: null };
let state = initial;
let pending: Promise<void> | undefined;
let version = 0;
const listeners = new Set<() => void>();
const channelKey = "lumina_session_event";
const emit = (value: SessionState) => {
  state = value;
  listeners.forEach((l) => l());
};
export const getSessionSnapshot = () => state;
export const getServerSessionSnapshot = () => initial;
export function subscribeSession(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function clear() {
  version++;
  if (typeof window !== "undefined")
    window.sessionStorage.removeItem("lumina_demo_email");
  setHttpTokens(null);
  emit({ user: null, loading: false, error: null });
}
function broadcast() {
  window.localStorage.setItem(channelKey, crypto.randomUUID());
}
let listening = false;
export async function bootstrapSession() {
  if (!listening) {
    listening = true;
    // Remove tokens left by the old implementation. Never read or reuse them.
    window.localStorage.removeItem("lumina_auth_session_v2");
    window.addEventListener("storage", (e) => {
      if (e.key === channelKey) clear();
    });
    onHttpSessionExpired(() => {
      clear();
      broadcast();
    });
  }
  if (!state.loading) return;
  if (!pending) {
    const current = version;
    pending = repositories.auth
      .getSession()
      .then((user) => {
        if (current === version) emit({ user, loading: false, error: null });
      })
      .catch((error) => {
        if (current === version)
          emit({
            user: null,
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "No fue posible verificar la sesión.",
          });
      })
      .finally(() => {
        pending = undefined;
      });
  }
  await pending;
}
export async function loginSession(payload: LoginPayload) {
  version++;
  emit({ ...state, loading: true, error: null });
  try {
    const user = await repositories.auth.login(payload);
    emit({ user, loading: false, error: null });
    broadcast();
    return user;
  } catch (error) {
    emit({
      user: null,
      loading: false,
      error:
        error instanceof Error
          ? error.message
          : "No fue posible iniciar sesión.",
    });
    throw error;
  }
}
export async function logoutSession() {
  clear();
  broadcast();
  try {
    await repositories.auth.logout();
  } finally {
    clear();
  }
}
export async function retrySession() {
  emit(initial);
  await bootstrapSession();
}
