# Proposal: samurai

Status: **proposed**. Automatic run (`--auto`): the choices marked "Assumed" were not confirmed by a person.

## Brief

- **Niche:** educational landing about the samurai of Japan: who they were and how the class arose, dress and armor, swords, way of life, and the end of the class in the Meiji era.
- **Brand (fictional or real):** "Atlas Bushi", a fictional illustrated reading guide in chapters. Not a real museum, school or publisher.
- **Goal of the page:** the visitor learns and explores the chapters. Primary action: "Explorar los capítulos" (jumps to the chapter index and chapter I); secondary: "Fuentes" (museum records behind the photos).
- **Audience:** curious adults and students who like history, Japanese culture and martial arts, no prior knowledge.
- **Tone:** sober, calm, careful and a little cinematic; plain explanations, no hype. Copy in Spanish, original.
- **Language:** Spanish (`es`).
- **Site location:** `sites/samurai/`, its own Cloudflare Pages project.

## References used

| Sheet                                    | What we take                                                                                                                                                                                                                      | What we leave                                                                                 |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `patterns/crazy-studio.md`               | Chapter cards (small numbered eyebrow, one short statement, thin rule, caption); one idea per screen; heavily tracked small uppercase labels on a dark ground; text kept in real DOM over a scene; content readable without WebGL | The interior scene, the silhouette gag, the consent-style entry gate, the corner-bracket look |
| `patterns/experience2026-funtech-inc.md` | One typographic voice with one accent in two intensities; large empty space around a compact text block; honest capability status (a visible note when the poster is shown instead of the 3D)                                     | The terminal and boot-log metaphor, green on black, the start-gated preloader                 |

**Direction in one line:** a dark, quiet reading experience in numbered chapters, with a katana and drifting ink that move with the scroll, and archival museum objects as the proof.

## Page map

| #   | Section             | Height              | Purpose                                    | Layout idea                                                                                                                                                                                                 |
| --- | ------------------- | ------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Header              | thin                | Navigation and the main action             | Wordmark left, chapter anchor links (I to V), solid on scroll; "Explorar los capítulos" button                                                                                                              |
| 2   | Hero                | 1 viewport          | First impression and promise               | Typographic: huge "Samuráis" word and a short statement left; the ink-particle scene fills the back (poster first); small "Capítulo 0 · Introducción" eyebrow; a visible note when only the poster is shown |
| 3   | Chapter index       | ~0.8 viewport       | Let the visitor explore                    | Five numbered chapter cards (I to V) with a one-line promise and an anchor each; first conversion block                                                                                                     |
| 4   | I · Orígenes        | ~1 viewport         | Who they were and how the class arose      | Chapter card heading; a timeline of short entries (Heian provincial warriors, Kamakura shogunate, Sengoku, Tokugawa peace) with a museum photo                                                              |
| 5   | II · Armadura       | ~1.2 viewports      | Dress and armor                            | Photo of a museum armor; four annotated parts (ō-yoroi, dō, kabuto, mempō), each with a plain description and a photo where the museum has one                                                              |
| 6   | III · Espadas       | ~2 viewports scroll | Tachi, katana, wakizashi; forging and care | The one pinned section (from `md` up): the katana scene turns with the scroll while three text steps advance (types, forging, care); below, a comparison table and museum photos                            |
| 7   | IV · Vida y bushidō | ~1.2 viewports      | Bushidō in context, daily life, arts       | Two columns: bushidō explained as a later, evolving idea; daily life and arts (calligraphy, tea, noh) as short cards with photos                                                                            |
| 8   | V · Fin de la clase | ~0.9 viewport       | Meiji: abolition of the class              | Dark statement block and a short dated list (1868, 1871, 1873, 1876, 1877); a museum photo of the era                                                                                                       |
| 9   | Mitos y realidad    | ~0.8 viewport       | Label myths as myths                       | Table "Se dice / Qué sabemos" with 5 rows; second conversion block "Volver a los capítulos"                                                                                                                 |
| 10  | Fuentes y cierre    | ~0.8 viewport       | Sources and closing call                   | Source list of museum object pages, closing "Explorar los capítulos" button, footer with credits and the wordmark set large                                                                                 |

## Motion plan

