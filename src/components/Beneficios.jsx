import Icono from './Icono.jsx';

export default function Beneficios({ items = [] }) {
  return (
    <section className="beneficios" aria-label="Por qué elegirnos">
      <div className="contenedor beneficios__grilla">
        {items.map((b) => (
          <div key={b.titulo} className="beneficio">
            <Icono nombre={b.icono} tam={26} />
            <div>
              <strong>{b.titulo}</strong>
              <p>{b.texto}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
