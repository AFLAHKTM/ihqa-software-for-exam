import bcrypt from "bcryptjs";
import type { DbClient } from "./db";

const KERALA_DISTRICTS = [
  { code: "TVM", en: "Thiruvananthapuram", ml: "തിരുവനന്തപുരം", ar: "ثيروفانانثابورام", zone: "SOUTH" },
  { code: "KLM", en: "Kollam", ml: "കൊല്ലം", ar: "كولام", zone: "SOUTH" },
  { code: "PTA", en: "Pathanamthitta", ml: "പത്തനംതിട്ട", ar: "باثانامثيتا", zone: "SOUTH" },
  { code: "ALP", en: "Alappuzha", ml: "ആലപ്പുഴ", ar: "ألابوزا", zone: "SOUTH" },
  { code: "KTM", en: "Kottayam", ml: "കോട്ടയം", ar: "كوتايام", zone: "CENTRAL" },
  { code: "IDK", en: "Idukki", ml: "ഇടുക്കി", ar: "إدوكي", zone: "CENTRAL" },
  { code: "EKM", en: "Ernakulam", ml: "എറണാകുളം", ar: "إرناكولام", zone: "CENTRAL" },
  { code: "TSR", en: "Thrissur", ml: "തൃശ്ശൂർ", ar: "ثريسور", zone: "CENTRAL" },
  { code: "PKD", en: "Palakkad", ml: "പാലക്കാട്", ar: "بالاكاد", zone: "CENTRAL" },
  { code: "MLP", en: "Malappuram", ml: "മലപ്പുറം", ar: "مالابورام", zone: "NORTH" },
  { code: "KKD", en: "Kozhikode", ml: "കോഴിക്കോട്", ar: "كوزيكود", zone: "NORTH" },
  { code: "WYD", en: "Wayanad", ml: "വയനാട്", ar: "واياناد", zone: "NORTH" },
  { code: "KNR", en: "Kannur", ml: "കണ്ണൂർ", ar: "كانور", zone: "NORTH" },
  { code: "KSD", en: "Kasaragod", ml: "കാസർഗോഡ്", ar: "كاساراجود", zone: "NORTH" },
];

