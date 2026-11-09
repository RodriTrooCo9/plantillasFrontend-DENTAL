import { test, expect } from "@playwright/test";

test.describe("Pruebas de Control End-to-End del Consultorio Dental (Playwright)", () => {
  test("bloquea rutas no autorizadas sin sesión y permite login/logout con rol Médico Dentista Admin (admin@demo.com)", async ({
    page,
  }) => {
    // Arrange: Intentar entrar a /dentista sin sesión redirige a /login
    await page.goto("/dentista");
    await expect(page).toHaveURL(/\/login/);

    // Act: Seleccionar botón de acceso rápido de Dentista Admin
    await page.getByRole("button", { name: "Dentista Admin" }).click();

    // Assert: Entra al portal del dentista y visualiza su agenda, directorio y odontograma
    await expect(page).toHaveURL(/\/dentista/);
    await expect(
      page.getByText(/Portal Clínico del Dentista/i),
    ).toBeVisible();

    // Navegar a Pacientes y abrir Odontograma editable
    await page.getByRole("tab", { name: /2\. Pacientes/i }).click();
    await expect(page.getByText(/Usuario Prueba 1/i)).toBeVisible();

    // Editar Odontograma FDI de 32 dientes
    await page.getByRole("tab", { name: /3\. Odontograma/i }).click();
    await expect(
      page.getByText(/Modo Clínico Editable \(Exclusivo Dentista\)/i),
    ).toBeVisible();

    // Consultar y agregar nota al Historial Clínico
    await page.getByRole("tab", { name: /4\. Historial/i }).click();
    await expect(page.getByLabel(/Diagnóstico clínico/i)).toBeVisible();

    // Logout
    await page.getByRole("button", { name: /Salir/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("permite login con usuario ficticio (prueba1@demo.com), bloquea acceso a /dentista y gestiona citas y odontograma en modo lectura", async ({
    page,
  }) => {
    // Arrange
    await page.goto("/login");

    // Act: Seleccionar botón de Paciente Prueba 1
    await page.getByRole("button", { name: "Paciente Prueba 1" }).click();

    // Assert: Redirigido a /paciente
    await expect(page).toHaveURL(/\/paciente/);
    await expect(page.getByText(/Usuario Prueba 1/i).first()).toBeVisible();

    // Intentar navegar a /dentista siendo PACIENTE redirige de vuelta a /paciente
    await page.goto("/dentista");
    await expect(page).toHaveURL(/\/paciente/);

    // Consultar Odontograma en modo solo lectura
    await page.getByRole("tab", { name: /3\. Odontograma/i }).click();
    await expect(
      page.getByText(/Modo Consulta de Paciente \(Solo Lectura\)/i),
    ).toBeVisible();

    // Consultar Tratamientos y Citas
    await page.getByRole("tab", { name: /4\. Tratamientos/i }).click();
    await page.getByRole("tab", { name: /5\. Citas/i }).click();
    await expect(page.getByText(/Agendar Nueva Cita/i)).toBeVisible();
  });
});
