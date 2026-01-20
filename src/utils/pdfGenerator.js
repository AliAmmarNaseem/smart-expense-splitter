import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper to format currency
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: 'PKR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

// --- 1. Header Generator ---
const generateHeader = (doc, pageWidth, margin, tripName, expenses, isUrdu) => {
    // Background header
    doc.setFillColor(59, 130, 246); // Blue-500
    doc.rect(0, 0, pageWidth, 40, 'F');

    // Trip Icon (Circle with first letter)
    const iconChar = tripName ? tripName.charAt(0).toUpperCase() : (isUrdu ? 'M' : 'S');
    doc.setFillColor(255, 255, 255);
    doc.circle(30, 20, 12, 'F');
    doc.setTextColor(59, 130, 246);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(iconChar, 30, 26, { align: 'center' });

    // Main Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    const mainTitle = isUrdu ? 'Akhrajat Ki Tafseel' : 'Expense Report';
    doc.text(mainTitle, 50, 22);

    // Subtitle (Trip Name & Date)
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    const tripTitle = tripName || (isUrdu ? "Mushtarqa Akhrajat" : "Shared Expenses");

    const dateRange = expenses.length > 0
        ? expenses.length === 1
            ? expenses[0].date
            : `${expenses[0].date} - ${expenses[expenses.length - 1].date}`
        : '';
    doc.text(`${tripTitle}  |  ${dateRange}`, 50, 32);

    return 60; // Return new Y position
};

// --- 2. Executive Summary Generator ---
const generateExecutiveSummary = (doc, pageWidth, margin, startY, data, isUrdu, summaryBullets) => {
    let yPos = startY;
    const { totalExpense, participants, expenses } = data;

    doc.setTextColor(31, 41, 55); // Gray-800
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    const title = isUrdu ? "Khulasa" : "Executive Summary";
    doc.text(title, margin, yPos);
    yPos += 15;

    // Draw 3 Summary Cards
    const cardWidth = (pageWidth - (2 * margin) - 20) / 3;
    const cardHeight = 25;

    const drawCard = (x, label, value, color) => {
        // Card bg
        doc.setFillColor(243, 244, 246); // Gray-100
        doc.setDrawColor(229, 231, 235); // Gray-200
        doc.roundedRect(x, yPos, cardWidth, cardHeight, 3, 3, 'FD');

        // Left border accent
        doc.setFillColor(...color);
        doc.rect(x, yPos, 2, cardHeight, 'F');

        // Label
        doc.setTextColor(107, 114, 128); // Gray-500
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(label, x + 10, yPos + 10);

        // Value
        doc.setTextColor(17, 24, 39); // Gray-900
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(value, x + 10, yPos + 20);
    };

    drawCard(margin, isUrdu ? "Kul Raqam" : "Total Spent", formatCurrency(totalExpense), [59, 130, 246]); // Blue
    drawCard(margin + cardWidth + 10, isUrdu ? "Shurka" : "Participants", participants.length.toString(), [16, 185, 129]); // Green
    drawCard(margin + (cardWidth + 10) * 2, isUrdu ? "Len Den" : "Transactions", expenses.length.toString(), [245, 158, 11]); // Orange

    yPos += cardHeight + 15;

    // Add Settlement Sentences with High Impact Design
    if (summaryBullets && summaryBullets.length > 0) {
        // Calculate box height based on number of bullets
        const lineHeight = 12;
        const padding = 10;
        const boxHeight = (summaryBullets.length * lineHeight) + (padding * 2);

        // Draw Yellow "Note" Background
        doc.setFillColor(255, 251, 235); // Amber-50 (Very light yellow)
        doc.setDrawColor(245, 158, 11); // Amber-500 (Border)
        doc.setLineWidth(0.5);
        doc.roundedRect(margin - 5, yPos, pageWidth - (margin * 2) + 10, boxHeight, 3, 3, 'FD');

        // Add "Important" Icon/Label
        doc.setFontSize(10);
        doc.setTextColor(180, 83, 9); // Amber-700
        doc.setFont("helvetica", "bold");
        doc.text(isUrdu ? "Zaroori Note:" : "PAYMENT SUMMARY:", margin, yPos + 8);

        // Adjust Y position for text start
        let textY = yPos + padding + 8;

        doc.setFontSize(14); // Large font
        doc.setTextColor(31, 41, 55); // Gray-900 (High contrast)
        doc.setFont("helvetica", "bold"); // Bold text

        summaryBullets.forEach(bullet => {
            const cleanBullet = bullet.replace(/^[•-]\s*/, '');
            doc.text(`•  ${cleanBullet}`, margin + 5, textY);
            textY += lineHeight;
        });

        yPos += boxHeight + 10;
    }

    return yPos + 10;
};

