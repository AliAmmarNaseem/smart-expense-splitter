import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Constants ─────────────────────────────────────────────
const FOOTER_RESERVE = 22;
const SAFE_TOP = 32;
const M = 20;

// ─── Helpers ───────────────────────────────────────────────

const makeFmt = (code) => {
  const syms = { PKR: 'Rs', USD: '$', AED: 'AED', GBP: '£', SAR: 'SAR' };
  const sym = syms[code] || 'Rs';
  return (n) => `${sym} ${Math.abs(Number(n)).toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const chk = (doc, y, need, ph) => {
  if (y + need > ph - FOOTER_RESERVE) { doc.addPage(); return SAFE_TOP; }
  return y;
};

const secTitle = (doc, y, text, pw) => {
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text(text, M, y);
  const w = doc.getTextWidth(text);
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.8);
  doc.line(M, y + 2.5, M + w, y + 2.5);
  doc.setLineWidth(0.2);
  return y + 12;
};

const fmtDate = (s) => {
  if (!s || s === 'No date') return 'No date';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    try { return new Date(s + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return s; }
  }
  return s;
};

const actualPaid = (person, expenses) =>
  expenses.reduce((s, e) => {
    if (e.paymentMode === 'multiple' && e.payers) {
      const entry = e.payers.find(p => p.name === person);
      return s + (entry ? entry.amount : 0);
    }
    return s + (e.payer === person ? e.amount : 0);
  }, 0);

const paidByText = (e, disp, lang) => {
  if (e.paymentMode === 'multiple' && e.payers && e.payers.length > 0) {
    return e.payers.map(p => `${disp(p.name, lang)}: ${p.amount.toLocaleString('en')}`).join('\n');
  }
  return disp(e.payer || '', lang);
};

// ─── 1. Header ─────────────────────────────────────────────
const genHeader = (doc, pw, tripName, expenses, isUrdu) => {
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, pw, 42, 'F');
  doc.setFillColor(79, 70, 229);
  doc.rect(pw * 0.65, 0, pw * 0.35, 42, 'F');

  const init = tripName ? tripName.charAt(0).toUpperCase() : 'S';
  doc.setFillColor(255, 255, 255);
  doc.circle(32, 21, 13, 'F');
  doc.setTextColor(59, 130, 246);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(init, 32, 27, { align: 'center' });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(isUrdu ? 'Akhrajat Ki Tafseel' : 'Expense Report', 53, 20);

  const sub = tripName || (isUrdu ? 'Mushtarqa Akhrajat' : 'Shared Expenses');
  const sortedDates = [...expenses].map(e => e.date).filter(Boolean).sort();
  const dateStr = sortedDates.length > 1
    ? `${fmtDate(sortedDates[0])} - ${fmtDate(sortedDates[sortedDates.length - 1])}`
    : sortedDates.length === 1 ? fmtDate(sortedDates[0]) : '';
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${sub}${dateStr ? '  |  ' + dateStr : ''}`, 53, 33);
  return 55;
};

// ─── 2. Executive Summary ───────────────────────────────────
const genSummary = (doc, pw, ph, y, data, isUrdu, fmt, bullets) => {
  const { totalExpense, participants, expenses } = data;
  y = chk(doc, y, 85, ph);

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text(isUrdu ? 'Khulasa' : 'Executive Summary', M, y);
  y += 12;

  const cw = (pw - 2 * M - 20) / 3;
  const ch = 28;
  const card = (x, label, val, col) => {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, cw, ch, 3, 3, 'FD');
    doc.setFillColor(...col);
    doc.rect(x, y, 3, ch, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(label, x + 8, y + 10);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text(val, x + 8, y + 22);
  };
  card(M, isUrdu ? 'Kul Raqam' : 'Total Spent', fmt(totalExpense), [59, 130, 246]);
  card(M + cw + 10, isUrdu ? 'Shurka' : 'Participants', String(participants.length), [16, 185, 129]);
  card(M + (cw + 10) * 2, isUrdu ? 'Len Den' : 'Expenses', String(expenses.length), [245, 158, 11]);
  y += ch + 12;

  if (bullets && bullets.length > 0) {
    const lh = 11;
    const bh = bullets.length * lh + 22;
    y = chk(doc, y, bh + 10, ph);
    doc.setFillColor(254, 252, 232);
    doc.setDrawColor(217, 119, 6);
    doc.setLineWidth(0.5);
    doc.roundedRect(M, y, pw - 2 * M, bh, 3, 3, 'FD');
    doc.setFillColor(217, 119, 6);
    doc.rect(M, y, 3, bh, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9);
    doc.text(isUrdu ? 'Zaroori Note:' : 'PAYMENT SUMMARY:', M + 8, y + 10);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 41, 55);
    let ty = y + 18;
    bullets.forEach(b => { doc.text(`• ${b.replace(/^[•\-]\s*/, '')}`, M + 8, ty); ty += lh; });
    y += bh + 12;
  }
  return y;
};

