import { useState } from 'react';
import Icono from './Icono.jsx';
import { linkWhatsApp } from '../util.js';

// El sitio es estático (Cloudflare), así que la consulta se envía por WhatsApp:
// el formulario arma el mensaje y el archivo 3D se adjunta en el chat.
export default function Cotizar({ sitio }) {
  const [enviado, setEnviado] = useState(false);
  const materiales = (sitio.materiales || []).map((m) => m.nombre);

  function enviar(e) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const texto = [
      `Hola ${sitio.marca}! Quiero pedir un presupuesto.`,
      `Nombre: ${d.get('nombre').trim()}`,
      `Material: ${d.get('material') || 'No sé, recomiéndenme'}`,
      `Cantidad: ${d.get('cantidad') || 1}`,
      d.get('detalle').trim() ? `Detalle: ${d.get('detalle').trim()}` : '',
      d.get('tengoArchivo') ? 'Tengo el archivo 3D, se los mando por acá.' : ''
    ].filter(Boolean).join('\n');
    window.open(linkWhatsApp(sitio.contacto.whatsapp, texto), '_blank', 'noopener');
    setEnviado(true);
  }

  return (
    <section id="cotizar" className="seccion contenedor cotizar">
      <div className="cotizar__intro">
        <h2>Pedí tu presupuesto</h2>
        <p className="bajada">Completá el formulario y se abre WhatsApp con tu consulta lista para enviar. Si tenés el archivo STL, OBJ o 3MF, adjuntalo en el chat.</p>
        <a className="boton boton--borde" href={linkWhatsApp(sitio.contacto.whatsapp, 'Hola! Quiero consultar por una impresión 3D')}
          target="_blank" rel="noreferrer">
          <Icono nombre="whatsapp" tam={20} /> WhatsApp
        </a>
        <a href={`mailto:${sitio.contacto.email}`}>{sitio.contacto.email}</a>
      </div>

      <div className="tarjeta cotizar__form">
        {enviado ? (
          <div className="gracias">
            <span className="gracias__icono"><Icono nombre="check" tam={28} /></span>
            <h3>¡Listo! Se abrió WhatsApp.</h3>
            <p>Enviá el mensaje desde el chat (y el archivo 3D si lo tenés). Te respondemos con el presupuesto a la brevedad.</p>
            <button className="boton boton--borde" onClick={() => setEnviado(false)}>Hacer otra consulta</button>
          </div>
        ) : (
          <form onSubmit={enviar} className="form">
            <div className="campo campo--ancho">
              <label htmlFor="f-nombre">Nombre</label>
              <input id="f-nombre" name="nombre" required autoComplete="name" />
            </div>
            <div className="campo">
              <label htmlFor="f-material">Material</label>
              <select id="f-material" name="material" defaultValue="">
                <option value="">No sé, recomiéndenme</option>
                {materiales.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="campo">
              <label htmlFor="f-cantidad">Cantidad</label>
              <input id="f-cantidad" name="cantidad" type="number" min="1" defaultValue="1" />
            </div>
            <div className="campo campo--ancho">
              <label htmlFor="f-detalle">Contanos qué necesitás</label>
              <textarea id="f-detalle" name="detalle" rows="4" placeholder="Medidas, color, uso de la pieza…" />
            </div>
            <label className="campo--ancho" style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
              <input type="checkbox" name="tengoArchivo" /> Tengo el archivo 3D (lo adjunto en WhatsApp)
            </label>
            <div className="campo--ancho">
              <button type="submit" className="boton boton--acento">
                <Icono nombre="whatsapp" tam={20} /> Enviar consulta por WhatsApp
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
