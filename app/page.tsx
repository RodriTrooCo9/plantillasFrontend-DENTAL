'use client';

import React, {useState, useEffect} from 'react';
import {
  DENTAL_SERVICES,
  PATIENTS_DIRECTORY,
  INITIAL_APPOINTMENTS,
  ServiceCategory,
  UserSession,
  AppointmentRecord,
  PatientClinicalProfile,
  filterDentalServices,
  calculateTreatmentBudget,
  validateBookingInput,
  cycleToothCondition,
  formatCurrencyMXN,
} from '@/lib/dental-logic';
import {TopNavbar} from '@/components/TopNavbar';
import {HeroClinicVisual} from '@/components/ClinicalVisuals';
import {AuthClinicSection} from '@/components/AuthClinicSection';
import {ServicesCatalogSection} from '@/components/ServicesCatalogSection';
import {
  PatientPortalDashboard,
  PortalTab,
} from '@/components/PatientPortalDashboard';
import {ClinicalChatbotWidget} from '@/components/ClinicalChatbotWidget';
import {
  CheckCircle2,
  ArrowRight,
  Lock,
  MessageSquare,
} from 'lucide-react';

export default function DentalClinicApp() {
  const [activeView, setActiveView] = useState<'inicio' | 'login' | 'portal'>(
    'inicio'
  );
  const [userSession, setUserSession] = useState<UserSession | null>(null);

  // Multi-patient state (each patient has their own odontogram, medical history, and treatments)
  const [patients, setPatients] =
    useState<PatientClinicalProfile[]>(PATIENTS_DIRECTORY);
  const [activePatientId, setActivePatientId] = useState<string>(
    PATIENTS_DIRECTORY[0].id
  );
  const [activePortalTab, setActivePortalTab] =
    useState<PortalTab>('odontograma');

  // Clinical Chatbot state
  const [isChatbotOpen, setIsChatbotOpen] = useState<boolean>(false);

  // Catalog filter & search state
  const [selectedCategory, setSelectedCategory] =
    useState<ServiceCategory>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Budget estimator state
  const [selectedBudgetIds, setSelectedBudgetIds] = useState<string[]>([
    'srv-ortodoncia-3d',
    'srv-profilaxis-airflow',
  ]);
  const [financingMonths, setFinancingMonths] = useState<1 | 3 | 6 | 12>(6);
  const [hasInsurancePlan, setHasInsurancePlan] = useState<boolean>(false);

  // Appointments state
  const [appointments, setAppointments] =
    useState<AppointmentRecord[]>(INITIAL_APPOINTMENTS);

  // Direct booking form state
  const [bookingServiceId, setBookingServiceId] =
    useState<string>('srv-ortodoncia-3d');
  const [bookingName, setBookingName] = useState<string>('');
  const [bookingEmail, setBookingEmail] = useState<string>('');
  const [bookingPhone, setBookingPhone] = useState<string>('');
  const [bookingDate, setBookingDate] = useState<string>('2026-11-12');
  const [bookingTime, setBookingTime] = useState<string>('11:00');
  const [bookingNotes, setBookingNotes] = useState<string>('');
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] =
    useState<AppointmentRecord | null>(null);

  const activePatient =
    patients.find((p) => p.id === activePatientId) || patients[0];

  // Support ?autostart=1 to jump directly to authenticated clinic portal
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        const pat = PATIENTS_DIRECTORY[0];
        setUserSession({
          id: `usr-${pat.id}`,
          patientId: pat.id,
          fullName: pat.fullName,
          email: pat.email,
          role: 'paciente',
          patientCode: pat.patientCode,
          phone: pat.phone,
          nextCheckupDate: pat.nextCheckupDate,
          assignedDoctor: pat.assignedDoctor,
        });
        setActivePatientId(pat.id);
        setActiveView('portal');
      }
    }
  }, []);

  const filteredServices = filterDentalServices(
    DENTAL_SERVICES,
    selectedCategory,
    searchQuery
  );

  const budgetSummary = calculateTreatmentBudget(
    DENTAL_SERVICES,
    selectedBudgetIds,
    financingMonths,
    hasInsurancePlan
  );

  const handleNavigateView = (
    view: 'inicio' | 'login' | 'portal',
    sectionId?: string
  ) => {
    setActiveView(view);
    if (sectionId) {
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({behavior: 'smooth'});
      }, 60);
    } else if (typeof window !== 'undefined') {
      window.scrollTo({top: 0, behavior: 'smooth'});
    }
  };

  const handleToggleBudgetService = (serviceId: string) => {
    setSelectedBudgetIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSelectServiceAndBook = (serviceId: string) => {
    setBookingServiceId(serviceId);
    setBookingSuccess(null);
    setBookingError(null);
    setActiveView('inicio');
    setTimeout(() => {
      const el = document.getElementById('agendar-cita');
      if (el) el.scrollIntoView({behavior: 'smooth'});
    }, 60);
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);
    setBookingSuccess(null);

    const validation = validateBookingInput({
      patientName: bookingName,
      patientEmail: bookingEmail,
      patientPhone: bookingPhone,
      serviceId: bookingServiceId,
      date: bookingDate,
      time: bookingTime,
      notes: bookingNotes,
    });

    if (!validation.valid) {
      setBookingError(validation.error || 'Verifica los datos ingresados.');
      return;
    }

    const chosenService =
      DENTAL_SERVICES.find((s) => s.id === bookingServiceId) ||
      DENTAL_SERVICES[0];

    const newRecord: AppointmentRecord = {
      id: `apt-${Date.now().toString().slice(-4)}`,
      patientId: activePatient.id,
      patientName: bookingName.trim(),
      patientEmail: bookingEmail.trim(),
      patientPhone: bookingPhone.trim(),
      serviceId: chosenService.id,
      serviceName: chosenService.name,
      specialistName: chosenService.specialistName,
      date: bookingDate,
      time: bookingTime,
      status: 'Confirmada',
      notes:
        bookingNotes.trim() ||
        'Primera valoración clínica + escaneo intraoral 3D.',
      priceMXN: chosenService.priceMXN,
    };

    setAppointments((prev) => [newRecord, ...prev]);
    setBookingSuccess(newRecord);
    setBookingName('');
    setBookingEmail('');
    setBookingPhone('');
    setBookingNotes('');
  };

  const handleUpdateToothForPatient = (
    patientId: string,
    toothNumber: number,
    customNote?: string
  ) => {
    setPatients((prev) =>
      prev.map((pat) => {
        if (pat.id !== patientId) return pat;
        return {
          ...pat,
          odontogram: pat.odontogram.map((tooth) => {
            if (tooth.toothNumber !== toothNumber) return tooth;
            const nextCondition = customNote
              ? tooth.condition
              : cycleToothCondition(tooth.condition);
            return {
              ...tooth,
              condition: nextCondition,
              lastUpdated: '2026-11-02',
              clinicalNote:
                customNote ||
                `Estado actualizado a "${nextCondition}" en revisión clínica.`,
            };
          }),
        };
      })
    );
  };

  const handleAddMedicalHistoryNote = (
    patientId: string,
    title: string,
    summary: string
  ) => {
    setPatients((prev) =>
      prev.map((pat) => {
        if (pat.id !== patientId) return pat;
        return {
          ...pat,
          medicalHistory: [
            {
              id: `mh-${Date.now()}`,
              date: '2026-11-02',
              title,
              category: 'Procedimiento Clínico',
              specialistName: pat.assignedDoctor,
              summary,
              vitalObservations: 'Registrado en expediente clínico digital.',
            },
            ...pat.medicalHistory,
          ],
        };
      })
    );
  };

  const handleUpdateAppointmentStatus = (
    appointmentId: string,
    status: AppointmentRecord['status']
  ) => {
    setAppointments((prev) =>
      prev.map((apt) => (apt.id === appointmentId ? {...apt, status} : apt))
    );
  };

  const handleChatbotNavigateToTab = (tab: PortalTab) => {
    if (!userSession) {
      setUserSession({
        id: `usr-${activePatient.id}`,
        patientId: activePatient.id,
        fullName: activePatient.fullName,
        email: activePatient.email,
        role: 'paciente',
        patientCode: activePatient.patientCode,
        phone: activePatient.phone,
        nextCheckupDate: activePatient.nextCheckupDate,
        assignedDoctor: activePatient.assignedDoctor,
      });
    }
    setActivePortalTab(tab);
    setActiveView('portal');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-slate-900">
      <TopNavbar
        activeView={activeView}
        userSession={userSession}
        onNavigateView={handleNavigateView}
      />

      <main className="flex-1 pb-20">
        {/* Compact inline workspace mode selector inside main content */}
        <div className="max-w-[1280px] mx-auto px-6 pt-6 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <span className="font-medium text-slate-800">
              Av. Presidente Masaryk 340, Polanco
            </span>
            <span aria-hidden="true">·</span>
            <span>Lunes a Sábado 08:30 – 20:00 hrs</span>
          </div>

          <div
            role="group"
            aria-label="Cambiar vista del consultorio"
            className="inline-flex flex-wrap items-center gap-1 p-1 bg-stone-200/70 rounded-lg"
          >
            <button
              type="button"
              onClick={() => handleNavigateView('inicio')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeView === 'inicio'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pantalla de Inicio y Servicios
            </button>
            <button
              type="button"
              onClick={() => handleNavigateView('login')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeView === 'login'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Login del Consultorio
            </button>
            <button
              type="button"
              onClick={() => {
                if (!userSession) {
                  setUserSession({
                    id: `usr-${activePatient.id}`,
                    patientId: activePatient.id,
                    fullName: activePatient.fullName,
                    email: activePatient.email,
                    role: 'paciente',
                    patientCode: activePatient.patientCode,
                    phone: activePatient.phone,
                    nextCheckupDate: activePatient.nextCheckupDate,
                    assignedDoctor: activePatient.assignedDoctor,
                  });
                }
                setActiveView('portal');
              }}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeView === 'portal'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Expediente y Odontograma ({activePatient.fullName.split(' ')[0]})
            </button>
            <button
              type="button"
              onClick={() => setIsChatbotOpen((prev) => !prev)}
              className="px-3 py-1.5 rounded-md font-semibold text-teal-900 hover:bg-white/70 inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <MessageSquare className="w-3.5 h-3.5 text-teal-800" />
              Asistente IA
            </button>
          </div>
        </div>

        {/* VIEW 1: Dedicated Login Screen when activeView === 'login' */}
        {activeView === 'login' && (
          <AuthClinicSection
            onSuccessLogin={(session, selectedPatId) => {
              setUserSession(session);
              setActivePatientId(selectedPatId);
              setActiveView('portal');
            }}
            onExploreServices={() =>
              handleNavigateView('inicio', 'catalogo-servicios')
            }
            onSelectServiceAndBook={handleSelectServiceAndBook}
          />
        )}

        {/* VIEW 2: Authenticated Patient/Doctor Portal when activeView === 'portal' */}
        {activeView === 'portal' && userSession && (
          <PatientPortalDashboard
            userSession={userSession}
            activePatient={activePatient}
            allPatients={patients}
            appointments={appointments}
            services={DENTAL_SERVICES}
            activeTab={activePortalTab}
            onChangeTab={setActivePortalTab}
            onSelectPatientId={setActivePatientId}
            onUpdateTooth={handleUpdateToothForPatient}
            onAddMedicalHistoryNote={handleAddMedicalHistoryNote}
            onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
            onNewAppointmentForService={handleSelectServiceAndBook}
            onOpenClinicalChatbot={() => setIsChatbotOpen(true)}
            onNavigateToHomeServices={() => handleNavigateView('inicio')}
            onLogout={() => {
              setUserSession(null);
              setActiveView('login');
            }}
          />
        )}

        {/* VIEW 3: Complete Home Screen + Embedded Login & Services when activeView === 'inicio' */}
        {activeView === 'inicio' && (
          <>
            {/* HERO SECTION */}
            <section
              id="inicio"
              className="max-w-[1280px] mx-auto px-6 pt-10 pb-12 lg:py-16"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
                {/* Left Column: Value Proposition + Embedded Quick Login Card */}
                <div className="lg:col-span-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-teal-800 font-medium">
                      <span>Odontología Digital y Rehabilitación Oral</span>
                      <span aria-hidden="true">·</span>
                      <span>Certificación COFEPRIS 260911</span>
                    </div>

                    <h1
                      className="mt-3 text-slate-900 font-semibold tracking-tight leading-[1.12]"
                      style={{
                        fontFamily: 'var(--font-fraunces), serif',
                        fontSize: 'clamp(2.25rem, 3.8vw, 3.5rem)',
                        textWrap: 'balance',
                      }}
                    >
                      Odontología de alta precisión diseñada para tu tranquilidad
                    </h1>

                    <p className="mt-4 text-base text-slate-600 leading-relaxed max-w-xl">
                      Combinamos tomografía 3D, ortodoncia invisible y cerámica
                      dental mínimamente invasiva con un portal donde cada
                      paciente cuenta con su odontograma individual y un
                      asistente clínico inteligente para revisar historial,
                      citas y tratamientos.
                    </p>

                    <div className="mt-7 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          handleNavigateView('inicio', 'catalogo-servicios')
                        }
                        className="px-5 py-3 text-xs sm:text-sm font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-lg inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Explorar servicios dentales
                        <ArrowRight className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsChatbotOpen(true)}
                        className="px-5 py-3 text-xs sm:text-sm font-semibold text-slate-900 bg-white border border-stone-300 hover:bg-stone-100 rounded-lg inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <MessageSquare className="w-4 h-4 text-teal-800" />
                        Abrir Chatbot de Historial y Citas
                      </button>
                    </div>
                  </div>

                  {/* Direct Patient/Doctor Access Card inside the Home Screen */}
                  <div className="mt-8 bg-white border border-stone-200 rounded-2xl p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h2 className="text-sm font-semibold text-slate-900">
                          {userSession
                            ? `Sesión activa: ${activePatient.fullName}`
                            : 'Expediente Digital y Odontograma por Paciente'}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {userSession
                            ? `Expediente ${activePatient.patientCode} · Próxima cita: ${activePatient.nextCheckupDate}`
                            : 'Revisa el odontograma personalizado de cada paciente, su historial médico y sus tratamientos activos.'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleNavigateView(userSession ? 'portal' : 'login')
                        }
                        className="px-3.5 py-2 text-xs font-semibold text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        {userSession
                          ? 'Abrir mi expediente'
                          : 'Iniciar sesión'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column: Architectural & Clinical 3D Showcase */}
                <div className="lg:col-span-6">
                  <HeroClinicVisual
                    onSelectQuickService={handleSelectServiceAndBook}
                  />
                </div>
              </div>

              {/* Full-Width 4-Column Clinical Proof Strip below Hero Split */}
              <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-8 border-t border-stone-200">
                <div className="bg-white border border-stone-200 rounded-xl p-5">
                  <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                    98.6%
                  </p>
                  <p className="text-xs font-semibold text-slate-800 mt-1">
                    Éxito en Implantología Guiada
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Seguimiento clínico documentado en 1,420 implantes
                    (2018–2026)
                  </p>
                </div>

                <div className="bg-white border border-stone-200 rounded-xl p-5">
                  <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                    -35% tiempo
                  </p>
                  <p className="text-xs font-semibold text-slate-800 mt-1">
                    En Ortodoncia Invisible 3D
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Planificación digital milimétrica con escáner óptico iTero 5D
                  </p>
                </div>

                <div className="bg-white border border-stone-200 rounded-xl p-5">
                  <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                    10 años
                  </p>
                  <p className="text-xs font-semibold text-slate-800 mt-1">
                    Garantía Escrita en Prótesis
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Cerámica de disilicato de litio y zirconio monolítico
                    certificado
                  </p>
                </div>

                <div className="bg-white border border-stone-200 rounded-xl p-5">
                  <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                    12 MSI
                  </p>
                  <p className="text-xs font-semibold text-slate-800 mt-1">
                    Financiamiento y Aseguradoras
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Convenio directo con Dentegra, Seguros Monterrey, GNP y AXA
                  </p>
                </div>
              </div>
            </section>

            {/* INTEGRATED LOGIN & EXPEDIENTE SECTION ON HOME PAGE */}
            <AuthClinicSection
              onSuccessLogin={(session, selectedPatId) => {
                setUserSession(session);
                setActivePatientId(selectedPatId);
                setActiveView('portal');
              }}
              onExploreServices={() =>
                handleNavigateView('inicio', 'catalogo-servicios')
              }
              onSelectServiceAndBook={handleSelectServiceAndBook}
            />

            {/* SERVICES CATALOG SECTION */}
            <ServicesCatalogSection
              services={filteredServices}
              selectedCategory={selectedCategory}
              searchQuery={searchQuery}
              selectedBudgetIds={selectedBudgetIds}
              onCategoryChange={setSelectedCategory}
              onSearchChange={setSearchQuery}
              onToggleBudgetService={handleToggleBudgetService}
              onBookService={handleSelectServiceAndBook}
            />

            {/* INTERACTIVE TREATMENT BUDGET & FINANCING CALCULATOR */}
            <section
              id="presupuestador"
              aria-labelledby="budget-heading"
              className="max-w-[1280px] mx-auto px-6 py-14 border-t border-stone-200"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-7">
                  <p className="text-xs font-medium text-teal-800">
                    Transparencia Clínica desde el Primer Día
                  </p>
                  <h2
                    id="budget-heading"
                    className="mt-1 text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight"
                    style={{
                      fontFamily: 'var(--font-fraunces), serif',
                      textWrap: 'balance',
                    }}
                  >
                    Simulador de Presupuesto y Plan Dental Personalizado
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Selecciona uno o varios servicios para estimar tu inversión,
                    aplicar descuentos por tratamiento integral o convenio de
                    aseguradora y calcular mensualidades sin intereses.
                  </p>

                  <div className="mt-6 space-y-2.5">
                    {DENTAL_SERVICES.map((srv) => {
                      const isChecked = selectedBudgetIds.includes(srv.id);
                      return (
                        <div
                          key={srv.id}
                          onClick={() => handleToggleBudgetService(srv.id)}
                          className={`p-4 rounded-xl border transition-colors flex items-center justify-between gap-4 cursor-pointer ${
                            isChecked
                              ? 'bg-teal-50/50 border-teal-700'
                              : 'bg-white border-stone-200 hover:border-stone-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              aria-label={`Incluir ${srv.name} en el presupuesto`}
                              className="w-4 h-4 accent-teal-800 rounded cursor-pointer"
                            />
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {srv.indexNumber}. {srv.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {srv.categoryLabel} · {srv.durationMinutes} min ·{' '}
                                {srv.specialistName}
                              </p>
                            </div>
                          </div>
                          <span className="text-sm font-mono tabular-nums font-semibold text-slate-900 shrink-0">
                            {formatCurrencyMXN(srv.priceMXN)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right Column: Live Budget Breakdown Card */}
                <div className="lg:col-span-5 bg-white border border-stone-200 rounded-2xl p-6 lg:p-8">
                  <h3 className="text-base font-semibold text-slate-900">
                    Resumen de tu Plan Odontológico
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {budgetSummary.selectedServices.length} servicio(s)
                    seleccionado(s) · Tiempo clínico estimado:{' '}
                    <span className="font-mono tabular-nums">
                      {budgetSummary.totalDurationMinutes} min
                    </span>
                  </p>

                  {/* Financing Months Selector */}
                  <div className="mt-5">
                    <span className="block text-xs font-medium text-slate-700 mb-1.5">
                      Plazo de pago (Meses sin intereses)
                    </span>
                    <div className="grid grid-cols-4 gap-1.5 p-1 bg-stone-100 rounded-lg">
                      {([1, 3, 6, 12] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setFinancingMonths(m)}
                          className={`py-1.5 px-2 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                            financingMonths === m
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {m === 1 ? 'Contado' : `${m} MSI`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dental Insurance Toggle */}
                  <div className="mt-4">
                    <label className="flex items-center justify-between p-3 rounded-lg bg-[#FAF9F6] border border-stone-200 cursor-pointer">
                      <span className="text-xs font-medium text-slate-800">
                        Tengo seguro dental o convenio empresarial (-12%)
                      </span>
                      <input
                        type="checkbox"
                        checked={hasInsurancePlan}
                        onChange={(e) => setHasInsurancePlan(e.target.checked)}
                        className="w-4 h-4 accent-teal-800 rounded"
                      />
                    </label>
                  </div>

                  <div className="mt-6 pt-5 border-t border-stone-200 space-y-2.5 text-sm">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Subtotal arancel clínico</span>
                      <span className="font-mono tabular-nums">
                        {formatCurrencyMXN(budgetSummary.subtotalMXN)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-teal-800">
                      <span>
                        {hasInsurancePlan
                          ? 'Bonificación convenio aseguradora (12%)'
                          : budgetSummary.selectedServices.length >= 2
                          ? 'Descuento plan integral (8%)'
                          : 'Descuento aplicable'}
                      </span>
                      <span className="font-mono tabular-nums">
                        -{formatCurrencyMXN(budgetSummary.discountMXN)}
                      </span>
                    </div>
                    <div className="pt-3 border-t border-stone-200 flex items-baseline justify-between">
                      <span className="font-semibold text-slate-900">
                        Total estimado
                      </span>
                      <span className="text-xl font-bold font-mono tabular-nums text-slate-900">
                        {formatCurrencyMXN(budgetSummary.totalMXN)}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200 flex items-center justify-between">
                      <span className="text-xs font-medium text-teal-950">
                        {financingMonths === 1
                          ? 'Pago único en clínica'
                          : `${financingMonths} pagos mensuales de`}
                      </span>
                      <span className="text-base font-bold font-mono tabular-nums text-teal-900">
                        {formatCurrencyMXN(budgetSummary.monthlyInstallmentMXN)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (budgetSummary.selectedServices[0]) {
                        handleSelectServiceAndBook(
                          budgetSummary.selectedServices[0].id
                        );
                      } else {
                        handleSelectServiceAndBook('srv-ortodoncia-3d');
                      }
                    }}
                    className="mt-6 w-full py-3 px-4 bg-teal-800 hover:bg-teal-900 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Agendar valoración con este presupuesto
                  </button>
                </div>
              </div>
            </section>

            {/* DIRECT APPOINTMENT BOOKING SECTION */}
            <section
              id="agendar-cita"
              aria-labelledby="booking-heading"
              className="max-w-[1280px] mx-auto px-6 py-14 border-t border-stone-200"
            >
              <div className="bg-white border border-stone-200 rounded-2xl p-6 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-5 flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-medium text-teal-800">
                      Confirmación Inmediata en Línea
                    </p>
                    <h2
                      id="booking-heading"
                      className="mt-1 text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight"
                      style={{
                        fontFamily: 'var(--font-fraunces), serif',
                        textWrap: 'balance',
                      }}
                    >
                      Reserva tu Cita en el Consultorio
                    </h2>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                      Elige el servicio dental de tu interés y el horario que
                      prefieras. Tu cita quedará registrada de inmediato en la
                      agenda clínica.
                    </p>

                    <div className="mt-6 space-y-4 text-xs text-slate-600">
                      <div className="p-4 rounded-xl bg-[#FAF9F6] border border-stone-200">
                        <p className="font-semibold text-slate-900">
                          ¿Qué incluye tu primera visita?
                        </p>
                        <p className="mt-1">
                          Escaneo intraoral 3D, radiografía panorámica digital,
                          revisión periodontal completa y apertura de tu
                          odontograma digital.
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-[#FAF9F6] border border-stone-200">
                        <p className="font-semibold text-slate-900">
                          Testimonio de paciente verificado
                        </p>
                        <p className="mt-1 italic text-slate-700">
                          &ldquo;Con el chatbot clínico revisé mis citas y el
                          estado de mis carillas cerámicas en mi odontograma
                          personal en segundos.&rdquo;
                        </p>
                        <p className="mt-1.5 font-medium text-slate-900">
                          — Arq. Roberto Méndez · Expediente EXP-2026-0519
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="mt-6 text-xs text-slate-500">
                    Estacionamiento con valet parking sin costo para pacientes ·
                    Acceso adaptado.
                  </p>
                </div>

                <div className="lg:col-span-7">
                  <form
                    onSubmit={handleBookingSubmit}
                    noValidate
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="book-name"
                          className="block text-xs font-medium text-slate-700 mb-1"
                        >
                          Nombre completo del paciente
                        </label>
                        <input
                          id="book-name"
                          type="text"
                          value={bookingName}
                          onChange={(e) => setBookingName(e.target.value)}
                          placeholder="Ej. Andrea Morales Soto"
                          className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F6] border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="book-email"
                          className="block text-xs font-medium text-slate-700 mb-1"
                        >
                          Correo electrónico
                        </label>
                        <input
                          id="book-email"
                          type="email"
                          value={bookingEmail}
                          onChange={(e) => setBookingEmail(e.target.value)}
                          placeholder="andrea.morales@ejemplo.mx"
                          className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F6] border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="book-phone"
                          className="block text-xs font-medium text-slate-700 mb-1"
                        >
                          Teléfono de contacto
                        </label>
                        <input
                          id="book-phone"
                          type="tel"
                          value={bookingPhone}
                          onChange={(e) => setBookingPhone(e.target.value)}
                          placeholder="+52 55 1234 5678"
                          className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F6] border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="book-service"
                          className="block text-xs font-medium text-slate-700 mb-1"
                        >
                          Servicio odontológico
                        </label>
                        <select
                          id="book-service"
                          value={bookingServiceId}
                          onChange={(e) => setBookingServiceId(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F6] border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700"
                        >
                          {DENTAL_SERVICES.map((srv) => (
                            <option key={srv.id} value={srv.id}>
                              {srv.indexNumber}. {srv.name} (
                              {formatCurrencyMXN(srv.priceMXN)})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="book-date"
                          className="block text-xs font-medium text-slate-700 mb-1"
                        >
                          Fecha preferida
                        </label>
                        <input
                          id="book-date"
                          type="date"
                          value={bookingDate}
                          onChange={(e) => setBookingDate(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums bg-[#FAF9F6] border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="book-time"
                          className="block text-xs font-medium text-slate-700 mb-1"
                        >
                          Horario disponible
                        </label>
                        <select
                          id="book-time"
                          value={bookingTime}
                          onChange={(e) => setBookingTime(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums bg-[#FAF9F6] border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700"
                        >
                          <option value="09:00">09:00 hrs · Matutino</option>
                          <option value="11:00">11:00 hrs · Matutino</option>
                          <option value="13:00">13:00 hrs · Mediodía</option>
                          <option value="16:30">16:30 hrs · Vespertino</option>
                          <option value="18:00">18:00 hrs · Vespertino</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="book-notes"
                        className="block text-xs font-medium text-slate-700 mb-1"
                      >
                        Motivo de consulta o comentarios clínicos (opcional)
                      </label>
                      <textarea
                        id="book-notes"
                        rows={2}
                        value={bookingNotes}
                        onChange={(e) => setBookingNotes(e.target.value)}
                        placeholder="Ej. Deseo valoración para alineadores invisibles o sensibilidad dental..."
                        className="w-full px-3.5 py-2 text-sm bg-[#FAF9F6] border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700"
                      />
                    </div>

                    {bookingError && (
                      <div
                        role="alert"
                        className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700"
                      >
                        {bookingError}
                      </div>
                    )}

                    {bookingSuccess && (
                      <div
                        role="status"
                        className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-950 space-y-1"
                      >
                        <p className="font-semibold text-sm flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-teal-700" />
                          ¡Cita reservada con éxito para{' '}
                          {bookingSuccess.patientName}!
                        </p>
                        <p>
                          Servicio: <strong>{bookingSuccess.serviceName}</strong>{' '}
                          · Fecha:{' '}
                          <span className="font-mono">
                            {bookingSuccess.date}
                          </span>{' '}
                          a las{' '}
                          <span className="font-mono">
                            {bookingSuccess.time}
                          </span>{' '}
                          hrs con {bookingSuccess.specialistName}.
                        </p>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-3 px-5 bg-teal-800 hover:bg-teal-900 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Confirmar cita en consultorio
                    </button>
                  </form>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Integrated Clinical Chatbot Widget */}
      <ClinicalChatbotWidget
        isOpen={isChatbotOpen}
        onToggleOpen={() => setIsChatbotOpen((prev) => !prev)}
        activePatient={activePatient}
        allPatients={patients}
        appointments={appointments}
        onSelectPatientId={setActivePatientId}
        onNavigateToPortalTab={handleChatbotNavigateToTab}
      />

      {/* Quiet Footer */}
      <footer className="border-t border-stone-200 bg-white mt-16">
        <div className="max-w-[1280px] mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <span
              className="font-bold text-slate-900 mr-2"
              style={{fontFamily: 'var(--font-fraunces), serif'}}
            >
              Lumina Odontología
            </span>
            <span>
              © 2026 Consultorio Dental de Especialidades S.C. Todos los
              derechos reservados.
            </span>
          </div>
          <div className="flex items-center gap-5">
            <a
              href="#catalogo-servicios"
              onClick={(e) => {
                e.preventDefault();
                handleNavigateView('inicio', 'catalogo-servicios');
              }}
              className="hover:text-slate-900"
            >
              Servicios
            </a>
            <a
              href="#presupuestador"
              onClick={(e) => {
                e.preventDefault();
                handleNavigateView('inicio', 'presupuestador');
              }}
              className="hover:text-slate-900"
            >
              Presupuestador
            </a>
            <a
              href="#acceso-clinico"
              onClick={(e) => {
                e.preventDefault();
                handleNavigateView('login');
              }}
              className="hover:text-slate-900"
            >
              Acceso Pacientes
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
