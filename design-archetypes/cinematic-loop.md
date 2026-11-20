---
name: cinematic-loop
summary: 'Moving footage carries the page: a full-bleed muted looping clip behind a centred statement and a strong scrim, a framed second clip, one short clip per feature row and a clip gallery, on alternating dark and light bands.'
signals:
  fits: [bold, product-showcase, storytelling, photo-rich]
  avoid: [few-assets, serious, local-service]
impact: [balanced, bold]
lends: [video-scrim-hero, clip-feature-rows]
rejects: [marquee-type, mono-meta-rows, visible-grid]
hero: [video]
signature:
  sectionCount: [5, 10]
  cols1Share: [0.4, 1]
  cols2Share: [0.1, 0.6]
  fullBleedShare: [0.4, 1]
  imageRadius: [0, 32]
  buttonShape: [pill, rect]
  headingScale: [3, 12]
  headingAlign: [center, left]
  eyebrowShare: [0, 0.6]
  wordsPerScreen: [15, 110]
  mediaPerScreen: [0.8, 4]
  footerType: [columns, minimal]
  overlapShare: [0, 0.3]
  stickyCount: [0, 2]
---

# cinematic-loop

Moving footage carries the page: a full-bleed muted looping clip behind a centred statement and a strong scrim, a framed second clip overlapping the next band, one short clip per feature row and a clip gallery that loads in view, on alternating dark and light bands. A starting grammar, not a template: bend it when the requirement or a reference asks for it, and write the deviation in RUN.md "Design decisions".

## Layout grammar

The page is a stack of full-width bands that alternate between a dark and a light ground, and almost every band holds footage. The first band is the stage: a looping clip fills the whole first screen under a strong darkening scrim, with a short centred statement and one action on top. A framed second clip, in a rounded panel, starts inside the first screen and overlaps the top of the next band, so the visitor sees atmosphere behind and the product's own output in front. Then come feature rows: a centred title and lead, and below it alternating rows with one short clip in a rounded frame on one side and a heading, two short lines and one action on the other. A dark gallery band follows, a masonry of small clips that start only as they come into view, with a few filter chips when the brief has categories. Closing bands are plain: a statement with its action, then a footer. Text bands stay short and the reading column plain; the footage supplies the mood.

## Header and footer

Header: transparent over the first clip, with the mark on the left, three or four plain navigation items and one bright pill action on the right; it turns solid after the first screen so the links stay readable. Footer: a dark band with link columns, legal links and the credits for every clip.

## Typography

One sans family for everything, with one contrast device allowed: a single italic serif phrase inside some display headlines. Display sizes are large on the stage and drop on phones; the steps below are close together. Regular weight for reading, medium for headings and buttons. Sentence case; uppercase only for tiny labels. Light type on dark bands and dark type on light bands, each meeting 4.5:1.

## Imagery

Footage is the material. Every clip is short, silent, loops without a visible jump and has a poster frame chosen to carry the same message on its own. Clips sit in rounded frames, except the stage, which is full-bleed. Where text sits on a clip a scrim darkens it until the text meets 4.5:1 over the brightest frame, not only the poster. The interface itself stays neutral so the footage provides the colour. Clips come from the customer, the owner or a licensed stock source and are credited; never a clip that shows a recognisable brand, a real customer or a person presented as the team.

## Buttons and links

One bright pill for the main action of the page, used on the stage and again at the end. Secondary actions are dark pills on light bands and outlined pills on dark ones. Every clip has a visible pause control. Hover and focus change colour or outline, never size.

## Motion

Clips play only while at least a quarter of them is in view and stop when they leave it; at most one clip plays in a viewport at a time, so the first clip yields to the gallery clips as the visitor scrolls. Nothing else moves on load beyond the video itself; text bands fade in once. Every clip has a poster and a reduced-motion form: with `prefers-reduced-motion`, with no JavaScript or when the file cannot load, the poster stays and the text reads in full. No sound, ever, and no countdown or urgency strip.

## Lendable traits

- `video-scrim-hero`: A full-bleed muted looping clip fills the first screen behind a centred statement, darkened by a strong scrim, with a poster that is the page's first image.
- `clip-feature-rows`: Alternating feature rows, each pairing one short looping clip in a rounded frame with a heading, two short lines and one action.

## Do

- Give every clip a poster, a reduced-motion form and a place in the credits.
- Keep at most one clip playing per viewport and pause the rest.
- Check the text contrast over the brightest frame of the clip, not only the poster.
- Keep each clip short and light: a few seconds that loop, a file that fits the video budget.
- Write the statement and the feature text from the brief; the clips illustrate them.

## Don't

- No sound, no autoplay with audio and no clip that starts before it is in view.
- No countdown, urgency strip or pulsing call to action over the footage.
- No clip that carries meaning the text does not also state.
- No more than a handful of clips on one page and no clip longer than the budget allows.
- No clip of a real person presented as the owner, a customer or the team unless the customer supplied it.
- No heavy colour overlays or gradients except the scrim that protects the text.
