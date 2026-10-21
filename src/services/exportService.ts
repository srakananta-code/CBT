import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ExamResult, Exam, SchoolClass, AppSetting, UserProfile } from '../types/database';

export interface ExportFilterOptions {
  examId?: string;
  classId?: string;
  statusFilter?: 'all' | 'passed' | 'remedial';
  includeHeaderSummary?: boolean;
  includeSignature?: boolean;
}

export interface ExportDataSummary {
  totalStudents: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passedCount: number;
  remedialCount: number;
  passRate: number;
}

/**
 * Helper to calculate statistical summary from exam results
 */
export function calculateResultSummary(results: ExamResult[], passingScore = 75): ExportDataSummary {
  if (results.length === 0) {
    return {
      totalStudents: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      passedCount: 0,
      remedialCount: 0,
      passRate: 0
    };
  }

  const scores = results.map(r => r.finalScore);
  const total = scores.reduce((sum, s) => sum + s, 0);
  const averageScore = Math.round(total / results.length);
  const highestScore = Math.max(...scores);
  const lowestScore = Math.min(...scores);
  const passedCount = results.filter(r => r.finalScore >= passingScore).length;
  const remedialCount = results.length - passedCount;
  const passRate = Math.round((passedCount / results.length) * 100);

  return {
    totalStudents: results.length,
    averageScore,
    highestScore,
    lowestScore,
    passedCount,
    remedialCount,
    passRate
  };
}

/**
 * Sanitizes strings for safe CSV output (handles quotes, commas, newlines)
 */
