# Capacidades del dispositivo (Semana 6)

Esta semana la PWA incorpora tres capacidades opcionales del dispositivo: ubicación, notificaciones y cámara. Las tres comparten el contrato de `src/lib/capabilities/result.ts` y los mismos principios:

1. **Permiso solo por acción de la persona.** Ningún módulo pide permisos ni abre nada al importarse; solo al llamar la función desde una acción, por ejemplo un botón.
2. **Nunca lanzan error.** Cada función devuelve `{ ok: true, value }` o `{ ok: false, reason, message }`, con un mensaje en español listo para mostrarse dentro de la app.
3. **Datos mínimos.** Se pide el permiso más pequeño posible, no se guardan ni se envían coordenadas ni fotos, y todos los datos del proyecto son sintéticos.
4. **El flujo sigue sin la capacidad.** Cada una tiene alternativa: elegir el laboratorio a mano, mostrar el aviso dentro de la app o guardar la inspección sin evidencia.

| Capacidad | Archivo | Permiso | Alternativa |
|---|---|---|---|
| Ubicación | `src/lib/device/geolocation.ts` | Lectura puntual de la ubicación | Elegir el laboratorio de una lista |
| Notificaciones | `src/lib/notifications/client.ts` | Permiso de notificaciones | Aviso dentro de la app |
| Cámara | `src/lib/device/camera.ts` | Ninguno desde JavaScript: el sistema entrega el archivo elegido | Guardar la inspección sin foto |

**Cómo verificar.** `npm run verify` instala, corre las pruebas (27 en `tests/capabilities.spec.ts`) y compila.

**Supuestos y límites comunes.**
- Las pruebas simulan el navegador (happy-dom, `vi.stubGlobal` y `vi.spyOn`): no abren cuadros de permiso reales ni usan el GPS, la cámara o las notificaciones del sistema.
- Estas APIs solo funcionan en HTTPS o en `localhost`.
- Como en la Semana 5, la interfaz todavía no llama a estas funciones: se entregan como módulos probados y conectarlas a botones es el siguiente paso.
- `showSyncNotification` usa `new Notification()`. Algunos navegadores móviles (por ejemplo, Chrome en Android) exigen mostrar la notificación desde el service worker; en ese caso la función devuelve `error` y se usa el aviso dentro de la app. En iOS las notificaciones solo funcionan con la PWA instalada.

**Fallo encontrado.** Vitest no resuelve el alias `@/` de Next.js porque `vitest.config.mts` no lo define. Por eso los módulos de esta semana importan con rutas relativas.

## Geolocalización

**Archivos:** `src/lib/capabilities/result.ts` (resultado compartido), `src/lib/device/geolocation.ts`, pruebas en `tests/capabilities.spec.ts` (bloque "Geolocalización").

**Qué hace.** `requestPosition()` obtiene las coordenadas del dispositivo solo cuando la persona lo pide (por ejemplo, con un botón "Usar mi ubicación"). El permiso nunca se solicita al importar el módulo.

**Permiso mínimo.** Se usa una lectura puntual (`getCurrentPosition`), sin seguimiento continuo y sin alta precisión. Las coordenadas viven solo en memoria: no se guardan ni se envían. Todos los datos del proyecto son sintéticos.

**Resultado.** La función nunca lanza error. Devuelve `{ ok: true, value }` o `{ ok: false, reason, message }`:

| Motivo | Cuándo ocurre |
|---|---|
| `unsupported` | El navegador no tiene `navigator.geolocation` |
| `denied` | La persona negó el permiso |
| `unavailable` | Hay permiso, pero no se pudo determinar la posición |
| `timeout` | Se agotó el tiempo (8 s) |
| `error` | Cualquier otro fallo inesperado |

**Alternativa sin permiso o sin soporte.** La persona elige el laboratorio a mano de la lista `LABORATORIES` mediante `selectLaboratory(id)`, que no necesita permisos. El `message` de cada fallo ya invita a hacerlo y se muestra dentro de la app.

**Pruebas.** Simulan el navegador con `vi.stubGlobal`: éxito, permiso denegado, sin soporte, tiempo agotado, posición no disponible, error inesperado, que no se pida permiso al importar y la selección manual.

## Notificaciones

**Archivos:** `src/lib/notifications/client.ts`, pruebas en `tests/capabilities.spec.ts` (bloque "Notificaciones").

**Qué hace.** `showSyncNotification(title, options)` solicita permiso y muestra una notificación local solo cuando la persona realiza una acción (por ejemplo, al hacer clic en un botón). El permiso no se pide al importar el módulo.

