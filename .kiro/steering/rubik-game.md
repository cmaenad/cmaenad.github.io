---
inclusion: always
---

# Rubik's Cube Web Game — Steering Rules

## Stack
- Vanilla JavaScript (ES6+), no frameworks, no build tools
- CSS3 with 3D transforms for cube rendering
- HTML5 single-page app

## Architecture
- `js/cube.js` — pure cube state logic (3x3x3 model, face rotations)
- `js/renderer.js` — CSS 3D rendering of the cube faces and stickers
- `js/controls.js` — UI buttons: rotate view, move arrows, randomize, solve
- `js/location.js` — Geolocation API + country flag color extraction
- `js/session.js` — localStorage persistence of cube state and colors
- `js/solver.js` — Kociemba-inspired layer-by-layer solver
- `js/app.js` — bootstrap and wiring

## Cube State Model
- Represent cube as 6 faces, each a flat array of 9 sticker indices [0..8]
- Face order: U(top), D(bottom), F(front), B(back), L(left), R(right)
- Colors derived from user country flag (up to 6 colors); complement RGB fills remaining faces

## Color Rules
- Request geolocation on load; user must grant permission
- Map country code → flag colors (hardcoded palette per country)
- If fewer than 6 flag colors, fill remaining with RGB complements
- Store resolved colors in localStorage so subsequent loads skip geolocation

## Responsiveness
- Mobile-first layout (Android 13 Chrome)
- Touch events for swipe-based moves on cube faces
- Desktop: mouse click on arrows + keyboard shortcuts

## Session Persistence
- On every move, serialize cube state + colors to localStorage key `rubik_session`
- On load, restore from localStorage if present

## Solver
- Layer-by-layer approach (beginner's method) for simplicity and correctness
- Animate each solve step with a configurable delay

## Code Style
- No external dependencies
- Functions over classes where possible; use classes only for Cube state
- Comments in Spanish (matching user language)
