import { useEffect, useMemo, useState } from 'react';
import { formatoPrecio, fotosDe } from '../util.js';
import './admin.css';

// Administración de productos: alta, baja, modificación y fotos.
// Al guardar, el servidor hace un commit en GitHub y Cloudflare actualiza la tienda en 1–2 minutos.

const API = '/api/admin';
const MATERIALES = ['PLA', 'PETG', 'TPU'];
const FOTO_MAX_LADO = 1600;

async function pedir(ruta, opciones = {}) {
  const r = await fetch(API + ruta, {
    credentials: 'same-origin',
    ...opciones,
    headers: { 'content-type': 'application/json', 'x-admin': '1', ...opciones.headers }
  });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error(datos.error || `Error ${r.status}`);
    err.status = r.status;
    throw err;
  }
  return datos;
}

const slug = (t) =>
  String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);

const vacio = () => ({
  id: '', nombre: '', categoria: '', material: 'PLA', medida: '', precio: '',
  imagenes: [], colores: [], descripcion: '', envio: { largo: '', ancho: '', alto: '', peso: '' }, activo: true
});

// Achica la foto en el navegador (máx. 1600 px, JPEG) para que suba rápido y no pese.
async function prepararFoto(archivo) {
  const bitmap = await createImageBitmap(archivo);
  const escala = Math.min(1, FOTO_MAX_LADO / Math.max(bitmap.width, bitmap.height));
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(bitmap.width * escala);
  lienzo.height = Math.round(bitmap.height * escala);
  const ctx = lienzo.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, lienzo.width, lienzo.height);
  ctx.drawImage(bitmap, 0, 0, lienzo.width, lienzo.height);
  const blob = await new Promise((ok) => lienzo.toBlob(ok, 'image/jpeg', 0.85));
  const base64 = await new Promise((ok, mal) => {
    const lector = new FileReader();
    lector.onload = () => ok(String(lector.result).split(',')[1]);
    lector.onerror = mal;
    lector.readAsDataURL(blob);
  });
  return { base64, url: URL.createObjectURL(blob) };
}

