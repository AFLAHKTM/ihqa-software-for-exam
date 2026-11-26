export type UiLocale = "en" | "ml" | "ar";

export const UI_COPY: Record<
  UiLocale,
  {
    dir: "ltr" | "rtl";
    brandName: string;
    examTitle: string;
    examSubtitle: string;
    purposeQuote: string;
    startExamination: string;
    studentLogin: string;
    judgePortal: string;
    adminPortal: string;
    examDateLabel: string;
    durationLabel: string;
    statusLabel: string;
    eligibilityHeading: string;
    instructionsHeading: string;
    minutesUnit: string;
    dashboardTitle: string;
    studentName: string;
    regNumber: string;
    institution: string;
    district: string;
    category: string;
    examStatus: string;
    liveAssessmentTitle: string;
    joinAssessment: string;
    acknowledgePrompt: string;
    proceedToExam: string;
    submitExam: string;
    previous: string;
    next: string;
    markForReview: string;
    clearSelection: string;
    answered: string;
    unanswered: string;
    marked: string;
  }
> = {
  en: {
    dir: "ltr",
    brandName: "India Holy Quran Award",
    examTitle: "KERALA INITIAL SCREENING",
    examSubtitle: "India Holy Quran Award – Kerala State Examination",
    purposeQuote:
      "An opportunity to demonstrate Quranic knowledge, understanding and excellence through the India Holy Quran Award.",
    startExamination: "Start Examination",
    studentLogin: "Student Login",
    judgePortal: "Judge Portal",
    adminPortal: "Administration",
    examDateLabel: "Examination Schedule",
    durationLabel: "Duration",
    statusLabel: "Examination Status",
    eligibilityHeading: "Eligibility Criteria",
    instructionsHeading: "Examination Guidelines",
    minutesUnit: "Minutes",
    dashboardTitle: "Student Examination Dashboard",
    studentName: "Student Name",
    regNumber: "Registration Number",
    institution: "Institution",
    district: "District",
    category: "Competition Category",
    examStatus: "Examination Status",
    liveAssessmentTitle: "Live Quran Recitation Assessment",
    joinAssessment: "Join Assessment",
    acknowledgePrompt:
      "I have read all instructions carefully and confirm that only one authorised attempt is permitted.",
    proceedToExam: "Proceed to Examination",
    submitExam: "Submit Examination",
    previous: "Previous",
    next: "Next",
    markForReview: "Mark for Review",
    clearSelection: "Clear Selection",
    answered: "Answered",
    unanswered: "Unanswered",
    marked: "Marked",
  },
  ml: {
    dir: "ltr",
    brandName: "ഇന്ത്യ ഹോളി ഖുർആൻ അവാർഡ്",
    examTitle: "കേരള പ്രാഥമിക സ്ക്രീനിംഗ്",
    examSubtitle: "ഇന്ത്യ ഹോളി ഖുർആൻ അവാർഡ് – കേരള സംസ്ഥാന പരീക്ഷ",
    purposeQuote:
      "ഇന്ത്യ ഹോളി ഖുർആൻ അവാർഡിലൂടെ ഖുർആൻ വിജ്ഞാനവും ഗ്രാഹ്യവും മികവും തെളിയിക്കാനുള്ള സുവർണ്ണാവസരം.",
    startExamination: "പരീക്ഷ ആരംഭിക്കുക",
    studentLogin: "വിദ്യാർത്ഥി ലോഗിൻ",
    judgePortal: "ജഡ്ജ് പോർട്ടൽ",
    adminPortal: "അഡ്മിനിസ്ട്രേഷൻ",
    examDateLabel: "പരീക്ഷാ തീയതിയും സമയവും",
    durationLabel: "സമയപരിധി",
    statusLabel: "പരീക്ഷാ നില",
    eligibilityHeading: "യോഗ്യതാ മാനദണ്ഡങ്ങൾ",
    instructionsHeading: "പരീക്ഷാ നിർദ്ദേശങ്ങൾ",
    minutesUnit: "മിനിറ്റ്",
    dashboardTitle: "വിദ്യാർത്ഥി പരീക്ഷാ ഡാഷ്‌ബോർഡ്",
    studentName: "വിദ്യാർത്ഥിയുടെ പേര്",
    regNumber: "രജിസ്ട്രേഷൻ നമ്പർ",
    institution: "സ്ഥാപനം",
    district: "ജില്ല",
    category: "മത്സര വിഭാഗം",
    examStatus: "പരീക്ഷാ നില",
    liveAssessmentTitle: "ലൈവ് ഖുർആൻ പാരായണ വിലയിരുത്തൽ",
    joinAssessment: "അസ്സസ്‌മെന്റിൽ പ്രവേശിക്കുക",
    acknowledgePrompt:
      "എല്ലാ നിർദ്ദേശങ്ങളും ശ്രദ്ധാപൂർവ്വം വായിച്ചതായും ഒരു അവസരം മാത്രമേ അനുവദിച്ചിട്ടുള്ളൂവെന്നും ഞാൻ സാക്ഷ്യപ്പെടുത്തുന്നു.",
    proceedToExam: "പരീക്ഷയിലേക്ക് കടക്കുക",
    submitExam: "പരീക്ഷ സമർപ്പിക്കുക",
    previous: "മുമ്പത്തെത്",
    next: "അടുത്തത്",
    markForReview: "റിവ്യൂവിനായി അടയാളപ്പെടുത്തുക",
    clearSelection: "ഉത്തരം മായ്ക്കുക",
    answered: "ഉത്തരം നൽകിയത്",
    unanswered: "ഉത്തരം നൽകാത്തത്",
    marked: "അടയാളപ്പെടുത്തിയത്",
  },
  ar: {
    dir: "rtl",
    brandName: "جائزة الهند للقرآن الكريم",
    examTitle: "التصفية الأولية لولاية كيرالا",
    examSubtitle: "جائزة الهند للقرآن الكريم – الاختبار الرسمي لولاية كيرالا",
    purposeQuote:
      "فرصة لإبراز المعرفة القرآنية والفهم والتميّز من خلال جائزة الهند للقرآن الكريم.",
    startExamination: "بدء الاختبار",
    studentLogin: "تسجيل دخول الطالب",
    judgePortal: "بوابة المحكّمين",
    adminPortal: "الإدارة المركزية",
    examDateLabel: "موعد الاختبار",
    durationLabel: "المدة الزمنية",
    statusLabel: "حالة الاختبار",
    eligibilityHeading: "شروط الأهلية",
    instructionsHeading: "تعليمات الاختبار",
    minutesUnit: "دقيقة",
    dashboardTitle: "لوحة تحكم الطالب",
    studentName: "اسم الطالب",
    regNumber: "رقم التسجيل",
    institution: "المؤسسة التعليمية",
    district: "المنطقة",
    category: "فئة المسابقة",
    examStatus: "حالة الاختبار",
    liveAssessmentTitle: "التقييم المباشر لتلاوة القرآن الكريم",
    joinAssessment: "الانضمام إلى التقييم",
    acknowledgePrompt:
      "أقرّ بأنني قرأت جميع التعليمات بعناية، وأوافق على أنه يُسمح بمحاولة واحدة معتمدة فقط.",
    proceedToExam: "الانتقال إلى الاختبار",
    submitExam: "إنهاء وتسليم الاختبار",
    previous: "السابق",
    next: "التالي",
    markForReview: "وضع علامة للمراجعة",
    clearSelection: "مسح الإجابة",
    answered: "تمت الإجابة",
    unanswered: "لم تتم الإجابة",
    marked: "للمراجعة",
  },
};
