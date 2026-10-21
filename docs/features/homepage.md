# homepage

**Purpose.** The pieces of the logged-out landing page (`views/HomepageView.vue`):
the guided tours over a screenshot, the counts and links the page shows,
and the landing-only button and form styles.

**Used by.** `views/HomepageView.vue`; the styles also by
`layout/components/HomepageHeader.vue` and the account forms in its panel.

## Key files

- `components/HomepageTour.vue`: a screenshot in a 16:10 viewport
  (`HomepageTourViewport.vue`) that zooms and pans to one region per step,
  outlined in lime, the rest dimmed. `layout="strip"` puts the steps as a
  row under the image (the hero), `"list"` beside it, with the card's text
  in the default slot (`reverse`: image left). Steps are `<button
  aria-pressed>`; a click jumps there and restarts the timer. It advances
  every `interval` ms only while it is on screen (IntersectionObserver), the
  tab is visible and it is playing; with `prefers-reduced-motion: reduce` it
  starts paused. Clicks send `landing:tour_step` / `landing:tour_toggle`, an
  automatic advance sends nothing. Tailwind only, no scoped CSS: the
  prerendered page has no chunk CSS before the app loads.
- `components/HomepageMarketToday.vue`: the "Market today" section (lead
  sentence, CX index with 7 / 30 / 90 d chips, top 5 movers, eight sector
  cards) from `GetMarketSummary` and the UNIVERSE pioneer `GetCXSparklines`
  call of `/market`'s workforce chart, so `/market` loads neither again.
  It is an async chunk: `HomepageView` mounts it through `useInView` once the
  section comes near after a scroll; until then, in the prerender and while
  it loads, `HomepageMarketSkeleton.vue` holds its final size (the shared
  `market*` size classes in `homepage.constants.ts`). The title and the CTA
  are in the view, so a failed summary leaves just those. Events:
  `landing:market_click`, `landing:market_view_change`.
- `homepageTour.util.ts`: `tourTransform` (translate and scale, clamped so
  no empty edge shows) and `tourHighlight` (the outline's box, its width
  divided by the zoom).
- `homepage.constants.ts`: the player and plan counts (updated by hand),
  the example plan UUID, the GitHub and Crowdin links, the landing button
  and form classes, and the three tours' step tables.

## Gotchas

- The tour boxes are measured on the screenshots in
  `public/images/homepage/`. Retaking a shot means re-measuring its boxes;
  `homepageTour.util.test.ts` checks that every box fits its viewport.
- The hero image has 640 and 1280 px variants (`plan-640.webp`,
  `plan-1280.webp`) for `srcset`; `index.html` preloads it with the same
  `srcset` and `sizes` (a test checks). Every image is lazy, the hero too, so
  the prerendered page fetches nothing where `index.html` hides it; the
  tours below the hero render their image once within 400 px of the
  viewport.
- The language count on the page is `SupportedLanguages.length`.

## Tests

`src/tests/features/homepage/`: the tour math and framing, and the tour's
timer, pause, reduced motion, visibility and events.
