import type {Metadata} from 'next';
import {Plus_Jakarta_Sans, Fraunces, JetBrains_Mono} from 'next/font/google';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-fraunces',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Lumina Odontología — Consultorio Dental y Portal de Servicios',
  description:
    'Plataforma integral para consultorio dental con catálogo interactivo de servicios odontológicos, presupuestador clínico, agenda de citas y acceso para pacientes y especialistas.',
  openGraph: {
    title: 'Lumina Odontología — Consultorio Dental y Portal de Servicios',
    description:
      'Plataforma integral para consultorio dental con catálogo interactivo de servicios odontológicos, presupuestador clínico, agenda de citas y acceso para pacientes y especialistas.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lumina Odontología — Consultorio Dental y Portal de Servicios',
    description:
      'Plataforma integral para consultorio dental con catálogo interactivo de servicios odontológicos, presupuestador clínico, agenda de citas y acceso para pacientes y especialistas.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html
      lang="es"
      className={`${jakarta.variable} ${fraunces.variable} ${jetbrainsMono.variable}`}
    >
      <body
        suppressHydrationWarning
        className="bg-[#FAF9F6] text-slate-900 antialiased selection:bg-teal-700 selection:text-white"
        style={{fontFamily: 'var(--font-jakarta), sans-serif'}}
      >
        {children}
      </body>
    </html>
  );
}
