import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { LoginTemplate } from "@/components/templates/LoginTemplate";
import { PublicLandingTemplate } from "@/components/templates/PublicLandingTemplate";
import { Odontograma32View } from "@/features/odontograma/Odontograma32View";
import {
  SERVICIOS_SEMILLA,
  DENTISTAS_SEMILLA,
  ODONTOGRAMAS_SEMILLA,
} from "@/data/mock/seed";
import {
  roleDestination,
  safeNext,
  bookingDestination,
} from "@/domain/auth-routing";

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
}));

jest.mock("@/components/TopNavbar", () => ({
  TopNavbar: () => <nav data-testid="top-navbar">Lumina Odontología</nav>,
}));

jest.mock("@/features/chatbot/ChatbotAssistant", () => ({
  ChatbotAssistant: () => <div data-testid="chatbot-mock">Chatbot Mock</div>,
}));

describe("Componentes y Plantillas Frontend (React Testing Library)", () => {
  it("renderiza LoginTemplate con accesos rápidos de Admin y Usuarios Ficticios, maneja estados de loading, error y modal de recuperación", () => {
    // Arrange
    const onEmailChange = jest.fn();
    const onPasswordChange = jest.fn();
    const onQuickLogin = jest.fn();
    const onSubmit = jest.fn((e: React.FormEvent) => e.preventDefault());
    const onOpenRecover = jest.fn();
    const onCloseRecover = jest.fn();
    const onRecoverEmailChange = jest.fn();
    const onRecoverSubmit = jest.fn().mockResolvedValue(undefined);

    // Act
    const { rerender } = render(
      <LoginTemplate
        mode="http"
        email="prueba1@demo.com"
        password="123456"
        formErrors={{}}
        submitting={false}
        authError="Credenciales inválidas"
        recoverOpen={false}
        recoverEmail=""
        recoverMsg={null}
        recoverErr={null}
        onEmailChange={onEmailChange}
        onPasswordChange={onPasswordChange}
        onSubmit={onSubmit}
        onQuickLogin={onQuickLogin}
        onOpenRecover={onOpenRecover}
        onCloseRecover={onCloseRecover}
        onRecoverEmailChange={onRecoverEmailChange}
        onRecoverSubmit={onRecoverSubmit}
      />,
    );

    // Assert
    expect(screen.getByRole("button", { name: /Dentista Admin/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Paciente Prueba 1/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Paciente Prueba 2/i })).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain(
      "Credenciales inválidas",
    );

    // Disparar eventos de interacción
    fireEvent.click(screen.getByRole("button", { name: /Dentista Admin/i }));
    expect(onQuickLogin).toHaveBeenCalledWith("admin@demo.com");
    fireEvent.click(screen.getByRole("button", { name: /Paciente Prueba 1/i }));
    expect(onQuickLogin).toHaveBeenCalledWith("prueba1@demo.com");
    fireEvent.click(screen.getByRole("button", { name: /Paciente Prueba 2/i }));
    expect(onQuickLogin).toHaveBeenCalledWith("prueba2@demo.com");

    fireEvent.change(screen.getByLabelText(/Correo electrónico/i), {
      target: { value: "admin@demo.com" },
    });
    expect(onEmailChange).toHaveBeenCalledWith("admin@demo.com");
    fireEvent.change(screen.getByLabelText(/Contraseña/i), {
      target: { value: "nueva123" },
    });
    expect(onPasswordChange).toHaveBeenCalledWith("nueva123");

    // Verificar estado de loading y modal de recuperación abierto
    rerender(
      <LoginTemplate
        mode="mock"
        email="admin@demo.com"
        password="123456"
        formErrors={{ email: "Formato inválido" }}
        submitting={true}
        authError={null}
        recoverOpen={true}
        recoverEmail="admin@demo.com"
        recoverMsg="Enlace enviado correctamente."
        recoverErr={null}
        onEmailChange={onEmailChange}
        onPasswordChange={onPasswordChange}
        onSubmit={onSubmit}
        onQuickLogin={onQuickLogin}
        onOpenRecover={onOpenRecover}
        onCloseRecover={onCloseRecover}
        onRecoverEmailChange={onRecoverEmailChange}
        onRecoverSubmit={onRecoverSubmit}
      />,
    );
    expect(screen.getByText(/Verificando credenciales/i)).toBeTruthy();
    expect(screen.getByText(/Enlace enviado correctamente/i)).toBeTruthy();
  });

  it("renderiza PublicLandingTemplate en estados de carga, error de red, vacío y éxito con catálogo completo", () => {
    // Arrange
    const onRetry = jest.fn();
    const onBookService = jest.fn();
    const onNavigateLogin = jest.fn();
    const onNavigateDentist = jest.fn();

    // Act 1: Estado de carga
    const { rerender } = render(
      <PublicLandingTemplate
        servicios={[]}
        dentistas={[]}
        loading={true}
        error={null}
        onRetry={onRetry}
        onBookService={onBookService}
        onNavigateLogin={onNavigateLogin}
        onNavigateDentist={onNavigateDentist}
      />,
    );
    expect(screen.getByRole("status").textContent).toMatch(/Cargando/i);

    // Act 2: Estado de error de red
    rerender(
      <PublicLandingTemplate
        servicios={[]}
        dentistas={[]}
        loading={false}
        error="Error de conexión con el servidor"
        onRetry={onRetry}
        onBookService={onBookService}
        onNavigateLogin={onNavigateLogin}
        onNavigateDentist={onNavigateDentist}
      />,
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "Error de conexión con el servidor",
    );
    fireEvent.click(screen.getByRole("button", { name: /Reintentar/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    // Act 3: Estado vacío
    rerender(
      <PublicLandingTemplate
        servicios={[]}
        dentistas={[]}
        loading={false}
        error={null}
        onRetry={onRetry}
        onBookService={onBookService}
        onNavigateLogin={onNavigateLogin}
        onNavigateDentist={onNavigateDentist}
      />,
    );
    expect(screen.getByRole("status").textContent).toMatch(
      /El catálogo estará disponible próximamente/i,
    );

    // Act 4: Estado con datos reales de servicios y especialistas
    rerender(
      <PublicLandingTemplate
        servicios={SERVICIOS_SEMILLA}
        dentistas={DENTISTAS_SEMILLA}
        loading={false}
        error={null}
        onRetry={onRetry}
        onBookService={onBookService}
        onNavigateLogin={onNavigateLogin}
        onNavigateDentist={onNavigateDentist}
      />,
    );
    expect(
      screen.getByText(/Cuidado odontológico de alta precisión/i),
    ).toBeTruthy();
    expect(screen.getByText(/Dr\. Admin Principal/i)).toBeTruthy();
  });

  it("verifica Odontograma32View en modo lectura (Paciente), modo editable (Dentista), datos incompletos y reglas de ruteo por rol", () => {
    // Arrange
    const odontogramaValido = ODONTOGRAMAS_SEMILLA["pac-1"];

    // Act & Assert: Ruteo seguro por rol
    expect(roleDestination("DENTISTA")).toBe("/dentista");
    expect(roleDestination("PACIENTE")).toBe("/paciente");
    expect(safeNext("/dentista", "DENTISTA")).toBe("/dentista");
    expect(safeNext("/dentista", "PACIENTE")).toBe("/paciente");
    expect(safeNext("https://malicious.site", "PACIENTE")).toBe("/paciente");
    expect(bookingDestination("srv-limpieza")).toContain("/login?next=");
    expect(bookingDestination("srv-limpieza", "PACIENTE")).toBe(
      "/paciente?servicio=srv-limpieza",
    );

    // Datos corruptos o vacíos muestran alerta accesible
    const { rerender } = render(
      <Odontograma32View
        odontograma={{
          pacienteId: "pac-1",
          actualizadoEn: "",
          dientes: [],
          historialCambios: [],
        }}
        pacienteNombre="Paciente Demo"
        editable={false}
      />,
    );
    expect(screen.getByRole("alert").textContent).toMatch(
      /no está disponible o contiene datos incompletos/i,
    );

    // Modo Paciente (solo lectura)
    rerender(
      <Odontograma32View
        odontograma={odontogramaValido}
        pacienteNombre="María Fernanda Vega"
        editable={false}
      />,
    );
    expect(
      screen.getByText(/Modo Consulta de Paciente \(Solo Lectura\)/i),
    ).toBeTruthy();

    // Modo Dentista (editable)
    rerender(
      <Odontograma32View
        odontograma={odontogramaValido}
        pacienteNombre="María Fernanda Vega"
        editable={true}
        dentistaAutorNombre="Dr. Admin Principal"
        onGuardarCambio={jest.fn().mockResolvedValue({})}
      />,
    );
    expect(
      screen.getByText(/Modo Clínico Editable \(Exclusivo Dentista\)/i),
    ).toBeTruthy();
  });
});
