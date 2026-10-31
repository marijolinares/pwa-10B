/**
 * tests/security.spec.ts — Pruebas de seguridad y privacidad (Semana 9).
 *
 * Cinco bloques, uno por control del modelo de amenazas (docs/threat-model.md):
 *   1. CSP y headers          -> src/lib/security/headers.ts + src/middleware.ts + robots.txt
 *   2. Secretos               -> src/lib/security/secrets.ts
 *   3. Sanitización           -> src/lib/security/sanitize.ts
 *   4. Privacidad y retención -> src/lib/security/privacy.ts
 *   5. API                    -> src/app/api/inspecciones/route.ts
 *
 * Reglas del archivo:
 *  - Todo es sintético y determinista: sin red, sin reloj real, sin servicios.
 *  - Las cadenas con forma de credencial se ARMAN en tiempo de ejecución
 *    (helper `w`), así ningún valor parecido a una clave vive escrito en el
 *    repositorio, ni siquiera de mentira.
 *  - Cada prueba tiene un caso negativo: si alguien quita un control, falla.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { NextRequest } from "next/server";
import { buildCsp, securityHeaders } from "../src/lib/security/headers";
import { middleware, config as middlewareConfig } from "../src/middleware";
import { findSecrets, hasSecrets } from "../src/lib/security/secrets";
import { sanitizeText, parseJsonBody } from "../src/lib/security/sanitize";
import { redactForLog, isExpired, REDACTED } from "../src/lib/security/privacy";
import { POST, GET } from "../src/app/api/inspecciones/route";
import { listInspections, resetInspections } from "../src/lib/server/inspection-store";

const ROOT = join(__dirname, "..");

/** Une partes de texto: evita escribir literales sensibles en el código. */
const w = (...parts: string[]) => parts.join("");

/* ── Valores falsos con forma de credencial (armados al vuelo) ─────── */
const FAKE_AWS = w("AK", "IA", "ABCDEFGHIJKLMNOP");
const FAKE_GH = w("gh", "p_", "a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8");
const FAKE_PEM = w("-----BEGIN ", "RSA PRIVATE", " KEY-----");
const FAKE_JWT = w("ey", "JhbGciOiJIUzI1", ".", "ey", "JzdWIiOiJzaW50ZXRpY28i", ".", "firma1234567890");
const FAKE_BEARER = w("Bear", "er ", "abcdefghijklmnopqrstuvwxyz012345");
const FAKE_ASSIGN = w("to", "ken", "=", "valorSintetico123");

function jsonPost(body: unknown, headers: Record<string, string> = {}) {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return new Request("http://localhost:3000/api/inspecciones", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: text,
  });
}

const VALID = {
  id: "sec-001",
  location: "Laboratorio de redes",
  inspector: "Persona Sintetica",
  date: "2026-10-30",
  findings: 1,
  summary: "Revision sintetica del cableado del laboratorio.",
};

