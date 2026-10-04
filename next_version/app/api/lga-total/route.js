import { pool, fail } from '@/lib/db';
export const dynamic = 'force-dynamic';

// Q2: sum of polling-unit results per party for one LGA.
// The announced LGA figure is returned separately, only for side-by-side comparison.
export async function GET(req) {
  const lga = Number(new URL(req.url).searchParams.get('lga'));
  if (!Number.isInteger(lga)) return fail('lga is required', 400);
  try {
    const [totals] = await pool.query(
      `SELECT r.party_abbreviation AS party, SUM(r.party_score) AS total
         FROM announced_pu_results r
         JOIN polling_unit p ON p.uniqueid = CAST(r.polling_unit_uniqueid AS UNSIGNED)
        WHERE p.lga_id = ?
        GROUP BY r.party_abbreviation
        ORDER BY total DESC`, [lga]);
    const [[counts]] = await pool.query(
      `SELECT COUNT(DISTINCT p.uniqueid) AS units,
              COUNT(DISTINCT r.polling_unit_uniqueid) AS reporting
         FROM polling_unit p
         LEFT JOIN announced_pu_results r ON CAST(r.polling_unit_uniqueid AS UNSIGNED) = p.uniqueid
        WHERE p.lga_id = ?`, [lga]);
    // announced_lga_results.lga_name actually stores the lga_id as text.
    const [announced] = await pool.query(
      `SELECT party_abbreviation AS party, party_score AS announced
         FROM announced_lga_results WHERE lga_name = ?`, [String(lga)]);
    return Response.json({
      totals: totals.map((t) => ({ party: t.party, total: Number(t.total) })),
      announced,
      units: Number(counts.units),
      reporting: Number(counts.reporting),
    });
  } catch (e) { console.error(e); return fail('Could not calculate totals.'); }
}
