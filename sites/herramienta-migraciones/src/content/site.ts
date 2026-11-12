/**
 * Copy and lists of the Estrato landing (single language, Spanish).
 * Estrato is a fictional open-source project: every version, date, command, install method, supported database,
 * documentation topic and the license are sample data (PROPOSAL.md, Decisions 1 and 2). No repository URL exists,
 * so repository and documentation entries carry no link.
 */

export interface NavItem {
  label: string;
  href: string;
}

/** One node of the hero's migration chain: an id and the section it links to. */
export interface ChainNode {
  id: string;
  label: string;
  href: string;
}

export interface Release {
  version: string;
  date: string;
  title: string;
}

export interface FeaturedRelease extends Release {
  tag: string;
  detail: string;
}

/** A two-ended row: mono key on the left, sans title and text, mono detail on the right edge. */
export interface MetaRowItem {
  key: string;
  title: string;
  text?: string;
  detail: string;
}

export interface InstallMethod {
  name: string;
  command: string;
  note: string;
}

export type TerminalTone = 'command' | 'output' | 'applied' | 'muted';

export interface TerminalLine {
  tone: TerminalTone;
  text: string;
  /** Second column of an output line (status), shown in the accent for applied lines. */
  status?: string;
  /** Third column (checksum), muted. */
  meta?: string;
}

export interface SectionCopy {
  id: string;
  migration: string;
  title: string;
  lead?: string;
}

export const brand = {
  name: 'Estrato',
  command: 'estrato',
  license: 'Licencia MIT',
  version: 'v0.9.0',
} as const;

export const ui = {
  skipToContent: 'Saltar al contenido',
  navLabel: 'Principal',
  homeLabel: 'Estrato, inicio',
  footerNavLabel: 'Pie de página',
} as const;

export const nav: NavItem[] = [
  { label: 'Instalar', href: '#instalar' },
  { label: 'Principios', href: '#principios' },
  { label: 'Documentación', href: '#docs' },
  { label: 'Comunidad', href: '#comunidad' },
];

export const actions = {
  install: { label: 'Instalar', href: '#instalar' },
  github: { label: 'Ver en GitHub', tag: 'demo' },
} as const;

export const hero = {
  id: 'indice',
  headline: 'Migraciones de bases de datos en el mismo orden, en cada entorno.',
  intro:
    'Estrato es una herramienta de línea de comandos, de código abierto, para migraciones de bases de datos escritas en SQL. Las aplica una tras otra y anota cada una, para que desarrollo, pruebas y producción pasen por los mismos pasos.',
  databases: 'PostgreSQL · MySQL · SQLite',
  chainTitle: 'Mapa de esta página',
  chainCaption: 'Cada sección es una migración. Elige una para ir a ella.',
  historyTitle: 'Historial de versiones',
} as const;

export const chain: ChainNode[] = [
  { id: '0001_instalar', label: 'Instalación', href: '#instalar' },
  { id: '0002_principios', label: 'Principios', href: '#principios' },
  { id: '0003_documentacion', label: 'Documentación', href: '#docs' },
  { id: '0004_comunidad', label: 'Comunidad', href: '#comunidad' },
];

export const featuredRelease: FeaturedRelease = {
  version: 'v0.9.0',
  date: '2026-10-28',
  tag: 'Última versión',
  title: 'Un solo proceso aplica migraciones a la vez',
  detail:
    'Si dos despliegues lanzan `estrato up` al mismo tiempo, el segundo espera a que el primero termine.',
};

export const releases: Release[] = [
  {
    version: 'v0.8.2',
    date: '2026-09-30',
    title: 'Corrige el orden de dos archivos con el mismo prefijo',
  },
  {
    version: 'v0.8.1',
    date: '2026-09-09',
    title: 'La suma de verificación de cada archivo, en `estrato status`',
  },
  { version: 'v0.8.0', date: '2026-08-12', title: 'Compatibilidad con SQLite' },
  {
    version: 'v0.7.1',
    date: '2026-07-01',
    title: 'Los errores citan la línea del archivo SQL que falló',
  },
  {
    version: 'v0.7.0',
    date: '2026-05-20',
    title: 'Nueva orden `estrato down`: deshace la última migración',
  },
  { version: 'v0.6.0', date: '2026-04-02', title: 'Compatibilidad con MySQL' },
  {
    version: 'v0.5.0',
    date: '2026-02-17',
    title: 'Configuración en un único archivo, `estrato.toml`',
  },
  {
    version: 'v0.4.0',
    date: '2025-12-10',
    title: 'Primera versión pública: PostgreSQL, `init`, `new` y `up`',
  },
];

