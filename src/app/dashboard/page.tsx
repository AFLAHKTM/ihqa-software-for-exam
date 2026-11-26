"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Award,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  LogOut,
  MapPin,
  ShieldAlert,
  User,
  Video,
} from "lucide-react";
import { BrandHeader } from "@/components/BrandHeader";
import { BrandFooter } from "@/components/BrandFooter";
import { useLocale } from "@/components/LocaleContext";

interface DashboardData {
  student: {
    id: number;
    registration_number: string;
    full_name: string;
    eligibility_status: string;
    institution_name: string | null;
    institution_place: string | null;
    district_name_en: string;
    district_name_ml: string;
    district_name_ar: string;
    category_name_en: string;
    category_name_ml: string;
    category_name_ar: string;
    batch_code: string | null;
    batch_title: string | null;
    batch_start: string | null;
    batch_end: string | null;
  };
  config: {
    title: string;
    subtitle: string;
    exam_date_label: string;
    duration_minutes: number;
    exam_status: string;
    results_published: boolean;
  } | null;
  attempt: {
    id: number;
    status: string;
    rawSubmitted: boolean;
    startedAt: string;
    submittedAt: string | null;
    resultsPublished: boolean;
    totalMarks: number | null;
    obtainedMarks: number | null;
    correctCount: number | null;
    wrongCount: number | null;
    unansweredCount: number | null;
    meritRank: number | null;
  } | null;
  canStartExam: boolean;
  batchOpen: boolean;
  liveAssessment: {
    id: number;
    room_name: string;
    scheduled_start: string;
    scheduled_end: string;
    status: string;
    recording_disabled: boolean;
    student_tech_checked_at: string | null;
    judge_name: string;
    judge_code: string;
    judge_specialization: string | null;
    result_published: boolean;
    scorecard: {
      tajweed: number;
      makharij: number;
      fluency: number;
      accuracy: number;
      voice: number;
      total: number;
      remarks: string | null;
    } | null;
  } | null;
}

