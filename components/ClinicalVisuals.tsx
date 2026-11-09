'use client';

import React from 'react';
import {DentalService} from '@/lib/dental-logic';

export function HeroClinicVisual({
  onSelectQuickService,
}: {
  onSelectQuickService: (serviceId: string) => void;
}) {
  return (
    <div className="relative w-full h-full min-h-[420px] rounded-2xl overflow-hidden border border-stone-200 bg-[#F2EFE9] flex flex-col justify-between p-6 lg:p-8">
      {/* Architectural sunlight & studio geometry backdrop */}
      <svg
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        viewBox="0 0 800 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="warmSunlight" x1="0" y1="0" x2="800" y2="600" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FBF9F5" />
            <stop offset="50%" stopColor="#EFECE6" />
            <stop offset="100%" stopColor="#E2DDD3" />
          </linearGradient>
          <linearGradient id="tealGlass" x1="150" y1="80" x2="650" y2="500" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0F766E" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#115E59" stopOpacity="0.03" />
          </linearGradient>
          <linearGradient id="enamelSheen" x1="300" y1="140" x2="520" y2="420" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="65%" stopColor="#F5F5F4" />
            <stop offset="100%" stopColor="#E7E5E4" />
          </linearGradient>
        </defs>

        <rect width="800" height="600" fill="url(#warmSunlight)" />

        {/* Architectural travertine grid & window shadows */}
        <line x1="120" y1="0" x2="120" y2="600" stroke="#D6D1C7" strokeWidth="1" />
        <line x1="400" y1="0" x2="400" y2="600" stroke="#D6D1C7" strokeWidth="1" strokeDasharray="4 6" />
        <line x1="680" y1="0" x2="680" y2="600" stroke="#D6D1C7" strokeWidth="1" />
        <line x1="0" y1="140" x2="800" y2="140" stroke="#D6D1C7" strokeWidth="1" />
        <line x1="0" y1="460" x2="800" y2="460" stroke="#D6D1C7" strokeWidth="1" />

        {/* Soft architectural arch representing boutique clinic suite */}
        <path
          d="M210 520V230C210 125.066 295.066 40 400 40C504.934 40 590 125.066 590 230V520H210Z"
          fill="url(#tealGlass)"
          stroke="#0F766E"
          strokeOpacity="0.22"
          strokeWidth="1.5"
        />

        {/* Concentric 3D scanner calibration rings */}
        <circle
          cx="400"
          cy="265"
          r="138"
          stroke="#0F766E"
          strokeOpacity="0.18"
          strokeWidth="1"
          strokeDasharray="3 5"
        />
        <circle
          cx="400"
          cy="265"
          r="104"
          stroke="#0F766E"
          strokeOpacity="0.25"
          strokeWidth="1"
        />

        {/* Precision anatomical molar & implant CAD/CAM sculpture */}
        <path
          d="M342 205C342 176 368 162 400 174C432 162 458 176 458 205C458 232 446 254 440 282C435 308 428 342 417 342C407 342 405 302 400 302C395 302 393 342 383 342C372 342 365 308 360 282C354 254 342 232 342 205Z"
          fill="url(#enamelSheen)"
          stroke="#0F766E"
          strokeWidth="2"
        />
        {/* Occlusal harmonic curve */}
        <path
          d="M366 202C380 214 420 214 434 202"
          stroke="#0F766E"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        <path
          d="M400 176V224"
          stroke="#0F766E"
          strokeOpacity="0.4"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>

      {/* Top clinical header overlay */}
      <div className="relative z-10 flex items-center justify-between gap-4 border-b border-stone-300/80 pb-4">
        <div>
          <p className="text-xs font-medium text-teal-800">
            Suite Clínica Polanco · Escaneo Intraoral iTero 5D
          </p>
          <p className="text-sm font-semibold text-slate-900 mt-0.5">
            Diagnóstico Digital Tridimensional en Primera Consulta
          </p>
        </div>
        <span className="text-xs font-mono tabular-nums text-slate-600 shrink-0">
          ISO-13485 · COFEPRIS
        </span>
      </div>

      {/* Center spacer with unobstructed anatomical view and clean caption */}
      <div className="relative z-10 mt-auto pt-44 pb-4 flex flex-col items-center text-center pointer-events-none">
        <p className="text-xs font-medium text-slate-700 bg-[#FAF9F6]/90 px-3 py-1 rounded-md border border-stone-200/80">
          Simulación digital 3D · Precisión óptica de 20 micras · 0% radiación
        </p>
      </div>

      {/* Bottom interactive service shortcuts separated by clean hairline dividers */}
      <div className="relative z-10 border-t border-stone-300/80 pt-4">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-semibold text-slate-900">
            Servicios destacados en consultorio
          </span>
          <span className="text-xs text-teal-800 font-mono tabular-nums font-medium">
            Selección directa
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => onSelectQuickService('srv-ortodoncia-3d')}
            className="text-left px-3 py-2 rounded-lg bg-white/90 hover:bg-white border border-stone-200/90 hover:border-teal-700 transition-colors group cursor-pointer"
          >
            <p className="text-xs font-semibold text-slate-900 group-hover:text-teal-800 whitespace-nowrap truncate">
              01. Ortodoncia 3D
            </p>
            <p className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5 whitespace-nowrap">
              Bs 42.000,00 · 60 min
            </p>
          </button>
          <button
            type="button"
            onClick={() => onSelectQuickService('srv-implante-zirconio')}
            className="text-left px-3 py-2 rounded-lg bg-white/90 hover:bg-white border border-stone-200/90 hover:border-teal-700 transition-colors group cursor-pointer"
          >
            <p className="text-xs font-semibold text-slate-900 group-hover:text-teal-800 whitespace-nowrap truncate">
              02. Implante Zirconio
            </p>
            <p className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5 whitespace-nowrap">
              Bs 24.500,00 · 90 min
            </p>
          </button>
          <button
            type="button"
            onClick={() => onSelectQuickService('srv-diseno-sonrisa')}
            className="text-left px-3 py-2 rounded-lg bg-white/90 hover:bg-white border border-stone-200/90 hover:border-teal-700 transition-colors group cursor-pointer"
          >
            <p className="text-xs font-semibold text-slate-900 group-hover:text-teal-800 whitespace-nowrap truncate">
              03. Lentes Cerámicos
            </p>
            <p className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5 whitespace-nowrap">
              Bs 8.800,00 · 75 min
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}