export const porQue: SectionCopy & {
  rows: MetaRowItem[];
  diagramLabel: string;
} = {
  id: 'por-que',
  migration: '0000_punto_de_partida',
  title: 'Lo que ocurre cuando el esquema se cambia a mano',
  lead: 'Casi todos los equipos empiezan igual: un archivo SQL, una persona con acceso y la memoria de quien lo ejecutó.',
  diagramLabel:
    'Tres entornos, desarrollo, pruebas y producción, con un número distinto de capas de esquema cada uno',
  rows: [
    {
      key: 'a',
      title: 'Scripts que alguien ejecuta a mano',
      text: 'El archivo circula por un canal de chat, alguien lo lanza contra producción y nadie más sabe cuándo ni en qué versión.',
      detail: 'manual',
    },
    {
      key: 'b',
      title: 'Entornos que se separan',
      text: 'Desarrollo tiene una columna que pruebas no tiene, y producción conserva un índice que nadie recuerda haber creado.',
      detail: 'deriva',
    },
    {
      key: 'c',
      title: 'Ningún registro de lo aplicado',
      text: 'Para saber en qué estado está una base de datos hay que abrirla y comparar tablas una por una.',
      detail: 'sin_historial',
    },
  ],
};

export const environments = ['desarrollo', 'pruebas', 'producción'] as const;

export const instalar: SectionCopy & {
  methods: InstallMethod[];
  terminalTitle: string;
  terminalCaption: string;
  terminalLabel: string;
  terminal: TerminalLine[];
} = {
  id: 'instalar',
  migration: '0001_instalar',
  title: 'Instalación',
  lead: 'Un comando, según cómo prefieras instalar herramientas. Debajo, una primera sesión completa, de la instalación al estado final.',
  methods: [
    {
      name: 'Homebrew',
      command: 'brew install estrato',
      note: 'macOS y Linux',
    },
    {
      name: 'npm',
      command: 'npm install --global estrato',
      note: 'Node 20 o posterior',
    },
    {
      name: 'Binario',
      command:
        'tar -xzf estrato-0.9.0-linux-x64.tar.gz && mv estrato /usr/local/bin/',
      note: 'un solo archivo',
    },
  ],
  terminalTitle: 'estrato — primera sesión',
  terminalCaption:
    'Salida de muestra de una primera sesión con dos migraciones.',
  terminalLabel:
    'Sesión de terminal de muestra: instalación, init, new, up y status',
  terminal: [
    { tone: 'command', text: 'brew install estrato' },
    { tone: 'muted', text: '==> Instalando estrato 0.9.0' },
    { tone: 'command', text: 'estrato init' },
    { tone: 'output', text: '  creado   estrato.toml' },
    { tone: 'output', text: '  creado   migraciones/' },
    { tone: 'command', text: 'estrato new crear_usuarios' },
    { tone: 'output', text: '  creado   migraciones/0001_crear_usuarios.sql' },
    { tone: 'command', text: 'estrato new crear_pedidos' },
    { tone: 'output', text: '  creado   migraciones/0002_crear_pedidos.sql' },
    { tone: 'command', text: 'estrato up' },
    { tone: 'applied', text: '0001_crear_usuarios', status: 'aplicada' },
    { tone: 'applied', text: '0002_crear_pedidos ', status: 'aplicada' },
    { tone: 'muted', text: '  2 migraciones aplicadas, en orden.' },
    { tone: 'command', text: 'estrato status' },
    {
      tone: 'applied',
      text: '0001_crear_usuarios',
      status: 'aplicada',
      meta: 'sha256:3f9a…c1e4',
    },
    {
      tone: 'applied',
      text: '0002_crear_pedidos ',
      status: 'aplicada',
      meta: 'sha256:b72e…0d58',
    },
    { tone: 'muted', text: '  Al día: no quedan migraciones pendientes.' },
  ],
};

