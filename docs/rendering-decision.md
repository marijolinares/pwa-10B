# Decisión de renderizado — Semana 4

## Contexto

La PWA de inspecciones de laboratorio necesita dos rutas nuevas:
- **Listado** (`/inspecciones`) — muestra todas las inspecciones sintéticas.
- **Detalle** (`/inspecciones/[id]`) — ficha completa de una inspección.

Next.js App Router permite elegir entre **Client Components** (CSR) y **Server Components** (SSR) por cada ruta. Este documento justifica la decisión tomada para cada una.

---

## Decisión: Listado → CSR (Client-Side Rendering)

**Responsable:** Irvin Isael Martínez Alejo

### Justificación
- El listado necesita estados de carga visibles (spinner/skeleton) que demuestren el ciclo de vida del componente en el cliente.
- Permite futuras interacciones sin recargar: filtrar por estado, buscar por laboratorio, ordenar por fecha.
- El evaluador puede observar la transición carga → contenido en el navegador.

### Trade-offs
| Ventaja | Desventaja |
|---------|-----------|
| Interactividad inmediata sin recarga | Primera pintura es un spinner (no hay datos en el HTML inicial) |
| Estados de loading/error controlados en el cliente | SEO limitado: los bots sin JS no ven datos |
| Menor carga en el servidor | Requiere más JavaScript en el bundle del cliente |

### Métrica de comparación
- **TTFB (Time to First Byte):** Rápido porque el servidor envía un shell vacío.
- **LCP (Largest Contentful Paint):** Más lento porque depende de que el JS se ejecute y haga el fetch simulado.

---

## Decisión: Detalle → SSR (Server-Side Rendering)

**Responsable:** Germán Yair Martinez Bolaños

### Justificación
1. **SEO y compartibilidad:** El HTML del detalle llega completo al navegador. Si un técnico comparte el enlace `/inspecciones/inspection-001`, cualquier persona (o bot) verá el contenido sin necesidad de ejecutar JavaScript.

2. **Menor TTFB percibido:** Los datos sintéticos están en memoria del servidor — no hay latencia de red ni fetch en el cliente. El usuario ve el contenido en la primera pintura.

3. **Sin hydration mismatch:** Como no hay interactividad dinámica en el detalle (no hay `useState` ni `useEffect`), el componente es un Server Component puro. Esto elimina el riesgo de desajustes entre el HTML del servidor y el DOM hidratado en el cliente.

4. **Generación estática (SSG):** Usando `generateStaticParams()`, Next.js pre-renderiza los detalles de las 3 inspecciones conocidas en tiempo de build. Esto significa que las páginas se sirven como archivos estáticos — cero costo de servidor por request.

5. **Metadata dinámica:** `generateMetadata()` genera `<title>` y `<meta description>` específicos por inspección, mejorando la trazabilidad cuando se abre cada URL.

### Trade-offs
| Ventaja | Desventaja |
|---------|-----------|
| HTML completo en primera pintura (LCP rápido) | Si los datos cambiaran frecuentemente, se necesitaría revalidación (ISR) |
| Funciona sin JavaScript en el cliente | No hay interactividad sin agregar Client Components hijo |
| Zero bundle JS extra para esta ruta | Un ID inexistente genera un render de "no encontrado" en el servidor |
| `generateStaticParams` permite SSG completo | Agregar inspecciones requiere rebuild o revalidación |

### Métrica de comparación
- **TTFB:** Mínimo (archivo estático pre-renderizado).
- **LCP:** Rápido (el contenido completo está en el HTML del servidor).
- **FID/INP:** N/A (no hay interactividad en esta ruta).

---

## Comparación lado a lado

| Aspecto | Listado (CSR) | Detalle (SSR) |
|---------|---------------|---------------|
| Estrategia | Client Component (`"use client"`) | Server Component (default) |
| Primera pintura | Spinner/skeleton → datos | Contenido completo |
| SEO | ❌ Sin datos para bots sin JS | ✅ HTML completo |
| Interactividad | ✅ Filtros, orden, paginación futura | ❌ Solo lectura |
| Bundle JS | Mayor (React hooks, estado) | Cero JS extra |
| Estado de carga | En el cliente (visible) | En el servidor (invisible) |
| Estado de error | `onRetry` con reintentar | 404 de "no encontrado" |

---

## Limitaciones conocidas

1. Los datos son **sintéticos** y están hardcodeados en `src/lib/data/inspections.ts`. No hay API real.
2. La latencia del fetch CSR es **artificial** (800ms). En producción dependería de la velocidad de red.
3. El detalle SSR con `generateStaticParams` solo pre-genera las 3 inspecciones existentes. Un ID dinámico nuevo requeriría rebuild.
4. No se mide el impacto real en dispositivos de baja gama o redes lentas (solo comparación conceptual).

---

## Referencias

- [Next.js Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Next.js Client Components](https://nextjs.org/docs/app/building-your-application/rendering/client-components)
- [generateStaticParams](https://nextjs.org/docs/app/api-reference/functions/generate-static-params)