// ─── 3. Spending by Person (FIXED: counts multiple payers) ─
const genSpendingChart = (doc, pw, ph, y, participants, expenses, isUrdu, disp, lang, fmt) => {
  if (!participants.length) return y;
  y = chk(doc, y, participants.length * 14 + 35, ph);
  y = secTitle(doc, y, isUrdu ? 'Kon Kitna Kharch Kar Raha Hai?' : 'Spending by Person', pw);

  const spending = participants
    .map(p => ({ name: p, amount: actualPaid(p, expenses) }))
    .sort((a, b) => b.amount - a.amount);
  const maxAmt = Math.max(...spending.map(s => s.amount), 1);
  const nameW = 45;
  const barMaxW = pw - 2 * M - nameW - 38;
  const barH = 9;

  spending.forEach(item => {
    y = chk(doc, y, 15, ph);
    doc.setFontSize(9);
    doc.setFont('helvetica', item.amount > 0 ? 'bold' : 'normal');
    doc.setTextColor(55, 65, 81);
    doc.text(disp(item.name, lang), M, y + 6.5);

    doc.setFillColor(229, 231, 235);
    doc.roundedRect(M + nameW, y, barMaxW, barH, 2, 2, 'F');
    const bw = Math.max((item.amount / maxAmt) * barMaxW, item.amount > 0 ? 3 : 0);
    if (bw > 0) {
      doc.setFillColor(59, 130, 246);
      doc.roundedRect(M + nameW, y, bw, barH, 2, 2, 'F');
    }
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(fmt(item.amount), M + nameW + barMaxW + 4, y + 6.5);
    y += barH + 5;
  });
  return y + 8;
};

// ─── 4. Balance Visualization (NEW) ────────────────────────
const genBalanceViz = (doc, pw, ph, y, result, participants, isUrdu, disp, lang, fmt) => {
  if (!result) return y;
  const people = Object.entries(result.balances).filter(([, b]) => Math.abs(b) > 0.01);
  if (!people.length) return y;

  y = chk(doc, y, people.length * 14 + 40, ph);
  y = secTitle(doc, y, isUrdu ? 'Har Shakhs Ka Balance' : 'Balance Overview', pw);

  const midX = pw / 2;
  const halfBarW = (pw - 2 * M - 55) / 2;
  const barH = 9;
  const maxAbs = Math.max(...people.map(([, b]) => Math.abs(b)), 1);

  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(0.4);
  doc.line(midX, y - 3, midX, y + people.length * 14 + 3);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(156, 163, 175);
  doc.text(isUrdu ? '<- Dena Hai' : '<- Owes', midX - 4, y - 5, { align: 'right' });
  doc.text(isUrdu ? 'Lena Hai ->' : 'Gets back ->', midX + 4, y - 5);

  people.sort((a, b) => b[1] - a[1]).forEach(([person, balance]) => {
    y = chk(doc, y, 15, ph);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(55, 65, 81);
    doc.text(disp(person, lang), M, y + 6.5);

    const bw = (Math.abs(balance) / maxAbs) * halfBarW;
    if (balance > 0) {
      doc.setFillColor(34, 197, 94);
      doc.roundedRect(midX, y, bw, barH, 2, 2, 'F');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(21, 128, 61);
      doc.text(`+${fmt(balance)}`, midX + bw + 3, y + 6.5);
    } else {
      doc.setFillColor(239, 68, 68);
      doc.roundedRect(midX - bw, y, bw, barH, 2, 2, 'F');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(185, 28, 28);
      doc.text(`-${fmt(Math.abs(balance))}`, midX - bw - 3, y + 6.5, { align: 'right' });
    }
    y += barH + 5;
  });
  return y + 10;
};

