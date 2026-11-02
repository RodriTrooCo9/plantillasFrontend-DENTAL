'use client';

import React from 'react';
import {
  DentalService,
  ServiceCategory,
  formatCurrencyMXN,
} from '@/lib/dental-logic';
import {ServiceVisualBanner} from './ClinicalVisuals';
import {Search, Check, Plus, Calendar} from 'lucide-react';

interface ServicesCatalogSectionProps {
  services: DentalService[];
  selectedCategory: ServiceCategory;
  searchQuery: string;
  selectedBudgetIds: string[];
  onCategoryChange: (cat: ServiceCategory) => void;
  onSearchChange: (q: string) => void;
  onToggleBudgetService: (serviceId: string) => void;
  onBookService: (serviceId: string) => void;
}

const CATEGORIES: {id: ServiceCategory; label: string}[] = [
  {id: 'todos', label: 'Todos los servicios'},
  {id: 'ortodoncia', label: 'Ortodoncia 3D'},
  {id: 'implantes', label: 'Implantes y Cirugía'},
  {id: 'estetica', label: 'Estética Dental'},
  {id: 'endodoncia', label: 'Endodoncia'},
  {id: 'prevencion', label: 'Prevención'},
];

export function ServicesCatalogSection({
  services,
  selectedCategory,
  searchQuery,
  selectedBudgetIds,
  onCategoryChange,
  onSearchChange,
  onToggleBudgetService,
  onBookService,
}: ServicesCatalogSectionProps) {
  return (
    <section
      id="catalogo-servicios"
      aria-labelledby="services-heading"
      className="max-w-[1280px] mx-auto px-6 py-14 border-t border-stone-200"
    >
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <p className="text-xs font-medium text-teal-800">
            Especialidades Odontológicas Certificadas
          </p>
          <h2
            id="services-heading"
            className="mt-1 text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight"
            style={{
              fontFamily: 'var(--font-fraunces), serif',
              textWrap: 'balance',
            }}
          >
            Servicios Clínicos y Tratamientos de Alta Precisión
          </h2>
          <p className="mt-2 text-sm text-slate-600 max-w-2xl">
            Cada procedimiento incluye diagnóstico radiográfico digital, plan de
            tratamiento por escrito y seguimiento clínico personalizado.
          </p>
        </div>

        {/* Search input */}
        <div className="w-full lg:w-72">
          <label htmlFor="service-search" className="sr-only">
            Buscar tratamiento o especialista
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="service-search"
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar servicio o especialista..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700"
            />
          </div>
        </div>
      </div>

      {/* Interactive Filter Tabs */}
      <div
        role="tablist"
        aria-label="Filtrar servicios por especialidad"
        className="mt-6 flex items-center gap-1.5 overflow-x-auto pb-2"
      >
        {CATEGORIES.map((cat) => {
          const active = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onCategoryChange(cat.id)}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'bg-slate-900 text-white'
                  : 'bg-stone-200/70 text-slate-700 hover:bg-stone-200'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Services Grid */}
      {services.length === 0 ? (
        <div className="mt-8 bg-white border border-stone-200 rounded-2xl p-10 text-center">
          <p className="text-sm font-semibold text-slate-900">
            No encontramos servicios que coincidan con tu búsqueda.
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Intenta con otro término o restablece el filtro de especialidades.
          </p>
          <button
            type="button"
            onClick={() => {
              onCategoryChange('todos');
              onSearchChange('');
            }}
            className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-teal-800 rounded-lg hover:bg-teal-900 transition-colors cursor-pointer"
          >
            Mostrar todos los servicios
          </button>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => {
            const inBudget = selectedBudgetIds.includes(service.id);
            return (
              <article
                key={service.id}
                className="bg-white border border-stone-200 rounded-2xl overflow-hidden flex flex-col justify-between transition-colors hover:border-stone-300"
              >
                <div>
                  <ServiceVisualBanner
                    visualType={service.visualType}
                    indexNumber={service.indexNumber}
                    categoryLabel={service.categoryLabel}
                  />

                  <div className="p-6">
                    {/* Unboxed clean metadata with middot separator */}
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{service.sessionsCount}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {service.durationMinutes} min
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>Garantía {service.warrantyYears} años</span>
                    </div>

                    <h3 className="mt-2 text-lg font-semibold text-slate-900">
                      {service.indexNumber}. {service.name}
                    </h3>

                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                      {service.shortDescription}
                    </p>

                    <div className="mt-4 pt-4 border-t border-stone-100 space-y-1.5 text-xs">
                      <p className="text-slate-700">
                        <span className="font-semibold text-slate-900">
                          Protocolo:{' '}
                        </span>
                        {service.clinicalMechanism}
                      </p>
                      <p className="text-teal-900">
                        <span className="font-semibold">Resultado clínico: </span>
                        {service.measurableOutcome}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="px-6 pb-6 pt-3 border-t border-stone-200 bg-[#FAF9F6]/60">
                  <div className="flex items-baseline justify-between mb-3">
                    <div>
                      <span className="text-xs text-slate-500 block">
                        Inversión clínica completa
                      </span>
                      <span className="text-lg font-bold font-mono tabular-nums text-slate-900">
                        {formatCurrencyMXN(service.priceMXN)}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 text-right">
                      {service.specialistName}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleBudgetService(service.id)}
                      className={`py-2 px-3 text-xs font-semibold rounded-lg border inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        inBudget
                          ? 'border-teal-700 bg-teal-50 text-teal-900'
                          : 'border-stone-300 bg-white text-slate-700 hover:bg-stone-100'
                      }`}
                    >
                      {inBudget ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          En presupuesto
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          Presupuestar
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onBookService(service.id)}
                      className="py-2 px-3 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      Agendar cita
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