export function ServiceVisualBanner({
  visualType,
  indexNumber,
  categoryLabel,
}: {
  visualType: DentalService['visualType'];
  indexNumber: string;
  categoryLabel: string;
}) {
  return (
    <div className="relative h-44 w-full overflow-hidden bg-[#F3F1EC] border-b border-stone-200 flex items-center justify-center p-4">
      <svg
        className="w-full h-full max-w-[260px] max-h-[130px]"
        viewBox="0 0 260 130"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {visualType === 'orthodontics' && (
          <>
            {/* Dental arch aligner curve */}
            <path
              d="M35 102C42 42 82 22 130 22C178 22 218 42 225 102"
              stroke="#0F766E"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M52 105C58 56 88 38 130 38C172 38 202 56 208 105"
              stroke="#0F766E"
              strokeOpacity="0.45"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            {[75, 102, 130, 158, 185].map((x, i) => (
              <rect
                key={i}
                x={x - 10}
                y={i === 2 ? 26 : i === 1 || i === 3 ? 32 : 46}
                width="20"
                height="24"
                rx="6"
                fill="#FFFFFF"
                stroke="#0F766E"
                strokeWidth="1.5"
              />
            ))}
          </>
        )}

        {visualType === 'implants' && (
          <>
            {/* Crown + titanium screw blueprint */}
            <path
              d="M98 36C98 22 112 16 130 22C148 16 162 22 162 36C162 50 154 62 146 66H114C106 62 98 50 98 36Z"
              fill="#FFFFFF"
              stroke="#0F766E"
              strokeWidth="2"
            />
            <rect
              x="116"
              y="66"
              width="28"
              height="46"
              rx="6"
              fill="#E6F4F1"
              stroke="#0F766E"
              strokeWidth="1.75"
            />
            <line x1="116" y1="78" x2="144" y2="78" stroke="#0F766E" strokeWidth="1.5" />
            <line x1="116" y1="90" x2="144" y2="90" stroke="#0F766E" strokeWidth="1.5" />
            <line x1="116" y1="102" x2="144" y2="102" stroke="#0F766E" strokeWidth="1.5" />
            <circle cx="130" cy="65" r="52" stroke="#0F766E" strokeOpacity="0.2" strokeDasharray="3 4" />
          </>
        )}

        {visualType === 'aesthetics' && (
          <>
            {/* Golden ratio smile symmetry */}
            <path
              d="M40 64C72 34 188 34 220 64C188 100 72 100 40 64Z"
              fill="#FFFFFF"
              stroke="#0F766E"
              strokeWidth="2"
            />
            <line x1="130" y1="18" x2="130" y2="112" stroke="#0F766E" strokeOpacity="0.35" strokeDasharray="3 3" />
            <line x1="98" y1="26" x2="98" y2="104" stroke="#0F766E" strokeOpacity="0.25" strokeDasharray="3 3" />
            <line x1="162" y1="26" x2="162" y2="104" stroke="#0F766E" strokeOpacity="0.25" strokeDasharray="3 3" />
            <rect x="106" y="48" width="22" height="30" rx="5" fill="#F0FDFA" stroke="#0F766E" strokeWidth="1.5" />
            <rect x="132" y="48" width="22" height="30" rx="5" fill="#F0FDFA" stroke="#0F766E" strokeWidth="1.5" />
          </>
        )}

        {(visualType === 'endodontics' || visualType === 'prevention' || visualType === 'periodontics') && (
          <>
            <circle cx="130" cy="65" r="46" fill="#FFFFFF" stroke="#0F766E" strokeWidth="1.75" />
            <path
              d="M112 46C112 36 121 32 130 36C139 32 148 36 148 46C148 58 142 68 139 86C137 96 134 96 130 82C126 96 123 96 121 86C118 68 112 58 112 46Z"
              fill="#F0FDFA"
              stroke="#0F766E"
              strokeWidth="1.75"
            />
            <line x1="70" y1="65" x2="190" y2="65" stroke="#0F766E" strokeOpacity="0.25" strokeDasharray="2 4" />
          </>
        )}
      </svg>

      <div className="absolute top-3 left-4 right-4 flex items-center justify-between text-xs text-slate-600 pointer-events-none">
        <span className="font-mono font-semibold text-teal-800">{indexNumber}.</span>
        <span>{categoryLabel}</span>
      </div>
    </div>
  );
}
