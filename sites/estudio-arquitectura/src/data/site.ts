/**
 * Studio facts. Every value below is invented sample data (marked as such in
 * the footer) and must be replaced before launch.
 */
export const site = {
  name: 'Estudio Larrea Vidal Arquitectura',
  shortName: 'Larrea Vidal Arquitectura',
  city: 'Madrid',
  email: 'hola@example.com',
  phone: '+34 910 000 000',
  phoneHref: 'tel:+34910000000',
  addressLines: ['Calle de Ejemplo 12, 1.º B', '28000 Madrid'],
  hours: 'Lunes a viernes, de 9:30 a 18:00',
  ctaLabel: 'Pedir una primera conversación',
  subject: 'Primera conversación sobre un encargo',
  body: 'Hola, querríamos hablar de un encargo.\n\nInmueble (vivienda, local u oficina):\nBarrio o ciudad:\nQué querríamos cambiar:\nFecha en la que querríamos empezar:\n',
};

export const mailto = `mailto:${site.email}?subject=${encodeURIComponent(site.subject)}&body=${encodeURIComponent(site.body)}`;

export const chapters = [
  { n: 'I', label: 'Estudio', href: '#estudio' },
  { n: 'II', label: 'Proyectos', href: '#proyectos' },
  { n: 'III', label: 'Método', href: '#metodo' },
  { n: 'IV', label: 'Ámbitos', href: '#ambitos' },
  { n: 'V', label: 'Encargo', href: '#encargo' },
  { n: 'VI', label: 'Contacto', href: '#contacto' },
];
