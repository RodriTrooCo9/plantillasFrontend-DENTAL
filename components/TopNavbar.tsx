'use client';

import React from 'react';
import {UserSession} from '@/lib/dental-logic';

interface TopNavbarProps {
  activeView: 'inicio' | 'login' | 'portal';
  userSession: UserSession | null;
  onNavigateView: (view: 'inicio' | 'login' | 'portal', sectionId?: string) => void;
}

export function TopNavbar({
  activeView,
  userSession,
  onNavigateView,
}: TopNavbarProps) {
  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    view: 'inicio' | 'login' | 'portal',
    sectionId?: string
  ) => {
    e.preventDefault();
    onNavigateView(view, sectionId);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAF9F6]/95 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-[1280px] mx-auto flex items-center justify-between gap-8 px-6 py-4">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#inicio"
          onClick={(e) => handleNavClick(e, 'inicio')}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          style={{fontFamily: 'var(--font-fraunces), serif'}}
        >
          Lumina Odontología
        </a>

        {/* Zone 2: 4-5 concise single-line navigation links */}
        <nav
          aria-label="Navegación principal"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
        >
          <a
            href="#inicio"
            onClick={(e) => handleNavClick(e, 'inicio')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'inicio'
                ? 'text-slate-900 underline underline-offset-8 decoration-teal-700 decoration-2'
                : ''
            }`}
          >
            Inicio
          </a>
          <a
            href="#catalogo-servicios"
            onClick={(e) => handleNavClick(e, 'inicio', 'catalogo-servicios')}
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            Servicios
          </a>
          <a
            href="#presupuestador"
            onClick={(e) => handleNavClick(e, 'inicio', 'presupuestador')}
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            Presupuestador
          </a>
          <a
            href="#agendar-cita"
            onClick={(e) => handleNavClick(e, 'inicio', 'agendar-cita')}
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            Agendar Cita
          </a>
          <a
            href="#acceso-clinico"
            onClick={(e) =>
              handleNavClick(e, userSession ? 'portal' : 'login')
            }
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'login' || activeView === 'portal'
                ? 'text-slate-900 underline underline-offset-8 decoration-teal-700 decoration-2'
                : ''
            }`}
          >
            {userSession ? 'Expediente Digital' : 'Acceso Clínico'}
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          {userSession ? (
            <button
              type="button"
              onClick={() =>
                onNavigateView(activeView === 'portal' ? 'inicio' : 'portal')
              }
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-800 rounded-lg hover:bg-teal-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {activeView === 'portal' ? 'Ver Pantalla de Inicio' : 'Ir a Mi Consultorio'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigateView('login')}
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-800 rounded-lg hover:bg-teal-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Iniciar sesión
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
