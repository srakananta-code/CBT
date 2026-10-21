import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { Question, QuestionType, GradeLevel, AppSetting } from '../types/database';

export interface ExportQuestionOptions {
  questions: Question[];
  subjectName?: string;
  gradeLevel?: GradeLevel | 'all';
  title?: string;
  includeAnswerKey?: boolean;
  includeExplanation?: boolean;
  settings?: AppSetting | null;
  teacherName?: string;
}

export interface ParseResult {
  questions: Question[];
  errors: string[];
  summary: {
    total: number;
    byType: Record<string, number>;
  };
}

export interface ExcelRowValidationResult {
  rowNumber: number;
  isValid: boolean;
  question?: Question;
  errorMessage?: string;
  isDuplicate?: boolean;
  duplicateInfo?: string;
  rawData?: Record<string, any>;
}

export interface ExcelParseSummary {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  byType: Record<string, number>;
  rows: ExcelRowValidationResult[];
  errors: string[];
}

/**
 * 1. EKSPOR BANK SOAL KE FORMAT PDF DENGAN KOP SEKOLAH
 */
export function exportQuestionsToPDF(options: ExportQuestionOptions): void {
  const {
    questions,
    subjectName = 'Semua Mata Pelajaran',
    gradeLevel = 'all',
    title = 'NASKAH BANK SOAL UJIAN',
    includeAnswerKey = true,
    includeExplanation = true,
    settings,
    teacherName
  } = options;

  if (questions.length === 0) {
    throw new Error('Tidak ada butir soal yang dipilih untuk diekspor.');
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let currentY = 15;

  const schoolName = settings?.schoolName || 'SMP NEGERI INDONESIA';
  const schoolAddress = settings?.schoolAddress || 'Jl. Pendidikan Nasional No. 1, Jakarta';
  const schoolContact = settings?.schoolPhone || settings?.schoolWebsite || 'info@sekolah.sch.id';
  const academicYear = settings?.activeAcademicYear || '2025/2026';

  // 1. KOP SURAT SEKOLAH
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text(schoolName.toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(schoolAddress, pageWidth / 2, currentY, { align: 'center' });
  currentY += 4;
  doc.text(`Kontak: ${schoolContact} | Tahun Pelajaran: ${academicYear}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 4;

  // Garis kop surat
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.8);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  doc.setLineWidth(0.2);
  doc.line(margin, currentY + 0.8, pageWidth - margin, currentY + 0.8);
  currentY += 6;

  // 2. JUDUL DOKUMEN & METADATA
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(title.toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;

  // Metadata Table
  const metaBody = [
    [
      `Mata Pelajaran: ${subjectName}`,
      `Tingkat Kelas: ${gradeLevel === 'all' ? 'Semua Kelas (VII, VIII, IX)' : `Kelas ${gradeLevel}`}`
    ],
    [
      `Penyusun / Guru: ${teacherName || 'Tim Guru Mata Pelajaran'}`,
      `Total Butir Soal: ${questions.length} Butir Soal`
    ]
  ];

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    body: metaBody,
    theme: 'plain',
    styles: {
      fontSize: 8.5,
      cellPadding: 1.5,
      textColor: [51, 65, 85]
    },
    columnStyles: {
      0: { cellWidth: (pageWidth - margin * 2) / 2 },
      1: { cellWidth: (pageWidth - margin * 2) / 2 }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // 3. DAFTAR BUTIR SOAL
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('I. PETUNJUK & DAFTAR SOAL', margin, currentY);
  currentY += 4;

  const typeLabels: Record<string, string> = {
    multiple_choice: 'Pilihan Ganda',
    complex_multiple_choice: 'Pilihan Ganda Kompleks',
    true_false: 'Benar / Salah',
    short_answer: 'Isian Singkat',
    essay: 'Uraian / Esai'
  };

  questions.forEach((q, index) => {
    // Check if we need page break
    if (currentY > pageHeight - 35) {
      doc.addPage();
      currentY = 15;
    }

    const typeStr = typeLabels[q.type] || q.type;
    const diffStr = q.difficulty === 'easy' ? 'Mudah' : q.difficulty === 'medium' ? 'Sedang' : 'Sukar';

    // Nomor & Header Soal
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(`Soal No. ${index + 1}  [${typeStr}] - Bobot: ${q.weight || 10} poin - Kesulitan: ${diffStr}`, margin, currentY);
    currentY += 4;

    // Teks Soal
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);

    // Clean latex tags for basic PDF printing while keeping formulas readable
    const cleanText = q.questionText
      .replace(/\$\$([\s\S]*?)\$\$/g, '$1')
      .replace(/\$([^\$\n]+?)\$/g, '$1');

    const splitText = doc.splitTextToSize(cleanText, pageWidth - margin * 2 - 4);
    doc.text(splitText, margin + 4, currentY);
    currentY += splitText.length * 4;

    // Render Pilihan Jawaban berdasarkan jenis soal
    if (q.type === 'multiple_choice' || q.type === 'complex_multiple_choice') {
      q.options.forEach(opt => {
        if (currentY > pageHeight - 20) {
          doc.addPage();
          currentY = 15;
        }
        const optText = doc.splitTextToSize(`${opt.id}.  ${opt.text}`, pageWidth - margin * 2 - 10);
        doc.text(optText, margin + 8, currentY);
        currentY += optText.length * 3.8;
      });
    } else if (q.type === 'true_false' && q.trueFalseStatements && q.trueFalseStatements.length > 0) {
      const tfBody = q.trueFalseStatements.map((stmt, sIdx) => [
        `(${sIdx + 1}) ${stmt.statement}`,
        '[   ] Benar      [   ] Salah'
      ]);

      autoTable(doc, {
        startY: currentY + 1,
        margin: { left: margin + 6, right: margin + 6 },
        body: tfBody,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59] },
        columnStyles: {
          0: { cellWidth: 110 },
          1: { cellWidth: 50, halign: 'center' }
        }
      });
      currentY = (doc as any).lastAutoTable.finalY + 2;
    } else if (q.type === 'short_answer') {
      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Jawaban: __________________________________________________', margin + 8, currentY);
      currentY += 5;
    } else if (q.type === 'essay') {
      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('Lembar Jawaban Siswa:', margin + 8, currentY);
      currentY += 4;
      doc.line(margin + 8, currentY, pageWidth - margin - 8, currentY);
      currentY += 4;
      doc.line(margin + 8, currentY, pageWidth - margin - 8, currentY);
      currentY += 4;
      doc.line(margin + 8, currentY, pageWidth - margin - 8, currentY);
      currentY += 5;
    }

    currentY += 3;
  });

  // 4. LAMPIRAN KUNCI JAWABAN & PEMBAHASAN PRIVAT (JIKA DIPILIH)
  if (includeAnswerKey) {
    doc.addPage();
    currentY = 15;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(185, 28, 28); // Red banner for private answer key
    doc.text('LAMPIRAN RAHASIA: KUNCI JAWABAN & PEMBAHASAN PRIVAT', pageWidth / 2, currentY, { align: 'center' });
    currentY += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('*Dokumen ini hanya untuk Guru Pengampu & Panitia Ujian. Dilarang dibagikan ke siswa.*', pageWidth / 2, currentY, { align: 'center' });
    currentY += 6;

    const answerKeyData = questions.map((q, idx) => {
      let answerStr = '-';
      if (q.type === 'multiple_choice') {
        answerStr = typeof q.answerKey === 'string' ? q.answerKey : (q.options.find(o => o.isCorrect)?.id || 'A');
      } else if (q.type === 'complex_multiple_choice') {
        if (Array.isArray(q.answerKey)) {
          answerStr = q.answerKey.join(', ');
        } else {
          answerStr = q.options.filter(o => o.isCorrect).map(o => o.id).join(', ') || '-';
        }
      } else if (q.type === 'true_false' && q.trueFalseStatements) {
        answerStr = q.trueFalseStatements.map((s, sIdx) => `(${sIdx + 1}) ${s.isCorrect ? 'BENAR' : 'SALAH'}`).join('; ');
      } else if (q.type === 'short_answer') {
        const accepted = q.shortAnswerRules?.acceptedAnswers || [];
        answerStr = (typeof q.answerKey === 'string' ? q.answerKey : '') || accepted.join(' / ');
      } else if (q.type === 'essay') {
        answerStr = 'Pemeriksaan Manual Sesuai Rubrik';
      }

      return [
        `${idx + 1}`,
        typeLabels[q.type] || q.type,
        answerStr,
        includeExplanation ? (q.explanation || 'Tidak ada pembahasan khusus.') : '-'
      ];
    });

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['No', 'Jenis Soal', 'Kunci Jawaban Privat', 'Pembahasan & Rubrik Penskoran']],
      body: answerKeyData,
      theme: 'striped',
      headStyles: {
        fillColor: [185, 28, 28],
        textColor: 255,
        fontSize: 8.5,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 35 },
        2: { cellWidth: 45 },
        3: { cellWidth: 'auto' }
      }
    });
  }

  // Unduh dokumen PDF
  const sanitizedTitle = (title || 'bank_soal').toLowerCase().replace(/[^a-z0-9]/g, '_');
  doc.save(`${sanitizedTitle}_${Date.now()}.pdf`);
}

/**
 * 2. EKSPOR BANK SOAL KE FORMAT DOKUMEN (WORD / DOC / HTML)
 * Format HTML/Mime Word yang langsung dapat dibuka dan diedit di Microsoft Word / WPS / Google Docs.
 */
export function exportQuestionsToDoc(options: ExportQuestionOptions): void {
  const {
    questions,
    subjectName = 'Semua Mata Pelajaran',
    gradeLevel = 'all',
    title = 'NASKAH BANK SOAL UJIAN',
    includeAnswerKey = true,
    includeExplanation = true,
    settings,
    teacherName
  } = options;

  if (questions.length === 0) {
    throw new Error('Tidak ada butir soal untuk diekspor.');
  }

  const schoolName = settings?.schoolName || 'SMP NEGERI INDONESIA';
  const schoolAddress = settings?.schoolAddress || 'Jl. Pendidikan Nasional No. 1, Jakarta';
  const academicYear = settings?.activeAcademicYear || '2025/2026';

  let html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${title}</title>
      <style>
        body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; color: #111827; line-height: 1.4; padding: 20px; }
        .kop { text-align: center; border-bottom: 3px double #111827; padding-bottom: 8px; margin-bottom: 20px; }
        .kop h2 { margin: 0; font-size: 16pt; font-weight: bold; }
        .kop p { margin: 2px 0; font-size: 10pt; }
        .title { text-align: center; font-size: 14pt; font-weight: bold; margin-bottom: 15px; }
        .meta-table { width: 100%; margin-bottom: 20px; font-size: 11pt; }
        .meta-table td { padding: 3px 6px; }
        .question-item { margin-bottom: 20px; }
        .q-number { font-weight: bold; }
        .q-text { margin-bottom: 8px; }
        .q-options { margin-left: 20px; }
        .q-option { margin-bottom: 4px; }
        .tf-table { width: 100%; border-collapse: collapse; margin-top: 6px; }
        .tf-table th, .tf-table td { border: 1px solid #9ca3af; padding: 6px; font-size: 10.5pt; }
        .key-section { page-break-before: always; margin-top: 40px; border-top: 2px dashed #dc2626; padding-top: 20px; }
        .key-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .key-table th, .key-table td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 10pt; }
        .key-table th { background-color: #f1f5f9; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="kop">
        <h2>${schoolName.toUpperCase()}</h2>
        <p>${schoolAddress}</p>
        <p>Tahun Pelajaran: ${academicYear}</p>
      </div>

      <div class="title">${title.toUpperCase()}</div>

      <table class="meta-table">
        <tr>
          <td><strong>Mata Pelajaran:</strong> ${subjectName}</td>
          <td><strong>Tingkat Kelas:</strong> ${gradeLevel === 'all' ? 'Semua Kelas' : `Kelas ${gradeLevel}`}</td>
        </tr>
        <tr>
          <td><strong>Penyusun:</strong> ${teacherName || 'Tim Guru CBT'}</td>
          <td><strong>Jumlah Soal:</strong> ${questions.length} Butir Soal</td>
        </tr>
      </table>

      <hr style="border: 0; border-top: 1px solid #94a3b8; margin-bottom: 20px;" />

      <div class="questions-list">
  `;

  questions.forEach((q, idx) => {
    html += `
      <div class="question-item" data-type="${q.type}" data-weight="${q.weight || 10}" data-topic="${q.topic || ''}" data-material="${q.material || ''}" data-difficulty="${q.difficulty || 'medium'}">
        <div class="q-number">${idx + 1}. [${q.type.replace('_', ' ').toUpperCase()}] (Bobot: ${q.weight || 10})</div>
        ${q.questionImage ? `<div class="q-image" style="margin: 8px 0;"><img src="${q.questionImage}" alt="Gambar Soal" style="max-height: 220px; border: 1px solid #cbd5e1; border-radius: 8px;" /></div>` : ''}
        <div class="q-text">${q.questionText.replace(/\n/g, '<br/>')}</div>
    `;

    if (q.type === 'multiple_choice' || q.type === 'complex_multiple_choice') {
      html += `<div class="q-options">`;
      q.options.forEach(opt => {
        html += `
          <div class="q-option" style="margin-bottom: 6px;">
            <strong>${opt.id}.</strong> ${opt.text}
            ${opt.image ? `<br/><img src="${opt.image}" alt="Gambar Opsi ${opt.id}" style="max-height: 100px; border: 1px solid #cbd5e1; border-radius: 6px; margin-top: 4px;" />` : ''}
          </div>
        `;
      });
      html += `</div>`;
    } else if (q.type === 'true_false' && q.trueFalseStatements) {
      html += `
        <table class="tf-table">
          <thead>
            <tr><th>Pernyataan</th><th style="width: 150px; text-align: center;">Pilihan Siswa</th></tr>
          </thead>
          <tbody>
      `;
      q.trueFalseStatements.forEach(stmt => {
        html += `
          <tr>
            <td>${stmt.statement}</td>
            <td style="text-align: center;">[  ] Benar &nbsp;&nbsp;&nbsp; [  ] Salah</td>
          </tr>
        `;
      });
      html += `</tbody></table>`;
    } else if (q.type === 'short_answer') {
      html += `<div style="margin-top: 8px; font-style: italic; color: #64748b;">Jawaban: __________________________________________________</div>`;
    } else if (q.type === 'essay') {
      html += `<div style="margin-top: 8px; min-height: 80px; border-bottom: 1px dashed #cbd5e1; font-style: italic; color: #94a3b8;">(Lembar pengerjaan jawaban esai siswa)</div>`;
    }

    html += `</div>`;
  });

  html += `</div>`;

  if (includeAnswerKey) {
    html += `
      <div class="key-section">
        <h3 style="color: #dc2626; text-align: center;">KUNCI JAWABAN & PEMBAHASAN PRIVAT</h3>
        <p style="font-size: 10pt; text-align: center; color: #64748b;">Dokumen Rahasia - Khusus Guru & Panitia Ujian</p>
        <table class="key-table">
          <thead>
            <tr>
              <th style="width: 40px;">No</th>
              <th style="width: 120px;">Jenis Soal</th>
              <th style="width: 180px;">Kunci Jawaban</th>
              <th>Pembahasan / Rubrik Penskoran</th>
            </tr>
          </thead>
          <tbody>
    `;

    questions.forEach((q, idx) => {
      let keyDisplay = '-';
      if (q.type === 'multiple_choice') {
        keyDisplay = typeof q.answerKey === 'string' ? q.answerKey : (q.options.find(o => o.isCorrect)?.id || 'A');
      } else if (q.type === 'complex_multiple_choice') {
        if (Array.isArray(q.answerKey)) {
          keyDisplay = q.answerKey.join(', ');
        } else {
          keyDisplay = q.options.filter(o => o.isCorrect).map(o => o.id).join(', ') || '-';
        }
      } else if (q.type === 'true_false' && q.trueFalseStatements) {
        keyDisplay = q.trueFalseStatements.map((s, i) => `(${i + 1}) ${s.isCorrect ? 'BENAR' : 'SALAH'}`).join('<br/>');
      } else if (q.type === 'short_answer') {
        keyDisplay = (typeof q.answerKey === 'string' ? q.answerKey : '') || (q.shortAnswerRules?.acceptedAnswers || []).join(' / ');
      } else if (q.type === 'essay') {
        keyDisplay = 'Pemeriksaan Manual';
      }

      html += `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td>${q.type.replace('_', ' ').toUpperCase()}</td>
          <td><strong>${keyDisplay}</strong></td>
          <td>${includeExplanation ? (q.explanation || '-') : '-'}</td>
        </tr>
      `;
    });

    html += `</tbody></table></div>`;
  }

  html += `</body></html>`;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const sanitizedTitle = (title || 'bank_soal').toLowerCase().replace(/[^a-z0-9]/g, '_');
  a.download = `${sanitizedTitle}_${Date.now()}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 3. EKSPOR BANK SOAL KE FORMAT JSON (BACKUP & INTERCHANGE)
 */
export function exportQuestionsToJSON(questions: Question[], filename = 'bank_soal_cbt'): void {
  const jsonStr = JSON.stringify(questions, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 4. PARSER CERDAS SOAL DARI TEKS / DOKUMEN IMPORT
 * Mampu membaca format umum CBT, teks bernomor, tipe soal terdeteksi otomatis,
 * opsi A-E, kunci jawaban privat, dan pembahasan.
 */
export function parseQuestionsFromText(
  rawText: string,
  defaultSubject: { id: string; name: string },
  defaultGrade: GradeLevel,
  creator: { uid: string; name: string }
): ParseResult {
  const questions: Question[] = [];
  const errors: string[] = [];
  const byType: Record<string, number> = {
    multiple_choice: 0,
    complex_multiple_choice: 0,
    true_false: 0,
    short_answer: 0,
    essay: 0
  };

  if (!rawText.trim()) {
    return { questions, errors: ['Teks dokumen kosong.'], summary: { total: 0, byType } };
  }

  // Check if rawText is JSON
  if (rawText.trim().startsWith('[') && rawText.trim().endsWith(']')) {
    try {
      const parsed = JSON.parse(rawText.trim()) as Question[];
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].questionText) {
        parsed.forEach((q, idx) => {
          const item: Question = {
            ...q,
            id: q.id || `q_imp_${Date.now()}_${idx}`,
            subjectId: q.subjectId || defaultSubject.id,
            subjectName: q.subjectName || defaultSubject.name,
            gradeLevel: q.gradeLevel || defaultGrade,
            creatorId: creator.uid,
            creatorName: creator.name,
            createdAt: new Date().toISOString()
          };
          questions.push(item);
          byType[item.type] = (byType[item.type] || 0) + 1;
        });
        return {
          questions,
          errors,
          summary: { total: questions.length, byType }
        };
      }
    } catch {
      // Not pure json, proceed with HTML/text parser
    }
  }

  // Check if rawText is HTML from an exported .doc or pasted HTML
  if (typeof DOMParser !== 'undefined' && (rawText.includes('<html') || rawText.includes('class="question-item"') || rawText.includes('class="questions-list"'))) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(rawText, 'text/html');
      const itemEls = doc.querySelectorAll('.question-item');
      if (itemEls.length > 0) {
        // Extract answer keys from key-table if present
        const keyMap: Record<number, { key: string; exp: string }> = {};
        const keyRows = doc.querySelectorAll('.key-table tbody tr');
        keyRows.forEach(tr => {
          const tds = tr.querySelectorAll('td');
          if (tds.length >= 3) {
            const no = parseInt(tds[0].textContent?.trim() || '0', 10);
            const key = tds[2].textContent?.trim() || '';
            const exp = tds[3]?.textContent?.trim() || '';
            if (no > 0) keyMap[no] = { key, exp };
          }
        });

        itemEls.forEach((el, idx) => {
          const qNum = idx + 1;
          const numEl = el.querySelector('.q-number');
          const textEl = el.querySelector('.q-text');
          const headerText = numEl?.textContent?.trim() || '';
          const qText = textEl?.textContent?.trim() || (el.childNodes[1]?.textContent?.trim() || '');

          // Determine question type from data-type attribute or headerText
          let detectedType: QuestionType = (el.getAttribute('data-type') as QuestionType) || 'multiple_choice';
          if (!el.getAttribute('data-type')) {
            if (/KOMPLEKS|PGK/i.test(headerText)) detectedType = 'complex_multiple_choice';
            else if (/BENAR|SALAH|TRUE/i.test(headerText)) detectedType = 'true_false';
            else if (/ISIAN|SINGKAT/i.test(headerText)) detectedType = 'short_answer';
            else if (/ESAI|URAIAN/i.test(headerText)) detectedType = 'essay';
          }

          // Options
          const options: { id: string; text: string; image?: string; isCorrect?: boolean }[] = [];
          const optEls = el.querySelectorAll('.q-option');
          optEls.forEach((oEl, oIdx) => {
            const strong = oEl.querySelector('strong')?.textContent?.trim().replace(/[\.\)]/g, '') || String.fromCharCode(65 + oIdx);
            const optImg = (oEl.querySelector('img') as HTMLImageElement)?.src;
            const fullOptText = oEl.textContent?.trim().replace(/^[A-E][\.\)]\s*/, '') || '';
            options.push({
              id: strong,
              text: fullOptText,
              image: optImg || undefined
            });
          });

          // Question Image
          const qImg = (el.querySelector('.q-image img') as HTMLImageElement)?.src;

          // True False statements
          const tfStatements: { id: string; statement: string; isCorrect: boolean }[] = [];
          const tfRows = el.querySelectorAll('.tf-table tbody tr');
          tfRows.forEach((r, rIdx) => {
            const stmtText = r.querySelector('td:first-child')?.textContent?.trim() || '';
            if (stmtText) {
              tfStatements.push({
                id: `stmt_${rIdx + 1}`,
                statement: stmtText,
                isCorrect: true
              });
            }
          });

          // Keys and explanations from keyMap
          const keyInfo = keyMap[qNum];
          let answerKey: any = keyInfo?.key || '';
          const explanation = keyInfo?.exp || '';

          if (detectedType === 'multiple_choice') {
            const k = (typeof answerKey === 'string' ? answerKey : 'A').trim().charAt(0).toUpperCase();
            answerKey = k;
            options.forEach(o => { o.isCorrect = o.id === k; });
            if (options.length === 0) {
              options.push(
                { id: 'A', text: 'Pilihan A', isCorrect: true },
                { id: 'B', text: 'Pilihan B', isCorrect: false },
                { id: 'C', text: 'Pilihan C', isCorrect: false },
                { id: 'D', text: 'Pilihan D', isCorrect: false }
              );
            }
          } else if (detectedType === 'complex_multiple_choice') {
            const kList = (typeof answerKey === 'string' ? answerKey.split(/[,;\s]+/) : []).map(s => s.trim().toUpperCase()).filter(Boolean);
            answerKey = kList.length > 0 ? kList : ['A'];
            options.forEach(o => { o.isCorrect = kList.includes(o.id); });
          } else if (detectedType === 'true_false' && keyInfo?.key) {
            const parts = keyInfo.key.split(';');
            parts.forEach((p, pIdx) => {
              if (tfStatements[pIdx]) {
                tfStatements[pIdx].isCorrect = /BENAR|TRUE/i.test(p);
              }
            });
          }

          const qItem: Question = {
            id: `q_imp_${Date.now()}_${idx}`,
            subjectId: defaultSubject.id,
            subjectName: defaultSubject.name,
            gradeLevel: defaultGrade,
            type: detectedType,
            questionText: qText || `Pertanyaan nomor ${qNum}`,
            questionImage: qImg || undefined,
            options,
            topic: el.getAttribute('data-topic') || 'Umum',
            material: el.getAttribute('data-material') || undefined,
            difficulty: (el.getAttribute('data-difficulty') as any) || 'medium',
            weight: parseInt(el.getAttribute('data-weight') || '10', 10),
            answerKey,
            explanation: explanation || 'Kunci jawaban terverifikasi dari dokumen.',
            trueFalseStatements: tfStatements.length > 0 ? tfStatements : undefined,
            shortAnswerRules: detectedType === 'short_answer' ? {
              caseSensitive: false,
              ignoreSpacing: true,
              acceptedAnswers: typeof answerKey === 'string' ? [answerKey] : []
            } : undefined,
            creatorId: creator.uid,
            creatorName: creator.name,
            createdAt: new Date().toISOString()
          };

          questions.push(qItem);
          byType[detectedType] = (byType[detectedType] || 0) + 1;
        });

        if (questions.length > 0) {
          return {
            questions,
            errors,
            summary: { total: questions.length, byType }
          };
        }
      }
    } catch {
      // Fallback to text parser below
    }
  }

  // Split raw text into question blocks based on numbered patterns like "1.", "1)", "Soal 1", "[1]"
  const blocks = rawText
    .split(/\n(?=(?:(?:Soal\s*)?\d+[\.\)]|\[\d+\]))\s*/gi)
    .map(b => b.trim())
    .filter(b => b.length > 0);

  blocks.forEach((block, blockIdx) => {
    try {
      const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length === 0) return;

      // Extract Question Number and text from first line(s)
      let headerLine = lines[0];
      headerLine = headerLine.replace(/^(?:Soal\s*)?\d+[\.\)\]]\s*/i, '').trim();

      // Detect explicit tag like [PG], [PGK], [BS], [ISIAN], [ESAI]
      let detectedType: QuestionType = 'multiple_choice';
      if (/\[PGK\]/i.test(headerLine) || /\[KOMPLEKS\]/i.test(headerLine)) {
        detectedType = 'complex_multiple_choice';
        headerLine = headerLine.replace(/\[(?:PGK|KOMPLEKS)\]/gi, '').trim();
      } else if (/\[BS\]/i.test(headerLine) || /\[BENAR[_\s]?SALAH\]/i.test(headerLine)) {
        detectedType = 'true_false';
        headerLine = headerLine.replace(/\[(?:BS|BENAR[_\s]?SALAH)\]/gi, '').trim();
      } else if (/\[ISIAN\]/i.test(headerLine) || /\[SINGKAT\]/i.test(headerLine)) {
        detectedType = 'short_answer';
        headerLine = headerLine.replace(/\[(?:ISIAN|SINGKAT)\]/gi, '').trim();
      } else if (/\[ESAI\]/i.test(headerLine) || /\[URAIAN\]/i.test(headerLine)) {
        detectedType = 'essay';
        headerLine = headerLine.replace(/\[(?:ESAI|URAIAN)\]/gi, '').trim();
      } else if (/\[PG\]/i.test(headerLine)) {
        detectedType = 'multiple_choice';
        headerLine = headerLine.replace(/\[PG\]/gi, '').trim();
      }

      // Collect question text, options, answer key, explanation
      const qTextLines: string[] = [headerLine];
      const options: { id: string; text: string; isCorrect?: boolean }[] = [];
      let answerKey: string = '';
      let explanation: string = '';
      let weight: number = 10;
      let topic: string = 'Umum';
      const tfStatements: { id: string; statement: string; isCorrect: boolean }[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];

        // Check for Kunci Jawaban
        const keyMatch = line.match(/^(?:KUNCI(?:\s*JAWABAN)?|JAWABAN|KEY)\s*[:=]\s*(.+)$/i);
        if (keyMatch) {
          answerKey = keyMatch[1].trim();
          continue;
        }

        // Check for Pembahasan
        const expMatch = line.match(/^(?:PEMBAHASAN|RUBRIK|EXPLANATION)\s*[:=]\s*(.+)$/i);
        if (expMatch) {
          explanation = expMatch[1].trim();
          continue;
        }

        // Check for Bobot
        const weightMatch = line.match(/^(?:BOBOT|POIN|WEIGHT)\s*[:=]\s*(\d+)$/i);
        if (weightMatch) {
          weight = parseInt(weightMatch[1], 10);
          continue;
        }

        // Check for Topik
        const topicMatch = line.match(/^(?:TOPIK|MATERI)\s*[:=]\s*(.+)$/i);
        if (topicMatch) {
          topic = topicMatch[1].trim();
          continue;
        }

        // Check for Option A., B., C., D., E.
        const optMatch = line.match(/^([A-E])[\.\)]\s*(.+)$/i);
        if (optMatch) {
          options.push({
            id: optMatch[1].toUpperCase(),
            text: optMatch[2].trim()
          });
          continue;
        }

        // Check for Checkbox options for complex PG: [x] or [ ]
        const checkMatch = line.match(/^\[([xX\s])\]\s*(.+)$/);
        if (checkMatch) {
          detectedType = 'complex_multiple_choice';
          const isMarked = checkMatch[1].toLowerCase() === 'x';
          const optId = String.fromCharCode(65 + options.length);
          options.push({
            id: optId,
            text: checkMatch[2].trim(),
            isCorrect: isMarked
          });
          continue;
        }

        // Check for True/False statement line: (1) statement | BENAR
        const tfMatch = line.match(/^\(?(\d+)\)?\s*(.+?)\s*\|\s*(BENAR|SALAH|TRUE|FALSE)$/i);
        if (tfMatch) {
          detectedType = 'true_false';
          const isTrue = /^(?:BENAR|TRUE)$/i.test(tfMatch[3].trim());
          tfStatements.push({
            id: `stmt_${tfMatch[1]}`,
            statement: tfMatch[2].trim(),
            isCorrect: isTrue
          });
          continue;
        }

        // If not option or metadata, append to question text
        if (options.length === 0 && tfStatements.length === 0) {
          qTextLines.push(line);
        }
      }

      const fullQuestionText = qTextLines.join('\n').trim();
      if (!fullQuestionText) {
        errors.push(`Soal ke-${blockIdx + 1}: Teks soal tidak ditemukan.`);
        return;
      }

      // Auto-detect type if not explicit
      if (detectedType === 'multiple_choice') {
        if (options.length === 0) {
          if (tfStatements.length > 0) {
            detectedType = 'true_false';
          } else if (answerKey && answerKey.length > 2 && !/^[A-E]$/i.test(answerKey)) {
            detectedType = 'short_answer';
          } else if (!answerKey || explanation.toLowerCase().includes('rubrik')) {
            detectedType = 'essay';
          }
        } else if (answerKey.includes(',') || answerKey.includes(';') || options.some(o => o.isCorrect)) {
          detectedType = 'complex_multiple_choice';
        }
      }

      // Normalize answer keys
      let finalKey: string | string[] = answerKey;
      if (detectedType === 'complex_multiple_choice') {
        if (answerKey.includes(',') || answerKey.includes(';')) {
          finalKey = answerKey.split(/[,;]/).map(k => k.trim().toUpperCase());
        } else if (options.some(o => o.isCorrect)) {
          finalKey = options.filter(o => o.isCorrect).map(o => o.id);
        } else {
          finalKey = [answerKey.toUpperCase() || 'A'];
        }
      } else if (detectedType === 'multiple_choice') {
        finalKey = (answerKey || 'A').toUpperCase().charAt(0);
        // Mark option as correct
        options.forEach(opt => {
          opt.isCorrect = opt.id === finalKey;
        });
      }

      // Default options if none found for multiple choice
      if (detectedType === 'multiple_choice' && options.length === 0) {
        options.push(
          { id: 'A', text: 'Pilihan Jawaban A', isCorrect: true },
          { id: 'B', text: 'Pilihan Jawaban B', isCorrect: false },
          { id: 'C', text: 'Pilihan Jawaban C', isCorrect: false },
          { id: 'D', text: 'Pilihan Jawaban D', isCorrect: false }
        );
      }

      const newQ: Question = {
        id: `q_imp_${Date.now()}_${blockIdx}`,
        subjectId: defaultSubject.id,
        subjectName: defaultSubject.name,
        gradeLevel: defaultGrade,
        type: detectedType,
        questionText: fullQuestionText,
        options,
        topic,
        material: topic,
        difficulty: 'medium',
        weight,
        answerKey: finalKey,
        explanation: explanation || 'Kunci jawaban terverifikasi oleh guru.',
        trueFalseStatements: tfStatements.length > 0 ? tfStatements : undefined,
        shortAnswerRules: detectedType === 'short_answer' ? {
          caseSensitive: false,
          ignoreSpacing: true,
          acceptedAnswers: typeof finalKey === 'string' ? [finalKey] : (Array.isArray(finalKey) ? finalKey : [])
        } : undefined,
        creatorId: creator.uid,
        creatorName: creator.name,
        createdAt: new Date().toISOString()
      };

      questions.push(newQ);
      byType[detectedType] = (byType[detectedType] || 0) + 1;
    } catch (err: any) {
      errors.push(`Soal ke-${blockIdx + 1}: Gagal memproses format (${err?.message || 'Error'}).`);
    }
  });

  return {
    questions,
    errors,
    summary: {
      total: questions.length,
      byType
    }
  };
}

/**
 * 4. DOWNLOAD TEMPLATE EXCEL (XLSX) BANK SOAL CBT
 * Sesuai PROMPT 5: Mendukung 5 jenis soal, petunjuk struktur kolom, dan aturan representasi kunci jawaban.
 */
export function generateQuestionExcelTemplate(): void {
  const wb = XLSX.utils.book_new();

  // SHEET 1: TEMPLATE_BANK_SOAL (Data Contoh)
  const templateData = [
    {
      NO: 1,
      JENIS_SOAL: 'PG',
      PERTANYAAN: 'Akar-akar penyelesaian dari persamaan kuadrat $x^2 - 5x + 6 = 0$ adalah...',
      GAMBAR_SOAL: '',
      OPSI_A: '$x = 2$ atau $x = 3$',
      GAMBAR_OPSI_A: '',
      OPSI_B: '$x = -2$ atau $x = -3$',
      GAMBAR_OPSI_B: '',
      OPSI_C: '$x = 1$ atau $x = 6$',
      GAMBAR_OPSI_C: '',
      OPSI_D: '$x = -1$ atau $x = -6$',
      GAMBAR_OPSI_D: '',
      OPSI_E: '',
      GAMBAR_OPSI_E: '',
      PERNYATAAN_BS: '',
      KUNCI_JAWABAN: 'A',
      PEMBAHASAN: 'Faktorisasi: (x - 2)(x - 3) = 0, sehingga x1 = 2 atau x2 = 3.',
      BOBOT: 20,
      TINGKAT_KESULITAN: 'sedang',
      TOPIK: 'Persamaan Kuadrat',
      MATERI: 'Aljabar',
      KOMPETENSI: 'Menentukan akar persamaan kuadrat'
    },
    {
      NO: 2,
      JENIS_SOAL: 'PGK',
      PERTANYAAN: 'Manakah dari pernyataan berikut yang merupakan sifat-sifat bangun datar belah ketupat? (Pilih semua yang benar)',
      GAMBAR_SOAL: '',
      OPSI_A: 'Keempat sisinya sama panjang',
      GAMBAR_OPSI_A: '',
      OPSI_B: 'Kedua diagonalnya berpotongan tegak lurus',
      GAMBAR_OPSI_B: '',
      OPSI_C: 'Keempat sudutnya selalu siku-siku 90°',
      GAMBAR_OPSI_C: '',
      OPSI_D: 'Kedua diagonal saling membagi dua sama panjang',
      GAMBAR_OPSI_D: '',
      OPSI_E: '',
      GAMBAR_OPSI_E: '',
      PERNYATAAN_BS: '',
      KUNCI_JAWABAN: 'A, B, D',
      PEMBAHASAN: 'Belah ketupat memiliki 4 sisi sama panjang, diagonal tegak lurus dan saling membagi dua. Sudutnya tidak harus 90° (jika 90° menjadi persegi).',
      BOBOT: 20,
      TINGKAT_KESULITAN: 'sedang',
      TOPIK: 'Bangun Datar',
      MATERI: 'Geometri',
      KOMPETENSI: 'Menganalisis sifat-sifat segiempat'
    },
    {
      NO: 3,
      JENIS_SOAL: 'BS',
      PERTANYAAN: 'Tentukan nilai kebenaran dari masing-masing pernyataan sains berikut ini:',
      GAMBAR_SOAL: '',
      OPSI_A: '',
      GAMBAR_OPSI_A: '',
      OPSI_B: '',
      GAMBAR_OPSI_B: '',
      OPSI_C: '',
      GAMBAR_OPSI_C: '',
      OPSI_D: '',
      GAMBAR_OPSI_D: '',
      OPSI_E: '',
      GAMBAR_OPSI_E: '',
      PERNYATAAN_BS: 'Fotosintesis pada tumbuhan menghasilkan gas oksigen (O2); Mitokondria berfungsi sebagai tempat sintesis protein utama; Percepatan gravitasi bumi bernilai sekitar 9.8 m/s²',
      KUNCI_JAWABAN: 'BENAR; SALAH; BENAR',
      PEMBAHASAN: '1. Benar, fotosintesis melepas O2. 2. Salah, sintesis protein berlangsung di ribosom (mitokondria untuk respirasi sel). 3. Benar, g bumi ~9.8 m/s².',
      BOBOT: 20,
      TINGKAT_KESULITAN: 'mudah',
      TOPIK: 'Sistem Organ & Fisika Dasar',
      MATERI: 'IPA Terpadu',
      KOMPETENSI: 'Mengidentifikasi konsep sains'
    },
    {
      NO: 4,
      JENIS_SOAL: 'ISIAN',
      PERTANYAAN: 'Sebuah balok memiliki panjang 10 cm, lebar 5 cm, dan tinggi 4 cm. Berapakah volume balok tersebut dalam cm³?',
      GAMBAR_SOAL: '',
      OPSI_A: '',
      GAMBAR_OPSI_A: '',
      OPSI_B: '',
      GAMBAR_OPSI_B: '',
      OPSI_C: '',
      GAMBAR_OPSI_C: '',
      OPSI_D: '',
      GAMBAR_OPSI_D: '',
      OPSI_E: '',
      GAMBAR_OPSI_E: '',
      PERNYATAAN_BS: '',
      KUNCI_JAWABAN: '200|dua ratus',
      PEMBAHASAN: 'Volume = p × l × t = 10 × 5 × 4 = 200 cm³.',
      BOBOT: 20,
      TINGKAT_KESULITAN: 'mudah',
      TOPIK: 'Bangun Ruang',
      MATERI: 'Pengukuran',
      KOMPETENSI: 'Menghitung volume bangun ruang'
    },
    {
      NO: 5,
      JENIS_SOAL: 'ESAI',
      PERTANYAAN: 'Jelaskan tahapan siklus air (hidrologi) mulai dari evaporasi hingga presipitasi serta peran pentingnya bagi kehidupan di bumi!',
      GAMBAR_SOAL: '',
      OPSI_A: '',
      GAMBAR_OPSI_A: '',
      OPSI_B: '',
      GAMBAR_OPSI_B: '',
      OPSI_C: '',
      GAMBAR_OPSI_C: '',
      OPSI_D: '',
      GAMBAR_OPSI_D: '',
      OPSI_E: '',
      GAMBAR_OPSI_E: '',
      PERNYATAAN_BS: '',
      KUNCI_JAWABAN: 'Rubrik: Evaporasi (penguapan air laut/daratan), Kondensasi (pembentukan awan), Presipitasi (hujan), Infiltrasi (penyerapan ke tanah). Skor maksimal 20.',
      PEMBAHASAN: 'Guru memeriksa secara manual menggunakan rubrik 4 komponen siklus air.',
      BOBOT: 20,
      TINGKAT_KESULITAN: 'sukar',
      TOPIK: 'Siklus Air & Bumi',
      MATERI: 'Tata Surya & Kebumian',
      KOMPETENSI: 'Menjelaskan siklus hidrologi'
    }
  ];

  const wsTemplate = XLSX.utils.json_to_sheet(templateData);

  // Set column widths for readability
  wsTemplate['!cols'] = [
    { wch: 6 },  // NO
    { wch: 12 }, // JENIS_SOAL
    { wch: 45 }, // PERTANYAAN
    { wch: 20 }, // GAMBAR_SOAL
    { wch: 25 }, // OPSI_A
    { wch: 15 }, // GAMBAR_OPSI_A
    { wch: 25 }, // OPSI_B
    { wch: 15 }, // GAMBAR_OPSI_B
    { wch: 25 }, // OPSI_C
    { wch: 15 }, // GAMBAR_OPSI_C
    { wch: 25 }, // OPSI_D
    { wch: 15 }, // GAMBAR_OPSI_D
    { wch: 25 }, // OPSI_E
    { wch: 15 }, // GAMBAR_OPSI_E
    { wch: 40 }, // PERNYATAAN_BS
    { wch: 25 }, // KUNCI_JAWABAN
    { wch: 40 }, // PEMBAHASAN
    { wch: 8 },  // BOBOT
    { wch: 18 }, // TINGKAT_KESULITAN
    { wch: 20 }, // TOPIK
    { wch: 20 }, // MATERI
    { wch: 30 }  // KOMPETENSI
  ];

  XLSX.utils.book_append_sheet(wb, wsTemplate, 'TEMPLATE_BANK_SOAL');

  // SHEET 2: PETUNJUK_PENGISIAN (Petunjuk Struktur Kolom Sesuai Prompt 5)
  const instructionsData = [
    {
      NAMA_KOLOM: 'NO',
      STATUS: 'Wajib',
      TIPE_DATA: 'Angka (Integer)',
      ATURAN_DAN_FORMAT: 'Nomor urut baris soal (1, 2, 3, dst).'
    },
    {
      NAMA_KOLOM: 'JENIS_SOAL',
      STATUS: 'Wajib',
      TIPE_DATA: 'Teks Kode',
      ATURAN_DAN_FORMAT: 'Wajib diisi salah satu kode: "PG" (Pilihan Ganda), "PGK" (PG Kompleks), "BS" (Benar/Salah), "ISIAN" (Isian Singkat), "ESAI" (Uraian/Esai).'
    },
    {
      NAMA_KOLOM: 'PERTANYAAN',
      STATUS: 'Wajib',
      TIPE_DATA: 'Teks / LaTeX',
      ATURAN_DAN_FORMAT: 'Teks naskah pertanyaan. Mendukung rumus matematika LaTeX dengan pembungkus tanda dollar $...$, contoh: $x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$.'
    },
    {
      NAMA_KOLOM: 'GAMBAR_SOAL',
      STATUS: 'Opsional',
      TIPE_DATA: 'URL Gambar / Base64',
      ATURAN_DAN_FORMAT: 'Tautan URL gambar langsung (https://...) atau kosongkan jika soal tidak memakai gambar stimulus.'
    },
    {
      NAMA_KOLOM: 'OPSI_A s.d. OPSI_E',
      STATUS: 'Wajib untuk PG & PGK',
      TIPE_DATA: 'Teks / LaTeX',
      ATURAN_DAN_FORMAT: 'Teks pilihan jawaban. Untuk PG minimal OPSI_A dan OPSI_B wajib diisi. Untuk BS, ISIAN, dan ESAI kolom opsi dikosongkan.'
    },
    {
      NAMA_KOLOM: 'GAMBAR_OPSI_A s.d. E',
      STATUS: 'Opsional',
      TIPE_DATA: 'URL Gambar',
      ATURAN_DAN_FORMAT: 'Tautan URL gambar untuk masing-masing opsi jika opsi berupa gambar.'
    },
    {
      NAMA_KOLOM: 'PERNYATAAN_BS',
      STATUS: 'Wajib untuk tipe BS',
      TIPE_DATA: 'Teks Berpemisah',
      ATURAN_DAN_FORMAT: 'Daftar pernyataan untuk tipe Benar/Salah, pisahkan antar pernyataan menggunakan tanda titik-koma (;), contoh: "Pernyataan 1; Pernyataan 2; Pernyataan 3".'
    },
    {
      NAMA_KOLOM: 'KUNCI_JAWABAN',
      STATUS: 'Wajib',
      TIPE_DATA: 'Teks Representasi Baku',
      ATURAN_DAN_FORMAT: 'Aturan Baku: 1) PG: Tepat satu huruf kapital: "A", "B", "C", "D", atau "E". 2) PGK: Huruf kapital dipisahkan koma, contoh: "A, C" atau "B, D, E". 3) BS: Kunci kebenaran sesuai urutan pernyataan dipisah titik-koma (;), contoh: "BENAR; SALAH; BENAR" atau "B; S; B". 4) ISIAN: Jawaban baku, variasi dipisahkan tanda pipa (|), contoh: "200|dua ratus". 5) ESAI: Ringkasan rubrik penilaian kata kunci.'
    },
    {
      NAMA_KOLOM: 'PEMBAHASAN',
      STATUS: 'Opsional',
      TIPE_DATA: 'Teks',
      ATURAN_DAN_FORMAT: 'Penjelasan langkah penyelesaian atau rubrik penskoran privat untuk guru.'
    },
    {
      NAMA_KOLOM: 'BOBOT',
      STATUS: 'Opsional',
      TIPE_DATA: 'Angka (Integer)',
      ATURAN_DAN_FORMAT: 'Bobot nilai butir soal. Standar: 10 atau 20 (default 10 jika dikosongkan).'
    },
    {
      NAMA_KOLOM: 'TINGKAT_KESULITAN',
      STATUS: 'Opsional',
      TIPE_DATA: 'Teks',
      ATURAN_DAN_FORMAT: 'Pilihan: "mudah", "sedang", atau "sukar" (default: sedang).'
    },
    {
      NAMA_KOLOM: 'TOPIK & MATERI',
      STATUS: 'Opsional',
      TIPE_DATA: 'Teks',
      ATURAN_DAN_FORMAT: 'Nama bab/topik dan materi pengelompokan kurikulum.'
    },
    {
      NAMA_KOLOM: 'KOMPETENSI',
      STATUS: 'Opsional',
      TIPE_DATA: 'Teks',
      ATURAN_DAN_FORMAT: 'Tujuan pembelajaran atau capaian kompetensi.'
    }
  ];

  const wsInstructions = XLSX.utils.json_to_sheet(instructionsData);
  wsInstructions['!cols'] = [
    { wch: 22 }, // NAMA_KOLOM
    { wch: 20 }, // STATUS
    { wch: 25 }, // TIPE_DATA
    { wch: 80 }  // ATURAN_DAN_FORMAT
  ];

  XLSX.utils.book_append_sheet(wb, wsInstructions, 'PETUNJUK_PENGISIAN');

  // Trigger browser download
  XLSX.writeFile(wb, 'Template_Bank_Soal_CBT.xlsx');
}

/**
 * 5. EKSPOR BANK SOAL KE FORMAT EXCEL (XLSX / CSV)
 * Sesuai PROMPT 5: Kunci jawaban HANYA disertakan jika includeAnswerKey diizinkan secara eksplisit oleh guru/admin.
 */
export function exportQuestionsToExcel(options: {
  questions: Question[];
  format?: 'xlsx' | 'csv';
  includeAnswerKey?: boolean;
  includeExplanation?: boolean;
  fileName?: string;
}): void {
  const {
    questions,
    format = 'xlsx',
    includeAnswerKey = false,
    includeExplanation = false,
    fileName = 'Bank_Soal_CBT'
  } = options;

  if (questions.length === 0) {
    throw new Error('Tidak ada butir soal yang dipilih untuk diekspor.');
  }

  const rows = questions.map((q, idx) => {
    // Map answer key string safely
    let keyString = '';
    if (includeAnswerKey) {
      if (q.type === 'multiple_choice') {
        keyString = typeof q.answerKey === 'string' ? q.answerKey : '';
      } else if (q.type === 'complex_multiple_choice') {
        keyString = Array.isArray(q.answerKey) ? q.answerKey.join(', ') : (q.answerKey || '');
      } else if (q.type === 'true_false' && q.trueFalseStatements) {
        keyString = q.trueFalseStatements.map(s => s.isCorrect ? 'BENAR' : 'SALAH').join('; ');
      } else if (q.type === 'short_answer') {
        const variants = q.shortAnswerRules?.acceptedAnswers || [];
        keyString = variants.length > 0 ? variants.join('|') : (typeof q.answerKey === 'string' ? q.answerKey : '');
      } else if (q.type === 'essay') {
        keyString = typeof q.answerKey === 'string' ? q.answerKey : (q.explanation || 'Rubrik manual');
      }
    }

    const typeCodeMap: Record<QuestionType, string> = {
      multiple_choice: 'PG',
      complex_multiple_choice: 'PGK',
      true_false: 'BS',
      matching: 'JODOHKAN',
      short_answer: 'ISIAN',
      essay: 'ESAI'
    };

    const optA = q.options?.find(o => o.id === 'A');
    const optB = q.options?.find(o => o.id === 'B');
    const optC = q.options?.find(o => o.id === 'C');
    const optD = q.options?.find(o => o.id === 'D');
    const optE = q.options?.find(o => o.id === 'E');

    const tfText = q.trueFalseStatements ? q.trueFalseStatements.map(s => s.statement).join('; ') : '';

    const rowObj: Record<string, any> = {
      NO: idx + 1,
      MATA_PELAJARAN: q.subjectName,
      TINGKAT_KELAS: q.gradeLevel,
      JENIS_SOAL: typeCodeMap[q.type] || q.type,
      PERTANYAAN: q.questionText,
      GAMBAR_SOAL: q.questionImage || '',
      OPSI_A: optA?.text || '',
      GAMBAR_OPSI_A: optA?.image || '',
      OPSI_B: optB?.text || '',
      GAMBAR_OPSI_B: optB?.image || '',
      OPSI_C: optC?.text || '',
      GAMBAR_OPSI_C: optC?.image || '',
      OPSI_D: optD?.text || '',
      GAMBAR_OPSI_D: optD?.image || '',
      OPSI_E: optE?.text || '',
      GAMBAR_OPSI_E: optE?.image || '',
      PERNYATAAN_BS: tfText,
      BOBOT: q.weight || 10,
      TINGKAT_KESULITAN: q.difficulty,
      TOPIK: q.topic || '',
      MATERI: q.material || '',
      KOMPETENSI: q.learningObjectives || ''
    };

    // Sensitive fields only when authorized and confirmed
    if (includeAnswerKey) {
      rowObj['KUNCI_JAWABAN'] = keyString;
    }
    if (includeExplanation) {
      rowObj['PEMBAHASAN'] = q.explanation || '';
    }

    return rowObj;
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  ws['!cols'] = [
    { wch: 6 },  // NO
    { wch: 20 }, // MATA_PELAJARAN
    { wch: 12 }, // TINGKAT_KELAS
    { wch: 12 }, // JENIS_SOAL
    { wch: 45 }, // PERTANYAAN
    { wch: 15 }, // GAMBAR_SOAL
    { wch: 25 }, // OPSI_A
    { wch: 15 }, // GAMBAR_OPSI_A
    { wch: 25 }, // OPSI_B
    { wch: 15 }, // GAMBAR_OPSI_B
    { wch: 25 }, // OPSI_C
    { wch: 15 }, // GAMBAR_OPSI_C
    { wch: 25 }, // OPSI_D
    { wch: 15 }, // GAMBAR_OPSI_D
    { wch: 25 }, // OPSI_E
    { wch: 15 }, // GAMBAR_OPSI_E
    { wch: 35 }, // PERNYATAAN_BS
    { wch: 8 },  // BOBOT
    { wch: 16 }, // TINGKAT_KESULITAN
    { wch: 20 }, // TOPIK
    { wch: 20 }, // MATERI
    { wch: 25 }  // KOMPETENSI
  ];

  if (includeAnswerKey) {
    ws['!cols'].push({ wch: 25 }); // KUNCI_JAWABAN
  }
  if (includeExplanation) {
    ws['!cols'].push({ wch: 35 }); // PEMBAHASAN
  }

  XLSX.utils.book_append_sheet(wb, ws, 'BANK_SOAL');

  if (format === 'csv') {
    XLSX.writeFile(wb, `${fileName}.csv`, { bookType: 'csv' });
  } else {
    XLSX.writeFile(wb, `${fileName}.xlsx`, { bookType: 'xlsx' });
  }
}

/**
 * 6. PARSER DAN VALIDATOR EXCEL BUFFER DENGAN VALIDASI PER BARIS
 * Sesuai PROMPT 5:
 * - Tangani berkas kosong
 * - Tangani kolom wajib hilang
 * - Validasi tipe data, opsi, dan kunci per baris
 * - Deteksi duplikasi terhadap soal yang sudah ada
 * - Ringkasan data valid dan tidak valid
 * - Pesan kesalahan menjelaskan nomor baris serta penyebabnya
 */
export function parseQuestionsFromExcelBuffer(
  buffer: ArrayBuffer | Uint8Array,
  defaultSubject: { id: string; name: string },
  defaultGrade: GradeLevel,
  creator: { uid: string; name: string },
  existingQuestions: Question[] = []
): ExcelParseSummary {
  const errors: string[] = [];
  const rowsResult: ExcelRowValidationResult[] = [];
  const byType: Record<string, number> = {
    multiple_choice: 0,
    complex_multiple_choice: 0,
    true_false: 0,
    short_answer: 0,
    essay: 0
  };

  let validCount = 0;
  let invalidCount = 0;
  let duplicateCount = 0;

  // 1. Verifikasi berkas kosong
  if (!buffer || (buffer instanceof ArrayBuffer && buffer.byteLength === 0)) {
    return {
      totalRows: 0,
      validCount: 0,
      invalidCount: 0,
      duplicateCount: 0,
      byType,
      rows: [],
      errors: ['Berkas Excel yang diunggah kosong (0 byte).']
    };
  }

  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: 'array' });
  } catch (readErr: any) {
    return {
      totalRows: 0,
      validCount: 0,
      invalidCount: 0,
      duplicateCount: 0,
      byType,
      rows: [],
      errors: [`Format berkas Excel tidak valid atau rusak: ${readErr?.message || 'Gagal membaca workbook'}`]
    };
  }

  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    return {
      totalRows: 0,
      validCount: 0,
      invalidCount: 0,
      duplicateCount: 0,
      byType,
      rows: [],
      errors: ['Berkas Excel tidak memiliki lembar kerja (worksheet).']
    };
  }

  // Ambil worksheet pertama (atau sheet bernama TEMPLATE_BANK_SOAL / BANK_SOAL jika ada)
  let targetWs = wb.Sheets[wb.SheetNames[0]];
  let targetSheetName = wb.SheetNames[0];

  // Cari sheet yang memuat kata kunci SOAL/TEMPLATE/BANK atau lembar yang tidak kosong
  for (const sName of wb.SheetNames) {
    const sUpper = sName.toUpperCase();
    if (sUpper.includes('BANK_SOAL') || sUpper.includes('SOAL') || sUpper.includes('TEMPLATE')) {
      const cand = wb.Sheets[sName];
      if (cand && XLSX.utils.sheet_to_json(cand).length > 0) {
        targetWs = cand;
        targetSheetName = sName;
        break;
      }
    }
  }

  // Fallback: Jika sheet terpilih kosong, cari sheet lain yang ada datanya
  if (!targetWs || XLSX.utils.sheet_to_json(targetWs).length === 0) {
    for (const sName of wb.SheetNames) {
      const cand = wb.Sheets[sName];
      if (cand && XLSX.utils.sheet_to_json(cand).length > 0) {
        targetWs = cand;
        targetSheetName = sName;
        break;
      }
    }
  }

  if (!targetWs) {
    return {
      totalRows: 0,
      validCount: 0,
      invalidCount: 0,
      duplicateCount: 0,
      byType,
      rows: [],
      errors: [`Lembar kerja "${targetSheetName}" tidak dapat dibaca atau kosong.`]
    };
  }

  // Konversi sheet ke array of arrays untuk mendeteksi baris header sebenarnya (jika baris 1 adalah judul)
  const aoa = XLSX.utils.sheet_to_json<any[]>(targetWs, { header: 1, defval: '' });
  if (aoa.length === 0) {
    return {
      totalRows: 0,
      validCount: 0,
      invalidCount: 0,
      duplicateCount: 0,
      byType,
      rows: [],
      errors: ['Lembar kerja Excel kosong, tidak ada baris data soal yang ditemukan.']
    };
  }

  // Temukan indeks baris header (mencari baris yang mengandung 'SOAL', 'PERTANYAAN', 'TEKS', dsb)
  let headerRowIndex = 0;
  for (let r = 0; r < Math.min(aoa.length, 5); r++) {
    const rowCells = (aoa[r] || []).map((c: any) => String(c).trim().toUpperCase().replace(/[\s_]+/g, ''));
    if (rowCells.some(c => c.includes('PERTANYAAN') || c.includes('SOAL') || c.includes('QUESTION') || c.includes('NASKAH'))) {
      headerRowIndex = r;
      break;
    }
  }

  // Gunakan baris header yang terdeteksi
  const headerKeys = (aoa[headerRowIndex] || []).map((k: any, colIdx: number) => {
    const str = String(k || '').trim();
    return str || `__EMPTY_${colIdx}`;
  });

  const dataRows = aoa.slice(headerRowIndex + 1);
  if (dataRows.length === 0) {
    return {
      totalRows: 0,
      validCount: 0,
      invalidCount: 0,
      duplicateCount: 0,
      byType,
      rows: [],
      errors: ['Tidak ada baris butir soal di bawah baris header Excel.']
    };
  }

  // Ubah menjadi record object per baris
  const rawJson: Record<string, any>[] = [];
  dataRows.forEach(rowArr => {
    const rowObj: Record<string, any> = {};
    headerKeys.forEach((key, colIdx) => {
      rowObj[key] = rowArr[colIdx] ?? '';
    });
    rawJson.push(rowObj);
  });

  // Set existing questions hash untuk deteksi duplikasi cepat
  const existingSet = new Set(
    existingQuestions.map(q => `${q.questionText.trim().toLowerCase()}_${q.subjectId || defaultSubject.id}`)
  );

  // 3. Iterasi validasi per baris
  rawJson.forEach((row, rowIdx) => {
    const excelLineNum = headerRowIndex + rowIdx + 2; // Nomor baris nyata di file Excel
    const rowErrors: string[] = [];

    // Helper cari nilai dengan toleransi tinggi terhadap spasi, huruf besar-kecil, dan underscore
    const getVal = (aliases: string[]): string => {
      const cleanAliases = aliases.map(a => a.trim().toUpperCase().replace(/[\s_-]+/g, ''));
      for (const [key, val] of Object.entries(row)) {
        const cleanKey = key.trim().toUpperCase().replace(/[\s_-]+/g, '');
        if (cleanAliases.includes(cleanKey)) {
          return String(val ?? '').trim();
        }
      }
      return '';
    };

    const jenisRaw = getVal(['JENIS_SOAL', 'JENIS', 'TIPE_SOAL', 'TIPE', 'TYPE', 'KODE_SOAL', 'BENTUK_SOAL']);
    const pertanyaanRaw = getVal(['PERTANYAAN', 'TEKS_SOAL', 'SOAL', 'PERTANYAAN_SOAL', 'NASKAH', 'QUESTION', 'TEXT', 'ISI_SOAL', 'BUTIR_SOAL']);
    const gambarSoal = getVal(['GAMBAR_SOAL', 'GAMBAR', 'IMAGE', 'IMG_SOAL']);
    const opsiA = getVal(['OPSI_A', 'A', 'PILIHAN_A', 'JAWABAN_A', 'OPTION_A', 'OPSI1']);
    const optImgA = getVal(['GAMBAR_OPSI_A', 'GAMBAR_A', 'IMG_A']);
    const opsiB = getVal(['OPSI_B', 'B', 'PILIHAN_B', 'JAWABAN_B', 'OPTION_B', 'OPSI2']);
    const optImgB = getVal(['GAMBAR_OPSI_B', 'GAMBAR_B', 'IMG_B']);
    const opsiC = getVal(['OPSI_C', 'C', 'PILIHAN_C', 'JAWABAN_C', 'OPTION_C', 'OPSI3']);
    const optImgC = getVal(['GAMBAR_OPSI_C', 'GAMBAR_C', 'IMG_C']);
    const opsiD = getVal(['OPSI_D', 'D', 'PILIHAN_D', 'JAWABAN_D', 'OPTION_D', 'OPSI4']);
    const optImgD = getVal(['GAMBAR_OPSI_D', 'GAMBAR_D', 'IMG_D']);
    const opsiE = getVal(['OPSI_E', 'E', 'PILIHAN_E', 'JAWABAN_E', 'OPTION_E', 'OPSI5']);
    const optImgE = getVal(['GAMBAR_OPSI_E', 'GAMBAR_E', 'IMG_E']);
    const pernyataanBsRaw = getVal(['PERNYATAAN_BS', 'PERNYATAAN', 'BENAR_SALAH', 'STATEMENTS', 'BS_STATEMENTS']);
    const kunciRaw = getVal(['KUNCI_JAWABAN', 'KUNCI', 'JAWABAN', 'KEY', 'ANSWER', 'KUNCI_SOAL', 'JAWABAN_BENAR']);
    const pembahasanRaw = getVal(['PEMBAHASAN', 'EXPLANATION', 'RUBRIK', 'KETERANGAN', 'PENJELASAN']);
    const bobotRaw = getVal(['BOBOT', 'POIN', 'WEIGHT', 'NILAI', 'SKOR']);
    const kesulitanRaw = getVal(['TINGKAT_KESULITAN', 'KESULITAN', 'DIFFICULTY', 'LEVEL']);
    const topikRaw = getVal(['TOPIK', 'MATERI', 'SUBMATERI', 'BAB']) || 'Umum';
    const materiRaw = getVal(['MATERI', 'POKOK_BAHASAN']) || topikRaw;
    const kompetensiRaw = getVal(['KOMPETENSI', 'TUJUAN_PEMBELAJARAN', 'KD', 'CAPAIAN']);

    // Lewati baris kosong total di excel secara anggun tanpa menghasilkan error palsu
    if (!pertanyaanRaw && !opsiA && !opsiB && !kunciRaw && !pernyataanBsRaw) {
      return;
    }

    // Validasi Kolom Pertanyaan
    if (!pertanyaanRaw) {
      rowErrors.push('Teks pertanyaan wajib diisi dan tidak boleh kosong.');
    }

    // Bangun opsi jawaban
    const options: { id: string; text: string; image?: string; isCorrect?: boolean }[] = [];
    if (opsiA) options.push({ id: 'A', text: opsiA, image: optImgA || undefined });
    if (opsiB) options.push({ id: 'B', text: opsiB, image: optImgB || undefined });
    if (opsiC) options.push({ id: 'C', text: opsiC, image: optImgC || undefined });
    if (opsiD) options.push({ id: 'D', text: opsiD, image: optImgD || undefined });
    if (opsiE) options.push({ id: 'E', text: opsiE, image: optImgE || undefined });

    // Validasi & Normalisasi Tipe Soal dengan Deteksi Cerdas (Smart Auto-detection jika JENIS_SOAL kosong)
    let qType: QuestionType = 'multiple_choice';
    const jNorm = jenisRaw.toUpperCase().replace(/[\s_-]+/g, '');

    if (jNorm === 'PG' || jNorm === 'PILIHANGANDA' || jNorm === 'MULTIPLECHOICE' || jNorm === 'MC') {
      qType = 'multiple_choice';
    } else if (jNorm === 'PGK' || jNorm === 'PGKOMPLEKS' || jNorm === 'KOMPLEKS' || jNorm === 'COMPLEXMULTIPLECHOICE' || jNorm === 'CMC') {
      qType = 'complex_multiple_choice';
    } else if (jNorm === 'BS' || jNorm === 'BENARSALAH' || jNorm === 'TRUEFALSE' || jNorm === 'TF') {
      qType = 'true_false';
    } else if (jNorm === 'ISIAN' || jNorm === 'ISIANSINGKAT' || jNorm === 'SHORTANSWER' || jNorm === 'SA') {
      qType = 'short_answer';
    } else if (jNorm === 'ESAI' || jNorm === 'URAIAN' || jNorm === 'ESSAY') {
      qType = 'essay';
    } else if (jenisRaw) {
      // Jika diisi tapi tidak dikenal
      rowErrors.push(`Jenis soal "${jenisRaw}" tidak valid. Pilihan: PG, PGK, BS, ISIAN, atau ESAI.`);
    } else {
      // Kolom jenis kosong: Lakukan deteksi cerdas berdasarkan format isi
      if (pernyataanBsRaw) {
        qType = 'true_false';
      } else if (kunciRaw.includes(',') || kunciRaw.includes(';') || (kunciRaw.length > 1 && /^[A-Ea-e]+$/.test(kunciRaw))) {
        qType = 'complex_multiple_choice';
      } else if (options.length >= 2) {
        qType = 'multiple_choice';
      } else if (kunciRaw && kunciRaw.length > 0 && !opsiA) {
        qType = 'short_answer';
      } else {
        qType = 'essay';
      }
    }

    // Validasi spesifik per jenis soal & aturan representasi kunci
    let answerKey: any = '';
    const tfStatements: { id: string; statement: string; isCorrect: boolean }[] = [];

    if (qType === 'multiple_choice') {
      if (options.length < 2) {
        rowErrors.push('Pilihan Ganda harus memiliki minimal Opsi A dan Opsi B.');
      }

      // Normalisasi kunci PG (menangani "A", "A. 49", "(A)", "1", atau teks jawaban langsung)
      let kClean = kunciRaw.toUpperCase().trim();
      const matchLeadingLetter = kClean.match(/^[\(\[]?([A-E])[\)\]\.\s]?/);
      if (matchLeadingLetter) {
        kClean = matchLeadingLetter[1];
      } else if (kClean === '1') kClean = 'A';
      else if (kClean === '2') kClean = 'B';
      else if (kClean === '3') kClean = 'C';
      else if (kClean === '4') kClean = 'D';
      else if (kClean === '5') kClean = 'E';
      else {
        // Cek jika guru memasukkan teks isi opsi sebagai kunci
        const matchingTextOpt = options.find(o => o.text.trim().toLowerCase() === kunciRaw.trim().toLowerCase());
        if (matchingTextOpt) {
          kClean = matchingTextOpt.id;
        }
      }

      if (!kClean || !['A', 'B', 'C', 'D', 'E'].includes(kClean)) {
        rowErrors.push(`Kunci jawaban PG harus berupa huruf opsi (A, B, C, D, atau E). Diterima: "${kunciRaw}".`);
      } else {
        const matchingOpt = options.find(o => o.id === kClean);
        if (!matchingOpt) {
          rowErrors.push(`Kunci jawaban "${kClean}" tidak ditemukan dalam daftar opsi yang tersedia.`);
        } else {
          answerKey = kClean;
          options.forEach(o => { o.isCorrect = o.id === kClean; });
        }
      }
    } else if (qType === 'complex_multiple_choice') {
      if (options.length < 2) {
        rowErrors.push('PG Kompleks harus memiliki minimal 2 opsi jawaban.');
      }
      const kList = kunciRaw
        .split(/[,;\s]+/)
        .map(s => {
          const m = s.trim().toUpperCase().match(/^[\(\[]?([A-E])/);
          return m ? m[1] : s.trim().toUpperCase();
        })
        .filter(Boolean);

      if (kList.length === 0) {
        rowErrors.push('Kunci jawaban PG Kompleks minimal harus memiliki satu atau lebih opsi benar (contoh: "A, C").');
      } else {
        const invalidKeys = kList.filter(k => !options.some(o => o.id === k));
        if (invalidKeys.length > 0) {
          rowErrors.push(`Kunci jawaban PG Kompleks "${invalidKeys.join(', ')}" tidak sesuai dengan opsi yang ada.`);
        } else {
          answerKey = kList;
          options.forEach(o => { o.isCorrect = kList.includes(o.id); });
        }
      }
    } else if (qType === 'true_false') {
      const stmtList = pernyataanBsRaw
        ? pernyataanBsRaw.split(/[;\n\r]+/).map(s => s.trim()).filter(Boolean)
        : [];

      if (stmtList.length === 0) {
        rowErrors.push('Tipe Benar/Salah wajib memiliki minimal satu pernyataan pada kolom PERNYATAAN_BS.');
      }

      const keyParts = kunciRaw
        .split(/[;,\n\r]+/)
        .map(s => s.trim().toUpperCase())
        .filter(Boolean);

      if (stmtList.length > 0 && keyParts.length !== stmtList.length) {
        rowErrors.push(
          `Jumlah kunci Benar/Salah (${keyParts.length}) tidak sesuai dengan jumlah pernyataan (${stmtList.length}).`
        );
      }

      stmtList.forEach((stmt, sIdx) => {
        const kPart = keyParts[sIdx] || 'BENAR';
        const isTrue = kPart === 'BENAR' || kPart === 'B' || kPart === 'TRUE' || kPart === 'T' || kPart === '1';
        tfStatements.push({
          id: `stmt_${sIdx + 1}`,
          statement: stmt,
          isCorrect: isTrue
        });
      });
      answerKey = tfStatements.map(s => s.isCorrect ? 'BENAR' : 'SALAH').join('; ');
    } else if (qType === 'short_answer') {
      if (!kunciRaw) {
        rowErrors.push('Kunci jawaban isian singkat wajib diisi.');
      } else {
        answerKey = kunciRaw;
      }
    } else if (qType === 'essay') {
      answerKey = kunciRaw || 'Rubrik evaluasi manual guru.';
    }

    // Validasi Bobot
    let weight = 10;
    if (bobotRaw) {
      const parsedWeight = parseInt(bobotRaw, 10);
      if (isNaN(parsedWeight) || parsedWeight < 1 || parsedWeight > 100) {
        rowErrors.push(`Bobot soal "${bobotRaw}" tidak valid. Harus berupa angka bulat antara 1 dan 100.`);
      } else {
        weight = parsedWeight;
      }
    }

    // Validasi Kesulitan
    let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
    if (kesulitanRaw) {
      const kNorm = kesulitanRaw.toLowerCase();
      if (kNorm.includes('mudah') || kNorm === 'easy') difficulty = 'easy';
      else if (kNorm.includes('sukar') || kNorm.includes('sulit') || kNorm === 'hard' || kNorm.includes('hots')) difficulty = 'hard';
      else if (kNorm.includes('sedang') || kNorm === 'medium') difficulty = 'medium';
    }

    // Deteksi duplikasi
    const duplicateKey = `${pertanyaanRaw.toLowerCase().trim()}_${defaultSubject.id}`;
    const isDuplicate = existingSet.has(duplicateKey);

    const isValid = rowErrors.length === 0;

    if (isValid) {
      validCount++;
      if (isDuplicate) duplicateCount++;
      byType[qType] = (byType[qType] || 0) + 1;

      const newQuestion: Question = {
        id: `q_imp_xl_${Date.now()}_${rowIdx}`,
        subjectId: defaultSubject.id,
        subjectName: defaultSubject.name,
        gradeLevel: defaultGrade,
        type: qType,
        questionText: pertanyaanRaw,
        questionImage: gambarSoal || undefined,
        options,
        topic: topikRaw,
        material: materiRaw,
        learningObjectives: kompetensiRaw || undefined,
        difficulty,
        weight,
        answerKey,
        explanation: pembahasanRaw || 'Kunci jawaban terverifikasi dari import Excel.',
        trueFalseStatements: tfStatements.length > 0 ? tfStatements : undefined,
        shortAnswerRules: qType === 'short_answer' ? {
          caseSensitive: false,
          ignoreSpacing: true,
          acceptedAnswers: kunciRaw.split('|').map(k => k.trim()).filter(Boolean)
        } : undefined,
        creatorId: creator.uid,
        creatorName: creator.name,
        createdAt: new Date().toISOString()
      };

      rowsResult.push({
        rowNumber: excelLineNum,
        isValid: true,
        question: newQuestion,
        isDuplicate,
        duplicateInfo: isDuplicate ? 'Pertanyaan dengan teks serupa sudah ada di Bank Soal.' : undefined,
        rawData: row
      });
    } else {
      invalidCount++;
      const combinedError = `Baris ${excelLineNum} (Soal ${rowIdx + 1}): ${rowErrors.join(' ')}`;
      errors.push(combinedError);

      rowsResult.push({
        rowNumber: excelLineNum,
        isValid: false,
        errorMessage: rowErrors.join(' | '),
        rawData: row
      });
    }
  });

  return {
    totalRows: rawJson.length,
    validCount,
    invalidCount,
    duplicateCount,
    byType,
    rows: rowsResult,
    errors
  };
}
