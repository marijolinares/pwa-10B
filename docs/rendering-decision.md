# Decisión de renderizado — Semana 4

## Contexto y supuestos

La PWA de inspecciones de laboratorio tiene dos rutas nuevas:
- **Listado** (`/inspecciones`): muestra las inspecciones sintéticas.
- **Detalle** (`/inspecciones/[id]`): ficha completa de una inspección.

Next.js App Router permite elegir entre **Client Components** (CSR) y **Server Components** por cada ruta. Este documento justifica la decisión de cada una, la compara en carga, accesibilidad y complejidad, y explica cómo la verificamos.

Supuestos del análisis:
- Todos los datos son sintéticos (3 registros en `src/lib/data/inspections.ts`). No hay backend real, autenticación ni datos personales.
- En este documento, **SSR** significa que el HTML se genera en el servidor en cada petición; **CSR**, que el navegador genera la vista y pide los datos después.
- Las cifras de tamaño salen de `npm run build` (Next.js 14.2.35) en una sola máquina local y corresponden al commit evaluado; no son mediciones de rendimiento en dispositivos reales.
- Las métricas TTFB y LCP de este documento son razonamiento conceptual, no mediciones.

---

## Decisión: Listado → CSR (Client-Side Rendering)

**Responsable:** Irvin Isael Martínez Alejo

### Justificación
- El listado necesita estados de carga y error visibles en el cliente (`LoadingState`, `ErrorState` con reintento, `EmptyState`).
- Permite futuras interacciones sin recargar: filtrar por estado, buscar por laboratorio, ordenar por fecha.
- Los datos se piden desde el navegador a `/api/inspecciones`. Como el endpoint responde de inmediato con datos locales, el estado de carga dura una fracción de segundo; para observarlo basta limitar la red en DevTools (Network → Slow 4G).

### Trade-offs
| Ventaja | Desventaja |
|---------|-----------|
| Interactividad inmediata sin recarga | La primera pintura es un estado de carga (no hay datos en el HTML inicial) |
| Estados de loading/error controlados en el cliente | SEO limitado: los bots sin JS no ven datos |
| Menor trabajo del servidor por petición | Más JavaScript en el bundle del cliente |

### Métrica de comparación (conceptual)
- **TTFB:** rápido, porque el servidor entrega un HTML con el estado de carga.
- **LCP:** más lento, porque depende de que el JS se ejecute y complete el fetch.

---

## Decisión: Detalle → SSR (Server-Side Rendering)

**Responsable:** Germán Yair Martinez Bolaños

### Cómo se implementa
La ruta es un Server Component que declara `export const dynamic = "force-dynamic"`. Next.js la renderiza en el servidor **en cada petición** (el build la marca con `ƒ`) en lugar de pregenerarla. Además tiene `loading.tsx` (se muestra mientras el servidor renderiza) y `error.tsx` (captura fallos con opción de reintento). La primera versión usaba `generateStaticParams()`, lo que producía SSG; se cambió porque la actividad pide comparar CSR con SSR real y porque un ID nuevo requería rebuild.

### Justificación
1. **SEO y compartibilidad:** el HTML llega completo. Si un técnico comparte `/inspecciones/inspection-001`, cualquier persona o bot ve el contenido sin ejecutar JavaScript.
2. **Datos resueltos al momento de la petición:** si las inspecciones vinieran de una base de datos, el detalle reflejaría los cambios sin rebuild.
3. **Carga y error gestionados por el framework:** `loading.tsx` y `error.tsx` no requieren estado en el cliente.
4. **Sin hydration mismatch:** la página no usa `useState` ni `useEffect`, así que es un Server Component puro.
5. **Metadata específica:** `generateMetadata()` genera `<title>` y descripción propios para cada inspección.

### Trade-offs
| Ventaja | Desventaja |
|---------|-----------|
| HTML completo en la primera pintura | Cada petición ejecuta el servidor: más costo y TTFB mayor que un archivo pregenerado |
| Contenido siempre actualizado, sin rebuild | Requiere un servidor Node en ejecución (no sirve como hosting estático) |
| Funciona sin JavaScript en el cliente | Sin interactividad salvo que se agreguen Client Components hijos |
| Los IDs nuevos funcionan sin regenerar nada | Un ID inexistente se resuelve en el servidor con "no encontrado" |

### Métrica de comparación (conceptual)
- **TTFB:** mayor que un archivo estático; depende del servidor.
- **LCP:** rápido una vez que llega el HTML, porque ya trae el contenido.
- **INP:** no aplica (ruta de solo lectura).

---

## Evidencia del build

**Métrica de carga repetible:** el *First Load JS* por ruta que imprime `npm run build`. Cualquier persona con el mismo commit y `npm ci` obtiene los mismos valores.

| Ruta | Marca del build | Tamaño de la ruta | First Load JS |
|------|-----------------|-------------------|---------------|
| `/inspecciones` | ○ Static (con fetch en el cliente) | 10.4 kB | 97.7 kB |
| `/inspecciones/[id]` | ƒ Dynamic (renderizada en cada petición) | 816 B | 88.1 kB |
| `/api/inspecciones` | ○ Static | 0 B | 0 B |

El JS compartido por todas las rutas es de 87.3 kB. La ruta cliente (listado) carga **9.6 kB más** en la primera visita que la ruta de servidor (detalle). Además, `/api/inspecciones` sale como estática, así que el listado descarga un JSON pregenerado.

---

## Comparación lado a lado

