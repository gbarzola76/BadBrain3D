import { useState } from 'react';
import Icono from './Icono.jsx';
import { linkWhatsApp } from '../util.js';

const MAX_MB = 50; // mismo límite que en server/index.js

export default function Cotizar({ sitio }) {
  const [estado, setEstado] = useState('inicial'); // inicial | enviando | enviado | error
  const [mensaje, setMensaje] = useState('');
  const [archivo, setArchivo] = useState('');
  const materiales = (sitio.materiales || []).map((m) => m.nombre);

  async function enviar(e) {
    e.preventDefault();
    const datosForm = new FormData(e.currentTarget);
    const adjunto = datosForm.get('archivo');
    if (adjunto && adjunto.size > MAX_MB * 1024 * 1024) {
      setMensaje(`El archivo supera los ${MAX_MB} MB. Si es más grande, mandanos un link (Drive, WeTransfer) en el detalle.`);
      setEstado('error');
      return;
    }
    setEstado('enviando');
    try {
      const r = await fetch('/api/consultas', { method: 'POST', body: datosForm });
      const datos = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(datos.error || 'No se pudo enviar.');
      setEstado('enviado');
    } catch (err) {
      setMensaje(err.message);
      setEstado('error');
    }
  }

  return (
    <section id="cotizar" className="seccion contenedor cotizar">
      <div className="cotizar__intro">
        <h2>Pedí tu presupuesto</h2>
        <p className="bajada">Completá el formulario y te respondemos a la brevedad. También podés escribirnos directo.</p>
        <a className="boton boton--borde" href={linkWhatsApp(sitio.contacto.whatsapp, 'Hola! Quiero consultar por una impresión 3D')}
          target="_blank" rel="noreferrer">
          <Icono nombre="whatsapp" tam={20} /> WhatsApp
        </a>
        <a href={`mailto:${sitio.contacto.email}`}>{sitio.contacto.email}</a>
      </div>

      <div className="tarjeta cotizar__form">
        {estado === 'enviado' ? (
          <div className="gracias">
            <span className="gracias__icono"><Icono nombre="check" tam={28} /></span>
            <h3>¡Gracias! Recibimos tu consulta.</h3>
            <p>Te vamos a responder con el presupuesto a la brevedad.</p>
            <button className="boton boton--borde" onClick={() => { setEstado('inicial'); setArchivo(''); }}>Enviar otra</button>
          </div>
        ) : (
          <form onSubmit={enviar} className="form">
            <div className="campo">
              <label htmlFor="f-nombre">Nombre</label>
              <input id="f-nombre" name="nombre" required autoComplete="name" />
            </div>
            <div className="campo">
              <label htmlFor="f-contacto">Email o WhatsApp</label>
              <input id="f-contacto" name="contacto" required />
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
              <span className="campo__label">Archivo 3D o foto (opcional)</span>
              <label className="subida">
                <Icono nombre="subir" />
                <span>{archivo || 'Elegí un archivo STL, OBJ, 3MF o una imagen (máx. 50 MB)'}</span>
                <input type="file" name="archivo" accept=".stl,.obj,.3mf,.jpg,.jpeg,.png,.webp,.pdf"
                  onChange={(e) => setArchivo(e.target.files?.[0]?.name || '')} />
              </label>
            </div>
            <div className="campo campo--ancho">
              <label htmlFor="f-detalle">Contanos qué necesitás</label>
              <textarea id="f-detalle" name="detalle" rows="4" placeholder="Medidas, color, uso de la pieza…" />
            </div>
            {estado === 'error' && <p className="error campo--ancho" role="alert">{mensaje}</p>}
            <div className="campo--ancho">
              <button type="submit" className="boton boton--acento" disabled={estado === 'enviando'}>
                {estado === 'enviando' ? 'Enviando…' : 'Enviar consulta'}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
