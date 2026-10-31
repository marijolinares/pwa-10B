# Modelo de amenazas y privacidad — Semana 9

Equipo 8, Grupo 10 B. Autor de este documento: Irvin Isael Martínez Alejo.

## 1. Alcance

PWA de inspecciones de laboratorio (Next.js 14, App Router). Funciona offline con service worker y cola de sincronización, usa geolocalización y notificaciones, y expone la API `/api/inspecciones`. Todos los datos del repositorio son sintéticos. No hay autenticación en esta versión.

## 2. Activos

| Activo | Por qué importa |
|---|---|
| Inspecciones (responsable, fecha, estado, hallazgos) | Es la información principal de la app; no debe alterarse ni filtrarse |
| Cola de sincronización offline | Guarda inspecciones pendientes en el dispositivo hasta que haya red |
| Ubicación y foto del técnico | Datos personales sensibles |
| Service worker y sus cachés (`public/sw.js`) | Si se compromete o queda viejo, controla lo que ve el usuario |
| Código y repositorio | No deben contener claves, tokens ni datos reales |

## 3. Fronteras de confianza

1. Navegador a API (`/api/inspecciones`): todo lo que llega es no confiable y se valida en el servidor.
2. Dispositivo del usuario: la cola local de sync y el caché del service worker viven en el dispositivo y pueden quedarse ahí mucho tiempo.
3. API a almacenamiento (`src/lib/server/inspection-store.ts`): solo debe guardar datos ya validados y saneados.
4. Repositorio a CI/GitHub: lo que se sube al repo queda en el historial.

## 4. Amenazas (STRIDE)

| # | Amenaza | STRIDE | Mitigación | Archivo | Bloque de prueba |
|---|---|---|---|---|---|
| 1 | XSS por texto escrito en una inspección | Tampering | CSP restrictiva y sanitización de texto | `src/lib/security/headers.ts`, `src/lib/security/sanitize.ts` | "CSP y headers", "Sanitización" |
| 2 | Clickjacking (la app embebida en otro sitio) | Spoofing | `frame-ancestors 'none'` y `X-Frame-Options: DENY` | `src/lib/security/headers.ts` | "CSP y headers" |
| 3 | Sniffing de tipo MIME | Tampering | `X-Content-Type-Options: nosniff` | `src/lib/security/headers.ts` | "CSP y headers" |
| 4 | Secretos (claves, tokens) subidos al repo | Information disclosure | `findSecrets()` y escaneo básico de secretos en CI | `src/lib/security/secrets.ts`, workflow `week-09-w09-threat-model-privacy.yml` | "Secretos" |
| 5 | Payload gigante o JSON malformado a la API | Denial of service / Tampering | `parseJsonBody(raw, maxBytes)` con límite de tamaño | `src/lib/security/sanitize.ts`, `src/app/api/inspecciones/route.ts` | "API" |
| 6 | Ubicación o datos personales en logs | Information disclosure | `redactForLog()` | `src/lib/security/privacy.ts` | "Privacidad y retención" |
| 7 | Datos viejos acumulados en el dispositivo | Information disclosure | `isExpired(item, ahoraMs, ttlDias)` para retención con TTL | `src/lib/security/privacy.ts` | "Privacidad y retención" |
| 8 | Service worker viejo cacheado por el navegador | Tampering | `Cache-Control: no-cache` para `/sw.js` | `next.config.mjs` | N/A (revisión manual) |
| 9 | Permisos de dispositivo abusados | Elevation of privilege | `Permissions-Policy` limitada a `camera=(self)` y `geolocation=(self)`; micrófono deshabilitado | `src/lib/security/headers.ts` | "CSP y headers" |
| 10 | Tráfico interceptado en HTTP | Information disclosure | `Strict-Transport-Security` y `upgrade-insecure-requests` en producción | `src/lib/security/headers.ts` | "CSP y headers" |
| 11 | Fuga de la tecnología usada | Information disclosure | `poweredByHeader: false` | `next.config.mjs` | N/A (revisión manual) |
| 12 | Bots indexan la API | Information disclosure | `Disallow: /api/` en robots.txt (solo reduce indexación, no es control de acceso) | `public/robots.txt` | N/A |

## 5. Decisiones de diseño

- Los headers se aplican en `src/middleware.ts` y no en `next.config.mjs`. Next 14 usa `next.config.mjs` (ESM) y este no puede importar un archivo `.ts`. Con middleware se importa `securityHeaders()` directo y hay una sola fuente de verdad.
- `geolocation=(self)` y `camera=(self)` porque la app usa esas capacidades desde la Semana 6.
- `worker-src 'self'` y `manifest-src 'self'` para que la PWA siga funcionando con la CSP activa.
- `unsafe-eval` solo en desarrollo, porque Next lo necesita para recarga en caliente.

## 6. Riesgos residuales

| Riesgo | Por qué se acepta | Mejora posible |
|---|---|---|
| `'unsafe-inline'` en `script-src` y `style-src` | Next inyecta scripts y estilos inline; quitarlo requiere nonces por request | CSP con nonce en middleware |
| `npm audit` es informativo en CI | El starter trae vulnerabilidades altas que no se pueden actualizar sin romper versiones | Actualizar dependencias de forma controlada |
| No hay autenticación en la API | Proyecto académico con datos sintéticos | Agregar autenticación antes de usar datos reales |
| El escaneo de secretos del CI es por patrones simples | Detecta formatos comunes, no todos | Usar una herramienta dedicada |
| Datos en el dispositivo sin cifrar | Fuera del alcance de esta semana | Cifrado local |
| `robots.txt` no protege nada | Solo es una petición a bots que la respetan | Control de acceso real en la API |

## 7. Pruebas que respaldan este documento

Las pruebas están en `tests/security.spec.ts`, agrupadas en estos bloques:

- "CSP y headers": verifica `buildCsp()` y `securityHeaders()`.
- "Secretos": verifica `findSecrets()`.
- "Sanitización": verifica `sanitizeText()` y `parseJsonBody()`.
- "Privacidad y retención": verifica `redactForLog()` e `isExpired()`.
- "API": verifica el endurecimiento de `route.ts`.

Estas pruebas verifican funciones y valores de configuración. No prueban un navegador real, ni que los headers lleguen en cada respuesta HTTP en producción; eso se comprobó manualmente con `npm run dev` y DevTools.

## 8. Uso de IA

Ver el bloque de Semana 9 de `evidence/individual.md`.