"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks";
import { repositories } from "@/data/factory";
import { safeNext } from "@/domain/auth-routing";
import { LoginTemplate } from "@/components/templates/LoginTemplate";

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
    demoEmail:
      | "admin@demo.com"
      | "prueba1@demo.com"
      | "prueba2@demo.com"
      | "paciente@demo.com"
      | "dentista@demo.com",
  ) => {
    if (submitting) return;
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
    <LoginTemplate
      mode={repositories.mode}
      email={email}
      password={password}
      formErrors={formErrors}
      submitting={submitting}
      authError={authError}
      recoverOpen={recoverOpen}
      recoverEmail={recoverEmail}
      recoverMsg={recoverMsg}
      recoverErr={recoverErr}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onSubmit={handleSubmit}
      onQuickLogin={handleQuickDemoLogin}
      onOpenRecover={() => {
        setRecoverEmail(email);
        setRecoverOpen(true);
      }}
      onCloseRecover={() => setRecoverOpen(false)}
      onRecoverEmailChange={setRecoverEmail}
      onRecoverSubmit={handleRecoverSubmit}
    />
  );
}
