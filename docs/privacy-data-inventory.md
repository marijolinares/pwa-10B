# Inventario de datos y privacidad (Semana 9)

Responsable de este documento: Germán (datos y privacidad).
Alcance: PWA de inspecciones y mantenimiento de laboratorios. **Solo datos
sintéticos**: ningún dato de este repositorio pertenece a una persona real.

Código relacionado: `src/lib/security/sanitize.ts`, `privacy.ts`,
`secrets.ts` y `src/app/api/inspecciones/route.ts`.
Pruebas que lo respaldan (`tests/security.spec.ts`, bloques "Sanitización",
"Secretos", "Privacidad y retención" y "API").

## 1. Inventario de datos

| Dato | Dónde vive | Quién lo ve | ¿Identifica a una persona? | Clasificación | Retención propuesta |
| --- | --- | --- | --- | --- | --- |
| `inspector` (nombre) | cola local del navegador (`localStorage`), memoria del servidor | el propio dispositivo, quien consulte `GET /api/inspecciones` | **Sí** (nombre) | Personal | 90 días desde la fecha de la inspección |
| `location` (laboratorio elegido) | cola local, servidor | igual | No (es un lugar de la institución) | Interno | 365 días |
| `date`, `findings`, `status`, `summary` | cola local, servidor | igual | No, salvo que el resumen mencione a alguien (riesgo, ver §4) | Interno | 365 días |
| `id` de inspección | cola local, servidor | igual | No | Técnico | igual que la inspección |
| Coordenadas de ubicación (opcional, `src/lib/device/geolocation.ts`) | solo en memoria del dispositivo; **no se envía** al servidor | el dispositivo | Sí, si es precisa | Personal (sensible) | No se guarda |
| Foto de la cámara (`src/lib/device/camera.ts`) | solo en memoria del dispositivo; **no se envía** | el dispositivo | Puede mostrar personas | Personal (sensible) | No se guarda |
| Suscripción de notificaciones (`src/lib/notifications/client.ts`) | navegador | el dispositivo | Identifica al navegador | Personal | Mientras el usuario no la revoque |
| Cola de sincronización (`QueueItem`: estado, intentos, `createdAt`, `lastError`) | `localStorage` | el dispositivo | Hereda el `inspector` del payload | Personal | Se elimina al sincronizarse; pendientes por más de 30 días se descartan |
| Logs del servidor | salida estándar | el equipo | **No debe** (ver §3) | Operativo | Los que defina la plataforma de despliegue |

## 2. Principios aplicados

1. **Minimización**: el servidor solo copia los campos que conoce
   (`id`, `location`, `inspector`, `date`, `findings`, `summary`); cualquier
   campo extra enviado por un cliente se descarta (`route.ts`).
2. **Dato mínimo en el servidor**: coordenadas y fotos no viajan; no hay
   motivo funcional para guardarlas en esta fase.
3. **Limitación de la finalidad**: los datos se usan solo para listar y
   sincronizar inspecciones.
4. **Retención con fecha de vencimiento** y regla *fail-closed*: si no se
   puede saber la antigüedad de un dato, se trata como vencido
   (`isExpired` en `privacy.ts`).
5. **Sin credenciales en datos de usuario**: una captura que contenga algo
   con forma de clave se rechaza con 422 (`findSecrets` en `secrets.ts`).

## 3. Controles implementados

| Riesgo | Control | Dónde |
| --- | --- | --- |
| Texto con HTML o caracteres invisibles/de control (inyección, texto disfrazado) | `sanitizeText(texto, maxLen)`: normaliza Unicode, quita control, invisibles y etiquetas, colapsa espacios y recorta | `sanitize.ts` |
| Cuerpo gigante o malformado | `parseJsonBody(raw, maxBytes)`: 413 si excede, 400 si no es JSON, 422 si está muy anidado; mide **bytes** UTF-8 | `sanitize.ts`, `route.ts` |
| Contaminación de prototipos (`__proto__`, `constructor`) | el parseo descarta esas claves | `sanitize.ts` |
| Tipo de contenido inesperado | 415 si no es `application/json` | `route.ts` |
| Credenciales pegadas en un campo | `findSecrets(texto)` y rechazo 422; la respuesta nunca repite el valor | `secrets.ts`, `route.ts` |
| Datos personales en logs | `redactForLog(valor)`: enmascara campos personales (inspector, correo, teléfono, coordenadas), campos con nombre de credencial y correos/teléfonos dentro de texto; copia, no muta; soporta ciclos | `privacy.ts` |
| Datos conservados de más | `isExpired(item, ahoraMs, ttlDias)`: vence solo si la antigüedad es **mayor** que el TTL | `privacy.ts` |
| Nombres de personas en cachés compartidas | respuestas de la API con `Cache-Control: no-store` y `X-Content-Type-Options: nosniff` | `route.ts` |
| Logs con cuerpo completo | en los rechazos solo se registra el motivo y el código, nunca el cuerpo | `route.ts` |

## 4. Límites y riesgos que quedan (honestos)

- **El resumen es texto libre**: alguien puede escribir un nombre o un
  teléfono en `summary`. `redactForLog` lo enmascara en logs, pero el dato
  se guarda tal cual. No hay detección de nombres propios.
- **`localStorage` no está cifrado**: quien tenga acceso al dispositivo
  desbloqueado puede leer la cola. Mitigación pendiente: borrar lo
  sincronizado y aplicar la retención de §1 en el cliente.
- **La retención aún no se ejecuta sola**: `isExpired` define la regla y
  está probada; falta invocarla en el arranque de la cola y en el servidor.
- **El servidor guarda en memoria** y se reinicia con cada arranque: la
  retención en servidor es, de hecho, "hasta el siguiente reinicio".
- **`findSecrets` es una heurística**: detecta formatos conocidos (claves de
  nube, JWT, bloques de clave privada, asignaciones `nombre=valor` con nombre
  sensible); no detecta una clave inventada sin forma reconocible. Los falsos
  positivos se aceptan: es mejor rechazar una captura legítima rara que
  guardar una credencial.
- **No hay autenticación en la API**: cualquiera con acceso a la URL puede
  listar el campo `inspector`. Es un supuesto de la fase académica; en
  producción exigiría identidad y control de acceso.
- **Un teléfono con formato raro** puede escapar a la máscara de
  `redactForLog`.

## 5. Supuestos

- Todo dato del repositorio, de las pruebas y de las demos es sintético;
  los nombres que aparecen son ficticios.
- La plataforma de despliegue define quién accede a los logs.
- Los plazos de retención (90/365/30 días) son una propuesta del equipo para
  la actividad, no un requisito legal verificado.
