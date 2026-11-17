export default function Materiales({ materiales = [] }) {
  return (
    <section id="materiales" className="seccion contenedor">
      <h2>Materiales</h2>
      <p className="bajada">Si no sabés cuál elegir, te recomendamos uno según el uso de la pieza.</p>
      <div className="materiales">
        {materiales.map((m) => (
          <div key={m.nombre} className="tarjeta material">
            <h3>{m.nombre}</h3>
            <p>{m.texto}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
