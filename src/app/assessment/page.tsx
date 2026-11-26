"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Camera,
  CheckCircle2,
  HelpCircle,
  Radio,
  ShieldCheck,
  Wifi,
} from "lucide-react";
import { BrandHeader } from "@/components/BrandHeader";
import { BrandFooter } from "@/components/BrandFooter";
import { LiveRoomPlayer } from "@/components/LiveRoomPlayer";

interface LiveInfo {
  student: {
    registration_number: string;
    full_name: string;
    guardian_name: string | null;
  };
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
  } | null;
}

export default function StudentLiveAssessmentPage() {
  const router = useRouter();
  const [info, setInfo] = useState<LiveInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [consent, setConsent] = useState(true);
  const [micLevel, setMicLevel] = useState(0);
  const [previewReady, setPreviewReady] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [inCall, setInCall] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportMsg, setSupportMsg] = useState("");
  const [supportSent, setSupportSent] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const loadInfo = useCallback(async () => {
    const res = await fetch("/api/student/dashboard");
    if (res.status === 401) {
      router.replace("/login");
      return;
    }
    const d = await res.json();
    setInfo(d);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    void loadInfo();
  }, [loadInfo]);

  useEffect(() => {
    if (!info?.liveAssessment || info.liveAssessment.status === "COMPLETED" || inCall) return;
    const t = setInterval(() => {
      void loadInfo();
    }, 4000);
    return () => clearInterval(t);
  }, [info?.liveAssessment?.status, inCall, loadInfo]);

  const stopPreviewStream = () => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    setPreviewReady(false);
  };

  useEffect(() => {
    return () => stopPreviewStream();
  }, []);

  const startLocalPreview = async () => {
    setMediaError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      setPreviewReady(true);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      const dataArr = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!streamRef.current) return;
        analyser.getByteFrequencyData(dataArr);
        const avg = dataArr.reduce((a, b) => a + b, 0) / dataArr.length;
        setMicLevel(Math.min(100, Math.round(avg * 2)));
        requestAnimationFrame(tick);
      };
      tick();
    } catch {
      setMediaError(
        "Camera/Microphone permission was denied or unavailable on this device. Check browser permissions before joining."
      );
    }
  };

  const enterWaitingRoom = async () => {
    if (!info?.liveAssessment || !consent) return;
    await fetch("/api/assessment/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assessmentId: info.liveAssessment.id,
        action: "TECH_CHECK_PASS",
        guardianConsent: consent,
      }),
    });
    await loadInfo();
  };

  const joinLiveRoom = () => {
    stopPreviewStream();
    setInCall(true);
  };

  const leaveCall = async () => {
    setInCall(false);
    if (info?.liveAssessment) {
      await fetch("/api/assessment/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentId: info.liveAssessment.id,
          action: "LEAVE_CALL",
        }),
      });
      await loadInfo();
    }
  };

  const submitSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: `Live Assessment Support (${info?.student.registration_number})`,
        message: supportMsg,
      }),
    });
    setSupportSent(true);
    setSupportMsg("");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f9f8f6]">
        <BrandHeader showPortalLinks={false} />
        <main className="flex-1 flex items-center justify-center text-sm text-[#555963]">
          Loading Live Quran Recitation Assessment room...
        </main>
      </div>
    );
  }

  const la = info?.liveAssessment;

  return (
    <div className="min-h-screen flex flex-col bg-[#f9f8f6]">
      <BrandHeader
        showPortalLinks={false}
        rightSlot={
          <Link
            href="/dashboard"
            className="text-sm font-semibold text-[#034ea2] hover:underline"
          >
            &larr; Student Dashboard
          </Link>
        }
      />

      <main className="max-w-[1160px] w-full mx-auto px-4 sm:px-6 py-8 flex-1 space-y-6">
        {!la ? (
          <div className="bg-white border border-[#e2dddb] rounded-[16px] p-8 text-center space-y-3">
            <h1 className="text-xl font-bold text-[#1c1c1c]">
              No Live Assessment Scheduled Yet
            </h1>
            <p className="text-sm text-[#555963]">
              Live 1-to-1 Quran recitation slots are assigned after screening shortlisting.
            </p>
            <Link href="/dashboard" className="ihqa-btn-blue px-5 py-2.5 text-sm inline-block">
              Return to Dashboard
            </Link>
          </div>
        ) : (
          <>
            <div className="bg-white border border-[#e2dddb] rounded-[16px] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#034ea2]">
                  <ShieldCheck className="w-4 h-4 text-[#53be95]" />
                  <span>1-to-1 Live Quran Assessment · No Server Recording</span>
                </div>
                <h1 className="text-2xl font-bold text-[#1c1c1c]">
                  Assigned Judge: {la.judge_name}
                </h1>
                <p className="text-xs text-[#555963]">
                  Room: <span className="font-mono">{la.room_name}</span> · Slot:{" "}
                  {new Date(la.scheduled_start).toLocaleString()}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#034ea2]/10 text-[#034ea2]">
                  Status: {la.status}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSupportOpen(true);
                    setSupportSent(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-[#e2dddb] text-xs font-semibold text-[#555963] hover:text-[#034ea2] cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Tech Support</span>
                </button>
              </div>
            </div>

            {!inCall ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 bg-white border border-[#e2dddb] rounded-[16px] p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-[#1c1c1c]">
                      Pre-Session Technical Check
                    </h2>
                    <button
                      type="button"
                      onClick={startLocalPreview}
                      className="ihqa-btn-blue px-4 py-2 text-xs cursor-pointer"
                    >
                      Test Camera &amp; Mic
                    </button>
                  </div>

                  <div className="aspect-video bg-[#1c1c1c] rounded-[12px] overflow-hidden relative flex items-center justify-center">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    {!previewReady && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-white/75 text-sm p-4 text-center">
                        <Camera className="w-8 h-8 mb-2 text-[#f0b64f]" />
                        <span>Click &ldquo;Test Camera &amp; Mic&rdquo; to preview your video feed</span>
                      </div>
                    )}
                  </div>

                  {mediaError && (
                    <div className="p-3 rounded-[8px] bg-[#db4b68]/10 border border-[#db4b68]/30 text-xs text-[#9c1d38]">
                      {mediaError}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="p-3 rounded-[10px] bg-[#f9f8f6] border border-[#e2dddb]">
                      <div className="font-semibold text-[#555963]">Microphone Input</div>
                      <div className="mt-2 h-2 bg-[#efefef] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#53be95] transition-all"
                          style={{ width: `${micLevel}%` }}
                        />
                      </div>
                    </div>
                    <div className="p-3 rounded-[10px] bg-[#f9f8f6] border border-[#e2dddb] flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-[#555963]">Connection Quality</div>
                        <div className="font-bold text-[#0f6b4a] mt-0.5">Ready · Low Latency</div>
                      </div>
                      <Wifi className="w-5 h-5 text-[#53be95]" />
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 bg-white border border-[#e2dddb] rounded-[16px] p-6 space-y-5 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h2 className="text-lg font-bold text-[#1c1c1c]">
                      Waiting Room &amp; Privacy Notice
                    </h2>
                    <div className="p-4 rounded-[12px] bg-[#034ea2]/6 border border-[#034ea2]/20 text-xs text-[#1c1c1c] space-y-2 leading-relaxed">
                      <p className="font-semibold text-[#034ea2]">
                        No-Recording Security Architecture
                      </p>
                      <p>
                        Server-side audio/video recording and LiveKit Egress are disabled by
                        design. Only live assessment scores and judge remarks are saved.
                        External screen recording is prohibited; parent/guardian consent is
                        required for minor candidates.
                      </p>
                    </div>

                    <label className="flex items-start gap-2.5 text-xs text-[#1c1c1c] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                        className="mt-0.5 accent-[#034ea2]"
                      />
                      <span>
                        I confirm candidate identity verification and parent/guardian consent
                        for this live non-recorded Quran recitation assessment.
                      </span>
                    </label>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-[#e2dddb]">
                    {la.status === "SCHEDULED" && (
                      <button
                        type="button"
                        disabled={!consent}
                        onClick={enterWaitingRoom}
                        className="ihqa-btn-gold w-full py-3.5 text-sm cursor-pointer disabled:opacity-50"
                      >
                        Complete Check &amp; Enter Waiting Room
                      </button>
                    )}

                    {la.status === "WAITING" && (
                      <div className="space-y-3">
                        <div className="p-3.5 rounded-[10px] bg-[#f0b64f]/20 border border-[#f0b64f] text-xs font-semibold text-[#8a5a00] flex items-center gap-2">
                          <Radio className="w-4 h-4 animate-pulse" />
                          <span>
                            You are in the Waiting Room. Wait for {la.judge_name} to admit you.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={joinLiveRoom}
                          className="ihqa-btn-blue w-full py-3 text-sm cursor-pointer"
                        >
                          Connect &amp; Wait Inside Room
                        </button>
                      </div>
                    )}

                    {la.status === "IN_CALL" && (
                      <button
                        type="button"
                        onClick={joinLiveRoom}
                        className="ihqa-btn-gold w-full py-3.5 text-sm flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Judge Admitted You — Join Live Video Room</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <LiveRoomPlayer
                assessmentId={la.id}
                role="STUDENT"
                localLabel={info?.student.full_name || "Student"}
                remoteLabel={`Judge: ${la.judge_name}`}
                onEndCall={leaveCall}
              />
            )}
          </>
        )}
      </main>

      {supportOpen && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <form
            onSubmit={submitSupport}
            className="bg-white border border-[#e2dddb] rounded-[16px] max-w-md w-full p-6 space-y-4"
          >
            <h3 className="text-lg font-bold text-[#1c1c1c]">Technical Support</h3>
            {supportSent ? (
              <p className="text-sm text-[#0f6b4a]">
                Your technical support ticket has been logged for the control room.
              </p>
            ) : (
              <textarea
                required
                rows={4}
                placeholder="Describe any audio, video, or connectivity issue..."
                value={supportMsg}
                onChange={(e) => setSupportMsg(e.target.value)}
                className="w-full border border-[#e2dddb] rounded-[10px] p-3 text-sm"
              />
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSupportOpen(false)}
                className="px-4 py-2 rounded-[8px] border border-[#e2dddb] text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
              {!supportSent && (
                <button type="submit" className="ihqa-btn-blue px-4 py-2 text-xs cursor-pointer">
                  Submit Ticket
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      <BrandFooter />
    </div>
  );
}
