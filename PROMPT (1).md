# Build: Polyhose Machine TV (live shop-floor dashboard) with Settings and playback controls

## 1. Context

You are building a feature for **OEE Polyhose**, a Faclon Labs (I/O Sense) OEE application used by Polyhose, a hydraulic hose manufacturer.

Hose is made in six stages, always in this order:

**Mandrel → Liner → Braider → Cover → Vulcanisation → Testing**

- A **PIR** (production order) moves through all six stages.
- An **MPIR** is the mandrel batch that a PIR uses.
- The plant has about 34 machines. Machine names look like `Mandrel_M1`, `Liner_L3`, `Braiding_B27`, `Cover_C2`, `Autoclave_V1` and `Testing_T1`.

The goal is a **live TV dashboard** on a large screen on the shop floor:
- It shows **one machine per screen** and rotates through the machines automatically.
- A **Settings** screen chooses which machines and which sections each TV shows, and how long each machine stays on screen.
- **Playback controls** (Back, Play/Pause, Stop, Forward, Settings) appear only when someone moves the mouse, touchpad or touches the screen.

## 2. Attached files

1. **`polyhose-machine-tv-reference.png`** is the target design. Match its layout, hierarchy, spacing and colours.
   - **Part A** is the machine screen with the control bar visible.
   - **Part B** is the Settings screen.
   - The red numbered callouts explain each area. They are not part of the UI.
2. **`reference-machine-screen.html`** is a working prototype of the machine screen with sample data, rotation, live refresh and the control bar. Use it for exact sizes, tokens and behaviour. Rebuild it properly in the project's stack; do not paste it in as-is.
3. **`reference-settings-screen.html`** is a static mockup of the Settings screen.

All numbers and names in the references are **sample data**. Never hard-code them.

## 3. Tech approach

- Build inside the existing OEE Polyhose front end, using the project's stack and conventions. It appears to be React + TypeScript + Vite. If it is something else, follow what the repo uses.
- Read the repo first: routing, the API client, existing OEE / Timeline / Stage Link data hooks, and the theme.
- Add two routes:
  - **`/tv`**: the kiosk machine screen
  - **`/tv/settings`**: the Settings screen
- Keep all data access behind a typed adapter (`tvDataSource`) so a mock and the real API can be swapped. Ship a mock adapter with realistic data for all 34 machines, so the screen works before the APIs are ready.
- No new heavy dependencies. Charts are small inline SVG (sparklines, bars, timeline).

## 4. Design system (Faclon Labs)

- **Font:** Inter only, weights 400–800. Use tabular numbers for every figure.
- **Canvas:** design at **1920 × 1080**. Scale the whole stage uniformly to fit any screen, centred, with a navy background around it on screens that are not 16:9.
- **Day theme (default):**

  | Token | Value |
  |---|---|
  | page | `#fdfdfe` |
  | panels | `#f1f5fa` |
  | cards | `#ffffff`, 1px border `#dde3ec` |
  | ink | `#0c1927` |
  | muted | `#6b7a8c` |
  | brand blue | `#165ff2` (tint `#e8efff`) |

- **Night theme:**

  | Token | Value |
  |---|---|
  | page | `#0c1927` |
  | panels | `#122033` |
  | ink | `#f7f9fc` |
  | muted | `#93a9c4` |
  | brand text | `#8fb4ff` |

- **Status colours** (same in both themes, adjusted for contrast). A colour is **always shown with its word**, never on its own:
  - Running: green `#1e8e3e`, tint `#e7f5ec`
  - Down: red `#d92d20`, tint `#fdeceb`
  - Changeover: amber `#e0912f` fill, `#b54708` text, tint `#fff3e3`
  - No signal: grey `#a7b3c2`
- **OEE colour rule** (matches the existing app legend): **≤ 40% red**, **≥ 65% (target) green**, otherwise ink.
- **Cards:** rounded 12–16 px, borders instead of shadows, uppercase letter-spaced card labels in muted.
- **Minimum text size on the TV canvas:** 15 px for captions. Most text 18–22 px, key numbers 32–120 px.

## 5. Machine screen (`/tv`), block by block

### Header (fixed, 104 px)

- **Left:**
  - Polyhose wordmark
  - Machine name (44 px, 800 weight) with a stage line below, e.g. "Braider · stage 3 of 6"
  - A large status pill:
    - "Running · 2h 22m"
    - "Down · Joint Bobbin"
    - "Die/Pin Changeover"
    - "No signal"
- **Centre:**
  - **Operator:** name, and "ID 201476" under it
  - **Supervisor:** name, with stage and shift under it
