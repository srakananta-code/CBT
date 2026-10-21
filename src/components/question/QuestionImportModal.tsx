import React, { useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Download,
  AlertCircle,
  CheckCircle2,
  Copy,
  BookOpen,
  HelpCircle,
  Layers,
  Sparkles,
  ArrowRight,
  Filter,
  Info,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertTriangle,
  FileCode
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { MathFormula } from '../common/MathFormula';
import {
  generateQuestionExcelTemplate,
  parseQuestionsFromExcelBuffer,
  parseQuestionsFromText,
  type ExcelParseSummary,
  type ParseResult
} from '../../services/questionExportImportService';
import { batchImportQuestionsWithReport, type BatchImportReport } from '../../services/dbService';
import type { Question, Subject, GradeLevel, QuestionType } from '../../types/database';

interface QuestionImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  currentUser: { uid: string; name: string };
  onSuccess: (count: number, subjectId?: string, grade?: GradeLevel) => void;
  defaultSubjectId?: string;
  defaultGrade?: GradeLevel;
  existingQuestions?: Question[];
}

const TEXT_TEMPLATE_EXAMPLE = `1. [PG] Hasil dari persamaan kuadrat $2x^2 - 5x - 3 = 0$ dengan nilai diskriminan $D = b^2 - 4ac$ adalah...
A. 49
B. 31
C. -1
D. -23
KUNCI: A
BOBOT: 20
PEMBAHASAN: D = (-5)^2 - 4(2)(-3) = 25 + 24 = 49.

2. [PGK] Manakah dari sifat-sifat bangun datar trapesium sama kaki berikut yang BENAR?
[x] Memiliki sepasang sisi yang sejajar
[ ] Keempat sisinya sama panjang
[x] Panjang kedua diagonalnya sama panjang
[x] Sudut-sudut yang terletak pada sisi alas sama besar
KUNCI: A, C, D
BOBOT: 20
PEMBAHASAN: Trapesium sama kaki hanya memiliki sepasang sisi sejajar dan kedua diagonalnya sama.

3. [BS] Tentukan kebenaran dari masing-masing pernyataan matematis berikut:
(1) Nilai dari $\\sqrt{144}$ adalah 12 | BENAR
(2) Jumlah seluruh sudut dalam sebuah segitiga adalah 360° | SALAH
(3) Bilangan prima terkecil yang genap adalah 2 | BENAR
BOBOT: 20
PEMBAHASAN: Sudut segitiga berjumlah 180°.

4. [ISIAN] Sebuah segitiga siku-siku memiliki alas 6 cm dan tinggi 8 cm. Berapakah panjang hipotenusanya dalam satuan cm?
KUNCI: 10
PEMBAHASAN: c = √(6² + 8²) = √100 = 10.

5. [ESAI] Tuliskan rumus volume tabung dan hitung volume tabung dengan jari-jari $r = 7\\text{ cm}$ dan tinggi $t = 10\\text{ cm}$!
BOBOT: 20
PEMBAHASAN: V = π × r² × t = (22/7) × 49 × 10 = 1.540 cm³.`;

