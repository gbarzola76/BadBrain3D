import { useCallback, useEffect, useMemo, useState } from 'react';
import Imagen from './Imagen.jsx';
import Icono from './Icono.jsx';

export default function Muestrario({ trabajos, textos = {} }) {
  const [categoria, setCategoria] = useState('Todos');
  const [abierto, setAbierto] = useState(null); // índice dentro de "visibles"

  const categorias = useMemo(() => ['Todos', ...new Set(trabajos.map((t) => t.categoria))], [trabajos]);
  const visibles = trabajos.filter((t) => categoria === 'Todos' || t.categoria === categoria);

  const mover = useCallback(
    (d) => setAbierto((i) => (i === null ? null : (i + d + visibles.length) % visibles.length)),
    [visibles.length]
  );

  useEffect(() => {
    if (abierto === null) return;
    const tecla = (e) => {
      if (e.key === 'Escape') setAbierto(null);
      if (e.key === 'ArrowRight') mover(1);
      if (e.key === 'ArrowLeft') mover(-1);
    };
    document.addEventListener('keydown', tecla);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', tecla); document.body.style.overflow = ''; };
  }, [abierto, mover]);

  const actual = abierto !== null ? visibles[abierto] : null;

  return (
    <section id="muestrario" className="seccion muestrario">
      <div className="contenedor">
        <div className="seccion__cabecera">
          <div>
            <h2>{textos.titulo || 'Muestrario'}</h2>
            <p className="bajada">{textos.texto || 'Algunos trabajos que imprimimos para nuestros clientes.'}</p>
          </div>
        </div>
        <div className="filtros" role="group" aria-label="Filtrar trabajos">
          {categorias.map((c) => (
            <button key={c} className={`chip chip--claro ${categoria === c ? 'chip--activo' : ''}`}
              aria-pressed={categoria === c} onClick={() => setCategoria(c)}>{c}</button>
          ))}
        </div>

        <div className="mosaico">
          {visibles.map((t, i) => (
            <button key={t.id} className={`mosaico__item ${t.alto === 'alto' ? 'mosaico__item--alto' : ''}`}
              onClick={() => setAbierto(i)} aria-label={`Ver ${t.titulo}`}>
              <Imagen src={t.imagen} alt={t.titulo} clave={t.id} />
              <span className="mosaico__texto">
                <strong>{t.titulo}</strong>
                <span>{t.categoria} · {t.material}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {actual && (
        <div className="visor" role="dialog" aria-modal="true" aria-label={actual.titulo} onClick={() => setAbierto(null)}>
          <div className="visor__caja" onClick={(e) => e.stopPropagation()}>
            <button className="visor__cerrar boton-icono" onClick={() => setAbierto(null)} aria-label="Cerrar" autoFocus>
              <Icono nombre="cerrar" />
            </button>
            <div className="visor__foto"><Imagen src={actual.imagen} alt={actual.titulo} clave={actual.id} /></div>
            <div className="visor__info">
              <span className="etiqueta">{actual.categoria} · {actual.material}</span>
              <h3>{actual.titulo}</h3>
              <p>{actual.descripcion}</p>
              <div className="visor__nav">
                <button className="boton-icono" onClick={() => mover(-1)} aria-label="Anterior"><Icono nombre="flechaIzq" /></button>
                <span>{abierto + 1} / {visibles.length}</span>
                <button className="boton-icono" onClick={() => mover(1)} aria-label="Siguiente"><Icono nombre="flechaDer" /></button>
              </div>
              <a href="#cotizar" className="boton boton--acento" onClick={() => setAbierto(null)}>Quiero algo así</a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
