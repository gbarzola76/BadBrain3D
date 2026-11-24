import React, { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource-variable/space-grotesk';
import '@fontsource/anton/latin-400.css';
import '@fontsource/special-elite/latin-400.css';
import '@fontsource/abril-fatface/latin-400.css';
import '@fontsource/permanent-marker/latin-400.css';
import '@fontsource/rubik-mono-one/latin-400.css';
import './styles.css';
import App from './App.jsx';

// /admin carga la administración de productos (en un archivo aparte, para no sumarle peso a la tienda).
const Admin = lazy(() => import('./admin/Admin.jsx'));
const esAdmin = /\/admin\/?$/.test(window.location.pathname);

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {esAdmin ? <Suspense fallback={null}><Admin /></Suspense> : <App />}
  </React.StrictMode>
);