const SAMPLE_QUESTIONS = [
  {
    set: "SET-A",
    en: "[Sample Demo Item] Which Surah is known as 'Umm al-Kitab' (The Mother of the Book) and is recited in every unit of Salah?",
    ml: "[മാതൃകാ ചോദ്യം] 'ഉമ്മുൽ കിതാബ്' എന്നറിയപ്പെടുന്നതും എല്ലാ നമസ്കാര റക്അത്തുകളിലും പാരായണം ചെയ്യപ്പെടുന്നതുമായ സൂറത്ത് ഏതാണ്?",
    ar: "[سؤال تجريبي] أَيُّ سُورَةٍ تُسَمَّى أُمَّ الْكِتَابِ وَتُقْرَأُ فِي كُلِّ رَكْعَةٍ مِنَ الصَّلَاةِ؟",
    options: [
      { id: "A", text_en: "Surah Al-Fatihah (سورة الفاتحة)", text_ml: "സൂറത്തുൽ ഫാതിഹ", text_ar: "سُورَةُ الْفَاتِحَةِ" },
      { id: "B", text_en: "Surah Al-Ikhlas (سورة الإخلاص)", text_ml: "സൂറത്തുൽ ഇഖ്‌ലാസ്", text_ar: "سُورَةُ الْإِخْلَاصِ" },
      { id: "C", text_en: "Surah Yasin (سورة يس)", text_ml: "സൂറത്ത് യാസീൻ", text_ar: "سُورَةُ يس" },
      { id: "D", text_en: "Surah Al-Mulk (سورة الملك)", text_ml: "സൂറത്തുൽ മുൽക്ക്", text_ar: "سُورَةُ الْمُلْكِ" },
    ],
    correct: "A",
  },
  {
    set: "SET-A",
    en: "[Sample Demo Item] Recite and examine the verse: «إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ» — In this ayah, what is the Madd rule on «إِنَّا أَعْطَيْنَاكَ»?",
    ml: "[മാതൃകാ ചോദ്യം] «إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ» എന്ന ആയത്തിൽ «إِنَّا أَعْطَيْنَاكَ» എന്ന ഭാഗത്തുള്ള മദ്ദ് നിയമം ഏതാണ്?",
    ar: "[سؤال تجريبي] فِي قَوْلِهِ تَعَالَى: ﴿إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ﴾، مَا حُكْمُ الْمَدِّ فِي ﴿إِنَّا أَعْطَيْنَاكَ﴾؟",
    options: [
      { id: "A", text_en: "Madd Ja'iz Munfasil (المد الجائز المنفصل)", text_ml: "മദ്ദ് ജാഇസ് മുൻഫസിൽ", text_ar: "الْمَدُّ الْجَائِزُ الْمُنْفَصِلُ" },
      { id: "B", text_en: "Madd Wajib Muttasil (المد الواجب المتصل)", text_ml: "മദ്ദ് വാജിബ് മുത്തസിൽ", text_ar: "الْمَدُّ الْوَاجِبُ الْمُتَّصِلُ" },
      { id: "C", text_en: "Madd Lazim Kalimi (المد اللازم الكلمي)", text_ml: "മദ്ദ് ലാസിം കലിമി", text_ar: "الْمَدُّ اللَّازِمُ الْكَلِمِيُّ" },
      { id: "D", text_en: "Madd Arid Lissukun (المد العارض للسكون)", text_ml: "മദ്ദ് ആരിള് ലിസ്സുകൂൻ", text_ar: "الْمَدُّ الْعَارِضُ لِلسُّكُونِ" },
    ],
    correct: "A",
  },
  {
    set: "SET-A",
    en: "[Sample Demo Item] Which Quranic verse begins with «بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ۝ قُلْ هُوَ اللَّهُ أَحَدٌ» and represents one-third of the Quran in reward?",
    ml: "[മാതൃകാ ചോദ്യം] «قُلْ هُوَ اللَّهُ أَحَدٌ» എന്ന് തുടങ്ങുന്നതും ഖുർആനിന്റെ മൂന്നിലൊന്നിന് തുല്യമായ പ്രതിഫലമുള്ളതുമായ സൂറത്ത് ഏത്?",
    ar: "[سؤال تجريبي] أَيُّ سُورَةٍ تَبْدَأُ بِقَوْلِهِ تَعَالَى: ﴿قُلْ هُوَ اللَّهُ أَحَدٌ﴾ وَتَعْدِلُ ثُلُثَ الْقُرْآنِ؟",
    options: [
      { id: "A", text_en: "Surah Al-Falaq", text_ml: "സൂറത്തുൽ ഫലഖ്", text_ar: "سُورَةُ الْفَلَقِ" },
      { id: "B", text_en: "Surah Al-Ikhlas", text_ml: "സൂറത്തുൽ ഇഖ്‌ലാസ്", text_ar: "سُورَةُ الْإِخْلَاصِ" },
      { id: "C", text_en: "Surah An-Nas", text_ml: "സൂറത്തുൻ നാസ്", text_ar: "سُورَةُ النَّاسِ" },
      { id: "D", text_en: "Surah Al-Kafirun", text_ml: "സൂറത്തുൽ കാഫിറൂൻ", text_ar: "سُورَةُ الْكَافِرُونَ" },
    ],
    correct: "B",
  },
  {
    set: "SET-A",
    en: "[Sample Demo Item] In Tajweed, what is the rule when Noon Sakinah (نْ) or Tanween is followed by the letter Ba (ب)?",
    ml: "[മാതൃകാ ചോദ്യം] തജ്‌വീദിൽ നൂൻ സാക്കിനത്തിനോ തൻവീനിനോ ശേഷം 'ബാ' (ب) എന്ന അക്ഷരം വന്നാലുള്ള നിയമം എന്താണ്?",
    ar: "[سؤال تجريبي] فِي عِلْمِ التَّجْوِيدِ، مَا حُكْمُ النُّونِ السَّاكِنَةِ أَوِ التَّنْوِينِ إِذَا جَاءَ بَعْدَهَا حَرْفُ الْبَاءِ (ب)؟",
    options: [
      { id: "A", text_en: "Izhar Halqi (إظهار حلقي)", text_ml: "ഇള്ഹാർ ഹൽഖി", text_ar: "إِظْهَارٌ حَلْقِيٌّ" },
      { id: "B", text_en: "Idgham bi Ghunnah (إدغام بغنة)", text_ml: "ഇദ്ഗാം ബിഗുന്ന", text_ar: "إِدْغَامٌ بِغُنَّةٍ" },
      { id: "C", text_en: "Iqlab (إقلاب)", text_ml: "ഇഖ്‌ലാബ്", text_ar: "إِقْلَابٌ" },
      { id: "D", text_en: "Ikhfa Haqiqi (إخفاء حقيقي)", text_ml: "ഇഖ്ഫാഅ് ഹഖീഖി", text_ar: "إِخْفَاءٌ حَقِيقِيٌّ" },
    ],
    correct: "C",
  },
  {
    set: "SET-A",
    en: "[Sample Demo Item] Complete the ayah from Surah Al-Baqarah (2:2): «ذَٰلِكَ الْكِتَابُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًى لِّلْمُتَّقِينَ» — What does 'لِّلْمُتَّقِينَ' refer to?",
    ml: "[മാതൃകാ ചോദ്യം] «ذَٰلِكَ الْكِتَابُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًى لِّلْمُتَّقِينَ» എന്ന ആയത്തിൽ 'മുത്തഖീൻ' എന്നതുകൊണ്ട് അർത്ഥമാക്കുന്നത് ആരെ?",
    ar: "[سؤال تجريبي] فِي قَوْلِهِ تَعَالَى: ﴿ذَٰلِكَ الْكِتَابُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًى لِّلْمُتَّقِينَ﴾، مَا الْمَقْصُودُ بِـ ﴿الْمُتَّقِينَ﴾؟",
    options: [
      { id: "A", text_en: "Those who are mindful/God-conscious", text_ml: "സൂക്ഷ്മത പാലിക്കുന്നവർ (ഭക്തർ)", text_ar: "الَّذِينَ يَتَّقُونَ اللَّهَ وَيَخْشَوْنَهُ" },
      { id: "B", text_en: "Travelers on a journey", text_ml: "യാത്രക്കാർ", text_ar: "الْمُسَافِرُونَ فِي الْأَرْضِ" },
      { id: "C", text_en: "Merchants and traders", text_ml: "വ്യാപാരികൾ", text_ar: "التُّجَّارُ" },
      { id: "D", text_en: "Historians", text_ml: "ചരിത്രകാരന്മാർ", text_ar: "الْمُؤَرِّخُونَ" },
    ],
    correct: "A",
  },
  {
    set: "SET-A",
    en: "[Sample Demo Item] How many letters belong to Qalqalah (حروف القلقلة), summarized in «قُطْبُ جَدٍّ»?",
    ml: "[മാതൃകാ ചോദ്യം] «قُطْبُ جَدٍّ» എന്നതിൽ ഉൾപ്പെടുന്ന ഖൽഖലാ അക്ഷരങ്ങൾ (حروف القلقلة) എത്രയാണ്?",
    ar: "[سؤال تجريبي] كَمْ عَدَدُ حُرُوفِ الْقَلْقَلَةِ الْمَجْمُوعَةِ فِي قَوْلِهِمْ: ﴿قُطْبُ جَدٍّ﴾؟",
    options: [
      { id: "A", text_en: "4 letters", text_ml: "4 അക്ഷരങ്ങൾ", text_ar: "أَرْبَعَةُ حُرُوفٍ" },
      { id: "B", text_en: "5 letters", text_ml: "5 അക്ഷരങ്ങൾ", text_ar: "خَمْسَةُ حُرُوفٍ" },
      { id: "C", text_en: "6 letters", text_ml: "6 അക്ഷരങ്ങൾ", text_ar: "سِتَّةُ حُرُوفٍ" },
      { id: "D", text_en: "7 letters", text_ml: "7 അക്ഷരങ്ങൾ", text_ar: "سَبْعَةُ حُرُوفٍ" },
    ],
    correct: "B",
  },
  {
    set: "SET-A",
    en: "[Sample Demo Item] Which Surah in the Holy Quran has two Bismillahs — one at the beginning and one in verse 30?",
    ml: "[മാതൃകാ ചോദ്യം] തുടക്കത്തിലും മുപ്പതാം ആയത്തിലുമായി രണ്ട് തവണ ബിസ്മില്ലാഹ് വരുന്ന ഖുർആൻ സൂറത്ത് ഏതാണ്?",
    ar: "[سؤال تجريبي] مَا السُّورَةُ الَّتِي ذُكِرَتْ فِيهَا الْبَسْمَلَةُ مَرَّتَيْنِ؟",
    options: [
      { id: "A", text_en: "Surah At-Tawbah", text_ml: "സൂറത്തുൽ തൗബ", text_ar: "سُورَةُ التَّوْبَةِ" },
      { id: "B", text_en: "Surah An-Naml", text_ml: "സൂറത്തുൻ നംല്", text_ar: "سُورَةُ النَّمْلِ" },
      { id: "C", text_en: "Surah Al-Kahf", text_ml: "സൂറത്തുൽ കഹ്ഫ്", text_ar: "سُورَةُ الْكَهْفِ" },
      { id: "D", text_en: "Surah Maryam", text_ml: "സൂറത്ത് മർയം", text_ar: "سُورَةُ مَرْيَمَ" },
    ],
    correct: "B",
  },
  {
    set: "SET-A",
    en: "[Sample Demo Item] In Quranic Makharij (articulation points), where do the throat letters «ء هـ ع ح غ خ» originate?",
    ml: "[മാതൃകാ ചോദ്യം] മഖാരിജിൽ «ء هـ ع ح غ خ» എന്നീ അക്ഷരങ്ങൾ ഉച്ചരിക്കുന്നത് എവിടെ നിന്നാണ്?",
    ar: "[سؤال تجريبي] مِنْ أَيْنَ تَخْرُجُ حُرُوفُ الْحَلْقِ السِّتَّةُ: ﴿ء هـ ع ح غ خ﴾؟",
    options: [
      { id: "A", text_en: "Al-Shafatan (The Lips)", text_ml: "ചുണ്ടുകൾ (അശ്ശഫതാൻ)", text_ar: "الشَّفَتَانِ" },
      { id: "B", text_en: "Al-Lisan (The Tongue)", text_ml: "നാവ് (അല്ലിസാൻ)", text_ar: "اللِّسَانُ" },
      { id: "C", text_en: "Al-Halq (The Throat)", text_ml: "തൊണ്ട (അൽ-ഹൽഖ്)", text_ar: "الْحَلْقُ" },
      { id: "D", text_en: "Al-Khayshum (The Nasal Passage)", text_ml: "മൂക്കിന്റെ ഉൾഭാഗം (അൽ-ഖൈശൂം)", text_ar: "الْخَيْشُومُ" },
    ],
    correct: "C",
  },
];

