'use client';

import React, {useState} from 'react';
import {
  UserRole,
  UserSession,
  validateAuthCredentials,
  DENTAL_SERVICES,
  PATIENTS_DIRECTORY,
  formatCurrencyMXN,
} from '@/lib/dental-logic';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Phone,
  User,
} from 'lucide-react';

interface AuthClinicSectionProps {
  onSuccessLogin: (session: UserSession, selectedPatientId: string) => void;
  onExploreServices: () => void;
  onSelectServiceAndBook: (serviceId: string) => void;
}

export function AuthClinicSection({
  onSuccessLogin,
  onExploreServices,
  onSelectServiceAndBook,
}: AuthClinicSectionProps) {
  const [authMode, setAuthMode] = useState<'login' | 'registro'>('login');
  const [role, setRole] = useState<UserRole>('paciente');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    fullName?: string;
    phone?: string;
  }>({});
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryNotice(null);

    const validation = validateAuthCredentials({
      email,
      password,
      role,
      mode: authMode,
      fullName,
      phone,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    const matchedPatient =
      PATIENTS_DIRECTORY.find(
        (p) => p.email.toLowerCase() === email.trim().toLowerCase()
      ) || PATIENTS_DIRECTORY[0];

    const resolvedName =
      authMode === 'registro' && fullName.trim()
        ? fullName.trim()
        : role === 'especialista'
        ? 'Dra. Valeria Mendoza'
        : matchedPatient.fullName;

    const session: UserSession = {
      id: role === 'especialista' ? 'usr-doc-01' : `usr-${matchedPatient.id}`,
      patientId: matchedPatient.id,
      fullName: resolvedName,
      email: email.trim(),
      role,
      patientCode:
        role === 'especialista' ? 'CED-PRO-849201' : matchedPatient.patientCode,
      phone: phone.trim() || matchedPatient.phone,
      nextCheckupDate: matchedPatient.nextCheckupDate,
      assignedDoctor: matchedPatient.assignedDoctor,
    };

    onSuccessLogin(session, matchedPatient.id);
  };

  const handleDemoPatientAccess = (patientIndex: number) => {
    setErrors({});
    setRecoveryNotice(null);
    const pat = PATIENTS_DIRECTORY[patientIndex] || PATIENTS_DIRECTORY[0];
    setRole('paciente');
    setEmail(pat.email);
    setPassword('lumina2026');
    onSuccessLogin(
      {
        id: `usr-${pat.id}`,
        patientId: pat.id,
        fullName: pat.fullName,
        email: pat.email,
        role: 'paciente',
        patientCode: pat.patientCode,
        phone: pat.phone,
        nextCheckupDate: pat.nextCheckupDate,
        assignedDoctor: pat.assignedDoctor,
      },
      pat.id
    );
  };

  const handleDemoDoctorAccess = () => {
    setErrors({});
    setRecoveryNotice(null);
    const firstPat = PATIENTS_DIRECTORY[0];
    setRole('especialista');
    setEmail('valeria.mendoza@luminadental.mx');
    setPassword('clinica2026');
    onSuccessLogin(
      {
        id: 'usr-doc-01',
        patientId: firstPat.id,
        fullName: 'Dra. Valeria Mendoza',
        email: 'valeria.mendoza@luminadental.mx',
        role: 'especialista',
        patientCode: 'CED-PRO-849201',
        phone: '+52 55 9102 3340',
        nextCheckupDate: 'Agenda clínica · 3 expedientes activos',
        assignedDoctor: 'Dirección de Ortodoncia Digital',
      },
      firstPat.id
    );
  };

  const handlePasswordRecovery = () => {
    if (!email.trim() || !email.includes('@')) {
      setErrors({
        email: 'Ingresa tu correo arriba para enviarte el enlace de recuperación.',
      });
      return;
    }
    setErrors({});
    setRecoveryNotice(
      `Se envió un enlace seguro de restablecimiento a ${email.trim()}.`
    );
  };

  return (
    <section
      id="acceso-clinico"
      aria-labelledby="login-heading"
      className="max-w-[1280px] mx-auto px-6 py-10 lg:py-14"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Column: Clinic Welcome & Active Dental Services Preview */}
        <div className="lg:col-span-7 bg-white border border-stone-200 rounded-2xl p-6 lg:p-10 flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-teal-800">
              Consultorio Odontológico de Especialidades · Polanco, CDMX
            </p>
            <h1
              id="login-heading"
              className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-semibold text-slate-900 tracking-tight"
              style={{
                fontFamily: 'var(--font-fraunces), serif',
                textWrap: 'balance',
              }}
            >
              Portal de Pacientes, Odontograma Individual y Catálogo de Servicios
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
              Inicia sesión para consultar tu historial médico, citas
              programadas, avance de tratamientos y el odontograma FDI
              individual de cada paciente con asistencia del chatbot clínico.
            </p>

            {/* Quick Summary of Highlighted Services Directly on the Login Screen */}
            <div className="mt-8 border-t border-stone-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-900">
                  Servicios odontológicos disponibles en consultorio
                </h2>
                <button
                  type="button"
                  onClick={onExploreServices}
                  className="text-xs font-semibold text-teal-800 hover:text-teal-950 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                >
                  Ver pantalla de inicio completa
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DENTAL_SERVICES.slice(0, 4).map((srv) => (
                  <div
                    key={srv.id}
                    className="p-4 rounded-xl border border-stone-200 bg-[#FAF9F6] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-mono font-semibold text-teal-800">
                          {srv.indexNumber}. {srv.categoryLabel}
                        </span>
                        <span className="font-mono tabular-nums font-semibold text-slate-900">
                          {formatCurrencyMXN(srv.priceMXN)}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900 mt-1">
                        {srv.name}
                      </h3>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                        {srv.shortDescription}
                      </p>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-stone-200/80 flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        {srv.durationMinutes} min · {srv.specialistName}
                      </span>
                      <button
                        type="button"
                        onClick={() => onSelectServiceAndBook(srv.id)}
                        className="font-semibold text-teal-800 hover:underline cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Agendar cita
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-5 border-t border-stone-200 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
            <span>Horario: Lun – Sáb · 08:30 a 20:00 hrs</span>
            <span aria-hidden="true">·</span>
            <span>Asistente Clínico IA integrado</span>
            <span aria-hidden="true">·</span>
            <span>Expediente protegido NOM-024-SSA3</span>
          </div>
        </div>

        {/* Right Column: Login & Registration Form Card */}
        <div className="lg:col-span-5 bg-white border border-stone-200 rounded-2xl p-6 lg:p-8 flex flex-col justify-between">
          <div>
            {/* Mode Switcher: Iniciar sesión vs Crear expediente */}
            <div
              role="tablist"
              aria-label="Modo de autenticación"
              className="grid grid-cols-2 gap-1 p-1 bg-stone-100 rounded-lg"
            >
              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'login'}
                onClick={() => {
                  setAuthMode('login');
                  setErrors({});
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  authMode === 'login'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'registro'}
                onClick={() => {
                  setAuthMode('registro');
                  setErrors({});
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  authMode === 'registro'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Crear expediente
              </button>
            </div>

            {/* Role Selector */}
            <div className="mt-4">
              <span className="block text-xs font-medium text-slate-600 mb-1.5">
                Tipo de cuenta en el consultorio
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('paciente')}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border text-left transition-colors cursor-pointer ${
                    role === 'paciente'
                      ? 'border-teal-700 bg-teal-50/60 text-teal-950 font-semibold'
                      : 'border-stone-200 text-slate-600 hover:border-stone-300'
                  }`}
                >
                  Paciente / Familiar
                </button>
                <button
                  type="button"
                  onClick={() => setRole('especialista')}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border text-left transition-colors cursor-pointer ${
                    role === 'especialista'
                      ? 'border-teal-700 bg-teal-50/60 text-teal-950 font-semibold'
                      : 'border-stone-200 text-slate-600 hover:border-stone-300'
                  }`}
                >
                  Odontólogo / Clínica
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
              {authMode === 'registro' && (
                <>
                  <div>
                    <label
                      htmlFor="auth-fullname"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      Nombre completo del paciente
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="auth-fullname"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Ej. Lucía Fernández Vega"
                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-[#FAF9F6] border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700"
                      />
                    </div>
                    {errors.fullName && (
                      <p role="alert" className="text-xs text-red-600 mt-1">
                        {errors.fullName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="auth-phone"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      Teléfono móvil (WhatsApp de confirmación)
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="auth-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+52 55 4182 9012"
                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-[#FAF9F6] border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700"
                      />
                    </div>
                    {errors.phone && (
                      <p role="alert" className="text-xs text-red-600 mt-1">
                        {errors.phone}
                      </p>
                    )}
                  </div>
                </>
              )}

              <div>
                <label
                  htmlFor="auth-email"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={
                      role === 'especialista'
                        ? 'valeria.mendoza@luminadental.mx'
                        : 'lucia.fernandez@ejemplo.mx'
                    }
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-[#FAF9F6] border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700"
                  />
                </div>
                {errors.email && (
                  <p role="alert" className="text-xs text-red-600 mt-1">
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="auth-password"
                    className="block text-xs font-medium text-slate-700"
                  >
                    Contraseña de acceso
                  </label>
                  {authMode === 'login' && (
                    <button
                      type="button"
                      onClick={handlePasswordRecovery}
                      className="text-xs text-teal-800 hover:underline cursor-pointer"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-9 pr-10 py-2.5 text-sm bg-[#FAF9F6] border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700"
                  />
                  <button
                    type="button"
                    aria-label={
                      showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                    }
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p role="alert" className="text-xs text-red-600 mt-1">
                    {errors.password}
                  </p>
                )}
              </div>

              {recoveryNotice && (
                <div
                  role="status"
                  className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-900"
                >
                  {recoveryNotice}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-teal-800 hover:bg-teal-900 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                {authMode === 'login'
                  ? 'Ingresar al Consultorio'
                  : 'Crear Expediente e Ingresar'}
              </button>
            </form>
          </div>

          {/* Instant Demo Access Buttons for fast evaluation of multiple patients & doctor */}
          <div className="mt-6 pt-5 border-t border-stone-200">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-2.5">
              <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0" />
              <span>Acceso directo por expediente (1 clic):</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoPatientAccess(0)}
                className="py-2 px-3 text-xs font-medium text-slate-800 bg-stone-100 hover:bg-stone-200/80 rounded-lg transition-colors cursor-pointer whitespace-nowrap truncate"
              >
                Demo Paciente (Lucía)
              </button>
              <button
                type="button"
                onClick={() => handleDemoPatientAccess(1)}
                className="py-2 px-3 text-xs font-medium text-slate-800 bg-stone-100 hover:bg-stone-200/80 rounded-lg transition-colors cursor-pointer whitespace-nowrap truncate"
              >
                Demo Paciente (Carlos)
              </button>
              <button
                type="button"
                onClick={() => handleDemoPatientAccess(2)}
                className="py-2 px-3 text-xs font-medium text-slate-800 bg-stone-100 hover:bg-stone-200/80 rounded-lg transition-colors cursor-pointer whitespace-nowrap truncate"
              >
                Demo Paciente (Roberto)
              </button>
              <button
                type="button"
                onClick={handleDemoDoctorAccess}
                className="py-2 px-3 text-xs font-medium text-teal-950 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap truncate"
              >
                Demo Dra. Valeria
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
