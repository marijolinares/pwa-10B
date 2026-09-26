## Listado de inspecciones — CSR (Irvin)

El listado (`/inspecciones`) se implementó como Client Component que hace
`fetch` en el navegador contra `/api/inspecciones`, en lugar de traer los
datos en el servidor.

**Por qué CSR y no SSR aquí:**
- Es una vista que se espera refrescar seguido conforme se capturan nuevas
  inspecciones; no necesita generarse una sola vez en el servidor.
- No requiere SEO individual: es un listado interno para técnicos
  autenticados, no una página pensada para indexarse en buscadores.
- Permite mostrar el shell de la app de inmediato (header, layout) y un
  estado de carga (`LoadingState`) mientras los datos llegan, en vez de
  bloquear toda la respuesta del servidor hasta tener los datos listos.

**Trade-off aceptado:** el contenido no está disponible en el HTML inicial
(no apto para SEO), y depende de JavaScript en el cliente para mostrarse.
Para este listado interno, ese costo es aceptable frente al beneficio de
mantenerlo simple y siempre actualizado.