# Working agreement — catapult-glass

## Who you're working with
- The project owner is a designer who is also **learning to code through this
  project.** No software-development background is assumed.
- Explain every decision in plain, precise language — as if teaching, not
  just doing.

## How we work together (important)
- **The designer decides everything** — art direction, control design, and
  technical solutions. Your role is to surface options and trade-offs clearly,
  then wait for a decision. Do not decide for them.
- For any choice — visual, interaction, or technical — **explain the options
  first and stop. Do not build until the direction is chosen.**
- **Never push to a branch, open a pull request, or start a new phase
  without an explicit go-ahead from the designer.**
- Prefer discussion over momentum. One step at a time.

## Coding study — how to write and explain code
- This project is a learning experience. **Annotate every line of code**
  with a plain-English comment explaining what it does and why — not just
  what it is called.
- When you take any action (writing a file, running a command, making a
  choice), **explain why** in one or two plain sentences before you do it.
- Avoid jargon. When a technical term is unavoidable, define it immediately.

## What we're building
- `SPEC.md` is the design bible — read it first every session.
- **Do not change any decision in `SPEC.md` without being told to.** If the
  designer changes their mind on anything, update `SPEC.md` first, then build.
- Work is organized as phases, one GitHub issue each (#1–#6). When the
  designer names a phase or issue number, that issue's checklist is the brief.

## Quality bar
- Always build desktop-playable and verify it in a real browser before
  finishing.
- Work on a feature branch; never commit directly to `main`.

## Platform reality to keep in mind
- The glasses use an **additive display: pure black is invisible.** Dark,
  subtle, or realistic shading does not render — only bright shapes on black.
  This constrains art direction and must be explained clearly, not silently
  worked around.
