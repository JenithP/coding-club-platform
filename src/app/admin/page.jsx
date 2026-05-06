"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import ProtectedRoute from "@/components/ProtectedRoute";

const TABS = [
  { id: "create", label: "과제 등록" },
  { id: "list", label: "과제 관리" },
  { id: "students", label: "학생 현황" },
  { id: "review", label: "GitHub 채점" },
];

function AdminInner() {
  const [tab, setTab] = useState("create");
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">관리자 패널</h1>
      <div className="flex flex-wrap gap-2 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
              tab === t.id
                ? "border-brand-600 font-semibold text-brand-700"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "create" && <CreateAssignment />}
      {tab === "list" && <AssignmentList />}
      {tab === "students" && <StudentList />}
      {tab === "review" && <GithubReview />}
    </div>
  );
}

// ----------------- Create -----------------
function CreateAssignment() {
  const [type, setType] = useState("puzzle");
  const [puzzleType, setPuzzleType] = useState("blank");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [maxScore, setMaxScore] = useState(100);
  const [template, setTemplate] = useState("def add(a, b):\n    return ___ + ___\n\nprint(add(2, 3))");
  const [blanks, setBlanks] = useState("a, b");
  const [snippets, setSnippets] = useState("def f():\n---\n    return 42\n---\nprint(f())");
  const [correctOrder, setCorrectOrder] = useState("0,1,2");
  const [expectedOutput, setExpectedOutput] = useState("");
  const [testSuffix, setTestSuffix] = useState("");
  const [starterCode, setStarterCode] = useState("# Write your code here\n");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const payload = {
        type,
        title: title.trim(),
        description: description.trim(),
        maxScore: Number(maxScore) || 100,
        expectedOutput: expectedOutput || null,
        testSuffix: testSuffix || null,
        createdAt: serverTimestamp(),
      };
      if (type === "puzzle") {
        payload.puzzleType = puzzleType;
        if (puzzleType === "blank") {
          payload.template = template;
          payload.blanks = blanks.split(",").map((s) => s.trim()).filter(Boolean);
        } else {
          payload.snippets = snippets.split("\n---\n").map((s) => s);
          payload.correctOrder = correctOrder.split(",").map((s) => Number(s.trim()));
        }
      } else if (type === "code") {
        payload.starterCode = starterCode;
      }
      await addDoc(collection(db, "assignments"), payload);
      setMsg({ kind: "success", text: "과제가 등록되었습니다." });
      setTitle("");
      setDescription("");
    } catch (e) {
      setMsg({ kind: "error", text: `등록 실패: ${e?.message ?? e}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="card space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">유형</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="puzzle">퍼즐</option>
            <option value="code">코드 실행 (자유)</option>
            <option value="github">GitHub 제출</option>
          </select>
        </div>
        <div>
          <label className="label">최대 점수</label>
          <input className="input" type="number" min={1} max={1000} value={maxScore}
            onChange={(e) => setMaxScore(e.target.value)} />
        </div>
      </div>

      <div>
        <label className="label">제목</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div>
        <label className="label">설명</label>
        <textarea className="input" rows={3} value={description}
          onChange={(e) => setDescription(e.target.value)} />
      </div>

      {type === "puzzle" && (
        <>
          <div>
            <label className="label">퍼즐 유형</label>
            <select className="input" value={puzzleType} onChange={(e) => setPuzzleType(e.target.value)}>
              <option value="blank">빈칸 채우기</option>
              <option value="dragdrop">드래그앤드롭</option>
            </select>
          </div>
          {puzzleType === "blank" ? (
            <>
              <div>
                <label className="label">코드 템플릿 (빈칸은 ___)</label>
                <textarea className="input font-mono text-xs" rows={8}
                  value={template} onChange={(e) => setTemplate(e.target.value)} />
              </div>
              <div>
                <label className="label">정답 (콤마로 구분, 빈칸 순서대로)</label>
                <input className="input font-mono" value={blanks}
                  onChange={(e) => setBlanks(e.target.value)} />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="label">코드 조각 (각 조각을 한 줄의 <span className="font-mono">---</span>로 구분)</label>
                <textarea className="input font-mono text-xs" rows={10}
                  value={snippets} onChange={(e) => setSnippets(e.target.value)} />
              </div>
              <div>
                <label className="label">정답 순서 (조각 인덱스, 콤마 구분)</label>
                <input className="input font-mono" value={correctOrder}
                  onChange={(e) => setCorrectOrder(e.target.value)} placeholder="0,1,2,3" />
              </div>
            </>
          )}
        </>
      )}

      {type === "code" && (
        <div>
          <label className="label">시작 코드</label>
          <textarea className="input font-mono text-xs" rows={8} value={starterCode}
            onChange={(e) => setStarterCode(e.target.value)} />
        </div>
      )}

      {type !== "github" && (
        <>
          <div>
            <label className="label">기대 출력 (선택)</label>
            <input className="input font-mono" value={expectedOutput}
              onChange={(e) => setExpectedOutput(e.target.value)} placeholder="5" />
          </div>
          <div>
            <label className="label">테스트 코드 (선택, 실행 시 뒤에 추가됨)</label>
            <textarea className="input font-mono text-xs" rows={3} value={testSuffix}
              onChange={(e) => setTestSuffix(e.target.value)} placeholder="assert add(2,3) == 5" />
          </div>
        </>
      )}

      {msg && (
        <div className={`rounded-md px-3 py-2 text-sm ring-1 ${
          msg.kind === "success" ? "bg-green-50 text-green-700 ring-green-200" : "bg-red-50 text-red-700 ring-red-200"
        }`}>{msg.text}</div>
      )}

      <button className="btn-primary" disabled={saving}>{saving ? "저장 중..." : "과제 등록"}</button>
    </form>
  );
}

// ----------------- List -----------------
function AssignmentList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const snap = await getDocs(query(collection(db, "assignments"), orderBy("createdAt", "desc")));
    setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };
  useEffect(() => { refresh(); }, []);

  const remove = async (id) => {
    if (!confirm("정말 삭제하시겠습니까? 관련 제출 기록은 유지됩니다.")) return;
    await deleteDoc(doc(db, "assignments", id));
    refresh();
  };

  if (loading) return <p className="text-sm text-gray-500">불러오는 중...</p>;
  if (items.length === 0) return <div className="card text-sm text-gray-500">등록된 과제가 없습니다.</div>;

  return (
    <ul className="divide-y divide-gray-100 rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
      {items.map((a) => (
        <li key={a.id} className="flex items-center justify-between p-4">
          <div>
            <p className="font-medium">{a.title}</p>
            <p className="text-xs text-gray-500">
              {a.type} {a.puzzleType && `· ${a.puzzleType}`} · 최대 {a.maxScore ?? 100}점
            </p>
          </div>
          <button onClick={() => remove(a.id)} className="btn-danger">삭제</button>
        </li>
      ))}
    </ul>
  );
}

// ----------------- Students -----------------
function StudentList() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const usersSnap = await getDocs(query(collection(db, "users"), orderBy("totalScore", "desc")));
      const users = usersSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((u) => u.role !== "admin");

      const subsSnap = await getDocs(collection(db, "submissions"));
      const counts = new Map();
      subsSnap.docs.forEach((d) => {
        const s = d.data();
        counts.set(s.uid, (counts.get(s.uid) ?? 0) + 1);
      });
      setStudents(users.map((u) => ({ ...u, submitCount: counts.get(u.uid) ?? 0 })));
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-sm text-gray-500">불러오는 중...</p>;
  return (
    <div className="card overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-3 py-2 text-left">학번</th>
            <th className="px-3 py-2 text-left">이름</th>
            <th className="px-3 py-2 text-left">학과</th>
            <th className="px-3 py-2 text-left">전화번호</th>
            <th className="px-3 py-2 text-right">제출</th>
            <th className="px-3 py-2 text-right">총점</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {students.map((s) => (
            <tr key={s.id}>
              <td className="px-3 py-2 font-mono">{s.studentId}</td>
              <td className="px-3 py-2">{s.name}</td>
              <td className="px-3 py-2 text-gray-600">{s.department}</td>
              <td className="px-3 py-2 text-gray-600">{s.phone}</td>
              <td className="px-3 py-2 text-right">{s.submitCount}회</td>
              <td className="px-3 py-2 text-right font-semibold">{s.totalScore ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ----------------- GitHub Review -----------------
function GithubReview() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(null);

  const refresh = async () => {
    const snap = await getDocs(
      query(collection(db, "submissions"), where("type", "==", "github"), orderBy("submittedAt", "desc"))
    );
    setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };
  useEffect(() => { refresh(); }, []);

  const grade = async (sub, score) => {
    const n = Number(score);
    if (Number.isNaN(n) || n < 0) return;
    setScoring(sub.id);
    try {
      const prev = sub.score ?? 0;
      await updateDoc(doc(db, "submissions", sub.id), {
        score: n,
        pendingReview: false,
        gradedAt: serverTimestamp(),
      });
      const delta = n - prev;
      if (delta !== 0 && sub.uid) {
        await updateDoc(doc(db, "users", sub.uid), { totalScore: increment(delta) });
      }
      await refresh();
    } finally {
      setScoring(null);
    }
  };

  if (loading) return <p className="text-sm text-gray-500">불러오는 중...</p>;
  if (items.length === 0) return <div className="card text-sm text-gray-500">제출된 GitHub 과제가 없습니다.</div>;

  return (
    <ul className="space-y-3">
      {items.map((s) => {
        const d = s.submittedAt?.toDate?.();
        return (
          <li key={s.id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">{s.assignmentTitle ?? s.assignmentId}</p>
                <p className="text-xs text-gray-500">
                  {s.name} ({s.studentId}) · {d ? d.toLocaleString("ko-KR") : ""}
                </p>
                <a href={s.repoUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm text-brand-700 underline">
                  {s.repoUrl}
                </a>
                {s.note && <p className="mt-2 whitespace-pre-line text-sm text-gray-600">{s.note}</p>}
              </div>
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  grade(s, e.currentTarget.score.value);
                }}
              >
                <input name="score" defaultValue={s.score ?? 0} type="number" min={0} max={1000}
                  className="input w-24 text-right" />
                <button className="btn-primary" disabled={scoring === s.id}>채점 저장</button>
              </form>
            </div>
            <div className="mt-2">
              {s.pendingReview ? (
                <span className="badge bg-amber-100 text-amber-700">검토 대기</span>
              ) : (
                <span className="badge bg-green-100 text-green-700">{s.score ?? 0}점 부여됨</span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function AdminPage() {
  return (
    <ProtectedRoute adminOnly>
      <AdminInner />
    </ProtectedRoute>
  );
}