// ─── 5. Settlement Plan (two-column for 4+ txs) ────────────
const drawTxCard = (doc, x, y, w, h, tx, disp, lang, fmt) => {
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(167, 243, 208);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');
  doc.setFillColor(16, 185, 129);
  doc.rect(x, y, 3, h, 'F');

  const from = disp(tx.from, lang);
  const to = disp(tx.to, lang);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text(from, x + 7, y + 9);
  const fromW = doc.getTextWidth(from);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(156, 163, 175);
  doc.text('->', x + 7 + fromW + 2, y + 9);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text(to, x + 7 + fromW + 11, y + 9);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 163, 74);
  doc.text(fmt(tx.amount), x + w - 6, y + 15, { align: 'right' });
};

const genSettlement = (doc, pw, ph, y, result, isUrdu, disp, lang, fmt) => {
  if (!result) return y;
  y = chk(doc, y, 40, ph);
  y = secTitle(doc, y, isUrdu ? 'Hisab Kitab (Settlement)' : 'Settlement Plan', pw);

  if (!result.transactions.length) {
    y = chk(doc, y, 30, ph);
    doc.setFillColor(220, 252, 231);
    doc.setDrawColor(134, 239, 172);
    doc.roundedRect(M, y, pw - 2 * M, 24, 3, 3, 'FD');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 163, 74);
    doc.text(isUrdu ? 'Sab hisab barabar! Koi payment nahi.' : 'All settled up! No payments needed.', pw / 2, y + 15, { align: 'center' });
    return y + 38;
  }

  const txs = result.transactions;
  const cardH = 22;
  const cardGap = 6;

  if (txs.length >= 4) {
    const colW = (pw - 2 * M - 8) / 2;
    const rows = Math.ceil(txs.length / 2);
    for (let r = 0; r < rows; r++) {
      y = chk(doc, y, cardH + cardGap, ph);
      const li = r * 2, ri = r * 2 + 1;
      drawTxCard(doc, M, y, colW, cardH, txs[li], disp, lang, fmt);
      if (txs[ri]) drawTxCard(doc, M + colW + 8, y, colW, cardH, txs[ri], disp, lang, fmt);
      y += cardH + cardGap;
    }
  } else {
    txs.forEach(tx => {
      y = chk(doc, y, cardH + cardGap, ph);
      drawTxCard(doc, M, y, pw - 2 * M, cardH, tx, disp, lang, fmt);
      y += cardH + cardGap;
    });
  }
  return y + 8;
};

// ─── 6. Original Debts ──────────────────────────────────────
const genOriginalDebts = (doc, pw, ph, y, result, isUrdu, disp, lang, fmt) => {
  if (!result || !result.originalDebts || !result.originalDebts.length) return y;
  y = chk(doc, y, 50, ph);
  y = secTitle(doc, y, isUrdu ? 'Asli Hisab (Optimize Se Pehle)' : 'Original Debts (Pre-Optimization)', pw);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(156, 163, 175);
  doc.text(
    isUrdu ? 'Yeh woh qarzay hain jo optimize hone se pehle the.' : 'Raw debt relationships before the settlement was minimized.',
    M, y
  );
  y += 9;

  autoTable(doc, {
    head: [[isUrdu ? 'Qarzdar' : 'Debtor', '', isUrdu ? 'Jis Ko Dena Hai' : 'Creditor', isUrdu ? 'Raqam' : 'Amount']],
    body: result.originalDebts.map(d => [disp(d.from, lang), '->', disp(d.to, lang), fmt(d.amount)]),
    startY: y,
    theme: 'plain',
    headStyles: { fillColor: [243, 244, 246], textColor: [107, 114, 128], fontSize: 8, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3.5, textColor: [55, 65, 81] },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' },
      1: { cellWidth: 12, halign: 'center', textColor: [156, 163, 175] },
      2: { cellWidth: 55, fontStyle: 'bold' },
      3: { halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] },
    },
    margin: { left: M, right: M },
  });
  return doc.lastAutoTable.finalY + 15;
};

