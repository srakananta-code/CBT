import * as XLSX from 'xlsx';
import { collection, doc, writeBatch, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import type {
  Question,
  QuestionType,
  GradeLevel,
  DifficultyLevel,
  QuestionOption,
  TrueFalseStatement,
  ShortAnswerRule
} from '../types/database';

export interface ExcelRowValidation {
  rowNumber: number;
  isValid: boolean;
  isDuplicate?: boolean;
  question?: Question;
  errors: string[];
  raw: Record<string, any>;
}

export interface ExcelImportSummary {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  rows: ExcelRowValidation[];
}

export type DuplicatePolicy = 'skip' | 'allow_copy' | 'overwrite';

export interface BatchSaveResult {
  successCount: number;
  failCount: number;
  errors: string[];
}

/**
 * 1. MEMBUAT DAN MENGUNDUH TEMPLATE RESMI XLSX DENGAN 2 SHEET
 * Sheet 1: Template_Bank_Soal (Header & 5 Baris Contoh untuk 5 Jenis Soal)
 * Sheet 2: Petunjuk_Pengisian (Dokumentasi lengkap kolom, aturan kunci, dan contoh)
 */
export function generateQuestionExcelTemplate(): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Data Template
  const headers = [
    'No',
    'Jenis_Soal', // PG, PGK, BS, ISIAN, ESAI
    'Tingkat_Kelas', // VII, VIII, IX
    'Mata_Pelajaran', // Contoh: Matematika
    'Materi', // Contoh: Aljabar
    'Topik', // Contoh: Persamaan Kuadrat
    'Tingkat_Kesulitan', // MUDAH, SEDANG, SUKAR
    'Bobot_Poin', // Angka, misal 20
    'Teks_Pertanyaan', // Mendukung LaTeX inline $x^2$
    'Gambar_Soal_URL', // URL gambar ilustrasi opsional
    'Opsi_A',
    'Opsi_B',
    'Opsi_C',
    'Opsi_D',
    'Opsi_E',
    'Kunci_Jawaban', // Terdokumentasi jelas per tipe
    'Pembahasan_Privat', // Pembahasan / Rubrik penskoran
    'Variasi_Jawaban_Isian' // Sinonim diterima untuk isian singkat
  ];

  const sampleRows = [
    [
      1,
      'PG',
      'IX',
      'Matematika',
      'Persamaan Kuadrat',
      'Diskriminan Kuadrat',
      'SEDANG',
      20,
      'Nilai diskriminan dari persamaan kuadrat $2x^2 - 5x - 3 = 0$ dengan rumus $D = b^2 - 4ac$ adalah...',
      '',
      '49',
      '31',
      '-1',
      '-23',
      '',
      'A',
      'D = (-5)^2 - 4(2)(-3) = 25 + 24 = 49.',
      ''
    ],
    [
      2,
      'PGK',
      'IX',
      'Matematika',
      'Bangun Datar',
      'Trapesium Sama Kaki',
      'SEDANG',
      20,
      'Perhatikan sifat-sifat bangun datar trapesium sama kaki. Pilihlah semua pernyataan yang BENAR!',
      '',
      'Memiliki sepasang sisi sejajar',
      'Keempat sisinya sama panjang',
      'Panjang kedua diagonalnya sama',
      'Sudut alas sama besar',
      '',
      'A, C, D',
      'Trapesium sama kaki memiliki sisi sejajar, diagonal sama, dan sudut alas sama.',
      ''
    ],
    [
      3,
      'BS',
      'IX',
      'Matematika',
      'Bilangan & Teorema Geometri',
      'Pernyataan Terpadu',
      'MUDAH',
      20,
      'Tentukan kebenaran dari pernyataan berikut:\n(1) Akar kuadrat $\\sqrt{144}$ adalah 12.\n(2) Jumlah sudut segitiga adalah 360°.\n(3) Bilangan prima genap adalah 2.',
      '',
      '',
      '',
      '',
      '',
      '',
      '(1) Nilai dari $\\sqrt{144}$ adalah 12 | BENAR; (2) Jumlah sudut dalam segitiga adalah 360° | SALAH; (3) Bilangan prima terkecil yang bernilai genap adalah 2 | BENAR',
      'Pernyataan (1) Benar. Pernyataan (2) Salah karena jumlah sudut segitiga adalah 180°. Pernyataan (3) Benar.',
      ''
    ],
    [
      4,
      'ISIAN',
      'IX',
      'Matematika',
      'Teorema Pythagoras',
      'Panjang Hipotenusa',
      'MUDAH',
      20,
      'Sebuah segitiga siku-siku memiliki alas 6 cm dan tinggi 8 cm. Berapakah panjang hipotenusanya dalam satuan cm?',
      '',
      '',
      '',
      '',
      '',
      '',
      '10',
      'c = √(6^2 + 8^2) = √(36 + 64) = √100 = 10 cm.',
      '10 cm, 10cm, sepuluh'
    ],
    [
      5,
      'ESAI',
      'IX',
      'Matematika',
      'Bangun Ruang Sisi Lengkung',
      'Volume Tabung',
      'SUKAR',
      20,
      'Sebuah tabung memiliki jari-jari $r = 7\\text{ cm}$ dan tinggi $t = 10\\text{ cm}$. Dengan $\\pi = \\frac{22}{7}$, tuliskan rumus volume tabung dan hitung volume lengkap beserta satuannya!',
      '',
      '',
      '',
      '',
      '',
      '',
      'RUBRIK_PENILAIAN',
      'Rubrik:\n1. Menulis rumus V = πr^2t (5 poin)\n2. Substitusi nilai yang tepat (5 poin)\n3. Perhitungan akhir 1.540 (7 poin)\n4. Menulis satuan cm^3 (3 poin). Total 20 poin.',
      ''
    ]
  ];

  const wsData = [headers, ...sampleRows];
  const ws1 = XLSX.utils.aoa_to_sheet(wsData);

  // Styling column widths
  ws1['!cols'] = [
    { wch: 6 },  // No
    { wch: 12 }, // Jenis_Soal
    { wch: 14 }, // Tingkat_Kelas
    { wch: 18 }, // Mata_Pelajaran
    { wch: 22 }, // Materi
    { wch: 22 }, // Topik
    { wch: 18 }, // Tingkat_Kesulitan
    { wch: 12 }, // Bobot_Poin
    { wch: 45 }, // Teks_Pertanyaan
    { wch: 25 }, // Gambar_Soal_URL
    { wch: 20 }, // Opsi_A
    { wch: 20 }, // Opsi_B
    { wch: 20 }, // Opsi_C
    { wch: 20 }, // Opsi_D
    { wch: 20 }, // Opsi_E
    { wch: 30 }, // Kunci_Jawaban
    { wch: 35 }, // Pembahasan_Privat
    { wch: 25 }  // Variasi_Jawaban_Isian
  ];

  XLSX.utils.book_append_sheet(wb, ws1, 'Template_Bank_Soal');

  // Sheet 2: Petunjuk Format Kolom & Kunci
  const guideData = [
    ['PANDUAN LENGKAP STRUKTUR KOLOM & ATURAN FORMAT IMPORT BANK SOAL EXCEL (XLSX)'],
    ['E-UJIAN SEKOLAH CBT - SISTEM PENILAIAN INDONESIA'],
    [''],
    ['KOLOM', 'KEWAJIBAN', 'FORMAT & NILAI YANG DITERIMA', 'PENJELASAN & CONTOH'],
    ['Jenis_Soal', 'WAJIB', 'PG, PGK, BS, ISIAN, ESAI', 'Kode jenis soal. PG = Pilihan Ganda, PGK = PG Kompleks, BS = Benar/Salah, ISIAN = Isian Singkat, ESAI = Uraian.'],
    ['Tingkat_Kelas', 'WAJIB', 'VII, VIII, IX', 'Tingkat kelas sasaran SMP/MTs.'],
    ['Mata_Pelajaran', 'WAJIB', 'Teks nama mapel', 'Contoh: Matematika, IPA, Bahasa Indonesia, Bahasa Inggris.'],
    ['Materi', 'OPSIONAL', 'Teks pokok materi', 'Contoh: Persamaan Kuadrat, Suhu dan Kalor, Teks Prosedur.'],
    ['Topik', 'OPSIONAL', 'Teks topik spesifik', 'Contoh: Nilai Diskriminan, Perpindahan Panas, Konjungsi Temporal.'],
    ['Tingkat_Kesulitan', 'OPSIONAL', 'MUDAH, SEDANG, SUKAR', 'Default bernilai SEDANG jika dikosongkan.'],
    ['Bobot_Poin', 'OPSIONAL', 'Angka positif (1 - 100)', 'Default 10 poin jika dikosongkan.'],
    ['Teks_Pertanyaan', 'WAJIB', 'Teks, markdown, dan formula LaTeX', 'Formula matematika ditulis dengan tanda dollar, contoh: $x^2 + y^2 = r^2$.'],
    ['Gambar_Soal_URL', 'OPSIONAL', 'URL http/https gambar', 'Contoh: https://contoh.sch.id/diagram.png'],
    ['Opsi_A - Opsi_E', 'KONDISIONAL', 'Teks pilihan jawaban', 'Wajib diisi minimal Opsi_A dan Opsi_B untuk soal jenis PG dan PGK.'],
    ['Kunci_Jawaban', 'WAJIB', 'Tergantung Jenis Soal', 'LIHAT ATURAN KUNCI JAWABAN DI BAWAH INI.'],
    ['Pembahasan_Privat', 'OPSIONAL', 'Teks pembahasan/rubrik', 'Informasi rahasia. Tidak akan dikirim ke siswa selama ujian.'],
    ['Variasi_Jawaban_Isian', 'OPSIONAL', 'Sinonim dipisahkan koma', 'Khusus tipe ISIAN. Contoh: 10 cm, 10cm, sepuluh sentimeter.'],
    [''],
    ['ATURAN FORMAT KUNCI JAWABAN SESUAI JENIS SOAL:'],
    ['1. PILIHAN GANDA (PG)', '', 'Tepat 1 huruf kapital opsi yang benar (A, B, C, D, atau E).', 'Contoh: A'],
    ['2. PG KOMPLEKS (PGK)', '', 'Huruf-huruf opsi benar dipisahkan koma atau spasi.', 'Contoh: A, C, D atau A,B'],
    ['3. BENAR / SALAH (BS)', '', 'Format pernyataan bertingkat dipisahkan titik koma (;):\n[Teks Pernyataan] | [BENAR/SALAH]; [Teks Pernyataan 2] | [BENAR/SALAH]', 'Contoh: Nilai √144 adalah 12 | BENAR; Sudut segitiga 360° | SALAH'],
    ['4. ISIAN SINGKAT (ISIAN)', '', 'Kata kunci jawaban utama yang tepat.', 'Contoh: 10 (Variasi seperti "10 cm" ditulis di kolom Variasi_Jawaban_Isian).'],
    ['5. URAIAN / ESAI (ESAI)', '', 'Tuliskan "RUBRIK_PENILAIAN" atau kata kunci pedoman.', 'Esai diperiksa manual oleh guru pengampu berdasarkan rubrik.'],
    [''],
    ['KEBIJAKAN PENCEGAHAN IMPOR GANDA:'],
    ['- Sistem mendeteksi kesamaan teks pertanyaan, mata pelajaran, dan tingkat kelas.'],
    ['- Anda dapat memilih kebijakan: "Lewati (Skip) Duplikat", "Impor Sebagai Salinan", atau "Perbarui Data Lama".']
  ];

  const ws2 = XLSX.utils.aoa_to_sheet(guideData);
  ws2['!cols'] = [
    { wch: 25 },
    { wch: 15 },
    { wch: 40 },
    { wch: 60 }
  ];

  XLSX.utils.book_append_sheet(wb, ws2, 'Petunjuk_Pengisian');

  // Trigger download
  XLSX.writeFile(wb, `Template_Import_Bank_Soal_CBT_${Date.now()}.xlsx`);
}