export default function Admin() {
  const [estado, setEstado] = useState('cargando'); // cargando | login | listo
  const [productos, setProductos] = useState([]);
  const [version, setVersion] = useState('');
  const [aviso, setAviso] = useState(null); // { tipo: 'ok' | 'error', texto }
  const [ocupado, setOcupado] = useState(false);
  const [editando, setEditando] = useState(null); // { borrador, original }
  const [nuevas, setNuevas] = useState({}); // nombre → { base64, url }
  const [filtro, setFiltro] = useState('activos');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    document.title = 'Admin · Bad Brain 3D';
    const meta = document.createElement('meta');
    meta.name = 'robots'; meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    cargar();
  }, []);

  async function cargar() {
    try {
      await pedir('/sesion');
      const d = await pedir('/productos');
      setProductos(d.productos); setVersion(d.version); setEstado('listo');
    } catch (err) {
      if (err.status === 401) setEstado('login');
      else { setEstado('listo'); setAviso({ tipo: 'error', texto: err.message }); }
    }
  }

  async function guardar(lista, mensaje, { fotosNuevas = [], fotosBorrar = [] } = {}) {
    setOcupado(true); setAviso(null);
    try {
      const d = await pedir('/guardar', {
        method: 'POST',
        body: JSON.stringify({
          productos: lista, version, mensaje,
          fotosNuevas: fotosNuevas.map((n) => ({ nombre: n, base64: nuevas[n].base64 })),
          fotosBorrar
        })
      });
      setProductos(d.productos); setVersion(d.version);
      setAviso({ tipo: 'ok', texto: `Guardado ✓ La tienda se actualiza en 1 o 2 minutos.` });
      return true;
    } catch (err) {
      if (err.status === 401) setEstado('login');
      setAviso({ tipo: 'error', texto: err.message });
      return false;
    } finally {
      setOcupado(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async function salir() {
    await pedir('/logout', { method: 'POST' }).catch(() => {});
    setEstado('login'); setProductos([]);
  }

  const categorias = useMemo(() => [...new Set(productos.map((p) => p.categoria).filter(Boolean))].sort(), [productos]);
  const visibles = productos.filter((p) =>
    (filtro === 'todos' || (filtro === 'activos' ? p.activo !== false : p.activo === false)) &&
    `${p.nombre} ${p.categoria}`.toLowerCase().includes(busqueda.toLowerCase())
  );

  function abrir(p) {
    const b = p ? structuredClone(p) : vacio();
    b.imagenes = fotosDe(b);
    delete b.imagen;
    b.envio = { largo: '', ancho: '', alto: '', peso: '', ...(b.envio || {}) };
    b.precio = b.precio ?? '';
    setEditando({ borrador: b, original: p || null });
    setAviso(null);
    window.scrollTo(0, 0);
  }

  async function cambiarEstado(p) {
    const activo = p.activo === false;
    const lista = productos.map((x) => (x.id === p.id ? { ...x, activo } : x));
    await guardar(lista, `${activo ? 'reactivar' : 'dar de baja'} "${p.nombre}"`);
  }

  if (estado === 'cargando') return <div className="adm adm-centro">Cargando…</div>;
  if (estado === 'login') return <Login alEntrar={() => { setEstado('cargando'); cargar(); }} />;

  return (
    <div className="adm">
      <header className="adm-barra">
        <strong>Bad Brain 3D · Productos</strong>
        <nav>
          <a href="./" target="_blank" rel="noreferrer">Ver tienda ↗</a>
          <button type="button" className="adm-enlace" onClick={salir}>Salir</button>
        </nav>
      </header>

      <main className="adm-cuerpo">
        {aviso && <div className={`adm-aviso adm-aviso--${aviso.tipo}`} role="status">{aviso.texto}</div>}

        {editando ? (
          <Editor
            key={editando.original?.id || 'nuevo'}
            inicial={editando.borrador}
            original={editando.original}
            productos={productos}
            categorias={categorias}
            nuevas={nuevas}
            setNuevas={setNuevas}
            ocupado={ocupado}
            alCancelar={() => setEditando(null)}
            alGuardar={async (b, extras) => {
              const lista = editando.original
                ? productos.map((x) => (x.id === editando.original.id ? b : x))
                : [...productos, b];
              const ok = await guardar(lista, `${editando.original ? 'editar' : 'agregar'} "${b.nombre}"`, extras);
              if (ok) setEditando(null);
            }}
            alEliminar={async () => {
              const p = editando.original;
              if (!window.confirm(`¿Eliminar "${p.nombre}" para siempre? Se borran también sus fotos. Si solo querés ocultarlo, usá "Dar de baja".`)) return;
              const ok = await guardar(productos.filter((x) => x.id !== p.id), `eliminar "${p.nombre}"`, { fotosBorrar: fotosDe(p) });
              if (ok) setEditando(null);
            }}
          />
        ) : (
          <>
            <div className="adm-herramientas">
              <input type="search" placeholder="Buscar producto…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
              <select value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Mostrar">
                <option value="activos">Activos</option>
                <option value="baja">Dados de baja</option>
                <option value="todos">Todos</option>
              </select>
              <button type="button" className="adm-boton adm-boton--primario" onClick={() => abrir(null)} disabled={ocupado}>+ Nuevo producto</button>
            </div>

            <ul className="adm-lista">
              {visibles.map((p) => {
                const fotos = fotosDe(p);
                return (
                  <li key={p.id} className={p.activo === false ? 'adm-fila adm-fila--baja' : 'adm-fila'}>
                    <div className="adm-mini">{fotos[0] ? <img src={`${API}/foto/${encodeURIComponent(fotos[0])}`} alt="" loading="lazy" /> : <span>Sin foto</span>}</div>
                    <div className="adm-datos">
                      <strong>{p.nombre}</strong>
                      <span>{p.categoria} · {formatoPrecio(p.precio)} · {fotos.length} foto{fotos.length === 1 ? '' : 's'}</span>
                      {p.activo === false && <span className="adm-chip">De baja</span>}
                      {p.activo !== false && fotos.length === 0 && <span className="adm-chip adm-chip--alerta">No se ve: falta foto</span>}
                    </div>
                    <div className="adm-acciones">
                      <button type="button" className="adm-boton" onClick={() => abrir(p)} disabled={ocupado}>Editar</button>
                      <button type="button" className="adm-boton" onClick={() => cambiarEstado(p)} disabled={ocupado}>
                        {p.activo === false ? 'Reactivar' : 'Dar de baja'}
                      </button>
                    </div>
                  </li>
                );
              })}
              {visibles.length === 0 && <li className="adm-vacio">No hay productos para mostrar.</li>}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}

function Login({ alEntrar }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  return (
    <div className="adm adm-centro">
      <form className="adm-login" onSubmit={async (e) => {
        e.preventDefault(); setOcupado(true); setError('');
        try { await pedir('/login', { method: 'POST', body: JSON.stringify({ password }) }); alEntrar(); }
        catch (err) { setError(err.message); setOcupado(false); }
      }}>
        <h1>Administrar productos</h1>
        <label>Contraseña
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus required />
        </label>
        {error && <p className="adm-error" role="alert">{error}</p>}
        <button type="submit" className="adm-boton adm-boton--primario" disabled={ocupado}>{ocupado ? 'Entrando…' : 'Entrar'}</button>
        <a href="./">← Volver a la tienda</a>
      </form>
    </div>
  );
}

function Editor({ inicial, original, productos, categorias, nuevas, setNuevas, ocupado, alCancelar, alGuardar, alEliminar }) {
  const [b, setB] = useState(inicial);
  const [coloresTexto, setColoresTexto] = useState((inicial.colores || []).join(', '));
  const [error, setError] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const cambiar = (campo, valor) => setB((x) => ({ ...x, [campo]: valor }));
  const cambiarEnvio = (campo, valor) => setB((x) => ({ ...x, envio: { ...x.envio, [campo]: valor } }));
  const urlFoto = (n) => nuevas[n]?.url || `${API}/foto/${encodeURIComponent(n)}`;

  function mover(i, d) {
    const lista = [...b.imagenes];
    const j = i + d;
    if (j < 0 || j >= lista.length) return;
    [lista[i], lista[j]] = [lista[j], lista[i]];
    cambiar('imagenes', lista);
  }

  async function agregarFotos(archivos) {
    setSubiendo(true); setError('');
    try {
      const base = slug(b.id || b.nombre) || 'producto';
      const agregadas = {};
      const nombres = [];
      for (const [k, archivo] of [...archivos].entries()) {
        if (!archivo.type.startsWith('image/')) continue;
        const nombre = `${base}-${Date.now().toString(36)}${k}.jpg`;
        agregadas[nombre] = await prepararFoto(archivo);
        nombres.push(nombre);
      }
      setNuevas((x) => ({ ...x, ...agregadas }));
      setB((x) => ({ ...x, imagenes: [...x.imagenes, ...nombres].slice(0, 12) }));
    } catch {
      setError('No se pudo leer alguna de las fotos. Probá con JPG o PNG.');
    } finally {
      setSubiendo(false);
    }
  }

  function enviar(e) {
    e.preventDefault();
    setError('');
    const final = {
      ...b,
      nombre: b.nombre.trim(),
      categoria: b.categoria.trim(),
      colores: coloresTexto.split(',').map((c) => c.trim()).filter(Boolean),
      precio: b.precio === '' ? null : Number(b.precio)
    };
    if (!original) {
      let id = slug(final.nombre) || 'producto';
      const usados = new Set(productos.map((p) => p.id));
      for (let n = 2; usados.has(id); n++) id = `${slug(final.nombre)}-${n}`;
      final.id = id;
    }
    const envio = Object.fromEntries(Object.entries(final.envio).map(([k, v]) => [k, v === '' ? null : Number(v)]));
    if (Object.values(envio).some((v) => v != null)) final.envio = envio; else delete final.envio;
    if (final.activo !== false && final.imagenes.length === 0 &&
      !window.confirm('El producto no tiene fotos, así que no se va a ver en la tienda hasta que le agregues una. ¿Guardar igual?')) return;

    const fotosNuevas = final.imagenes.filter((n) => nuevas[n]);
    const fotosBorrar = fotosDe(original || {}).filter((n) => !final.imagenes.includes(n));
    alGuardar(final, { fotosNuevas, fotosBorrar });
  }

  return (
    <form className="adm-editor" onSubmit={enviar}>
      <div className="adm-editor__titulo">
        <h1>{original ? `Editar: ${original.nombre}` : 'Nuevo producto'}</h1>
        <label className="adm-interruptor">
          <input type="checkbox" checked={b.activo !== false} onChange={(e) => cambiar('activo', e.target.checked)} />
          {b.activo !== false ? 'Activo (se ve en la tienda)' : 'De baja (oculto)'}
        </label>
      </div>

      <section className="adm-bloque">
        <h2>Fotos <small>La primera es la principal. Máximo 12.</small></h2>
        <div className="adm-fotos">
          {b.imagenes.map((n, i) => (
            <figure key={n} className="adm-foto">
              <img src={urlFoto(n)} alt={`Foto ${i + 1}`} />
              {i === 0 && <span className="adm-chip">Principal</span>}
              <div className="adm-foto__acciones">
                <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Mover a la izquierda">←</button>
                <button type="button" onClick={() => mover(i, 1)} disabled={i === b.imagenes.length - 1} aria-label="Mover a la derecha">→</button>
                <button type="button" onClick={() => cambiar('imagenes', b.imagenes.filter((x) => x !== n))} aria-label="Quitar foto">✕</button>
              </div>
            </figure>
          ))}
          {b.imagenes.length < 12 && (
            <label className="adm-foto adm-foto--agregar">
              <input type="file" accept="image/*" multiple onChange={(e) => { agregarFotos(e.target.files); e.target.value = ''; }} disabled={subiendo} />
              <span>{subiendo ? 'Preparando…' : '+ Agregar fotos'}</span>
            </label>
          )}
        </div>
      </section>

      <section className="adm-bloque adm-campos">
        <label className="adm-ancho">Nombre *
          <input value={b.nombre} onChange={(e) => cambiar('nombre', e.target.value)} maxLength={120} required />
        </label>
        <label>Categoría *
          <input value={b.categoria} onChange={(e) => cambiar('categoria', e.target.value)} list="adm-categorias" maxLength={40} required />
          <datalist id="adm-categorias">{categorias.map((c) => <option key={c} value={c} />)}</datalist>
        </label>
        <label>Precio ($)
          <input type="number" inputMode="numeric" min="0" step="1" value={b.precio} onChange={(e) => cambiar('precio', e.target.value)} placeholder="Vacío = a consultar" />
        </label>
        <label>Material
          <input value={b.material} onChange={(e) => cambiar('material', e.target.value)} list="adm-materiales" maxLength={30} />
          <datalist id="adm-materiales">{MATERIALES.map((m) => <option key={m} value={m} />)}</datalist>
        </label>
        <label>Medida
          <input value={b.medida} onChange={(e) => cambiar('medida', e.target.value)} maxLength={80} placeholder="Ej.: 12 cm de alto" />
        </label>
        <label className="adm-ancho">Colores <small>(separados por coma)</small>
          <input value={coloresTexto} onChange={(e) => setColoresTexto(e.target.value)} placeholder="Blanco, Negro, Rojo" />
        </label>
        <label className="adm-ancho">Descripción
          <textarea rows={4} value={b.descripcion} onChange={(e) => cambiar('descripcion', e.target.value)} maxLength={1500} />
        </label>
      </section>

      <section className="adm-bloque">
        <h2>Paquete para envío <small>Opcional. Solo hace falta si usás Mercado Envíos.</small></h2>
        <div className="adm-campos adm-campos--4">
          {[['largo', 'Largo (cm)'], ['ancho', 'Ancho (cm)'], ['alto', 'Alto (cm)'], ['peso', 'Peso (g)']].map(([k, t]) => (
            <label key={k}>{t}
              <input type="number" inputMode="decimal" min="0" step="any" value={b.envio[k] ?? ''} onChange={(e) => cambiarEnvio(k, e.target.value)} />
            </label>
          ))}
        </div>
      </section>

      {error && <p className="adm-error" role="alert">{error}</p>}

      <div className="adm-pie">
        <button type="submit" className="adm-boton adm-boton--primario" disabled={ocupado || subiendo}>{ocupado ? 'Guardando…' : 'Guardar'}</button>
        <button type="button" className="adm-boton" onClick={alCancelar} disabled={ocupado}>Cancelar</button>
        {original && <button type="button" className="adm-boton adm-boton--peligro" onClick={alEliminar} disabled={ocupado}>Eliminar</button>}
      </div>
    </form>
  );
}
