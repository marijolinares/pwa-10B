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

- Mi contribución concreta y enlace a archivo, commit anterior o revisión: Revisión técnica independiente del cambio realizado en `App.tsx` referente al manejo del estado de conectividad del backend (`available`/`offline`), y elaboración del documento `docs/risk-register.md` a partir del análisis del caso base.
- Decisión que puedo explicar y por qué: En `App.tsx`, avalo el uso de la bandera booleana `active` dentro del `useEffect` para el fetch de salud. Es una buena práctica porque si el usuario navega a otra pantalla o se desmonta el componente antes de que el servidor responda, evita que React intente actualizar el estado en un componente desmontado, previniendo advertencias de fugas de memoria. 
- Comando o prueba proporcionada que ejecuté: Ejecuté `npm run test:smoke` en mi propia máquina sobre una copia limpia.
- Resultado real que observé: La prueba `course-tests/smoke.test.tsx` pasó correctamente ("renders the reproducible baseline and resolves backend state"). El script de Jest validó el montaje del componente de manera satisfactoria sin warnings adicionales.
- Qué verifica esa prueba y qué no verifica: Verifica que la aplicación se renderice correctamente en su base y que se resuelva correctamente el estado inicial desde el servidor. No verifica problemas de sincronización de incidencias, tampoco evalúa el uso local real en un dispositivo físico ni comprueba la idempotencia de los datos.
- Uso de IA: Utilicé un asistente de IA para confirmar y estructurar mi análisis sobre el comportamiento del `useEffect` en la inicialización, y para apoyar la redacción de la matriz de riesgos cruzando la información de `docs/CAMPUSOPS.md`. Revisé y asimilé toda la información reportada.

> No necesitan inventar un error ni escribir pruebas nuevas. «Ejecuté npm test» es insuficiente como explicación: indiquen qué observa la prueba y qué comportamiento queda fuera.