// --- 3. Spending Chart Generator ---
const generateSpendingChart = (doc, pageWidth, margin, startY, participants, expenses, isUrdu, displayNameFn, lang) => {
    let yPos = startY;

    doc.setTextColor(31, 41, 55);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    const title = isUrdu ? "Kon Kitna Kharch Kar Raha Hai?" : "Spending by Person";
    doc.text(title, margin, yPos);
    yPos += 15;

    // Calculate spending per person
    const spending = participants.map(p => {
        const amount = expenses
            .filter(e => e.payer === p)
            .reduce((sum, e) => sum + e.amount, 0);
        return { name: p, amount };
    }).sort((a, b) => b.amount - a.amount);

    const maxSpend = Math.max(...spending.map(s => s.amount), 1); // Avoid div by 0
    const chartWidth = pageWidth - (2 * margin) - 40; // Space for labels
    const barHeight = 10;
    const gap = 8;

    spending.forEach((item) => {
        // Name Label
        doc.setTextColor(55, 65, 81);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const displayName = displayNameFn(item.name, lang);
        doc.text(displayName, margin, yPos + 7);

        // Bar
        const barWidth = (item.amount / maxSpend) * chartWidth;
        if (barWidth > 0) {
            doc.setFillColor(59, 130, 246); // Blue
            doc.roundedRect(margin + 40, yPos, barWidth, barHeight, 2, 2, 'F');
        }

        // Amount Label
        doc.setTextColor(107, 114, 128);
        doc.setFontSize(9);
        doc.text(formatCurrency(item.amount), margin + 40 + barWidth + 5, yPos + 7);

        yPos += barHeight + gap;
    });

    return yPos + 10;
};

