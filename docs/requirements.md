# Requisitos del producto — documento del equipo

## 1. Problema y contexto

En la UTT, las inspecciones de mantenimiento de laboratorios (redes, electrónica, software) suelen realizarse en zonas donde la conexión a internet no siempre está disponible. Cuando un técnico detecta un hallazgo durante una inspección sin conexión, actualmente no existe una forma confiable de registrarlo en el momento: el registro se pospone, se anota en papel o se olvida, lo que dificulta dar seguimiento oportuno a incidencias que requieren atención.

Este proyecto busca resolver ese problema mediante una aplicación web progresiva que permita consultar y registrar inspecciones de laboratorio de forma consistente, incluso cuando la conectividad es intermitente.

Queda fuera del alcance de este proyecto: la gestión de inventario de equipo, la programación automática de mantenimientos preventivos, y la integración con sistemas administrativos existentes de la universidad.

## 2. Usuarios y escenarios

**Usuarios:** técnicos responsables de inspección de laboratorios (los "Técnico A/B/C" que aparecen en los registros) y, en un rol de consulta, coordinadores académicos que revisan el estado general de los laboratorios.

**Escenario 1 — con conexión estable:**
Situación inicial: un coordinador académico quiere revisar el estado reciente de los laboratorios antes de una junta.
Acción: abre la aplicación y consulta el listado de inspecciones recientes.
Resultado esperado: ve las inspecciones más recientes con su estado (sin incidencias / requiere atención), responsable y número de hallazgos.

**Escenario 2 — con conectividad intermitente:**
Situación inicial: un técnico realiza una inspección dentro del laboratorio de electrónica, donde la señal de red es débil o inexistente.
Acción: el técnico detecta un hallazgo y registra la inspección con los datos disponibles (laboratorio, hallazgos, observaciones).
Resultado esperado (capacidad futura): el registro se conserva localmente y se sincroniza automáticamente al recuperar conexión, sin que el técnico pierda la información capturada.

## 3. Requisitos funcionales

| ID | Acción del producto | Condición observable de aceptación | Ahora o futuro |
|---|---|---|---|
| RF-01 | Mostrar el listado de inspecciones sintéticas del starter | Al abrir la página principal se ven las tres inspecciones (Redes, Electrónica, Software) con laboratorio, fecha, responsable, estado y hallazgos | Semana 1 |
| RF-02 | Mostrar el estado de cada inspección | Cada tarjeta de inspección muestra una etiqueta de "Sin incidencias" o "Requiere atención" según el número de hallazgos registrado | Semana 1 |
| RF-03 | Registrar una nueva inspección con datos capturados sin conexión | Al guardar una inspección con laboratorio, responsable y hallazgos, aparece un nuevo registro con esos mismos valores en el listado | Futuro |
| RF-04 | Sincronizar inspecciones registradas sin conexión al recuperar internet | Al recuperar conectividad, los registros pendientes se envían automáticamente y dejan de marcarse como "pendientes de sincronizar" | Futuro |

## 4. Requisitos no funcionales

- **Reproducibilidad (Semana 1):** en una copia limpia del repositorio, con Node 20.19+ y npm 10+ declarados, `npm ci` y `npm run verify` terminan con código 0.
- **Accesibilidad (futuro):** las tarjetas de inspección y sus estados (color + texto) deben ser distinguibles sin depender solo del color, verificable con una revisión de contraste y lectura con lector de pantalla antes de implementar formularios nuevos.
- **Seguridad y privacidad (ahora y futuro):** no se almacenan datos reales de estudiantes, personal o credenciales; toda la información visible es sintética. Se verificará revisando que no existan archivos `.env`, claves ni datos reales en el repositorio.
- **Rendimiento (meta futura, ilustrativa):** con 100 registros sintéticos en el dispositivo de prueba declarado, el listado debe cargar en menos de 2 segundos; se medirá en cinco ejecuciones bajo la conexión que el equipo defina más adelante.
- **Offline (futuro):** un registro capturado sin conexión no debe perderse al cerrar o recargar la aplicación antes de sincronizar; se validará simulando pérdida de conexión en las herramientas de desarrollo del navegador.

## 5. Datos sintéticos y límites

La aplicación usa exclusivamente datos ficticios: nombres de laboratorio genéricos (Redes, Electrónica, Software), responsables identificados como "Técnica A", "Técnico B", "Técnica C", fechas de ejemplo y descripciones de hallazgos inventadas.

Quedan excluidos: nombres reales de personal o estudiantes, matrículas, credenciales de acceso, direcciones IP o inventario real de equipo de la UTT. La identificación académica de los integrantes del equipo se limita al repositorio privado y a Classroom, y no aparece en los datos del producto.

## 6. Criterios de aceptación de la Semana 1

| Entregable | Cómo se verifica |
|---|---|
| Instalación reproducible | `npm ci` termina sin errores fatales |
| Build exitoso | `npm run build` (incluido en `npm run verify`) termina sin errores |
| Prueba proporcionada pasa | `npm run verify` ejecuta la prueba del starter y reporta éxito en `reports/verification.json` |
| Requisitos funcionales y no funcionales verificables | Revisión de este documento por el equipo y el docente (no lo certifica un comando) |
| Comparación de alternativas justificada | Revisión de `docs/decision-record.md` |

`npm run verify` confirma aspectos técnicos (instalación, prueba, build); no evalúa ni certifica la calidad del análisis de este documento.