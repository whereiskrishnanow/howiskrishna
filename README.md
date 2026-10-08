# Portfolio — hero

A horizontally scrolling hero page: intro on the left, project cards running off to the right, and contact links pinned bottom-left.

```bash
npm install
npm run dev      # http://localhost:5175
npm run build    # outputs dist/
```

## Editing content

All copy, projects and links are in `src/content.ts`.

- **Projects:** add or reorder entries in `projects`. The row grows to fit. Each has a one-line `description` that appears under the title on hover (always shown on touch screens).
- **Images:** each card's `image` lives in `public/work/`, cropped to 16:10. The top edge stays sharpest, so frame the part you want seen there. Set `tint` to roughly the image's average colour; it shows while the image loads.
- **Detail pages:** clicking a card opens `#/work/<id>`. Each page's content lives in `src/caseStudies.ts` as a list of blocks: paragraphs, headings, bullet lists (`apps`: **lead** → *apps*, `colon`: **lead:** text, or plain), screenshots with optional captions, and a `phones` grid for mobile screens. Content was taken from howiskrishna.framer.website. Images go in `public/work/<id>/`.
- **Contact:** the footer links are in `contacts`.

## How it works

- **Scrolling** (`src/hooks/useHorizontalScroll.ts`). On screens 768px and wider, the document scrolls sideways. [Lenis](https://github.com/darkroomengineering/lenis) turns vertical wheel and trackpad input into eased horizontal movement. Horizontal swipes still work natively. Space, Page Up/Down, the arrow keys and Home/End all move across. Below 768px the page stacks vertically and scrolls normally. With reduced motion turned on, the easing is switched off.
- **Blurred previews** (`src/components/ProjectCard.tsx`). Each card stacks eight copies of its image inside a fixed card-sized frame, each blurrier than the one before. Gradient masks cross-fade the copies by depth, and the copies are added together with `mix-blend-mode: plus-lighter`, so the weights always sum to 1. The result is a blur that grows smoothly from a sharp top edge into a soft glow, without banding.
- **Drift:** the picture in each card moves all the time. It pans around a slow loop (12s) at constant speed while it gently zooms (5s) and turns (8s), so the motion never stalls. Every blur copy shares the timing, so the stack stays aligned. Off-screen cards pause, and the motion is off when reduced motion is turned on. To change the speed, edit the durations on `.media-img` in `styles.css`.
- **Hover theme** (`src/hooks/useActiveProject.ts`, `src/components/Backdrop.tsx`). Hovering a card (or tabbing to it) fills the page with that card's picture, heavily blurred. All text flips to white or black, whichever contrasts more with the picture's average colour (measured from the image in `src/lib/tone.ts`). The hovered card's blur turns solid in that same colour. To force a colour for one card, set `ink: 'white'` or `ink: 'black'` on it in `content.ts`. Touch taps don't trigger it.
- **Cloth background** (`src/components/ClothBackground.tsx`). The page background is a sheet of smooth cloth. A tensioned membrane is simulated on the CPU (16k cells), the moving cursor presses ripples into it, and a few broad folds drift slowly underneath. The GPU (WebGL2) lights it softly in the page grey, with dithering so it never bands. Tune it with the constants at the top of the file (`PRESS` for how hard the cursor pushes, `DAMPING` for how quickly it settles, `SLOPE` for how visible the folds are). It holds still with reduced motion on, and falls back to plain grey without WebGL.
- **Detail page** (`src/components/CaseStudyPage.tsx`). The title, tagline and a wide version of the card's blurred picture form a header that rises as you scroll, then pins to the top. The article slides up under it and is clipped at the band's top edge, so text only shows fading through the glow. Routing is hash-based (`src/hooks/useRoute.ts`), so it works on any static host without rewrites. Coming back restores the home row's scroll position.
- **Scaling** (`src/styles.css`). Sizes are written in "design pixels" (`--u`), matching a 1440px-wide frame. They scale with the viewport, between 0.78× and 1.5×.
- **Type:** Libre Caslon Condensed 600 for headings and Inter Tight for body text, both from Google Fonts.
