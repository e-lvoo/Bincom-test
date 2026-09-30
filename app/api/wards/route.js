import { pool, fail } from '@/lib/db';
export const dynamic = 'force-dynamic';

// ward.ward_id repeats across LGAs, so the real key is ward.uniqueid.
export async function GET(req) {
  const lga = Number(new URL(req.url).searchParams.get('lga'));
  if (!Number.isInteger(lga)) return fail('lga is required', 400);
  try {
    const [rows] = await pool.query(
      'SELECT uniqueid, ward_id, ward_name FROM ward WHERE lga_id = ? ORDER BY ward_name', [lga]);
    return Response.json(rows);
  } catch (e) { console.error(e); return fail('Could not load wards.'); }
}
