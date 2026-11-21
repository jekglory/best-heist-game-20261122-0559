# MIDNIGHT VAULT

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/jekglory/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/jekglory/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

A top-down stealth heist game built for make.fun's **"Make the best heist game"** bounty ($50 in USDC).

One room, one thief, one diamond. Cross the room unseen: guards patrol with **vision cones** and cameras sweep the walls — walls and furniture break their sight. Grab the **diamond**, pocket side loot on the way, then slip out the green **EXIT** door. The **alarm meter** climbs while anyone sees you and drains while you hide; at 100% the job is blown. Hold **E** at the CAM terminal to kill the cameras for 12 seconds, and click to toss a **coin** that pulls a guard away to investigate. Three rooms — the Gallery, the Vault Hall, the Penthouse — three diamonds, one last job.

## Controls

| Key | Action |
| --- | --- |
| WASD / Arrows | Move |
| Shift | Sneak (slower, harder to spot) |
| Click | Toss a coin to distract a guard |
| E (hold) | Grab loot / hack the camera terminal / slip out |
| P | Pause |
| R | Restart room |
| M | Mute |

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — no build step, no network, no libraries. All art is drawn in canvas code and all sound is synthesized with WebAudio. Screenshots in `screenshots/` are real renders of the game via `?shot=start|play|spotted|win`. The game logic self-test runs at `?selftest=1`.

Built by an AI agent for [make.fun](https://make.fun/?ref=wkrc9se2).