// ─── 7. Per-Person Statements ───────────────────────────────
const genPerPersonStatements = (doc, pw, ph, y, participants, expenses, result, isUrdu, disp, lang, fmt) => {
  if (!participants.length) return y;
  y = chk(doc, y, 50, ph);
  y = secTitle(doc, y, isUrdu ? 'Har Shakhs Ka Hisab' : 'Per-Person Statements', pw);

  const colW = (pw - 2 * M - 10) / 2;
  const cardH = 60;
  const cardGap = 8;

  participants.forEach((person, idx) => {
    const col = idx % 2;
    if (col === 0) y = chk(doc, y, cardH + cardGap, ph);
    const cx = col === 0 ? M : M + colW + 10;

    const paid = actualPaid(person, expenses);
    const myExps = expenses.filter(e => e.participants && e.participants.includes(person));
    const myShare = myExps.reduce((s, e) => s + (e.splits && e.splits[person] ? e.splits[person] : 0), 0);
    const balance = result && result.balances && result.balances[person] !== undefined ? result.balances[person] : 0;
    const accentR = balance >= 0 ? 16 : 239;
    const accentG = balance >= 0 ? 185 : 68;
    const accentB = balance >= 0 ? 129 : 68;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.roundedRect(cx, y, colW, cardH, 3, 3, 'FD');
    doc.setFillColor(accentR, accentG, accentB);
    doc.rect(cx, y, 3, cardH, 'F');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text(disp(person, lang), cx + 8, y + 12);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(`${myExps.length} expense${myExps.length !== 1 ? 's' : ''}`, cx + 8, y + 20);

    const statRows = [
      [isUrdu ? 'Diya (actual)' : 'Paid out', fmt(paid), 59, 130, 246],
      [isUrdu ? 'Hissa (share)' : 'Share owed', fmt(myShare), 245, 158, 11],
    ];
    let sy = y + 30;
    statRows.forEach(([lbl, val, r, g, b]) => {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text(lbl, cx + 8, sy);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(r, g, b);
      doc.text(val, cx + colW - 6, sy, { align: 'right' });
      sy += 9;
    });

    const bgR = balance >= 0 ? 220 : 254;
    const bgG = balance >= 0 ? 252 : 226;
    const bgB = balance >= 0 ? 231 : 226;
    doc.setFillColor(bgR, bgG, bgB);
    doc.roundedRect(cx + 6, y + cardH - 15, colW - 12, 11, 2, 2, 'F');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(accentR, accentG, accentB);
    const netLbl = balance >= 0
      ? (isUrdu ? 'Milenge: ' : 'Gets back: ')
      : (isUrdu ? 'Dene hain: ' : 'Owes: ');
    doc.text(`${netLbl}${fmt(Math.abs(balance))}`, cx + colW / 2, y + cardH - 7, { align: 'center' });

    if (col === 1 || idx === participants.length - 1) y += cardH + cardGap;
  });
  return y + 5;
};

