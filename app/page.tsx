"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAuth, useCatalogoPublico } from "@/hooks";
import { bookingDestination } from "@/domain/auth-routing";
import { PublicLandingTemplate } from "@/components/templates/PublicLandingTemplate";

export default function PublicLandingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { servicios, dentistas, loading, error, reload } = useCatalogoPublico();

  const handleBook = (id?: string) =>
    router.push(bookingDestination(id, user?.rol));

  return (
    <PublicLandingTemplate
      servicios={servicios}
      dentistas={dentistas}
      loading={loading}
      error={error}
      onRetry={reload}
      onBookService={handleBook}
      onNavigateLogin={() => router.push("/login")}
      onNavigateDentist={() => router.push("/dentista")}
    />
  );
}
