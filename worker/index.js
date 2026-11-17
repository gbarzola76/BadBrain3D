// Worker de Cloudflare: sirve la web (dist/) y crea los pagos de Mercado Pago.
// La clave de Mercado Pago (MP_ACCESS_TOKEN) se guarda como secreto en Cloudflare,
// nunca en el código ni en GitHub.

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
    if (url.pathname.startsWith('/api/')) return responder({ error: 'No encontrado' }, 404);
    return env.ASSETS.fetch(request);
  }
};

async function leerContenido(env, origen, archivo) {
  const r = await env.ASSETS.fetch(new Request(new URL(`/contenido/${archivo}`, origen)));
  if (!r.ok) throw new Error(`No se pudo leer contenido/${archivo} (${r.status})`);
  return r.json();
}

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
    if (!p || !(cantidad >= 1 && cantidad <= 99)) {
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
      picture_url: p.imagen ? new URL(`/contenido/imagenes/${p.imagen}`, url.origin).href : undefined,
      category_id: 'others',
      quantity: cantidad,
      currency_id: sitio.moneda || 'ARS',
      unit_price: p.precio
    });
  }

  const referencia = crypto.randomUUID();
  const preferencia = {
    items,
    external_reference: referencia,
    back_urls: {
      success: `${url.origin}/?pago=aprobado`,
      pending: `${url.origin}/?pago=pendiente`,
      failure: `${url.origin}/?pago=rechazado`
    },
    statement_descriptor: 'BADBRAIN3D'
  };
  // Mercado Pago solo acepta volver automáticamente a direcciones https (no a localhost).
  if (url.protocol === 'https:') preferencia.auto_return = 'approved';

  if (modoEnvio === 'mercadoenvios') {
    const { largo, ancho, alto, peso } = paquete;
    if (Math.max(largo, ancho, alto) > 150 || largo + ancho + alto > 330 || peso > 30000) {
      return responder({ error: 'El pedido es muy grande para un solo envío. Escribinos por WhatsApp.' }, 400);
    }
    preferencia.shipments = {
      mode: 'me2',
      dimensions: `${Math.ceil(largo)}x${Math.ceil(ancho)}x${Math.ceil(alto)},${Math.ceil(peso)}`,
      local_pickup: Boolean(config.retiroEnTaller)
    };
  } else if (modoEnvio === 'fijo' && esPositivo(config.costoEnvio)) {
    preferencia.shipments = { mode: 'not_specified', cost: config.costoEnvio };
  }

  const r = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': referencia
    },
    body: JSON.stringify(preferencia)
  });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok || !datos.init_point) {
    // El detalle queda en los logs del Worker (Cloudflare → badbrain3d → Observability).
    console.error('Mercado Pago rechazó la preferencia', r.status, JSON.stringify(datos));
    return responder({ error: 'Mercado Pago no pudo generar el pago. Probá de nuevo o escribinos por WhatsApp.' }, 502);
  }
  return responder({ url: datos.init_point });
}
