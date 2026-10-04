# Bincom election results project

This repository contains two implementations of the same Delta State 2011 election-results test:

- [`next_version/`](next_version/) — Next.js, React, and MySQL (`mysql2`).
- [`python_version/`](python_version/) — Flask, server-rendered HTML, and MySQL.

The shared SQL dump is in [`db/bincom_test.sql`](db/bincom_test.sql). Both apps use the `DB_*` environment variables listed in [`.env.example`](.env.example). Keep real credentials in local environment files or your hosting provider; never commit them.

## Next.js version

```sh
cd next_version
npm install
cp ../.env.example .env.local
# Edit .env.local with your database settings.
npm run dev
```

Open http://localhost:3000. The app has polling-unit results (`/`), LGA totals (`/lga`), and a new polling-unit form (`/new`).

For the existing Vercel project, set **Root Directory** to `next_version` before redeploying.

## Python version

```sh
cd python_version
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
```

Set the `DB_*` values in your shell, then run `python3 app.py`. Open http://localhost:5000. See [`python_version/README.md`](python_version/README.md) for details.

## Database

Create a MySQL database and import the SQL dump with relaxed session SQL mode because it contains legacy zero dates. For a local MySQL server, from the repository root:

```sh
mysql -u root -p -e "CREATE DATABASE bincom_test"
mysql -u root -p --init-command="SET SESSION sql_mode=''" bincom_test < db/bincom_test.sql
```

For a hosted database, use its connection details in the environment variables and import the dump with that provider's TLS connection settings. Set `DB_SSL=true` when the provider requires TLS.