- **Right:**
  - The "SAMPLE DATA" badge, shown only when the mock adapter is active
  - Clock (HH:MM) with the shift and date below

### Body grid (12 columns, 3 rows)

**Block 1: OEE by period** (columns 1–5, row 1)

- **Table rows:**
  - Current shift (highlighted with the brand tint, label "now · 06:00–HH:MM")
  - Previous shift
  - Second previous shift
  - Yesterday (all 3 shifts)
  - This month (month to date)
- **Columns:** OEE, A, P, Q, Production (m).
- Apply the OEE colour rule to the OEE and A columns.
- **Formulas:**
  - Availability = prod time ÷ planned time
  - Performance = actual metres ÷ (prod time × ideal m/min for that hose size)
  - Quality = good metres ÷ total metres
  - OEE = A × P × Q
- **Performance cap:** show Performance capped at 100% and log a warning if the raw value is above 100%. The current data has values like 103.6% because ideal rates are set too low.

**Block 2: Current PIR** (columns 6–12, row 1)

- **Top row:**
  - PIR number, very large, monospace
  - Hose size and MPIR
  - Due date and start time
  - Four big numbers: **Plan**, **Produced here** (this machine/stage), **Remaining** (amber), **ETA**
    - ETA = now + remaining ÷ current line speed
    - Shows "Stopped" in red if the machine is not running
- A progress bar.
- **Info line:** line speed now, average speed on this PIR, joints, scrap metres.
- **Stage strip:** six small cards, one per stage, showing the same PIR's `done / plan`, a bar, and "✓ done" or "N left".
  - Outline this machine's stage in blue.
  - Bar colours: blue = stage complete, green = this machine, amber = part lot.

**Block 3: Live process parameters** (columns 1–8, row 2)

- A 4 × 2 grid of parameter tiles. Each tile has:
  - name
  - status chip: "In limit", "High", "Low" or "Stopped"
  - big value with its unit
  - "Set X" and the "lo–hi" limits
  - a sparkline of the last 60 min, with the limit band shaded
- A value outside its limits gets a 2 px amber outline plus the word High or Low.
- **Parameters by machine type** (read from a config file, not hard-coded in components):

  | Stage | Parameters |
  |---|---|
  | Mandrel | line speed, screw rpm, melt °C, head pressure bar, mandrel OD mm, motor current A, haul-off m/min, cooling water °C |
  | Liner | line speed, screw rpm, barrel °C, head pressure bar, liner OD mm, wall thickness mm, motor current A, haul-off m/min |
  | Braider | line speed, carrier rpm, braid angle °, pitch mm, wire tension kgf, active bobbins (of 24), motor current A, braided OD mm |
  | Cover | line speed, screw rpm, head °C, head pressure bar, cover OD mm, cover thickness mm, motor current A, cooling trough °C |
  | Vulcanisation | steam pressure bar, chamber °C, cure time min, cycle step (of 5), load m, heat-up min, condensate °C, cycles today |
  | Testing | test pressure bar, hold time s, pressure drop bar, lengths tested, passed, failed, water °C, pump current A |

- Each parameter in the config has `key, label, unit, setPoint, lo, hi, decimals, tag`, where `tag` is the PLC/IoT tag id.
- If a tag is missing for a machine, show the tile as "Not connected" in grey. Don't hide it.

**Block 4: Last PIR on this machine** (columns 9–12, row 2)

- PIR and hose size
- Produced / plan with %
- Ran from → to
- Run time · downtime
- OEE · average speed
- Operator
- Bottom row: **Next in queue** (PIR, hose size, plan metres).

**Block 5: Shift timeline** (columns 1–8, row 3)

- A horizontal bar from shift start to shift end, with segments for Production (green), Downtime (red), Changeover (amber) and No signal (grey). A "now" marker.
- Hourly time labels below it.
- A row of hourly output bars (metres) against the hourly target: green if ≥ 85% of target, amber if below. Future hours are empty.

**Block 6: Downtime this shift** (columns 9–12, row 3)

- Number of stops, minutes lost, number of changeovers.
- The latest 3 stops: time, reason, duration. Changeover reasons in amber, breakdown reasons in red.

### Footer (52 px)

- **Left:** a pulsing green dot, then "Faclon Labs · I/O Sense OEE · live · updated N s ago".
- **Middle:** a progress bar for the time left on this machine.
- **Right:** "Next · <machine> · 17 / 34".

### Hiding sections

When a section is turned off in Settings, the remaining blocks **reflow to fill the space**. Use CSS grid areas per layout. Never leave an empty hole.

## 6. Playback controls (hover bar)

