"use client";
import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { Close, Delete, OpenInNew, PictureAsPdf, PushPin, Star, LocalFireDepartment, ThumbUp } from '@mui/icons-material';
import { usePinned } from './pinned';
import { IconBadge, tone, rmpUrl } from './stats';
import { exportPinnedPdf } from './exportPdf';

function Stat({ Icon, color, label, value }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} title={label}>
      <IconBadge Icon={Icon} color={color} label={label} size={26} />
      <strong style={{ color }}>{value}</strong>
    </span>
  );
}

export default function PinnedPanel({ open, onClose }) {
  const { pinned, toggle, setNote, clear } = usePinned();
  const [exporting, setExporting] = useState(false);
  if (!open) return null;

  const doExport = async () => {
    setExporting(true);
    try {
      await exportPinnedPdf(pinned);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box sx={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', justifyContent: 'flex-end' }}>
      <Box onClick={onClose} sx={{ position: 'absolute', inset: 0, background: 'rgba(0, 35, 70, 0.35)' }} />
      <Box
        className="clay"
        role="dialog"
        aria-label="Saved professors"
        sx={{
          position: 'relative', width: 'min(440px, 100vw)', height: '100%', display: 'flex', flexDirection: 'column',
          borderRadius: { xs: 0, sm: '36px 0 0 36px' }, p: 2.5, gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconBadge Icon={PushPin} color="var(--csuf-orange)" label="Saved" size={40} />
          <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--csuf-blue)', flexGrow: 1 }}>
            Saved professors ({pinned.length})
          </Typography>
          <button className="clay-btn" onClick={onClose} aria-label="Close saved professors"
            style={{ width: 40, height: 40, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--clay-surface)', color: 'var(--csuf-blue)' }}>
            <Close />
          </button>
        </Box>

        <Box className="clay-scroll" sx={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, p: 0.5, pr: 1 }}>
          {pinned.length === 0 && (
            <Typography sx={{ color: 'var(--clay-ink-soft)', textAlign: 'center', mt: 6, px: 2, lineHeight: 1.6 }}>
              Nothing saved yet. Tap the 📌 next to a professor&apos;s name in the chat to keep them here while you plan your classes.
              Your list stays in this browser only.
            </Typography>
          )}
          {pinned.map((p) => (
            <Box key={p.id} sx={{ background: '#fff', borderRadius: '24px', p: 2, boxShadow: '5px 5px 12px -6px rgba(0,55,103,0.3), -4px -4px 10px -8px rgba(255,255,255,1)' }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <Box sx={{ flexGrow: 1 }}>
                  <a href={rmpUrl(p.legacyId)} target="_blank" rel="noreferrer" title="View on RateMyProfessors"
                    style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--csuf-blue)', textDecoration: 'none' }}>
                    {p.name} <OpenInNew style={{ fontSize: 15, color: 'var(--csuf-orange)', verticalAlign: -2 }} />
                  </a>
                  <Typography sx={{ color: 'var(--clay-ink-soft)', fontSize: '0.9rem' }}>{p.department}</Typography>
                </Box>
                <button onClick={() => toggle(p)} aria-label={`Remove ${p.name}`} title="Remove"
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--clay-ink-soft)', padding: 4 }}>
                  <Delete />
                </button>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1.5 }}>
                <Stat Icon={Star} label="Overall rating" value={`${p.avgRating?.toFixed?.(1)}/5`} color={tone(p.avgRating, 1, 5)} />
                <Stat Icon={LocalFireDepartment} label="Difficulty" value={`${p.avgDifficulty?.toFixed?.(1)}/5`} color={tone(p.avgDifficulty, 1, 5, true)} />
                {typeof p.wouldTakeAgain === 'number' && (
                  <Stat Icon={ThumbUp} label="Would take again" value={`${p.wouldTakeAgain}%`} color={tone(p.wouldTakeAgain, 0, 100)} />
                )}
              </Box>
              <Typography sx={{ color: 'var(--clay-ink-soft)', fontSize: '0.8rem', mt: 1 }}>
                {p.numRatings} ratings{p.courses?.length ? ` · ${p.courses.slice(0, 5).join(', ')}` : ''}
              </Typography>
              <Box className="clay-inset" sx={{ mt: 1.5, borderRadius: '16px' }}>
                <textarea
                  value={p.note || ''}
                  onChange={(e) => setNote(p.id, e.target.value)}
                  placeholder="Add a note (course, schedule, questions…)"
                  aria-label={`Note for ${p.name}`}
                  rows={2}
                  className="clay-input"
                  style={{ borderRadius: 16, resize: 'vertical', fontSize: '0.9rem', padding: '10px 14px' }}
                />
              </Box>
            </Box>
          ))}
        </Box>

        {pinned.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <button className="clay-btn" onClick={doExport} disabled={exporting}
              style={{ flexGrow: 1, padding: '14px 20px', borderRadius: 999, background: 'var(--csuf-orange)', color: '#fff', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <PictureAsPdf /> {exporting ? 'Creating PDF…' : 'Export PDF'}
            </button>
            <button className="clay-btn" onClick={() => window.confirm('Remove all saved professors?') && clear()}
              style={{ padding: '14px 18px', borderRadius: 999, background: 'var(--clay-surface)', color: 'var(--csuf-blue)', fontWeight: 700 }}>
              Clear
            </button>
          </Box>
        )}
      </Box>
    </Box>
  );
}
