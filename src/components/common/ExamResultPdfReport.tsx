import React, { useRef } from 'react';
import {
  Printer,
  Download,
  X,
  Award,
  CheckCircle2,
  AlertCircle,
  FileText,
  School,
  Share2
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Modal } from './Modal';
import type { Exam, ExamResult, AppSetting } from '../../types/database';

interface ExamResultPdfReportProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam;
  results: ExamResult[];
  schoolSettings?: AppSetting;
}

export const ExamResultPdfReport: React.FC<ExamResultPdfReportProps> = ({
  isOpen,
  onClose,
  exam,
  results,
  schoolSettings
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  // Statistics calculation
  const totalStudents = results.length;
  const scores = results.map(r => r.finalScore);
  const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
  const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const kkm = exam.passingScore || 75;
  const passedStudents = results.filter(r => r.finalScore >= kkm).length;
  const passPercentage = totalStudents > 0 ? Math.round((passedStudents / totalStudents) * 100) : 0;

  // Sorted results by highest score for ranking
  const rankedResults = [...results].sort((a, b) => b.finalScore - a.finalScore);

  // Trigger Native Browser Print Dialog (User can select "Save as PDF")
  const handlePrint = () => {
    window.print();
  };

  // Direct jsPDF File Generation
  const handleDownloadPdf = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const schoolName = schoolSettings?.schoolName || 'SMP NEGERI 1 HARAPAN BANGSA';
    const address = schoolSettings?.schoolAddress || 'Jl. Pendidikan No. 45, Harapan Bangsa';
    const contactInfo = `Telp: ${schoolSettings?.schoolPhone || '(021) 7891234'} • Web: ${schoolSettings?.schoolWebsite || 'www.smpn1.sch.id'}`;

    // 1. School Kop Surat Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('PEMERINTAH DAERAH PROVINSI DKI JAKARTA', 105, 14, { align: 'center' });
    doc.text('DINAS PENDIDIKAN DAN KEBUDAYAAN', 105, 19, { align: 'center' });

    doc.setFontSize(14);
    doc.text(schoolName.toUpperCase(), 105, 26, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`${address} • ${contactInfo}`, 105, 34, { align: 'center' });

    // Decorative double line below letterhead
    doc.setLineWidth(0.8);
    doc.line(14, 37, 196, 37);
    doc.setLineWidth(0.2);
    doc.line(14, 38.5, 196, 38.5);

    // 2. Document Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('LAPORAN HASIL NILAI UJIAN CBT', 105, 46, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Paket Ujian: ${exam.title}`, 105, 51, { align: 'center' });

    // 3. Metadata details table
    doc.setFontSize(9);
    doc.text(`Mata Pelajaran: ${exam.subjectName}`, 14, 59);
    doc.text(`Tahun Ajaran: ${exam.academicYearName || '2025/2026 Ganjil'}`, 14, 64);
    doc.text(`Guru Pengampu: ${exam.teacherName}`, 14, 69);

    doc.text(`Sasaran Kelas: ${exam.targetClassNames?.join(', ') || 'Semua Kelas'}`, 120, 59);
    doc.text(`Standar KKM: ${kkm}`, 120, 64);
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}`, 120, 69);

    // 4. Statistical Summary Box
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(14, 73, 182, 14, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`Peserta: ${totalStudents} Siswa`, 20, 81);
    doc.text(`Rata-rata: ${avgScore}`, 60, 81);
    doc.text(`Tertinggi: ${highestScore}`, 95, 81);
    doc.text(`Terendah: ${lowestScore}`, 130, 81);
    doc.text(`Tuntas KKM: ${passedStudents} (${passPercentage}%)`, 160, 81);

    // 5. Student Results Table using autoTable
    const tableBody = rankedResults.map((r, idx) => [
      String(idx + 1),
      r.studentId.replace('student_', '').toUpperCase(),
      r.studentName,
      r.className || 'Kelas IX',
      String(r.correctCount || 0),
      String(r.wrongCount || 0),
      String(r.unansweredCount || 0),
      String(r.finalScore),
      r.finalScore >= kkm ? 'TUNTAS' : 'REMEDIAL',
      `Rank #${idx + 1}`
    ]);

    autoTable(doc, {
      startY: 91,
      head: [['No', 'NISN / ID', 'Nama Peserta Ujian', 'Kelas', 'Benar', 'Salah', 'Kosong', 'Skor', 'Status', 'Peringkat']],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [10, 25, 47],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'center', cellWidth: 22 },
        2: { halign: 'left', cellWidth: 50 },
        3: { halign: 'center', cellWidth: 20 },
        4: { halign: 'center', cellWidth: 13 },
        5: { halign: 'center', cellWidth: 13 },
        6: { halign: 'center', cellWidth: 14 },
        7: { halign: 'center', cellWidth: 14, fontStyle: 'bold' },
        8: { halign: 'center', cellWidth: 18 },
        9: { halign: 'center', cellWidth: 16 }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      }
    });

    // 6. Signature Block
    const finalY = (doc as any).lastAutoTable.finalY + 12;

    if (finalY < 250) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const printDateStr = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      doc.text(`Mengetahui,`, 20, finalY);
      doc.text(`Kepala Sekolah`, 20, finalY + 5);
      doc.setFont('helvetica', 'bold');
      doc.text(`Dr. H. Bambang Sudarsono, M.Pd.`, 20, finalY + 25);
      doc.setFont('helvetica', 'normal');
      doc.text(`NIP. 196805141993031004`, 20, finalY + 30);

      doc.text(`Jakarta, ${printDateStr}`, 140, finalY);
      doc.text(`Guru Mata Pelajaran`, 140, finalY + 5);
      doc.setFont('helvetica', 'bold');
      doc.text(exam.teacherName, 140, finalY + 25);
      doc.setFont('helvetica', 'normal');
      doc.text(`NIP. 198504122009021003`, 140, finalY + 30);
    }

    doc.save(`Laporan_Nilai_${exam.title.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cetak & Unduh Laporan Nilai CBT Resmi"
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Action Header Bar */}
        <div className="flex flex-wrap items-center justify-between p-4 bg-slate-900 text-white rounded-2xl gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-xs">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">{exam.title}</h3>
              <p className="text-xs text-blue-200">
                {exam.subjectName} • Standar KKM: {kkm} • Total {totalStudents} Peserta
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Unduh File PDF (.PDF)</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan Browser</span>
            </button>
          </div>
        </div>

        {/* Printable Official School Report Sheet View */}
        <div
          ref={printRef}
          id="printable-report"
          className="bg-white border border-slate-300 rounded-2xl p-6 sm:p-10 shadow-xs text-slate-900 font-sans print:border-none print:p-0 print:shadow-none"
        >
          {/* =========================================================
              KOP SURAT RESMI SEKOLAH
              ========================================================= */}
          <div className="text-center pb-4 border-b-4 border-double border-slate-900 relative">
            <div className="flex items-center justify-center gap-4 mb-1">
              <div className="w-16 h-16 rounded-full bg-blue-900 text-white font-black text-xl flex items-center justify-center border-2 border-blue-950 shadow-xs">
                CBT
              </div>
              <div>
                <p className="text-xs font-bold tracking-widest text-slate-700 uppercase">
                  Pemerintah Daerah Provinsi DKI Jakarta
                </p>
                <p className="text-xs font-bold tracking-widest text-slate-700 uppercase">
                  Dinas Pendidikan dan Kebudayaan
                </p>
                <h1 className="text-lg sm:text-2xl font-black text-slate-950 tracking-tight uppercase mt-0.5">
                  {schoolSettings?.schoolName || 'SMP NEGERI 1 HARAPAN BANGSA'}
                </h1>
                <p className="text-[11px] text-slate-600 font-medium">
                  Terakreditasi "A" (Unggul) • NPSN: 20104567 • NSS: 201010104001
                </p>
                <p className="text-[10px] text-slate-500">
                  {schoolSettings?.schoolAddress || 'Jl. Pendidikan No. 45, Harapan Bangsa'} • Telp: {schoolSettings?.schoolPhone || '(021) 7891234'} • Web: {schoolSettings?.schoolWebsite || 'www.smpn1.sch.id'}
                </p>
              </div>
            </div>
          </div>

          {/* Judul Laporan */}
          <div className="text-center my-6">
            <h2 className="text-base sm:text-lg font-black text-slate-950 tracking-wide uppercase underline">
              Laporan Rekapitulasi Hasil Penilaian Ujian CBT
            </h2>
            <p className="text-xs font-semibold text-slate-600 mt-1">
              {exam.title} • Semester Ganjil Tahun Ajaran {exam.academicYearName || '2025/2026'}
            </p>
          </div>

          {/* Metadata Ujian */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
            <div className="space-y-1.5">
              <div className="flex justify-between sm:justify-start gap-4">
                <span className="text-slate-500 w-32">Mata Pelajaran</span>
                <span className="font-bold text-slate-900">: {exam.subjectName}</span>
              </div>
              <div className="flex justify-between sm:justify-start gap-4">
                <span className="text-slate-500 w-32">Guru Pengampu</span>
                <span className="font-semibold text-slate-900">: {exam.teacherName}</span>
              </div>
              <div className="flex justify-between sm:justify-start gap-4">
                <span className="text-slate-500 w-32">Rombel Sasaran</span>
                <span className="text-slate-900">: {exam.targetClassNames?.join(', ') || 'Semua Kelas'}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between sm:justify-start gap-4">
                <span className="text-slate-500 w-32">Standar KKM</span>
                <span className="font-bold text-blue-700">: {kkm}</span>
              </div>
              <div className="flex justify-between sm:justify-start gap-4">
                <span className="text-slate-500 w-32">Jumlah Soal</span>
                <span className="text-slate-900">: {exam.totalQuestions} Butir Soal</span>
              </div>
              <div className="flex justify-between sm:justify-start gap-4">
                <span className="text-slate-500 w-32">Waktu Cetak</span>
                <span className="text-slate-900">: {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</span>
              </div>
            </div>
          </div>

          {/* Statistical Highlights Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-6 text-center text-xs">
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Peserta</span>
              <strong className="text-lg text-slate-900 font-extrabold">{totalStudents}</strong>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Rata-Rata</span>
              <strong className="text-lg text-blue-600 font-extrabold">{avgScore}</strong>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Nilai Tertinggi</span>
              <strong className="text-lg text-emerald-600 font-extrabold">{highestScore}</strong>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Nilai Terendah</span>
              <strong className="text-lg text-rose-600 font-extrabold">{lowestScore}</strong>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Tuntas KKM</span>
              <strong className="text-lg text-emerald-700 font-extrabold">{passedStudents} ({passPercentage}%)</strong>
            </div>
          </div>

          {/* Tabel Nilai Lengkap Siswa */}
          <div className="overflow-x-auto border border-slate-300 rounded-xl mb-8">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0a192f] text-white uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="px-3 py-2.5 text-center w-10">No</th>
                  <th className="px-3 py-2.5 w-24">NISN</th>
                  <th className="px-3 py-2.5">Nama Lengkap Siswa</th>
                  <th className="px-3 py-2.5 text-center">Kelas</th>
                  <th className="px-2 py-2.5 text-center text-emerald-300">Benar</th>
                  <th className="px-2 py-2.5 text-center text-rose-300">Salah</th>
                  <th className="px-2 py-2.5 text-center text-slate-300">Kosong</th>
                  <th className="px-3 py-2.5 text-center font-bold">Nilai</th>
                  <th className="px-3 py-2.5 text-center">Keterangan</th>
                  <th className="px-3 py-2.5 text-center">Rank</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {rankedResults.map((r, idx) => {
                  const isPassed = r.finalScore >= kkm;
                  return (
                    <tr key={r.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                      <td className="px-3 py-2 text-center text-slate-500 font-mono">{idx + 1}</td>
                      <td className="px-3 py-2 font-mono text-slate-600">
                        {r.studentId.replace('student_', '').toUpperCase()}
                      </td>
                      <td className="px-3 py-2 font-bold text-slate-900">{r.studentName}</td>
                      <td className="px-3 py-2 text-center text-slate-600">{r.className || 'Kelas IX'}</td>
                      <td className="px-2 py-2 text-center text-emerald-700 font-bold">{r.correctCount}</td>
                      <td className="px-2 py-2 text-center text-rose-600 font-semibold">{r.wrongCount}</td>
                      <td className="px-2 py-2 text-center text-slate-400">{r.unansweredCount}</td>
                      <td className="px-3 py-2 text-center font-black text-sm text-slate-950">
                        {r.finalScore}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isPassed
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {isPassed ? 'TUNTAS' : 'REMEDIAL'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-slate-600">
                        #{idx + 1}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* =========================================================
              LEMBAR PENGESAHAN TANDA TANGAN RESMI
              ========================================================= */}
          <div className="grid grid-cols-2 gap-8 pt-6 text-xs text-slate-900">
            <div>
              <p className="text-slate-600">Mengetahui,</p>
              <p className="font-semibold">Kepala Sekolah</p>
              <div className="h-16 flex items-end">
                <span className="text-[10px] text-slate-400 italic">(Stempel & Tanda Tangan)</span>
              </div>
              <p className="font-bold underline text-sm">Dr. H. Bambang Sudarsono, M.Pd.</p>
              <p className="text-slate-600">NIP. 196805141993031004</p>
            </div>

            <div className="text-right">
              <p className="text-slate-600">
                Jakarta, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <p className="font-semibold">Guru Pengampu Mata Pelajaran</p>
              <div className="h-16 flex items-end justify-end">
                <span className="text-[10px] text-slate-400 italic">(Tanda Tangan)</span>
              </div>
              <p className="font-bold underline text-sm">{exam.teacherName}</p>
              <p className="text-slate-600">NIP. 198504122009021003</p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