// --- 4. Settlement Section Generator ---
const generateSettlementSection = (doc, pageWidth, pageHeight, margin, startY, result, isUrdu, displayNameFn, lang, urduNameMap) => {
    let yPos = startY;

    // Check page break
    if (yPos > pageHeight - 100) {
        doc.addPage();
        yPos = 30;
    }

    doc.setTextColor(31, 41, 55);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    const title = isUrdu ? "Hisab Kitab (Settlement)" : "Settlement Plan";
    doc.text(title, margin, yPos);
    yPos += 15;

    if (result.transactions.length === 0) {
        // All settled
        doc.setFillColor(220, 252, 231); // Green-100
        doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 30, 3, 3, 'F');
        doc.setTextColor(22, 163, 74); // Green-600
        doc.setFontSize(12);
        doc.text(isUrdu ? "Sab hisab barabar hai!" : "All settled up! No payments needed.", pageWidth / 2, yPos + 18, { align: 'center' });
        return yPos + 45;
    }

    // Draw Settlement Cards
    const cardHeight = 20;
    const gap = 10;

    result.transactions.forEach((tx) => {
        // Check page break
        if (yPos > pageHeight - 40) {
            doc.addPage();
            yPos = 30;
        }

        const fromName = displayNameFn(tx.from, lang);
        const toName = displayNameFn(tx.to, lang);

        // Card Container
        doc.setDrawColor(229, 231, 235);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(margin, yPos, pageWidth - 2 * margin, cardHeight, 3, 3, 'FD');

        // Draw Arrow (Vector)
        const arrowStartX = margin + 80;
        const arrowEndX = margin + 95;
        const arrowY = yPos + 10;

        doc.setDrawColor(156, 163, 175); // Gray-400
        doc.setLineWidth(1);
        doc.line(arrowStartX, arrowY, arrowEndX, arrowY); // Main line
        doc.line(arrowEndX - 3, arrowY - 3, arrowEndX, arrowY); // Top wing
        doc.line(arrowEndX - 3, arrowY + 3, arrowEndX, arrowY); // Bottom wing

        // From
        doc.setTextColor(31, 41, 55);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(fromName, margin + 10, yPos + 13);

        // To
        doc.text(toName, margin + 100, yPos + 13);

        // Amount (Right aligned)
        doc.setTextColor(220, 38, 38); // Red-600
        doc.setFontSize(11);
        doc.text(formatCurrency(tx.amount), pageWidth - margin - 10, yPos + 13, { align: 'right' });

        yPos += cardHeight + gap;
    });

    return yPos + 10;
};
const generateExpenseTable = (doc, pageWidth, pageHeight, margin, startY, expenses, isUrdu, displayNameFn, lang) => {
    let yPos = startY;

    // Check page break
    if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = 30;
    }

    doc.setTextColor(31, 41, 55);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    const title = isUrdu ? "Tafseelat" : "Detailed Expenses";
    doc.text(title, margin, yPos);
    yPos += 10;

    const tableColumn = isUrdu
        ? ["Tareekh", "Tafseel", "Ada Kiya", "Shamil Log", "Raqam (Rs)"]
        : ["Date", "Description", "Paid By", "Split Among", "Amount (Rs)"];

    const tableRows = expenses.map(exp => [
        exp.date,
        exp.description,
        displayNameFn(exp.payer, lang),
        exp.participants.map(p => displayNameFn(p, lang)).join(', '),
        formatCurrency(exp.amount)
    ]);

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: yPos,
        theme: 'grid',
        headStyles: {
            fillColor: [59, 130, 246],
            textColor: 255,
            fontStyle: 'bold'
        },
        styles: {
            fontSize: 9,
            cellPadding: 4,
            textColor: [55, 65, 81]
        },
        alternateRowStyles: {
            fillColor: [249, 250, 251]
        },
        margin: { left: margin, right: margin },
    });

    return doc.lastAutoTable.finalY + 20;
};

// --- 6. Footer Generator ---
const generateFooter = (doc, pageWidth, pageHeight, margin, isUrdu) => {
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        // Line
        doc.setDrawColor(229, 231, 235);
        doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175); // Gray-400

        const footerText = isUrdu
            ? `Generated on ${new Date().toLocaleDateString()} | Page ${i} of ${pageCount}`
            : `Generated on ${new Date().toLocaleDateString()} | Page ${i} of ${pageCount}`;

        doc.text(footerText, margin, pageHeight - 8);

        doc.text("Smart Expense Splitter", pageWidth - margin, pageHeight - 8, { align: 'right' });
    }
};

// --- Main Export ---
export const generatePDF = (data) => {
    const {
        tripName,
        participants,
        expenses,
        totalExpense,
        result,
        pdfLanguage,
        urduNameMap,
        displayNameForLanguage
    } = data;

    const isUrdu = pdfLanguage === "ur";
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;

    let yPos = 0;

    // 1. Header
    yPos = generateHeader(doc, pageWidth, margin, tripName, expenses, isUrdu);

    // 2. Executive Summary
    yPos = generateExecutiveSummary(doc, pageWidth, margin, yPos, { totalExpense, participants, expenses, result }, isUrdu, data.summaryBullets);

    // 3. Spending Chart
    yPos = generateSpendingChart(doc, pageWidth, margin, yPos, participants, expenses, isUrdu, displayNameForLanguage, pdfLanguage);

    // 4. Settlement Section
    if (result) {
        yPos = generateSettlementSection(doc, pageWidth, pageHeight, margin, yPos, result, isUrdu, displayNameForLanguage, pdfLanguage, urduNameMap);
    }

    // 5. Expense Table
    yPos = generateExpenseTable(doc, pageWidth, pageHeight, margin, yPos, expenses, isUrdu, displayNameForLanguage, pdfLanguage);

    // 6. Footer
    generateFooter(doc, pageWidth, pageHeight, margin, isUrdu);

    // Save
    const filename = tripName
        ? `${tripName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_settlement_${new Date().toISOString().split('T')[0]}.pdf`
        : `expense_settlement_${new Date().toISOString().split('T')[0]}.pdf`;

    doc.save(filename);
};
