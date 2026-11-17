export default function ComoFunciona({ pasos = [] }) {
  return (
    <section id="como-funciona" className="seccion contenedor">
      <h2>Cómo funciona un pedido a medida</h2>
      <ol className="pasos">
        {pasos.map((p, i) => (
          <li key={p.titulo} className="tarjeta">
            <span className="paso__num">{String(i + 1).padStart(2, '0')}</span>
            <h3>{p.titulo}</h3>
            <p>{p.texto}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
