'use client';

import React from 'react';
import {X} from 'lucide-react';

/**
 * SISTEMA DE COMPONENTES UI PROPIOS Y DESACOPLADOS
 * Basados exclusivamente en Design Tokens CSS (--color-*, --radius-*).
 * Cambiar el tema visual implica editar únicamente styles/tokens.css y este archivo.
 */

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-xs sm:text-sm',
    lg: 'px-5 py-2.5 text-sm',
  }[size];

  const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary:
      'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold',
    secondary:
      'bg-[var(--color-bg-subtle)] hover:opacity-90 text-[var(--color-text-main)] font-semibold',
    outline:
      'bg-[var(--color-bg-surface)] border border-[var(--color-border-strong)] hover:bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] font-medium',
    danger: 'bg-red-50 hover:bg-red-100 text-red-700 font-semibold',
    ghost:
      'bg-transparent hover:bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] font-medium',
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50 ${sizeClasses} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`bg-[var(--color-bg-surface)] border border-[var(--color-border-base)] rounded-[var(--radius-xl)] ${className}`}
    >
      {children}
    </div>
  );
}

export function Input({
  label,
  id,
  error,
  className = '',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
}) {
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-medium text-[var(--color-text-muted)] mb-1"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full px-3.5 py-2 text-sm bg-[var(--color-bg-canvas)] border border-[var(--color-border-strong)] rounded-[var(--radius-md)] text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-primary)] ${className}`}
        {...props}
      />
      {error && (
        <p role="alert" className="text-xs text-red-600 mt-1">
          {error}
        </p>
      )}
    </div>
  );
}

export function Select({
  label,
  id,
  children,
  className = '',
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
}) {
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-medium text-[var(--color-text-muted)] mb-1"
        >
          {label}
        </label>
      )}
      <select
        id={id}
        className={`w-full px-3 py-2 text-sm bg-[var(--color-bg-canvas)] border border-[var(--color-border-strong)] rounded-[var(--radius-md)] text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-primary)] ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'teal' | 'amber' | 'red';
}) {
  // Siguiendo Zero-Pill Discipline: texto limpio sin cápsulas redondeadas
  const toneClass = {
    neutral: 'text-[var(--color-text-muted)]',
    teal: 'text-[var(--color-primary)] font-semibold',
    amber: 'text-amber-700 font-semibold',
    red: 'text-red-700 font-semibold',
  }[tone];

  return <span className={`text-xs ${toneClass}`}>{children}</span>;
}

export function Tabs<T extends string>({
  tabs,
  activeTab,
  onChange,
  ariaLabel,
}: {
  tabs: {id: T; label: string}[];
  activeTab: T;
  onChange: (id: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex items-center gap-1.5 border-b border-[var(--color-border-base)] pb-3 overflow-x-auto"
    >
      {tabs.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-[var(--radius-md)] transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              active
                ? 'bg-[var(--color-secondary)] text-white'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)]'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-base)] rounded-[var(--radius-xl)] w-full max-w-lg p-6 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-base)]">
          <h3 className="text-base font-semibold text-[var(--color-text-main)]">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
