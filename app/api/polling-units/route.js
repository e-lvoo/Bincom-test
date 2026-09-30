import { pool, fail } from '@/lib/db';
export const dynamic = 'force-dynamic';

// GET ?lga=17 -> polling units in that LGA (same key Q2 sums by, so lists and totals agree)
export async function GET(req) {
  const lga = Number(new URL(req.url).searchParams.get('lga'));
  if (!Number.isInteger(lga)) return fail('lga is required', 400);
  try {
    const [rows] = await pool.query(
      `SELECT uniqueid, polling_unit_number, polling_unit_name
         FROM polling_unit WHERE lga_id = ? ORDER BY polling_unit_name, polling_unit_number`, [lga]);
    return Response.json(rows);
  } catch (e) { console.error(e); return fail('Could not load polling units.'); }
}

// POST: Q3 - create a polling unit and all its party results in one transaction.
export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return fail('Invalid request.', 400); }
  const { lgaId, wardUniqueId, name, number, scores } = body || {};
  const puName = String(name || '').trim();
  if (!Number.isInteger(lgaId) || !Number.isInteger(wardUniqueId)) return fail('Choose a local government and a ward.', 400);
  if (!puName) return fail('Enter a polling unit name.', 400);
  if (!scores || typeof scores !== 'object') return fail('Enter a score for every party.', 400);

  const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  const conn = await pool.getConnection();
  try {
    const [parties] = await conn.query('SELECT partyid FROM party ORDER BY id');
    const entries = [];
    for (const { partyid } of parties) {
      const v = scores[partyid];
      if (!Number.isInteger(v) || v < 0) return fail(`Enter a whole number (0 or more) for ${partyid}.`, 400);
      entries.push([partyid, v]);
    }
    const [[ward]] = await conn.query('SELECT uniqueid, ward_id, lga_id FROM ward WHERE uniqueid = ?', [wardUniqueId]);
    if (!ward || ward.lga_id !== lgaId) return fail('That ward does not belong to the chosen local government.', 400);

    await conn.beginTransaction();
    const [[{ next }]] = await conn.query(
      'SELECT COALESCE(MAX(polling_unit_id), 0) + 1 AS next FROM polling_unit WHERE uniquewardid = ?', [ward.uniqueid]);
    const [ins] = await conn.query(
      `INSERT INTO polling_unit
         (polling_unit_id, ward_id, lga_id, uniquewardid, polling_unit_number, polling_unit_name,
          polling_unit_description, entered_by_user, date_entered, user_ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'web-form', NOW(), ?)`,
      [next, ward.ward_id, ward.lga_id, ward.uniqueid, String(number || '').trim() || null, puName, puName, ip]);
    const puId = ins.insertId;
    // party_abbreviation is char(4) in the schema (LABOUR is stored as LABO), so slice to match existing rows.
    const rows = entries.map(([p, s]) => [String(puId), p.slice(0, 4), s, 'web-form', new Date(), ip]);
    await conn.query(
      `INSERT INTO announced_pu_results
         (polling_unit_uniqueid, party_abbreviation, party_score, entered_by_user, date_entered, user_ip_address)
       VALUES ?`, [rows]);
    await conn.commit();
    return Response.json({ uniqueid: puId }, { status: 201 });
  } catch (e) {
    try { await conn.rollback(); } catch {}
    console.error(e);
    return fail('Could not save the polling unit. Nothing was stored.');
  } finally { conn.release(); }
}
