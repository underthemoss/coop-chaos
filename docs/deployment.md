# Deployment

Coop Chaos uses Vercel's native GitHub integration. The project belongs to
Willy's personal **Hobby** team, `will-6041s-projects`, rather than EquipmentShare.

- Project: `coop-chaos` (`prj_ZLl1gGmEyP9SesXIDsLm6ECnDtLQ`)
- Team: `team_piFEhLXmF3HaznRWpVu5GSjA`
- Repository: <https://github.com/underthemoss/coop-chaos>
- Production branch: `main`
- Dashboard: <https://vercel.com/will-6041s-projects/coop-chaos>

Pushing to `main` triggers a production deployment. Other branches receive preview
deployments. There is no custom deployment workflow or repository token to manage.
`vercel.json` keeps automatic Git deployments enabled and sets the Vite build:
`npm ci`, then `npm run check` (tests, TypeScript, and production build), with
`dist` as the published directory. The project uses Node.js 24.x.

The game is a static, single-player browser application. It needs no backend or
runtime secrets. Saves live in the current browser's IndexedDB and belong to that
site origin; a preview URL, production URL, another browser, or another device
does not share them.

## Local account safety

Local `.vercel/` project metadata and `.env*` files are ignored. Always supply
`--scope will-6041s-projects` when operating this project through the CLI, and
verify the project and target commit before releasing. The CLI's current default
team can be EquipmentShare even while this checkout is linked to the personal
project.

To link a fresh checkout without deploying it:

```sh
vercel link --yes --project coop-chaos --scope will-6041s-projects
```

Prefer a reviewed Git push for normal releases. Inspect Vercel's deployment
record for its source commit and build result, then check the deployed 3D scene.
A successful build alone does not establish browser acceptance.
