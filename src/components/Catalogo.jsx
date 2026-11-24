import { useMemo, useState } from 'react';
import FotosProducto from './FotosProducto.jsx';
import Icono from './Icono.jsx';
import { formatoPrecio, fotosDe } from '../util.js';

export default function Catalogo({ productos, moneda, carrito, agregar }) {
  const [categoria, setCategoria] = useState('Todo');
  const [busqueda, setBusqueda] = useState('');

  const categorias = useMemo(() => ['Todo', ...new Set(productos.map((p) => p.categoria))], [productos]);
  const visibles = productos.filter((p) =>
    (categoria === 'Todo' || p.categoria === categoria) &&
    `${p.nombre} ${p.descripcion} ${p.material}`.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <section id="catalogo" className="seccion contenedor">
      <div className="seccion__cabecera">
        <div>
          <h2>Catálogo</h2>
          <p className="bajada">Piezas listas para imprimir. Elegí el color al confirmar el pedido.</p>
        </div>
        <label className="buscador">
          <Icono nombre="lupa" tam={18} />
          <span className="sr-only">Buscar productos</span>
          <input type="search" placeholder="Buscar…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </label>
      </div>

      <div className="filtros" role="group" aria-label="Filtrar por categoría">
        {categorias.map((c) => (
          <button key={c} className={`chip ${categoria === c ? 'chip--activo' : ''}`}
            aria-pressed={categoria === c} onClick={() => setCategoria(c)}>{c}</button>
        ))}
      </div>

      <div className="grilla-productos">
        {visibles.map((p) => (
          <article key={p.id} className="producto">
            <div className="producto__foto">
              <FotosProducto fotos={fotosDe(p)} nombre={p.nombre} clave={p.id} />
              <span className="producto__cat">{p.categoria}</span>
            </div>
            <div className="producto__info">
              <h3>{p.nombre}</h3>
              <p className="producto__desc">{p.descripcion}</p>
              <p className="producto__spec">{p.material} · {p.medida}</p>
              <div className="producto__pie">
                <span className="precio">{formatoPrecio(p.precio, moneda)}</span>
                <button className="boton boton--acento boton--chico" onClick={() => agregar(p.id)}>
                  {carrito[p.id] ? <><Icono nombre="check" tam={16} /> {carrito[p.id]} en pedido</> : 'Agregar'}
                </button>
              </div>
            </div>
          </article>
        ))}
        {visibles.length === 0 && <p className="vacio">No hay productos que coincidan.</p>}
      </div>
    </section>
  );
}
