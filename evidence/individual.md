# Evidencia individual del equipo

-Grupo: 10 B   Equipo: 8
-Repositorio del equipo: https://github.com/marijolinares/pwa-10B

## Integrante: Maria Jose Linares Cortes

- Mi contribución concreta y enlace a archivo, commit anterior o revisión: Creé el repositorio privado del equipo, invité a mis compañeros y al docente como colaboradores, subí el proyecto starter completo al repositorio (commit `70cd337` — "Starter del proyecto - Actividad 1"), y redacté el contenido de `docs/requirements.md` y `docs/decision-record.md` (commits `99d141c`), revisados y aprobados por el equipo.
- Decisión que puedo explicar y por qué: Usé `npm ci` en lugar de `npm install` para instalar dependencias, porque `npm ci` instala exactamente las versiones fijadas en `package-lock.json`, lo que garantiza reproducibilidad entre máquinas distintas — justo lo que pide AC-01.
- Comando o prueba proporcionada que ejecuté: `npm ci` seguido de `npm run dev`.
- Resultado real que observé: El servidor levantó en `http://localhost:3000` (Next.js 14.2.35, listo en 14.2s) y la página mostró correctamente las tres inspecciones sintéticas (Laboratorio de Redes, Electrónica y Software), cada una con responsable, fecha, estado y número de hallazgos.
- Qué verifica esa prueba y qué no verifica: Verifica que el proyecto instala y corre sin errores, y que la interfaz muestra los datos sintéticos esperados. No verifica funcionalidad offline, sincronización ni ninguna capacidad PWA, ya que el propio starter indica "PWA aún no implementada" y esas funciones están fuera del alcance de esta semana.
- Limitación, dificultad o riesgo que identifiqué: Al hacer el primer `git push`, GitHub rechazó la autenticación con contraseña normal (ya no soportada) y luego con un Personal Access Token sin el scope `workflow`, porque el repositorio incluye un workflow de GitHub Actions (`.github/workflows/week-01-starter-feedback.yml`). Tuve que generar un nuevo token con los scopes `repo` y `workflow` para completar el push. Además, `npm ci` reportó 2 vulnerabilidades de severidad alta en dependencias del starter, que no corregí para no alterar versiones que el proyecto necesita.
- Uso de IA: usé Claude (asistente de IA) como guía paso a paso para configurar Git/GitHub desde PowerShell (incluyendo la resolución del error de autenticación con el token) y para generar un primer borrador de `docs/requirements.md` y `docs/decision-record.md` a partir del problema y los escenarios del proyecto. Adapté y verifiqué ese contenido junto con mi equipo antes de aceptarlo, y ejecuté yo misma todos los comandos y verificaciones descritas arriba.

---------------------------------------------------------------------------------------------

 Un solo archivo compartido. Repitan la sección siguiente por cada integrante; cada persona escribe y explica su propia evidencia. Se aceptan evidencias previas equivalentes. El SHA final se entrega en Classroom después del último commit, para evitar modificar el commit que se está identificando.

## Integrante: Germán Yair Martinez Bolaños

- Mi contribución concreta y enlace a archivo, commit anterior o revisión: Revisión y validación de los documentos `docs/requirements.md` y `docs/decision-record.md` redactados inicialmente por mi compañera, confirmando que cubren adecuadamente el problema de conectividad y la justificación de la PWA.
- Decisión que puedo explicar y por qué: En `docs/decision-record.md`, avalo la decisión de usar una PWA porque evita la fricción de instalar una app desde una tienda (lo cual es vital para los técnicos) y nos permite aprovechar el conocimiento previo en Next.js sin tener que aprender otro lenguaje o framework nativo solo para la entrega.
- Comando o prueba proporcionada que ejecuté: Ejecuté `npm run verify` en mi entorno local.
- Resultado real que observé: El comando completó las fases de test y build sin errores fatales, generando el reporte de éxito en `reports/verification.json`.
- Qué verifica esa prueba y qué no verifica: Verifica que la aplicación compila exitosamente (`next build`) y que pasa las pruebas básicas del starter (`npm test`). No verifica si los requisitos descritos en el documento son correctos, ni comprueba el funcionamiento offline en un dispositivo real.
- Limitación, dificultad o riesgo que identifiqué: Identificamos que el mayor riesgo a futuro para el soporte offline (PWA) será manejar los conflictos de sincronización cuando el técnico recupere la conexión, ya que requerirá implementar una estrategia sólida con Service Workers que Next.js no provee automáticamente.
- Uso de IA: Utilicé un asistente de IA para revisar y perfeccionar la redacción de mis evidencias individuales y validar mis conclusiones técnicas sobre el build de Next.js, basándome en el análisis previamente aportado por mi equipo.

> No necesitan inventar un error ni escribir pruebas nuevas. «Ejecuté npm test» es insuficiente como explicación: indiquen qué observa la prueba y qué comportamiento queda fuera.

