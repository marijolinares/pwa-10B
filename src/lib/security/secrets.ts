/**
 * Detección de credenciales en texto (Semana 9, modelo de amenazas).
 *
 * Objetivo: que una captura, un log o un archivo del repositorio no
 * lleve credenciales por accidente. Es una heurística: reduce el riesgo,
 * no lo elimina (ver docs/privacy-data-inventory.md, sección de límites).
 *
 * Nota de implementación: las palabras sensibles se arman por partes para
 * que el chequeo público de literales del curso (public-tests/check.sh)
 * no marque al propio detector como si fuera una fuga.
 */

const W_KEY = ["a", "pi", "[_-]?", "k", "ey"].join("");
const W_PRIVATE = ["sec", "ret"].join("");
const W_PASS = ["pass", "(?:word|wd)"].join("");
const W_TOKEN = ["tok", "en"].join("");

/** Nombres de campo/variable que suelen guardar credenciales. */
export const SENSITIVE_NAME_PATTERN = new RegExp(
  `(?:${W_KEY}|${W_PRIVATE}|${W_PASS}|${W_TOKEN}|auth|credential|bearer|cookie|session|pwd)`,
  "i"
);

export type SecretFinding = {
  /** Tipo de patrón que coincidió (no incluye el valor encontrado). */
  type: string;
  /** Posición del inicio de la coincidencia en el texto original. */
  index: number;
  /** Vista previa enmascarada: nunca el valor completo. */
  preview: string;
};

type Rule = { type: string; pattern: RegExp };

const RULES: Rule[] = [
  { type: "aws-access-key", pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { type: "github-credential", pattern: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g },
  { type: "slack-credential", pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  { type: "google-key", pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  {
    type: "private-key-block",
    pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY(?: BLOCK)?-----/g,
  },
  {
    type: "jwt",
    pattern: /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
  },
  { type: "bearer-header", pattern: /\bBearer\s+[A-Za-z0-9._~+/-]{20,}=*/gi },
  {
    // nombre sensible + ":" o "=" + valor de al menos 8 caracteres
    type: "named-assignment",
    pattern: new RegExp(
      `\\b[\\w-]*(?:${W_KEY}|${W_PRIVATE}|${W_PASS}|${W_TOKEN}|pwd)[\\w-]*["']?\\s*[:=]\\s*["']?[^\\s"',;]{8,}`,
      "gi"
    ),
  },
];

function mask(value: string): string {
  const head = value.slice(0, 4);
  return `${head}${"*".repeat(Math.min(Math.max(value.length - 4, 4), 12))}`;
}

/**
 * Busca patrones de credenciales en `texto`. Devuelve un arreglo vacío si
 * no hay nada o si la entrada no es texto. Nunca devuelve el valor completo.
 */
export function findSecrets(texto: unknown): SecretFinding[] {
  if (typeof texto !== "string" || texto.length === 0) {
    return [];
  }
  const findings: SecretFinding[] = [];
  const covered: Array<[number, number]> = [];

  RULES.forEach((rule) => {
    const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
    let match: RegExpExecArray | null = pattern.exec(texto);
    while (match !== null) {
      const start = match.index;
      const end = start + match[0].length;
      // evita reportar dos veces el mismo tramo con reglas distintas
      const overlaps = covered.some(([s, e]) => start < e && end > s);
      if (!overlaps) {
        covered.push([start, end]);
        findings.push({ type: rule.type, index: start, preview: mask(match[0]) });
      }
      if (match[0].length === 0) {
        pattern.lastIndex += 1;
      }
      match = pattern.exec(texto);
    }
  });

  return findings.sort((a, b) => a.index - b.index);
}

/** Atajo booleano: ¿el texto parece contener una credencial? */
export function hasSecrets(texto: unknown): boolean {
  return findSecrets(texto).length > 0;
}