/* ═════════════════════════════════════════════════════════════════════ */
describe("CSP y headers", () => {
  it("la CSP restringe todo a 'self' y bloquea objetos, frames y bases ajenas", () => {
    const csp = buildCsp({ dev: false });
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
  });

  it("la CSP no abre comodines ni orígenes http:// en ninguna directiva", () => {
    [true, false].forEach((dev) => {
      const sources = buildCsp({ dev }).split(";").flatMap((d) => d.trim().split(/\s+/).slice(1));
      expect(sources).not.toContain("*");
      expect(sources).not.toContain("http:");
      expect(sources.some((s) => s.startsWith("http://"))).toBe(false);
    });
  });

  it("en producción no permite eval y fuerza HTTPS; en desarrollo sí permite eval pero no fuerza HTTPS", () => {
    const prod = buildCsp({ dev: false });
    const dev = buildCsp({ dev: true });
    expect(prod).not.toContain("'unsafe-eval'");
    expect(prod).toContain("upgrade-insecure-requests");
    expect(dev).toContain("'unsafe-eval'");
    expect(dev).not.toContain("upgrade-insecure-requests");
  });

  it("los headers incluyen nosniff, anti-framing, referrer, HSTS y permisos mínimos", () => {
    const map = new Map(securityHeaders({ dev: false }).map((h) => [h.key.toLowerCase(), h.value]));
    expect(map.get("x-content-type-options")).toBe("nosniff");
    expect(map.get("x-frame-options")).toBe("DENY");
    expect(map.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(map.get("strict-transport-security")).toMatch(/max-age=\d{7,}/);
    expect(map.get("content-security-policy")).toBe(buildCsp({ dev: false }));

    const perms = map.get("permissions-policy") ?? "";
    expect(perms).toContain("microphone=()"); // la app no usa micrófono
    expect(perms).toContain("camera=(self)"); // solo la propia app, nunca terceros
    expect(perms).toContain("geolocation=(self)");
    expect(perms).not.toMatch(/=\*/); // ninguna capacidad abierta a cualquiera
  });

  it("el middleware agrega todos los headers a la respuesta", () => {
    const res = middleware(new NextRequest("http://localhost:3000/inspecciones"));
    securityHeaders().forEach(({ key, value }) => {
      expect(res.headers.get(key)).toBe(value);
    });
  });

  it("el middleware no se aplica a los estáticos inmutables de Next", () => {
    const pattern = new RegExp(`^${middlewareConfig.matcher[0]}$`);
    expect(pattern.test("/inspecciones")).toBe(true);
    expect(pattern.test("/api/inspecciones")).toBe(true);
    expect(pattern.test("/_next/static/chunks/app.js")).toBe(false);
  });

  it("next.config oculta poweredBy y obliga a revalidar el service worker (/sw.js)", async () => {
    // Import dinámico por URL: next.config.mjs es JavaScript y no tiene tipos.
    const mod = await import(/* @vite-ignore */ pathToFileURL(join(ROOT, "next.config.mjs")).href);
    const nextConfig = mod.default as {
      poweredByHeader?: boolean;
      headers?: () => Promise<Array<{ source: string; headers: Array<{ key: string; value: string }> }>>;
    };
    expect(nextConfig.poweredByHeader).toBe(false);
    const rules = (await nextConfig.headers?.()) ?? [];
    const sw = rules.find((rule) => rule.source === "/sw.js");
    expect(sw?.headers).toContainEqual({ key: "Cache-Control", value: "no-cache" });
  });

  it("robots.txt pide no indexar la API, sin listar rutas privadas como 'protección'", () => {
    const robots = readFileSync(join(ROOT, "public", "robots.txt"), "utf8");
    expect(robots).toMatch(/User-agent:\s*\*/);
    expect(robots).toMatch(/Disallow:\s*\/api\//);
    // robots.txt es público: no debe revelar rutas internas ni sugerir secretos.
    expect(robots).not.toMatch(/admin|backup|private|\.env/i);
  });
});

/* ═════════════════════════════════════════════════════════════════════ */
describe("Secretos", () => {
  const CASES: Array<[string, string]> = [
    ["aws-access-key", FAKE_AWS],
    ["github-credential", FAKE_GH],
    ["private-key-block", FAKE_PEM],
    ["jwt", FAKE_JWT],
    ["bearer-header", FAKE_BEARER],
    ["named-assignment", FAKE_ASSIGN],
  ];

  CASES.forEach(([type, sample]) => {
    it(`detecta ${type} dentro de un texto normal`, () => {
      const found = findSecrets(`Nota del laboratorio: ${sample} y más texto.`);
      expect(found.map((f) => f.type)).toContain(type);
      expect(hasSecrets(`sin nada raro`)).toBe(false);
    });
  });

  it("nunca devuelve el valor completo, solo una vista enmascarada", () => {
    const [finding] = findSecrets(FAKE_AWS);
    expect(finding.preview).not.toBe(FAKE_AWS);
    expect(finding.preview).toContain("*");
    expect(finding.preview.length).toBeLessThan(FAKE_AWS.length + 1);
  });

  it("no marca texto cotidiano de inspecciones como credencial", () => {
    [
      "Laboratorio 3: se encontraron 2 hallazgos en el cableado.",
      "Responsable: Persona Sintetica. Fecha 2026-10-30.",
      "El equipo de red necesita mantenimiento preventivo.",
    ].forEach((text) => expect(findSecrets(text)).toEqual([]));
  });

  it("entradas que no son texto no rompen el detector", () => {
    [null, undefined, 42, {}, [], ""].forEach((value) => expect(findSecrets(value)).toEqual([]));
  });

  it("el repositorio no contiene credenciales con forma conocida (src, public, docs, tests, .github)", () => {
    const ALLOWED_EXT = /\.(ts|tsx|js|mjs|json|md|txt|yml|yaml|css|html)$/;
    const hits: string[] = [];
    const walk = (dir: string) => {
      readdirSync(dir).forEach((name) => {
        if (name === "node_modules" || name === ".next" || name === "coverage") return;
        const full = join(dir, name);
        if (statSync(full).isDirectory()) return walk(full);
        if (!ALLOWED_EXT.test(name) || name === "package-lock.json") return;
        const found = findSecrets(readFileSync(full, "utf8"));
        // Solo los tipos de formato fijo: las asignaciones con nombre pueden
        // aparecer legítimamente en documentación que explica el riesgo.
        found
          .filter((f) => f.type !== "named-assignment")
          .forEach((f) => hits.push(`${relative(ROOT, full)} (${f.type})`));
      });
    };
    ["src", "public", "docs", "tests", ".github"].forEach((d) => {
      const dir = join(ROOT, d);
      if (existsSync(dir)) walk(dir);
    });
    expect(hits).toEqual([]);
  });
});

/* ═════════════════════════════════════════════════════════════════════ */
describe("Sanitización", () => {
  it("elimina etiquetas HTML, incluso las anidadas para evadir el filtro", () => {
    expect(sanitizeText("Hola <b>mundo</b>", 50)).toBe("Hola mundo");
    expect(sanitizeText("<script>alert(1)</script>Lab", 50)).not.toMatch(/[<>]/);
    expect(sanitizeText("<<b>script>alert(1)<</b>/script>", 50)).not.toMatch(/<script/i);
  });

  it("quita caracteres de control y marcas invisibles o bidireccionales", () => {
    const dirty = "ab\u0000c\u0007d‮ef​gh﻿";
    expect(sanitizeText(dirty, 50)).toBe("abcdefgh");
  });

  it("colapsa espacios y saltos de línea y recorta los extremos", () => {
    expect(sanitizeText("  uno \n\n  dos\t\ttres  ", 50)).toBe("uno dos tres");
  });

  it("limita por caracteres sin partir un emoji", () => {
    const out = sanitizeText("😀😀😀😀😀", 3);
    expect(Array.from(out)).toHaveLength(3);
    expect(out).toBe("😀😀😀");
  });

  it("devuelve cadena vacía si no es texto o el límite no es válido", () => {
    expect(sanitizeText(null, 10)).toBe("");
    expect(sanitizeText({ a: 1 }, 10)).toBe("");
    expect(sanitizeText("texto", 0)).toBe("");
    expect(sanitizeText("texto", Number.NaN)).toBe("");
  });

  it("parseJsonBody rechaza vacío o inválido con 400", () => {
    ["", "   ", "{no es json", undefined].forEach((raw) => {
      const r = parseJsonBody(raw, 1024);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.status).toBe(400);
    });
  });

  it("parseJsonBody mide en bytes UTF-8 y rechaza con 413", () => {
    const raw = JSON.stringify({ t: "ñ".repeat(60) }); // ~120+ bytes, ~70 caracteres
    expect(parseJsonBody(raw, 200).ok).toBe(true);
    const r = parseJsonBody(raw, 100);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(413);
  });

  it("parseJsonBody rechaza JSON demasiado anidado con 422", () => {
    let nested: unknown = 1;
    for (let i = 0; i < 20; i += 1) nested = { a: nested };
    const r = parseJsonBody(JSON.stringify(nested), 10_000);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(422);
  });

  it("parseJsonBody descarta claves de contaminación de prototipos", () => {
    const r = parseJsonBody('{"id":"a","__proto__":{"polluted":true},"constructor":{"x":1}}', 1024);
    expect(r.ok).toBe(true);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    if (r.ok) {
      const value = r.value as Record<string, unknown>;
      expect(Object.keys(value)).toEqual(["id"]);
    }
  });

  it("parseJsonBody acepta un cuerpo válido dentro del límite", () => {
    const r = parseJsonBody(JSON.stringify(VALID), 16 * 1024);
    expect(r.ok).toBe(true);
    if (r.ok) expect((r.value as typeof VALID).id).toBe("sec-001");
  });
});

/* ═════════════════════════════════════════════════════════════════════ */
describe("Privacidad y retención", () => {
  it("redactForLog enmascara campos personales y de ubicación exacta", () => {
    const out = redactForLog({
      inspector: "Persona Sintetica",
      correo: "persona@ejemplo.test",
      telefono: "2381234567",
      lat: 18.46,
      lng: -97.39,
      findings: 2,
      status: "attention",
    }) as Record<string, unknown>;
    expect(out.inspector).toBe(REDACTED);
    expect(out.correo).toBe(REDACTED);
    expect(out.telefono).toBe(REDACTED);
    expect(out.lat).toBe(REDACTED);
    expect(out.lng).toBe(REDACTED);
    // lo que no identifica a nadie se conserva para poder depurar
    expect(out.findings).toBe(2);
    expect(out.status).toBe("attention");
  });

  it("enmascara correos, teléfonos y credenciales escritos dentro de texto libre", () => {
    const text = `Contacto persona@ejemplo.test o 238 123 4567, clave ${FAKE_AWS}`;
    const out = JSON.stringify(redactForLog({ nota: text }));
    expect(out).not.toContain("persona@ejemplo.test");
    expect(out).not.toContain("238 123 4567");
    expect(out).not.toContain(FAKE_AWS);
    expect(out).toContain(REDACTED);
  });

  it("enmascara campos cuyo nombre sugiere una credencial", () => {
    const out = redactForLog({ [w("to", "ken")]: "abc", [w("pass", "word")]: "xyz", visible: "ok" }) as Record<
      string,
      unknown
    >;
    expect(out[w("to", "ken")]).toBe(REDACTED);
    expect(out[w("pass", "word")]).toBe(REDACTED);
    expect(out.visible).toBe("ok");
  });

  it("no modifica el original, tolera ciclos y no filtra el stack de un Error", () => {
    const original = { inspector: "Persona Sintetica", anidado: { correo: "a@b.test" } } as Record<string, unknown>;
    const copia = JSON.stringify(original);
    redactForLog(original);
    expect(JSON.stringify(original)).toBe(copia);

    const ciclo: Record<string, unknown> = { nombre: "x" };
    ciclo.self = ciclo;
    expect(() => redactForLog(ciclo)).not.toThrow();

    const err = redactForLog(new Error("falló para persona@ejemplo.test")) as Record<string, unknown>;
    expect(JSON.stringify(err)).not.toContain("persona@ejemplo.test");
    expect(err.stack).toBeUndefined();
  });

  describe("isExpired (retención)", () => {
    const DAY = 24 * 60 * 60 * 1000;
    const NOW = Date.parse("2026-10-30T12:00:00Z");

    it("no vence justo en el límite y sí un instante después", () => {
      const created = NOW - 30 * DAY;
      expect(isExpired({ createdAt: created }, NOW, 30)).toBe(false);
      expect(isExpired({ createdAt: created - 1 }, NOW, 30)).toBe(true);
    });

    it("acepta createdAt como ISO, milisegundos o solo la fecha AAAA-MM-DD", () => {
      expect(isExpired({ createdAt: "2026-10-29T12:00:00Z" }, NOW, 7)).toBe(false);
      expect(isExpired({ createdAt: "2026-01-01T00:00:00Z" }, NOW, 7)).toBe(true);
      expect(isExpired({ date: "2026-10-28" }, NOW, 7)).toBe(false);
      expect(isExpired({ date: "2026-01-01" }, NOW, 7)).toBe(true);
    });

    it("una fecha futura no vence", () => {
      expect(isExpired({ createdAt: NOW + 5 * DAY }, NOW, 7)).toBe(false);
    });

    it("falla hacia lo seguro: dato, fecha, reloj o plazo inválidos se consideran vencidos", () => {
      expect(isExpired({}, NOW, 30)).toBe(true);
      expect(isExpired({ createdAt: "no es fecha" }, NOW, 30)).toBe(true);
      expect(isExpired({ createdAt: NOW }, Number.NaN, 30)).toBe(true);
      expect(isExpired({ createdAt: NOW }, NOW, -1)).toBe(true);
      expect(isExpired({ createdAt: NOW }, NOW, Number.NaN)).toBe(true);
      expect(isExpired(null as never, NOW, 30)).toBe(true);
    });
  });
});

/* ═════════════════════════════════════════════════════════════════════ */
describe("API", () => {
  let warn: ReturnType<typeof vi.spyOn>;
  // El store arranca con inspecciones sintéticas de ejemplo: se compara contra ese punto de partida.
  let base = 0;
  const saved = (id: string) => listInspections().find((i) => i.id === id);

  beforeEach(() => {
    resetInspections();
    base = listInspections().length;
    warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    warn.mockRestore();
    resetInspections();
  });

  it("acepta una inspección válida (201) y es idempotente (200 al repetir)", async () => {
    const first = await POST(jsonPost(VALID));
    expect(first.status).toBe(201);
    const again = await POST(jsonPost(VALID));
    expect(again.status).toBe(200);
    expect(listInspections()).toHaveLength(base + 1);
  });

  it("rechaza un Content-Type que no es JSON con 415", async () => {
    const res = await POST(jsonPost(VALID, { "content-type": "text/plain" }));
    expect(res.status).toBe(415);
    expect(listInspections()).toHaveLength(base);
  });

  it("rechaza un cuerpo mayor al límite con 413 sin guardarlo", async () => {
    const res = await POST(jsonPost({ ...VALID, summary: "x".repeat(20_000) }));
    expect(res.status).toBe(413);
    expect(listInspections()).toHaveLength(base);
  });

  it("rechaza JSON roto con 400", async () => {
    const res = await POST(jsonPost("{esto no es json"));
    expect(res.status).toBe(400);
  });

  it("rechaza con 422 un texto con credenciales y NO lo repite en la respuesta ni en el log", async () => {
    const res = await POST(jsonPost({ ...VALID, summary: `Ver nota ${FAKE_AWS} del equipo` }));
    expect(res.status).toBe(422);
    const body = JSON.stringify(await res.json());
    expect(body).toContain("summary");
    expect(body).not.toContain(FAKE_AWS);
    expect(JSON.stringify(warn.mock.calls)).not.toContain(FAKE_AWS);
    expect(listInspections()).toHaveLength(base);
  });

  it("neutraliza etiquetas HTML antes de guardar", async () => {
    const res = await POST(jsonPost({ ...VALID, inspector: "<script>alert(1)</script>Persona" }));
    expect(res.status).toBe(201);
    const body = (await res.json()) as { inspector: string };
    expect(body.inspector).not.toMatch(/[<>]/);
    expect(saved(VALID.id)?.inspector).not.toMatch(/[<>]/);
  });

  it("ignora campos que el cliente no debería poder fijar", async () => {
    const res = await POST(jsonPost({ ...VALID, isAdmin: true, rol: "admin", __proto__: { x: 1 } }));
    expect(res.status).toBe(201);
    const stored = saved(VALID.id) as unknown as Record<string, unknown>;
    expect(stored.isAdmin).toBeUndefined();
    expect(stored.rol).toBeUndefined();
  });

  it("un rechazo no escribe datos personales en el log", async () => {
    await POST(jsonPost({ ...VALID, inspector: "Persona Sintetica", findings: -5 }));
    const logged = JSON.stringify(warn.mock.calls);
    expect(warn).toHaveBeenCalled();
    expect(logged).not.toContain("Persona Sintetica");
  });

  it("las respuestas no se guardan en caché y llevan nosniff", async () => {
    const post = await POST(jsonPost(VALID));
    const get = await GET();
    [post, get].forEach((res) => {
      expect(res.headers.get("cache-control")).toBe("no-store");
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    });
  });
});
