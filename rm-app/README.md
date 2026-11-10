# Rugby Manager 26/27

A text-based rugby union management game that installs to a phone or desktop home screen.

## What is here

- `index.html`: the whole game, built from `src/`. This plus the four files below is everything a host needs.
- `manifest.webmanifest`, `sw.js`, `icon-192.png`, `icon-512.png`: make it installable and playable offline.
- `src/`: `data.js` (clubs and squads), `engine.js` (match, season and transfer rules), `ui.js` (screens), `style.css`.
- `build.sh`: rebuilds `index.html` after you change anything in `src/`.

## Putting it online

Upload this folder to any static web host that serves over HTTPS. There is no server code and no database yet.
After changing the game, run `sh build.sh` and raise `VERSION` in `sw.js` so installed copies pick up the update.

## Installing

Open the site, then use the browser's "Add to Home Screen" (phone) or "Install" (desktop) option.

## Saves

Each device keeps its own save. Options > "Create save code" exports a season; paste the code on another device to carry on.

## Notes

Squads are the published 2026/27 lists; ratings, ages and money are estimates. Club and player names are used without a licence, so keep this to a private group.
