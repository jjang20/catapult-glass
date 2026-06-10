# Getting Started — a guide for designers (no coding background needed)

This guide explains, step by step, how this project works and how you can see, test,
and influence the game at every stage. No programming knowledge is assumed.

---

## 1. What this project is, in plain words

We are building a small catapult game that runs **inside Meta Ray-Ban Display glasses**.
Technically, the game is a **web page** — the same kind of thing a browser shows — that
the glasses know how to display. That has two big consequences for you:

1. **You can play every version of the game on your computer**, in a normal browser
   (Chrome, etc.), using the arrow keys instead of hand gestures. It is the exact same
   game the glasses will run.
2. **Putting the game on the glasses is just "visiting a web address"** — there is no
   app store involved yet.

## 2. The words you'll keep seeing (glossary)

| Word | What it actually means here |
|---|---|
| **Repository (repo)** | The project's folder, stored online at GitHub. Contains all the game's files and their full history. Ours is `jjang20/catapult-glass`. |
| **GitHub** | The website that stores the repo, shows its files nicely, and hosts our to-do lists ("issues"). |
| **Commit** | A saved snapshot of the project with a short note ("added level 3"). Like versions of a design file, but every save is kept forever and can be compared or restored. |
| **Branch** | A parallel copy of the project for work-in-progress, so experiments don't disturb the finished version. The main copy is called `main`. |
| **Push** | Uploading commits from a working computer to GitHub so everyone (and the hosting) sees them. |
| **Issue** | A to-do item on GitHub with a checklist and discussion thread. We have one issue per project phase. |
| **GitHub Pages** | A free GitHub feature that turns the repo into a live website — this is how the game gets a web address (URL) the glasses can open. |
| **SPEC.md** | The game's "design bible" in this repo — every decision we've made. If you remember one file, remember [this one](../SPEC.md). |
| **Phase 0–5** | The project's six stages (see §5 below). |
| **Spike** | A small throwaway experiment built only to answer questions — our Phase 0 tests what the glasses can actually do. |

## 3. How to see the game on your computer

> Right now the repo contains only documents — there is no game to run yet. These steps
> start working from **Phase 1** onward; they're written down now so the workflow is
> never a mystery.

1. Open the project's GitHub Pages address in Chrome (the address will be added to the
   README the moment Phase 1 is deployed — it will look like
   `https://jjang20.github.io/catapult-glass/`).
2. The page shows a black 600×600 square — that square is exactly what the glasses
   display.
3. Controls on the computer (these simulate the wristband gestures 1:1):

   | Keyboard | Simulates (Neural Band) | In the game |
   |---|---|---|
   | ↑ / ↓ arrow keys | Swipe up / down | Aim angle up / down |
   | ← / → arrow keys | Swipe left / right | Power dial down / up |
   | Enter | Pinch (index finger + thumb) | Fire / select |
   | Esc | Middle-finger pinch | Pause / back |

4. Useful "secret" addresses for testing (add to the end of the URL):
   - `?level=4` — jump straight to zone 4
   - `?unlock=1` — unlock every zone
   - `?fps=1` — show a performance readout

## 4. How the game gets onto the glasses

1. The game is published with GitHub Pages, which gives it a public `https://…` address.
2. On your phone, open the **Meta AI app** (the one paired with your glasses).
3. Add the web app: either scan the **QR code** we'll generate for the game's address,
   or go to the app's settings and add the address manually.
4. The game then appears on the glasses' display; the Neural Band gestures control it
   exactly as the arrow keys did on the computer.

(Step-by-step screenshots will be added in Phase 5 when we do this for real.)

## 5. How the work is organized

Building the whole game is too big for one sitting, so it's split into **six phases**,
each with its own GitHub issue containing a checklist. Each working session (with
Claude) picks up one issue, does part or all of it, saves the work as commits, and
pushes them to GitHub.

| Phase | What it produces | What YOU should look at / decide |
|---|---|---|
| **0 — Discovery spike** | A test page that measures what the glasses can really do (input behavior, speed, readability) | Run it wearing the glasses; judge the readability screen with your designer eyes |
| **1 — Core loop** | A playable prototype: aim, fire, knock blocks down (placeholder rectangles) | Play it in the browser — does aiming *feel* right? |
| **2 — Game systems** | Materials, scoring, stars, menus, the conquest map | Flow & UI review |
| **3 — Content & art** | The pixel-art spritesheet and all 8–10 castle zones | **Your biggest phase**: art direction, possibly drawing sprites yourself, level difficulty feedback |
| **4 — Polish** | Effects, title art, sound (if possible) | Final look & feel |
| **5 — Deploy** | The game live on the glasses, tested against a checklist | Play the real thing 🎉 |

Progress tracking lives in two places, by agreement:
- **GitHub issues** — the detailed checklists (source of truth).
- **Linear** — a 6-item roadmap view, one card per phase, each linking to its GitHub
  issue. For your at-a-glance planning.

## 6. How you contribute as the designer

- **Decisions**: anything visual or game-feel related is yours to call. The spec marks
  what's already decided; if you change your mind, we change the spec first, then the
  game.
- **Pixel art (Phase 3)**: the game reads one image file (a "spritesheet") drawn at a
  small fixed size. The exact canvas size and grid will be specified in the Phase 3
  issue so you can draw in any pixel-art tool (e.g. Aseprite, Piskel — both
  beginner-friendly) and hand over a PNG. If you'd rather direct than draw, Claude
  drafts the art and you give feedback.
- **Playtesting**: every phase ends with something you can open in a browser. Your
  feedback goes in the phase's GitHub issue (write a comment — screenshots welcome).

## 7. One important platform fact (worth understanding)

On the glasses, **pure black is invisible** — the display adds light to the world, so
black pixels simply show nothing. That's why the whole game lives on a black background
(it floats in your view), why every sprite needs bright colors and bright outlines, and
why we never use "dark grey on black" for anything important. Keep this in mind for all
art decisions.

## 8. Where everything lives

| Thing | Where |
|---|---|
| Game design + technical decisions | [`SPEC.md`](../SPEC.md) |
| Phase-0 test plan & findings | [`docs/spike-0-input-discovery.md`](spike-0-input-discovery.md) |
| This guide | `docs/getting-started.md` |
| To-do lists | GitHub → Issues tab |
| Roadmap | Linear → "Castle Siege" project |
| The live game (from Phase 1) | URL will be added to the README |
