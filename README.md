# PWA de Inspecciones de Laboratorio

Aplicación web progresiva para el registro de inspecciones y mantenimiento de laboratorios de la Universidad Tecnológica de Tehuacán. Diseñada para funcionar con conectividad intermitente.

**Grupo:** 10B · **Equipo:** 8  
**Repositorio:** [marijolinares/pwa-10B](https://github.com/marijolinares/pwa-10B)

---

## Entorno requerido

| Herramienta | Versión mínima |
|---|---|
| Node.js | 20.19 o posterior |
| npm | 10 o posterior |
| Git | 2.x |

Registren las versiones locales con:

```bash
node --version
npm --version
git --version
```

---

## Setup (instalación limpia)

```bash
git clone https://github.com/marijolinares/pwa-10B.git
cd pwa-10B
npm ci
```

`npm ci` instala las dependencias exactas de `package-lock.json`, garantizando reproducibilidad entre máquinas. No usar `npm install` para la verificación final.

---

## Ejecución local

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000) y comprobar las inspecciones sintéticas. Detener el servidor con `Ctrl+C`.

---

## Verificación

### Pruebas automatizadas

```bash
npm test -- --run
```

Ejecuta dos suites:
1. **`tests/starter.spec.mjs`** — prueba del starter (semana 1): verifica que `page.tsx` contiene las referencias esperadas.
2. **`tests/manifest.spec.ts`** — prueba del manifest (semana 2): valida estructura, campos obligatorios W3C, íconos PWA e integración con `layout.tsx`.

### Verificación completa

```bash
npm run verify
```

Equivalente a `make verify`. Ejecuta comprobación de archivos, pruebas y build; genera `reports/verification.json`.

### Check de estructura (opcional)

```bash
bash public-tests/check.sh
```

Verifica solo la estructura de archivos, no el contenido.

---

## Estructura del proyecto

```
pwa-10B/
├── public/
│   ├── manifest.webmanifest   ← Manifest de la PWA (semana 2)
│   └── icons/
│       ├── icon-192x192.png   ← Ícono para instalación
│       └── icon-512x512.png   ← Ícono para splash screen
├── src/
│   ├── app/
│   │   ├── layout.tsx         ← Layout raíz con metadata y manifest
│   │   ├── page.tsx           ← Página principal con inspecciones
│   │   └── globals.css        ← Estilos globales
│   ├── components/
│   │   └── app-shell.tsx      ← Shell: navegación + estados (carga, error, vacío)
│   └── lib/data/
│       └── inspections.ts     ← Datos sintéticos de inspecciones
├── tests/
│   ├── starter.spec.mjs       ← Prueba del starter (semana 1)
│   └── manifest.spec.ts       ← Prueba del manifest (semana 2)
├── evidence/
│   └── individual.md          ← Evidencia individual por integrante
├── docs/
│   ├── requirements.md        ← Requisitos del producto
│   └── decision-record.md     ← Justificación de la estrategia PWA
├── scripts/
│   └── verify.mjs             ← Script de verificación
├── vitest.config.mts            ← Configuración de Vitest
├── package.json
└── README.md                  ← Este archivo
```

---

## Decisiones técnicas (Semana 2)

### Vitest como framework de pruebas

Se eligió [Vitest](https://vitest.dev/) para `tests/manifest.spec.ts` porque:

- **Soporte TypeScript nativo**: el archivo es `.spec.ts` — `node:assert` no ejecuta TypeScript sin transpilación adicional.
- **Compatibilidad con CI**: el check de la semana 2 ejecuta `npm test -- --run`, patrón estándar de Vitest.
- **Velocidad**: Vitest usa Vite como motor, con tiempos de arranque mínimos.
- **Coexistencia**: el script `test` ejecuta primero el `starter.spec.mjs` existente (Node puro) y luego Vitest.

### Validación por filesystem vs HTTP

Las pruebas del manifest leen archivos directamente del disco (`readFileSync`) en lugar de levantar un servidor HTTP. Esto garantiza:

- **Determinismo**: no depende del estado del servidor ni del puerto disponible.
- **Velocidad**: sin overhead de HTTP.
- **Reproducibilidad**: funciona igual en CI y en local.

### Manifest `.webmanifest` vs `.json`

El estándar W3C recomienda la extensión `.webmanifest` con MIME type `application/manifest+json`. Ambas extensiones funcionan, pero `.webmanifest` es la convención moderna y es lo que los checks de la actividad verifican.

---

## Datos y límites

- Todos los datos son **sintéticos** (3 inspecciones de demostración).
- **Sin service worker** ni funcionalidad offline implementada aún.
- **Sin autenticación** ni datos personales reales.
- Las pruebas del manifest validan la estructura estática del archivo, **no** el comportamiento real de instalación PWA en un navegador.
- Las vulnerabilidades reportadas por `npm audit` provienen de dependencias del starter y no se corrigen para no alterar versiones requeridas por el proyecto.

---

## Evidencia

Ver `evidence/individual.md` para la evidencia de cada integrante, incluyendo commit SHA, decisión técnica, prueba ejecutada, limitaciones y uso de IA.

---

## CI / GitHub Actions

El workflow de CI ejecuta:

1. `npm ci` — instalación reproducible
2. `npm run build` — compilación de Next.js
3. `npm run verify` — verificación completa (archivos + pruebas + build)

Los artefactos de evidencia se descargan desde la pestaña Actions del repositorio.
