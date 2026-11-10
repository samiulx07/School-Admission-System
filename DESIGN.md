# Seatwise design direction

## Brief

Build a clear school admission portal for students and the person creating classes. The job is to choose a class, reserve limited capacity, and confirm before the hold expires. The API is the authority for capacity and lifecycle state. English is the agreed interface language.

Seatwise is a fictional product name for this assignment, not a claim of affiliation with a school. There are no invented institutional statistics, awards, prices or payment gateways. Classes, seat counts and applications always come from the real API. Empty states explain how to create the first class.

Use the selected Next.js App Router, React, Bootstrap and component-scoped Sass stack. It supports the required forms and application flows while keeping route entrypoints thin. Browser requests use Axios through a same-origin Next.js proxy; its upstream API URL is configured on the server.

## Three concepts

Scores are 1–5; lower portability is better.

| Territory | Idea and anchor | Signature / emotion / screenshot | Originality | Fit | Feasibility | Portability |
| --- | --- | --- | --- | --- | --- | --- |
| Classroom material: Open desks | Treat capacity like a classroom's remaining open desks. Each independent class owns a finite capacity, with held and confirmed portions. | Capacity bands settle between open, held and confirmed states as real data changes. Calm orientation. A large available-seat number beside its class name and status band. | 4 | 5 | 5 | 2 |
| Identity: Registration strip | A student's 17-digit registration number is the entry into their applications. | A precise identity strip introduces an owned application record. Personal clarity. The registration strip beside current applications. | 4 | 4 | 4 | 3 |
| Process: Decision trail | Every application follows the actual HELD / CONFIRMED / EXPIRED / CANCELLED lifecycle. | A pending record settles into a final state after the server accepts an action. Reassurance. A confirmed application with a completed decision trail. | 3 | 5 | 5 | 3 |

Choose Open desks: it makes the project's capacity rule understandable and carries naturally from the catalogue into application details. Borrow the registration strip only for identity and the decision trail only for status feedback. No numbered individual seats are invented; the API manages aggregate capacity.

## Concept card

- **Idea:** See what is open, hold one place, and make the decision before its deadline.
- **Metaphor:** An orderly classroom with a limited number of open desks.
- **Signature:** Real capacity proportions change through one reusable occupancy component; the selected application settles into its server-confirmed state.
- **Emotion:** Calm, legible and ready to act within three seconds.
- **Motion verb:** Settle into place.
- **Screenshot:** Asymmetric headline and identity panel above a spacious class register with large available-seat figures.

## Art direction

### Palette

| Role | Value | Purpose |
| --- | --- | --- |
| Ground | `#F2F5F3` | Cool classroom paper |
| Ink | `#183E3B` | Deep board green, headings and confirmed capacity |
| Muted | `#566B65` | Secondary copy with readable contrast |
| Line | `#D5DFDA` | Quiet boundaries and unoccupied capacity |
| Accent | `#C7EDAC` | Open capacity and highlighted surfaces, with dark text |
| Held | `#F1C978` | A temporary hold, with dark text |

White is a neutral surface. Destructive/error text uses an accessible dark red only where the state requires it. Status always has a text label, not color alone. No gradients, glass panels, decorative hero blobs or large shadows.

### Type and rhythm

Use Manrope Variable from Fontsource's licensed package, served locally from the build. One family keeps the portal focused; tabular figures carry counts, identifiers and countdowns. Display type uses a fluid 42–76 px scale, tight tracking and about 1.05 leading. Body copy is 16–18 px with 1.5 leading; labels stay readable at 13–14 px.

Use a 12-column desktop grid, a maximum content width around 1240 px, 24–32 px gutters and deliberate 32/56/88 px section spacing. On 390 px phones, use a single-column composition, shorter headline measure, stacked controls, and 44 px primary targets. Use one 12 px radius rule, with fully rounded small status pills as functional labels.

### Motion and scope

