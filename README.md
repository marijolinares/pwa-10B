# PWA Inspecciones de Laboratorio - Semana 5 (Sincronización Offline)

Esta es la Progressive Web App para el registro de inspecciones de mantenimiento de laboratorios de la Universidad Tecnológica de Tehuacán. En esta iteración se integró una cola de peticiones local tolerante a fallos para poder realizar capturas offline, así como un proceso de sincronización idempotente con resolución de conflictos.

## Setup
Asegúrate de tener Node.js (v18 o v20 recomendado) y ejecuta una instalación limpia:

```bash
npm ci
```

## Ejecución
Para iniciar el servidor de desarrollo y probar la interfaz y las API locales:

```bash
npm run dev
```
La aplicación iniciará en `http://localhost:3000`.

## Verificación
Para validar el comportamiento de los requisitos críticos (Idempotencia, evitar duplicados, y política de conflicto), ejecuta las pruebas automatizadas:

```bash
npx vitest run tests/sync.spec.ts
```

También se requiere validar la estructura ejecutando los checks del estudiante (requiere entorno bash/WSL):
```bash
bash public-tests/check.sh
```

## Evidencia Técnica y Decisiones
- [Política de Sincronización (docs)](./docs/sync-policy.md): Explicación detallada del flujo, reintentos y política de conflicto "Client Wins".
- [Evidencia Individual (Germán)](./evidence/individual.md): Trade-offs de ingeniería, justificación de uso de IA y límites identificados en el sistema actual.
