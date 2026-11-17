import React from 'react';
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

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
