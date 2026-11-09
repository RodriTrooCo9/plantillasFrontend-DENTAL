import {
  addDays,
  clinicInstant,
  dayNameInSpanish,
  isFDI,
  isOfficialHoliday,
  isValidToothSurface,
  minutes,
  ORDEN_32_DIENTES_FDI,
  overlaps,
  todayInClinic,
} from "./clinical-time";

describe("Utilidades Clínicas y Zona Horaria (clinical-time)", () => {
  it("valida correctamente la numeración FDI de 32 dientes y rechaza dientes inexistentes", () => {
    // Arrange
    const dientesValidos = [11, 18, 21, 28, 31, 38, 41, 48, ...ORDEN_32_DIENTES_FDI];
    const dientesInvalidos = [0, 9, 10, 19, 20, 29, 30, 39, 40, 49, 51, 85, 99, -16, 16.5];

    // Act & Assert
    for (const fdi of dientesValidos) {
      expect(isFDI(fdi)).toBe(true);
    }
    for (const inv of dientesInvalidos) {
      expect(isFDI(inv)).toBe(false);
    }
  });

  it("valida caras o superficies válidas del diente y rechaza caras inexistentes", () => {
    // Arrange
    const carasValidas = ["oclusal", "vestibular", "lingual", "mesial", "distal", "GENERAL"];
    const carasInvalidas = ["incisal_falsa", "apical", "raiz", "", "OCLUSAL"];

    // Act & Assert
    for (const cara of carasValidas) {
      expect(isValidToothSurface(cara)).toBe(true);
    }
    for (const cara of carasInvalidas) {
      expect(isValidToothSurface(cara)).toBe(false);
    }
  });

  it("identifica días de la semana en español y días feriados oficiales sin desfase de zona horaria", () => {
    // Arrange
    const navidad = "2026-12-25";
    const anioNuevo = "2027-01-01";
    const martesLaborable = "2026-11-10";
    const domingoNoLaborable = "2026-11-15";

    // Act
    const esNavidadFeriado = isOfficialHoliday(navidad);
    const esAnioNuevoFeriado = isOfficialHoliday(anioNuevo);
    const esMartesFeriado = isOfficialHoliday(martesLaborable);
    const diaMartes = dayNameInSpanish(martesLaborable);
    const diaDomingo = dayNameInSpanish(domingoNoLaborable);

    // Assert
    expect(esNavidadFeriado).toBe(true);
    expect(esAnioNuevoFeriado).toBe(true);
    expect(esMartesFeriado).toBe(false);
    expect(diaMartes).toBe("Martes");
    expect(diaDomingo).toBe("Domingo");
  });

  it("calcula traslapes de horarios en minutos y suma días respetando cambios de mes y año", () => {
    // Arrange
    const inicioCitaA = minutes("09:00");
    const finCitaA = inicioCitaA + 60; // 10:00
    const inicioCitaSolapada = minutes("09:30");
    const finCitaSolapada = inicioCitaSolapada + 45;
    const inicioCitaContigua = minutes("10:00");
    const finCitaContigua = inicioCitaContigua + 30;

    // Act
    const haySolapamiento = overlaps(inicioCitaA, finCitaA, inicioCitaSolapada, finCitaSolapada);
    const haySolapamientoContiguo = overlaps(inicioCitaA, finCitaA, inicioCitaContigua, finCitaContigua);
    const siguienteAnio = addDays("2026-12-30", 5);
    const hoyFormato = todayInClinic(new Date("2026-11-09T18:00:00Z"));
    const instante = clinicInstant("2026-11-10", "09:00");

    // Assert
    expect(haySolapamiento).toBe(true);
    expect(haySolapamientoContiguo).toBe(false);
    expect(siguienteAnio).toBe("2027-01-04");
    expect(hoyFormato).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(instante).toBeInstanceOf(Date);
  });
});