export async function seedDatabaseIfEmpty(db: DbClient): Promise<void> {
  const existing = await db.query<{ count: string | number }>(
    "SELECT COUNT(*)::int AS count FROM districts"
  );
  if (Number(existing.rows[0]?.count ?? 0) > 0) {
    return;
  }

  for (const d of KERALA_DISTRICTS) {
    await db.query(
      `INSERT INTO districts (code, name_en, name_ml, name_ar, zone, coordinator_name, coordinator_phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (code) DO NOTHING`,
      [d.code, d.en, d.ml, d.ar, d.zone, `${d.en} District Coordinator`, "+91 98470 00100"]
    );
  }

  const districtRows = await db.query<{ id: number; code: string }>(
    "SELECT id, code FROM districts"
  );
  const districtMap = new Map(districtRows.rows.map((r) => [r.code, r.id]));

  const instSeed = [
    { code: "INST-MLP-01", name: "Ma'din Academy, Swalath Nagar", dist: "MLP", place: "Malappuram" },
    { code: "INST-KKD-01", name: "Markaz Garden Islamic Center", dist: "KKD", place: "Kozhikode" },
    { code: "INST-EKM-01", name: "Darul Uloom Islamic Academy", dist: "EKM", place: "Aluva, Ernakulam" },
    { code: "INST-TSR-01", name: "Jamia Nooriya Arabic College Center", dist: "TSR", place: "Thrissur" },
    { code: "INST-KNR-01", name: "Al-Madeena Tahfizul Quran College", dist: "KNR", place: "Kannur" },
    { code: "INST-TVM-01", name: "Crescent Academy for Quranic Studies", dist: "TVM", place: "Thiruvananthapuram" },
  ];

  for (const inst of instSeed) {
    await db.query(
      `INSERT INTO institutions (code, name, district_id, place, contact_person, contact_phone, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       ON CONFLICT (code) DO NOTHING`,
      [inst.code, inst.name, districtMap.get(inst.dist), inst.place, "Principal", "+91 94470 11223"]
    );
  }

  const instRows = await db.query<{ id: number; code: string }>(
    "SELECT id, code FROM institutions"
  );
  const instMap = new Map(instRows.rows.map((r) => [r.code, r.id]));

  const catSeed = [
    { code: "SUB-JR", en: "Sub-Junior", ml: "സബ്-ജൂനിയർ", ar: "الفئة الصغرى", age: "Configurable (Admin)", desc: "Kerala Initial Screening — Sub-Junior Category" },
    { code: "JUNIOR", en: "Junior", ml: "ജൂനിയർ", ar: "فئة الناشئين", age: "Configurable (Admin)", desc: "Kerala Initial Screening — Junior Category" },
    { code: "SENIOR", en: "Senior", ml: "സീനിയർ", ar: "الفئة الكبرى", age: "Configurable (Admin)", desc: "Kerala Initial Screening — Senior Category" },
    { code: "HIFZ", en: "Hifz & Qira'at", ml: "ഹിഫ്‌സ് & ഖിറാഅത്ത്", ar: "الحفظ والقراءات", age: "Configurable (Admin)", desc: "Kerala Initial Screening — Hifz & Qira'at Category" },
  ];

  for (const c of catSeed) {
    await db.query(
      `INSERT INTO categories (code, name_en, name_ml, name_ar, age_group, description, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       ON CONFLICT (code) DO NOTHING`,
      [c.code, c.en, c.ml, c.ar, c.age, c.desc]
    );
  }

  const catRows = await db.query<{ id: number; code: string }>(
    "SELECT id, code FROM categories"
  );
  const catMap = new Map(catRows.rows.map((r) => [r.code, r.id]));

  const now = new Date();
  const batchStart = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  const batchEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const futureStart = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
  const futureEnd = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();

  await db.query(
    `INSERT INTO exam_batches (batch_code, title, zone, start_time, end_time, max_capacity, status)
     VALUES
       ('BATCH-KL-NORTH-01', 'Batch 1 — North Kerala Districts (MLP, KKD, WYD, KNR, KSD)', 'NORTH', $1, $2, 16000, 'ACTIVE'),
       ('BATCH-KL-CENTRAL-01', 'Batch 2 — Central Kerala Districts (EKM, TSR, PKD, KTM, IDK)', 'CENTRAL', $1, $2, 14000, 'ACTIVE'),
       ('BATCH-KL-SOUTH-01', 'Batch 3 — South Kerala Districts (TVM, KLM, PTA, ALP)', 'SOUTH', $3, $4, 12000, 'SCHEDULED')
     ON CONFLICT (batch_code) DO NOTHING`,
    [batchStart, batchEnd, futureStart, futureEnd]
  );

  const batchRows = await db.query<{ id: number; batch_code: string }>(
    "SELECT id, batch_code FROM exam_batches"
  );
  const batchMap = new Map(batchRows.rows.map((r) => [r.batch_code, r.id]));

  await db.query(
    `INSERT INTO exam_configs (
       slug, title, subtitle, welcome_message, eligibility_info,
       exam_date_label, duration_minutes, exam_status, questions_per_exam,
       negative_marking_enabled, negative_marks_per_wrong,
       randomize_questions, randomize_options, passing_percentage,
       results_published, show_answers_to_students, show_merit_rank
     ) VALUES (
       'kerala-initial-screening',
       'KERALA INITIAL SCREENING',
       'India Holy Quran Award – Kerala State Examination',
       'Welcome to the official Kerala State Initial Screening Portal of the India Holy Quran Award. Qualifying candidates from this objective screening stage advance to the 1-to-1 Live Quran Recitation Assessment.',
       'Open to registered participants from recognised Madrasas, Islamic Academies, and Schools across all 14 districts of Kerala, subject to institutional and committee verification.',
       'Configurable Schedule · Active Kerala Batches',
       45,
       'OPEN',
       8,
       FALSE,
       0.25,
       TRUE,
       TRUE,
       50.00,
       TRUE,
       FALSE,
       FALSE
     ) ON CONFLICT (slug) DO NOTHING`
  );

  for (const q of SAMPLE_QUESTIONS) {
    await db.query(
      `INSERT INTO questions (
         category_id, question_set, question_type,
         question_text_en, question_text_ml, question_text_ar,
         options_json, correct_option_id, marks, negative_marks, is_active, is_sample_demo
       ) VALUES (NULL, $1, 'MCQ', $2, $3, $4, $5::jsonb, $6, 2.00, 0.00, TRUE, TRUE)`,
      [q.set, q.en, q.ml, q.ar, JSON.stringify(q.options), q.correct]
    );
  }

  const adminPass = await bcrypt.hash("Admin@IHQA2026", 10);
  const controlPass = await bcrypt.hash("Control@IHQA2026", 10);
  const judgePass = await bcrypt.hash("Judge@IHQA2026", 10);
  const studentPass = await bcrypt.hash("Student@2026", 10);

  await db.query(
    `INSERT INTO users (username, email, phone, full_name, role, password_hash)
     VALUES
       ('admin@indiaquranaward.com', 'admin@indiaquranaward.com', '+91 98470 00001', 'Kerala State Chief Administrator', 'SUPER_ADMIN', $1),
       ('controller@indiaquranaward.com', 'controller@indiaquranaward.com', '+91 98470 00002', 'State Examination Controller', 'EXAM_CONTROLLER', $2),
       ('JDG-KL-001', 'judge1@indiaquranaward.com', '+91 98470 00011', 'Ustad Abdul Rahman Al-Qasimi', 'JUDGE', $3),
       ('JDG-KL-002', 'judge2@indiaquranaward.com', '+91 98470 00012', 'Hafiz Muhammad Salih Hudawi', 'JUDGE', $3)
     ON CONFLICT (username) DO NOTHING`,
    [adminPass, controlPass, judgePass]
  );

  const j1User = await db.query<{ id: number }>("SELECT id FROM users WHERE username = 'JDG-KL-001'");
  const j2User = await db.query<{ id: number }>("SELECT id FROM users WHERE username = 'JDG-KL-002'");

  if (j1User.rows[0]) {
    await db.query(
      `INSERT INTO judges (user_id, judge_code, full_name, specialization, district_id)
       VALUES ($1, 'JDG-KL-001', 'Ustad Abdul Rahman Al-Qasimi', 'Qira''at & Tajweed Senior Panelist', $2)
       ON CONFLICT (judge_code) DO NOTHING`,
      [j1User.rows[0].id, districtMap.get("MLP")]
    );
  }
  if (j2User.rows[0]) {
    await db.query(
      `INSERT INTO judges (user_id, judge_code, full_name, specialization, district_id)
       VALUES ($1, 'JDG-KL-002', 'Hafiz Muhammad Salih Hudawi', 'Hifz & Makharij Evaluator', $2)
       ON CONFLICT (judge_code) DO NOTHING`,
      [j2User.rows[0].id, districtMap.get("KKD")]
    );
  }

  const demoStudents = [
    {
      reg: "IHQA-KL-2026-0001",
      name: "Ayesha Fathima K.P.",
      email: "ayesha.kp@example.com",
      phone: "+91 98471 10001",
      inst: "INST-MLP-01",
      dist: "MLP",
      cat: "JUNIOR",
      batch: "BATCH-KL-NORTH-01",
      elig: "ELIGIBLE",
      guardian: "Abdul Kareem K.P.",
    },
    {
      reg: "IHQA-KL-2026-0002",
      name: "Muhammed Sinan V.",
      email: "sinan.v@example.com",
      phone: "+91 98471 10002",
      inst: "INST-KKD-01",
      dist: "KKD",
      cat: "SENIOR",
      batch: "BATCH-KL-NORTH-01",
      elig: "ELIGIBLE",
      guardian: "Abdullah V.",
    },
    {
      reg: "IHQA-KL-2026-0003",
      name: "Zainab Mariyam T.",
      email: "zainab.t@example.com",
      phone: "+91 98471 10003",
      inst: "INST-EKM-01",
      dist: "EKM",
      cat: "SUB-JR",
      batch: "BATCH-KL-CENTRAL-01",
      elig: "ELIGIBLE",
      guardian: "Hussain T.",
    },
    {
      reg: "IHQA-KL-2026-0004",
      name: "Fathima Hanna P.",
      email: "hanna.p@example.com",
      phone: "+91 98471 10004",
      inst: "INST-TSR-01",
      dist: "TSR",
      cat: "HIFZ",
      batch: "BATCH-KL-CENTRAL-01",
      elig: "ELIGIBLE",
      guardian: "Ibrahim P.",
    },
    {
      reg: "IHQA-KL-2026-0005",
      name: "Abdulla Rafi M.",
      email: "rafi.m@example.com",
      phone: "+91 98471 10005",
      inst: "INST-KNR-01",
      dist: "KNR",
      cat: "JUNIOR",
      batch: "BATCH-KL-NORTH-01",
      elig: "PENDING_VERIFICATION",
      guardian: "Musthafa M.",
    },
  ];

  for (const s of demoStudents) {
    const userRes = await db.query<{ id: number }>(
      `INSERT INTO users (username, email, phone, full_name, role, password_hash)
       VALUES ($1, $2, $3, $4, 'STUDENT', $5)
       ON CONFLICT (username) DO UPDATE SET full_name = EXCLUDED.full_name
       RETURNING id`,
      [s.reg, s.email, s.phone, s.name, studentPass]
    );
    const uid = userRes.rows[0].id;
    await db.query(
      `INSERT INTO students (
         user_id, registration_number, full_name, institution_id, district_id,
         category_id, batch_id, eligibility_status, guardian_name, preferred_language
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'en')
       ON CONFLICT (registration_number) DO NOTHING`,
      [
        uid,
        s.reg,
        s.name,
        instMap.get(s.inst),
        districtMap.get(s.dist),
        catMap.get(s.cat),
        batchMap.get(s.batch),
        s.elig,
        s.guardian,
      ]
    );
  }

  // Create one completed screening attempt for IHQA-KL-2026-0003 so dashboard/merit/results have live data
  const st3 = await db.query<{ id: number }>(
    "SELECT id FROM students WHERE registration_number = 'IHQA-KL-2026-0003'"
  );
  const st1 = await db.query<{ id: number }>(
    "SELECT id FROM students WHERE registration_number = 'IHQA-KL-2026-0001'"
  );
  const st2 = await db.query<{ id: number }>(
    "SELECT id FROM students WHERE registration_number = 'IHQA-KL-2026-0002'"
  );
  const cfg = await db.query<{ id: number }>(
    "SELECT id FROM exam_configs WHERE slug = 'kerala-initial-screening'"
  );
  const j1 = await db.query<{ id: number }>("SELECT id FROM judges WHERE judge_code = 'JDG-KL-001'");

  if (st3.rows[0] && cfg.rows[0]) {
    await db.query(
      `INSERT INTO exam_attempts (
         student_id, exam_config_id, question_set, status,
         started_at, server_deadline_at, submitted_at, instructions_acknowledged_at,
         question_order_json, answers_json, marked_for_review_json,
         total_marks, obtained_marks, correct_count, wrong_count, unanswered_count
       ) VALUES (
         $1, $2, 'SET-A', 'QUALIFIED',
         NOW() - INTERVAL '40 minutes', NOW() + INTERVAL '5 minutes', NOW() - INTERVAL '12 minutes', NOW() - INTERVAL '41 minutes',
         '[{"questionId":1,"optionOrder":["A","B","C","D"]},{"questionId":2,"optionOrder":["A","B","C","D"]},{"questionId":3,"optionOrder":["A","B","C","D"]},{"questionId":4,"optionOrder":["A","B","C","D"]}]'::jsonb,
         '{"1":"A","2":"A","3":"B","4":"C"}'::jsonb,
         '[]'::jsonb,
         16.00, 14.00, 7, 1, 0
       ) ON CONFLICT (student_id, exam_config_id) DO NOTHING`,
      [st3.rows[0].id, cfg.rows[0].id]
    );
  }

  // Schedule Stage 2 Live Quran Recitation Assessments (recording disabled by design)
  if (j1.rows[0] && st1.rows[0] && st2.rows[0] && st3.rows[0]) {
    const slot1Start = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
    const slot1End = new Date(now.getTime() + 25 * 60 * 1000).toISOString();
    const slot2Start = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
    const slot2End = new Date(now.getTime() + 40 * 60 * 1000).toISOString();
    const slot3Start = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
    const slot3End = new Date(now.getTime() - 110 * 60 * 1000).toISOString();

    await db.query(
      `INSERT INTO live_assessments (
         student_id, judge_id, room_name, scheduled_start, scheduled_end,
         status, recording_disabled
       ) VALUES
         ($1, $3, 'ihqa-live-2026-0001-jdg01', $4, $5, 'WAITING', TRUE),
         ($2, $3, 'ihqa-live-2026-0002-jdg01', $6, $7, 'SCHEDULED', TRUE)
       ON CONFLICT (room_name) DO NOTHING`,
      [st1.rows[0].id, st2.rows[0].id, j1.rows[0].id, slot1Start, slot1End, slot2Start, slot2End]
    );

    await db.query(
      `INSERT INTO live_assessments (
         student_id, judge_id, room_name, scheduled_start, scheduled_end,
         status, recording_disabled, completed_at,
         tajweed_score, makharij_score, fluency_score, accuracy_score, voice_score, total_score,
         remarks, result_published
       ) VALUES (
         $1, $2, 'ihqa-live-2026-0003-jdg01', $3, $4,
         'COMPLETED', TRUE, NOW() - INTERVAL '90 minutes',
         27.5, 23.0, 18.5, 14.0, 9.0, 92.0,
         'Consistent Madd articulation and clear Makharij across Surah Al-Mulk.', TRUE
       ) ON CONFLICT (room_name) DO NOTHING`,
      [st3.rows[0].id, j1.rows[0].id, slot3Start, slot3End]
    );
  }

  await db.query(
    `INSERT INTO audit_logs (actor_name, actor_role, action, entity_type, entity_id, details_json)
     VALUES ('System Initializer', 'SUPER_ADMIN', 'SYSTEM_SEED', 'EXAM_CONFIG', 'kerala-initial-screening',
       '{"message":"Initialized 14 Kerala districts, 3 batches, sample multilingual questions, and live assessment schedules"}'::jsonb)`
  );
}
