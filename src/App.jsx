import { useEffect, useMemo, useState } from 'react';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import Beneficios from './components/Beneficios.jsx';
import Catalogo from './components/Catalogo.jsx';
import Muestrario from './components/Muestrario.jsx';
import ComoFunciona from './components/ComoFunciona.jsx';
import Materiales from './components/Materiales.jsx';
import Cotizar from './components/Cotizar.jsx';
import Preguntas from './components/Preguntas.jsx';
import Footer from './components/Footer.jsx';
import Carrito from './components/Carrito.jsx';

async function obtener(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `Error ${r.status}`);
  return r.json();
}

export default function App() {
  const [sitio, setSitio] = useState(null);
  const [productos, setProductos] = useState([]);
  const [muestrario, setMuestrario] = useState([]);
  const [error, setError] = useState('');
  const [carrito, setCarrito] = useState(() => {
    try { return JSON.parse(localStorage.getItem('carrito')) || {}; } catch { return {}; }
  });
  const [carritoAbierto, setCarritoAbierto] = useState(false);

  useEffect(() => {
    Promise.all([obtener('/api/sitio'), obtener('/api/productos'), obtener('/api/muestrario')])
      .then(([s, p, m]) => { setSitio(s); setProductos(p); setMuestrario(m); })
      .catch((e) => setError(e.message));
  }, []);

  // Colores de sitio.json → variables CSS
  useEffect(() => {
    if (!sitio) return;
    const raiz = document.documentElement.style;
    const c = sitio.colores || {};
    if (c.acento) raiz.setProperty('--acento', c.acento);
    if (c.oscuro) raiz.setProperty('--oscuro', c.oscuro);
    if (c.fondo) raiz.setProperty('--fondo', c.fondo);
    if (c.punk) raiz.setProperty('--punk', c.punk);
    if (c.amarillo) raiz.setProperty('--amarillo', c.amarillo);
    document.title = `${sitio.marca} — ${sitio.eslogan}`;
  }, [sitio]);

  useEffect(() => {
    try { localStorage.setItem('carrito', JSON.stringify(carrito)); } catch { /* sin almacenamiento */ }
  }, [carrito]);

  const cambiarCantidad = (id, delta) =>
    setCarrito((c) => {
      const nueva = (c[id] || 0) + delta;
      const copia = { ...c };
      if (nueva <= 0) delete copia[id]; else copia[id] = nueva;
      return copia;
    });

  const itemsCarrito = useMemo(
    () => productos.filter((p) => carrito[p.id]).map((p) => ({ ...p, cantidad: carrito[p.id] })),
    [productos, carrito]
  );
  const unidades = itemsCarrito.reduce((t, i) => t + i.cantidad, 0);

  if (error) {
    return (
      <div className="estado">
        <h1>No se pudo cargar el contenido</h1>
        <p>{error}</p>
      </div>
    );
  }
  if (!sitio) return <div className="estado"><div className="cargando" aria-label="Cargando" /></div>;

  return (
    <>
      <Header sitio={sitio} unidades={unidades} abrirCarrito={() => setCarritoAbierto(true)} />
      <main>
        <Hero sitio={sitio} />
        <Beneficios items={sitio.beneficios} />
        <Catalogo productos={productos} moneda={sitio.moneda} carrito={carrito}
          agregar={(id) => cambiarCantidad(id, 1)} />
        <Muestrario trabajos={muestrario} />
        <ComoFunciona pasos={sitio.pasos} />
        <Materiales materiales={sitio.materiales} />
        <Cotizar sitio={sitio} />
        <Preguntas preguntas={sitio.preguntas} />
      </main>
      <Footer sitio={sitio} />
      <Carrito abierto={carritoAbierto} cerrar={() => setCarritoAbierto(false)} items={itemsCarrito}
        sitio={sitio} cambiarCantidad={cambiarCantidad} vaciar={() => setCarrito({})} />
    </>
  );
}
