"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const KEY = 'profspot-csuf.pinned.v1';
const PinContext = createContext(null);

// Saved ("thumbtacked") professors, kept only in this browser's localStorage. No accounts.
export function PinProvider({ children }) {
  const [pinned, setPinned] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setPinned(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(pinned));
    } catch {}
  }, [pinned, loaded]);

  const toggle = useCallback(
    (prof) =>
      setPinned((cur) =>
        cur.some((p) => p.id === prof.id) ? cur.filter((p) => p.id !== prof.id) : [...cur, { ...prof, note: '', savedAt: Date.now() }]
      ),
    []
  );
  const setNote = useCallback((id, note) => setPinned((cur) => cur.map((p) => (p.id === id ? { ...p, note } : p))), []);
  const clear = useCallback(() => setPinned([]), []);

  const value = useMemo(
    () => ({ pinned, isPinned: (id) => pinned.some((p) => p.id === id), toggle, setNote, clear }),
    [pinned, toggle, setNote, clear]
  );
  return <PinContext.Provider value={value}>{children}</PinContext.Provider>;
}

export const usePinned = () => useContext(PinContext);
