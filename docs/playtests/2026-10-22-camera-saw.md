# Playtest 2026-10-22: "Camera saw" (the mystery shown as one of the 5)

Dev build, branch `agent/camera-answers` (PR #33), chrome-devtools MCP, `window.__cc`. Played `/explore/?place=continent:africa&seed=11` as a new player (fresh browser context, so the how-to and the slide hint showed), rounds 1–2 at 390x844 (mobile, touch), then checked round 3's start at 844x390 landscape and 1280x800. A script picked the moves (marked cards first, then unanswered colors, then big matches). It ruled an animal out only from what the grid showed: an animal's scouted answer that differed from an earned Camera answer.

Question: does the screen tell a first-time player that the hidden animal is one of the 5 on the board? A script can't say if a kid gets it. These checks only show that every place where the game tells them is there and readable. Comprehension still needs real players (see the end).

Invariants held: one move per counted swap; the grid never named the mystery or pointed at a mismatch during play (the Camera row showed only earned answers); no page scroll; how-to buttons 44 px tall.

## What a new player sees

- **How-to (v3, re-shows once for everyone).** Step 1: "Our camera trap caught one of the 5 animals on the board, not a new one. Which one?…" then the worked example. Wrong answer (Yes): "Look again: in the 🌙 column the camera says YES and animal 2 says NO. They don't match, so it isn't the one." Right answer (No): "Right! The camera saw a night animal, and animal 2 isn't one. Rule it out."
- **Grid.** The top row reads "Camera saw / One of these 5 ↓", with a camera icon, and a thin line separates it from the 5 animal rows. After the first witness note the second line becomes "N notes", with a red "✕N" once you rule animals out.
- **Ruled out.** The animal's name and answer cells dim to half strength, and its card turns grey with a red cross. Once released, the row drops to 30% with the name struck through.
- **Round end.** The Camera row slides down onto the mystery's own row and fades into it, and that row lights up. The card opens about 2 s later: "FOUND IT! The camera saw #3, the Golden-rumped Sengi" (round 1, 21 moves), then "The camera saw #3, the Giant Pangolin" (round 2, 20 moves). The replay grid keeps the "Camera saw" row and outlines the right animal's row.

## Findings

1. **Bug, fixed.** At 390 px, "3 witness notes" plus "✕1" overflowed the Camera cell. The red ✕ sat on the first answer cell, and "✗ NO" wrapped onto two lines. The visible text is now "3 notes" (the notebook icon and the accessibility label still say "witness notes"), and the line truncates rather than overflowing. Re-checked: the line ends at 137 px inside a 155 px cell.
2. **UX, fixed.** The goal line was 3 lines long at 390 px, so the status ticker scrolled its first sentence ("The camera caught one of these 5 animals. Which one?") out of view. It's now "The camera caught one of these 5 animals. Which one? Match gems to find out.", which fits in two lines.
3. **UX, open.** After the Camera row fades, its place at the top stays blank for about 0.9 s until the card opens. It reads fine, but it could keep a faint frame.
4. **Note.** In the round-end replay, the Camera row shows "Camera saw ✕4" (your own marks that round). That's harmless, but it means nothing once the round is over.
5. **Test noise, not this change.** `npm run e2e` failed twice under heavy machine load (load average about 13, from VS Code and Codex processes): taps were read as long presses, so the field guide covered the board. main failed the same way once. With the load under 4 it passed 729/729. The plan 047 "walked card stays after reload" check plays an unseeded game, so a cascade can release the walker. It failed in 2 of 7 branch runs and is flaky by design.

## Still needs real players

Before the first move, ask: "How many animals are you choosing from?" and "What does the camera row mean?" After the first answer: "Which two cells would you compare?" After the round: "Why did you rule out X?"

## Repro

- New player: a fresh browser profile (or clear `critter-connect:animal-board-how-to:v3`), then `/explore/?place=continent:africa&seed=11` at 390x844.
- Label overflow (before the fix): round 2 of that seed, with 3 witness notes and one animal ruled out.