/**
 * 2. MEMVALIDASI DAN MEMBACA FILE EXCEL SECARA DETAIL PER BARIS
 */
export async function parseAndValidateQuestionExcel(
  file: File,
  existingQuestions: Question[],
  defaultCreator: { uid: string; name: string }
): Promise<ExcelImportSummary> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  if (wb.SheetNames.length === 0) {
    throw new Error('Berkas Excel kosong atau tidak memiliki lembar kerja (sheet).');
  }

  // Pilih sheet pertama atau sheet bernama Template_Bank_Soal / Bank_Soal
  const targetSheetName =
    wb.SheetNames.find(n => /template|bank.*soal|soal/i.test(n)) || wb.SheetNames[0];
  const ws = wb.Sheets[targetSheetName];

  if (!ws) {
    throw new Error('Lembar kerja pada berkas Excel tidak dapat dibaca.');
  }

  // Convert to JSON with raw values
  const rawData: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

  if (rawData.length === 0) {
    throw new Error('Berkas Excel tidak memiliki baris data soal (hanya baris judul atau kosong).');
  }

  // Cek kolom wajib pada baris pertama / headers
  const firstRow = rawData[0];
  const keys = Object.keys(firstRow).map(k => k.trim().toLowerCase());

  const hasQuestionText = keys.some(k => k.includes('teks') || k.includes('pertanyaan') || k.includes('soal'));
  const hasType = keys.some(k => k.includes('jenis') || k.includes('tipe') || k.includes('type'));
  const hasKey = keys.some(k => k.includes('kunci') || k.includes('jawaban') || k.includes('key'));

  if (!hasQuestionText) {
    throw new Error('Format berkas tidak valid: Kolom wajib "Teks_Pertanyaan" tidak ditemukan pada berkas Excel.');
  }
  if (!hasType) {
    throw new Error('Format berkas tidak valid: Kolom wajib "Jenis_Soal" tidak ditemukan pada berkas Excel.');
  }
  if (!hasKey) {
    throw new Error('Format berkas tidak valid: Kolom wajib "Kunci_Jawaban" tidak ditemukan pada berkas Excel.');
  }

  // Map header variations to standardized fields
  const getVal = (row: Record<string, any>, candidates: string[]): string => {
    for (const key of Object.keys(row)) {
      const cleanKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const cand of candidates) {
        if (cleanKey.includes(cand.toLowerCase().replace(/[^a-z0-9]/g, ''))) {
          const val = row[key];
          return val !== undefined && val !== null ? String(val).trim() : '';
        }
      }
    }
    return '';
  };

  const rowsValidation: ExcelRowValidation[] = [];
  let validCount = 0;
  let invalidCount = 0;
  let duplicateCount = 0;

  rawData.forEach((row, index) => {
    const rowNumber = index + 2; // +1 header, +1 1-based index
    const errors: string[] = [];

    const rawType = getVal(row, ['jenis_soal', 'jenissoal', 'jenis', 'tipe', 'type']).toUpperCase();
    const rawGrade = getVal(row, ['tingkat_kelas', 'tingkatkelas', 'kelas', 'grade']).toUpperCase();
    const rawSubject = getVal(row, ['mata_pelajaran', 'matapelajaran', 'mapel', 'subject']) || 'Umum';
    const rawMaterial = getVal(row, ['materi', 'bab', 'pokokbahasan']);
    const rawTopic = getVal(row, ['topik', 'topic', 'subtopik']) || rawMaterial || 'Umum';
    const rawDifficulty = getVal(row, ['tingkat_kesulitan', 'kesulitan', 'difficulty']).toUpperCase();
    const rawWeight = getVal(row, ['bobot_poin', 'bobot', 'poin', 'weight']);
    const rawText = getVal(row, ['teks_pertanyaan', 'tekspertanyaan', 'pertanyaan', 'soal', 'text']);
    const rawImage = getVal(row, ['gambar_soal_url', 'gambar', 'image', 'url_gambar']);
    const rawKey = getVal(row, ['kunci_jawaban', 'kuncijawaban', 'kunci', 'key', 'jawaban']);
    const rawExplanation = getVal(row, ['pembahasan_privat', 'pembahasan', 'rubrik', 'explanation']);
    const rawSynonyms = getVal(row, ['variasi_jawaban_isian', 'sinonim', 'variasi', 'accepted']);

    const optA = getVal(row, ['opsi_a', 'opsia', 'pilihan_a', 'a']);
    const optB = getVal(row, ['opsi_b', 'opsib', 'pilihan_b', 'b']);
    const optC = getVal(row, ['opsi_c', 'opsic', 'pilihan_c', 'c']);
    const optD = getVal(row, ['opsi_d', 'opsid', 'pilihan_d', 'd']);
    const optE = getVal(row, ['opsi_e', 'opsie', 'pilihan_e', 'e']);

    // 1. Validasi Teks Pertanyaan
    if (!rawText) {
      errors.push('Teks pertanyaan wajib diisi dan tidak boleh kosong.');
    }

    // 2. Validasi Tipe Soal
    let standardType: QuestionType = 'multiple_choice';
    if (/PGK|KOMPLEKS|COMPLEX/i.test(rawType)) {
      standardType = 'complex_multiple_choice';
    } else if (/BS|BENAR.*SALAH|TRUE.*FALSE/i.test(rawType)) {
      standardType = 'true_false';
    } else if (/ISIAN|SINGKAT|SHORT/i.test(rawType)) {
      standardType = 'short_answer';
    } else if (/ESAI|URAIAN|ESSAY/i.test(rawType)) {
      standardType = 'essay';
    } else if (/PG|PILIHAN.*GANDA|MULTIPLE/i.test(rawType)) {
      standardType = 'multiple_choice';
    } else {
      errors.push(`Jenis soal "${rawType}" tidak valid. Harus salah satu dari: PG, PGK, BS, ISIAN, atau ESAI.`);
    }

    // 3. Validasi Kelas
    let standardGrade: GradeLevel = 'IX';
    if (/VII|7/i.test(rawGrade)) standardGrade = 'VII';
    else if (/VIII|8/i.test(rawGrade)) standardGrade = 'VIII';
    else if (/IX|9/i.test(rawGrade)) standardGrade = 'IX';
    else if (rawGrade) {
      errors.push(`Tingkat kelas "${rawGrade}" tidak valid. Pilihan yang didukung: VII, VIII, atau IX.`);
    }

    // 4. Validasi Tingkat Kesulitan
    let standardDifficulty: DifficultyLevel = 'medium';
    if (/MUDAH|EASY|DASAR/i.test(rawDifficulty)) standardDifficulty = 'easy';
    else if (/SUKAR|SULIT|HARD|HOTS/i.test(rawDifficulty)) standardDifficulty = 'hard';
    else standardDifficulty = 'medium';

    // 5. Validasi Bobot Poin
    let weight = 10;
    if (rawWeight) {
      const parsedWeight = parseFloat(rawWeight);
      if (isNaN(parsedWeight) || parsedWeight <= 0) {
        errors.push(`Bobot poin "${rawWeight}" harus berupa angka positif.`);
      } else {
        weight = Math.min(100, Math.max(1, Math.round(parsedWeight)));
      }
    }

    // 6. Validasi Opsi dan Kunci Jawaban Spesifik per Tipe
    const options: QuestionOption[] = [];
    if (optA) options.push({ id: 'A', text: optA });
    if (optB) options.push({ id: 'B', text: optB });
    if (optC) options.push({ id: 'C', text: optC });
    if (optD) options.push({ id: 'D', text: optD });
    if (optE) options.push({ id: 'E', text: optE });

    let finalAnswerKey: any = rawKey;
    const tfStatements: TrueFalseStatement[] = [];
    let shortRules: ShortAnswerRule | undefined = undefined;

    if (standardType === 'multiple_choice') {
      if (options.length < 2) {
        errors.push('Soal Pilihan Ganda minimal harus memiliki Opsi A dan Opsi B.');
      }
      const cleanKey = rawKey.toUpperCase().trim().charAt(0);
      if (!cleanKey || !['A', 'B', 'C', 'D', 'E'].includes(cleanKey)) {
        errors.push(`Kunci jawaban "${rawKey}" tidak valid untuk Pilihan Ganda. Harus tepat satu huruf (A-E).`);
      } else if (!options.some(o => o.id === cleanKey)) {
        errors.push(`Kunci jawaban "${cleanKey}" menunjuk ke opsi yang tidak memiliki teks di berkas.`);
      } else {
        finalAnswerKey = cleanKey;
        options.forEach(o => { o.isCorrect = o.id === cleanKey; });
      }
    } else if (standardType === 'complex_multiple_choice') {
      if (options.length < 2) {
        errors.push('Soal PG Kompleks minimal harus memiliki Opsi A dan Opsi B.');
      }
      const keyParts = rawKey.toUpperCase().split(/[,;\s]+/).map(k => k.trim()).filter(Boolean);
      if (keyParts.length === 0) {
        errors.push('Kunci jawaban PG Kompleks tidak boleh kosong. Tuliskan opsi benar (contoh: A, C, D).');
      } else {
        const invalidKeys = keyParts.filter(k => !options.some(o => o.id === k));
        if (invalidKeys.length > 0) {
          errors.push(`Kunci jawaban PG Kompleks memuat opsi yang tidak tersedia di berkas: ${invalidKeys.join(', ')}.`);
        } else {
          finalAnswerKey = keyParts;
          options.forEach(o => { o.isCorrect = keyParts.includes(o.id); });
        }
      }
    } else if (standardType === 'true_false') {
      // Parse format bertingkat: "Pernyataan 1 | BENAR ; Pernyataan 2 | SALAH"
      if (!rawKey) {
        errors.push('Kunci jawaban Benar/Salah tidak boleh kosong.');
      } else {
        const pairs = rawKey.split(';').map(p => p.trim()).filter(Boolean);
        if (pairs.length === 0) {
          errors.push('Format pernyataan Benar/Salah tidak terstruktur. Gunakan format: Pernyataan | BENAR ; Pernyataan | SALAH.');
        } else {
          pairs.forEach((pair, pIdx) => {
            const parts = pair.split('|').map(s => s.trim());
            const stmtText = parts[0];
            const verdict = parts[1]?.toUpperCase() || 'BENAR';
            const isCorrect = /BENAR|TRUE|B/i.test(verdict);
            if (stmtText) {
              tfStatements.push({
                id: `stmt_${pIdx + 1}`,
                statement: stmtText,
                isCorrect
              });
            }
          });

          if (tfStatements.length === 0) {
            errors.push('Tidak ada pernyataan Benar/Salah yang valid berhasil diuraikan.');
          }
        }
      }
    } else if (standardType === 'short_answer') {
      if (!rawKey) {
        errors.push('Kunci jawaban isian singkat wajib diisi.');
      } else {
        const acceptedList = [rawKey.trim()];
        if (rawSynonyms) {
          rawSynonyms.split(/[,;\n]/).forEach(s => {
            const syn = s.trim();
            if (syn && !acceptedList.includes(syn)) acceptedList.push(syn);
          });
        }
        shortRules = {
          caseSensitive: false,
          ignoreSpacing: true,
          acceptedAnswers: acceptedList
        };
        finalAnswerKey = rawKey.trim();
      }
    } else if (standardType === 'essay') {
      finalAnswerKey = 'RUBRIK_PENILAIAN_MANUAL';
      if (!rawExplanation) {
        // Warning / recommended guideline
      }
    }

    // 7. Cek Deteksi Duplikat di Bank Soal
    const isDuplicate = existingQuestions.some(eq => {
      const sameText = eq.questionText.trim().toLowerCase() === rawText.trim().toLowerCase();
      const sameSubj = eq.subjectName.trim().toLowerCase() === rawSubject.trim().toLowerCase();
      const sameGrade = eq.gradeLevel === standardGrade;
      return sameText && (sameSubj || sameGrade);
    });

    if (isDuplicate) {
      duplicateCount++;
    }

    const isValid = errors.length === 0;
    if (isValid) validCount++;
    else invalidCount++;

    let constructedQuestion: Question | undefined = undefined;
    if (isValid) {
      constructedQuestion = {
        id: `q_imp_xl_${Date.now()}_${index}`,
        subjectId: rawSubject.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        subjectName: rawSubject,
        gradeLevel: standardGrade,
        type: standardType,
        questionText: rawText,
        questionImage: rawImage || undefined,
        options: (standardType === 'multiple_choice' || standardType === 'complex_multiple_choice') ? options : [],
        topic: rawTopic,
        material: rawMaterial || undefined,
        difficulty: standardDifficulty,
        weight,
        answerKey: finalAnswerKey,
        trueFalseStatements: standardType === 'true_false' ? tfStatements : undefined,
        shortAnswerRules: shortRules,
        explanation: rawExplanation || undefined,
        creatorId: defaultCreator.uid,
        creatorName: defaultCreator.name,
        createdAt: new Date().toISOString()
      };
    }

    rowsValidation.push({
      rowNumber,
      isValid,
      isDuplicate,
      question: constructedQuestion,
      errors,
      raw: row
    });
  });

  return {
    totalRows: rawData.length,
    validCount,
    invalidCount,
    duplicateCount,
    rows: rowsValidation
  };
}

