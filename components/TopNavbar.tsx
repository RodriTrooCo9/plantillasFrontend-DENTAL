"use client";
import React, { useId, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/hooks";
import { useOperation } from "@/hooks/use-operation";
import { roleDestination } from "@/domain/auth-routing";
export function TopNavbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const operation = useOperation();
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-stone-200">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 min-w-0">
        <Link
          href="/"
          className="text-base sm:text-lg font-bold min-w-0"
          style={{ fontFamily: "var(--font-fraunces), serif" }}
        >
          Lumina<span className="hidden sm:inline"> Odontología</span>
        </Link>
        <div className="flex items-center gap-2 md:order-3">
          {user ? (
            <button
              type="button"
              disabled={operation.pending}
              className="min-h-11 px-3 text-sm text-red-800"
              onClick={() =>
                void operation.run(async () => {
                  try {
                    await logout();
                  } finally {
                    router.replace("/login");
                  }
                })
              }
            >
              Cerrar sesión
            </button>
          ) : (
            <Link
              href="/login"
              className="min-h-11 inline-flex items-center px-3 text-sm rounded-lg bg-teal-800 text-white"
            >
              Iniciar sesión
            </Link>
          )}
          <button
            type="button"
            ref={button}
            aria-expanded={open}
            aria-controls={id}
            aria-label={open ? "Cerrar navegación" : "Abrir navegación"}
            className="md:hidden min-h-11 min-w-11 inline-flex items-center justify-center"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
        <nav
          id={id}
          aria-label="Navegación principal"
          className={`${open ? "flex" : "hidden"} md:flex flex-col md:flex-row w-full md:w-auto order-3 md:order-2 gap-1 md:gap-3 text-sm`}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              button.current?.focus();
            }
          }}
        >
          {[
            ["/", "Inicio"],
            ["/#servicios", "Servicios"],
            ["/#equipo", "Equipo"],
            ["/#contacto", "Contacto"],
            ...(user ? [[roleDestination(user.rol), "Mi portal"]] : []),
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="min-h-11 flex items-center px-2 text-slate-700 hover:text-teal-900"
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
      {operation.error && (
        <p role="alert" className="text-sm px-4">
          {operation.error}
        </p>
      )}
    </header>
  );
}
