import { Logo } from './Header.jsx';
import { linkWhatsApp } from '../util.js';

export default function Footer({ sitio }) {
  const { contacto } = sitio;
  return (
    <footer className="footer">
      <div className="contenedor footer__fila">
        <Logo marca={sitio.marca} />
        <nav aria-label="Redes y contacto" className="footer__links">
          {contacto.instagram && <a href={`https://instagram.com/${contacto.instagram}`} target="_blank" rel="noreferrer">Instagram</a>}
          {contacto.whatsapp && <a href={linkWhatsApp(contacto.whatsapp)} target="_blank" rel="noreferrer">WhatsApp</a>}
          {contacto.email && <a href={`mailto:${contacto.email}`}>{contacto.email}</a>}
        </nav>
        <span>© {new Date().getFullYear()} {sitio.marca}{contacto.ciudad ? ` · ${contacto.ciudad}` : ''}</span>
      </div>
    </footer>
  );
}
