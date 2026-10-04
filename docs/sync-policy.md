# Política de Sincronización y Resolución de Conflictos

## Contexto
En la aplicación PWA de inspecciones y mantenimiento de laboratorios, los inspectores frecuentemente registran datos estando fuera de línea (offline). Al recuperar la red, los datos almacenados en el `localStorage` se envían al servidor de manera secuencial y segura.

## Flujo de Encolado
- **Evitar duplicados**: Cuando se llama a `enqueue()`, el sistema busca si la inspección (por su ID) ya está encolada. 
- Si ya se procesó con éxito (`synced`) o está enviándose (`syncing`), la solicitud se ignora (idempotencia).
- Si la solicitud está `pending` o `failed`, se actualiza el payload con los datos más recientes del usuario.

## Proceso de Sincronización (`processQueue`)
- La cola iterará sobre los ítems pendientes o fallidos (respetando un límite de reintentos `MAX_ATTEMPTS = 3`).
- Al comenzar a procesar un ítem, su estado cambia de inmediato a `syncing` y se persiste. Esto previene "race conditions" (condiciones de carrera) si la función se dispara varias veces a la vez (ej. por eventos de red inestables).
- Si el envío (fetch al API) es exitoso, se marca como `synced`.
- Si hay un error de red (excepción), se marca como `failed` y aumenta el contador de intentos.

## Resolución de Conflictos (`conflict-policy.ts`)
- Si el servidor responde con HTTP `409 Conflict`, significa que los datos allá difieren sustancialmente (por ejemplo, si otro usuario modificó la misma inspección).
- **Política Actual - "Client Wins"**: Se prioriza la visión del inspector en campo. El sistema fusiona el payload local sobre los datos que reporta el servidor y lo marca nuevamente como `pending` para volver a encolarse e imponer el estado local en la base de datos central en el siguiente reintento.