export default function StudentDashboardPage() {
  const router = useRouter();
  const { locale, t } = useLocale();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/student/dashboard")
      .then(async (res) => {
        if (res.status === 401) {
          router.replace("/login");
          return null;
        }
        return res.json();
      })
      .then((d) => {
        if (d) setData(d);
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: "STUDENT" }),
    });
    router.push("/login");
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f9f8f6]">
        <BrandHeader showPortalLinks={false} />
        <main className="flex-1 flex items-center justify-center p-8 text-sm text-[#555963]">
          Loading student examination profile...
        </main>
      </div>
    );
  }

  const { student, config, attempt, canStartExam, liveAssessment } = data;

  const districtDisplay =
    locale === "ml"
      ? student.district_name_ml
      : locale === "ar"
      ? student.district_name_ar
      : student.district_name_en;

  const categoryDisplay =
    locale === "ml"
      ? student.category_name_ml
      : locale === "ar"
      ? student.category_name_ar
      : student.category_name_en;

  const examStatusText = !attempt
    ? student.eligibility_status === "ELIGIBLE"
      ? "Not Started · Eligible"
      : student.eligibility_status.replaceAll("_", " ")
    : attempt.status.replaceAll("_", " ");

  return (
    <div className="min-h-screen flex flex-col bg-[#f9f8f6]">
      <BrandHeader
        showPortalLinks={false}
        rightSlot={
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs font-mono font-semibold text-[#034ea2] bg-[#034ea2]/8 px-2.5 py-1 rounded">
              {student.registration_number}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#555963] hover:text-[#db4b68] transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        }
      />

      <main className="max-w-[1220px] w-full mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8 flex-1">
        {/* Top Greeting & Primary Action */}
        <div className="bg-white border border-[#e2dddb] rounded-[16px] p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#034ea2]">
              {t.dashboardTitle}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1c1c1c]">
              {student.full_name}
            </h1>
            <p className="text-sm text-[#555963]">
              Registration Number:{" "}
              <strong className="font-mono text-[#1c1c1c]">
                {student.registration_number}
              </strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {canStartExam ? (
              <Link
                href={attempt?.status === "IN_PROGRESS" ? "/exam" : "/exam/instructions"}
                className="ihqa-btn-gold px-7 py-4 text-sm sm:text-base inline-flex items-center gap-2.5"
              >
                <ClipboardList className="w-5 h-5" />
                <span>
                  {attempt?.status === "IN_PROGRESS"
                    ? "RESUME EXAMINATION"
                    : "START EXAMINATION"}
                </span>
              </Link>
            ) : attempt?.rawSubmitted ? (
              <div className="px-5 py-3 rounded-[10px] bg-[#53be95]/15 border border-[#53be95]/40 text-sm font-semibold text-[#0f6b4a] inline-flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Examination {attempt.status.replaceAll("_", " ")}</span>
              </div>
            ) : (
              <div className="px-5 py-3 rounded-[10px] bg-[#f1ae2a]/15 border border-[#f1ae2a]/40 text-sm font-semibold text-[#8a5a00] inline-flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                <span>
                  {student.eligibility_status !== "ELIGIBLE"
                    ? `Eligibility: ${student.eligibility_status.replaceAll("_", " ")}`
                    : "Examination Currently Unavailable"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Profile & Screening Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <InfoCard
            icon={<User className="w-4 h-4 text-[#034ea2]" />}
            label={t.studentName}
            value={student.full_name}
            sub={`Reg No: ${student.registration_number}`}
          />
          <InfoCard
            icon={<Building2 className="w-4 h-4 text-[#034ea2]" />}
            label={t.institution}
            value={student.institution_name || "Registered Independent Candidate"}
            sub={student.institution_place || undefined}
          />
          <InfoCard
            icon={<MapPin className="w-4 h-4 text-[#53be95]" />}
            label={t.district}
            value={districtDisplay}
            sub="Kerala State"
          />
          <InfoCard
            icon={<Award className="w-4 h-4 text-[#f0b64f]" />}
            label={t.category}
            value={categoryDisplay}
            sub={student.batch_code ? `Batch: ${student.batch_code}` : undefined}
          />
          <InfoCard
            icon={<CalendarClock className="w-4 h-4 text-[#034ea2]" />}
            label={t.examDateLabel}
            value={config?.exam_date_label || "Scheduled"}
            sub={`${config?.duration_minutes ?? 45} Minutes`}
          />
          <InfoCard
            icon={<CheckCircle2 className="w-4 h-4 text-[#53be95]" />}
            label={t.examStatus}
            value={examStatusText}
            sub={
              attempt?.submittedAt
                ? `Submitted: ${new Date(attempt.submittedAt).toLocaleString()}`
                : undefined
            }
          />
        </div>

        {/* Screening Result Card (Controlled Visibility) */}
        {attempt?.rawSubmitted && (
          <div className="bg-white border border-[#e2dddb] rounded-[16px] p-6 sm:p-7 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2dddb] pb-4">
              <div>
                <h2 className="text-lg font-semibold text-[#1c1c1c]">
                  Kerala Initial Screening — Submission &amp; Result Status
                </h2>
                <p className="text-xs text-[#555963]">
                  Controlled and verified by the India Holy Quran Award Examination Board.
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  attempt.status === "QUALIFIED"
                    ? "bg-[#53be95]/20 text-[#0f6b4a]"
                    : attempt.status === "NOT_QUALIFIED"
                    ? "bg-[#db4b68]/15 text-[#9c1d38]"
                    : "bg-[#f0b64f]/20 text-[#8a5a00]"
                }`}
              >
                {attempt.status.replaceAll("_", " ")}
              </span>
            </div>

            {attempt.resultsPublished ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <MetricBox
                  label="Score Obtained"
                  value={`${attempt.obtainedMarks ?? 0} / ${attempt.totalMarks ?? 0}`}
                />
                <MetricBox label="Correct" value={String(attempt.correctCount ?? 0)} />
                <MetricBox label="Incorrect" value={String(attempt.wrongCount ?? 0)} />
                <MetricBox
                  label="Unanswered"
                  value={String(attempt.unansweredCount ?? 0)}
                />
              </div>
            ) : (
              <p className="text-sm text-[#555963]">
                Your responses have been securely saved. Official marks and qualification
                status will appear here once published by the Examination Administration.
              </p>
            )}
          </div>
        )}

        {/* Stage 2: Live Quran Recitation Assessment Card */}
        <div className="bg-white border border-[#e2dddb] rounded-[16px] p-6 sm:p-8 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e2dddb] pb-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#034ea2]">
                <Video className="w-4 h-4 text-[#53be95]" />
                <span>Stage 2 · Live Video Assessment (No Recording)</span>
              </div>
              <h2 className="text-xl font-bold text-[#1c1c1c]">
                {t.liveAssessmentTitle}
              </h2>
            </div>

            {liveAssessment && ["SCHEDULED", "WAITING", "IN_CALL"].includes(liveAssessment.status) && (
              <Link
                href="/assessment"
                className="ihqa-btn-blue px-6 py-3 text-sm inline-flex items-center gap-2"
              >
                <Video className="w-4 h-4" />
                <span>{t.joinAssessment}</span>
              </Link>
            )}
          </div>

          {liveAssessment ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div>
                <div className="text-xs font-semibold uppercase text-[#555963]">
                  Scheduled Slot
                </div>
                <div className="text-sm font-semibold text-[#1c1c1c] mt-1">
                  {new Date(liveAssessment.scheduled_start).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-[#555963]">
                  Assigned Judge
                </div>
                <div className="text-sm font-semibold text-[#1c1c1c] mt-1">
                  {liveAssessment.judge_name}
                </div>
                <div className="text-xs text-[#555963]">{liveAssessment.judge_code}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-[#555963]">
                  Assessment Status
                </div>
                <div className="mt-1">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#034ea2]/10 text-[#034ea2]">
                    {liveAssessment.status}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-[#555963]">
                  Privacy &amp; Recording
                </div>
                <div className="text-xs font-medium text-[#0f6b4a] mt-1">
                  Recording Disabled by Design (1-to-1 Live WebRTC)
                </div>
              </div>

              {liveAssessment.scorecard && (
                <div className="md:col-span-4 pt-4 border-t border-[#e2dddb]">
                  <div className="text-xs font-semibold uppercase text-[#555963] mb-3">
                    Published Live Recitation Scorecard ({liveAssessment.scorecard.total} / 100)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <MetricBox label="Tajweed (/30)" value={String(liveAssessment.scorecard.tajweed)} />
                    <MetricBox label="Makharij (/25)" value={String(liveAssessment.scorecard.makharij)} />
                    <MetricBox label="Fluency (/20)" value={String(liveAssessment.scorecard.fluency)} />
                    <MetricBox label="Accuracy (/15)" value={String(liveAssessment.scorecard.accuracy)} />
                    <MetricBox label="Voice (/10)" value={String(liveAssessment.scorecard.voice)} />
                  </div>
                  {liveAssessment.scorecard.remarks && (
                    <p className="mt-3 text-sm text-[#555963]">
                      <strong>Judge Remarks:</strong> {liveAssessment.scorecard.remarks}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-[#555963]">
              Live Quran Recitation Assessment slots are allocated after Kerala Initial
              Screening shortlisting. Once assigned by the Examination Board, your date,
              time, assigned judge, and Join Assessment room will appear here.
            </p>
          )}
        </div>
      </main>

      <BrandFooter />
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-white border border-[#e2dddb] rounded-[12px] p-5 space-y-1.5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#555963]">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-base font-semibold text-[#1c1c1c]">{value}</div>
      {sub && <div className="text-xs text-[#555963]">{sub}</div>}
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#f9f8f6] border border-[#e2dddb] rounded-[10px] p-3.5">
      <div className="text-xs text-[#555963]">{label}</div>
      <div className="text-lg font-bold text-[#034ea2] mt-0.5">{value}</div>
    </div>
  );
}
