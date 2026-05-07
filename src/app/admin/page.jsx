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
import { transformWorksheet } from "@/lib/worksheetTransformer";
import ProtectedRoute from "@/components/ProtectedRoute";
import AssignmentsList from "@/components/AssignmentsList";
import AssignmentDetail from "@/components/AssignmentDetail";

const TABS = [
  { id: "create", label: "과제 등록" },
  { id: "list", label: "과제 관리" },
  { id: "students", label: "학생 현황" },
  { id: "review", label: "GitHub 채점" },
];

function AdminInner() {
  const [tab, setTab] = useState("create");
  const [studentMode, setStudentMode] = useState(false);
  const [studentSelectedId, setStudentSelectedId] = useState(null);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">관리자 패널</h1>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white/85 px-3 py-1.5 text-sm shadow-soft ring-1 ring-sand-300/70">
          <input
            type="checkbox"
            checked={studentMode}
            onChange={(e) => {
              setStudentMode(e.target.checked);
              setStudentSelectedId(null);
            }}
            className="h-4 w-4 accent-lavender-500"
          />
          <span className={studentMode ? "font-semibold text-lavender-600" : "text-ink-soft"}>
            학생 모드로 보기
          </span>
        </label>
      </div>

      {studentMode ? (
        <div className="rounded-2xl border border-dashed border-lavender-300 bg-lavender-100/30 p-4">
          <p className="mb-4 text-xs text-lavender-700">
            학생 화면을 미리 보고 있습니다. 제출하면 실제 기록으로 저장됩니다.
          </p>
          {studentSelectedId ? (
            <AssignmentDetail
              id={studentSelectedId}
              onBack={() => setStudentSelectedId(null)}
            />
          ) : (
            <AssignmentsList onSelect={(id) => setStudentSelectedId(id)} />
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 border-b border-sand-300/70">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`-mb-px border-b-2 px-3 py-2 text-sm transition ${
                  tab === t.id
                    ? "border-lavender-500 font-semibold text-lavender-600"
                    : "border-transparent text-ink-soft hover:text-ink"
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
        </>
      )}
    </div>
  );
}

// ----------------- Create -----------------
function CreateAssignment() {
  const [type, setType] = useState("html");
  const [puzzleType, setPuzzleType] = useState("blank");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [maxScore, setMaxScore] = useState(100);
  const [htmlFile, setHtmlFile] = useState(null);
  const [htmlPreview, setHtmlPreview] = useState(null); // { html, meta, byteSize, error }
  const [template, setTemplate] = useState(
    "def add(a, b):\n    return ___ + ___\n\nprint(add(2, 3))"
  );
  const [blanks, setBlanks] = useState("a, b");
  const [snippets, setSnippets] = useState(
    "def f():\n---\n    return 42\n---\nprint(f())"
  );
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
      if (type === "html") {
        if (!htmlFile) throw new Error("HTML 파일을 선택해주세요.");
        if (!htmlPreview || htmlPreview.error)
          throw new Error(htmlPreview?.error ?? "워크시트 분석에 실패했습니다.");
        if (htmlPreview.byteSize > 900_000) {
          throw new Error(
            `변환된 HTML이 너무 큽니다 (${(htmlPreview.byteSize / 1024).toFixed(0)} KB). Firestore 도큐먼트 한도(약 900KB) 이하로 줄여주세요.`
          );
        }
        payload.worksheetHtml = htmlPreview.html;
        payload.worksheetFileName = htmlFile.name;
        payload.worksheetByteSize = htmlPreview.byteSize;
        payload.worksheetMeta = htmlPreview.meta;
        if (!payload.title && htmlPreview.meta.title) {
          payload.title = htmlPreview.meta.title;
        }
      } else if (type === "puzzle") {
        payload.puzzleType = puzzleType;
        if (puzzleType === "blank") {
          payload.template = template;
          payload.blanks = blanks
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        } else {
          payload.snippets = snippets.split("\n---\n");
          payload.correctOrder = correctOrder.split(",").map((s) => Number(s.trim()));
        }
      } else if (type === "code") {
        payload.starterCode = starterCode;
      }
      await addDoc(collection(db, "assignments"), payload);
      setMsg({ kind: "success", text: "과제가 등록되었습니다." });
      setTitle("");
      setDescription("");
      setHtmlFile(null);
      setHtmlPreview(null);
    } catch (e) {
      setMsg({ kind: "error", text: `등록 실패: ${e?.message ?? e}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="card space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">유형</label>
            <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="html">HTML 워크시트 업로드</option>
              <option value="puzzle">퍼즐</option>
              <option value="code">코드 실행 (자유)</option>
              <option value="github">GitHub 제출</option>
            </select>
          </div>
          <div>
            <label className="label">최대 점수</label>
            <input
              className="input"
              type="number"
              min={1}
              max={1000}
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label">제목</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <label className="label">설명</label>
          <textarea
            className="input"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {type === "html" && (
          <>
            <div>
              <label className="label">워크시트 HTML 파일</label>
              <input
                type="file"
                accept=".html,text/html"
                onChange={async (e) => {
                  const f = e.target.files?.[0] ?? null;
                  setHtmlFile(f);
                  setHtmlPreview(null);
                  if (!f) return;
                  try {
                    const raw = await f.text();
                    const { html, meta } = transformWorksheet(raw);
                    const byteSize = new Blob([html]).size;
                    setHtmlPreview({ html, meta, byteSize, error: null });
                    if (!title && meta.title) setTitle(meta.title);
                  } catch (err) {
                    setHtmlPreview({ error: err?.message ?? String(err) });
                  }
                }}
                className="block w-full rounded-xl border border-sand-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-lavender-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-lavender-700 hover:file:bg-lavender-200"
                required
              />
              {htmlFile && (
                <p className="mt-1 text-xs text-ink-soft">
                  원본: <span className="font-mono">{htmlFile.name}</span> (
                  {(htmlFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
              {htmlPreview?.error && (
                <p className="mt-1 text-xs text-peach-500">분석 실패: {htmlPreview.error}</p>
              )}
              {htmlPreview && !htmlPreview.error && (
                <div className="mt-2 rounded-xl bg-mint-100/40 px-3 py-2 text-xs text-mint-500 ring-1 ring-mint-300">
                  <p className="font-semibold">자동 분해 결과</p>
                  <ul className="mt-1 space-y-0.5 text-ink-soft">
                    <li>
                      감지된 제목:{" "}
                      <span className="font-medium text-ink">
                        {htmlPreview.meta.title || "(없음)"}
                      </span>
                    </li>
                    <li>채점 빈칸 (data-answer): {htmlPreview.meta.blanksCount}개</li>
                    <li>자유 작성란 (textarea): {htmlPreview.meta.textareasCount}개</li>
                    <li>
                      변환 후 크기: {(htmlPreview.byteSize / 1024).toFixed(1)} KB
                      {htmlPreview.byteSize > 900_000 && (
                        <span className="ml-1 text-peach-500">— 한도 초과</span>
                      )}
                    </li>
                  </ul>
                  <p className="mt-1 text-[11px] text-ink-soft">
                    이름/학번/학과 영역과 인쇄 버튼은 자동 제거되고, 하단에 제출 버튼이 주입됩니다.
                  </p>
                </div>
              )}
            </div>
            <details className="rounded-xl bg-cream-100/70 p-3 text-xs text-ink-soft">
              <summary className="cursor-pointer font-medium">
                HTML 워크시트 작성 가이드
              </summary>
              <div className="mt-2 space-y-2">
                <p>
                  업로드 시 자동으로 다음이 처리됩니다:
                </p>
                <ul className="list-disc pl-4">
                  <li>이름/학번/학과 등 학생 정보 입력란 제거 (<code>.info-row</code>, label 텍스트 매칭)</li>
                  <li>인쇄/PDF 저장 버튼 제거 (<code>onclick=&quot;window.print()&quot;</code> 또는 텍스트 매칭)</li>
                  <li>하단에 sticky 제출 버튼 + postMessage 스크립트 주입</li>
                  <li>
                    <code>[data-strip=&quot;true&quot;]</code> 마킹된 요소도 제거
                  </li>
                </ul>
                <p className="pt-1 font-medium text-ink">자동 채점 규칙</p>
                <ul className="list-disc pl-4">
                  <li>
                    <code>data-answer=&quot;정답&quot;</code> 속성을 가진 요소의 <code>textContent</code>가 정답과 같으면 정답 처리
                  </li>
                  <li><code>textarea</code>는 빈칸이 아니면 작성 완료로 카운트</li>
                  <li>
                    기본 점수 = 퍼즐 80점(맞춘 비율) + 작성란 20점(채운 비율) → 0~100
                  </li>
                </ul>
                <p className="pt-1 font-medium text-ink">직접 채점하고 싶다면</p>
                <pre className="overflow-x-auto rounded-lg bg-[#1a1a2e] p-3 font-mono text-[11px] leading-relaxed text-slate-100">
{`<script>
  window.__worksheetScore = function () {
    return {
      score: 87,            // 0 ~ 100
      answers: { ... },
      meta:    { ... }
    };
  };
</script>`}
                </pre>
                <p>
                  HTML은 Firestore 도큐먼트에 텍스트로 저장됩니다. 변환 후 약 900KB 이하 권장.
                </p>
              </div>
            </details>
          </>
        )}

        {type === "puzzle" && (
          <>
            <div>
              <label className="label">퍼즐 유형</label>
              <select
                className="input"
                value={puzzleType}
                onChange={(e) => setPuzzleType(e.target.value)}
              >
                <option value="blank">빈칸 채우기</option>
                <option value="dragdrop">드래그앤드롭</option>
              </select>
            </div>
            {puzzleType === "blank" ? (
              <>
                <div>
                  <label className="label">코드 템플릿 (빈칸은 ___)</label>
                  <textarea
                    className="input font-mono text-xs"
                    rows={8}
                    value={template}
                    onChange={(e) => setTemplate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">정답 (콤마로 구분, 빈칸 순서대로)</label>
                  <input
                    className="input font-mono"
                    value={blanks}
                    onChange={(e) => setBlanks(e.target.value)}
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="label">
                    코드 조각 (각 조각을 한 줄의 <span className="font-mono">---</span>로 구분)
                  </label>
                  <textarea
                    className="input font-mono text-xs"
                    rows={10}
                    value={snippets}
                    onChange={(e) => setSnippets(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">정답 순서 (조각 인덱스, 콤마 구분)</label>
                  <input
                    className="input font-mono"
                    value={correctOrder}
                    onChange={(e) => setCorrectOrder(e.target.value)}
                    placeholder="0,1,2,3"
                  />
                </div>
              </>
            )}
          </>
        )}

        {type === "code" && (
          <div>
            <label className="label">시작 코드</label>
            <textarea
              className="input font-mono text-xs"
              rows={8}
              value={starterCode}
              onChange={(e) => setStarterCode(e.target.value)}
            />
          </div>
        )}

        {(type === "puzzle" || type === "code") && (
          <>
            <div>
              <label className="label">기대 출력 (선택)</label>
              <input
                className="input font-mono"
                value={expectedOutput}
                onChange={(e) => setExpectedOutput(e.target.value)}
                placeholder="5"
              />
            </div>
            <div>
              <label className="label">테스트 코드 (선택, 실행 시 뒤에 추가됨)</label>
              <textarea
                className="input font-mono text-xs"
                rows={3}
                value={testSuffix}
                onChange={(e) => setTestSuffix(e.target.value)}
                placeholder="assert add(2,3) == 5"
              />
            </div>
          </>
        )}

        {msg && (
          <div
            className={`rounded-xl px-3 py-2 text-sm ring-1 ${
              msg.kind === "success"
                ? "bg-mint-100 text-mint-500 ring-mint-300"
                : "bg-peach-100 text-peach-500 ring-peach-300"
            }`}
          >
            {msg.text}
          </div>
        )}

        <button className="btn-primary" disabled={saving}>
          {saving ? "저장 중..." : "과제 등록"}
        </button>
      </form>
    </div>
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
  useEffect(() => {
    refresh();
  }, []);

  const remove = async (a) => {
    if (!confirm("정말 삭제하시겠습니까? 관련 제출 기록은 유지됩니다.")) return;
    await deleteDoc(doc(db, "assignments", a.id));
    refresh();
  };

  const typeLabel = (a) => {
    if (a.type === "html" || a.worksheetHtml || a.worksheetUrl) return "HTML 워크시트";
    if (a.worksheet) return "워크시트(legacy)";
    return a.type;
  };

  if (loading) return <p className="text-sm text-ink-soft">불러오는 중...</p>;
  if (items.length === 0)
    return <div className="card text-sm text-ink-soft">등록된 과제가 없습니다.</div>;

  return (
    <ul className="divide-y divide-sand-300/70 rounded-2xl bg-white/85 shadow-soft ring-1 ring-sand-300/70">
      {items.map((a) => (
        <li key={a.id} className="flex items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="font-semibold">{a.title}</p>
            <p className="text-xs text-ink-soft">
              {typeLabel(a)}
              {a.puzzleType && ` · ${a.puzzleType}`} · 최대 {a.maxScore ?? 100}점
            </p>
            {(a.worksheetHtml || a.worksheetUrl) && (
              <p className="mt-1 truncate text-xs text-ink-soft">
                {a.worksheetFileName ?? "HTML"}
                {a.worksheetByteSize ? ` · ${(a.worksheetByteSize / 1024).toFixed(1)} KB` : ""}
              </p>
            )}
          </div>
          <button onClick={() => remove(a)} className="btn-danger flex-shrink-0">
            삭제
          </button>
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

  if (loading) return <p className="text-sm text-ink-soft">불러오는 중...</p>;
  return (
    <div className="card overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="text-xs uppercase tracking-wide text-ink-soft">
          <tr>
            <th className="px-3 py-2 text-left">학번</th>
            <th className="px-3 py-2 text-left">이름</th>
            <th className="px-3 py-2 text-left">학과</th>
            <th className="px-3 py-2 text-left">전화번호</th>
            <th className="px-3 py-2 text-right">제출</th>
            <th className="px-3 py-2 text-right">총점</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-sand-300/70">
          {students.map((s) => (
            <tr key={s.id}>
              <td className="px-3 py-2 font-mono">{s.studentId}</td>
              <td className="px-3 py-2">{s.name}</td>
              <td className="px-3 py-2 text-ink-soft">{s.department}</td>
              <td className="px-3 py-2 text-ink-soft">{s.phone}</td>
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
      query(
        collection(db, "submissions"),
        where("type", "==", "github"),
        orderBy("submittedAt", "desc")
      )
    );
    setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };
  useEffect(() => {
    refresh();
  }, []);

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

  if (loading) return <p className="text-sm text-ink-soft">불러오는 중...</p>;
  if (items.length === 0)
    return <div className="card text-sm text-ink-soft">제출된 GitHub 과제가 없습니다.</div>;

  return (
    <ul className="space-y-3">
      {items.map((s) => {
        const d = s.submittedAt?.toDate?.();
        return (
          <li key={s.id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{s.assignmentTitle ?? s.assignmentId}</p>
                <p className="text-xs text-ink-soft">
                  {s.name} ({s.studentId}) · {d ? d.toLocaleString("ko-KR") : ""}
                </p>
                <a
                  href={s.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-sm text-lavender-500 underline"
                >
                  {s.repoUrl}
                </a>
                {s.note && (
                  <p className="mt-2 whitespace-pre-line text-sm text-ink-soft">{s.note}</p>
                )}
              </div>
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  grade(s, e.currentTarget.score.value);
                }}
              >
                <input
                  name="score"
                  defaultValue={s.score ?? 0}
                  type="number"
                  min={0}
                  max={1000}
                  className="input w-24 text-right"
                />
                <button className="btn-primary" disabled={scoring === s.id}>
                  채점 저장
                </button>
              </form>
            </div>
            <div className="mt-2">
              {s.pendingReview ? (
                <span className="badge bg-amber-50 text-amber-800">검토 대기</span>
              ) : (
                <span className="badge bg-mint-100 text-mint-500">{s.score ?? 0}점 부여됨</span>
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
