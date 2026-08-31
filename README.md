# Core Cricket — recovered editable source

This is a clean, editable Next.js reconstruction created from the live Core Cricket behavior and the saved August 2026 product guide. It is intentionally kept separate from the current production deployment until verified.

## Included
- Responsive/PWA dashboard, teams, players, tournaments and matches
- Ball-by-ball runs, wides, no-balls, wickets and Undo
- Separate player batting/bowling records
- Tournament groups/tiers
- Automatic group points tables: P/W/L/Points and Net Run Rate
- 2 points for a win, 0 additional points for a loss
- Automatic Match MVP with performance reason + manual tournament-creator override
- Automatic Tournament MVP + manual override
- Main-page Best Performances using cumulative app records
- Live Studio access for site admin, tournament creator, team admin/captain and scorer; no paid-plan gate
- Local browser persistence for recovery/testing

## Important recovery note
This project does not contain the original production database credentials or server-side source that was lost. It stores data in localStorage so the UI and cricket logic can be tested safely. Before replacing production, connect a proper database/auth layer and migrate existing production data.

## Run
```bash
npm install
npm run dev
```

Demo admin login: `6470000000` / `corecricket`

## Safe deployment plan
1. Push this folder to GitHub.
2. Deploy it to a separate Vercel preview/recovery project.
3. Verify all screens and scoring rules.
4. Add database/auth/storage and migrate existing data.
5. Only then point `core-cricket.vercel.app` at the recovered project.
