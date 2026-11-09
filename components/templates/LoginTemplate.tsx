"use client";

import React from "react";
import { TopNavbar } from "@/components/TopNavbar";
import { AsyncForm } from "@/components/ui/AsyncForm";
import { Card, Button, Input, Modal } from "@/components/ui";
import { Lock, ShieldCheck, CheckCircle2 } from "lucide-react";

export interface LoginTemplateProps {
  mode: "mock" | "http";
  email: string;
  password: string;
  formErrors: { email?: string; password?: string };
  submitting: boolean;
  authError: string | null;
  recoverOpen: boolean;
  recoverEmail: string;
  recoverMsg: string | null;
  recoverErr: string | null;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onQuickLogin: (
    demoEmail:
      | "admin@demo.com"
      | "prueba1@demo.com"
      | "prueba2@demo.com"
      | "paciente@demo.com"
      | "dentista@demo.com",
  ) => void;
  onOpenRecover: () => void;
  onCloseRecover: () => void;
  onRecoverEmailChange: (value: string) => void;
  onRecoverSubmit: (e: React.FormEvent) => Promise<void>;
}

export function LoginTemplate({
  mode,
  email,
  password,
  formErrors,
  submitting,
  authError,
  recoverOpen,
  recoverEmail,
  recoverMsg,
  recoverErr,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onQuickLogin,
  onOpenRecover,
  onCloseRecover,
  onRecoverEmailChange,
  onRecoverSubmit,
}: LoginTemplateProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg-canvas)] text-[var(--color-text-main)]">
      {mode === "mock" && (
        <div
          role="status"
          className="bg-amber-100 text-amber-950 p-3 text-sm text-center font-semibold"
        >
          MODO DEMO · Credenciales y expedientes ficticios.
        </div>
      )}
      {/* Top Bar */}
      <TopNavbar />

      <main className="flex-1 max-w-[1160px] w-full mx-auto px-6 py-12 flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full items-stretch">
          {/* Columna Izquierda: Explicación de Roles y Credenciales */}
          <Card className="lg:col-span-6 p-8 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-[var(--color-primary)]">
                Tu salud dental, en un solo lugar
              </p>
              <h1
                className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight"
                style={{ fontFamily: "var(--font-fraunces), serif" }}
              >
                Acceso al Sistema Clínico Lumina
              </h1>
              <p className="mt-3 text-sm text-[var(--color-text-muted)] leading-relaxed">
                Ingresa con tus credenciales para acceder automáticamente a tu
                entorno correspondiente según tus permisos:
              </p>

              <div className="mt-6 space-y-3 text-xs">
                <div className="p-4 rounded-xl bg-[var(--color-bg-canvas)] border border-[var(--color-border-base)]">
                  <div className="flex items-center justify-between font-semibold text-slate-900">
                    <span>Médico Dentista Admin → /dentista</span>
                    <span className="font-mono text-teal-800">
                      admin@demo.com / 123456
                    </span>
                  </div>
                  <p className="text-slate-600 mt-1">
                    Director Clínico con acceso completo a la agenda, bloqueo de
                    horarios, buscador de pacientes, edición de odontograma FDI
                    de 32 piezas con auditoría, historial médico y tratamientos.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[var(--color-bg-canvas)] border border-[var(--color-border-base)]">
                  <div className="flex items-center justify-between font-semibold text-slate-900">
                    <span>Pacientes de Prueba → /paciente</span>
                    <span className="font-mono text-teal-800">
                      prueba1@demo.com · prueba2@demo.com / 123456
                    </span>
                  </div>
                  <p className="text-slate-600 mt-1">
                    Consulta de resumen clínico, historial médico, odontograma
                    de 32 dientes FDI (solo lectura), seguimiento de
                    tratamientos y agendado/cancelación de citas.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-[var(--color-border-base)] text-xs text-[var(--color-text-subtle)] flex items-center justify-between">
              <span>Acceso a tu información y tus citas</span>
              <span>Atención para pacientes y profesionales</span>
            </div>
          </Card>

          {/* Columna Derecha: Formulario de Login */}
          <Card className="lg:col-span-6 p-8 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Iniciar sesión en tu cuenta
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Ingresa el correo electrónico y la contraseña de tu cuenta.
              </p>

              <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
                <Input
                  id="login-email"
                  type="email"
                  label="Correo electrónico"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => onEmailChange(e.target.value)}
                  error={formErrors.email}
                />

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="login-password"
                      className="text-xs font-medium text-[var(--color-text-muted)]"
                    >
                      Contraseña
                    </label>
                    <button
                      type="button"
                      onClick={onOpenRecover}
                      className="text-xs font-medium text-[var(--color-primary)] hover:underline cursor-pointer"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••"
                    value={password}
                    onChange={(e) => onPasswordChange(e.target.value)}
                    error={formErrors.password}
                  />
                </div>

                {authError && (
                  <div
                    role="alert"
                    className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700"
                  >
                    {authError}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5"
                >
                  <Lock className="w-4 h-4" />
                  <span>
                    {submitting
                      ? "Verificando credenciales..."
                      : "Iniciar sesión"}
                  </span>
                </Button>
              </form>
            </div>

            {/* Botones de Credenciales de Prueba (Seed DB / Demo) */}
            <div className="mt-8 pt-5 border-t border-[var(--color-border-base)]">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-3">
                <ShieldCheck className="w-4 h-4 text-teal-700" />
                <span>Acceso rápido con cuentas de prueba (Seed):</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  disabled={submitting}
                  onClick={() => onQuickLogin("admin@demo.com")}
                >
                  Dentista Admin
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={submitting}
                  onClick={() => onQuickLogin("prueba1@demo.com")}
                >
                  Paciente Prueba 1
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={submitting}
                  onClick={() => onQuickLogin("prueba2@demo.com")}
                >
                  Paciente Prueba 2
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </main>

      {/* Modal de Recuperación de Contraseña */}
      <Modal
        isOpen={recoverOpen}
        onClose={onCloseRecover}
        title="Recuperar contraseña de acceso"
      >
        <AsyncForm onSubmit={onRecoverSubmit} className="space-y-4">
          <p className="text-xs text-slate-600">
            Ingresa el correo electrónico asociado a tu expediente o cuenta de
            especialista. Te enviaremos instrucciones para recuperar el acceso.
          </p>
          <Input
            id="recover-email"
            type="email"
            label="Correo registrado"
            value={recoverEmail}
            onChange={(e) => onRecoverEmailChange(e.target.value)}
            placeholder="paciente@demo.com"
          />
          {recoverErr && (
            <p role="alert" className="text-xs text-red-600">
              {recoverErr}
            </p>
          )}
          {recoverMsg && (
            <div
              role="status"
              className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-900 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
              <span>{recoverMsg}</span>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onCloseRecover}>
              Cerrar
            </Button>
            <Button type="submit">Enviar enlace de recuperación</Button>
          </div>
        </AsyncForm>
      </Modal>
    </div>
  );
}
