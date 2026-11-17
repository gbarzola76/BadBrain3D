# Tienda de impresiones 3D

Sitio para vender impresiones 3D, hecho con **Node.js (Express)** y **React (Vite)**.

Incluye catálogo con filtros y buscador, muestrario de trabajos con visor, pedido por WhatsApp, formulario de presupuesto con subida de archivos STL/OBJ/3MF, materiales y preguntas frecuentes.

## Cómo arrancar

Necesitás Node.js 18 o más nuevo.

```bash
npm install
npm run dev
```

Abrí http://localhost:5173

## Cómo editar el contenido (sin tocar código)

Todo lo editable está en la carpeta **`contenido/`**:

| Archivo | Qué cambia |
|---|---|
| `sitio.json` | Nombre de la marca, colores, WhatsApp, email, Instagram, textos del inicio, beneficios, pasos, materiales y preguntas frecuentes |
| `productos.json` | Productos del catálogo: nombre, categoría, precio, material, medida, foto y descripción |
| `muestrario.json` | Trabajos realizados que aparecen en el muestrario |
| `imagenes/` | Fotos de productos y trabajos |

- **Agregar un producto:** copiá un bloque `{ ... }` en `productos.json`, cambiale el `id` (único, sin espacios) y los datos. Las categorías de los filtros se crean solas.
- **Fotos:** poné el archivo en `contenido/imagenes/` y escribí su nombre en `"imagen"`, por ejemplo `"imagen": "maceta.jpg"`. Si lo dejás vacío se muestra un dibujo de reemplazo.
- **Precio "Consultar":** poné `"precio": null`.
- **Muestrario:** `"alto": "alto"` hace la foto vertical; `"normal"` la deja horizontal.
- **Colores:** cambiá `colores.acento` en `sitio.json` y toda la página se adapta.
- **WhatsApp:** número con código de país, sin `+` ni espacios (ej. `5491123456789`).

Los cambios se ven al recargar la página, no hace falta reiniciar.

> Ojo con las comas y comillas: si un JSON queda mal escrito, la página muestra un aviso. Podés validarlo en https://jsonlint.com

## Logo

El logo (cerebro punk + nombre en letras recortadas) sale de `marca` en `contenido/sitio.json`: si el nombre termina en "3D", ese final se destaca solo.

- **Colores:** el cerebro usa `colores.acento`. La cresta y el amarillo se pueden cambiar agregando `"punk": "#FF2E88"` y `"amarillo": "#F2E63D"` dentro de `colores` en `sitio.json`.
- **Letras del nombre:** colores, tipografías y giro de cada letra están en `src/components/logoEstilo.js`.
- **Archivos para redes, flyers e impresión:** carpeta `marca/` (PNG con fondo transparente y SVG). La versión anterior quedó en `marca/v1-capas/`.

## Consultas recibidas

Cada presupuesto que llega por el formulario se guarda en `server/data/consultas.json` y los archivos adjuntos en `server/data/archivos/`. También se avisa en la consola del servidor.

## Publicar (producción)

```bash
npm install
npm run build
npm start
```

Queda todo en un solo servidor en el puerto 3001 (o el que indique la variable `PORT`). Funciona en cualquier hosting con Node: Render, Railway, Fly.io, un VPS, etc.

## Estructura

```
contenido/          ← lo que vas a editar
server/index.js     ← API Express (contenido, consultas, archivos)
src/                ← la web en React
  components/       ← una sección por archivo
  styles.css        ← estilos y colores
```
