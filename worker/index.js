// Worker de Cloudflare: sirve la web (dist/) y crea los pagos de Mercado Pago.
// La clave de Mercado Pago (MP_ACCESS_TOKEN) se guarda como secreto en Cloudflare,
// nunca en el código ni en GitHub.

import { atenderAdmin } from './admin.js';

const responder = (datos, status = 200) =>
  new Response(JSON.stringify(datos), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/pago') {
      if (request.method !== 'POST') return responder({ error: 'Método no permitido' }, 405);
      try {
        return await crearPago(request, env, url);
      } catch (err) {
        console.error('Error creando el pago:', err);
        return responder({ error: 'No se pudo iniciar el pago. Probá de nuevo o escribinos por WhatsApp.' }, 500);
      }
    }
    if (url.pathname.startsWith('/api/admin/')) return atenderAdmin(request, env, url);
    if (url.pathname.startsWith('/api/')) return responder({ error: 'No encontrado' }, 404);
    if (url.pathname === '/admin/') return Response.redirect(new URL('/admin', url), 301);
    return env.ASSETS.fetch(request);
  }
};

async function leerContenido(env, origen, archivo) {
  const r = await env.ASSETS.fetch(new Request(new URL(`/contenido/${archivo}`, origen)));
  if (!r.ok) throw new Error(`No se pudo leer contenido/${archivo} (${r.status})`);
  return r.json();
}

// Misma cuenta que src/util.js: descuento entero 1–90 %, redondeado a $100.
const precioFinal = (p) =>
  Number.isInteger(p.descuento) && p.descuento >= 1 && p.descuento <= 90
    ? Math.round((p.precio * (100 - p.descuento)) / 100 / 100) * 100
    : p.precio;
const fotosDe = (p) => (Array.isArray(p.imagenes) ? p.imagenes : p.imagen ? [p.imagen] : []).filter(Boolean);
const esPositivo = (n) => typeof n === 'number' && Number.isFinite(n) && n > 0;

