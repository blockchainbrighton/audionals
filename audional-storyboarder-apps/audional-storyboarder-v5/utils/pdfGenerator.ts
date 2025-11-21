import { jsPDF } from 'jspdf';
import { BookletData } from '../types';

export type PDFFormat = 'storyboard' | 'booklet';
export type PDFTheme = 'light' | 'dark';

export const generatePDF = (data: BookletData, format: PDFFormat, theme: PDFTheme) => {
  const doc = new jsPDF({
    orientation: format === 'booklet' ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = 20;

  // Colors
  const bg = theme === 'dark' ? [15, 23, 42] : [255, 255, 255]; // Slate 950 vs White
  const textPrimary = theme === 'dark' ? [255, 255, 255] : [15, 23, 42];
  const textSecondary = theme === 'dark' ? [148, 163, 184] : [71, 85, 105]; // Slate 400 vs Slate 600
  const accent = [249, 115, 22]; // Orange 500

  // Helper to fill background
  const fillPage = () => {
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.rect(0, 0, width, height, 'F');
  };

  // Helper to add image
  const drawImage = (base64: string, x: number, y: number, w: number, h: number) => {
    try {
        let imgFormat = 'PNG';
        if (base64.startsWith('data:image/jpeg') || base64.startsWith('data:image/jpg')) imgFormat = 'JPEG';
        else if (base64.startsWith('data:image/webp')) imgFormat = 'WEBP';
        doc.addImage(base64, imgFormat, x, y, w, h, undefined, 'FAST');
    } catch (e) {
        console.error("Image add failed", e);
        // Draw placeholder
        doc.setFillColor(50, 50, 50);
        doc.rect(x, y, w, h, 'F');
        doc.setTextColor(200, 200, 200);
        doc.setFontSize(8);
        doc.text("Image Error", x + 5, y + h/2);
    }
  };

  data.pages.forEach((page, index) => {
    if (index > 0) doc.addPage();
    fillPage();

    // Header
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(textSecondary[0], textSecondary[1], textSecondary[2]);
    const headerText = format === 'storyboard' ? `AUDIONAL STORYBOARD - PAGE ${page.pageNumber}` : `AUDIONAL GUIDE`;
    doc.text(headerText, margin, margin - 5);
    doc.text(`${data.targetAudience}`, width - margin, margin - 5, { align: 'right' });

    if (format === 'storyboard') {
        // === STORYBOARD LAYOUT (Portrait) ===
        // Layout: Title top, Image Left, Tech Specs/Prompt Right, Content Bottom
        
        let cursorY = margin;

        // Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(24);
        doc.setTextColor(textPrimary[0], textPrimary[1], textPrimary[2]);
        const titleLines = doc.splitTextToSize(page.title, width - (margin * 2));
        doc.text(titleLines, margin, cursorY + 10);
        cursorY += 10 + (titleLines.length * 10);

        // Grid for Image and Prompt
        const midPoint = width / 2;
        const imgSize = 80;
        
        if (page.imageUrl) {
            drawImage(page.imageUrl, margin, cursorY, imgSize, imgSize);
        } else {
            doc.setDrawColor(textSecondary[0], textSecondary[1], textSecondary[2]);
            doc.rect(margin, cursorY, imgSize, imgSize);
            doc.text("No Image Generated", margin + 20, cursorY + 40);
        }

        // Visual Description (Next to image)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(accent[0], accent[1], accent[2]);
        doc.text("VISUAL PROMPT:", margin + imgSize + 10, cursorY + 5);
        
        doc.setFont("courier", "normal"); // Monospace for technical feel
        doc.setFontSize(9);
        doc.setTextColor(textSecondary[0], textSecondary[1], textSecondary[2]);
        const promptLines = doc.splitTextToSize(page.visualDescription, width - (margin * 2) - imgSize - 10);
        doc.text(promptLines, margin + imgSize + 10, cursorY + 15);

        cursorY += imgSize + 15;

        // Main Content
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        doc.setTextColor(textPrimary[0], textPrimary[1], textPrimary[2]);
        const contentLines = doc.splitTextToSize(page.content, width - (margin * 2));
        doc.text(contentLines, margin, cursorY);
        
        cursorY += (contentLines.length * 6) + 15;

        // Takeaway Box
        doc.setDrawColor(accent[0], accent[1], accent[2]);
        doc.setLineWidth(0.5);
        if (theme === 'dark') doc.setFillColor(30, 41, 59); // Darker slate
        else doc.setFillColor(255, 247, 237); // Light orange
        
        const takeawayLines = doc.splitTextToSize(page.keyTakeaway, width - (margin * 2) - 10);
        const boxHeight = (takeawayLines.length * 6) + 15;
        
        doc.rect(margin, cursorY, width - (margin * 2), boxHeight, 'FD');
        
        doc.setFont("helvetica", "bold");
        doc.setTextColor(accent[0], accent[1], accent[2]);
        doc.text("KEY INSIGHT", margin + 5, cursorY + 8);

        doc.setFont("helvetica", "italic");
        doc.setTextColor(textPrimary[0], textPrimary[1], textPrimary[2]);
        doc.text(takeawayLines, margin + 5, cursorY + 18);

    } else {
        // === BOOKLET LAYOUT (Landscape) ===
        // Layout: Split screen. Image Left (Large), Text Right.
        
        // Left side Image
        const imgWidth = (width / 2) - margin;
        const imgHeight = height - (margin * 2);
        
        if (page.imageUrl) {
            // Center image in left half
            // We want a square usually, or fill. Let's fit width.
            const size = Math.min(imgWidth, imgHeight);
            const yPos = (height - size) / 2;
            drawImage(page.imageUrl, margin, yPos, size, size);
        } else {
            doc.setDrawColor(textSecondary[0], textSecondary[1], textSecondary[2]);
            doc.roundedRect(margin, margin, imgWidth, imgHeight, 5, 5);
            doc.text("Visuals Pending", margin + 20, height / 2);
        }

        // Right Side Content
        const rightX = (width / 2) + (margin / 2);
        const rightW = (width / 2) - (margin * 1.5);
        let textY = margin + 20;

        // Page Number
        doc.setFontSize(40);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(theme === 'dark' ? 30 : 230); // Subtle giant number
        doc.text(page.pageNumber.toString(), rightX, textY);
        
        // Title
        doc.setFontSize(24);
        doc.setTextColor(textPrimary[0], textPrimary[1], textPrimary[2]);
        const titleLines = doc.splitTextToSize(page.title, rightW);
        doc.text(titleLines, rightX, textY + 5); // Overlap slightly with giant number
        
        textY += 15 + (titleLines.length * 10);

        // Separator
        doc.setDrawColor(accent[0], accent[1], accent[2]);
        doc.setLineWidth(1);
        doc.line(rightX, textY, rightX + 20, textY);
        textY += 15;

        // Content
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(textSecondary[0], textSecondary[1], textSecondary[2]);
        const contentLines = doc.splitTextToSize(page.content, rightW);
        doc.text(contentLines, rightX, textY);

        // Bottom Takeaway
        const bottomY = height - margin - 20;
        doc.setFontSize(14);
        doc.setTextColor(accent[0], accent[1], accent[2]);
        doc.text("Takeaway", rightX, bottomY);
        
        doc.setFontSize(11);
        doc.setTextColor(textPrimary[0], textPrimary[1], textPrimary[2]);
        doc.setFont("helvetica", "italic");
        const takeLines = doc.splitTextToSize(page.keyTakeaway, rightW);
        doc.text(takeLines, rightX, bottomY + 8);
    }
  });

  doc.save(`audional-${format}-${theme}-${Date.now()}.pdf`);
};