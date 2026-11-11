# Seatwise UI refresh

## Audit and direction, 11 November 2026

The desktop and 390 px phone audit found five presentation issues.

- Large headlines and long introductions pushed class availability and application actions down the page.
- Similar green tones across the background, text, buttons and capacity bands weakened the visual hierarchy.
- The header gave the identity form and primary navigation similar visual weight.
- Records, filters and supporting instructions needed clearer surface boundaries.
- Class actions appeared before the capacity information on a phone.

The selected direction is a professional admissions workspace. The existing Next.js App Router, React Bootstrap, React Icons and colocated Sass modules support its responsive forms and records.

## Concepts considered

Scores use a 1 to 5 scale. A lower portability score indicates a closer connection to the admission subject.

| Territory | Concept and anchor | Signature and intended feeling | Originality | Fit | Feasibility | Portability |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| School administration | Admissions desk. Treat classes, applications and identity as clearly separated working records. | Availability, capacity and the reservation action align within each class record. Organized and confident. | 4 | 5 | 5 | 2 |
| Lifecycle process | Decision trail. Make the HELD, CONFIRMED, EXPIRED and CANCELLED lifecycle the organizing principle. | The deadline panel takes visual priority when a decision is due. Focused and reassuring. | 4 | 5 | 4 | 2 |
| Identity | Student file. A registration number connects records across visits. | A persistent identity strip connects the navigation with owned applications. Personal and continuous. | 3 | 4 | 5 | 3 |

Choose Admissions desk because finding a class and acting on a real application are the primary tasks. Deadline emphasis supports this direction in application details.

## Concept card

- Idea. A clear working space for choosing a class and completing an admission.
- Metaphor. An orderly admissions desk with a class register and individual student records.
- Signature. Each class aligns its name, live capacity distribution, four counts and action. The decision panel gives the actual deadline its own surface.
- Emotion. Organized, dependable and immediately actionable.
- Motion verb. Settle into place.
- Screenshot. A compact page heading above a white class register, with blue available-seat counts and aligned reservation actions.

## Visual system

| Role | Value | Use |
| --- | --- | --- |
| Ground | `#F5F7FB` | Page background |
| Ink | `#172740` | Text, identity strip and home introduction |
| Muted | `#5C6C82` | Secondary text |
| Line | `#DDE4EE` | Record and panel boundaries |
| Primary | `#315BEA` | Main actions, active navigation and available-seat figures |
| Surface | `#FFFFFF` | Forms and working records |

Blue-tinted surfaces distinguish selected navigation and the countdown. Green identifies confirmed applications and open availability. Amber identifies temporary holds. Visible labels accompany each state.

The existing locally served Manrope family supplies 28 to 38 px task headings, 38 to 58 px home display type, 16 px inputs, and compact readable record labels. Counts and identifiers use tabular figures. Main content uses a 1240 px maximum width with 20 to 40 px outer gutters. Panels use an 18 px radius, controls use 8 to 10 px radii, and a restrained shadow separates major surfaces.

The composition follows each task.

```text
Shared header    [Student ID input + apply action + help]
                 [Seatwise] [Home] [Classes] [Applications] [Create class] [Student]

Home             [Dark introduction + browse action] [Application state guide]
                 [Admission steps and deadline guidance]

Classes          [Compact heading and explanation]
                 [White register with search and capacity filter]
                 [Name/status | capacity and four counts | reservation action]

Applications     [Compact heading]
                 [Current identity summary]
                 [Filters and application records with status and next action]

Application      [Back link, class name and status]
                 [Application record] [Deadline and confirmation/cancellation]

Create class     [Purpose and capacity guidance] [Class details form]
Student          [Identity guidance] [Current number and editable form]
404              [Centered recovery panel and home action]
```

Phones stack capacity before the reservation action. Application decisions appear before record metadata. Navigation keeps its existing accessible collapse control. Every component retains its dedicated folder and colocated stylesheet.

The portal stays still at rest. Existing occupancy updates and page transitions provide data-driven movement. Hover, press, focus and reduced-motion treatments remain part of every interactive surface.

## Implementation and verification

The refresh changes Sass and presentation markup. Existing hooks, validation schemas, service requests, state transitions, polling, ownership checks and persistence remain the behavioral baseline for regression verification.

Production builds, TypeScript and ESLint passed. All 69 frontend checks passed, including a new 320 px regression for the maximum supported capacity of 2,147,483,647 seats. Responsive stress checks covered 320, 390, 768, 1024 and 1920 px with a 200-character class name and large counts.

Four real UI-to-PostgreSQL flows passed on the isolated production stack. They covered confirmation and reload, cancellation and reapplication, natural expiry with disabled payment and released capacity, and closing and reopening the entire browser to recover the same held application.

Two complete production visual passes covered seven page types, with 174 screenshots per pass and a fresh independent critic for each pass. The first pass exposed register loading shifts of 0.168 for classes and 0.123 for applications on a phone. Reserved panel geometry and stable footer placement reduced those values to 0 and 0.003 in the final pass. The final reports contain zero browser errors, failed requests, overflow, small targets, axe violations, invisible sampled focus stops or hidden reduced-motion text. All sampled primary hover targets responded. The metadata audit reported zero failures and warnings across its five crawled routes. The application detail and 404 received separate browser checks.

| Page type | Throttled phone LCP | Layout shift |
| --- | ---: | ---: |
| Home | 1,076 ms | 0 |
| Classes | 1,108 ms | 0 |
| Application history | 1,180 ms | 0.003 |
| Create class | 1,200 ms | 0 |
| Student identity | 1,392 ms | 0 |
| Application detail | 1,040 ms | 0.006 |
| 404 | 1,028 ms | 0.006 |

These are local headless Chromium observations with a four-times CPU slowdown and slow-4G network simulation. Recorded phone scrolling was 58 to 60 FPS. The heaviest audited route was classes at about 364 KB, including 299 KB gzipped JavaScript. A direct browser probe confirmed the existing 240 ms arrival and 120 ms departure animations. Keyboard reports sample twelve focus stops and capture four focus frames per page.

The review led to stronger active-hold actions and actual deadlines in history, larger operational metadata, capacity counts ordered with their band legend, shorter phone introductions, and class-creation guidance following the form on a phone. A dedicated two-column count layout handles large capacity values. The assignment's editable Student ID input appears at the top of every route.

The cross-tab browser test now waits for the form's saved value before filling it. Its original timing could overlap asynchronous restoration and append to the restored value. Five isolated repetitions and the complete suite passed after synchronizing the test. Builds performed during an earlier browser run caused temporary resource connection resets. The affected pages were captured again with builds complete, and the final reports are clean.

A fresh independent critic opened all 45 final contact sheets and inspected selected originals. Its weighted overall estimate was 7.32/10, with Design 7.1, Usability 8.0, Creativity 6.5 and Content 7.8. Remaining visual opportunities include a more distinctive register motif and more compact phone identity and introductory panels. The confirmation explanation could also sit closer to its primary action. These scores reflect the supplied local evidence and the critic's judgment.

The previous review below records the earlier design.

---

# Previous design and verification record

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

The catalogue is an aligned register, not a wall of identical promotional cards. Detail is a focused decision workspace. The creation form uses a calmer split composition. Every visual component has its own named directory containing its `.tsx` and `.module.scss` pair, consistently across layouts, main views, menus, shared components and features. Context providers also have dedicated directories without artificial stylesheets. Pure hooks and helpers stay grouped by responsibility, while Next.js route files keep their required locations.

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