/**
 * 3. MENYIMPAN HASIL IMPORT KE FIRESTORE DENGAN BATCH WRITE AMAN (CHUNKS MAX 300)
 */
export async function executeExcelBatchImport(
  validatedRows: ExcelRowValidation[],
  duplicatePolicy: DuplicatePolicy = 'skip'
): Promise<BatchSaveResult> {
  const toSave: Question[] = [];

  for (const row of validatedRows) {
    if (!row.isValid || !row.question) continue;

    if (row.isDuplicate) {
      if (duplicatePolicy === 'skip') {
        continue; // Lewati soal duplikat
      } else if (duplicatePolicy === 'allow_copy') {
        toSave.push({
          ...row.question,
          id: `q_copy_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          questionText: `${row.question.questionText} (Salinan)`
        });
      } else {
        toSave.push(row.question);
      }
    } else {
      toSave.push(row.question);
    }
  }

  if (toSave.length === 0) {
    return {
      successCount: 0,
      failCount: 0,
      errors: ['Tidak ada butir soal valid yang dapat disimpan sesuai kebijakan yang dipilih.']
    };
  }

  let successCount = 0;
  let failCount = 0;
  const errors: string[] = [];

  // Chunking batch max 300 docs (safe Firestore write limit)
  const chunkSize = 300;
  for (let i = 0; i < toSave.length; i += chunkSize) {
    const chunk = toSave.slice(i, i + chunkSize);
    try {
      const batch = writeBatch(db);
      chunk.forEach(q => {
        const docRef = doc(db, 'questionBank', q.id);
        batch.set(docRef, {
          ...q,
          updatedAt: new Date().toISOString()
        });
      });
      await batch.commit();
      successCount += chunk.length;
    } catch (err: any) {
      console.warn(`Firestore batch commit chunk ${i} failed:`, err);
      // Fallback single write
      for (const q of chunk) {
        try {
          const docRef = doc(db, 'questionBank', q.id);
          const singleBatch = writeBatch(db);
          singleBatch.set(docRef, q);
          await singleBatch.commit();
          successCount++;
        } catch (singleErr: any) {
          failCount++;
          errors.push(`Gagal menyimpan soal ID ${q.id}: ${singleErr?.message || 'Error'}`);
        }
      }
    }
  }

  return {
    successCount,
    failCount,
    errors
  };
}

/**
 * 4. EKSPOR BANK SOAL KE XLSX / CSV DENGAN PROTEKSI KUNCI JAWABAN
 * Standar Publik: Kunci Jawaban & Pembahasan 100% DIHAPUS.
 * Fungsi Khusus Guru/Admin: Kunci Jawaban hanya disertakan jika includeAnswerKey = true dengan otorisasi.
 */
export interface ExcelExportFilterOptions {
  questions: Question[];
  format: 'xlsx' | 'csv';
  includeAnswerKey: boolean; // Harus false secara default untuk ekspor umum
  filename?: string;
  metadata?: {
    schoolName?: string;
    teacherName?: string;
    subjectName?: string;
    gradeLevel?: string;
  };
}

export function exportQuestionsToExcelFile(options: ExcelExportFilterOptions): void {
  const {
    questions,
    format,
    includeAnswerKey,
    filename = 'Bank_Soal_Export',
    metadata
  } = options;

  if (questions.length === 0) {
    throw new Error('Tidak ada butir soal yang dipilih untuk diekspor.');
  }

  const exportRows = questions.map((q, idx) => {
    let keyStr = 'DILINDUNGI_PRIVAT';
    let explanationStr = 'DILINDUNGI_PRIVAT';

    if (includeAnswerKey) {
      if (q.type === 'multiple_choice') {
        keyStr = typeof q.answerKey === 'string' ? q.answerKey : (q.options.find(o => o.isCorrect)?.id || 'A');
      } else if (q.type === 'complex_multiple_choice') {
        keyStr = Array.isArray(q.answerKey) ? q.answerKey.join(', ') : (q.options.filter(o => o.isCorrect).map(o => o.id).join(', ') || '-');
      } else if (q.type === 'true_false' && q.trueFalseStatements) {
        keyStr = q.trueFalseStatements.map((s, i) => `(${i + 1}) ${s.statement} | ${s.isCorrect ? 'BENAR' : 'SALAH'}`).join(' ; ');
      } else if (q.type === 'short_answer') {
        const accepted = q.shortAnswerRules?.acceptedAnswers || [];
        keyStr = (typeof q.answerKey === 'string' ? q.answerKey : '') || accepted.join(' / ');
      } else if (q.type === 'essay') {
        keyStr = 'Pemeriksaan Manual Guru';
      }
      explanationStr = q.explanation || '-';
    }

    const typeCodeMap: Record<string, string> = {
      multiple_choice: 'PG',
      complex_multiple_choice: 'PGK',
      true_false: 'BS',
      short_answer: 'ISIAN',
      essay: 'ESAI'
    };

    const rowObj: Record<string, any> = {
      No: idx + 1,
      Jenis_Soal: typeCodeMap[q.type] || q.type,
      Tingkat_Kelas: q.gradeLevel,
      Mata_Pelajaran: q.subjectName,
      Materi: q.material || '-',
      Topik: q.topic || '-',
      Tingkat_Kesulitan: q.difficulty === 'easy' ? 'MUDAH' : q.difficulty === 'medium' ? 'SEDANG' : 'SUKAR',
      Bobot_Poin: q.weight || 10,
      Teks_Pertanyaan: q.questionText,
      Gambar_Soal_URL: q.questionImage || '',
      Opsi_A: q.options.find(o => o.id === 'A')?.text || '',
      Opsi_B: q.options.find(o => o.id === 'B')?.text || '',
      Opsi_C: q.options.find(o => o.id === 'C')?.text || '',
      Opsi_D: q.options.find(o => o.id === 'D')?.text || '',
      Opsi_E: q.options.find(o => o.id === 'E')?.text || ''
    };

    if (includeAnswerKey) {
      rowObj['Kunci_Jawaban_Privat'] = keyStr;
      rowObj['Pembahasan_Privat'] = explanationStr;
    } else {
      rowObj['Keterangan_Keamanan'] = 'Kunci jawaban dan pembahasan privat disembunyikan sesuai kebijakan keamanan CBT.';
    }

    return rowObj;
  });

  const ws = XLSX.utils.json_to_sheet(exportRows);

  ws['!cols'] = [
    { wch: 6 },
    { wch: 12 },
    { wch: 14 },
    { wch: 20 },
    { wch: 22 },
    { wch: 22 },
    { wch: 16 },
    { wch: 12 },
    { wch: 45 },
    { wch: 25 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 }
  ];

  const wb = XLSX.utils.book_new();
  const sheetName = includeAnswerKey ? 'Bank_Soal_Lengkap_Privat' : 'Bank_Soal_Publik';
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const cleanFilename = `${filename.replace(/[^a-z0-9_-]/gi, '_')}_${Date.now()}`;
  if (format === 'csv') {
    XLSX.writeFile(wb, `${cleanFilename}.csv`, { bookType: 'csv' });
  } else {
    XLSX.writeFile(wb, `${cleanFilename}.xlsx`, { bookType: 'xlsx' });
  }
}