---------------------------------------------------------------------------------------------

## Integrante: Irvin Isael Martínez Alejo

- Mi contribución concreta y enlace a archivo, commit anterior o revisión: Revisión de la configuración inicial del proyecto y validación de la suite de pruebas del starter. Apoyé en la ejecución del comando de verificación final técnica.
- Decisión que puedo explicar y por qué: Acordamos mantener el entorno de Next.js sin añadir librerías externas de UI por ahora, para priorizar la resolución del problema de conectividad antes de enfocarnos en componentes de diseño complejos.
- Comando o prueba proporcionada que ejecuté: Ejecuté `npm test` y colaboré en la ejecución de `npm run verify`.
- Resultado real que observé: La prueba `tests/starter.spec.mjs` pasó exitosamente y el script de verificación generó el archivo `reports/verification.json` con todos los checks en status 'pass'.
- Qué verifica esa prueba y qué no verifica: Verifica que la estructura mínima de archivos está presente y que los componentes de Next.js compilan sin errores sintácticos. No verifica si la lógica de negocio real de las inspecciones es correcta o si los datos se guardan apropiadamente.
- Limitación, dificultad o riesgo que identifiqué: Identificamos como limitación que, al usar datos completamente sintéticos, las pruebas actuales no reflejan la latencia real ni los posibles fallos de red que experimentarán los técnicos en el campus.
- Uso de IA: Utilicé un asistente de IA para validar que la sintaxis de las pruebas provistas en el starter coincidía con nuestras versiones locales de Node.js y afinar el vocabulario técnico de esta evidencia.

---------------------------------------------------------------------------------------------

# Evidencia individual — Semana 2 (w02-shell-manifest)

## Integrante: Germán Yair Martinez Bolaños

- Estudiante: Germán Yair Martinez Bolaños
- Commit SHA evaluado: _(se completa después del último commit)_
- Mi contribución concreta y enlace a archivo, commit anterior o revisión: Creé `tests/manifest.spec.ts` con 12 casos de prueba reproducibles que validan el Web App Manifest de la PWA (existencia del archivo, JSON válido, campos obligatorios W3C, íconos PWA, coherencia de archivos en disco e integración con `layout.tsx`). Configuré Vitest como framework de pruebas TypeScript (`vitest.config.mts`, actualización de `package.json`). Reescribí el `README.md` con secciones completas de setup, ejecución, verificación, estructura del proyecto, decisiones técnicas y limitaciones.
- Decisión técnica que puedo explicar: Elegí Vitest como framework de pruebas porque el archivo requerido es `.spec.ts` (TypeScript), y el runner nativo de Node (`node:assert`) no ejecuta TypeScript sin transpilación adicional. Vitest soporta TS nativamente vía Vite, es compatible con el patrón de CI (`npm test -- --run`), y coexiste con la prueba existente `starter.spec.mjs` al encadenar ambos en el script `test` con `&&`. Las pruebas leen archivos del filesystem con `readFileSync` en lugar de levantar un servidor HTTP, lo que las hace deterministas y reproducibles sin dependencia de puertos ni estado del servidor.
- Prueba que ejecuté y resultado: Ejecuté `npm test -- --run` en local. La suite `starter.spec.mjs` pasó (PASS). La suite `manifest.spec.ts` ejecutó 12 tests que validan: existencia del archivo `manifest.webmanifest`, parsing JSON válido, presencia de `name`, `short_name`, `start_url`, modo `display` standalone, arreglo de íconos con entradas 192×192 y 512×512 con type `image/png`, existencia en disco de los archivos de íconos referenciados, presencia de `theme_color` y `background_color`, y que `layout.tsx` contenga una referencia al manifest.
- Limitación o fallo diagnosticado: Las pruebas validan la estructura estática del manifest (campos, tipos, archivos), pero no verifican el comportamiento real de instalación de la PWA en un navegador, ni comprueban que el MIME type del servidor sea `application/manifest+json`, ni simulan la experiencia de un usuario instalando la app. Una prueba E2E con Playwright o Puppeteer sería necesaria para cubrir esos escenarios, pero queda fuera del alcance de esta semana.
- Cambio que podría defender o modificar en vivo: La decisión de validar por filesystem en lugar de HTTP. Si el proyecto creciera y necesitáramos validar headers HTTP o MIME types, migraría a pruebas E2E que levanten el servidor de desarrollo y hagan fetch al endpoint del manifest.
- Uso declarado de IA (herramienta, propósito, validación): Utilicé Antigravity (asistente de IA basado en Claude) para: (1) generar la estructura inicial de `manifest.spec.ts` a partir de los requisitos W3C del manifest, (2) configurar Vitest y su integración con el script de test existente, y (3) redactar el README con la documentación completa del proyecto. Revisé, adapté y ejecuté personalmente cada archivo generado, verificando que las pruebas pasaran y que la documentación reflejara fielmente el estado del proyecto.