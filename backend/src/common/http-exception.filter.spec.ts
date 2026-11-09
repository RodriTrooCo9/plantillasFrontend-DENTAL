import {
  ArgumentsHost,
  ConflictException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { AllExceptionsFilter } from "./http-exception.filter";

describe("Filtro Global de Excepciones HTTP (AllExceptionsFilter)", () => {
  it("formatea errores HTTP con código semántico y sin exponer trazas internas ni datos sensibles", () => {
    // Arrange
    const filter = new AllExceptionsFilter();
    const jsonMock = jest.fn();
    const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status: statusMock }),
      }),
    } as unknown as ArgumentsHost;
    const exception = new ConflictException({
      message: "El horario ya está ocupado.",
      code: "CONFLICT",
    });

    // Act
    filter.catch(exception, host);

    // Assert
    expect(statusMock).toHaveBeenCalledWith(409);
    expect(jsonMock).toHaveBeenCalledWith({
      message: "El horario ya está ocupado.",
      code: "CONFLICT",
    });
  });

  it("maneja excepciones genéricas devolviendo 500 INTERNAL_ERROR controlado", () => {
    // Arrange
    const filter = new AllExceptionsFilter();
    const jsonMock = jest.fn();
    const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status: statusMock }),
      }),
    } as unknown as ArgumentsHost;
    const exception = new Error("Fallo inesperado en motor");

    // Act
    filter.catch(exception, host);
    filter.catch(new UnprocessableEntityException("Campo inválido"), host);

    // Assert
    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({
      message: "Fallo inesperado en motor",
      code: "INTERNAL_ERROR",
    });
  });
});
