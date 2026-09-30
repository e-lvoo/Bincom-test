'use client';
import { useState } from 'react';
import { useApi, puLabel } from '@/lib/client';

// Q1: choose an LGA, then a polling unit in it, and see that unit's result.
export default function PollingUnitResult() {
  const [lga, setLga] = useState('');
  const [pu, setPu] = useState('');
  const lgas = useApi('/api/lgas');
  const units = useApi(lga ? `/api/polling-units?lga=${lga}` : null);
  const result = useApi(pu ? `/api/results?pu=${pu}` : null);

  return (
    <>
      <h1>Polling unit result</h1>
      <p className="lead">Pick a local government, then a polling unit, to see the votes each party received there.</p>
      <div className="panel selector-panel">
        <div className="selector-heading"><span className="selector-step">01</span><div><strong>Find a polling unit</strong><p>Choose a local government, then a unit.</p></div></div>
        <div className="selector-fields">
          <div className="field">
            <label htmlFor="lga">Local government</label>
            <select id="lga" value={lga} onChange={(e) => { setLga(e.target.value); setPu(''); }}>
              <option value="">{lgas.loading ? 'Loading...' : 'Select a local government'}</option>
              {(lgas.data || []).map((l) => <option key={l.lga_id} value={l.lga_id}>{l.lga_name}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="pu">Polling unit</label>
            <select id="pu" value={pu} disabled={!lga || units.loading} onChange={(e) => setPu(e.target.value)}>
              <option value="">{!lga ? 'Choose a local government first' : units.loading ? 'Loading...' : `Select a polling unit (${(units.data || []).length})`}</option>
              {(units.data || []).map((u) => <option key={u.uniqueid} value={u.uniqueid}>{puLabel(u)}</option>)}
            </select>
          </div>
        </div>
      </div>
      {(lgas.error || units.error || result.error) && <p className="msg err" role="alert">{lgas.error || units.error || result.error}</p>}
      {result.loading && <p className="loading" role="status">Loading polling unit result…</p>}
      {result.data && (
        <div className="panel">
          <div className="result-heading">
            <div>
              <h2>{puLabel(result.data.unit)}</h2>
              <p className="muted">{[result.data.unit.ward_name, result.data.unit.lga_name].filter(Boolean).join(', ')}</p>
            </div>
            <span className="result-badge">POLLING UNIT</span>
          </div>
          {result.data.results.length === 0 ? (
            <p>No results have been recorded for this polling unit yet.</p>
          ) : (
            <div className="table-wrap"><ResultTable rows={result.data.results.map((r) => [r.party_abbreviation, r.party_score])} /></div>
          )}
        </div>
      )}
    </>
  );
}

function ResultTable({ rows }) {
  const total = rows.reduce((s, [, v]) => s + v, 0);
  const max = Math.max(...rows.map(([, v]) => v), 1);
  return (
    <table>
      <thead><tr><th>Party</th><th className="num">Votes</th></tr></thead>
      <tbody>
        {rows.map(([p, v]) => (
          <tr key={p}>
            <td className="bar"><span style={{ width: `${(v / max) * 100}%` }} /><b>{p}</b></td>
            <td className="num">{v.toLocaleString()}</td>
          </tr>
        ))}
        <tr><td><b>Total</b></td><td className="num"><b>{total.toLocaleString()}</b></td></tr>
      </tbody>
    </table>
  );
}
