"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  LogOut,
  Play,
  UserX,
  Video,
} from "lucide-react";
import { BrandHeader } from "@/components/BrandHeader";
import { BrandFooter } from "@/components/BrandFooter";
import { LiveRoomPlayer } from "@/components/LiveRoomPlayer";

interface JudgeAssessment {
  id: number;
  room_name: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  student_id: number;
  registration_number: string;
  student_name: string;
  district_name: string;
  category_name: string;
  institution_name: string | null;
  tajweed_score: string | null;
  makharij_score: string | null;
  fluency_score: string | null;
  accuracy_score: string | null;
  voice_score: string | null;
  total_score: string | null;
  remarks: string | null;
}

export default function JudgeDashboardPage() {
  const router = useRouter();
  const [judge, setJudge] = useState<{
    judge_code: string;
    full_name: string;
    specialization: string | null;
  } | null>(null);
  const [items, setItems] = useState<JudgeAssessment[]>([]);
  const [selected, setSelected] = useState<JudgeAssessment | null>(null);
  const [videoOpenForId, setVideoOpenForId] = useState<number | null>(null);

  const [tajweed, setTajweed] = useState("26");
  const [makharij, setMakharij] = useState("22");
  const [fluency, setFluency] = useState("18");
  const [accuracy, setAccuracy] = useState("13");
  const [voice, setVoice] = useState("8");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const hydrateScores = (a: JudgeAssessment) => {
    setTajweed(a.tajweed_score ?? "25");
    setMakharij(a.makharij_score ?? "21");
    setFluency(a.fluency_score ?? "17");
    setAccuracy(a.accuracy_score ?? "13");
    setVoice(a.voice_score ?? "8");
    setRemarks(a.remarks ?? "");
    setMsg(null);
  };

  const loadQueue = useCallback(async () => {
    const res = await fetch("/api/judge/queue");
    if (res.status === 401) {
      router.replace("/judge/login");
      return;
    }
    const data = await res.json();
    setJudge(data.judge);
    const list: JudgeAssessment[] = data.assessments || [];
    setItems(list);
    setSelected((prev) => {
      if (prev) {
        return list.find((item) => item.id === prev.id) ?? list[0] ?? null;
      }
      if (list[0]) {
        hydrateScores(list[0]);
        if (list[0].status === "IN_CALL") {
          setVideoOpenForId(list[0].id);
        }
      }
      return list[0] ?? null;
    });
  }, [router]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const selectItem = (a: JudgeAssessment) => {
    setSelected(a);
    hydrateScores(a);
    setVideoOpenForId(a.status === "IN_CALL" ? a.id : null);
  };

  const handleAction = async (
    action: "ADMIT" | "MARK_ABSENT" | "RESCHEDULE" | "SUBMIT_SCORE"
  ) => {
    if (!selected) return;
    setSaving(true);
    setMsg(null);
    try {
      if (action === "ADMIT") {
        await fetch("/api/judge/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assessmentId: selected.id, action: "ADMIT" }),
        });
        setVideoOpenForId(selected.id);
      } else if (action === "SUBMIT_SCORE") {
        const res = await fetch("/api/judge/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assessmentId: selected.id,
            action: "SUBMIT_SCORE",
            tajweed: Number(tajweed),
            makharij: Number(makharij),
            fluency: Number(fluency),
            accuracy: Number(accuracy),
            voice: Number(voice),
            remarks,
          }),
        });
        const d = await res.json();
        if (!res.ok) {
          setMsg(d.error || "Score validation failed.");
        } else {
          setMsg(`Scorecard saved (${d.totalScore} / 100) and recorded in audit trail.`);
          setVideoOpenForId(null);
        }
      } else {
        await fetch("/api/judge/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assessmentId: selected.id, action, remarks }),
        });
        setMsg(`Candidate marked as ${action.replace("_", " ")}.`);
        setVideoOpenForId(null);
      }
      await loadQueue();
    } finally {
      setSaving(false);
    }
  };

  const totalScore =
    Number(tajweed || 0) +
    Number(makharij || 0) +
    Number(fluency || 0) +
    Number(accuracy || 0) +
    Number(voice || 0);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: "JUDGE" }),
    });
    router.push("/judge/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f9f8f6]">
      <BrandHeader
        showPortalLinks={false}
        rightSlot={
          <div className="flex items-center gap-3">
            {judge && (
              <span className="hidden sm:inline text-xs font-semibold text-[#034ea2]">
                {judge.full_name} ({judge.judge_code})
              </span>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#555963] hover:text-[#db4b68] cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        }
      />

      <main className="max-w-[1260px] w-full mx-auto px-4 sm:px-6 py-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Assigned Student Queue */}
        <aside className="lg:col-span-4 bg-white border border-[#e2dddb] rounded-[14px] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#e2dddb] pb-3">
            <h1 className="text-base font-bold text-[#1c1c1c]">
              Assigned Assessment Queue
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#034ea2]/10 text-[#034ea2]">
              {items.length} Assigned
            </span>
          </div>

          <div className="space-y-2.5">
            {items.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => selectItem(a)}
                className={`w-full text-left p-3.5 rounded-[10px] border transition-all cursor-pointer ${
                  selected?.id === a.id
                    ? "border-[#034ea2] bg-[#034ea2]/6"
                    : "border-[#e2dddb] hover:bg-[#f9f8f6]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-[#1c1c1c] truncate">
                    {a.student_name}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      a.status === "COMPLETED"
                        ? "bg-[#53be95]/20 text-[#0f6b4a]"
                        : a.status === "IN_CALL"
                        ? "bg-[#034ea2]/15 text-[#034ea2]"
                        : a.status === "WAITING"
                        ? "bg-[#f0b64f]/25 text-[#8a5a00]"
                        : "bg-[#efefef] text-[#555963]"
                    }`}
                  >
                    {a.status}
                  </span>
                </div>
                <div className="text-xs font-mono text-[#034ea2] mt-1">
                  {a.registration_number}
                </div>
                <div className="text-xs text-[#555963] mt-0.5">
                  {a.category_name} · {a.district_name}
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Right Assessment & Scoring Workspace */}
        <section className="lg:col-span-8 space-y-6">
          {selected ? (
            <div className="bg-white border border-[#e2dddb] rounded-[14px] p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e2dddb] pb-4">
                <div>
                  <div className="text-xs font-semibold uppercase text-[#034ea2]">
                    Candidate Verification &amp; Room Control
                  </div>
                  <h2 className="text-xl font-bold text-[#1c1c1c] mt-0.5">
                    {selected.student_name}
                  </h2>
                  <p className="text-xs text-[#555963]">
                    {selected.registration_number} · {selected.institution_name || "Independent"} ·{" "}
                    {selected.district_name} · {selected.category_name}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {videoOpenForId === selected.id ? (
                    <button
                      type="button"
                      onClick={() => setVideoOpenForId(null)}
                      className="px-4 py-2 rounded-[6px] border border-[#034ea2]/30 text-xs font-semibold text-[#034ea2] inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Minimize Video</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleAction("ADMIT")}
                      className="ihqa-btn-gold px-4 py-2 text-xs inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>
                        {selected.status === "IN_CALL"
                          ? "Open Live Video Room"
                          : "Admit to Video Room"}
                      </span>
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleAction("RESCHEDULE")}
                    className="px-3 py-2 rounded-[6px] border border-[#e2dddb] text-xs font-semibold text-[#555963] hover:text-[#034ea2] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Reschedule</span>
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleAction("MARK_ABSENT")}
                    className="px-3 py-2 rounded-[6px] border border-[#db4b68]/40 text-xs font-semibold text-[#9c1d38] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>Absent</span>
                  </button>
                </div>
              </div>

              {/* Embedded Live 1-to-1 Video Call Player */}
              {videoOpenForId === selected.id && (
                <LiveRoomPlayer
                  key={selected.id}
                  assessmentId={selected.id}
                  role="JUDGE"
                  localLabel={judge?.full_name || "Judge"}
                  remoteLabel={`${selected.student_name} (${selected.registration_number})`}
                  onEndCall={() => setVideoOpenForId(null)}
                />
              )}

              {/* 100-Mark Rubric Scorecard */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#1c1c1c]">
                    Quran Recitation Assessment Scorecard
                  </h3>
                  <div className="text-lg font-bold text-[#034ea2]">
                    Total: {totalScore.toFixed(1)} / 100
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <ScoreInput label="Tajweed (Max 30)" max={30} value={tajweed} onChange={setTajweed} />
                  <ScoreInput label="Makharij (Max 25)" max={25} value={makharij} onChange={setMakharij} />
                  <ScoreInput label="Fluency (Max 20)" max={20} value={fluency} onChange={setFluency} />
                  <ScoreInput label="Accuracy of Recitation (Max 15)" max={15} value={accuracy} onChange={setAccuracy} />
                  <ScoreInput label="Voice & Presentation (Max 10)" max={10} value={voice} onChange={setVoice} />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-[#555963]">
                    Judge Evaluation Remarks
                  </label>
                  <textarea
                    rows={3}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Observations on Tajweed, Makharij, fluency, and surah segments..."
                    className="w-full mt-1 border border-[#d7d2cf] rounded-[10px] p-3 text-sm"
                  />
                </div>

                {msg && (
                  <div className="p-3 rounded-[10px] bg-[#53be95]/15 border border-[#53be95]/40 text-xs font-semibold text-[#0f6b4a] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{msg}</span>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleAction("SUBMIT_SCORE")}
                    className="ihqa-btn-blue px-6 py-3 text-sm cursor-pointer disabled:opacity-50"
                  >
                    {saving ? "Saving Evaluation..." : "Submit Evaluation Scorecard"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-[#e2dddb] rounded-[14px] p-8 text-center text-sm text-[#555963]">
              No candidates assigned to your panel yet.
            </div>
          )}
        </section>
      </main>
      <BrandFooter />
    </div>
  );
}

function ScoreInput({
  label,
  max,
  value,
  onChange,
}: {
  label: string;
  max: number;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="p-3.5 rounded-[10px] bg-[#f9f8f6] border border-[#e2dddb]">
      <label className="block text-xs font-semibold text-[#555963] mb-1.5">
        {label}
      </label>
      <input
        type="number"
        min={0}
        max={max}
        step="0.5"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="ihqa-input w-full h-10 bg-white"
      />
    </div>
  );
}
