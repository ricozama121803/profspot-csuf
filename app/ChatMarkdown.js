"use client";
import ReactMarkdown from 'react-markdown';
import { OpenInNew, PushPin, PushPinOutlined } from '@mui/icons-material';
import { STATS, IconBadge, rmpUrl } from './stats';
import { usePinned } from './pinned';

// Turns "- **Overall Rating:** 4.4/5 (44 ratings)" list items into icon rows with color-coded values.
const textOf = (node) =>
  typeof node === 'string' || typeof node === 'number'
    ? String(node)
    : Array.isArray(node)
      ? node.map(textOf).join('')
      : node?.props?.children !== undefined
        ? textOf(node.props.children)
        : '';

function StatItem({ children, node, ...rest }) {
  const match = textOf(children).trim().match(/^([A-Za-z ]+?)\s*:\s*([\s\S]*)$/);
  const stat = match && STATS.find((s) => s.re.test(match[1].trim()));
  if (!stat) return <li {...rest}>{children}</li>;
  const value = match[2].trim();
  const color = stat.color(value);
  return (
    <li style={{ listStyle: 'none', margin: '6px 0 0 -1.25rem', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <IconBadge Icon={stat.Icon} color={color} label={stat.label} />
      <span style={{ paddingTop: 4 }}>
        <span style={{ color: 'var(--clay-ink-soft)', fontSize: '0.8rem', fontWeight: 700, marginRight: 6 }}>{stat.label}</span>
        <span style={stat.numeric ? { fontWeight: 800, color } : undefined}>{value}</span>
      </span>
    </li>
  );
}

const norm = (s) => String(s).toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();

// "### Professor Name" -> name linked to RateMyProfessors + a thumbtack button, using the retrieved professor data.
function ProfHeading({ children, professors, ...rest }) {
  const { isPinned, toggle } = usePinned();
  const title = norm(textOf(children));
  const prof = professors?.find((p) => {
    const n = norm(p.name);
    return title.includes(n) || n.includes(title);
  });
  if (!prof) return <h3>{children}</h3>;
  const pinned = isPinned(prof.id);
  return (
    <h3 style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <a
        href={rmpUrl(prof.legacyId)}
        target="_blank"
        rel="noreferrer"
        title="View on RateMyProfessors"
        style={{ color: 'inherit', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
      >
        {children}
        <OpenInNew style={{ fontSize: 16, color: 'var(--csuf-orange)' }} />
      </a>
      <button
        className="clay-btn"
        onClick={() => toggle(prof)}
        aria-pressed={pinned}
        aria-label={pinned ? `Remove ${prof.name} from saved professors` : `Save ${prof.name}`}
        title={pinned ? 'Remove from saved' : 'Save for later'}
        style={{
          width: 32, height: 32, borderRadius: '50%', display: 'grid', placeItems: 'center',
          background: pinned ? 'var(--csuf-orange)' : 'var(--clay-surface)',
          color: pinned ? '#fff' : 'var(--csuf-blue)',
        }}
      >
        {pinned ? <PushPin style={{ fontSize: 18 }} /> : <PushPinOutlined style={{ fontSize: 18 }} />}
      </button>
    </h3>
  );
}

export default function ChatMarkdown({ content, professors }) {
  return (
    <ReactMarkdown components={{ li: StatItem, h3: (props) => <ProfHeading {...props} professors={professors} /> }}>
      {content || '…'}
    </ReactMarkdown>
  );
}
