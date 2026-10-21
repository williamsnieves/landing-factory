/**
 * Museum object pages behind the photos. Titles and dates are the museum's
 * records (The Metropolitan Museum of Art, Open Access, public domain).
 * Keep in sync with assets.json.
 */
export interface Source {
  title: string;
  date: string;
  url: string;
}

const met = (id: number) =>
  `https://www.metmuseum.org/art/collection/search/${id}`;

export const sources: Source[] = [
  {
    title: 'The Battle of Yashima, from The Tale of the Heike',
    date: 'siglo XVII',
    url: met(45182),
  },
  { title: 'Armor (Dō-maru)', date: 'hacia 1550', url: met(22505) },
  {
    title: 'Armor (Rokumai-Dō Gusoku) with Box',
    date: 'finales del siglo XVII',
    url: met(894743),
  },
  {
    title: 'Helmet (Kabuto)',
    date: 'principios del siglo XVII',
    url: met(22097),
  },
  {
    title: 'Face Mask (So-Menpō) with Gorget',
    date: 'siglos XVII-XVIII',
    url: met(22459),
  },
  {
    title: 'Blade and Mounting for a Slung Sword (Tachi)',
    date: 'hoja del siglo XVI; montura de mediados del siglo XIX',
    url: met(22123),
  },
  {
    title: 'Blade and Mounting for a Sword (Katana)',
    date: 'hoja del siglo XVI; montura de mediados a finales del siglo XIX',
    url: met(22101),
  },
  {
    title: 'Blade and Mounting for a Short Sword (Wakizashi)',
    date: 'hoja del siglo XVI; montura del siglo XIX',
    url: met(21880),
  },
  {
    title: 'Sword Guard (Tsuba)',
    date: 'finales del siglo XVII',
    url: met(30056),
  },
  {
    title: 'Black Raku Tea Bowl',
    date: 'principios del siglo XVII',
    url: met(62898),
  },
  {
    title: '“Bluish-Green Fish Scales”',
    date: 'mediados del siglo XVII',
    url: met(78063),
  },
  { title: 'Samurai, Yokohama', date: '1864-65', url: met(285902) },
  { title: 'Actor in Samurai Armor', date: 'década de 1870', url: met(283170) },
  {
    title: '[Japanese Infantry, Yokohama, Japan]',
    date: '1869',
    url: met(764802),
  },
];