function escapeCsvCell(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '""';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes(';')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * 1. EKSPOR KE FORMAT CSV (.csv)
 * Menghasilkan file CSV berstandar UTF-8 dengan BOM (\uFEFF) untuk kompatibilitas penuh dengan Microsoft Excel.
 */
export function exportResultsToCSV({
  results,
  exam,
  settings,
  usersMap,
  filterDescription
}: {
  results: ExamResult[];
  exam?: Exam | null;
  settings?: AppSetting | null;
  usersMap?: Record<string, UserProfile>;
  filterDescription?: string;
}): void {
  const passingScore = exam?.passingScore || 75;
  const summary = calculateResultSummary(results, passingScore);
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const timeFormatted = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  const rows: string[] = [];

  // Metadata & Identitas Sekolah
  rows.push(escapeCsvCell('LAPORAN HASIL UJIAN BERBASIS KOMPUTER (CBT)'));
  rows.push(escapeCsvCell(settings?.schoolName || 'SMP NEGERI 1 HARAPAN BANGSA'));
  rows.push(escapeCsvCell(`NPSN: ${settings?.schoolNpsn || '20108745'} | Alamat: ${settings?.schoolAddress || 'Jl. Pendidikan No. 45'}`));
  rows.push(escapeCsvCell(`Tahun Ajaran: ${settings?.activeAcademicYear || '2025/2026'} | Semester: ${(settings?.activeSemester || 'ganjil').toUpperCase()}`));
  if (exam) {
    rows.push(escapeCsvCell(`Paket Ujian: ${exam.title} (${exam.subjectName}) | KKM: ${exam.passingScore}`));
  }
  if (filterDescription) {
    rows.push(escapeCsvCell(`Filter Data: ${filterDescription}`));
  }
  rows.push(escapeCsvCell(`Tanggal Unduh: ${dateFormatted} pukul ${timeFormatted} WIB`));
  rows.push(''); // Blank row

  // Ringkasan Statistik
  rows.push(
    [
      escapeCsvCell('RINGKASAN EVALUASI:'),
      escapeCsvCell(`Total Peserta: ${summary.totalStudents}`),
      escapeCsvCell(`Rata-rata: ${summary.averageScore}`),
      escapeCsvCell(`Tertinggi: ${summary.highestScore}`),
      escapeCsvCell(`Terendah: ${summary.lowestScore}`),
      escapeCsvCell(`Tuntas: ${summary.passedCount} siswa (${summary.passRate}%)`),
      escapeCsvCell(`Remedial: ${summary.remedialCount} siswa`)
    ].join(',')
  );
  rows.push(''); // Blank row

  // Header Kolom Tabel
  const headers = [
    'No',
    'NISN',
    'Nama Lengkap Siswa',
    'Kelas',
    'Mata Pelajaran',
    'Paket Ujian',
    'Jawaban Benar',
    'Jawaban Salah',
    'Tidak Dijawab',
    'Nilai Akhir',
    'KKM / Standar',
    'Status Kelulusan',
    'Waktu Selesai'
  ];
  rows.push(headers.map(h => escapeCsvCell(h)).join(','));

  // Isi Data Hasil
  results.forEach((r, idx) => {
    const studentUser = usersMap ? usersMap[r.studentId] : null;
    const nisn = studentUser?.nisn || '-';
    const isPassed = r.finalScore >= passingScore;
    const completedDate = r.publishedAt
      ? new Date(r.publishedAt).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : '-';

    const row = [
      escapeCsvCell(idx + 1),
      escapeCsvCell(nisn),
      escapeCsvCell(r.studentName),
      escapeCsvCell(r.className),
      escapeCsvCell(exam?.subjectName || 'Matematika'),
      escapeCsvCell(r.examTitle || exam?.title || 'Ujian CBT'),
      escapeCsvCell(r.correctCount),
      escapeCsvCell(r.wrongCount),
      escapeCsvCell(r.unansweredCount || 0),
      escapeCsvCell(r.finalScore),
      escapeCsvCell(passingScore),
      escapeCsvCell(isPassed ? 'TUNTAS' : 'REMEDIAL'),
      escapeCsvCell(completedDate)
    ];
    rows.push(row.join(','));
  });

  rows.push('');
  rows.push(
    [
      escapeCsvCell(''),
      escapeCsvCell(''),
      escapeCsvCell(''),
      escapeCsvCell(''),
      escapeCsvCell(''),
      escapeCsvCell('Mengetahui, Kepala Sekolah:'),
      escapeCsvCell(settings?.principalName || 'Drs. H. Mulyadi, M.Pd.'),
      escapeCsvCell(`NIP. ${settings?.principalNip || '197003151995031002'}`)
    ].join(',')
  );

  // Buat Blob dengan UTF-8 BOM
  const csvContent = '\uFEFF' + rows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  // Trigger download
  const link = document.createElement('a');
  link.href = url;
  const cleanExamTitle = (exam?.title || 'Semua_Ujian')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 30);
  const timestamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  link.download = `Rekap_Nilai_CBT_${cleanExamTitle}_${timestamp}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 2. EKSPOR KE FORMAT PDF (.pdf) MENGGUNAKAN JSPDF & AUTOTABLE
 * Menghasilkan dokumen PDF profesional beresolusi tinggi dengan kop surat, tabel rapi, dan pengesahan resmi.
 */
export function exportResultsToPDF({
  results,
  exam,
  settings,
  usersMap,
  filterDescription,
  orientation = 'landscape'
}: {
  results: ExamResult[];
  exam?: Exam | null;
  settings?: AppSetting | null;
  usersMap?: Record<string, UserProfile>;
  filterDescription?: string;
  orientation?: 'portrait' | 'landscape';
}): void {
  const passingScore = exam?.passingScore || 75;
  const summary = calculateResultSummary(results, passingScore);
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. KOP SURAT RESMI SEKOLAH
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text('PEMERINTAH DAERAH DINAS PENDIDIKAN', pageWidth / 2, 12, { align: 'center' });

  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // slate-900
  const schoolName = settings?.schoolName || 'SMP NEGERI 1 HARAPAN BANGSA';
  doc.text(schoolName.toUpperCase(), pageWidth / 2, 18, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // slate-600
  const schoolAddr = `${settings?.schoolAddress || 'Jl. Pendidikan No. 45'}${
    settings?.schoolCity ? `, ${settings.schoolCity}` : ''
  } • NPSN: ${settings?.schoolNpsn || '20108745'} • Telp: ${settings?.schoolPhone || '(021) 555-0199'}`;
  doc.text(schoolAddr, pageWidth / 2, 23, { align: 'center' });

  // Garis Pembatas Kop Surat Ganda
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.8);
  doc.line(14, 26, pageWidth - 14, 26);
  doc.setLineWidth(0.2);
  doc.line(14, 27.2, pageWidth - 14, 27.2);

  // 2. JUDUL DOKUMEN & SUB-JUDUL
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('REKAPITULASI HASIL COMPUTER BASED TEST (CBT)', pageWidth / 2, 33, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const examTitleLine = exam ? `${exam.title} (${exam.subjectName})` : 'Seluruh Penilaian CBT';
  const acadYearLine = `Tahun Pelajaran ${settings?.activeAcademicYear || '2025/2026'} Semester ${(settings?.activeSemester || 'ganjil').toUpperCase()}`;
  doc.text(`${examTitleLine} — ${acadYearLine}`, pageWidth / 2, 38, { align: 'center' });

  // 3. STATISTIK RINGKASAN (KPI Card Box)
  const boxY = 42;
  const boxHeight = 12;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.3);
  doc.roundedRect(14, boxY, pageWidth - 28, boxHeight, 1.5, 1.5, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);

  const colWidth = (pageWidth - 28) / 5;
  const statItems = [
    { label: 'Peserta Ujian:', value: `${summary.totalStudents} Siswa` },
    { label: 'Rata-rata Nilai:', value: `${summary.averageScore} / 100` },
    { label: 'Tertinggi / Terendah:', value: `${summary.highestScore} / ${summary.lowestScore}` },
    { label: 'Tuntas (KKM >= ' + passingScore + '):', value: `${summary.passedCount} Siswa (${summary.passRate}%)` },
    { label: 'Remedial:', value: `${summary.remedialCount} Siswa` }
  ];

  statItems.forEach((item, i) => {
    const xPos = 16 + i * colWidth;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(item.label, xPos, boxY + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(item.value, xPos, boxY + 9);
  });

  // 4. TABEL HASIL DENGAN AUTOTABLE
  const tableHead = [
    [
      'No',
      'NISN',
      'Nama Siswa',
      'Kelas',
      'Ujian',
      'Benar',
      'Salah',
      'Kosong',
      'Nilai',
      'Status'
    ]
  ];

  const tableBody = results.map((r, i) => {
    const studentUser = usersMap ? usersMap[r.studentId] : null;
    const nisn = studentUser?.nisn || '-';
    const isPassed = r.finalScore >= passingScore;
    return [
      (i + 1).toString(),
      nisn,
      r.studentName,
      r.className,
      r.examTitle || exam?.title || 'CBT',
      r.correctCount.toString(),
      r.wrongCount.toString(),
      (r.unansweredCount || 0).toString(),
      r.finalScore.toString(),
      isPassed ? 'TUNTAS' : 'REMEDIAL'
    ];
  });

  autoTable(doc, {
    startY: 57,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    headStyles: {
      fillColor: [30, 58, 138], // Navy #1e3a8a
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 24 },
      2: { cellWidth: orientation === 'landscape' ? 52 : 40, fontStyle: 'bold' },
      3: { halign: 'center', cellWidth: 26 },
      4: { cellWidth: orientation === 'landscape' ? 55 : 35 },
      5: { halign: 'center', cellWidth: 16 },
      6: { halign: 'center', cellWidth: 16 },
      7: { halign: 'center', cellWidth: 16 },
      8: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
      9: { halign: 'center', cellWidth: 24, fontStyle: 'bold' }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // slate-50
    },
    didParseCell: data => {
      // Pewarnaan khusus untuk kolom Status dan Nilai
      if (data.section === 'body') {
        if (data.column.index === 9) {
          if (data.cell.raw === 'TUNTAS') {
            data.cell.styles.textColor = [16, 122, 68]; // Emerald
          } else {
            data.cell.styles.textColor = [190, 18, 60]; // Rose
          }
        } else if (data.column.index === 8) {
          const score = Number(data.cell.raw);
          if (score >= passingScore) {
            data.cell.styles.textColor = [30, 58, 138]; // Blue
          } else {
            data.cell.styles.textColor = [190, 18, 60]; // Rose
          }
        }
      }
    },
    margin: { left: 14, right: 14, bottom: 25 }
  });

  // 5. TANDA TANGAN PENGESAHAN KEPALA SEKOLAH
  // @ts-ignore: lastAutoTable is injected by jspdf-autotable
  const finalY: number = (doc as any).lastAutoTable?.finalY || 120;
  let signatureY = finalY + 12;

  // Jika posisi tanda tangan melebihi batas halaman, tambah halaman baru
  if (signatureY + 35 > pageHeight) {
    doc.addPage();
    signatureY = 25;
  }

  const signX = pageWidth - 70;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  const city = settings?.schoolCity ? settings.schoolCity.replace('Kota ', '') : 'Jakarta';
  doc.text(`${city}, ${dateFormatted}`, signX + 25, signatureY, { align: 'center' });
  doc.text('Mengetahui,', signX + 25, signatureY + 5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text('Kepala Sekolah', signX + 25, signatureY + 9.5, { align: 'center' });

  // Nama dan NIP Kepala Sekolah
  const principal = settings?.principalName || 'Drs. H. Mulyadi, M.Pd.';
  const nip = settings?.principalNip || '197003151995031002';
  doc.text(principal.toUpperCase(), signX + 25, signatureY + 30, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${nip}`, signX + 25, signatureY + 34.5, { align: 'center' });

  // 6. NOMOR HALAMAN DI FOOTER
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `Dicetak melalui Aplikasi E-Ujian Sekolah CBT • Dokumen Sah Digital • Halaman ${i} dari ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  // Trigger Save PDF
  const cleanExamTitle = (exam?.title || 'Rekap_Hasil_CBT')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 30);
  const timestamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  doc.save(`Laporan_CBT_${cleanExamTitle}_${timestamp}.pdf`);
}
