"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import PuzzleEditor from "@/components/PuzzleEditor";
import PyodideRunner from "@/components/PyodideRunner";

const GITHUB_RE = /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+\/?$/i;

export default function AssignmentDetail({ id, onBack }) {
  const { user, profile } = useAuth();
  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const [freeCode, setFreeCode] = useState("");
  const [freeRunResult, setFreeRunResult] = useState(null);

  const [repoUrl, setRepoUrl] = useState("");
  const [repoNote, setRepoNote] = useState("");

  useEffect(() => {
    if (!id || !user) return;
    setLoading(true);
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

  const bestScore = useMemo(
    () => submissions.reduce((m, s) => Math.max(m, s.score ?? 0), 0),
    [submissions]
  );

  const persist = async (payload) => {
    setSubmitting(true);
    setMessage(null);
    try {
      const ref = await addDoc(collection(db, "submissions"), {
        uid: user.uid,
        studentId: profile?.studentId ?? null,
        name: profile?.name ?? null,
        assignmentId: id,
        assignmentTitle: assignment?.title ?? null,
        type: payload.type ?? assignment?.type ?? "puzzle",
        submittedAt: serverTimestamp(),
        ...payload,
      });
      const score = payload.score ?? 0;
      const delta = Math.max(0, score - bestScore);
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

  if (loading) return <p className="text-sm text-ink-soft">불러오는 중...</p>;
  if (!assignment)
    return (
      <div className="card text-sm text-ink-soft">
        과제를 찾을 수 없습니다.
        {onBack && (
          <button onClick={onBack} className="ml-2 underline">
            뒤로
          </button>
        )}
      </div>
    );

  const max = assignment.maxScore ?? 100;
  const isHtmlWorksheet =
    assignment.type === "html" && (!!assignment.worksheetHtml || !!assignment.worksheetUrl);

  return (
    <div className="space-y-6">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-lavender-600 hover:underline"
        >
          ← 과제 목록으로
        </button>
      )}

      <Header assignment={assignment} max={max} bestScore={bestScore} />

      {message && <FlashMessage message={message} />}

      {isHtmlWorksheet && (
        <HtmlWorksheet
          html={assignment.worksheetHtml}
          url={assignment.worksheetUrl}
          maxScore={max}
          onSubmit={persist}
          submitting={submitting}
        />
      )}

      {!isHtmlWorksheet && assignment.type === "puzzle" && (
        <div className="card">
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
            onSubmit={(r) => persist({ ...r, type: "puzzle" })}
          />
        </div>
      )}

      {assignment.type === "code" && (
        <div className="card space-y-3">
          <p className="text-xs text-ink-soft">
            아래 에디터에 코드를 작성하고 실행해보세요. 기대 출력과 일치하면 만점입니다.
          </p>
          <textarea
            value={freeCode}
            onChange={(e) => setFreeCode(e.target.value)}
            spellCheck={false}
            rows={12}
            className="block w-full rounded-xl bg-[#1a1a2e] p-3 font-mono text-sm text-slate-100 outline-none ring-1 ring-slate-700 focus:ring-lavender-400"
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
              const ok = !freeRunResult.error;
              let score = 0;
              if (assignment.expectedOutput != null) {
                if (ok && freeRunResult.stdout?.trim() === String(assignment.expectedOutput).trim()) {
                  score = max;
                } else if (ok) score = Math.round(max * 0.5);
              } else if (ok) score = max;
              persist({
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
            persist({
              type: "github",
              repoUrl: repoUrl.trim(),
              note: repoNote.trim(),
              score: 0,
              pendingReview: true,
            });
          }}
          className="card space-y-4"
        >
          <p className="text-xs text-ink-soft">
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

      <SubmissionHistory submissions={submissions} />
    </div>
  );
}

function HtmlWorksheet({ html, url, maxScore, onSubmit, submitting }) {
  const iframeRef = useRef(null);
  const [lastPayload, setLastPayload] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      const data = e.data;
      if (!data || typeof data !== "object") return;
      if (data.type !== "worksheet:submit") return;
      if (iframeRef.current && e.source !== iframeRef.current.contentWindow) return;

      const rawScore = Number(data.score);
      const score = Number.isFinite(rawScore)
        ? Math.max(0, Math.min(maxScore, Math.round(rawScore)))
        : 0;
      const payload = {
        type: "html",
        score,
        answers: data.answers ?? null,
        meta: data.meta ?? null,
      };
      setLastPayload(payload);
      setStatus({ kind: "success", text: `워크시트에서 ${score}점이 전달되었습니다.` });
      onSubmit?.(payload);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [maxScore, onSubmit]);

  const resubmit = () => {
    if (lastPayload) onSubmit?.(lastPayload);
  };

  const iframeProps = html ? { srcDoc: html } : { src: url };

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-sand-300/70 bg-white shadow-soft">
        <iframe
          ref={iframeRef}
          {...iframeProps}
          title="worksheet"
          sandbox="allow-scripts allow-forms allow-popups"
          className="block h-[80vh] w-full border-0"
        />
      </div>
      {status && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ring-1 ${
            status.kind === "success"
              ? "bg-mint-100 text-mint-500 ring-mint-300"
              : "bg-peach-100 text-peach-500 ring-peach-300"
          }`}
        >
          {status.text}
        </div>
      )}
      <p className="text-xs text-ink-soft">
        워크시트에서 제출 버튼을 누르면 자동으로 점수가 저장됩니다.
        {lastPayload && (
          <button
            type="button"
            onClick={resubmit}
            disabled={submitting}
            className="ml-2 text-lavender-600 underline disabled:opacity-50"
          >
            마지막 결과 다시 저장
          </button>
        )}
      </p>
    </div>
  );
}

function Header({ assignment, max, bestScore }) {
  const labels = {
    puzzle: ["퍼즐", "bg-lavender-100 text-lavender-700"],
    code: ["코드 실행", "bg-mint-100 text-mint-500"],
    github: ["GitHub 제출", "bg-amber-50 text-amber-800"],
    html: ["워크시트", "bg-lavender-100 text-lavender-700"],
  };
  const [label, cls] = labels[assignment.type] ?? ["기타", "bg-sand-200 text-ink"];
  return (
    <div className="card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className={`badge ${cls}`}>{label}</span>
          <h1 className="mt-2 text-2xl font-bold leading-tight">{assignment.title}</h1>
          <p className="mt-1 text-xs text-ink-soft">최대 {max}점</p>
          {assignment.description && (
            <p className="mt-3 max-w-2xl whitespace-pre-line text-sm leading-relaxed text-ink-soft">
              {assignment.description}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-ink-soft">내 최고 점수</p>
          <p className="mt-1 text-3xl font-bold text-lavender-500">{bestScore}</p>
        </div>
      </div>
    </div>
  );
}

function FlashMessage({ message }) {
  return (
    <div
      className={`rounded-xl px-4 py-3 text-sm ring-1 ${
        message.kind === "success"
          ? "bg-mint-100 text-mint-500 ring-mint-300"
          : "bg-peach-100 text-peach-500 ring-peach-300"
      }`}
    >
      {message.text}
    </div>
  );
}

function SubmissionHistory({ submissions }) {
  return (
    <section className="card">
      <h2 className="text-sm font-bold">내 제출 기록</h2>
      {submissions.length === 0 ? (
        <p className="mt-3 text-xs text-ink-soft">아직 제출 기록이 없습니다.</p>
      ) : (
        <ul className="mt-3 divide-y divide-sand-300/70">
          {submissions.map((s) => {
            const d = s.submittedAt?.toDate?.() ?? new Date();
            return (
              <li key={s.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-semibold">{s.score ?? 0}점</p>
                  <p className="text-xs text-ink-soft">
                    {d.toLocaleString("ko-KR")}
                    {s.repoUrl && (
                      <a
                        href={s.repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-2 text-lavender-500 underline"
                      >
                        {s.repoUrl}
                      </a>
                    )}
                  </p>
                </div>
                {s.pendingReview && (
                  <span className="badge bg-amber-50 text-amber-800">검토 대기</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