export const como: SectionCopy & {
  steps: MetaRowItem[];
  diagramLabel: string;
  fileName: string;
  fileLabel: string;
  file: string;
} = {
  id: 'como',
  migration: '0001.1_como_funciona',
  title: 'Cómo funciona',
  lead: 'Cuatro órdenes cubren el trabajo diario. Cada migración es un archivo, y la base de datos guarda la lista de las que ya pasaron por ella.',
  diagramLabel:
    'Cuatro capas apiladas en escalera: cada migración aplicada se asienta sobre la anterior',
  steps: [
    {
      key: 'estrato init',
      title: 'Prepara el proyecto',
      text: 'Crea `estrato.toml` con la conexión y la carpeta `migraciones/`.',
      detail: 'una vez',
    },
    {
      key: 'estrato new',
      title: 'Escribe un cambio',
      text: 'Genera un archivo SQL numerado con dos partes: la que aplica y la que deshace.',
      detail: '.sql',
    },
    {
      key: 'estrato up',
      title: 'Aplica lo pendiente',
      text: 'Ejecuta, en orden, los archivos que la base de datos aún no tiene y anota cada uno en la tabla `estrato_historial`.',
      detail: 'en orden',
    },
    {
      key: 'estrato down',
      title: 'Deshace o consulta',
      text: '`down` revierte la última migración aplicada; `status` lista lo aplicado y lo pendiente.',
      detail: 'status',
    },
  ],
  fileName: 'migraciones/0001_crear_usuarios.sql',
  fileLabel: 'Archivo de migración de muestra',
  file: `-- estrato:up
CREATE TABLE usuarios (
  id     bigint PRIMARY KEY,
  email  text NOT NULL UNIQUE
);

-- estrato:down
DROP TABLE usuarios;`,
};

export const principios: SectionCopy & { rows: MetaRowItem[] } = {
  id: 'principios',
  migration: '0002_principios',
  title: 'Principios',
  lead: 'Seis decisiones de diseño que hacen que cada ejecución se comporte igual que la anterior.',
  rows: [
    {
      key: '01',
      title: 'SQL tal como lo escribes',
      text: 'Usas el SQL del motor que tienes. Estrato no lo traduce ni lo genera.',
      detail: 'sql',
    },
    {
      key: '02',
      title: 'Cada cambio trae su vuelta atrás',
      text: 'Toda migración tiene una sección `down`; si está vacía, `estrato down` se detiene y te lo dice.',
      detail: 'reversible',
    },
    {
      key: '03',
      title: 'Un proceso a la vez',
      text: 'Un bloqueo en la propia base de datos evita que dos despliegues apliquen migraciones al mismo tiempo.',
      detail: 'bloqueo',
    },
    {
      key: '04',
      title: 'Sumas de verificación',
      text: 'Si alguien edita una migración ya aplicada, `estrato status` lo señala antes de continuar.',
      detail: 'sha256',
    },
    {
      key: '05',
      title: 'Sin servicio en segundo plano',
      text: 'Es un binario: se ejecuta, hace su trabajo y termina.',
      detail: 'binario',
    },
    {
      key: '06',
      title: 'Hecho para integración continua',
      text: 'Códigos de salida documentados y una salida legible por máquinas con `--json`.',
      detail: '--json',
    },
  ],
};

