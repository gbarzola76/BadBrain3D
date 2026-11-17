import { urlImagen } from '../util.js';

export default function Hero({ sitio }) {
  const { hero } = sitio;
  return (
    <section id="inicio" className="hero contenedor">
      <div className="hero__texto">
        <span className="etiqueta">{sitio.eslogan}</span>
        <h1>{hero.titulo}</h1>
        <p>{hero.texto}</p>
        <div className="hero__botones">
          <a href="#catalogo" className="boton boton--acento">Ver catálogo</a>
          <a href="#cotizar" className="boton boton--borde">Subir mi archivo</a>
        </div>
      </div>
      <div className="hero__visual">
        {hero.imagen ? (
          <img src={urlImagen(hero.imagen)} alt="" />
        ) : (
          <div className="impresora" aria-hidden="true">
            <div className="impresora__cabezal" />
            <div className="impresora__pieza">
              {Array.from({ length: 9 }, (_, i) => (
                <span key={i} style={{ '--i': i, width: `${92 - i * 8}%` }} />
              ))}
            </div>
            <div className="impresora__cama" />
          </div>
        )}
      </div>
    </section>
  );
}
