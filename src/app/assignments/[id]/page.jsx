"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import PuzzleEditor from "@/components/PuzzleEditor";
import PyodideRunner from "@/components/PyodideRunner";

const GITHUB_RE = /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+\/?$/i;

function AssignmentDetailInner() {
  const { id } = useParams();
  const router = useRouter();
  const { user, profile } = useAuth();
  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  // free code editor state
  const [freeCode, setFreeCode] = useState("");
  const [freeRunResult, setFreeRunResult] = useState(null);

  // github state
  const [repoUrl, setRepoUrl] = useState("");
  const [repoNote, setRepoNote] = useState("");

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      const snap = await getDoc(doc(db, "assignments", id));
      if (!snap.exists()) {
        setLoading(false);
        return;
      }
      const a = { id: snap.id, ...snap.data() };
      setAssignment(a);
      if (a.type === "code" && a.starterCode) setFreeCode(a.starterCode);

      const subSnap = await getDocs(
        query(
          collection(db, "submissions"),
          where("uid", "==", user.uid),
          where("assignmentId", "==", id),
          orderBy("submittedAt", "desc")
        )
      );
      setSubmissions(subSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    })();
  }, [id, user]);

  const persistSubmission = async (payload) => {
    setSubmitting(true);
    setMessage(null);
    try {
      const previousBest = submissions.reduce(
        (m, s) => Math.max(m, s.score ?? 0),
        0
      );
      const ref = await addDoc(collection(db, "submissions"), {
        uid: user.uid,
        studentId: profile?.studentId ?? null,
        name: profile?.name ?? null,
        assignmentId: id,
        assignmentTitle: assignment?.title ?? null,
        type: assignment?.type ?? "puzzle",
        submittedAt: serverTimestamp(),
        ...payload,
      });
      const score = payload.score ?? 0;
      const delta = Math.max(0, score - previousBest);
      if (delta > 0) {
        await updateDoc(doc(db, "users", user.uid), { totalScore: increment(delta) });
      }
      setSubmissions((cur) => [
        { id: ref.id, ...payload, submittedAt: { toDate: () => new Date() } },
        ...cur,
      ]);
      setMessage({ kind: "success", text: `제출 완료! 점수: ${score}점` });
    } catch (e) {
      setMessage({ kind: "error", text: `제출 실패: ${e?.message ?? e}` });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-500">불러오는 중...</p>;
  if (!assignment)
    return (
      <div className="card text-sm text-gray-500">
        과제를 찾을 수 없습니다.{" "}
        <button onClick={() => router.back()} className="ml-2 underline">뒤로</button>
      </div>
    );

  const max = assignment.maxScore ?? 100;
  const bestScore = submissions.reduce((m, s) => Math.max(m, s.score ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{assignment.title}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {assignment.type === "puzzle" ? "퍼즐" : assignment.type === "github" ? "GitHub 제출" : "코드 실행"}
              {" · "}최대 {max}점
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">내 최고 점수</p>
            <p className="text-2xl font-bold">{bestScore}점</p>
          </div>
        </div>
        {assignment.description && (
          <p className="mt-4 whitespace-pre-line text-sm text-gray-700">{assignment.description}</p>
        )}
      </div>

      {message && (
        <div
          className={`rounded-md px-3 py-2 text-sm ring-1 ${
            message.kind === "success"
              ? "bg-green-50 text-green-700 ring-green-200"
              : "bg-red-50 text-red-700 ring-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="card">
        {assignment.type === "puzzle" && (
          <PuzzleEditor
            puzzle={{
              puzzleType: assignment.puzzleType ?? "blank",
              template: assignment.template,
              blanks: assignment.blanks,
              snippets: assignment.snippets,
              correctOrder: assignment.correctOrder,
              expectedOutput: assignment.expectedOutput,
              testSuffix: assignment.testSuffix,
              maxScore: max,
            }}
            onSubmit={(r) => persistSubmission({ ...r, type: "puzzle" })}
          />
        )}

        {assignment.type === "code" && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              아래 에디터에 코드를 작성하고 실행해보세요. 기대 출력과 일치하면 만점입니다.
            </p>
            <textarea
              value={freeCode}
              onChange={(e) => setFreeCode(e.target.value)}
              spellCheck={false}
              className="block w-full rounded-lg bg-slate-900 p-3 font-mono text-sm text-slate-100 outline-none ring-1 ring-slate-700 focus:ring-brand-500"
              rows={12}
            />
            <PyodideRunner
              code={freeCode + (assignment.testSuffix ? "\n" + assignment.testSuffix : "")}
              onResult={(r) => setFreeRunResult(r)}
              buttonLabel="실행"
            />
            <button
              className="btn-primary"
              disabled={!freeRunResult || submitting}
              onClick={() => {
                let score = 0;
                const ok = !freeRunResult.error;
                if (assignment.expectedOutput != null) {
                  if (ok && freeRunResult.stdout?.trim() === String(assignment.expectedOutput).trim()) {
                    score = max;
                  } else if (ok) score = Math.round(max * 0.5);
                } else if (ok) {
                  score = max;
                }
                persistSubmission({
                  type: "code",
                  code: freeCode,
                  stdout: freeRunResult.stdout ?? "",
                  error: freeRunResult.error ?? null,
                  score,
                });
              }}
            >
              결과로 제출하기
            </button>
          </div>
        )}

        {assignment.type === "github" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!GITHUB_RE.test(repoUrl.trim())) {
                setMessage({ kind: "error", text: "올바른 GitHub 저장소 URL을 입력해주세요." });
                return;
              }
              persistSubmission({
                type: "github",
                repoUrl: repoUrl.trim(),
                note: repoNote.trim(),
                score: 0, // 운영진 채점 후 갱신
                pendingReview: true,
              });
            }}
            className="space-y-4"
          >
            <p className="text-xs text-gray-500">
              완성한 프로젝트의 GitHub 저장소 URL을 제출하세요. 운영진이 확인 후 점수를 부여합니다.
            </p>
            <div>
              <label className="label">저장소 URL</label>
              <input
                className="input"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/yourname/repo"
                required
              />
            </div>
            <div>
              <label className="label">메모 (선택)</label>
              <textarea
                className="input"
                value={repoNote}
                onChange={(e) => setRepoNote(e.target.value)}
                rows={3}
                placeholder="구현한 내용이나 참고할 점을 적어주세요."
              />
            </div>
            <button className="btn-primary" disabled={submitting}>
              {submitting ? "제출 중..." : "GitHub URL 제출"}
            </button>
          </form>
        )}
      </div>

      <section className="card">
        <h2 className="text-lg font-semibold">내 제출 기록</h2>
        {submissions.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">아직 제출 기록이 없습니다.</p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-100">
            {submissions.map((s) => {
              const d = s.submittedAt?.toDate?.() ?? new Date();
              return (
                <li key={s.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium">{s.score ?? 0}점</p>
                    <p className="text-xs text-gray-500">
                      {d.toLocaleString("ko-KR")}{" "}
                      {s.repoUrl && (
                        <a href={s.repoUrl} target="_blank" rel="noreferrer" className="ml-1 text-brand-700 underline">
                          {s.repoUrl}
                        </a>
                      )}
                    </p>
                  </div>
                  {s.pendingReview && (
                    <span className="badge bg-amber-100 text-amber-700">검토 대기</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function AssignmentDetailPage() {
  return (
    <ProtectedRoute>
      <AssignmentDetailInner />
    </ProtectedRoute>
  );
}
