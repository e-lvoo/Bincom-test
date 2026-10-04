'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useApi } from '@/lib/client';

// Q3: add a polling unit and the scores of every party. LGA -> ward chained selects.
export default function NewPollingUnit() {
  const [lga, setLga] = useState('');
  const [ward, setWard] = useState('');
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [scores, setScores] = useState({});
  const [status, setStatus] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);
  const [savedId, setSavedId] = useState(null);

  const lgas = useApi('/api/lgas');
  const wards = useApi(lga ? `/api/wards?lga=${lga}` : null);
  const parties = useApi('/api/parties');

  async function save(e) {
    e.preventDefault();
    const parsed = {};
    for (const p of parties.data || []) {
      const raw = (scores[p] ?? '').trim();
      if (!/^\d+$/.test(raw)) return setStatus({ type: 'err', text: `Enter a whole number (0 or more) for ${p}.` });
      parsed[p] = Number(raw);
    }
    setBusy(true); setStatus({ type: '', text: '' });
    try {
      const res = await fetch('/api/polling-units', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lgaId: Number(lga), wardUniqueId: Number(ward), name, number, scores: parsed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save.');
      setSavedId(data.uniqueid);
      setStatus({ type: 'ok', text: `Saved "${name.trim()}" with results for ${parties.data.length} parties.` });
      setName(''); setNumber(''); setScores({});
    } catch (err) { setStatus({ type: 'err', text: err.message }); }
    finally { setBusy(false); }
  }

  const err = lgas.error || wards.error || parties.error;
  return (
    <>
      <h1>Add polling unit</h1>
      <p className="lead">Record a new polling unit and the votes each party received.</p>
      <form onSubmit={save} className="panel">
        <div className="field">
          <label htmlFor="lga">Local government</label>
          <select id="lga" required value={lga} onChange={(e) => { setLga(e.target.value); setWard(''); }}>
            <option value="">{lgas.loading ? 'Loading...' : 'Select a local government'}</option>
            {(lgas.data || []).map((l) => <option key={l.lga_id} value={l.lga_id}>{l.lga_name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="ward">Ward</label>
          <select id="ward" required value={ward} disabled={!lga || wards.loading} onChange={(e) => setWard(e.target.value)}>
            <option value="">{!lga ? 'Choose a local government first' : wards.loading ? 'Loading...' : 'Select a ward'}</option>
            {(wards.data || []).map((w) => <option key={w.uniqueid} value={w.uniqueid}>{w.ward_name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="name">Polling unit name</label>
          <input id="name" required maxLength={50} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="number">Polling unit number <span className="muted">(optional)</span></label>
          <input id="number" maxLength={50} value={number} onChange={(e) => setNumber(e.target.value)} />
        </div>
        <fieldset style={{ border: 0, padding: 0, margin: '0 0 14px' }}>
          <legend style={{ fontWeight: 600, marginBottom: 6 }}>Votes per party</legend>
          <div className="grid">
            {(parties.data || []).map((p) => (
              <div key={p}>
                <label htmlFor={`s-${p}`} className="muted" style={{ fontWeight: 500 }}>{p}</label>
                <input id={`s-${p}`} required inputMode="numeric" pattern="\d+" title="Whole number, 0 or more"
                  value={scores[p] ?? ''} onChange={(e) => setScores({ ...scores, [p]: e.target.value })} />
              </div>
            ))}
          </div>
        </fieldset>
        {(err) && <p className="msg err" role="alert">{err}</p>}
        {status.text && <p className={`msg ${status.type}`} role={status.type === 'err' ? 'alert' : 'status'}>
          {status.text} {status.type === 'ok' && savedId && <Link href="/" style={{ color: 'inherit' }}>View it under Polling unit result.</Link>}
        </p>}
        <button type="submit" disabled={busy || !parties.data}>{busy ? 'Saving...' : 'Save polling unit'}</button>
      </form>
    </>
  );
}
