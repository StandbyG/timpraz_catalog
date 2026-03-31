# Timpraz

Catalogo web en un solo archivo HTML, listo para subir a GitHub Pages.

Incluye:

- Catalogo responsive mobile-first
- Filtros por categoria
- Modal de detalle por producto
- Botones de WhatsApp con mensaje prellenado
- Panel de administrador oculto
- Agregar, editar y eliminar productos
- Soporte para imagen por URL o emoji como respaldo
- Persistencia con `localStorage`

## Publicacion en GitHub Pages

1. Sube estos archivos a tu repositorio:
   - `index.html`
   - `README.md`
2. En GitHub, entra a `Settings`.
3. Abre la seccion `Pages`.
4. En `Source`, selecciona la rama principal, normalmente `main`.
5. Guarda los cambios y espera unos segundos.
6. GitHub te dara la URL publica de tu tienda.


## Funciones del administrador

Desde el panel puedes:

- Agregar productos
- Editar productos existentes
- Eliminar productos
- Colocar imagenes usando links directos
- Usar emoji si no deseas imagen

Los cambios se guardan en `localStorage`, por lo que permanecen en ese navegador aunque recargues la pagina.

## Importante

Como el proyecto usa solo HTML, CSS y JavaScript en GitHub Pages, el acceso admin esta oculto pero no tiene seguridad de servidor real.

Eso significa que:

- Sirve bien para uso practico y rapido
- No es ideal si necesitas seguridad fuerte
- Una persona tecnica podria inspeccionar el codigo fuente

Si en el futuro quieres seguridad real, se recomienda mover el panel admin a un backend o sistema con autenticacion real.
