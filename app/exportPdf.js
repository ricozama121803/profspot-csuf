import { rmpUrl } from './stats';

// jsPDF's built-in fonts only cover Latin-1, so map common punctuation and replace anything else
const pdfText = (s) =>
  String(s ?? '')
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/…/g, '...')
    .replace(/[^\x00-\xFF]/g, '?');

export async function exportPinnedPdf(pinned) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  const textW = W - M * 2;
  let y = M;
  const ensure = (h) => {
    if (y + h > H - M) {
      doc.addPage();
      y = M;
    }
  };
  const line = (text, { size = 11, style = 'normal', color = [40, 50, 70], gap = 4, indent = 0 } = {}) => {
    doc.setFont('helvetica', style).setFontSize(size).setTextColor(...color);
    const lines = doc.splitTextToSize(pdfText(text), textW - indent);
    for (const l of lines) {
      ensure(size + gap);
      doc.text(l, M + indent, y + size);
      y += size + gap;
    }
  };

  line('ProfSpot CSUF - Saved Professors', { size: 22, style: 'bold', color: [0, 55, 103], gap: 8 });
  line(`${pinned.length} professor${pinned.length === 1 ? '' : 's'} saved on ${new Date().toLocaleDateString()}`, { size: 10, color: [100, 115, 140], gap: 14 });

  pinned.forEach((p, i) => {
    ensure(110);
    doc.setDrawColor(200, 212, 230).line(M, y, W - M, y);
    y += 12;
    const url = rmpUrl(p.legacyId);
    doc.setFont('helvetica', 'bold').setFontSize(15).setTextColor(0, 55, 103);
    doc.textWithLink(pdfText(`${i + 1}. ${p.name}`), M, y + 15, { url });
    y += 24;
    if (p.department) line(p.department, { size: 11, color: [90, 105, 130] });
    const stats = [
      `Overall ${p.avgRating?.toFixed?.(1) ?? 'n/a'}/5 (${p.numRatings ?? '?'} ratings)`,
      `Difficulty ${p.avgDifficulty?.toFixed?.(1) ?? 'n/a'}/5`,
      typeof p.wouldTakeAgain === 'number' ? `Would take again ${p.wouldTakeAgain}%` : null,
    ].filter(Boolean);
    line(stats.join('   |   '), { size: 11, style: 'bold', gap: 6 });
    if (p.courses?.length) line(`Courses: ${p.courses.slice(0, 10).join(', ')}`, { size: 10, color: [90, 105, 130] });
    if (p.note?.trim()) line(`Note: ${p.note.trim()}`, { size: 11, style: 'italic', color: [200, 90, 0], gap: 5 });
    ensure(16);
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(40, 110, 190);
    doc.textWithLink(url, M, y + 10, { url });
    y += 26;
  });

  doc.save('profspot-csuf-saved-professors.pdf');
}
