import { describe, it, expect } from "vitest";
import {
  validateInspectionInput,
  isValidIsoDate,
  MAX_INSPECTOR_LENGTH,
  MIN_SUMMARY_LENGTH,
  MAX_SUMMARY_LENGTH,
  MAX_FINDINGS,
} from "../../src/lib/validation/inspection";
import {
  FIXTURE_VALID_OK,
  FIXTURE_VALID_ATTENTION,
  FIXTURE_INVALID_CASES,
} from "../fixtures/synthetic-inspections";

describe("Regla de validación de capturas de inspección (Semana 8)", () => {
  describe("Función auxiliar: isValidIsoDate", () => {
    it("acepta fechas ISO gregorianas válidas", () => {
      expect(isValidIsoDate("2026-10-25")).toBe(true);
      expect(isValidIsoDate("2024-02-29")).toBe(true); // Bisiesto válido
      expect(isValidIsoDate("2023-12-31")).toBe(true);
    });

    it("rechaza fechas con formato inválido o no ISO", () => {
      expect(isValidIsoDate("25-10-2026")).toBe(false);
      expect(isValidIsoDate("2026/10/25")).toBe(false);
      expect(isValidIsoDate("2026-10")).toBe(false);
      expect(isValidIsoDate("")).toBe(false);
      expect(isValidIsoDate("texto-invalido")).toBe(false);
    });

    it("rechaza fechas gregorianas imposibles", () => {
      expect(isValidIsoDate("2026-02-31")).toBe(false);
      expect(isValidIsoDate("2025-02-29")).toBe(false); // No bisiesto
      expect(isValidIsoDate("2026-04-31")).toBe(false); // Abril tiene 30 días
      expect(isValidIsoDate("2026-13-01")).toBe(false); // Mes 13
      expect(isValidIsoDate("2026-00-10")).toBe(false); // Mes 00
    });
  });

  describe("validateInspectionInput - Entradas válidas", () => {
    it("valida una captura sin hallazgos y deriva estado 'ok' / 'Sin incidencias'", () => {
      const result = validateInspectionInput(FIXTURE_VALID_OK);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe(FIXTURE_VALID_OK.id);
        expect(result.value.location).toBe(FIXTURE_VALID_OK.location);
        expect(result.value.inspector).toBe(FIXTURE_VALID_OK.inspector);
        expect(result.value.date).toBe(FIXTURE_VALID_OK.date);
        expect(result.value.findings).toBe(0);
        expect(result.value.status).toBe("ok");
        expect(result.value.statusLabel).toBe("Sin incidencias");
        expect(result.value.summary).toBe(FIXTURE_VALID_OK.summary);
      }
    });

    it("valida una captura con hallazgos y deriva estado 'attention' / 'Requiere atención'", () => {
      const result = validateInspectionInput(FIXTURE_VALID_ATTENTION);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.findings).toBe(3);
        expect(result.value.status).toBe("attention");
        expect(result.value.statusLabel).toBe("Requiere atención");
      }
    });

    it("normaliza espacios en blanco de strings de entrada", () => {
      const raw = {
        id: "  insp-padded-01  ",
        location: "  Laboratorio de Redes  ",
        date: "2026-10-25",
        inspector: "  Germán Yair Martínez  ",
        findings: 0,
        summary: "  Resumen con espacios al inicio y fin.  ",
      };
      const result = validateInspectionInput(raw);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe("insp-padded-01");
        expect(result.value.location).toBe("Laboratorio de Redes");
        expect(result.value.inspector).toBe("Germán Yair Martínez");
        expect(result.value.summary).toBe("Resumen con espacios al inicio y fin.");
      }
    });

    it("acepta hallazgos expresados como string numérico entero", () => {
      const raw = {
        ...FIXTURE_VALID_OK,
        id: "insp-string-findings",
        findings: "5",
      };
      const result = validateInspectionInput(raw);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.findings).toBe(5);
        expect(result.value.status).toBe("attention");
      }
    });

    it("acepta valores en los límites exactos permitidos", () => {
      const boundaryInspector = "I".repeat(MAX_INSPECTOR_LENGTH);
      const minSummary = "S".repeat(MIN_SUMMARY_LENGTH);
      const maxSummary = "M".repeat(MAX_SUMMARY_LENGTH);

      const minBoundary = validateInspectionInput({
        ...FIXTURE_VALID_OK,
        id: "insp-boundary-min",
        inspector: boundaryInspector,
        summary: minSummary,
        findings: 0,
      });
      expect(minBoundary.ok).toBe(true);

      const maxBoundary = validateInspectionInput({
        ...FIXTURE_VALID_OK,
        id: "insp-boundary-max",
        summary: maxSummary,
        findings: MAX_FINDINGS,
      });
      expect(maxBoundary.ok).toBe(true);
      if (maxBoundary.ok) {
        expect(maxBoundary.value.findings).toBe(99);
      }
    });
  });

  describe("validateInspectionInput - Entradas inválidas y aserciones de error", () => {
    it("rechaza entradas que no son objetos", () => {
      expect(validateInspectionInput(null).ok).toBe(false);
      expect(validateInspectionInput(undefined).ok).toBe(false);
      expect(validateInspectionInput("cadena").ok).toBe(false);
      expect(validateInspectionInput(12345).ok).toBe(false);
      expect(validateInspectionInput([]).ok).toBe(false);
    });

    it("rechaza capturas sin identificador o con caracteres inválidos", () => {
      const missing = validateInspectionInput(FIXTURE_INVALID_CASES.missingId);
      expect(missing.ok).toBe(false);
      if (!missing.ok) {
        expect(missing.errors.id).toBeDefined();
        expect(missing.errors.id).toContain("El identificador es obligatorio");
      }

      const invalidChars = validateInspectionInput(FIXTURE_INVALID_CASES.invalidIdChars);
      expect(invalidChars.ok).toBe(false);
      if (!invalidChars.ok) {
        expect(invalidChars.errors.id).toBeDefined();
      }

      const tooLongId = validateInspectionInput({
        ...FIXTURE_VALID_OK,
        id: "a".repeat(65),
      });
      expect(tooLongId.ok).toBe(false);
      if (!tooLongId.ok) {
        expect(tooLongId.errors.id).toBeDefined();
      }
    });

    it("rechaza fecha inválida por formato o día inexistente", () => {
      const invFormat = validateInspectionInput(FIXTURE_INVALID_CASES.invalidDateFormat);
      expect(invFormat.ok).toBe(false);
      if (!invFormat.ok) {
        expect(invFormat.errors.date).toBeDefined();
        expect(invFormat.errors.date).toContain("fecha válida");
      }

      const invCalendar = validateInspectionInput(FIXTURE_INVALID_CASES.invalidDateCalendar);
      expect(invCalendar.ok).toBe(false);
      if (!invCalendar.ok) {
        expect(invCalendar.errors.date).toBeDefined();
      }
    });

    it("rechaza ubicación vacía", () => {
      const result = validateInspectionInput(FIXTURE_INVALID_CASES.emptyLocation);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.location).toBe("Elige el laboratorio.");
      }
    });

    it("rechaza inspector ausente o que excede el límite máximo", () => {
      const emptyInsp = validateInspectionInput({ ...FIXTURE_VALID_OK, inspector: "" });
      expect(emptyInsp.ok).toBe(false);
      if (!emptyInsp.ok) {
        expect(emptyInsp.errors.inspector).toContain("Escribe quién realizó la inspección.");
      }

      const tooLong = validateInspectionInput(FIXTURE_INVALID_CASES.inspectorTooLong);
      expect(tooLong.ok).toBe(false);
      if (!tooLong.ok) {
        expect(tooLong.errors.inspector).toContain(`no puede pasar de ${MAX_INSPECTOR_LENGTH}`);
      }
    });

    it("rechaza hallazgos negativos, decimales, no numéricos o superiores a 99", () => {
      const neg = validateInspectionInput(FIXTURE_INVALID_CASES.negativeFindings);
      expect(neg.ok).toBe(false);
      if (!neg.ok) {
        expect(neg.errors.findings).toContain("número entero de 0 a 99");
      }

      const dec = validateInspectionInput(FIXTURE_INVALID_CASES.decimalFindings);
      expect(dec.ok).toBe(false);
      if (!dec.ok) {
        expect(dec.errors.findings).toBeDefined();
      }

      const aboveMax = validateInspectionInput(FIXTURE_INVALID_CASES.findingsAboveMax);
      expect(aboveMax.ok).toBe(false);
      if (!aboveMax.ok) {
        expect(aboveMax.errors.findings).toBeDefined();
      }

      const strInvalid = validateInspectionInput({ ...FIXTURE_VALID_OK, findings: "muchos" });
      expect(strInvalid.ok).toBe(false);
      if (!strInvalid.ok) {
        expect(strInvalid.errors.findings).toBeDefined();
      }
    });

    it("rechaza resumen menor a 5 caracteres o mayor a 500 caracteres", () => {
      const short = validateInspectionInput(FIXTURE_INVALID_CASES.summaryTooShort);
      expect(short.ok).toBe(false);
      if (!short.ok) {
        expect(short.errors.summary).toContain(`al menos ${MIN_SUMMARY_LENGTH} caracteres`);
      }

      const long = validateInspectionInput(FIXTURE_INVALID_CASES.summaryTooLong);
      expect(long.ok).toBe(false);
      if (!long.ok) {
        expect(long.errors.summary).toContain(`no puede pasar de ${MAX_SUMMARY_LENGTH} caracteres`);
      }
    });

    it("reporta múltiples errores simultáneos en una sola llamada", () => {
      const multipleErrors = validateInspectionInput({
        id: "",
        location: "",
        inspector: "",
        date: "fecha-erronea",
        findings: -5,
        summary: "abc",
      });
      expect(multipleErrors.ok).toBe(false);
      if (!multipleErrors.ok) {
        expect(multipleErrors.errors.id).toBeDefined();
        expect(multipleErrors.errors.location).toBeDefined();
        expect(multipleErrors.errors.inspector).toBeDefined();
        expect(multipleErrors.errors.date).toBeDefined();
        expect(multipleErrors.errors.findings).toBeDefined();
        expect(multipleErrors.errors.summary).toBeDefined();
      }
    });
  });
});
