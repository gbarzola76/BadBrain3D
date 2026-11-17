const trazos = {
  cubo: <><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" /><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" /></>,
  reloj: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  camion: <><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="1.8" /><circle cx="17" cy="18" r="1.8" /></>,
  tarjeta: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h4" /></>,
  bolsa: <><path d="M5 8h14l-1 12H6z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
  cerrar: <path d="M6 6l12 12M18 6L6 18" />,
  mas: <path d="M12 5v14M5 12h14" />,
  menos: <path d="M5 12h14" />,
  flechaIzq: <path d="M15 5l-7 7 7 7" />,
  flechaDer: <path d="M9 5l7 7-7 7" />,
  whatsapp: <path d="M21 12a9 9 0 0 1-13.5 7.8L3 21l1.2-4.5A9 9 0 1 1 21 12z" />,
  subir: <><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></>,
  check: <path d="M5 12l5 5 9-10" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  lupa: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>
};

export default function Icono({ nombre, tam = 22, grosor = 1.8, ...resto }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={grosor} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...resto}>
      {trazos[nombre] || trazos.cubo}
    </svg>
  );
}