export const docs: SectionCopy & {
  rows: MetaRowItem[];
  note: string;
  open: string;
} = {
  id: 'docs',
  migration: '0003_documentacion',
  title: 'Documentación',
  lead: 'La documentación vive junto al código, en la carpeta `docs/` del repositorio. Estos son sus temas.',
  note: 'Los archivos se leen en el repositorio del proyecto.',
  open: 'Abrir docs/',
  rows: [
    {
      key: '1',
      title: 'Primeros pasos',
      text: 'De la instalación a la primera migración aplicada.',
      detail: 'docs/primeros-pasos.md',
    },
    {
      key: '2',
      title: 'Configuración',
      text: 'Cada clave de `estrato.toml` y sus variables de entorno.',
      detail: 'docs/configuracion.md',
    },
    {
      key: '3',
      title: 'Escribir migraciones',
      text: 'Nombres, secciones `up` y `down`, y transacciones.',
      detail: 'docs/migraciones.md',
    },
    {
      key: '4',
      title: 'Integración continua',
      text: 'Ejemplos de uso en un flujo de despliegue.',
      detail: 'docs/ci.md',
    },
    {
      key: '5',
      title: 'Motores compatibles',
      text: 'PostgreSQL, MySQL y SQLite, con las diferencias de cada uno.',
      detail: 'docs/motores.md',
    },
  ],
};

export const comunidad: SectionCopy & {
  rows: MetaRowItem[];
  diagramLabel: string;
} = {
  id: 'comunidad',
  migration: '0004_comunidad',
  title: 'Comunidad',
  lead: 'Estrato se hace en abierto. Cualquiera puede leer el código, proponer un cambio o preguntar.',
  diagramLabel:
    'Grupos de puntos que se reúnen: personas que contribuyen al proyecto',
  rows: [
    {
      key: 'a',
      title: 'Contribuir',
      text: 'Abre una incidencia antes de un cambio grande; los arreglos pequeños pueden ir directos en una pull request.',
      detail: 'CONTRIBUTING.md',
    },
    {
      key: 'b',
      title: 'Debates',
      text: 'Preguntas, ideas y casos de uso, en el foro de debates del repositorio.',
      detail: 'discussions',
    },
    {
      key: 'c',
      title: 'Código de conducta',
      text: 'Las normas de trato que aplican en incidencias, revisiones y debates.',
      detail: 'CODE_OF_CONDUCT.md',
    },
    {
      key: 'd',
      title: 'Licencia MIT',
      text: 'Puedes usarlo, modificarlo y distribuirlo, también en proyectos comerciales.',
      detail: 'LICENSE',
    },
  ],
};

export const cierre = {
  id: 'cierre',
  migration: '0005_tu_esquema',
  status: 'pendiente',
  title: 'La siguiente migración es la tuya.',
  text: 'Instala estrato, crea tu primer archivo y aplícalo en tu entorno de desarrollo.',
  fieldLabel:
    'Campo de puntos en grupos y arcos, como capas de sedimento vistas desde arriba',
} as const;

export const footer = {
  summary: 'Migraciones de bases de datos desde la terminal.',
  columns: [
    {
      title: 'Página',
      links: [
        { label: 'Versiones', href: '#indice' },
        { label: 'Instalación', href: '#instalar' },
        { label: 'Cómo funciona', href: '#como' },
        { label: 'Principios', href: '#principios' },
      ],
    },
    {
      title: 'Proyecto',
      links: [
        { label: 'Documentación', href: '#docs' },
        { label: 'Comunidad', href: '#comunidad' },
        { label: 'Licencia MIT', href: '#comunidad' },
      ],
    },
  ],
  demoNotice:
    'Proyecto de demostración: versiones, fechas y enlaces son de muestra.',
  creditsLabel: 'Créditos',
} as const;

export const notFound = {
  migration: '404_no_encontrada',
  title: 'Esta migración no existe.',
  text: 'La dirección no coincide con ninguna página de este sitio. Puede que el enlace esté mal escrito o sea antiguo.',
  home: { label: 'Volver al inicio', href: '/' },
  install: { label: 'Ir a la instalación', href: '/#instalar' },
} as const;

export const seo = {
  title: 'Estrato: migraciones de bases de datos desde la terminal',
  description:
    'Estrato es una herramienta de código abierto para migraciones de bases de datos: aplica archivos SQL en orden en PostgreSQL, MySQL y SQLite.',
  notFoundTitle: 'Página no encontrada · Estrato',
  notFoundDescription:
    'Esta dirección no existe en el sitio de Estrato, la herramienta de migraciones de bases de datos.',
} as const;
