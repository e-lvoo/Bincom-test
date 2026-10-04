import { pool, fail } from '@/lib/db';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [rows] = await pool.query('SELECT partyid FROM party ORDER BY id');
    return Response.json(rows.map((r) => r.partyid));
  } catch (e) { console.error(e); return fail('Could not load parties.'); }
}
