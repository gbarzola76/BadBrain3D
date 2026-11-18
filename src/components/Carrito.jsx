import { useEffect, useState } from 'react';
import Icono from './Icono.jsx';
import Imagen from './Imagen.jsx';
import { formatoPrecio, linkWhatsApp } from '../util.js';

// El pedido se confirma por WhatsApp con el detalle armado automáticamente.
export default function Carrito({ abierto, cerrar, items, sitio, cambiarCantidad, vaciar }) {
  const total = items.reduce((t, i) => t + (i.precio || 0) * i.cantidad, 0);
  // Productos con "precio": null no suman al total: se aclara que hay que consultarlos.
  const hayAConsultar = items.some((i) => i.precio == null || i.precio === '');
  const conPrecio = items.some((i) => i.precio != null && i.precio !== '');
  const totalTexto = !conPrecio
    ? 'A consultar'
    : `${formatoPrecio(total, sitio.moneda)}${hayAConsultar ? ' + a consultar' : ''}`;

  // Pago con Mercado Pago: el Worker arma el cobro con los precios del catálogo.
  const mp = sitio.mercadopago || {};
  const [pagando, setPagando] = useState(false);
  const [errorPago, setErrorPago] = useState('');

  async function pagar() {
    setPagando(true);
    setErrorPago('');
    try {
      const r = await fetch('./api/pago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: items.map((i) => ({ id: i.id, cantidad: i.cantidad })) })
      });
      const datos = await r.json().catch(() => ({}));
      if (!r.ok || !datos.url) throw new Error(datos.error || 'No se pudo iniciar el pago.');
      window.location.href = datos.url;
    } catch (err) {
      setErrorPago(err.message);
      setPagando(false);
    }
  }

  useEffect(() => {
    if (!abierto) return;
    const tecla = (e) => e.key === 'Escape' && cerrar();
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [abierto, cerrar]);

  const texto = [
    `Hola ${sitio.marca}! Quiero hacer este pedido:`,
    ...items.map((i) => `• ${i.cantidad} x ${i.nombre} (${formatoPrecio(i.precio, sitio.moneda)})`),
    `Total: ${totalTexto}`,
    'Color/es: '
  ].join('\n');

  return (
    <>
      <div className={`velo ${abierto ? 'velo--visible' : ''}`} onClick={cerrar} aria-hidden="true" />
      <aside className={`carrito ${abierto ? 'carrito--abierto' : ''}`} aria-label="Tu pedido" aria-hidden={!abierto}>
        <div className="carrito__cabecera">
          <h2>Tu pedido</h2>
          <button className="boton-icono" onClick={cerrar} aria-label="Cerrar pedido" tabIndex={abierto ? 0 : -1}>
            <Icono nombre="cerrar" />
          </button>
        </div>

        {items.length === 0 ? (
          <p className="carrito__vacio">Todavía no agregaste productos.</p>
        ) : (
          <>
            <ul className="carrito__lista">
              {items.map((i) => (
                <li key={i.id}>
                  <div className="carrito__foto"><Imagen src={i.imagen} alt={i.nombre} clave={i.id} /></div>
                  <div className="carrito__datos">
                    <strong>{i.nombre}</strong>
                    <span>{formatoPrecio(i.precio, sitio.moneda)}</span>
                    <div className="cantidad">
                      <button onClick={() => cambiarCantidad(i.id, -1)} aria-label={`Quitar uno de ${i.nombre}`} tabIndex={abierto ? 0 : -1}><Icono nombre="menos" tam={16} /></button>
                      <span>{i.cantidad}</span>
                      <button onClick={() => cambiarCantidad(i.id, 1)} aria-label={`Agregar uno de ${i.nombre}`} tabIndex={abierto ? 0 : -1}><Icono nombre="mas" tam={16} /></button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="carrito__pie">
              <div className="carrito__total"><span>Total</span><strong>{totalTexto}</strong></div>
              {mp.activo && (
                <>
                  <button className="boton boton--oscuro boton--ancho" onClick={pagar}
                    disabled={pagando || hayAConsultar} tabIndex={abierto ? 0 : -1}>
                    <Icono nombre="tarjeta" tam={20} /> {pagando ? 'Abriendo Mercado Pago…' : 'Pagar con Mercado Pago'}
                  </button>
                  <p className="carrito__nota">
                    {hayAConsultar
                      ? 'Hay productos a consultar: pedilos por WhatsApp.'
                      : mp.envio === 'mercadoenvios'
                        ? 'El envío lo calcula Mercado Envíos con tu código postal.'
                        : mp.envio === 'fijo' && mp.costoEnvio > 0
                          ? `Envío: ${formatoPrecio(mp.costoEnvio, sitio.moneda)}.`
                          : 'El envío es a cargo del comprador: lo cotizamos y coordinamos por WhatsApp después del pago.'}
                  </p>
                  {errorPago && <p className="error" role="alert">{errorPago}</p>}
                </>
              )}
              <a className="boton boton--acento boton--ancho" href={linkWhatsApp(sitio.contacto.whatsapp, texto)}
                target="_blank" rel="noreferrer" tabIndex={abierto ? 0 : -1}>
                <Icono nombre="whatsapp" tam={20} /> Enviar pedido por WhatsApp
              </a>
              <button className="enlace" onClick={vaciar} tabIndex={abierto ? 0 : -1}>Vaciar pedido</button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
