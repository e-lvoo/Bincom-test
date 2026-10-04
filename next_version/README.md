# Bincom test - Delta State 2011 election results

Next.js (App Router) + MySQL (`mysql2`). Three pages:

| Page | Route | What it does |
|---|---|---|
| Q1 | `/` | Pick LGA, then polling unit, see that unit's party scores |
| Q2 | `/lga` | Pick LGA, see the sum of all its polling unit results (compared with `announced_lga_results` for reference only) |
| Q3 | `/new` | Chained LGA > ward selects, enter a new polling unit and a score for every party |

## Run locally
1. Create the database and import (relaxed SQL mode is needed because the dump has `0000-00-00` dates):
   ```
   mysql -u root -p -e "CREATE DATABASE bincom_test"
   mysql -u root -p --init-command="SET SESSION sql_mode=''" bincom_test < ../db/bincom_test.sql
   ```
2. `cp ../.env.example .env.local` and fill in the DB values.
3. `npm install && npm run dev` then open http://localhost:3000

## Deploy
Host MySQL somewhere reachable from the internet, import the dump the same way (relaxed `sql_mode`), set the `DB_*` env vars on the host (Vercel, Render, etc.), and set `DB_SSL=true` if the DB requires TLS. For Vercel, set the project's Root Directory to `next_version`.

## Schema notes that shaped the queries
- `polling_unit.lga_id` -> `lga.lga_id` (not `lga.uniqueid`).
- `ward.ward_id` is not unique; `polling_unit.uniquewardid` -> `ward.uniqueid`.
- `announced_pu_results.polling_unit_uniqueid` is a varchar holding `polling_unit.uniqueid`.
- `announced_lga_results.lga_name` actually holds the `lga_id` as text.
- `party_abbreviation` is `char(4)`, so `LABOUR` is stored as `LABO`.
- Q2 sums by `polling_unit.lga_id`, the same key Q1 lists by, so the two pages agree. A few rows in the dump have a ward from a different LGA than their `lga_id`; the app treats `lga_id` as the source of truth.
- Q3 inserts the polling unit and all party rows in one transaction.