| Moment                     | Trigger | Type                              | Notes                                                                            |
| -------------------------- | ------- | --------------------------------- | -------------------------------------------------------------------------------- |
| Hero statement             | load    | reveal (fade and rise, staggered) | Existing `data-reveal`                                                           |
| Ink particles (scene 1)    | load    | 3D looping clock                  | Drifting ink, slow; poster first                                                 |
| Chapter headings and cards | scroll  | reveal                            | Existing `data-reveal`                                                           |
| Katana (scene 2)           | scroll  | pin + scrub                       | The one pinned section (`data-pin`, `md` up); scene scrubbed by section progress |
| Armor photo strip          | scroll  | parallax (subtle)                 | `data-parallax`                                                                  |
| Whole page                 | scroll  | smooth scroll                     | Lenis, off under reduced motion                                                  |

The one playful moment is the katana turning with the scroll. Reduced motion: no pin, no scrub, no parallax, no smooth scroll, no canvas (posters only); all content visible in its final state. Without JavaScript the page reads top to bottom with every section visible and the posters shown.

## Visual direction

- **Type:** a refined serif with print-like character for display (hero word and chapter numerals), a neutral readable sans for body. Final pairing by ui-ux-pro-max.
- **Palette:** near-black lacquer ground, warm paper-white text, one vermilion red accent (shu) for actions and numerals in two intensities. Final values by ui-ux-pro-max.
- **Hero type:** `typographic`.
- **Imagery:** public-domain museum objects from The Met Open Access (armor, swords, sword fittings, prints) and CC0 / public domain / CC BY / CC BY-SA files from Commons. Every file recorded in `assets.json` and credited in the footer. No images from the references.
- **Diversity:** existing sites are panaderia (brown, Fraunces, full-bleed-photo) and clinica-dental (teal, Figtree, split). This site: vermilion red, a different serif, typographic hero. All three differ.

## 3D

Two scenes, both built from code (no models, textures or HDRIs).

| Scene   | Purpose                                                                                                                      | Poster                                                   | Scroll behavior                                                      | Reduced-motion fallback                    |
| ------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------ |
| `ink`   | Hero atmosphere: slow drifting ink particles that set the tone                                                               | Rendered from the scene with `scripts/render-poster.mjs` | Looping clock (no `scrub`); `priority` poster is the LCP             | The poster: no canvas, no 3D download      |
| `blade` | Chapter III: a katana (curved blade, habaki, tsuba, tsuka) that turns as the reader advances through types, forging and care | Rendered from the scene with `scripts/render-poster.mjs` | `scrub`: rotation and a slow camera move follow the section progress | The poster; text steps stacked and visible |

The sword is an abstract, simplified model: the caption says it is a schematic and that real objects are the museum photos next to it.

## Quality targets

Lighthouse >= 90 (performance, accessibility, SEO), no overflow at 375/768/1440, reduced motion respected, content visible without JS, no major impeccable findings. 3D JavaScript <= 200 KB gzip.

## Out of scope

Online shop, cart, payments, backend forms, CMS, multiple languages, audio.

## Decisions

1. Assumed: brand "Atlas Bushi", a fictional reading guide (confirm at the checkpoint). There is no real contact data; the footer says so.
2. Assumed: five chapters plus a myths section, in Spanish with Japanese terms in italics, macrons (ō-yoroi, bushidō) and a short gloss at first use.
3. Historical rigor: no invented quotes and no attributed sayings; no dates or facts the sources do not support. Dates used are the well-established ones (Kamakura shogunate 1185 to 1333, Tokugawa shogunate 1603 to 1868, Meiji Restoration 1868, abolition of the domains 1871, conscription law 1873, sword-wearing ban 1876, Satsuma Rebellion 1877). Anything said about an object is limited to its museum record. Myths are labeled as myths in their own section.
4. Bushidō is presented as an idea that was written down and reshaped mostly in the Edo period and popularized in the Meiji era, not as a single ancient code.
5. Images: The Met Open Access (public domain) first, Commons second. Sources (museum object pages) are listed in the page and in `CREDITS.md`.
6. The page uses stock photos and sample data to replace before launch (no client; no real contact data).
7. The 3D katana is a schematic drawn in code, labeled as such.
