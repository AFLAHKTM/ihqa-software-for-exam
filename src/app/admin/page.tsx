"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Award,
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  Download,
  FileSpreadsheet,
  LogOut,
  MapPin,
  Settings,
  Shield,
  Trash2,
  Users,
} from "lucide-react";
import { BrandHeader } from "@/components/BrandHeader";
import { BrandFooter } from "@/components/BrandFooter";

type AdminTab =
  | "overview"
  | "students"
  | "institutions"
  | "districts"
  | "questions"
  | "config"
  | "scheduling"
  | "results"
  | "merit"
  | "reports"
  | "roles";

const NAV_ITEMS: Array<{ id: AdminTab; label: string; icon: React.ReactNode }> = [
  { id: "overview", label: "Overview", icon: <BarChart3 className="w-4 h-4" /> },
  { id: "students", label: "1. Students", icon: <Users className="w-4 h-4" /> },
  { id: "institutions", label: "2. Institutions", icon: <Building2 className="w-4 h-4" /> },
  { id: "districts", label: "3. Districts", icon: <MapPin className="w-4 h-4" /> },
  { id: "questions", label: "4. Question Bank", icon: <BookOpen className="w-4 h-4" /> },
  { id: "config", label: "5. Exam Config", icon: <Settings className="w-4 h-4" /> },
  { id: "scheduling", label: "6. Scheduling & Live", icon: <Calendar className="w-4 h-4" /> },
  { id: "results", label: "7. Results", icon: <Award className="w-4 h-4" /> },
  { id: "merit", label: "8. Merit List", icon: <Award className="w-4 h-4" /> },
  { id: "reports", label: "9. Reports & Export", icon: <FileSpreadsheet className="w-4 h-4" /> },
  { id: "roles", label: "10. Roles & Audit", icon: <Shield className="w-4 h-4" /> },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const [tab, setTab] = useState<AdminTab>("overview");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // Module datasets
  const [overviewData, setOverviewData] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [studentQuery, setStudentQuery] = useState("");
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [examConfig, setExamConfig] = useState<any>(null);
  const [batchesData, setBatchesData] = useState<any>({ batches: [], liveAssessments: [], judges: [] });
  const [resultsData, setResultsData] = useState<any>({ results: [], meritList: [] });
  const [rolesData, setRolesData] = useState<any>({
    staffUsers: [],
    judges: [],
    auditLogs: [],
    supportTickets: [],
  });

  // Quick forms state
  const [newStudent, setNewStudent] = useState({
    registrationNumber: "",
    fullName: "",
    districtId: "10",
    categoryId: "2",
    institutionId: "",
    batchId: "1",
    phone: "",
    email: "",
  });
  const [newInst, setNewInst] = useState({ code: "", name: "", districtId: "10", place: "" });
  const [newQ, setNewQ] = useState({
    questionSet: "SET-A",
    categoryId: "",
    questionTextEn: "",
    questionTextMl: "",
    questionTextAr: "",
    imageUrl: "",
    optA: "",
    optB: "",
    optC: "",
    optD: "",
    correctOptionId: "A",
    marks: "2",
    negativeMarks: "0",
  });
  const [newLiveSlot, setNewLiveSlot] = useState({
    studentId: "",
    judgeId: "",
    scheduledStart: "",
    scheduledEnd: "",
  });
  const [newStaff, setNewStaff] = useState({
    username: "",
    fullName: "",
    email: "",
    role: "JUDGE",
    password: "",
  });

  const notify = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 4000);
  };

  const loadAll = useCallback(async () => {
    const ovRes = await fetch("/api/admin/overview");
    if (ovRes.status === 401 || ovRes.status === 403) {
      router.replace("/admin/login");
      return;
    }
    const ov = await ovRes.json();
    setOverviewData(ov);

    const [st, inst, dist, q, cfg, bat, res, rol] = await Promise.all([
      fetch(`/api/admin/students?q=${encodeURIComponent(studentQuery)}`).then((r) => r.json()),
      fetch("/api/admin/institutions").then((r) => r.json()),
      fetch("/api/admin/districts").then((r) => r.json()),
      fetch("/api/admin/questions").then((r) => r.json()),
      fetch("/api/admin/config").then((r) => r.json()),
      fetch("/api/admin/batches").then((r) => r.json()),
      fetch("/api/admin/results").then((r) => r.json()),
      fetch("/api/admin/roles").then((r) => r.json()),
    ]);

    setStudents(st.students || []);
    setInstitutions(inst.institutions || []);
    setDistricts(dist.districts || []);
    setQuestions(q.questions || []);
    setCategories(q.categories || []);
    setExamConfig(cfg.config || null);
    setBatchesData(bat);
    setResultsData(res);
    setRolesData(rol);
    setLoading(false);
  }, [router, studentQuery]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: "ADMIN" }),
    });
    router.push("/admin/login");
  };

  if (loading || !overviewData) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f9f8f6]">
        <BrandHeader showPortalLinks={false} />
        <main className="flex-1 flex items-center justify-center text-sm text-[#555963]">
          Loading Central Administration Dashboard...
        </main>
      </div>
    );
  }

  const ov = overviewData.overview;

  return (
    <div className="min-h-screen flex flex-col bg-[#f9f8f6]">
      <BrandHeader
        showPortalLinks={false}
        rightSlot={
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs font-semibold px-2.5 py-1 rounded bg-[#034ea2]/10 text-[#034ea2]">
              DB: {overviewData.dbMode}
            </span>
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

      <main className="max-w-[1340px] w-full mx-auto px-4 sm:px-6 py-6 flex-1 space-y-6">
        {toast && (
          <div className="p-3.5 rounded-[10px] bg-[#53be95]/20 border border-[#53be95] text-sm font-semibold text-[#0f6b4a]">
            {toast}
          </div>
        )}

        {/* Top KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard label="Registered Students" value={ov.totalStudents} accent="#034ea2" />
          <KpiCard label="Eligible Verified" value={ov.eligibleStudents} accent="#53be95" />
          <KpiCard label="Exams Started" value={ov.startedCount} accent="#f0b64f" />
          <KpiCard label="Completed" value={ov.completedCount} accent="#12b878" />
          <KpiCard label="Pending Exams" value={ov.pendingCount} accent="#555963" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-3 bg-white border border-[#e2dddb] rounded-[14px] p-3 space-y-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-[8px] text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                  tab === item.id
                    ? "bg-[#034ea2] text-white"
                    : "text-[#1c1c1c] hover:bg-[#efefef]"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </aside>

          {/* Active Module Panel */}
          <section className="lg:col-span-9 bg-white border border-[#e2dddb] rounded-[14px] p-6 space-y-6 min-w-0">
            {tab === "overview" && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-xl font-bold text-[#1c1c1c]">
                    Kerala State Examination Overview
                  </h1>
                  <p className="text-xs text-[#555963]">
                    Real-time participation across 14 districts, competition categories, and Stage 2 Live Assessments.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-[#e2dddb] rounded-[12px] p-4 space-y-3">
                    <h2 className="text-sm font-bold text-[#1c1c1c]">
                      District-wise Participation (14 Districts)
                    </h2>
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {overviewData.districtParticipation.map((d: any) => (
                        <div key={d.id} className="text-xs space-y-1">
                          <div className="flex justify-between font-medium">
                            <span>
                              {d.name_en} ({d.zone})
                            </span>
                            <span>
                              {d.registered_count} reg · {d.completed_count} done
                            </span>
                          </div>
                          <div className="h-1.5 bg-[#efefef] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#034ea2]"
                              style={{
                                width: `${Math.min(100, Number(d.registered_count) * 25)}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border border-[#e2dddb] rounded-[12px] p-4 space-y-3">
                    <h2 className="text-sm font-bold text-[#1c1c1c]">
                      Category-wise Participation
                    </h2>
                    <div className="divide-y divide-[#e2dddb]">
                      {overviewData.categoryParticipation.map((c: any) => (
                        <div key={c.id} className="py-2.5 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-semibold text-[#1c1c1c]">{c.name_en}</div>
                            <div className="text-[#555963]">Code: {c.code}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-[#034ea2]">
                              {c.registered_count} Students
                            </div>
                            <div className="text-[#0f6b4a]">
                              {c.qualified_count} Qualified
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-3 border-t border-[#e2dddb] text-xs space-y-1">
                      <div className="font-bold text-[#1c1c1c]">
                        Stage 2 Live Recitation Summary
                      </div>
                      <div className="text-[#555963]">
                        Scheduled: {ov.liveStats?.total_live ?? 0} · Waiting:{" "}
                        {ov.liveStats?.waiting_live ?? 0} · In Call:{" "}
                        {ov.liveStats?.in_call_live ?? 0} · Completed:{" "}
                        {ov.liveStats?.completed_live ?? 0}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === "students" && (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-[#1c1c1c]">Student Management</h2>
                  <input
                    type="text"
                    placeholder="Search reg no or name..."
                    value={studentQuery}
                    onChange={(e) => setStudentQuery(e.target.value)}
                    className="ihqa-input h-10 w-64 text-xs"
                  />
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const res = await fetch("/api/admin/students", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(newStudent),
                    });
                    if (res.ok) {
                      notify("Student registered successfully.");
                      setNewStudent({ ...newStudent, registrationNumber: "", fullName: "" });
                      await loadAll();
                    } else {
                      const d = await res.json();
                      notify(d.error || "Error registering student");
                    }
                  }}
                  className="p-4 rounded-[12px] bg-[#f9f8f6] border border-[#e2dddb] grid grid-cols-1 sm:grid-cols-4 gap-3"
                >
                  <input
                    required
                    placeholder="Reg No (IHQA-KL-...)"
                    value={newStudent.registrationNumber}
                    onChange={(e) =>
                      setNewStudent({ ...newStudent, registrationNumber: e.target.value })
                    }
                    className="ihqa-input h-10 text-xs"
                  />
                  <input
                    required
                    placeholder="Full Name"
                    value={newStudent.fullName}
                    onChange={(e) => setNewStudent({ ...newStudent, fullName: e.target.value })}
                    className="ihqa-input h-10 text-xs"
                  />
                  <select
                    value={newStudent.districtId}
                    onChange={(e) => setNewStudent({ ...newStudent, districtId: e.target.value })}
                    className="ihqa-input h-10 text-xs"
                  >
                    {districts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name_en}
                      </option>
                    ))}
                  </select>
                  <select
                    value={newStudent.categoryId}
                    onChange={(e) => setNewStudent({ ...newStudent, categoryId: e.target.value })}
                    className="ihqa-input h-10 text-xs"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name_en}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="ihqa-btn-gold h-10 text-xs sm:col-span-4 cursor-pointer">
                    + Register Student (Default Password: Student@2026)
                  </button>
                </form>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#e2dddb] text-[#555963]">
                        <th className="py-2 pr-3">Reg No</th>
                        <th className="py-2 pr-3">Student</th>
                        <th className="py-2 pr-3">District</th>
                        <th className="py-2 pr-3">Category</th>
                        <th className="py-2 pr-3">Eligibility</th>
                        <th className="py-2">Exam Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2dddb]">
                      {students.map((s) => (
                        <tr key={s.id}>
                          <td className="py-2.5 pr-3 font-mono font-semibold text-[#034ea2]">
                            {s.registration_number}
                          </td>
                          <td className="py-2.5 pr-3 font-medium">{s.full_name}</td>
                          <td className="py-2.5 pr-3">{s.district_name}</td>
                          <td className="py-2.5 pr-3">{s.category_name}</td>
                          <td className="py-2.5 pr-3">
                            <select
                              value={s.eligibility_status}
                              onChange={async (e) => {
                                await fetch("/api/admin/students", {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    studentId: s.id,
                                    eligibilityStatus: e.target.value,
                                  }),
                                });
                                notify("Eligibility updated.");
                                await loadAll();
                              }}
                              className="border border-[#e2dddb] rounded px-2 py-1 text-xs bg-white"
                            >
                              <option value="ELIGIBLE">ELIGIBLE</option>
                              <option value="PENDING_VERIFICATION">PENDING_VERIFICATION</option>
                              <option value="INELIGIBLE">INELIGIBLE</option>
                            </select>
                          </td>
                          <td className="py-2.5">{s.exam_status || "NOT_STARTED"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === "institutions" && (
              <div className="space-y-5">
                <h2 className="text-lg font-bold text-[#1c1c1c]">Institution Management</h2>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const r = await fetch("/api/admin/institutions", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(newInst),
                    });
                    if (r.ok) {
                      notify("Institution added.");
                      setNewInst({ code: "", name: "", districtId: "10", place: "" });
                      await loadAll();
                    }
                  }}
                  className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-[#f9f8f6] p-4 rounded-[12px] border border-[#e2dddb]"
                >
                  <input
                    required
                    placeholder="Code (INST-MLP-02)"
                    value={newInst.code}
                    onChange={(e) => setNewInst({ ...newInst, code: e.target.value })}
                    className="ihqa-input h-10 text-xs"
                  />
                  <input
                    required
                    placeholder="Institution Name"
                    value={newInst.name}
                    onChange={(e) => setNewInst({ ...newInst, name: e.target.value })}
                    className="ihqa-input h-10 text-xs"
                  />
                  <select
                    value={newInst.districtId}
                    onChange={(e) => setNewInst({ ...newInst, districtId: e.target.value })}
                    className="ihqa-input h-10 text-xs"
                  >
                    {districts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name_en}
                      </option>
                    ))}
                  </select>
                  <input
                    required
                    placeholder="Place / Town"
                    value={newInst.place}
                    onChange={(e) => setNewInst({ ...newInst, place: e.target.value })}
                    className="ihqa-input h-10 text-xs"
                  />
                  <button type="submit" className="ihqa-btn-blue h-10 text-xs sm:col-span-4 cursor-pointer">
                    + Add Verified Institution
                  </button>
                </form>

                <div className="divide-y divide-[#e2dddb] text-xs">
                  {institutions.map((i) => (
                    <div key={i.id} className="py-3 flex justify-between items-center">
                      <div>
                        <div className="font-bold text-[#1c1c1c]">{i.name}</div>
                        <div className="text-[#555963]">
                          {i.code} · {i.place}, {i.district_name}
                        </div>
                      </div>
                      <span className="font-semibold text-[#034ea2]">{i.student_count} Students</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "districts" && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-[#1c1c1c]">
                  Kerala District Management (All 14 Districts)
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-[#e2dddb] text-[#555963]">
                        <th className="py-2 pr-3">Code</th>
                        <th className="py-2 pr-3">District (EN / ML)</th>
                        <th className="py-2 pr-3">Zone</th>
                        <th className="py-2 pr-3">Institutions</th>
                        <th className="py-2 pr-3">Students</th>
                        <th className="py-2">Completed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2dddb]">
                      {districts.map((d) => (
                        <tr key={d.id}>
                          <td className="py-2 pr-3 font-mono font-semibold text-[#034ea2]">{d.code}</td>
                          <td className="py-2 pr-3">
                            {d.name_en} <span className="malayalam-text text-[#555963]">({d.name_ml})</span>
                          </td>
                          <td className="py-2 pr-3">{d.zone}</td>
                          <td className="py-2 pr-3">{d.institution_count}</td>
                          <td className="py-2 pr-3 font-semibold">{d.student_count}</td>
                          <td className="py-2">{d.completed_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === "questions" && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-[#1c1c1c]">
                    Multilingual Question Bank (Admin Managed)
                  </h2>
                  <p className="text-xs text-[#555963]">
                    Pre-seeded items are marked as Sample Demo Items. Administrators manage all official syllabus questions, Arabic Quranic diacritics, Malayalam text, marks, and negative marks here.
                  </p>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const payload = {
                      questionSet: newQ.questionSet,
                      categoryId: newQ.categoryId || null,
                      questionTextEn: newQ.questionTextEn,
                      questionTextMl: newQ.questionTextMl || null,
                      questionTextAr: newQ.questionTextAr || null,
                      imageUrl: newQ.imageUrl || null,
                      correctOptionId: newQ.correctOptionId,
                      marks: Number(newQ.marks),
                      negativeMarks: Number(newQ.negativeMarks),
                      options: [
                        { id: "A", text_en: newQ.optA },
                        { id: "B", text_en: newQ.optB },
                        { id: "C", text_en: newQ.optC },
                        { id: "D", text_en: newQ.optD },
                      ],
                    };
                    const r = await fetch("/api/admin/questions", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(payload),
                    });
                    if (r.ok) {
                      notify("Question added to Question Bank.");
                      setNewQ({
                        ...newQ,
                        questionTextEn: "",
                        questionTextMl: "",
                        questionTextAr: "",
                        optA: "",
                        optB: "",
                        optC: "",
                        optD: "",
                      });
                      await loadAll();
                    }
                  }}
                  className="p-4 rounded-[12px] bg-[#f9f8f6] border border-[#e2dddb] space-y-3"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <input
                      placeholder="Set (SET-A)"
                      value={newQ.questionSet}
                      onChange={(e) => setNewQ({ ...newQ, questionSet: e.target.value })}
                      className="ihqa-input h-10 text-xs"
                    />
                    <select
                      value={newQ.categoryId}
                      onChange={(e) => setNewQ({ ...newQ, categoryId: e.target.value })}
                      className="ihqa-input h-10 text-xs"
                    >
                      <option value="">All Categories</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name_en}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="Marks"
                      value={newQ.marks}
                      onChange={(e) => setNewQ({ ...newQ, marks: e.target.value })}
                      className="ihqa-input h-10 text-xs"
                    />
                    <select
                      value={newQ.correctOptionId}
                      onChange={(e) => setNewQ({ ...newQ, correctOptionId: e.target.value })}
                      className="ihqa-input h-10 text-xs"
                    >
                      <option value="A">Correct: A</option>
                      <option value="B">Correct: B</option>
                      <option value="C">Correct: C</option>
                      <option value="D">Correct: D</option>
                    </select>
                  </div>

                  <input
                    required
                    placeholder="Question Text (English)"
                    value={newQ.questionTextEn}
                    onChange={(e) => setNewQ({ ...newQ, questionTextEn: e.target.value })}
                    className="ihqa-input w-full h-10 text-xs"
                  />
                  <input
                    placeholder="Malayalam Translation (Optional)"
                    value={newQ.questionTextMl}
                    onChange={(e) => setNewQ({ ...newQ, questionTextMl: e.target.value })}
                    className="ihqa-input w-full h-10 text-xs malayalam-text"
                  />
                  <input
                    dir="rtl"
                    placeholder="النص القرآني بالعربية مع التشكيل (اختياري)"
                    value={newQ.questionTextAr}
                    onChange={(e) => setNewQ({ ...newQ, questionTextAr: e.target.value })}
                    className="ihqa-input w-full h-10 text-sm quran-arabic"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      required
                      placeholder="Option A"
                      value={newQ.optA}
                      onChange={(e) => setNewQ({ ...newQ, optA: e.target.value })}
                      className="ihqa-input h-10 text-xs"
                    />
                    <input
                      required
                      placeholder="Option B"
                      value={newQ.optB}
                      onChange={(e) => setNewQ({ ...newQ, optB: e.target.value })}
                      className="ihqa-input h-10 text-xs"
                    />
                    <input
                      required
                      placeholder="Option C"
                      value={newQ.optC}
                      onChange={(e) => setNewQ({ ...newQ, optC: e.target.value })}
                      className="ihqa-input h-10 text-xs"
                    />
                    <input
                      required
                      placeholder="Option D"
                      value={newQ.optD}
                      onChange={(e) => setNewQ({ ...newQ, optD: e.target.value })}
                      className="ihqa-input h-10 text-xs"
                    />
                  </div>
                  <button type="submit" className="ihqa-btn-gold px-5 py-2.5 text-xs cursor-pointer">
                    + Add Question to Bank
                  </button>
                </form>

                <div className="space-y-3">
                  {questions.map((q) => (
                    <div
                      key={q.id}
                      className="border border-[#e2dddb] rounded-[10px] p-4 flex items-start justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap gap-2">
                          <span className="font-bold text-[#034ea2]">#{q.id} · {q.question_set}</span>
                          <span className="px-2 py-0.5 rounded bg-[#efefef]">{q.category_name || "All Categories"}</span>
                          <span className="px-2 py-0.5 rounded bg-[#53be95]/15 text-[#0f6b4a]">
                            {q.marks} Marks · Ans: {q.correct_option_id}
                          </span>
                          {q.is_sample_demo && (
                            <span className="px-2 py-0.5 rounded bg-[#f0b64f]/20 text-[#8a5a00]">
                              Sample Demo Item
                            </span>
                          )}
                        </div>
                        {q.question_text_ar && (
                          <div dir="rtl" className="quran-arabic text-base text-[#1c1c1c]">
                            {q.question_text_ar}
                          </div>
                        )}
                        <div className="font-medium text-[#1c1c1c]">{q.question_text_en}</div>
                        {q.question_text_ml && (
                          <div className="malayalam-text text-[#555963]">{q.question_text_ml}</div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          await fetch(`/api/admin/questions?id=${q.id}`, { method: "DELETE" });
                          notify(`Deleted question #${q.id}`);
                          await loadAll();
                        }}
                        className="text-[#db4b68] hover:bg-[#db4b68]/10 p-2 rounded cursor-pointer shrink-0"
                        title="Delete question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "config" && examConfig && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const r = await fetch("/api/admin/config", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(examConfig),
                  });
                  if (r.ok) {
                    notify("Examination configuration saved & audited.");
                    await loadAll();
                  }
                }}
                className="space-y-4 text-xs"
              >
                <h2 className="text-lg font-bold text-[#1c1c1c]">
                  Examination Configuration &amp; Result Visibility
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-[#555963]">Exam Title</label>
                    <input
                      value={examConfig.title}
                      onChange={(e) => setExamConfig({ ...examConfig, title: e.target.value })}
                      className="ihqa-input w-full h-10 mt-1"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#555963]">Exam Status</label>
                    <select
                      value={examConfig.exam_status}
                      onChange={(e) =>
                        setExamConfig({ ...examConfig, exam_status: e.target.value })
                      }
                      className="ihqa-input w-full h-10 mt-1"
                    >
                      <option value="UPCOMING">UPCOMING</option>
                      <option value="OPEN">OPEN</option>
                      <option value="PAUSED">PAUSED</option>
                      <option value="CLOSED">CLOSED</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-[#555963]">Duration (Minutes)</label>
                    <input
                      type="number"
                      value={examConfig.duration_minutes}
                      onChange={(e) =>
                        setExamConfig({ ...examConfig, duration_minutes: Number(e.target.value) })
                      }
                      className="ihqa-input w-full h-10 mt-1"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#555963]">Questions Per Attempt</label>
                    <input
                      type="number"
                      value={examConfig.questions_per_exam}
                      onChange={(e) =>
                        setExamConfig({ ...examConfig, questions_per_exam: Number(e.target.value) })
                      }
                      className="ihqa-input w-full h-10 mt-1"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#555963]">Date / Schedule Label</label>
                    <input
                      value={examConfig.exam_date_label}
                      onChange={(e) =>
                        setExamConfig({ ...examConfig, exam_date_label: e.target.value })
                      }
                      className="ihqa-input w-full h-10 mt-1"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#555963]">Passing Percentage (%)</label>
                    <input
                      type="number"
                      value={examConfig.passing_percentage}
                      onChange={(e) =>
                        setExamConfig({ ...examConfig, passing_percentage: Number(e.target.value) })
                      }
                      className="ihqa-input w-full h-10 mt-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-[#555963]">Eligibility Information</label>
                  <textarea
                    rows={2}
                    value={examConfig.eligibility_info}
                    onChange={(e) =>
                      setExamConfig({ ...examConfig, eligibility_info: e.target.value })
                    }
                    className="w-full border border-[#d7d2cf] rounded-[10px] p-3 mt-1"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                  {[
                    ["negative_marking_enabled", "Enable Negative Marking"],
                    ["randomize_questions", "Randomise Question Order"],
                    ["randomize_options", "Randomise Answer Order"],
                    ["results_published", "Publish Results to Students"],
                    ["show_answers_to_students", "Reveal Correct Answers"],
                    ["show_merit_rank", "Show Merit Rank to Students"],
                  ].map(([key, label]) => (
                    <label
                      key={key}
                      className="flex items-center gap-2.5 p-3 rounded-[10px] bg-[#f9f8f6] border border-[#e2dddb] cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(examConfig[key])}
                        onChange={(e) =>
                          setExamConfig({ ...examConfig, [key]: e.target.checked })
                        }
                        className="accent-[#034ea2]"
                      />
                      <span className="font-semibold text-[#1c1c1c]">{label}</span>
                    </label>
                  ))}
                </div>

                <button type="submit" className="ihqa-btn-blue px-6 py-3 text-xs cursor-pointer">
                  Save Configuration
                </button>
              </form>
            )}

            {tab === "scheduling" && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <h2 className="text-lg font-bold text-[#1c1c1c]">
                    Stage 1: Staggered Examination Batches
                  </h2>
                  <div className="divide-y divide-[#e2dddb] text-xs">
                    {batchesData.batches.map((b: any) => (
                      <div key={b.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="font-bold text-[#1c1c1c]">{b.title}</div>
                          <div className="text-[#555963]">
                            {b.batch_code} · Capacity {b.max_capacity.toLocaleString()} · Assigned:{" "}
                            {b.assigned_students}
                          </div>
                        </div>
                        <select
                          value={b.status}
                          onChange={async (e) => {
                            await fetch("/api/admin/batches", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ id: b.id, status: e.target.value }),
                            });
                            notify("Batch status updated.");
                            await loadAll();
                          }}
                          className="border border-[#e2dddb] rounded px-2.5 py-1.5 bg-white font-semibold"
                        >
                          <option value="SCHEDULED">SCHEDULED</option>
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="PAUSED">PAUSED</option>
                          <option value="COMPLETED">COMPLETED</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#e2dddb] space-y-4">
                  <h2 className="text-lg font-bold text-[#1c1c1c]">
                    Stage 2: Live Quran Recitation Room Allocation (No Recording)
                  </h2>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const r = await fetch("/api/admin/batches", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          kind: "LIVE_ASSESSMENT",
                          ...newLiveSlot,
                        }),
                      });
                      if (r.ok) {
                        notify("1-to-1 Private LiveKit room scheduled.");
                        await loadAll();
                      }
                    }}
                    className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-[#f9f8f6] p-4 rounded-[12px] border border-[#e2dddb] text-xs"
                  >
                    <select
                      required
                      value={newLiveSlot.studentId}
                      onChange={(e) => setNewLiveSlot({ ...newLiveSlot, studentId: e.target.value })}
                      className="ihqa-input h-10"
                    >
                      <option value="">Select Student</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.registration_number} - {s.full_name}
                        </option>
                      ))}
                    </select>
                    <select
                      required
                      value={newLiveSlot.judgeId}
                      onChange={(e) => setNewLiveSlot({ ...newLiveSlot, judgeId: e.target.value })}
                      className="ihqa-input h-10"
                    >
                      <option value="">Assign Judge</option>
                      {batchesData.judges.map((j: any) => (
                        <option key={j.id} value={j.id}>
                          {j.judge_code} - {j.full_name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="datetime-local"
                      required
                      value={newLiveSlot.scheduledStart}
                      onChange={(e) =>
                        setNewLiveSlot({ ...newLiveSlot, scheduledStart: e.target.value })
                      }
                      className="ihqa-input h-10"
                    />
                    <input
                      type="datetime-local"
                      required
                      value={newLiveSlot.scheduledEnd}
                      onChange={(e) =>
                        setNewLiveSlot({ ...newLiveSlot, scheduledEnd: e.target.value })
                      }
                      className="ihqa-input h-10"
                    />
                    <button type="submit" className="ihqa-btn-gold h-10 sm:col-span-4 cursor-pointer">
                      + Allocate Private 1-to-1 Assessment Room
                    </button>
                  </form>

                  <div className="divide-y divide-[#e2dddb] text-xs">
                    {batchesData.liveAssessments.map((la: any) => (
                      <div key={la.id} className="py-3 flex flex-wrap justify-between gap-2">
                        <div>
                          <div className="font-bold text-[#1c1c1c]">
                            {la.student_name} ({la.registration_number}) &rarr; {la.judge_name}
                          </div>
                          <div className="text-[#555963] font-mono">
                            Room: {la.room_name} · Recording: DISABLED
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-[#034ea2]/10 text-[#034ea2] font-semibold self-center">
                          {la.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === "results" && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-[#1c1c1c]">
                  Results Management (Audited Controls)
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-[#e2dddb] text-[#555963]">
                        <th className="py-2 pr-3">Reg No</th>
                        <th className="py-2 pr-3">Student</th>
                        <th className="py-2 pr-3">Category</th>
                        <th className="py-2 pr-3">Marks</th>
                        <th className="py-2">Status Control</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2dddb]">
                      {resultsData.results.map((r: any) => (
                        <tr key={r.id}>
                          <td className="py-2.5 pr-3 font-mono font-semibold text-[#034ea2]">
                            {r.registration_number}
                          </td>
                          <td className="py-2.5 pr-3">{r.student_name}</td>
                          <td className="py-2.5 pr-3">{r.category_name}</td>
                          <td className="py-2.5 pr-3 font-bold">
                            {r.obtained_marks} / {r.total_marks}
                          </td>
                          <td className="py-2.5">
                            <select
                              value={r.status}
                              onChange={async (e) => {
                                await fetch("/api/admin/results", {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    attemptId: r.id,
                                    status: e.target.value,
                                  }),
                                });
                                notify("Result status updated & audited.");
                                await loadAll();
                              }}
                              className="border border-[#e2dddb] rounded px-2 py-1 bg-white"
                            >
                              <option value="SUBMITTED">SUBMITTED</option>
                              <option value="EVALUATION_PENDING">EVALUATION_PENDING</option>
                              <option value="QUALIFIED">QUALIFIED</option>
                              <option value="NOT_QUALIFIED">NOT_QUALIFIED</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === "merit" && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-[#1c1c1c]">
                  State Merit List (Screening + Live Recitation)
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-[#e2dddb] text-[#555963]">
                        <th className="py-2 pr-3">Rank</th>
                        <th className="py-2 pr-3">Reg No</th>
                        <th className="py-2 pr-3">Candidate</th>
                        <th className="py-2 pr-3">District</th>
                        <th className="py-2 pr-3">Screening</th>
                        <th className="py-2">Live Recitation (/100)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2dddb]">
                      {resultsData.meritList.map((m: any, idx: number) => (
                        <tr key={m.student_id}>
                          <td className="py-2.5 pr-3 font-bold text-[#034ea2]">#{idx + 1}</td>
                          <td className="py-2.5 pr-3 font-mono">{m.registration_number}</td>
                          <td className="py-2.5 pr-3 font-medium">{m.student_name}</td>
                          <td className="py-2.5 pr-3">{m.district_name}</td>
                          <td className="py-2.5 pr-3">
                            {m.screening_marks} / {m.screening_total}
                          </td>
                          <td className="py-2.5 font-bold text-[#0f6b4a]">
                            {m.live_recitation_score ?? "Pending"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === "reports" && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-[#1c1c1c]">
                    Reports &amp; CSV / Excel Exports
                  </h2>
                  <p className="text-xs text-[#555963]">
                    Download structured state reports in UTF-8 CSV or Microsoft Excel (.xlsx) format.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { type: "students", title: "Registered Students Directory", desc: "All candidates with district, category, institution, batch & eligibility." },
                    { type: "results", title: "Screening Examination Results", desc: "Marks, correct/wrong counts, and qualification statuses." },
                    { type: "merit", title: "Combined State Merit List", desc: "Screening marks combined with 100-mark Live Recitation scorecards." },
                    { type: "districts", title: "14-District Participation Report", desc: "District & zone summary counts across Kerala." },
                  ].map((rep) => (
                    <div
                      key={rep.type}
                      className="p-5 rounded-[12px] border border-[#e2dddb] bg-[#f9f8f6] space-y-3"
                    >
                      <div className="font-bold text-sm text-[#1c1c1c]">{rep.title}</div>
                      <p className="text-xs text-[#555963]">{rep.desc}</p>
                      <div className="flex gap-2">
                        <a
                          href={`/api/admin/export?type=${rep.type}&format=csv`}
                          className="ihqa-btn-blue px-3.5 py-2 text-xs inline-flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Export CSV</span>
                        </a>
                        <a
                          href={`/api/admin/export?type=${rep.type}&format=xlsx`}
                          className="ihqa-btn-gold px-3.5 py-2 text-xs inline-flex items-center gap-1.5"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>Export Excel (.xlsx)</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "roles" && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-[#1c1c1c]">
                  User Roles, Judges &amp; Immutable Audit Logs
                </h2>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const r = await fetch("/api/admin/roles", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(newStaff),
                    });
                    if (r.ok) {
                      notify("Staff/Judge account created.");
                      setNewStaff({
                        username: "",
                        fullName: "",
                        email: "",
                        role: "JUDGE",
                        password: "",
                      });
                      await loadAll();
                    }
                  }}
                  className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 bg-[#f9f8f6] p-4 rounded-[12px] border border-[#e2dddb] text-xs"
                >
                  <input
                    required
                    placeholder="Code / Username"
                    value={newStaff.username}
                    onChange={(e) => setNewStaff({ ...newStaff, username: e.target.value })}
                    className="ihqa-input h-10"
                  />
                  <input
                    required
                    placeholder="Full Name"
                    value={newStaff.fullName}
                    onChange={(e) => setNewStaff({ ...newStaff, fullName: e.target.value })}
                    className="ihqa-input h-10"
                  />
                  <input
                    placeholder="Email"
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                    className="ihqa-input h-10"
                  />
                  <select
                    value={newStaff.role}
                    onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                    className="ihqa-input h-10"
                  >
                    <option value="JUDGE">JUDGE</option>
                    <option value="EXAM_CONTROLLER">EXAM_CONTROLLER</option>
                    <option value="EVALUATOR">EVALUATOR</option>
                    <option value="DISTRICT_COORDINATOR">DISTRICT_COORDINATOR</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  </select>
                  <button type="submit" className="ihqa-btn-blue h-10 cursor-pointer">
                    + Add Staff
                  </button>
                </form>

                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-[#1c1c1c]">Recent Audit Trail</h3>
                  <div className="max-h-72 overflow-y-auto divide-y divide-[#e2dddb] border border-[#e2dddb] rounded-[10px] px-4 text-xs">
                    {rolesData.auditLogs.map((log: any) => (
                      <div key={log.id} className="py-2.5 flex justify-between gap-4">
                        <div>
                          <span className="font-bold text-[#034ea2]">{log.action}</span>{" "}
                          <span className="text-[#555963]">
                            by {log.actor_name} ({log.actor_role}) on {log.entity_type} #
                            {log.entity_id}
                          </span>
                        </div>
                        <span className="text-[#555963] shrink-0">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <BrandFooter />
    </div>
  );
}

function KpiCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="bg-white border border-[#e2dddb] rounded-[12px] p-4 space-y-1">
      <div className="text-xs font-semibold text-[#555963]">{label}</div>
      <div className="text-2xl font-bold" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}