async function crearPago(request, env, url) {
  if (!env.MP_ACCESS_TOKEN) {
    return responder({ error: 'El pago con Mercado Pago todavía no está configurado.' }, 503);
  }

  let pedido;
  try { pedido = await request.json(); } catch { return responder({ error: 'Pedido inválido.' }, 400); }
  const lineas = Array.isArray(pedido?.items) ? pedido.items : [];
  if (lineas.length === 0 || lineas.length > 50) return responder({ error: 'El carrito está vacío.' }, 400);

  // Precios y medidas salen del catálogo publicado, no del navegador del cliente.
  const [sitio, productos] = await Promise.all([
    leerContenido(env, url.origin, 'sitio.json'),
    leerContenido(env, url.origin, 'productos.json')
  ]);
  const config = sitio.mercadopago || {};
  if (!config.activo) return responder({ error: 'El pago con Mercado Pago no está disponible por ahora.' }, 503);
  const modoEnvio = config.envio || 'acordar'; // "mercadoenvios" | "fijo" | "acordar"

  const porId = new Map(productos.map((p) => [p.id, p]));
  const items = [];
  const paquete = { largo: 0, ancho: 0, alto: 0, peso: 0 };

  for (const linea of lineas) {
    const p = porId.get(String(linea?.id));
    const cantidad = Math.floor(Number(linea?.cantidad));
    if (!p || p.activo === false || !(cantidad >= 1 && cantidad <= 99)) {
      return responder({ error: 'Hay un producto que ya no está en el catálogo. Recargá la página.' }, 400);
    }
    if (!esPositivo(p.precio)) {
      return responder({ error: `"${p.nombre}" no tiene precio fijo: consultalo por WhatsApp.` }, 400);
    }
    if (modoEnvio === 'mercadoenvios') {
      const e = p.envio || {};
      if (![e.largo, e.ancho, e.alto, e.peso].every(esPositivo)) {
        return responder({ error: `Falta la medida de envío de "${p.nombre}". Consultanos por WhatsApp.` }, 400);
      }
      // Paquete combinado: la base más grande y los productos apilados en altura.
      paquete.largo = Math.max(paquete.largo, e.largo);
      paquete.ancho = Math.max(paquete.ancho, e.ancho);
      paquete.alto += e.alto * cantidad;
      paquete.peso += e.peso * cantidad;
    }
    items.push({
      id: p.id,
      title: String(p.nombre).slice(0, 250),
      description: String(p.descripcion || '').slice(0, 250),
      picture_url: fotosDe(p)[0] ? new URL(`/contenido/imagenes/${fotosDe(p)[0]}`, url.origin).href : undefined,
      category_id: 'others',
      quantity: cantidad,
      currency_id: sitio.moneda || 'ARS',
      unit_price: precioFinal(p)
    });
  }

  const referencia = crypto.randomUUID();
  const vuelta = (estado) => `${url.origin}/?pago=${estado}`;
  // Mercado Pago solo acepta volver automáticamente a direcciones https (no a localhost).
  const autoVuelta = url.protocol === 'https:';

  if (modoEnvio === 'mercadoenvios') {
    // Mercado Envíos solo existe en la API de Preferences (la de Orders no calcula envíos).
    const { largo, ancho, alto, peso } = paquete;
    if (Math.max(largo, ancho, alto) > 150 || largo + ancho + alto > 330 || peso > 30000) {
      return responder({ error: 'El pedido es muy grande para un solo envío. Escribinos por WhatsApp.' }, 400);
    }
    const preferencia = {
      items,
      external_reference: referencia,
      back_urls: { success: vuelta('aprobado'), pending: vuelta('pendiente'), failure: vuelta('rechazado') },
      statement_descriptor: 'BADBRAIN3D',
      shipments: {
        mode: 'me2',
        dimensions: `${Math.ceil(largo)}x${Math.ceil(ancho)}x${Math.ceil(alto)},${Math.ceil(peso)}`,
        local_pickup: Boolean(config.retiroEnTaller)
      }
    };
    if (autoVuelta) preferencia.auto_return = 'approved';
    const datos = await llamarMP(env, 'https://api.mercadopago.com/checkout/preferences', preferencia, referencia);
    return datos?.init_point ? responder({ url: datos.init_point }) : errorMP();
  }

  // API de Orders (la recomendada): montos como texto con dos decimales.
  const lineasOrden = items.map((i) => ({
    external_code: i.id,
    title: i.title,
    description: i.description || undefined,
    picture_url: i.picture_url,
    category_id: i.category_id,
    quantity: i.quantity,
    unit_price: i.unit_price.toFixed(2)
  }));
  if (modoEnvio === 'fijo' && esPositivo(config.costoEnvio)) {
    lineasOrden.push({ external_code: 'envio', title: 'Envío', quantity: 1, unit_price: config.costoEnvio.toFixed(2) });
  }
  const total = lineasOrden.reduce((t, i) => t + Number(i.unit_price) * i.quantity, 0);
  const online = { success_url: vuelta('aprobado'), pending_url: vuelta('pendiente'), failure_url: vuelta('rechazado') };
  if (autoVuelta) online.auto_return = 'approved';
  const orden = {
    type: 'online',
    processing_mode: 'manual',
    total_amount: total.toFixed(2),
    external_reference: referencia,
    description: `Pedido ${sitio.marca || 'Bad Brain 3D'}`.slice(0, 150),
    items: lineasOrden,
    config: { statement_descriptor: 'BADBRAIN3D', online }
  };
  const datos = await llamarMP(env, 'https://api.mercadopago.com/v1/orders', orden, referencia);
  return datos?.checkout_url ? responder({ url: datos.checkout_url }) : errorMP();
}

const errorMP = () =>
  responder({ error: 'Mercado Pago no pudo generar el pago. Probá de nuevo o escribinos por WhatsApp.' }, 502);

async function llamarMP(env, endpoint, cuerpo, clave) {
  const r = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': clave
    },
    body: JSON.stringify(cuerpo)
  });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) {
    // El detalle queda en los logs del Worker (Cloudflare → badbrain3d → Observability).
    console.error('Mercado Pago rechazó el pedido', endpoint, r.status, JSON.stringify(datos));
    return null;
  }
  return datos;
}
