import { pool, fail } from '@/lib/db';
export const dynamic = 'force-dynamic';

// Delta State only (state_id 25). lga_id is the key polling_unit.lga_id points to.
export async function GET() {
  try {
    const [rows] = await pool.query('SELECT lga_id, lga_name FROM lga WHERE state_id = 25 ORDER BY lga_name');
    return Response.json(rows);
  } catch (e) { console.error(e); return fail('Could not load local governments.'); }
}
