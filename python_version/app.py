"""Python/Flask version of the Delta State election results project.

The original Next.js files are left unchanged. This version uses server-rendered
HTML forms and the same MySQL tables and DB_* environment variables.
"""

import logging
import os
from datetime import datetime

import mysql.connector
from flask import Flask, flash, redirect, render_template, request, url_for

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "change-this-before-production")
app.logger.setLevel(logging.INFO)


def connect_db():
    """Open a MySQL connection using the project's existing DB_* settings."""
    required = ("DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME")
    missing = [key for key in required if not os.getenv(key)]
    if missing:
        raise RuntimeError("Missing database settings: " + ", ".join(missing))

    options = {
        "host": os.environ["DB_HOST"],
        "port": int(os.getenv("DB_PORT", "3306")),
        "user": os.environ["DB_USER"],
        "password": os.environ["DB_PASSWORD"],
        "database": os.environ["DB_NAME"],
        "connection_timeout": 10,
        "autocommit": False,
        "charset": "utf8mb4",
        "ssl_disabled": os.getenv("DB_SSL", "false").lower() != "true",
    }
    # Supplying Aiven's CA certificate enables certificate and hostname checks.
    ca_file = os.getenv("DB_SSL_CA")
    if ca_file:
        options.update(ssl_ca=ca_file, ssl_verify_cert=True, ssl_verify_identity=True)
    return mysql.connector.connect(**options)


def fetch_all(sql, params=()):
    connection = connect_db()
    try:
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute(sql, params)
            return cursor.fetchall()
        finally:
            cursor.close()
    finally:
        connection.close()


def as_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def get_lgas():
    return fetch_all(
        "SELECT lga_id, lga_name FROM lga WHERE state_id = 25 ORDER BY lga_name"
    )


def show_database_error(message):
    app.logger.exception("Database request failed")
    flash(message, "error")


@app.get("/")
def polling_unit_result():
    selected_lga = as_int(request.args.get("lga"))
    selected_pu = as_int(request.args.get("pu"))
    lgas, units, unit, results = [], [], None, []
    try:
        lgas = get_lgas()
        if selected_lga is not None:
            units = fetch_all(
                """SELECT uniqueid, polling_unit_number, polling_unit_name
                     FROM polling_unit WHERE lga_id = %s
                     ORDER BY polling_unit_name, polling_unit_number""",
                (selected_lga,),
            )
        if selected_pu is not None:
            rows = fetch_all(
                """SELECT p.uniqueid, p.polling_unit_number, p.polling_unit_name,
                          w.ward_name, l.lga_name
                     FROM polling_unit p
                     LEFT JOIN ward w ON w.uniqueid = p.uniquewardid
                     LEFT JOIN lga l ON l.lga_id = p.lga_id
                    WHERE p.uniqueid = %s""",
                (selected_pu,),
            )
            if rows:
                unit = rows[0]
                results = fetch_all(
                    """SELECT party_abbreviation, party_score
                         FROM announced_pu_results
                        WHERE polling_unit_uniqueid = %s
                        ORDER BY party_score DESC""",
                    (str(selected_pu),),
                )
    except Exception:
        show_database_error("Could not load polling unit data. Check the database connection and imported tables.")

    return render_template(
        "index.html", title="Polling unit results", lgas=lgas,
        selected_lga=selected_lga, selected_pu=selected_pu,
        units=units, unit=unit, results=results,
    )


@app.get("/lga")
def lga_total():
    selected_lga = as_int(request.args.get("lga"))
    lgas, totals, announced = [], [], {}
    units_count = reporting_count = total_votes = 0
    try:
        lgas = get_lgas()
        if selected_lga is not None:
            totals = fetch_all(
                """SELECT r.party_abbreviation AS party, SUM(r.party_score) AS total
                     FROM announced_pu_results r
                     JOIN polling_unit p
                       ON p.uniqueid = CAST(r.polling_unit_uniqueid AS UNSIGNED)
                    WHERE p.lga_id = %s
                    GROUP BY r.party_abbreviation
                    ORDER BY total DESC""",
                (selected_lga,),
            )
            counts = fetch_all(
                """SELECT COUNT(DISTINCT p.uniqueid) AS units,
                          COUNT(DISTINCT r.polling_unit_uniqueid) AS reporting
                     FROM polling_unit p
                     LEFT JOIN announced_pu_results r
                       ON CAST(r.polling_unit_uniqueid AS UNSIGNED) = p.uniqueid
                    WHERE p.lga_id = %s""",
                (selected_lga,),
            )
            if counts:
                units_count = counts[0]["units"]
                reporting_count = counts[0]["reporting"]
            announced_rows = fetch_all(
                """SELECT party_abbreviation AS party, party_score AS announced
                     FROM announced_lga_results WHERE lga_name = %s""",
                (str(selected_lga),),
            )
            announced = {row["party"]: row["announced"] for row in announced_rows}
            total_votes = sum(int(row["total"] or 0) for row in totals)
    except Exception:
        show_database_error("Could not calculate LGA totals. Check the database connection and imported tables.")

    return render_template(
        "lga.html", title="Local government totals", lgas=lgas,
        selected_lga=selected_lga, totals=totals, announced=announced,
        units_count=units_count, reporting_count=reporting_count,
        total_votes=total_votes,
    )


