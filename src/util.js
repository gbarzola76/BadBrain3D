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
  if (/^https?:\/\//.test(nombre) || nombre.startsWith('/')) return nombre;
  return `/imagenes/${nombre}`;
}

// Número estable a partir de un texto (para variar los dibujos de reemplazo)
export function semilla(texto = '') {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) >>> 0;
  return h;
}
