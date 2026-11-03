"use client";

import { TopNavbar } from "@/components/TopNavbar";

import { AsyncForm } from "@/components/ui/AsyncForm";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks";
import { repositories } from "@/data/factory";
import { safeNext } from "@/domain/auth-routing";
import { Card, Button, Input, Modal } from "@/components/ui";
import { Lock, Mail, ShieldCheck, CheckCircle2, ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, recoverPassword, error: authError } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formErrors, setFormErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);

  // Recuperar contraseña modal
  const [recoverOpen, setRecoverOpen] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState("");
  const [recoverMsg, setRecoverMsg] = useState<string | null>(null);
  const [recoverErr, setRecoverErr] = useState<string | null>(null);

  const validarFormulario = (correo: string, clave: string) => {
    const errs: { email?: string; password?: string } = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!correo.trim()) {
      errs.email = "El correo electrónico es obligatorio.";
    } else if (!emailRegex.test(correo.trim())) {
      errs.email = "Ingresa un formato de correo electrónico válido.";
    }
    if (!clave || clave.trim().length < 6) {
      errs.password = "La contraseña debe tener al menos 6 caracteres.";
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !validarFormulario(email, password)) return;

    setSubmitting(true);
    try {
      const session = await login({ email, password });
      router.replace(
        safeNext(
          new URLSearchParams(window.location.search).get("next"),
          session.rol,
        ),
      );
    } catch {
      // Error manejado por useAuth
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDemoLogin = async (
    demoEmail: "paciente@demo.com" | "dentista@demo.com",
  ) => {
    if (submitting || repositories.mode !== "mock") return;
    setEmail(demoEmail);
    setPassword("123456");
    setFormErrors({});
    setSubmitting(true);
    try {
      const session = await login({ email: demoEmail, password: "123456" });
      router.replace(
        safeNext(
          new URLSearchParams(window.location.search).get("next"),
          session.rol,
        ),
      );
    } catch {
      // useAuth exposes the error to the form.
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecoverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoverErr(null);
    setRecoverMsg(null);
    try {
      const res = await recoverPassword(recoverEmail);
      setRecoverMsg(res.mensaje);
    } catch (err) {
      setRecoverErr(
        err instanceof Error ? err.message : "Error al procesar solicitud.",
      );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg-canvas)] text-[var(--color-text-main)]">
      {repositories.mode === "mock" && (
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
          {/* Columna Izquierda: Explicación de Roles y Credenciales Demo */}
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

              {repositories.mode === "mock" && (
                <div className="mt-6 space-y-3 text-xs">
                  <div className="p-4 rounded-xl bg-[var(--color-bg-canvas)] border border-[var(--color-border-base)]">
                    <div className="flex items-center justify-between font-semibold text-slate-900">
                      <span>Rol PACIENTE → /paciente</span>
                      <span className="font-mono text-teal-800">
                        paciente@demo.com / 123456
                      </span>
                    </div>
                    <p className="text-slate-600 mt-1">
                      Consulta de resumen clínico, historial médico, odontograma
                      de 32 dientes FDI (solo lectura), seguimiento de
                      tratamientos y agendado/cancelación de citas.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[var(--color-bg-canvas)] border border-[var(--color-border-base)]">
                    <div className="flex items-center justify-between font-semibold text-slate-900">
                      <span>Rol DENTISTA → /dentista</span>
                      <span className="font-mono text-teal-800">
                        dentista@demo.com / 123456
                      </span>
                    </div>
                    <p className="text-slate-600 mt-1">
                      Agenda diaria/semanal, bloqueo de horarios, buscador de
                      los 5 pacientes, odontograma editable con auditoría de
                      cambios y gestión de tratamientos.
                    </p>
                  </div>
                </div>
              )}
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

              <form
                onSubmit={handleSubmit}
                noValidate
                className="mt-6 space-y-4"
              >
                <Input
                  id="login-email"
                  type="email"
                  label="Correo electrónico"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                      onClick={() => {
                        setRecoverEmail(email);
                        setRecoverOpen(true);
                      }}
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
                    onChange={(e) => setPassword(e.target.value)}
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

            {/* Botones de Credenciales Demo Oficiales */}
            {repositories.mode === "mock" && (
              <div className="mt-8 pt-5 border-t border-[var(--color-border-base)]">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-3">
                  <ShieldCheck className="w-4 h-4 text-teal-700" />
                  <span>Credenciales Demo Oficiales (1 clic):</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={submitting}
                    onClick={() => handleQuickDemoLogin("paciente@demo.com")}
                  >
                    Entrar como Paciente Demo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={submitting}
                    onClick={() => handleQuickDemoLogin("dentista@demo.com")}
                  >
                    Entrar como Dentista Demo
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </main>

      {/* Modal de Recuperación de Contraseña */}
      <Modal
        isOpen={recoverOpen}
        onClose={() => setRecoverOpen(false)}
        title="Recuperar contraseña de acceso"
      >
        <AsyncForm onSubmit={handleRecoverSubmit} className="space-y-4">
          <p className="text-xs text-slate-600">
            Ingresa el correo electrónico asociado a tu expediente o cuenta de
            especialista. Te enviaremos instrucciones para recuperar el acceso.
          </p>
          <Input
            id="recover-email"
            type="email"
            label="Correo registrado"
            value={recoverEmail}
            onChange={(e) => setRecoverEmail(e.target.value)}
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
            <Button
              type="button"
              variant="ghost"
              onClick={() => setRecoverOpen(false)}
            >
              Cerrar
            </Button>
            <Button type="submit">Enviar enlace de recuperación</Button>
          </div>
        </AsyncForm>
      </Modal>
    </div>
  );
}
