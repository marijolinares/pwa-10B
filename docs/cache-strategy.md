# Estrategia de Caché — PWA de Inspecciones de Laboratorio

> Documento de decisiones técnicas para la Semana 3.
> Autor: Germán Yair Martinez Bolaños

---

## Contexto

La PWA debe funcionar con conectividad intermitente en laboratorios de la universidad. Los técnicos necesitan consultar inspecciones aunque pierdan señal temporalmente. El service worker es el componente central que intercepta peticiones de red y decide si responder desde caché o desde la red.

---

## Qué se cachea y qué no

### Precache (install time)

Recursos que se descargan durante la instalación del SW y se almacenan antes de que el usuario los necesite:

| Recurso | Justificación |
|---|---|
| `/` (HTML de la página principal) | Permite cargar la app sin red; también sirve como fallback offline para cualquier navegación |
| `/manifest.webmanifest` | Necesario para la instalación PWA |
| `/icons/icon-192x192.png` | Ícono visible durante la instalación |
| `/icons/icon-512x512.png` | Ícono para splash screen |

### Runtime cache (fetch time)

Recursos que se cachean la primera vez que el usuario los solicita:

| Patrón | Estrategia | Justificación |
|---|---|---|
| `/_next/static/*` (JS, CSS bundled) | **Cache First** → `runtime-v1` | Son inmutables (el hash en el nombre garantiza unicidad); no tiene sentido ir a la red si ya están en caché |
| `/icons/*` | **Cache First** → `runtime-v1` | Cambian raramente; priorizar velocidad |
| Navegación HTML (mismo origen) | **Network First** → `shell-v1` | Siempre intentar obtener la versión más reciente; si la red falla, servir desde caché; si tampoco hay caché, devolver `/` (la página principal precacheada) |

### Qué NO se cachea

| Recurso | Motivo |
|---|---|
| APIs externas / datos de terceros | No controlamos su caducidad ni su política de CORS |
| Tokens, claves, cookies de sesión | Riesgo de seguridad: almacenar credenciales en caché persistente puede exponer datos |
| Respuestas con status ≠ 200 | Cachear errores causaría que el usuario vea errores permanentes |
| Peticiones POST/PUT/DELETE | Solo se cachean respuestas GET; las mutaciones deben llegar al servidor |

---

## Estrategias de caché explicadas

### Cache First (assets estáticos)

```
Petición → ¿Está en caché? → Sí → Devolver desde caché
                            → No → Ir a la red → Guardar en caché → Devolver
```

**Ventaja:** Velocidad máxima para recursos que no cambian.
**Riesgo:** Si el recurso cambia en el servidor, el usuario ve la versión vieja hasta que se invalide el caché (controlado por el versionamiento del SW).

### Network First (navegación HTML)

```
Petición → Intentar red → ¿Éxito? → Guardar en shell-v1 → Devolver
                         → ¿Fallo? → ¿Está en caché? → Sí → Devolver desde caché
                                                       → No → Devolver caches.match("/")
```

**Ventaja:** El usuario siempre obtiene la versión más reciente si hay red.
**Riesgo:** Más lento que Cache First cuando hay red (latencia de red antes de responder).

---

## Ciclo de vida del Service Worker

### Install

1. Se abre el caché versionado (`shell-v1`).
2. Se agregan todos los recursos del precache con `cache.addAll()`.
3. **No** se llama `self.skipWaiting()` — el SW queda en estado `waiting` hasta que el usuario recargue o cierre todas las pestañas. Esto se decidió para evitar inconsistencias entre el HTML servido y los assets cacheados (ver sección Trade-offs).

### Activate

1. Se listan todos los cachés existentes y se eliminan los que no sean `shell-v1` ni `runtime-v1`.
2. Se llama `self.clients.claim()` para tomar control inmediato de las pestañas abiertas.

### Fetch

