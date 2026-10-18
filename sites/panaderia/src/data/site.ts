/** Placeholder business data. Fictional: replace before launch. */
export const site = {
  name: 'Horno Lento',
  street: 'Carrer de Torrijos, 48',
  area: '08012 Barcelona (Gràcia)',
  phone: '+34 930 00 00 00',
  phoneHref: 'tel:+34930000000',
  email: 'hola@hornolento.example',
  instagram: '@hornolento',
  mapUrl:
    'https://www.openstreetmap.org/search?query=Carrer%20de%20Torrijos%2048%2C%2008012%20Barcelona',
} as const;

export const orderHref = `mailto:${site.email}?subject=${encodeURIComponent(
  'Encargo para recoger',
)}&body=${encodeURIComponent(
  'Hola, me gustaría encargar para recoger:\n\n- Producto y cantidad:\n- Día y hora aproximada de recogida:\n- Nombre:\n',
)}`;