// ─── 8. Expenses by Date with Notes (FIXED) ────────────────
const genExpensesByDate = (doc, pw, ph, y, expenses, isUrdu, disp, lang, fmt) => {
  if (!expenses.length) return y;
  y = chk(doc, y, 40, ph);
  y = secTitle(doc, y, isUrdu ? 'Tafseelat' : 'Expense Details', pw);

  const sorted = [...expenses].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const heads = isUrdu
    ? ['Tafseel', 'Ada Kiya', 'Shamil Log', 'Raqam']
    : ['Description', 'Paid By', 'Split Among', 'Amount'];

  const body = [];
  let lastDate = null;

  sorted.forEach(e => {
    const d = e.date || 'No date';
    if (d !== lastDate) {
      body.push([{
        content: `  ${fmtDate(d)}`,
        colSpan: 4,
        styles: {
          fillColor: [219, 234, 254],
          textColor: [29, 78, 216],
          fontStyle: 'bold',
          fontSize: 9,
          cellPadding: { top: 4, bottom: 4, left: 6, right: 4 }
        }
      }]);
      lastDate = d;
    }

    // Build "Paid By" cell — shows multiple payers on separate lines
    const paidCell = paidByText(e, disp, lang);

    const descContent = e.notes ? `${e.description}\n  ${e.notes}` : e.description;

    body.push([
      { content: descContent, styles: { textColor: [31, 41, 55] } },
      { content: paidCell, styles: { textColor: e.paymentMode === 'multiple' ? [109, 40, 217] : [55, 65, 81], fontStyle: e.paymentMode === 'multiple' ? 'bold' : 'normal' } },
      e.participants.map(p => disp(p, lang)).join(', '),
      { content: fmt(e.amount), styles: { halign: 'right', fontStyle: 'bold', textColor: [22, 163, 74] } }
    ]);
  });

  autoTable(doc, {
    head: [heads],
    body,
    startY: y,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    styles: { fontSize: 8.5, cellPadding: 3.5, textColor: [55, 65, 81], overflow: 'linebreak' },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 42 },
      2: { cellWidth: 48 },
      3: { cellWidth: 25, halign: 'right' },
    },
    margin: { left: M, right: M },
  });

  return doc.lastAutoTable.finalY + 15;
};

// ─── 9. Footer ──────────────────────────────────────────────
const genFooter = (doc, pw, ph) => {
  const n = doc.internal.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.line(M, ph - 14, pw - M, ph - 14);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(156, 163, 175);
    doc.text(`Generated ${new Date().toLocaleDateString()} | Page ${i} of ${n}`, M, ph - 7);
    doc.text('Smart Expense Splitter', pw - M, ph - 7, { align: 'right' });
  }
};

// ─── Main Export ────────────────────────────────────────────
export const generatePDF = ({
  tripName, participants, expenses, totalExpense, result,
  pdfLanguage, urduNameMap, displayNameForLanguage, summaryBullets,
  currency = 'PKR', compact = false,
}) => {
  const isUrdu = pdfLanguage === 'ur';
  const fmt = makeFmt(currency);
  const disp = displayNameForLanguage || ((n) => n);

  const doc = new jsPDF();
  const pw = doc.internal.pageSize.width;
  const ph = doc.internal.pageSize.height;

  let y = genHeader(doc, pw, tripName, expenses, isUrdu);
  y = genSummary(doc, pw, ph, y, { totalExpense, participants, expenses, result }, isUrdu, fmt, summaryBullets);

  if (!compact) {
    y = genSpendingChart(doc, pw, ph, y, participants, expenses, isUrdu, disp, pdfLanguage, fmt);
    y = genBalanceViz(doc, pw, ph, y, result, participants, isUrdu, disp, pdfLanguage, fmt);
  }

  if (result) {
    y = genSettlement(doc, pw, ph, y, result, isUrdu, disp, pdfLanguage, fmt);
    if (!compact) y = genOriginalDebts(doc, pw, ph, y, result, isUrdu, disp, pdfLanguage, fmt);
  }

  if (!compact) {
    y = genPerPersonStatements(doc, pw, ph, y, participants, expenses, result, isUrdu, disp, pdfLanguage, fmt);
  }

  y = genExpensesByDate(doc, pw, ph, y, expenses, isUrdu, disp, pdfLanguage, fmt);

  genFooter(doc, pw, ph);

  const fname = tripName
    ? `${tripName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`
    : `expense_report_${new Date().toISOString().split('T')[0]}.pdf`;

  doc.save(fname);
};
