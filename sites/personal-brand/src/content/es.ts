import type { PageCopy } from './types';

export const es: PageCopy = {
  meta: {
    title: 'Willians Nieves | Ingeniero front end sénior y de IA, Madrid',
    description:
      'Willians Nieves es ingeniero de software sénior en Madrid: front end con React y TypeScript e ingeniería con IA con agentes, harnesses y specs. Su trayectoria, sus skills y lo que hace fuera del trabajo.',
  },
  ticker: [
    'Madrid, España',
    'Ingeniero de software sénior',
    '8+ años creando interfaces',
    'React, Node.js, TypeScript',
    'Agentes, harnesses y specs',
    'Padre, guitarrista y creador de videojuegos',
    'Enseñando a las máquinas a portarse bien',
  ],
  hero: {
    role: 'Ingeniero de software sénior, Madrid',
    lead: 'Hago front ends que da gusto usar y, últimamente, los harnesses que mantienen a raya a los agentes de IA. Mitad humano, mitad máquina, un solo stack.',
    findMe: 'Búscame en',
    portraitAlt: 'Retrato de Willians Nieves generado con IA',
    humanLabel: 'humano',
    machineLabel: 'máquina',
    chips: ['React', 'TypeScript', 'Claude Code', 'LangGraph'],
  },
  about: {
    label: '01 Sobre mí',
    heading: 'Dos mitades, un desarrollador.',
    statement: {
      before:
        'Soy desarrollador front end y un día me dio curiosidad qué pasa cuando la máquina escribe la mitad del código. ',
      accent: 'Resulta que alguien tiene que seguir pensando.',
      after: '',
    },
    paragraphs: [
      'Llevo más de 8 años creando interfaces con React, Node.js y TypeScript, y sigo disfrutando de todo el ecosistema JavaScript: tecnologías nuevas, patrones y buenas prácticas, siempre que al otro lado de la pantalla alguien se lleve algo bueno que usar.',
      'Hoy buena parte de mi trabajo gira en torno a la IA: automatización, harnesses de testing, agentes de observabilidad y las specs que los mantienen a todos remando en la misma dirección. También lidero equipos, diseño soluciones y construyo herramientas para que otros ingenieros escriban mejor código, más rápido.',
      'Fuera del trabajo soy padre, guitarrista apasionado y de los que juegan videojuegos y también los hacen.',
    ],
    facts: [
      { key: 'Vivo en', value: 'Madrid, España' },
      { key: 'Puesto', value: 'Ingeniero de software sénior' },
      { key: 'Experiencia', value: '8+ años' },
      { key: 'Fuera del trabajo', value: 'Guitarra, juegos, familia' },
    ],
  },
  ai: {
    label: '02 IA',
    heading: 'Ingeniería con IA',
    intro:
      'Donde paso casi todo el tiempo ahora: decirle a los agentes qué hacer, con claridad, y comprobar que lo hicieron.',
    stepLabel: 'Paso',
    steps: [
      {
        title: 'Dar forma al contexto',
        body: 'Un agente rinde tanto como lo que puede ver. Diseño el contexto, el harness y el bucle que lo rodea, y dibujo cómo encajan las piezas.',
        chips: [
          'Context engineering',
          'Harness engineering',
          'Loop engineering',
          'Graph engineering',
        ],
      },
      {
        title: 'La spec primero',
        body: 'Desarrollo guiado por specs con OpenSpec: decidir qué construir antes de que nada empiece a construir. En Glintt he dado charlas técnicas sobre ello.',
        chips: [
          'SDD con OpenSpec',
          'Claude Code',
          'Codex',
          'JEV, un modelo de decisión de Sistema 1',
        ],
      },
      {
        title: 'Que trabajen los agentes',
        body: 'En Glintt construí un harness de testing con IA, un subagente BFF en Java y un agente de observabilidad con LangChain y Grafana. Varios agentes, una sola orquesta.',
        chips: [
          'Orquestación multiagente',
          'LangChain',
          'LangGraph',
          'LangSmith',
          'Bases de datos vectoriales',
        ],
      },
    ],
    portraitAlt: 'Retrato de Willians Nieves generado con IA, la mitad máquina',
    portraitCaption: 'La mitad máquina',
  },
  path: {
    label: '03 Trayectoria',
    heading: 'El camino hasta aquí',
    intro: 'Nueve paradas, casi todas delante de un navegador.',
    present: 'actualidad',
    stackLabel: 'Stack',
    earlierLabel: 'Antes',
  },
  skills: {
    label: '04 Skills',
    heading: 'La caja de herramientas',
    intro:
      'Sin barras de progreso: prefiero enseñarte la lista antes que ponerme nota.',
  },
  beyond: {
    label: '05 Más allá',
    heading: 'Más allá del código',
    intro: 'La mitad humana.',
    cards: [
      {
        title: 'Papá',
        body: 'Los stakeholders más exigentes viven en casa, y su roadmap cambia todos los días.',
      },
      {
        title: 'Guitarra',
        body: 'Guitarrista apasionado. Es el único sitio donde me hace ilusión no tener autocompletado.',
      },
      {
        title: 'Videojuegos',
        body: 'Juego videojuegos y también los hago. Depurar es más divertido cuando el bug trae jefe final.',
      },
    ],
    stringsLabel: 'Toca las cuerdas de la guitarra',
    stringsHint: 'Pasa el ratón o enfoca las cuerdas',
  },
  edu: {
    label: '06 Formación',
    heading: 'Formación e idiomas',
    educationTitle: 'Formación',
    degree: 'Ingeniería informática',
    school: 'Universidad Alejandro de Humboldt, Caracas, Venezuela',
    years: '2008 a 2011',
    languagesTitle: 'Idiomas',
    languages: [
      { name: 'Español', level: 'Nativo' },
      { name: 'Inglés', level: 'B2, rumbo al C1' },
    ],
  },
  footer: {
    tagline: 'Ingeniería front end y de IA, desde Madrid.',
  },
};
