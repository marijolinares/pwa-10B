# ADR-001 — Decisión sobre la estrategia de aplicación

## Estado

Propuesta por el equipo — 5 de septiembre de 2026.

## Contexto y restricciones

El producto está dirigido a técnicos que realizan inspecciones de mantenimiento en laboratorios de la UTT (Redes, Electrónica, Software), muchas veces desde dispositivos móviles y en zonas del campus donde la conectividad es intermitente (ver Escenario 2 en `docs/requirements.md`). Los datos usados son sintéticos y el proyecto se desarrolla dentro del curso, que ya define Next.js como stack base. Esto influye directamente en la decisión: se necesita una app accesible desde el navegador, que funcione razonablemente bien con conexión inestable, y que no dependa de instalación desde tiendas de aplicaciones para que cualquier técnico pueda usarla de inmediato.

## Alternativas consideradas

| Criterio | PWA | Web tradicional | App nativa | Multiplataforma (ej. React Native/Flutter) |
|---|---|---|---|---|
| Instalación | Opcional, desde el navegador ("Agregar a inicio") | No instalable, requiere navegador abierto siempre | Requiere descarga desde tienda oficial | Requiere descarga desde tienda oficial |
| Conexión intermitente | Puede cachear recursos y datos con service worker | Depende de conexión activa en cada carga | Puede funcionar offline si se diseña así | Puede funcionar offline si se diseña así |
| Distribución | Un solo enlace, sin revisión de tienda | Un solo enlace, sin revisión de tienda | Sujeta a revisión y aprobación de tienda | Sujeta a revisión y aprobación de tienda |
| Costo de desarrollo | Bajo-medio; un solo código base web | Bajo; un solo código base web | Alto; código distinto por plataforma (o dos equipos) | Medio; un código base, pero con capas nativas |
| Mantenimiento | Un solo despliegue actualiza a todos | Un solo despliegue actualiza a todos | Actualizaciones sujetas a aprobación de tienda | Actualizaciones sujetas a aprobación de tienda, más dependencias del framework |
| Acceso al dispositivo | Limitado (notificaciones, almacenamiento local, cámara básica) | Muy limitado | Completo | Amplio, casi completo |
| Riesgos | Soporte offline limitado en algunos navegadores antiguos | Inutilizable sin conexión | Tiempo y costo de desarrollo mayores al alcance del curso | Requiere dominar un framework adicional; curva de aprendizaje |

La operación offline no aparece "gratis" en ninguna opción: en la PWA requiere diseñar explícitamente un service worker y una estrategia de sincronización; no ocurre solo por usar Next.js o React.

## Decisión

El equipo mantiene la estrategia PWA definida para el curso. Es la opción que mejor equilibra las restricciones del caso: no exige instalación desde una tienda (importante para que cualquier técnico la use sin fricción), permite trabajar hacia soporte offline sin duplicar código para distintas plataformas, y aprovecha el stack Next.js ya fijado, evitando el costo de aprender un framework nuevo dentro del tiempo del curso.

Una app nativa o multiplataforma sería preferible si el proyecto necesitara acceso profundo al hardware del dispositivo (por ejemplo, escaneo de códigos QR con hardware específico o sensores), algo que no es un requisito actual de las inspecciones documentadas.

## Consecuencias y riesgos

Conservar los datos de inspección en el dispositivo mientras no hay conexión permite continuidad de trabajo para el técnico, pero introduce el riesgo de conflictos si dos personas registran cambios sobre la misma inspección antes de sincronizar; esto tendría que resolverse con una estrategia de sincronización definida en semanas futuras. Otro riesgo es que el soporte de funciones offline avanzadas (como notificaciones push) varía entre navegadores, lo que podría limitar la experiencia en algunos dispositivos del personal técnico.

## Validación

En semanas posteriores, se validará esta decisión implementando un service worker básico y probando manualmente: (1) cargar la aplicación sin conexión y confirmar que el listado de inspecciones ya visitado sigue disponible, y (2) registrar una inspección sin conexión y confirmar que se sincroniza al recuperar internet. Hasta ahora no se ha implementado ni probado sincronización, permisos de dispositivo, ni comportamiento offline real; esta sección describe una validación futura, no un resultado ya obtenido.