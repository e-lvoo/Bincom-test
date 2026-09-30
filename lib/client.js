'use client';
import { useEffect, useState } from 'react';

export async function getJSON(url) {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

// Loads `url` whenever it changes; url === null means "not ready yet".
export function useApi(url) {
  const [state, set] = useState({ data: null, loading: !!url, error: '' });
  useEffect(() => {
    if (!url) { set({ data: null, loading: false, error: '' }); return; }
    let live = true;
    set({ data: null, loading: true, error: '' });
    getJSON(url)
      .then((data) => live && set({ data, loading: false, error: '' }))
      .catch((e) => live && set({ data: null, loading: false, error: e.message }));
    return () => { live = false; };
  }, [url]);
  return state;
}

export const puLabel = (u) =>
  [u.polling_unit_number, u.polling_unit_name].filter((x) => x && x.trim()).join(' - ') || `Polling unit ${u.uniqueid}`;