1. Solo se interceptan peticiones `GET` (las demás se dejan pasar al navegador).
2. Se aplica la estrategia según el tipo de recurso (ver tabla arriba).
3. Si todo falla para una navegación (red + caché específico), se devuelve `caches.match("/")` — la página principal precacheada como fallback genérico.
4. Para el resto de peticiones que no sean navegación ni assets estáticos, se intenta red y, si falla, se busca en caché sin cachear la respuesta.

---

## Estrategia de actualización

### Versionamiento

El SW usa una constante `CACHE_VERSION` (actualmente `'v1'`), que se concatena a los nombres de caché: `shell-${CACHE_VERSION}` y `runtime-${CACHE_VERSION}`. Para desplegar una actualización:

1. Se incrementa la versión a `'v2'` → los cachés pasan a llamarse `shell-v2` y `runtime-v2`.
2. El navegador detecta que `sw.js` cambió (byte comparison).
3. El nuevo SW se instala en paralelo (precachea con los nuevos nombres de caché).
4. Al activarse, el listener de `activate` elimina cualquier caché que no esté en la lista actual (`shell-v2`, `runtime-v2`), limpiando los de la versión anterior.

### Protección contra versiones corruptas

- El precache usa `addAll()`, que es **atómico**: si falla la descarga de cualquier recurso, no se guarda ninguno. Esto evita servir un shell incompleto.
- La limpieza de cachés viejos solo ocurre en `activate`, después de que el nuevo precache se completó con éxito.

### Notificación de actualización

El módulo `register-service-worker.ts` escucha `updatefound` y notifica por consola cuando una nueva versión está lista. No se fuerza recarga automática porque:

- Interrumpir al usuario a mitad de una inspección causaría pérdida de datos no guardados.
- El usuario puede recargar manualmente cuando le convenga.

---

## Trade-offs

### Vanilla JS vs Workbox

| Aspecto | Vanilla JS (elegido) | Workbox |
|---|---|---|
| Dependencias | Ninguna | ~20 KB de runtime |
| Comprensión | Obliga a entender el ciclo de vida | Abstrae detalles |
| Mantenibilidad | Más código manual | Configuración declarativa |
| Build pipeline | No requiere | Requiere plugin (workbox-webpack-plugin o similar) |

**Decisión:** Se eligió vanilla JS porque el proyecto no tiene un build pipeline para el SW (Next.js no lo procesa), y la tarea requiere demostrar comprensión del ciclo de vida. Si el proyecto creciera significativamente, migrar a Workbox reduciría el código manual.

### skipWaiting vs esperar

- **skipWaiting:** La actualización se activa inmediatamente. Riesgo: si el HTML viejo espera JS del caché nuevo, puede haber inconsistencia.
- **Esperar (elegido):** Más seguro; el SW nuevo se activa cuando el usuario recarga o cierra todas las pestañas.

**Decisión:** Se optó por **no** llamar `self.skipWaiting()` para evitar que un HTML viejo quede servido con assets del caché nuevo. El módulo `register-service-worker.ts` ya notifica por consola cuando hay una actualización disponible, y el usuario puede recargar cuando le convenga. Si en el futuro se decide forzar la activación inmediata, se puede agregar `self.skipWaiting()` en el listener de `install` y coordinar con el registro del cliente.

---

## Limitaciones conocidas

1. **Sin IndexedDB:** No se almacenan datos estructurados offline. Las inspecciones se sirven como datos estáticos en el HTML, no desde una API cacheada.
2. **Sin validación de MIME types:** El SW no verifica que el servidor devuelva `application/manifest+json` para el manifest.
3. **Sin sincronización en background:** No se usa la Background Sync API. Si el técnico captura datos offline, no se envían automáticamente al recuperar conexión.
4. **Pruebas en Node, no en navegador:** Vitest corre en Node.js, así que las pruebas validan la estructura del código del SW (lectura de archivos), no el comportamiento real de interceptación de fetch en un navegador. Una prueba E2E con Playwright sería necesaria para validar el comportamiento real.
5. **HTTPS requerido:** Los service workers solo funcionan sobre HTTPS (o localhost). En producción se requiere certificado SSL.
