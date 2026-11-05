# homepage

**Purpose.** Pieces of the logged-out landing page: guided screenshot tours,
the "Market today" section, counts and links, landing-only styles.

**Used by.** `views/HomepageView.vue`; the styles also by `HomepageHeader`
and the account forms; `lib/seo/checkLanding.ts` checks the prerender
against the example plan and GitHub links.

## Key files

- `components/HomepageTour.vue` (+ `HomepageTourViewport.vue`,
  `homepageTour.util.ts`): zooms and pans a screenshot to one outlined
  region per step. Auto-advances only while on screen, tab visible and
  playing; starts paused with `prefers-reduced-motion`. Only a clicked step
  sends `landing:tour_step`.
- `components/HomepageMarketToday.vue`: CX index, movers and sectors from
  `market_report`'s `useMarketReport` plus the same Universe
  `GetCXSparklines` call as `/market` (shared cache). Async, mounted via
  `useInView`; `HomepageMarketSkeleton.vue` holds its final size until then
  (shared `market*` classes). Title and CTA live in the view, so a failed
  summary leaves just those.
- `homepage.constants.ts`: player/plan counts (updated by hand), example plan,
  GitHub/Crowdin links, landing classes, tour steps.

## Gotchas

- Tour components use Tailwind only, no scoped CSS: the prerendered page has
  no chunk CSS before the app loads.
- Tour boxes are measured on the screenshots in `public/images/homepage/`;
  retaking a shot means re-measuring (`homepageTour.util.test.ts` checks
  every box fits).
- The hero has 640/1280 px variants; `index.html` preloads it with the same
  `srcset`/`sizes` (tested). All images are lazy; tours below the hero
  render their image within 400 px of the viewport.

## Tests

`src/tests/features/homepage/`; page in `src/tests/views/HomepageView.test.ts`.
