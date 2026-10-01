import { Star, LocalFireDepartment, ThumbUp, School, MenuBook, Notes } from '@mui/icons-material';

export const rmpUrl = (legacyId) => `https://www.ratemyprofessors.com/professor/${legacyId}`;

const GOOD = '#1e9e5a', OK = '#e0a000', BAD = '#d9452f';
// ratings run 1-5 on RMP; higher is better unless `invert` (difficulty)
export const tone = (value, min, max, invert) => {
  const r = (invert ? max - value : value - min) / (max - min);
  return r >= 0.7 ? GOOD : r >= 0.5 ? OK : BAD;
};
const BLUE = 'var(--csuf-blue)';

export const STATS = [
  { re: /^overall( rating)?/i, label: 'Overall Rating', Icon: Star, numeric: true, color: (t) => tone(parseFloat(t), 1, 5) },
  { re: /^difficulty/i, label: 'Difficulty', Icon: LocalFireDepartment, numeric: true, color: (t) => tone(parseFloat(t), 1, 5, true) },
  { re: /^would take again/i, label: 'Would Take Again', Icon: ThumbUp, numeric: true, color: (t) => tone(parseFloat(t), 0, 100) },
  { re: /^department/i, label: 'Department', Icon: School, color: () => BLUE },
  { re: /^courses?/i, label: 'Courses', Icon: MenuBook, color: () => BLUE },
  { re: /^summary/i, label: 'Summary', Icon: Notes, color: () => BLUE },
];

export function IconBadge({ Icon, color, label, size = 30 }) {
  return (
    <span
      className="clay-inset"
      style={{ width: size, height: size, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0, color }}
      title={label}
    >
      <Icon style={{ fontSize: size * 0.6 }} />
    </span>
  );
}