A dark pill bar at the bottom centre of the screen, on top of the content. See callout 4.

**Buttons, in order:**

| Button | Action |
|---|---|
| ⏮ Back | Previous machine |
| ▶ / ⏸ Play/Pause | Large, brand blue. Toggles rotation. Pausing freezes the progress bar where it is. |
| ■ Stop | Pauses and goes back to the first machine. The button turns red while stopped. |
| ⏭ Forward | Next machine |
| ⚙ Settings | Opens `/tv/settings` |

Beside the buttons, a status text: "17 / 34 · Braiding_B27 · 5 s each", or "· Paused" / "· Stopped".

**Show / hide rules** (this is required):

- Hidden by default. The mouse cursor is hidden too (`cursor: none`).
- Show the bar and the cursor on `mousemove`, `pointermove`, `touchstart` or any key press.
- Hide them **3 s after the last movement**. The delay is configurable in Settings: 2 s, 3 s or 5 s.
- Stay visible while the pointer is over the bar. When the pointer leaves the bar, restart the 3 s timer.
- Hide **immediately** when the pointer leaves the window (`mouseleave` on the document).
- Clicking a button must **not** keep the bar visible through focus. Keep it visible for keyboard focus only (`:focus-visible`).
- Fade and slide, about 200 ms. No animation when `prefers-reduced-motion` is set.

**Keyboard and TV remote:**

- `←` / `→`: previous / next machine
- `Space`: play / pause
- `Esc`: stop
- `S`: open Settings

Live data keeps refreshing while paused.

## 7. Settings screen (`/tv/settings`)

Follow Part B of the PNG. It has a header and three columns.

### Header

- Title: "TV settings".
- **TV profile** dropdown. Each physical TV has a profile, e.g. "Plant entrance TV" or "Braider hall TV", plus options to add, rename and delete profiles.
- **Cancel** and **Save & apply** buttons.

### Column 1: Machines on this TV

- Search box.
- "Select all" with a tri-state checkbox, plus "Only running" and "Clear" links.
- A counter: "16 of 34 selected".
- Collapsible groups per stage. Each group header has a tri-state checkbox and "N of M".
- **Each machine row:**
  - checkbox
  - status dot and machine name
  - live state (Running, Down, Changeover, No signal)
  - a chip on the right: "All sections", "Custom · 4 of 6" or "Hidden"
- Clicking the chip expands a per-machine panel with:
  - its own section checkboxes, overriding the defaults
  - an optional per-machine time override
- Drag handle to set a custom order.

### Column 2: Sections on screen (defaults for all machines)

- Six rows, one per block in §5. Each row has a checkbox, the section name, a one-line description and a mini layout thumbnail with that block highlighted.
- Drag to reorder.
- A live **preview** of the resulting layout. Hidden sections give their space to the others.
- At least one section must stay on. Disable unchecking the last one.

### Column 3: Playback

- **Time on each machine:** quick picks 5 s, 10 s, 15 s, 20 s, 30 s and 60 s, plus a custom number input.
  - Minimum 5 s, maximum 300 s, **default 5 s**.
  - Validate the input and show an inline error.
- **Loop length summary:** "1 min 35 s · 15 machines × 5 s + B23 at 20 s".
- **Order:**
  - By stage
  - Down machines first
  - Custom (uses the drag order)
- **Toggles:**
  - **Skip machines with no signal** (default on). They come back automatically when they reconnect.
  - **Jump to a machine when it goes down** (default on). Show it for one turn, then continue the loop.
- **Colours:** Auto (Night from 19:00 to 07:00), Day or Night.
- **Hide controls after:** 2 s, 3 s or 5 s.

### Saving

- Save to the backend per TV profile, using an existing settings API or a new one following repo conventions.
- Cache the last saved profile in `localStorage` so the TV still starts if the API is unreachable.
- The TV picks its profile from the URL, e.g. `/tv?profile=braider-hall`, or from the last one used on that device.
- Changes apply on **Save & apply** without reloading the page, and return to `/tv`.

### Suggested data model

```ts
type SectionKey = 'oee' | 'currentPir' | 'params' | 'lastPir' | 'timeline' | 'downtime';
interface TvProfile {
  id: string; name: string;
  machines: { machineId: string; enabled: boolean; sections?: SectionKey[]; seconds?: number }[];
  defaultSections: SectionKey[];          // ordered
  secondsPerMachine: number;              // 5..300, default 5
  order: 'stage' | 'downFirst' | 'custom';
  skipNoSignal: boolean; jumpToDown: boolean;
  theme: 'auto' | 'day' | 'night';
  hideControlsAfterMs: 2000 | 3000 | 5000;
  updatedAt: string; updatedBy: string;
}
```

