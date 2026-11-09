import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { DentalChatbot } from "@/components/DentalChatbot";

const mockSendMessage = jest.fn();
const mockClearError = jest.fn();

let mockUseChatState = {
  messages: [] as any[],
  sendMessage: mockSendMessage,
  status: "ready",
  error: undefined as Error | undefined,
  clearError: mockClearError,
  stop: jest.fn(),
};

jest.mock("@ai-sdk/react", () => ({
  useChat: () => mockUseChatState,
}));

jest.mock("ai", () => ({
  DefaultChatTransport: jest.fn().mockImplementation(() => ({})),
}));

describe("Widget Flotante DentalChatbot (Vercel AI SDK + Ollama)", () => {
  beforeAll(() => {
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseChatState = {
      messages: [],
      sendMessage: mockSendMessage,
      status: "ready",
      error: undefined,
      clearError: mockClearError,
      stop: jest.fn(),
    };
  });

  it("renderiza el botón flotante de launcher con indicación de Ollama", () => {
    // Arrange & Act
    render(<DentalChatbot />);

    // Assert
    const launcher = screen.getByRole("button", {
      name: /abrir asistente clínico inteligente/i,
    });
    expect(launcher).toBeInTheDocument();
    expect(screen.getByText(/Asistente Lumina AI/i)).toBeInTheDocument();
    expect(screen.getByText("Ollama")).toBeInTheDocument();
  });

  it("al hacer clic en el launcher se abre la ventana con banner de endpoints y acciones directas", () => {
    // Arrange
    render(<DentalChatbot />);
    const launcher = screen.getByRole("button", {
      name: /abrir asistente clínico inteligente/i,
    });

    // Act
    fireEvent.click(launcher);

    // Assert
    expect(screen.getByText(/Lumina Odontología AI/i)).toBeInTheDocument();
    expect(screen.getByText("Qwen 2.5 7B")).toBeInTheDocument();
    expect(
      screen.getByText(/Tool Calling activo con verificación previa/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Consultar horarios disponibles/i),
    ).toBeInTheDocument();
  });

  it("permite escribir en el input y enviar un mensaje invocando sendMessage", () => {
    // Arrange
    render(<DentalChatbot />);
    fireEvent.click(
      screen.getByRole("button", { name: /abrir asistente clínico inteligente/i }),
    );

    const input = screen.getByPlaceholderText(
      /Escribe tu consulta o pide agendar.../i,
    );
    const sendButton = screen.getByRole("button", { name: /Enviar mensaje/i });

    // Act
    fireEvent.change(input, { target: { value: "Quiero agendar cita para mañana" } });
    fireEvent.click(sendButton);

    // Assert
    expect(mockSendMessage).toHaveBeenCalledWith({
      text: "Quiero agendar cita para mañana",
    });
  });

  it("muestra el indicador visual 'Verificando disponibilidad en el servidor...' durante la ejecución de tools o streaming", () => {
    // Arrange
    mockUseChatState.status = "streaming";
    mockUseChatState.messages = [
      { id: "1", role: "user", parts: [{ type: "text", text: "¿Hay citas?" }] },
    ];

    render(<DentalChatbot />);
    fireEvent.click(
      screen.getByRole("button", { name: /abrir asistente clínico inteligente/i }),
    );

    // Assert
    expect(
      screen.getByText(/Verificando disponibilidad en el servidor.../i),
    ).toBeInTheDocument();
  });

  it("renderiza badges de confirmación cuando una herramienta retorna resultado", () => {
    // Arrange
    mockUseChatState.messages = [
      { id: "1", role: "user", parts: [{ type: "text", text: "Verificar horarios" }] },
      {
        id: "2",
        role: "assistant",
        parts: [
          {
            type: "tool-verificarDisponibilidadCitas",
            state: "result",
            result: { status: "success" },
          },
          {
            type: "text",
            text: "Tenemos horarios disponibles a las 09:00 y 10:00 hrs.",
          },
        ],
      },
    ];

    render(<DentalChatbot />);
    fireEvent.click(
      screen.getByRole("button", { name: /abrir asistente clínico inteligente/i }),
    );

    // Assert
    expect(
      screen.getByText(/Endpoint ejecutado: verificarDisponibilidadCitas/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Tenemos horarios disponibles a las 09:00 y 10:00 hrs./i),
    ).toBeInTheDocument();
  });
});
