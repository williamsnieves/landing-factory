/** Placeholder business data. Fictional sample data: replace before launch. */
export const site = {
  name: 'Dental Azahar',
  street: 'Carrer de Mostra, 12 (dirección de ejemplo)',
  area: '46001 València',
  phone: '+34 960 00 00 00',
  phoneHref: 'tel:+34960000000',
  email: 'hola@dentalazahar.example',
  mapUrl:
    'https://www.openstreetmap.org/search?query=Carrer%20de%20Mostra%2012%2C%2046001%20Val%C3%A8ncia',
} as const;

/** Sample opening hours. Replace before launch. */
export const hours: { day: string; time: string }[] = [
  { day: 'Lunes a jueves', time: '9:00 a 14:00 y de 16:00 a 20:00' },
  { day: 'Viernes', time: '9:00 a 14:00' },
  { day: 'Sábado y domingo', time: 'Cerrado' },
];

export const appointmentHref = `mailto:${site.email}?subject=${encodeURIComponent(
  'Quiero pedir cita',
)}&body=${encodeURIComponent(
  'Hola, me gustaría pedir cita.\n\n- Motivo (si quieres contarlo):\n- Días y horas que mejor me vienen:\n- Nombre y teléfono:\n',
)}`;