export const QuestionImportModal: React.FC<QuestionImportModalProps> = ({
  isOpen,
  onClose,
  subjects,
  currentUser,
  onSuccess,
  defaultSubjectId,
  defaultGrade = 'IX',
  existingQuestions = []
}) => {
  // Mode: Excel / CSV (Default) or Text / Document
  const [importMode, setImportMode] = useState<'excel' | 'text'>('excel');

  // Metadata Target
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    defaultSubjectId || (subjects.length > 0 ? subjects[0].id : '')
  );
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>(defaultGrade);

  // Duplicate Prevention Policy
  const [duplicatePolicy, setDuplicatePolicy] = useState<'skip_duplicates' | 'update_duplicates' | 'allow_duplicates'>(
    'skip_duplicates'
  );

  // File States
  const [fileName, setFileName] = useState<string>('');
  const [excelSummary, setExcelSummary] = useState<ExcelParseSummary | null>(null);

  // Text Mode States
  const [inputText, setInputText] = useState<string>('');
  const [textParseResult, setTextParseResult] = useState<ParseResult | null>(null);
  const [copiedTemplate, setCopiedTemplate] = useState<boolean>(false);

  // UI Accordions
  const [showInstructions, setShowInstructions] = useState<boolean>(false);
  const [filterPreviewStatus, setFilterPreviewStatus] = useState<'all' | 'valid' | 'invalid' | 'duplicate'>('all');

  // Saving & Confirmation Dialog
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveResult, setSaveResult] = useState<BatchImportReport | null>(null);

  const curSubj = subjects.find(s => s.id === selectedSubjectId) || subjects[0] || {
    id: 'general',
    name: 'Umum'
  };

  // Handle Excel / CSV File Upload
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setSaveResult(null);

    const isExcelOrCsv = /\.(xlsx|xls|csv)$/i.test(file.name);
    if (!isExcelOrCsv && file.name.endsWith('.doc')) {
      // Route to text mode if .doc
      setImportMode('text');
      const reader = new FileReader();
      reader.onload = ev => {
        const content = ev.target?.result as string;
        if (content) {
          setInputText(content);
          runTextParsing(content);
        }
      };
      reader.readAsText(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = ev => {
      const buffer = ev.target?.result as ArrayBuffer;
      if (buffer) {
        const summary = parseQuestionsFromExcelBuffer(
          buffer,
          { id: curSubj.id, name: curSubj.name },
          selectedGrade,
          currentUser,
          existingQuestions
        );
        setExcelSummary(summary);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Run Text / Document Parsing
  const runTextParsing = (textToParse: string) => {
    const res = parseQuestionsFromText(
      textToParse,
      { id: curSubj.id, name: curSubj.name },
      selectedGrade,
      currentUser
    );
    setTextParseResult(res);
  };

  const handleApplyTextTemplate = () => {
    setInputText(TEXT_TEMPLATE_EXAMPLE);
    runTextParsing(TEXT_TEMPLATE_EXAMPLE);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2500);
  };

  // Execute Batch Save to Database
  const handleConfirmSave = async () => {
    setIsSaving(true);
    setSaveResult(null);

    let targetQuestions: Question[] = [];
    if (importMode === 'excel' && excelSummary) {
      targetQuestions = excelSummary.rows
        .filter(r => r.isValid && r.question)
        .map(r => ({
          ...r.question!,
          subjectId: curSubj.id,
          subjectName: curSubj.name,
          gradeLevel: selectedGrade
        }));
    } else if (importMode === 'text' && textParseResult) {
      targetQuestions = textParseResult.questions.map(q => ({
        ...q,
        subjectId: curSubj.id,
        subjectName: curSubj.name,
        gradeLevel: selectedGrade
      }));
    }

    if (targetQuestions.length === 0) {
      alert('Tidak ada butir soal valid yang dapat disimpan.');
      setIsSaving(false);
      setShowConfirmModal(false);
      return;
    }

    try {
      const report = await batchImportQuestionsWithReport(
        targetQuestions,
        duplicatePolicy,
        existingQuestions
      );

      setSaveResult(report);
      setShowConfirmModal(false);

      if (report.successCount > 0) {
        onSuccess(report.successCount, curSubj.id, selectedGrade);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Gagal memproses batch import: ${err?.message || 'Database error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const typeLabels: Record<string, string> = {
    multiple_choice: 'Pilihan Ganda',
    complex_multiple_choice: 'PG Kompleks',
    true_false: 'Benar / Salah',
    short_answer: 'Isian Singkat',
    essay: 'Uraian / Esai'
  };

  // Preview Filtering for Excel rows
  const filteredExcelRows = (excelSummary?.rows || []).filter(r => {
    if (filterPreviewStatus === 'valid') return r.isValid;
    if (filterPreviewStatus === 'invalid') return !r.isValid;
    if (filterPreviewStatus === 'duplicate') return r.isDuplicate;
    return true;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Modul Import Soal Bank Soal (Excel XLSX / CSV / Dokumen)"
      maxWidth="4xl"
    >
      <div className="space-y-4 max-h-[78vh] overflow-y-auto pr-1">
        {/* Format Tabs Selector */}
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => setImportMode('excel')}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
              importMode === 'excel'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Import Berkas Excel (XLSX / CSV)</span>
          </button>

          <button
            type="button"
            onClick={() => setImportMode('text')}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
              importMode === 'text'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Import Dokumen / Teks Soal CBT (DOC / TXT)</span>
          </button>
        </div>

        {/* Target Subject & Grade Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mata Pelajaran Target
            </label>
            <select
              value={selectedSubjectId}
              onChange={e => setSelectedSubjectId(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 font-semibold"
            >
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tingkat Kelas Target
            </label>
            <select
              value={selectedGrade}
              onChange={e => setSelectedGrade(e.target.value as GradeLevel)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 font-semibold"
            >
              <option value="VII">Kelas VII</option>
              <option value="VIII">Kelas VIII</option>
              <option value="IX">Kelas IX</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Kebijakan Impor Duplikat
            </label>
            <select
              value={duplicatePolicy}
              onChange={e => setDuplicatePolicy(e.target.value as any)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 font-semibold"
            >
              <option value="skip_duplicates">Abaikan / Lewati Duplikat (Aman)</option>
              <option value="update_duplicates">Perbarui / Timpa Soal yang Ada</option>
              <option value="allow_duplicates">Tetap Simpan Sebagai Soal Baru</option>
            </select>
          </div>
        </div>

        {/* SECTION A: EXCEL XLSX / CSV IMPORT */}
        {importMode === 'excel' && (
          <div className="space-y-4">
            {/* Template Download & Instructions Action Row */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-xs text-emerald-950 block">Template Format Resmi Excel CBT</span>
                  <span className="text-[11px] text-emerald-800 block">
                    Mendukung 5 jenis soal (PG, PGK, Benar/Salah, Isian, Esai) & rumus matematika LaTeX.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowInstructions(!showInstructions)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Petunjuk Struktur Kolom</span>
                  {showInstructions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={generateQuestionExcelTemplate}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Template XLSX</span>
                </button>
              </div>
            </div>

            {/* Collapsible Column Structure Guidance */}
            {showInstructions && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-3">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <Info className="w-4 h-4 text-blue-600" />
                  <span>Panduan Kolom Template XLSX & Aturan Kunci Jawaban</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] text-slate-700 leading-relaxed">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-900 block mb-1">1. Kolom Wajib Identitas:</span>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                      <li><code>NO</code>: Nomor urut soal (1, 2, 3, dst).</li>
                      <li><code>JENIS_SOAL</code>: Kode jenis soal: <code>PG</code>, <code>PGK</code>, <code>BS</code>, <code>ISIAN</code>, atau <code>ESAI</code>.</li>
                      <li><code>PERTANYAAN</code>: Naskah soal (bisa memuat LaTeX <code>$x^2$</code>).</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-900 block mb-1">2. Aturan Kunci Jawaban (Baku & Terdokumentasi):</span>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                      <li><strong>PG:</strong> Tepat satu huruf opsi (<code>A</code>, <code>B</code>, <code>C</code>, <code>D</code>, atau <code>E</code>).</li>
                      <li><strong>PGK:</strong> Huruf dipisah koma (contoh: <code>A, C</code> atau <code>B, D</code>).</li>
                      <li><strong>BS:</strong> Nilai kebenaran dipisah titik-koma (contoh: <code>BENAR; SALAH; BENAR</code>).</li>
                      <li><strong>ISIAN:</strong> Teks jawaban, opsi alternatif dipisah pipa (contoh: <code>10|sepuluh</code>).</li>
                      <li><strong>ESAI:</strong> Rubrik penilaian kata kunci manual guru.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Drag & Drop Area */}
            <div className="p-6 border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-2xl bg-emerald-50/30 text-center transition-colors">
              <input
                type="file"
                id="excelUploadInput"
                accept=".xlsx,.xls,.csv"
                onChange={handleExcelUpload}
                className="hidden"
              />
              <label
                htmlFor="excelUploadInput"
                className="cursor-pointer flex flex-col items-center justify-center space-y-2"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-1">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-800">
                  Klik untuk Memilih Berkas Excel (XLSX / CSV)
                </span>
                <span className="text-[11px] text-slate-500">
                  {fileName ? `Berkas terpilih: ${fileName}` : 'Atau seret dan lepaskan berkas ke area ini'}
                </span>
              </label>
            </div>

            {/* Excel Validation Summary Counters */}
            {excelSummary && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-slate-100 rounded-xl border border-slate-200">
                    <span className="text-[11px] text-slate-500 block font-semibold">Total Baris</span>
                    <span className="text-xl font-black text-slate-800">{excelSummary.totalRows}</span>
                  </div>

                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-[11px] text-emerald-700 block font-semibold">Baris Valid</span>
                    <span className="text-xl font-black text-emerald-700">{excelSummary.validCount}</span>
                  </div>

                  <div className={`p-3 rounded-xl border ${excelSummary.invalidCount > 0 ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                    <span className="text-[11px] block font-semibold">Baris Tidak Valid / Error</span>
                    <span className="text-xl font-black">{excelSummary.invalidCount}</span>
                  </div>

                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800">
                    <span className="text-[11px] block font-semibold">Terdeteksi Duplikat</span>
                    <span className="text-xl font-black">{excelSummary.duplicateCount}</span>
                  </div>
                </div>

                {/* Question Type Breakdown */}
                <div className="flex flex-wrap items-center gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-700">Rincian Tipe Soal:</span>
                  <Badge variant="primary">PG: {excelSummary.byType.multiple_choice || 0}</Badge>
                  <Badge variant="warning">PGK: {excelSummary.byType.complex_multiple_choice || 0}</Badge>
                  <Badge variant="neutral">B/S: {excelSummary.byType.true_false || 0}</Badge>
                  <Badge variant="success">Isian: {excelSummary.byType.short_answer || 0}</Badge>
                  <Badge variant="danger">Esai: {excelSummary.byType.essay || 0}</Badge>
                </div>

                {/* Quick Save Banner when Valid Rows Found */}
                {excelSummary.validCount > 0 && !saveResult && (
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-emerald-50 border border-emerald-300 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-xs font-bold text-emerald-950">
                        {excelSummary.validCount} butir soal valid siap disimpan ke <u>{curSubj.name} (Kelas {selectedGrade})</u>
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => setShowConfirmModal(true)}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Simpan {excelSummary.validCount} Soal Sekarang</span>
                    </button>
                  </div>
                )}

                {/* Helpful Warning when 0 Valid Rows */}
                {excelSummary.validCount === 0 && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-900">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Tidak Ada Butir Soal Valid yang Ditemukan</span>
                      <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">
                        Periksa baris error pada tabel di bawah. Pastikan kolom memuat teks pertanyaan dan opsi/kunci jawaban, atau unduh tombol <strong>Template XLSX</strong> resmi di atas untuk mencocokkan susunan kolom.
                      </p>
                    </div>
                  </div>
                )}

                {/* Filter Preview Pills */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-bold text-slate-800">
                    Preview Data Hasil Validasi Per Baris ({filteredExcelRows.length} Butir):
                  </span>

                  <div className="flex items-center gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setFilterPreviewStatus('all')}
                      className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer ${filterPreviewStatus === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                    >
                      Semua ({excelSummary.rows.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterPreviewStatus('valid')}
                      className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer ${filterPreviewStatus === 'valid' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                    >
                      Valid ({excelSummary.validCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterPreviewStatus('invalid')}
                      className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer ${filterPreviewStatus === 'invalid' ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                    >
                      Error ({excelSummary.invalidCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterPreviewStatus('duplicate')}
                      className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer ${filterPreviewStatus === 'duplicate' ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                    >
                      Duplikat ({excelSummary.duplicateCount})
                    </button>
                  </div>
                </div>

                {/* Detailed Table of Rows */}
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 w-20">Baris</th>
                        <th className="px-3 py-2 w-24">Status</th>
                        <th className="px-3 py-2 w-28">Tipe</th>
                        <th className="px-3 py-2">Teks Soal / Pertanyaan</th>
                        <th className="px-3 py-2 w-32">Kunci Jawaban</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredExcelRows.map((r, idx) => (
                        <tr
                          key={idx}
                          className={r.isValid ? (r.isDuplicate ? 'bg-amber-50/30' : 'hover:bg-slate-50') : 'bg-rose-50/50'}
                        >
                          <td className="px-3 py-2.5 font-bold text-slate-600 whitespace-nowrap">
                            Baris {r.rowNumber}
                          </td>
                          <td className="px-3 py-2.5">
                            {r.isValid ? (
                              r.isDuplicate ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                  Duplikat
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  <CheckCircle2 className="w-3 h-3" /> Valid
                                </span>
                              )
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                <AlertCircle className="w-3 h-3" /> Error
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            {r.question ? (
                              <Badge variant="neutral">{typeLabels[r.question.type] || r.question.type}</Badge>
                            ) : (
                              <span className="text-slate-400 font-mono text-[11px]">{r.rawData?.JENIS_SOAL || '-'}</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            {r.isValid && r.question ? (
                              <div className="space-y-1">
                                <div className="text-slate-800 font-medium line-clamp-2">
                                  <MathFormula content={r.question.questionText} inline />
                                </div>
                                {r.isDuplicate && (
                                  <p className="text-[10px] text-amber-700 italic">
                                    *Peringatan duplikasi: Teks soal serupa sudah ada di Bank Soal.
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                <p className="text-slate-800 line-clamp-1">{r.rawData?.PERTANYAAN || '(Teks kosong)'}</p>
                                <p className="text-[11px] font-bold text-rose-600">
                                  {r.errorMessage}
                                </p>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-[11px]">
                            {r.isValid && r.question ? (
                              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {Array.isArray(r.question.answerKey)
                                  ? r.question.answerKey.join(', ')
                                  : (r.question.answerKey || '-')}
                              </span>
                            ) : (
                              <span className="text-slate-400">{r.rawData?.KUNCI_JAWABAN || '-'}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SECTION B: TEXT / DOC / CBT FORMAT IMPORT */}
        {importMode === 'text' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                Tempelkan Teks Soal atau Unggah Berkas DOC / TXT:
              </span>
              <button
                type="button"
                onClick={handleApplyTextTemplate}
                className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold rounded-lg border border-blue-200 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedTemplate ? 'Contoh Diterapkan!' : 'Muat Contoh Teks Soal Lengkap'}</span>
              </button>
            </div>

            <textarea
              rows={8}
              value={inputText}
              onChange={e => {
                setInputText(e.target.value);
                runTextParsing(e.target.value);
              }}
              placeholder="Tempelkan naskah soal berformat DOC / teks CBT di sini..."
              className="w-full p-3 border border-slate-300 rounded-xl text-xs font-mono bg-white text-slate-900 leading-relaxed"
            />

            {textParseResult && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                <span className="font-bold text-slate-800">
                  Hasil Analisis Parser: {textParseResult.questions.length} Butir Soal Terdeteksi
                </span>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="primary">PG: {textParseResult.summary.byType.multiple_choice || 0}</Badge>
                  <Badge variant="warning">PGK: {textParseResult.summary.byType.complex_multiple_choice || 0}</Badge>
                  <Badge variant="neutral">B/S: {textParseResult.summary.byType.true_false || 0}</Badge>
                  <Badge variant="success">Isian: {textParseResult.summary.byType.short_answer || 0}</Badge>
                  <Badge variant="danger">Esai: {textParseResult.summary.byType.essay || 0}</Badge>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Execution Summary Notification */}
        {saveResult && (
          <div className="p-4 sm:p-5 rounded-2xl border bg-emerald-50 border-emerald-300 text-emerald-950 space-y-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-extrabold text-sm sm:text-base text-emerald-950 block">
                  Sukses Menyimpan {saveResult.successCount} Soal ke Bank Soal!
                </span>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Butir soal telah aktif dan tersimpan untuk mata pelajaran <strong>{curSubj.name} (Kelas {selectedGrade})</strong>.
                  {saveResult.skippedCount > 0 && ` (${saveResult.skippedCount} butir duplikat dilewati sesuai kebijakan).`}
                  {saveResult.failedCount > 0 && ` (${saveResult.failedCount} gagal disimpan).`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-200">
              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-colors"
              >
                <span>Lihat Soal di Bank Soal Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setSaveResult(null);
                  setFileName('');
                  setExcelSummary(null);
                  setInputText('');
                  setTextParseResult(null);
                }}
                className="px-3.5 py-2 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                Import Berkas Lainnya
              </button>
            </div>
          </div>
        )}

        {/* Modal Action Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
          >
            Tutup
          </button>

          <button
            type="button"
            disabled={
              (importMode === 'excel' && (!excelSummary || excelSummary.validCount === 0)) ||
              (importMode === 'text' && (!textParseResult || textParseResult.questions.length === 0)) ||
              isSaving
            }
            onClick={() => setShowConfirmModal(true)}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {isSaving
                ? 'Menyimpan...'
                : `Konfirmasi & Simpan (${importMode === 'excel' ? (excelSummary?.validCount || 0) : (textParseResult?.questions.length || 0)} Soal)`}
            </span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal Before Writing to Database */}
      {showConfirmModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowConfirmModal(false)}
          title="Konfirmasi Penyimpanan Butir Soal"
          maxWidth="sm"
        >
          <div className="space-y-4 py-1 text-xs">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5 text-amber-900">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Penyimpanan Batch ke Bank Soal</span>
                <p className="mt-0.5 leading-relaxed text-[11px]">
                  Sistem akan memproses {importMode === 'excel' ? excelSummary?.validCount : textParseResult?.questions.length} butir soal ke mata pelajaran <strong>{curSubj.name} (Kelas {selectedGrade})</strong>.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 space-y-1 text-[11px]">
              <div>Kebijakan Duplikat: <strong>{duplicatePolicy === 'skip_duplicates' ? 'Lewati Duplikat' : duplicatePolicy === 'update_duplicates' ? 'Timpa Data Lama' : 'Simpan Sebagai Soal Baru'}</strong></div>
              <div>Perlindungan Data: <strong>Soal lama tidak akan terhapus saat terjadi kegagalan jaringan/batch.</strong></div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleConfirmSave}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
              >
                {isSaving ? 'Menyimpan Batch...' : 'Ya, Simpan ke Bank Soal'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
};
