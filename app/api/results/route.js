import { pool, fail } from '@/lib/db';
export const dynamic = 'force-dynamic';

// Q1: results for one polling unit. Join key is polling_unit.uniqueid (not polling_unit_id).
export async function GET(req) {
  const pu = Number(new URL(req.url).searchParams.get('pu'));
  if (!Number.isInteger(pu)) return fail('pu is required', 400);
  try {
    const [[unit]] = await pool.query(
      `SELECT p.uniqueid, p.polling_unit_number, p.polling_unit_name, w.ward_name, l.lga_name
         FROM polling_unit p
         LEFT JOIN ward w ON w.uniqueid = p.uniquewardid
         LEFT JOIN lga l ON l.lga_id = p.lga_id
        WHERE p.uniqueid = ?`, [pu]);
    if (!unit) return fail('Polling unit not found.', 404);
    const [results] = await pool.query(
      `SELECT party_abbreviation, party_score FROM announced_pu_results
        WHERE polling_unit_uniqueid = ? ORDER BY party_score DESC`, [String(pu)]);
    return Response.json({ unit, results });
  } catch (e) { console.error(e); return fail('Could not load results.'); }
}
