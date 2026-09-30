'use client';
import { useState } from 'react';
import { useApi } from '@/lib/client';

// Q2: summed polling-unit results for one LGA (never read from announced_lga_results).
export default function LgaTotal() {
  const [lga, setLga] = useState('');
  const lgas = useApi('/api/lgas');
  const t = useApi(lga ? `/api/lga-total?lga=${lga}` : null);
  const announced = Object.fromEntries((t.data?.announced || []).map((a) => [a.party, a.announced]));
  const hasAnnounced = Object.keys(announced).length > 0;
  const max = Math.max(...(t.data?.totals || []).map((r) => r.total), 1);
  const sum = (t.data?.totals || []).reduce((s, r) => s + r.total, 0);

  return (
    <>
      <h1>Local government total</h1>
      <p className="lead">Adds up every polling unit result recorded under a local government.</p>
      <div className="panel selector-panel selector-single">
        <div className="selector-heading"><span className="selector-step">01</span><div><strong>Choose a local government</strong><p>See recorded polling unit totals for the area.</p></div></div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="lga">Local government</label>
          <select id="lga" value={lga} onChange={(e) => setLga(e.target.value)}>
            <option value="">{lgas.loading ? 'Loading...' : 'Select a local government'}</option>
            {(lgas.data || []).map((l) => <option key={l.lga_id} value={l.lga_id}>{l.lga_name}</option>)}
          </select>
        </div>
      </div>
      {(lgas.error || t.error) && <p className="msg err" role="alert">{lgas.error || t.error}</p>}
      {t.loading && <p className="loading" role="status">Calculating local government totals…</p>}
      {t.data && (t.data.totals.length === 0 ? (
        <p className="panel">No polling unit results are recorded for this local government yet.</p>
      ) : (
        <div className="panel">
          <p className="muted" style={{ marginTop: 0, marginBottom: 22 }}>
            {t.data.reporting} of {t.data.units} polling units have results.
            {!hasAnnounced && ' No announced local government result to compare against.'}
          </p>
          <div className="table-wrap"><table>
            <thead><tr><th>Party</th><th className="num">Sum of polling units</th>{hasAnnounced && <th className="num">Announced at LGA</th>}</tr></thead>
            <tbody>
              {t.data.totals.map((r) => (
                <tr key={r.party}>
                  <td className="bar"><span style={{ width: `${(r.total / max) * 100}%` }} /><b>{r.party}</b></td>
                  <td className="num">{r.total.toLocaleString()}</td>
                  {hasAnnounced && <td className="num">{announced[r.party] != null ? announced[r.party].toLocaleString() : '-'}</td>}
                </tr>
              ))}
              <tr><td><b>Total</b></td><td className="num"><b>{sum.toLocaleString()}</b></td>{hasAnnounced && <td />}</tr>
            </tbody>
          </table></div>
        </div>
      ))}
    </>
  );
}