@app.route("/new", methods=["GET", "POST"])
def new_polling_unit():
    selected_lga = as_int(request.values.get("lga"))
    selected_ward = as_int(request.values.get("ward_unique_id"))
    lgas, wards, parties = [], [], []

    try:
        lgas = get_lgas()
        parties = fetch_all("SELECT partyid FROM party ORDER BY id")
        if selected_lga is not None:
            wards = fetch_all(
                "SELECT uniqueid, ward_id, ward_name FROM ward WHERE lga_id = %s ORDER BY ward_name",
                (selected_lga,),
            )
    except Exception:
        show_database_error("Could not load form data. Check the database connection and imported tables.")
        return render_template(
            "new.html", title="Add a polling unit", lgas=lgas, wards=wards,
            parties=parties, selected_lga=selected_lga,
            selected_ward=selected_ward, form=request.form,
        )

    if request.method == "POST" and request.form.get("action") == "save":
        name = request.form.get("name", "").strip()
        number = request.form.get("number", "").strip()
        scores = {}
        if selected_lga is None or selected_ward is None:
            flash("Choose a local government and a ward.", "error")
        elif not name:
            flash("Enter a polling unit name.", "error")
        else:
            for party in parties:
                party_id = party["partyid"]
                raw_score = request.form.get("score_" + party_id, "").strip()
                if not raw_score.isdigit():
                    flash("Enter a whole number (0 or more) for " + party_id + ".", "error")
                    break
                scores[party_id] = int(raw_score)
            else:
                try:
                    connection = connect_db()
                    cursor = connection.cursor(dictionary=True)
                    ward_rows = []
                    try:
                        cursor.execute(
                            "SELECT uniqueid, ward_id, lga_id FROM ward WHERE uniqueid = %s",
                            (selected_ward,),
                        )
                        ward_rows = cursor.fetchall()
                        if not ward_rows or ward_rows[0]["lga_id"] != selected_lga:
                            flash("That ward does not belong to the selected local government.", "error")
                        else:
                            ward = ward_rows[0]
                            connection.start_transaction()
                            cursor.execute(
                                "SELECT COALESCE(MAX(polling_unit_id), 0) + 1 AS next_id "
                                "FROM polling_unit WHERE uniquewardid = %s",
                                (ward["uniqueid"],),
                            )
                            next_id = cursor.fetchone()["next_id"]
                            ip_address = request.headers.get("X-Forwarded-For", request.remote_addr or "unknown").split(",")[0].strip()
                            cursor.execute(
                                """INSERT INTO polling_unit
                                   (polling_unit_id, ward_id, lga_id, uniquewardid,
                                    polling_unit_number, polling_unit_name,
                                    polling_unit_description, entered_by_user,
                                    date_entered, user_ip_address)
                                   VALUES (%s, %s, %s, %s, %s, %s, %s,
                                           'web-form', NOW(), %s)""",
                                (next_id, ward["ward_id"], ward["lga_id"], ward["uniqueid"],
                                 number or None, name[:50], name, ip_address),
                            )
                            new_id = cursor.lastrowid
                            result_rows = [
                                (str(new_id), party_id[:4], score, "web-form", datetime.now(), ip_address)
                                for party_id, score in scores.items()
                            ]
                            cursor.executemany(
                                """INSERT INTO announced_pu_results
                                   (polling_unit_uniqueid, party_abbreviation, party_score,
                                    entered_by_user, date_entered, user_ip_address)
                                   VALUES (%s, %s, %s, %s, %s, %s)""",
                                result_rows,
                            )
                            connection.commit()
                            flash('Saved "' + name + '" with results for all parties.', "success")
                            return redirect(url_for("new_polling_unit", lga=selected_lga))
                    except Exception:
                        connection.rollback()
                        raise
                    finally:
                        cursor.close()
                        connection.close()
                except Exception:
                    show_database_error("Could not save the polling unit. Nothing was stored.")

    return render_template(
        "new.html", title="Add a polling unit", lgas=lgas, wards=wards,
        parties=parties, selected_lga=selected_lga,
        selected_ward=selected_ward, form=request.form,
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=False)
