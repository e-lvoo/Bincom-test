# Python version

This standalone Flask implementation answers the same three questions as the Next.js app. It lives in this folder so the original JavaScript project remains unchanged. Pages use server-rendered forms and do not require browser JavaScript.

## Run locally

From this folder:

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Set the database environment variables to your MySQL connection details:

```sh
export DB_HOST=your-mysql-host
export DB_PORT=3306
export DB_USER=your-user
export DB_PASSWORD=your-password
export DB_NAME=your-database
export DB_SSL=true
```

Then run:

```sh
python app.py
```

Open http://localhost:5000. For secure cookie signing on a public deployment, also set a private `FLASK_SECRET_KEY` value. If your provider supplies a CA certificate, set `DB_SSL_CA` to its file path so the database certificate and host are verified.

The schema and data are in `../db/bincom_test.sql`. Import them into the selected database before starting the app. The original JavaScript app and its Vercel configuration are not changed by this Python version.