## 8. Kiosk behaviour on `/tv`

- **Full screen. No scrollbars and no text selection:**
  - `user-select: none`
  - block `contextmenu`, `selectstart`, `dragstart` and `dblclick`
- Only the control bar receives pointer events.
- Request a **screen wake lock**, and re-request it when the page becomes visible again. Ignore failures.
- **Rotation:**
  - Advance to the next enabled machine when its time is up, wrapping around.
  - Skip machines that have no sections enabled.
- **Live refresh:**
  - process parameters and status every 5 s
  - OEE and PIR data every 30 s
  - "updated N s ago" counts up between refreshes
- **Stale data:** if a refresh fails or the data is older than 2 min, the footer dot turns grey and says "Data delayed · last update HH:MM". Keep showing the last good values.
- If Settings leaves zero machines enabled, show a calm empty state: "No machines selected for this TV · open Settings (⚙)".

## 9. Data sources (map to existing APIs)

| Need | Source |
|---|---|
| Machine status, events, durations, reasons, PIR ID, operator ID, total prod, shift | OEE event table (Timeline tab): Event start/end time, Machine status, Downtime Reason, PIR ID, Operator ID, Total prod, Duration, Prod time, Downtime Duration, Expected_quantity, Quality, date_shift, shift, Disconnect |
| OEE / A / P / Q per period | Existing OEE calculation (Source tab), per machine, for shift / previous shifts / yesterday / month to date |
| PIR to MPIR and PIR to machine per stage | Stage Link mapping |
| PIR plan quantity, hose size, due date | PIR master (ERP) |
| Operator name, supervisor | Operator master (ID → name) and supervisor roster per stage and shift. Fall back to "ID 201476" if no name is found. |
| Live parameters | PLC/IoT tags per machine (config in §5, Block 3) |
| Ideal speed and hourly target | Per machine × hose size table |

- Operator IDs arrive as floats like `201476.0`. Normalise them to strings.
- "Metres" is the production unit everywhere. Format numbers with Indian grouping (`1,21,260`).

## 10. Edge cases to handle

- **Machine with no signal:**
  - grey pill
  - OEE table shows "—" for the current shift
  - Current PIR block says "No PIR running · no signal since HH:MM"
  - parameters show "Stopped"
- **Machine down or in changeover:**
  - ETA shows "Stopped"
  - line speed shows 0
  - the reason appears in the header pill
- **No current PIR** but the machine is running: say so plainly and still show the last PIR.
- **PIR without a plan quantity:** show the produced metres, and show "Plan missing" in amber instead of Remaining and ETA.
- **Only one machine selected:** no rotation; Back and Forward are disabled.
- **Very long names:** truncate with an ellipsis. Never wrap the header onto two lines.

## 11. Acceptance criteria

1. At 1920 × 1080 and at 1366 × 768, the machine screen matches the PNG layout with no overflow, clipping or scrollbars, in both Day and Night themes.
2. All six blocks show real data from the adapter. Turning any block off in Settings reflows the rest with no gaps.
3. The control bar:
   - is invisible when idle and appears on mouse, touchpad or touch movement
   - hides 3 s after movement stops and hides immediately when the pointer leaves the window
   - stays visible while hovered
4. Back, Play/Pause, Stop, Forward and Settings work, and so do the keyboard shortcuts. Pause freezes the progress bar; Stop returns to the first machine.
5. Settings:
   - select or deselect machines by checkbox, by stage, or all
   - per-machine sections and time
   - default sections with reorder and preview
   - time per machine 5–300 s (default 5 s)
   - Save & apply updates the running TV immediately and is saved per TV profile
6. Rotation uses each machine's own time when set, otherwise the default. Skip-offline and jump-to-down work.
7. Nothing on `/tv` can be selected or right-clicked, and the cursor is hidden while idle.
8. TypeScript strict passes, lint passes, and there are unit tests for:
   - the rotation scheduler: next and previous, skipping, per-machine time, pause and resume
   - the OEE/ETA/remaining calculations
   - the control-bar visibility timer

## 12. Do not

- Do not hard-code sample numbers, names or machine lists outside the mock adapter.
- Do not show a colour without its word, or add colours outside the tokens above.
- Do not add hover-only information on the TV screen. Hover is used only for the control bar.
- Do not use shadows or gradients on cards; use borders and tints.

## 13. When you finish

Reply with:

- the files changed or created
- how to run it and open `/tv` and `/tv/settings`
- which data sources are still on the mock adapter
- screenshots of the machine screen (Day and Night) and of Settings
