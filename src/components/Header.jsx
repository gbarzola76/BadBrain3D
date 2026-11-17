import { useEffect, useState } from 'react';
import Icono from './Icono.jsx';
import LogoMarca from './LogoMarca.jsx';
import Rotulo from './Rotulo.jsx';

const LINKS = [
  ['#catalogo', 'Catálogo'],
  ['#muestrario', 'Muestrario'],
  ['#como-funciona', 'Cómo funciona'],
  ['#materiales', 'Materiales'],
  ['#preguntas', 'Preguntas']
];

export function Logo({ marca, tam = 62 }) {
  return (
    <a href="#inicio" className="logo" aria-label={marca}>
      <LogoMarca tam={tam} />
      <Rotulo marca={marca} />
    </a>
  );
}

export default function Header({ sitio, unidades, abrirCarrito }) {
  const [scroll, setScroll] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const f = () => setScroll(window.scrollY > 10);
    f();
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);

  return (
    <header className={`header ${scroll ? 'header--scroll' : ''}`}>
      <div className="contenedor header__fila">
        <Logo marca={sitio.marca} />
        <nav aria-label="Principal" className={`nav ${menu ? 'nav--abierto' : ''}`}>
          {LINKS.map(([href, texto]) => (
            <a key={href} href={href} onClick={() => setMenu(false)}>{texto}</a>
          ))}
        </nav>
        <div className="header__acciones">
          <a href="#cotizar" className="boton boton--oscuro boton--chico ocultar-movil">Pedir presupuesto</a>
          <button className="boton-icono" onClick={abrirCarrito} aria-label={`Ver pedido (${unidades} productos)`}>
            <Icono nombre="bolsa" />
            {unidades > 0 && <span className="globo">{unidades}</span>}
          </button>
          <button className="boton-icono solo-movil" onClick={() => setMenu((m) => !m)}
            aria-label="Menú" aria-expanded={menu}>
            <Icono nombre={menu ? 'cerrar' : 'menu'} />
          </button>
        </div>
      </div>
    </header>
  );
}
