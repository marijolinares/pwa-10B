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
