// Copy and lists of the Gamma Room landing (English, single language). Every fact here is assumed for a demo
// (no brief): the studio, its city, its email, its process and its deliverables. See RUN.md "to confirm before launch".

export interface Link {
  label: string;
  href: string;
}

/** A display line with one optional italic serif phrase: `before` + `em` + `after`. */
export interface DisplayLine {
  before: string;
  em?: string;
  after?: string;
}

export interface Service {
  id: 'editing' | 'grading' | 'motion' | 'finishing';
  name: string;
  timecode: string;
  /** One line for the edit list in the hero panel. */
  summary: string;
}

export interface ServiceRowCopy {
  id: Service['id'];
  timecode: string;
  heading: string;
  lines: [string, string];
  chips: string[];
  /** Accessible name of the clip. */
  clipLabel: string;
}

export interface LastMilePoint {
  lead: string;
  text: string;
}

export interface LookTile {
  label: string;
  alt: string;
}

export interface Step {
  timecode: string;
  title: string;
  text: string;
}

export const brand = {
  name: 'Gamma Room',
  city: 'Lisbon',
  email: 'hello@gammaroom.example',
  /** The primary action: an email with a subject line (sample address). */
  bookHref: 'mailto:hello@gammaroom.example?subject=Project%20call',
  reelHref: '#work',
} as const;

export const actions = {
  book: 'Book a project call',
  reel: 'See the reel',
} as const;

export const nav: Link[] = [
  { label: 'Services', href: '#editing' },
  { label: 'Work', href: '#work' },
  { label: 'Process', href: '#process' },
];

export const seo = {
  title: 'Gamma Room: video post-production studio for brands',
  description:
    'Gamma Room is a video post-production studio for brands, musicians and creators: editing, colour grading, motion graphics and finishing.',
} as const;

export const hero = {
  timecode: '00:00:00:00',
  headline: [
    { before: 'Raw footage in.' },
    { before: '', em: 'A finished film', after: ' out.' },
  ] satisfies DisplayLine[],
  lead: 'Gamma Room is a video post-production studio in Lisbon for brands, musicians and creators. Send us what you shot. We cut it, grade it and deliver it ready for every screen.',
  clipLabel:
    'Time-lapse of a mountain ridge as the sky turns from day to night',
} as const;

export const services: Service[] = [
  {
    id: 'editing',
    name: 'Editing',
    timecode: '00:00:24:00',
    summary: 'Story, pace and versions',
  },
  {
    id: 'grading',
    name: 'Colour grading',
    timecode: '00:00:48:00',
    summary: 'One look across every camera',
  },
  {
    id: 'motion',
    name: 'Motion',
    timecode: '00:01:06:00',
    summary: 'Titles and moving graphics',
  },
  {
    id: 'finishing',
    name: 'Finishing',
    timecode: '00:01:18:00',
    summary: 'Sound handover, masters, files',
  },
];

export const editList = {
  heading: 'In this cut',
} as const;

export const lastMile = {
  timecode: '00:00:12:00',
  heading: 'Most footage stalls in the last mile.',
  lead: 'The shoot is done and the drive is full, but the film is not there yet. It usually gets stuck in one of three places.',
  points: [
    {
      lead: 'Pacing.',
      text: 'Good shots in the wrong order, or held a beat too long, and the story loses the room.',
    },
    {
      lead: 'Colour.',
      text: 'Two cameras and three lighting setups, and every cut jumps because nothing matches.',
    },
    {
      lead: 'Delivery.',
      text: 'One edit has to become a wide master, a vertical cut and a short teaser, each with its own specs.',
    },
  ] satisfies LastMilePoint[],
} as const;

export const editing: ServiceRowCopy = {
  id: 'editing',
  timecode: '00:00:24:00',
  heading: 'Editing: the story first, then the rhythm.',
  lines: [
    'We find the story in your rushes, cut it to its natural pace and lock the picture with you.',
    'Then we build the versions each platform needs from that same locked cut.',
  ],
  chips: ['Rough cut', 'Picture lock', 'Platform versions', 'Review links'],
  clipLabel: 'City lights out of focus, drifting past at night',
};

