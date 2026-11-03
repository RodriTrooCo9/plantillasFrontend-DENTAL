"use client";
import React, { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks";
import type { RolUsuario, UsuarioAutenticado } from "@/domain";
import { repositories } from "@/data/factory";
import { roleDestination } from "@/domain/auth-routing";
import { retrySession } from "@/data/auth/session";
export function AuthGate({
  role,
  children,
}: {
  role: RolUsuario;
  children: (user: UsuarioAutenticado) => React.ReactNode;
}) {
  const { user, loading, error } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const query = useSearchParams();
  useEffect(() => {
    if (loading || error) return;
    if (!user)
      router.replace(
        `/login?next=${encodeURIComponent(pathname + (query.size ? `?${query}` : ""))}`,
      );
    else if (user.rol !== role) router.replace(roleDestination(user.rol));
  }, [user, loading, error, role, router, pathname, query]);
  if (error)
    return (
      <main className="p-6">
        <p role="alert">{error}</p>
        <button onClick={() => void retrySession()}>
          Reintentar validación de sesión
        </button>
      </main>
    );
  if (loading || !user || user.rol !== role)
    return (
      <main className="p-6" role="status">
        Verificando tu sesión…
      </main>
    );
  return (
    <>
      {repositories.mode === "mock" && (
        <div
          role="status"
          className="bg-amber-100 text-amber-950 p-3 text-sm text-center font-semibold"
        >
          MODO DEMO · Datos ficticios. Los cambios no representan atención
          clínica real.
        </div>
      )}
      {children(user)}
    </>
  );
}
