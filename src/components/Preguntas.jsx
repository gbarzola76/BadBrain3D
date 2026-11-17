export default function Preguntas({ preguntas = [] }) {
  return (
    <section id="preguntas" className="seccion contenedor contenedor--angosto">
      <h2>Preguntas frecuentes</h2>
      <div className="faq">
        {preguntas.map((p, i) => (
          <details key={p.pregunta} open={i === 0}>
            <summary>{p.pregunta}</summary>
            <p>{p.respuesta}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
