"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eraser,
  Flag,
  Send,
} from "lucide-react";
import { useLocale } from "@/components/LocaleContext";

interface ExamQuestion {
  index: number;
  id: number;
  questionType: string;
  textEn: string;
  textMl: string | null;
  textAr: string | null;
  imageUrl: string | null;
  marks: number;
  options: Array<{
    id: string;
    text_en: string;
    text_ml?: string;
    text_ar?: string;
  }>;
}

interface SessionPayload {
  completed: boolean;
  attemptId: number;
  examTitle: string;
  examSubtitle: string;
  student: { registration_number: string; full_name: string };
  serverDeadlineAt: string;
  remainingSeconds: number;
  questions: ExamQuestion[];
  answers: Record<string, string>;
  markedForReview: number[];
}

export default function OnlineExaminationPage() {
  const router = useRouter();
  const { t } = useLocale();

  const [session, setSession] = useState<SessionPayload | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [marked, setMarked] = useState<number[]>([]);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [saveLabel, setSaveLabel] = useState<string>("Auto-save ready");
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const answersRef = useRef(answers);
  answersRef.current = answers;
  const markedRef = useRef(marked);
  markedRef.current = marked;
  const autoSubmitTriggered = useRef(false);

  const performSubmit = useCallback(
    async (auto = false) => {
      if (submitting) return;
      setSubmitting(true);
      try {
        await fetch("/api/exam/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers: answersRef.current,
            autoSubmitted: auto,
          }),
        });
        router.replace("/dashboard");
      } catch {
        setSubmitting(false);
      }
    },
    [router, submitting]
  );

  useEffect(() => {
    fetch("/api/exam/session")
      .then(async (res) => {
        if (res.status === 401) {
          router.replace("/login");
          return null;
        }
        if (!res.ok) {
          router.replace("/dashboard");
          return null;
        }
        return res.json();
      })
      .then((d: SessionPayload | null) => {
        if (!d) return;
        if (d.completed) {
          router.replace("/dashboard");
          return;
        }
        setSession(d);
        setAnswers(d.answers || {});
        setMarked(d.markedForReview || []);
        setSecondsLeft(d.remainingSeconds);
      })
      .finally(() => setLoading(false));
  }, [router]);

  // Countdown timer + auto-submit on expiry
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!autoSubmitTriggered.current) {
            autoSubmitTriggered.current = true;
            void performSubmit(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [session, performSubmit]);

  // Warn before accidental refresh / tab close
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const persistProgress = async (
    nextAnswers: Record<string, string>,
    nextMarked: number[]
  ) => {
    setSaveLabel("Saving...");
    try {
      const res = await fetch("/api/exam/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: nextAnswers,
          markedForReview: nextMarked,
        }),
      });
      if (res.status === 409) {
        router.replace("/dashboard");
        return;
      }
      setSaveLabel(
        `Saved at ${new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}`
      );
    } catch {
      setSaveLabel("Retrying save...");
    }
  };

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9f8f6] text-sm text-[#555963]">
        Loading distraction-free examination workspace...
      </div>
    );
  }

  const questions = session.questions;
  const activeQ = questions[currentIdx];

  const selectOption = (optId: string) => {
    const next = { ...answers, [String(activeQ.id)]: optId };
    setAnswers(next);
    void persistProgress(next, marked);
  };

  const clearSelection = () => {
    const next = { ...answers };
    delete next[String(activeQ.id)];
    setAnswers(next);
    void persistProgress(next, marked);
  };

  const toggleMarkForReview = () => {
    const exists = marked.includes(activeQ.id);
    const nextMarked = exists
      ? marked.filter((id) => id !== activeQ.id)
      : [...marked, activeQ.id];
    setMarked(nextMarked);
    void persistProgress(answers, nextMarked);
  };

  const answeredCount = questions.filter((q) => Boolean(answers[String(q.id)])).length;
  const unansweredCount = questions.length - answeredCount;
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timerFormatted = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  const isWarningTime = secondsLeft <= 300 && secondsLeft > 60;
  const isCriticalTime = secondsLeft <= 60;

  return (
    <div className="min-h-screen flex flex-col bg-[#f9f8f6]">
      {/* Distraction-free Exam Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#e2dddb]">
        <div className="max-w-[1260px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/brand/IHQA_Logo.svg"
              alt="IHQA Logo"
              className="h-9 w-auto shrink-0"
            />
            <div className="min-w-0">
              <div className="text-sm font-bold text-[#1c1c1c] truncate">
                {session.examTitle}
              </div>
              <div className="text-xs text-[#555963] font-mono truncate">
                {session.student.registration_number} · {session.student.full_name}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden md:inline text-xs text-[#555963]">{saveLabel}</span>
            <div
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] font-mono text-base font-bold border ${
                isCriticalTime
                  ? "bg-[#db4b68]/15 text-[#9c1d38] border-[#db4b68] animate-pulse"
                  : isWarningTime
                  ? "bg-[#f1ae2a]/20 text-[#8a5a00] border-[#f1ae2a]"
                  : "bg-[#034ea2]/8 text-[#034ea2] border-[#034ea2]/25"
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{timerFormatted}</span>
            </div>
          </div>
        </div>
        {(isWarningTime || isCriticalTime) && (
          <div
            className={`text-xs font-semibold text-center py-1 px-4 ${
              isCriticalTime
                ? "bg-[#db4b68] text-white"
                : "bg-[#f0b64f] text-[#1c1c1c]"
            }`}
          >
            {isCriticalTime
              ? "Time is almost up! Your answers will be submitted automatically when the timer reaches 00:00."
              : "5 minutes or less remaining. Please review your marked and unanswered questions."}
          </div>
        )}
      </header>

      {/* Main Examination Area */}
      <main className="max-w-[1260px] w-full mx-auto px-4 sm:px-6 py-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Question Card */}
        <section className="lg:col-span-8 xl:col-span-9 bg-white border border-[#e2dddb] rounded-[14px] p-5 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e2dddb] pb-4">
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 rounded bg-[#034ea2] text-white text-xs font-bold">
                Question {activeQ.index} of {questions.length}
              </span>
              <span className="text-xs font-medium text-[#555963]">
                {activeQ.marks} Marks
              </span>
            </div>

            <button
              type="button"
              onClick={toggleMarkForReview}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-semibold border transition-colors cursor-pointer ${
                marked.includes(activeQ.id)
                  ? "bg-[#f0b64f]/25 border-[#f0b64f] text-[#8a5a00]"
                  : "bg-white border-[#e2dddb] text-[#555963] hover:border-[#f0b64f]"
              }`}
            >
              <Flag className="w-3.5 h-3.5" />
              <span>{t.markForReview}</span>
            </button>
          </div>

          {/* Multilingual Question Content */}
          <div className="space-y-4">
            {activeQ.textAr && (
              <div
                dir="rtl"
                lang="ar"
                className="quran-arabic text-xl sm:text-2xl text-[#1c1c1c] bg-[#f9f8f6] border border-[#e2dddb] rounded-[12px] px-5 py-4"
              >
                {activeQ.textAr}
              </div>
            )}

            <p className="text-base sm:text-lg font-medium text-[#1c1c1c] leading-relaxed">
              {activeQ.textEn}
            </p>

            {activeQ.textMl && (
              <p
                lang="ml"
                className="malayalam-text text-base text-[#3b3f47] bg-[#f9f8f6]/60 px-4 py-2.5 rounded-[8px] border-l-2 border-[#53be95]"
              >
                {activeQ.textMl}
              </p>
            )}

            {activeQ.imageUrl && (
              <div className="border border-[#e2dddb] rounded-[10px] p-3 bg-white">
                <img
                  src={activeQ.imageUrl}
                  alt={`Question ${activeQ.index} visual`}
                  className="max-h-72 mx-auto object-contain rounded"
                />
              </div>
            )}
          </div>

          {/* Multiple Choice Options */}
          <div className="space-y-3 pt-2">
            {activeQ.options.map((opt, idx) => {
              const selected = answers[String(activeQ.id)] === opt.id;
              const letter = String.fromCharCode(65 + idx);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => selectOption(opt.id)}
                  className={`w-full text-left p-4 rounded-[12px] border transition-all flex items-start gap-3.5 cursor-pointer ${
                    selected
                      ? "bg-[#034ea2]/6 border-[#034ea2] ring-1 ring-[#034ea2]"
                      : "bg-white border-[#e2dddb] hover:border-[#034ea2]/40 hover:bg-[#f9f8f6]"
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                      selected
                        ? "bg-[#034ea2] text-white"
                        : "bg-[#efefef] text-[#1c1c1c]"
                    }`}
                  >
                    {letter}
                  </span>
                  <div className="flex-1 space-y-1">
                    <div className="text-sm sm:text-base font-medium text-[#1c1c1c]">
                      {opt.text_en}
                    </div>
                    {opt.text_ml && (
                      <div className="malayalam-text text-sm text-[#555963]">
                        {opt.text_ml}
                      </div>
                    )}
                    {opt.text_ar && (
                      <div dir="rtl" lang="ar" className="quran-arabic text-base text-[#1c1c1c]">
                        {opt.text_ar}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Question Navigation Controls */}
          <div className="pt-4 border-t border-[#e2dddb] flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={clearSelection}
              disabled={!answers[String(activeQ.id)]}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] text-xs font-semibold border border-[#e2dddb] text-[#555963] hover:text-[#db4b68] cursor-pointer disabled:opacity-40"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>{t.clearSelection}</span>
            </button>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[8px] text-sm font-semibold border border-[#e2dddb] text-[#1c1c1c] hover:bg-[#efefef] cursor-pointer disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>{t.previous}</span>
              </button>
              <button
                type="button"
                disabled={currentIdx >= questions.length - 1}
                onClick={() =>
                  setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))
                }
                className="ihqa-btn-blue inline-flex items-center gap-1.5 px-5 py-2.5 text-sm cursor-pointer disabled:opacity-40"
              >
                <span>{t.next}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* Right Question Navigation Panel */}
        <aside className="lg:col-span-4 xl:col-span-3 bg-white border border-[#e2dddb] rounded-[14px] p-5 space-y-5">
          <div className="text-sm font-bold text-[#1c1c1c] border-b border-[#e2dddb] pb-3">
            Question Navigator
          </div>

          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              const isCurrent = idx === currentIdx;
              const isAnswered = Boolean(answers[String(q.id)]);
              const isMarked = marked.includes(q.id);

              let cls = "bg-[#efefef] text-[#1c1c1c] border-[#e2dddb]";
              if (isCurrent) {
                cls = "bg-[#034ea2] text-white border-[#034ea2] ring-2 ring-[#034ea2]/25";
              } else if (isMarked) {
                cls = "bg-[#f0b64f]/25 text-[#8a5a00] border-[#f0b64f]";
              } else if (isAnswered) {
                cls = "bg-[#53be95]/20 text-[#0f6b4a] border-[#53be95]";
              }

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentIdx(idx)}
                  className={`h-10 rounded-[8px] text-xs font-bold border transition-all cursor-pointer ${cls}`}
                >
                  {q.index}
                </button>
              );
            })}
          </div>

          <div className="space-y-2 pt-3 border-t border-[#e2dddb] text-xs text-[#555963]">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-[#53be95]/30 border border-[#53be95]" />
              <span>{t.answered} ({answeredCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-[#f0b64f]/30 border border-[#f0b64f]" />
              <span>{t.marked} ({marked.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-[#efefef] border border-[#e2dddb]" />
              <span>{t.unanswered} ({unansweredCount})</span>
            </div>
          </div>
        </aside>
      </main>

      {/* Sticky Footer */}
      <footer className="sticky bottom-0 z-30 bg-white border-t border-[#e2dddb]">
        <div className="max-w-[1260px] mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm font-medium">
            <span className="inline-flex items-center gap-1.5 text-[#0f6b4a]">
              <CheckCircle2 className="w-4 h-4 text-[#53be95]" />
              {t.answered}: <strong>{answeredCount}</strong>
            </span>
            <span className="text-[#555963]">
              {t.unanswered}: <strong>{unansweredCount}</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowSubmitModal(true)}
            className="ihqa-btn-gold px-6 py-2.5 text-sm inline-flex items-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{t.submitExam}</span>
          </button>
        </div>
      </footer>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="bg-white border border-[#e2dddb] rounded-[16px] max-w-md w-full p-6 space-y-5 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#f0b64f]/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-[#9e6b08]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-[#1c1c1c]">
                  Confirm Final Submission
                </h3>
                <p className="text-sm text-[#555963]">
                  You have answered <strong>{answeredCount}</strong> of{" "}
                  <strong>{questions.length}</strong> questions ({unansweredCount} unanswered).
                  Once submitted, you cannot re-enter the examination.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2.5 rounded-[8px] border border-[#e2dddb] text-sm font-semibold text-[#1c1c1c] cursor-pointer"
              >
                Continue Reviewing
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void performSubmit(false)}
                className="ihqa-btn-blue px-5 py-2.5 text-sm cursor-pointer disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Confirm & Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
