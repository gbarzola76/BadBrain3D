export function formatoPrecio(valor, moneda = 'ARS') {
  if (valor == null || valor === '') return 'Consultar';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: moneda, maximumFractionDigits: 0 }).format(valor);
}

export function linkWhatsApp(numero, texto = '') {
  const limpio = String(numero || '').replace(/\D/g, '');
  return `https://wa.me/${limpio}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;
}

export function urlImagen(nombre) {
  if (!nombre) return '';
  if (/^(https?:|blob:|data:)/.test(nombre) || nombre.startsWith('/')) return nombre;
  // Ruta relativa: funciona con Vite (public/) y en hosting estático (base: './')
  return `./contenido/imagenes/${nombre}`;
}

// Fotos de un producto: "imagenes" (lista) o, en archivos viejos, "imagen" (una sola).
export function fotosDe(p) {
  const lista = Array.isArray(p?.imagenes) ? p.imagenes : p?.imagen ? [p.imagen] : [];
  return lista.filter((f) => typeof f === 'string' && f.trim() !== '');
}

// Se muestra en la tienda si no está dado de baja y tiene al menos una foto.
export const esVisible = (p) => p?.activo !== false && fotosDe(p).length > 0;

// Oferta: "descuento" es un porcentaje entero (1 a 90). El precio final se redondea a $100.
// La misma cuenta está en worker/index.js y scripts/seo.js: si cambia acá, cambiarla allá.
export const tieneOferta = (p) =>
  typeof p?.precio === 'number' && p.precio > 0 && Number.isInteger(p.descuento) && p.descuento >= 1 && p.descuento <= 90;
export const precioFinal = (p) =>
  tieneOferta(p) ? Math.round((p.precio * (100 - p.descuento)) / 100 / 100) * 100 : p?.precio;

// Número estable a partir de un texto (para variar los dibujos de reemplazo)
export function semilla(texto = '') {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) >>> 0;
  return h;
}