**Permiso mínimo.** Se usa la API de notificaciones nativa del navegador. Si el permiso ya fue concedido, se envía la notificación de inmediato. Si fue denegado o no hay soporte, se devuelve un resultado de error controlado, permitiendo mostrar el aviso de forma visual dentro de la interfaz de la aplicación sin interrumpir el flujo.

**Resultado.** Al igual que otras capacidades, nunca lanza error y retorna un `CapabilityResult<boolean>`:
- `ok: true` si se mostró la notificación correctamente.
- `ok: false` si no hay soporte (`unsupported`), si se denegó el permiso (`denied`), o si hubo otro error (`error`).

**Alternativa sin permiso o sin soporte.** En caso de que la notificación no pueda mostrarse, se presenta un aviso dentro de la app gracias al mensaje retornado.

**Pruebas.** Simulan el navegador y el objeto `Notification` para probar: el éxito al mostrar la notificación, el rechazo del permiso, la falta de soporte y el manejo de errores.


## Cámara (evidencia opcional)

**Archivos:** `src/lib/device/camera.ts`, pruebas en `tests/capabilities.spec.ts` (bloque "Cámara").

**Qué hace.** `captureEvidence()` abre el selector de imagen del dispositivo para adjuntar una foto como evidencia de una inspección. En el teléfono abre la cámara trasera; en una computadora, el selector de archivos. Solo se llama desde una acción de la persona (por ejemplo, un botón) y nunca al importar el módulo. La evidencia es opcional: sin ella la inspección se guarda igual.

**Permiso mínimo.** Se crea un `<input type="file" accept="image/*" capture="environment">` en el momento, en lugar de usar `getUserMedia`. Así JavaScript no pide acceso a la cámara ni al video: el sistema decide cómo capturar y solo entrega el archivo elegido. Por eso en esta capacidad no existe el motivo `denied`.

**Datos mínimos.** `validateEvidenceFile()` acepta solo imágenes no vacías de hasta 5 MB (`MAX_EVIDENCE_BYTES`). El adjunto contiene únicamente el archivo, su tipo y su tamaño: no se conserva el nombre original (puede incluir datos personales) y la foto no se guarda ni se envía.

**Resultado.** La función nunca lanza error y devuelve `{ ok: true, value }` o `{ ok: false, reason, message }`:

| Motivo | Cuándo ocurre |
|---|---|
| `unsupported` | No hay `document` (por ejemplo, durante el renderizado en el servidor) |
| `unavailable` | La persona cancela o no elige ninguna foto |
| `error` | El archivo no es una imagen, está vacío o pesa más de 5 MB, o el navegador falla al abrir el selector |

Los motivos `denied` y `timeout` no aplican: no hay permiso de JavaScript que negar y la persona puede tardar lo que quiera en elegir.

**Alternativa sin cámara.** Todos los mensajes terminan con "La inspección se guarda igual, sin evidencia", y se muestran dentro de la app.

**Decisión y trade-offs.**

| Opción | A favor | En contra |
|---|---|---|
| `<input capture>` (elegida) | Permiso mínimo; sin pantalla propia; en computadora cae al selector de archivos | No controla la resolución del navegador (por eso el límite de 5 MB) |
| `getUserMedia` + canvas | Control de la calidad y del tamaño | Pide permiso explícito, exige HTTPS, necesita vista previa propia y liberar la cámara; más código y más fallos posibles |

**Límites.**
- La foto no se guarda: `localStorage` (cerca de 5 MB) no sirve para imágenes. Guardarlas junto a la cola de sincronización requeriría IndexedDB.
- Las fotos pueden traer metadatos EXIF (incluida la ubicación) y esta versión no los elimina.
- En navegadores antiguos que no emiten el evento `cancel`, cerrar el selector sin elegir deja la promesa sin resolver. Como la evidencia es opcional, la interfaz no debe esperarla para guardar la inspección.
- Las pruebas simulan el selector con `vi.spyOn` sobre `HTMLInputElement.prototype.click`: no abren la cámara real.

**Pruebas (12).** Éxito con el adjunto mínimo; el input pide solo imágenes y cámara trasera, y se retira de la página; cancelar; sin soporte; archivo que no es imagen; foto demasiado grande; tamaño exactamente en el máximo; imagen vacía; sin archivo; fallo del navegador; que no abra nada al importar; y que no guarde ni envíe la foto.