export const grading = {
  id: 'grading',
  timecode: '00:00:48:00',
  heading: 'Colour grading: one look across every shot.',
  lead: 'We match shots from different cameras, then build the look the film needs. Move the split to wipe between flat log footage and a grade.',
  chips: ['Look development', 'Shot matching', 'HDR and SDR masters'],
  clipLabel: 'Aerial view of sea cliffs and a rock stack at sunrise',
  logLabel: 'Log',
  gradedLabel: 'Graded',
  rangeLabel: 'Move the grade split',
  caption:
    'Illustration: the Log side is a filter laid over a stock clip, not a camera original.',
} as const;

export const motion: ServiceRowCopy = {
  id: 'motion',
  timecode: '00:01:06:00',
  heading: 'Motion: words and graphics that move with the cut.',
  lines: [
    'Titles, lower thirds and simple animated graphics, built to sit inside the look of your film.',
    'Type and timing are set to the edit, never pasted on top of it.',
  ],
  chips: ['Title sequences', 'Lower thirds', 'Animated graphics'],
  clipLabel: 'Abstract coloured lines and shapes in motion',
};

export const finishing: ServiceRowCopy = {
  id: 'finishing',
  timecode: '00:01:18:00',
  heading: 'Finishing: one master, then every file.',
  lines: [
    'We conform the cut, prepare the sound handover and check each frame before export.',
    'You get the master and the delivery versions, named and sorted in one folder.',
  ],
  chips: [
    'Conform',
    'Sound handover',
    'Captions',
    'Mastering',
    'Delivery files',
  ],
  clipLabel: 'Slow ripples on dark water',
};

export const looks = {
  timecode: '00:01:24:00',
  heading: { before: 'Recent ', em: 'looks' } satisfies DisplayLine,
  note: 'Sample looks, stock footage. Shown until the studio reel takes their place.',
  clip: {
    label: 'Sunset over open sea',
    alt: 'Aerial clip of the sun setting over open sea behind a line of islands',
  },
  stills: {
    forest: {
      label: 'Low sun, forest',
      alt: 'Sunlight cutting through fog between tall trees',
    },
    dunes: {
      label: 'Hard sun, dunes',
      alt: 'Sharp ridges of red sand dunes under a clear sky',
    },
    stairs: {
      label: 'Cool concrete',
      alt: 'A curved concrete staircase with a steel handrail in raking light',
    },
    neon: {
      label: 'Night bokeh',
      alt: 'Out-of-focus red, pink and blue lights on a dark ground',
    },
  } satisfies Record<string, LookTile>,
} as const;

export const process = {
  timecode: '00:01:30:00',
  heading: 'How a project runs',
  lead: 'Four steps, the same for a single cut or a series.',
  steps: [
    {
      timecode: '00:01:30:00',
      title: 'Call',
      text: 'A short call about the film, the footage you have and where it will be shown.',
    },
    {
      timecode: '00:01:36:00',
      title: 'Plan and schedule',
      text: 'A written plan with the steps, the review rounds and a delivery date.',
    },
    {
      timecode: '00:01:42:00',
      title: 'Cut and review',
      text: 'You watch each cut online and leave notes on the timecode. We revise until picture lock.',
    },
    {
      timecode: '00:01:48:00',
      title: 'Deliver',
      text: 'Grade, finishing and export. The master and its versions arrive in one folder.',
    },
  ] satisfies Step[],
} as const;

export const finalFrame = {
  timecode: '00:02:00:00',
  heading: {
    before: 'Have footage waiting? ',
    em: "Let's finish it.",
  } satisfies DisplayLine,
  lead: 'Tell us what you shot and where it will play. We reply with a time for the call.',
  emailNote: '(sample address)',
} as const;

export const footer = {
  studio:
    'Video post-production for brands, musicians and creators. Based in Lisbon, working with clients remotely.',
  contactHeading: 'Contact (sample)',
  sampleNote: 'Sample contact data for this demo. Replace before launch.',
  sectionsHeading: 'Sections',
  creditsHeading: 'Footage and photo credits',
  sections: [
    { label: 'Editing', href: '#editing' },
    { label: 'Colour grading', href: '#grading' },
    { label: 'Motion', href: '#motion' },
    { label: 'Finishing', href: '#finishing' },
    { label: 'Work', href: '#work' },
    { label: 'Process', href: '#process' },
  ] satisfies Link[],
} as const;

export const notFound = {
  title: 'Page not found | Gamma Room',
  description: 'This page is not part of the Gamma Room site.',
  timecode: '--:--:--:--',
  heading: {
    before: 'This frame is ',
    em: 'not on the timeline.',
  } satisfies DisplayLine,
  body: 'The link may be old or mistyped.',
  home: 'Back to the home page',
} as const;