| Aspecto | Listado (CSR) | Detalle (SSR) |
|---------|---------------|---------------|
| Estrategia | Client Component (`"use client"`) | Server Component con `dynamic = "force-dynamic"` |
| Cuándo se genera el HTML | En el navegador, tras cargar el JS | En el servidor, en cada petición |
| Primera pintura | Estado de carga → datos | Contenido completo |
| SEO | ❌ Sin datos para bots sin JS | ✅ HTML completo |
| Interactividad | ✅ Filtros, orden, paginación futura | ❌ Solo lectura |
| First Load JS | 97.7 kB | 88.1 kB |
| Costo de servidor | Bajo (solo entrega el JSON) | Mayor (renderiza cada petición) |
| Estado de carga | `LoadingState` en el cliente mientras llega el fetch | `loading.tsx` mientras el servidor renderiza |
| Estado de error | `ErrorState` con reintento | `error.tsx` con reintento; "no encontrado" con enlace al listado |

---

## Accesibilidad y complejidad

**Accesibilidad** (revisión del código; no se ejecutó una auditoría automática como Lighthouse o axe):
- Los estados están marcados con roles ARIA: `LoadingState` usa `role="status"` con `aria-live="polite"`, `ErrorState` usa `role="alert"` y `NotFoundState` usa `role="status"`.
- El listado agrupa su contenido con `aria-labelledby`; el detalle usa un `h1`, secciones etiquetadas y un enlace de regreso dentro de un `nav` con `aria-label`.
- En el detalle el contenido llega ya resuelto en el HTML, sin cambios dinámicos que anunciar; en el listado, los estados cambian en el cliente.

**Complejidad:**

| Aspecto | Listado (CSR) | Detalle (SSR) |
|---------|---------------|---------------|
| Archivos involucrados | `page.tsx` + endpoint `route.ts` | `page.tsx`, `loading.tsx` y `error.tsx` |
| Estado en el cliente | 3 `useState` + `useEffect` + `fetch` | Ninguno |
| Casos a manejar a mano | Carga, error, reintento y vacío | Solo "no encontrado" (carga y error los resuelve el framework) |
| Riesgo de hydration mismatch | Bajo: el primer render (estado de carga) es igual en servidor y cliente | Bajo: no hay estado en el cliente |

---

## Relación con el service worker (Semana 3)

Según el código de `public/sw.js`:
- Las navegaciones usan network-first y guardan una copia: un detalle **ya visitado** puede abrirse sin conexión; uno **nunca visitado** cae a la página principal.
- Las peticiones a `/api/inspecciones` no se guardan en caché, por lo que sin conexión el listado mostrará su estado de error.

Este análisis sale de leer el código; todavía no se probó manualmente en el navegador (DevTools → Network → Offline).

---

## Qué verifican las pruebas y qué no

`tests/rendering.spec.ts` tiene 16 pruebas (Vitest + happy-dom):
- **Listado (5):** existe, muestra carga, muestra datos, muestra error y muestra estado vacío.
- **Detalle (4):** renderiza una inspección válida, muestra "no encontrado" para un ID inválido, y tiene estado de carga (`loading.tsx`) y de error con reintento (`error.tsx`).
- **Estructura (3):** el listado declara `"use client"`, el detalle no, y el detalle fuerza el renderizado por petición (`dynamic = "force-dynamic"`) sin pregenerar rutas.
- **Comportamiento adicional (2):** el listado consulta `/api/inspecciones` y el botón Reintentar recupera los datos tras un error.
- **Estados compartidos (2):** `loading-state.tsx` exporta los cuatro estados y `NotFoundState` muestra mensaje y enlace.

No verifican: tiempos reales (TTFB, LCP), ejecución en un navegador real, ni que el servidor renderice de verdad cada petición (eso lo confirma la marca `ƒ` del build). Esa cobertura requeriría pruebas E2E (por ejemplo, Playwright) y mediciones con Lighthouse.

---

## Fallos encontrados

1. **Implementación duplicada del listado:** el PR del detalle incluyó también una versión del listado CSR, que chocó con la rama de Irvin. Se resolvió conservando la versión de Irvin, por ser su tarea asignada.
2. **Detalle generado como SSG en lugar de SSR:** al revisar la salida del build, el detalle aparecía con `●` (pregenerado) por usar `generateStaticParams`. Se corrigió con `dynamic = "force-dynamic"`, y el build ahora lo marca con `ƒ`.
3. **Detalle sin estados de carga y error propios:** solo manejaba "no encontrado". Se agregaron `loading.tsx` y `error.tsx`, con pruebas.
4. **Dato de latencia sin sustento:** una versión anterior de este documento mencionaba una latencia artificial de 800 ms en el listado. Al revisar `route.ts` y la página, no existe ningún retraso en el código; se retiró.

---

## Cuándo revisaríamos la decisión

- **Detalle a SSG o ISR** (`generateStaticParams` con `revalidate`) si las inspecciones cambian poco y se quiere reducir el costo de servidor.
- **Listado a Server Component** si no llegan filtros ni búsqueda y se quiere reducir el JS inicial.
- **Listado disponible sin conexión** guardando `/api/inspecciones` en el caché del service worker, en una semana posterior.

---

## Limitaciones conocidas

1. Los datos son **sintéticos** y están fijos en `src/lib/data/inspections.ts`; el endpoint `/api/inspecciones` no tiene un backend real detrás.
2. Solo se compararon tamaños de build y razonamiento conceptual; no se midieron TTFB, LCP ni dispositivos de gama baja, y no se hizo una auditoría automática de accesibilidad.
3. No hay latencia artificial en el código: los estados de carga y error solo se aprecian simulando una red lenta o bloqueando la petición desde DevTools.
4. El SSR exige un servidor Node en ejecución; la app ya no podría publicarse como sitio completamente estático.

---

## Referencias

- [Next.js Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Next.js Client Components](https://nextjs.org/docs/app/building-your-application/rendering/client-components)
- [Route Segment Config: dynamic](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config)