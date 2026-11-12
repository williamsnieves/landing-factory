import type { PageCopy } from './types';

export const en: PageCopy = {
  meta: {
    title: 'Willians Nieves | Senior front end and AI engineer, Madrid',
    description:
      'Willians Nieves is a senior software engineer in Madrid: front end with React and TypeScript, and AI-driven engineering with agents, harnesses and specs. His path, his skills and what he does off the clock.',
  },
  ticker: [
    'Madrid, Spain',
    'Senior Software Engineer',
    '8+ years building interfaces',
    'React, Node.js, TypeScript',
    'Agents, harnesses and specs',
    'Father, guitar player, game maker',
    'Teaching machines to behave',
  ],
  hero: {
    role: 'Senior Software Engineer, Madrid',
    lead: 'I build front ends people enjoy using, and lately I build the harnesses that keep AI agents honest. Half human, half machine, one stack.',
    findMe: 'Find me on',
    portraitAlt: 'AI-generated portrait of Willians Nieves',
    humanLabel: 'human',
    machineLabel: 'machine',
    chips: ['React', 'TypeScript', 'Claude Code', 'LangGraph'],
  },
  about: {
    label: '01 About',
    heading: 'Two halves, one developer.',
    statement: {
      before:
        'I am a front end developer who got curious about what happens when the machine does half the typing. ',
      accent: 'Turns out someone still has to think.',
      after: '',
    },
    paragraphs: [
      'I have spent 8+ years building interfaces with React, Node.js and TypeScript, and I still enjoy the whole JavaScript ecosystem: new tech, patterns and best practices, as long as the person on the other side of the screen ends up with something good to use.',
      'These days a lot of my work is AI-driven: automation, testing harnesses, observability agents and the specs that keep them all pointed the same way. I also lead teams, design solutions and build tools that help engineers write better code, faster.',
      'Off the clock I am a father, a passionate guitar player, and someone who plays video games and makes them too.',
    ],
    facts: [
      { key: 'Based in', value: 'Madrid, Spain' },
      { key: 'Role', value: 'Senior Software Engineer' },
      { key: 'Experience', value: '8+ years' },
      { key: 'Off the clock', value: 'Guitar, games, family' },
    ],
  },
  ai: {
    label: '02 AI',
    heading: 'AI engineering',
    intro:
      'Where I spend most of my time now: telling agents what to do, clearly, and checking that they did it.',
    stepLabel: 'Step',
    steps: [
      {
        title: 'Shape the context',
        body: 'An agent is only as good as what it can see. I design the context, the harness and the loop around it, and map how the pieces connect.',
        chips: [
          'Context engineering',
          'Harness engineering',
          'Loop engineering',
          'Graph engineering',
        ],
      },
      {
        title: 'Write the spec first',
        body: 'Spec-driven development with OpenSpec: decide what to build before anything starts building. I have given tech talks on it at Glintt.',
        chips: [
          'SDD with OpenSpec',
          'Claude Code',
          'Codex',
          'JEV, a System 1 decision model',
        ],
      },
      {
        title: 'Let the agents work',
        body: 'At Glintt I built an AI testing harness, a Java BFF subagent and a LangChain and Grafana observability agent. Several agents, one orchestra.',
        chips: [
          'Multi-agent orchestration',
          'LangChain',
          'LangGraph',
          'LangSmith',
          'Vector databases',
        ],
      },
    ],
    portraitAlt: 'AI-generated portrait of Willians Nieves, machine half',
    portraitCaption: 'The machine half',
  },
  path: {
    label: '03 Path',
    heading: 'The path so far',
    intro: 'Nine stops, mostly in front of a browser.',
    present: 'present',
    stackLabel: 'Stack',
    earlierLabel: 'Earlier',
  },
  skills: {
    label: '04 Skills',
    heading: 'The toolbox',
    intro:
      'No progress bars. I would rather show you the list than grade myself.',
  },
  beyond: {
    label: '05 Beyond code',
    heading: 'Beyond the code',
    intro: 'The human half.',
    cards: [
      {
        title: 'Dad',
        body: 'The most demanding stakeholders live at home, and their roadmap changes every day.',
      },
      {
        title: 'Guitar',
        body: 'A passionate player. It is the one place where I am happy to have no autocomplete.',
      },
      {
        title: 'Games',
        body: 'I play video games and I make them. Debugging is more fun when the bug has a boss fight.',
      },
    ],
    stringsLabel: 'Strum the guitar strings',
    stringsHint: 'Hover or focus the strings',
  },
  edu: {
    label: '06 Education',
    heading: 'Education and languages',
    educationTitle: 'Education',
    degree: 'Informatic engineering',
    school: 'Alejandro de Humboldt University, Caracas, Venezuela',
    years: '2008 to 2011',
    languagesTitle: 'Languages',
    languages: [
      { name: 'Spanish', level: 'Native' },
      { name: 'English', level: 'B2, improving towards C1' },
    ],
  },
  footer: {
    tagline: 'Front end and AI engineering, from Madrid.',
  },
};