Primary buttons and links settle by a small transform and a clear fill/outline response; active and keyboard focus states are equally explicit. GSAP owns any authored data-driven motion through a scoped hook and reverts it on unmount. Occupancy changes share one data-derived driver. No loader, WebGL, custom cursor, scroll-jacking or page-blocking curtain is justified for admissions tasks.

The requested React Scroll library handles optional anchor navigation; native wheel scrolling stays native. Lenis is omitted because a second scroll controller would overlap that selected library. Reduced-motion users get immediate scrolling and complete static content. No independent animation loops are introduced.

The portal intentionally stays still at rest. Actual live seat changes, action feedback, and hover/focus/press responses provide the motion; a decorative idle animation would distract from deadlines and forms.

## Composition plan

```text
Header:      [Seatwise]              [Classes] [Applications] [Create class]

Home hero:   [Large school admission headline     ] [Student identity form]
             [Specific explanation and browse CTA] [Current identity state]

Catalogue:   [Classes heading + real live state]   [Search / filters]
             [Class name      capacity band     available count    action]
             [Class name      capacity band     available count    action]

History:     [Current student's applications]
             [Status/date controls] [Application rows with clear next action]

Detail:      [Back to classes]
             [Class name + application status] [Deadline / decision panel]
             [Actual identifiers / timestamps] [Confirm / cancel actions]

Create:      [Small contextual explanation]      [Accessible validated form]

Footer:      [Seatwise / school admissions]      [Classes / applications]

404:         [This place is not on the register] [Return to classes]
```

The catalogue is an aligned register, not a wall of identical promotional cards. Detail is a focused decision workspace. The creation form uses a calmer split composition. Every reusable visual component, layout, menu and main view has its colocated `.tsx` and `.module.scss` pair.

## Genericness check

Removed marketing feature cards, fixed fake admission statistics, decorative school illustrations and hard-coded ten-minute claims. Availability proportions, application status and the deadline derive from backend data. The interface should be recognizable from its class register, board-green type and purposeful capacity signals rather than effects.

## Verification

Verification covers every required workflow against the actual backend, identity restoration and switching, three-second seat refresh, countdown/expiry, action conflicts, loading/empty/error states and responsive keyboard use. Production browser review includes desktop, phone and reduced motion, with fresh independent critics. Screenshots and raw reports remain ignored.

### Recorded production results, 10 November 2026

Two complete production browser passes covered home, classes, application history, class creation, student identity, application details and the custom 404. The final pass contained 174 screenshots, including desktop, phone, keyboard, hover and reduced-motion states. All seven page reports had zero browser errors, overflow, serious accessibility violations, invisible focus stops or hidden reduced-motion text. The metadata/resource audit crawled five routes and reported zero failures and zero warnings; the additional 404 and application-detail types were checked separately in the browser.

| Page type | Throttled phone LCP | Layout shift |
| --- | ---: | ---: |
| Home | 1,044 ms | 0 |
| Classes | 984 ms | 0.012 |
| Application history | 948 ms | 0.015 |
| Create class | 1,012 ms | 0 |
| Student identity | 976 ms | 0 |
| 404 | 848 ms | 0 |
| Application details | 960 ms | 0.005 |

These are observed local Chromium measurements with CPU/network throttling and isolated real database fixtures, not a guarantee for other deployments. Recorded phone scrolling was 60-61 FPS. The heaviest audited route was classes at about 362 KB total, including 299 KB gzipped JavaScript. Optional history controls and the occupancy animation engine load on demand.

React view transitions settle content over 240 ms; reduced motion removes that animation. A supplementary native-browser probe confirmed the actual arrival/departure animations, since the standard screenshot script samples navigation first at 300 ms. The deadline remains a functional clock rather than a decorative motion effect.

A fresh evidence-only critic reviewed every final screenshot and rated the overall visual result 7.0/10, with accessibility, performance and responsive design at 8/10. The remaining visual opportunities are more distinctive branding, shorter introductions before mobile tasks and stronger feedback on subtle text links. These are recorded limitations, not a claim of award-level design.
