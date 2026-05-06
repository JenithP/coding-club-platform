"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import GrowthChart from "@/components/GrowthChart";

function formatDate(ts) {
  if (!ts) return "";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function DashboardInner() {
  const { user, profile } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const aSnap = await getDocs(query(collection(db, "assignments"), orderBy("createdAt", "desc")));
        setAssignments(aSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        const sSnap = await getDocs(
          query(collection(db, "submissions"), where("uid", "==", user.uid))
        );
        setSubmissions(sSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const bestByAssignment = useMemo(() => {
    const map = new Map();
    for (const s of submissions) {
      const prev = map.get(s.assignmentId);
      if (!prev || (s.score ?? 0) > (prev.score ?? 0)) map.set(s.assignmentId, s);
    }
    return map;
  }, [submissions]);

  const totalScore = useMemo(
    () => Array.from(bestByAssignment.values()).reduce((sum, s) => sum + (s.score ?? 0), 0),
    [bestByAssignment]
  );

  const chartData = useMemo(() => {
    const sorted = [...submissions]
      .filter((s) => s.submittedAt)
      .sort((a, b) => {
        const ad = a.submittedAt?.toDate?.() ?? new Date(a.submittedAt);
        const bd = b.submittedAt?.toDate?.() ?? new Date(b.submittedAt);
        return ad - bd;
      });
    return sorted.map((s) => ({
      label: formatDate(s.submittedAt),
      score: s.score ?? 0,
    }));
  }, [submissions]);

  const completedCount = bestByAssignment.size;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{profile?.name ?? "학생"}님, 환영합니다 👋</h1>
          <p className="text-sm text-gray-500">
            {profile?.department} · {profile?.studentId}
          </p>
        </div>
        <Link href="/assignments" className="btn-primary">과제 보러 가기</Link>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="총 점수" value={`${totalScore}점`} />
        <Stat label="완료한 과제" value={`${completedCount} / ${assignments.length}`} />
        <Stat label="제출 횟수" value={`${submissions.length}회`} />
      </section>

      <section className="card">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">성장 그래프</h2>
          <span className="text-xs text-gray-500">제출일 기준 점수</span>
        </div>
        <GrowthChart data={chartData} />
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold">과제 진행 현황</h2>
        {loading ? (
          <p className="mt-4 text-sm text-gray-500">불러오는 중...</p>
        ) : assignments.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">등록된 과제가 없습니다.</p>
        ) : (
          <ul className="mt-4 divide-y divide-gray-100">
            {assignments.map((a) => {
              const best = bestByAssignment.get(a.id);
              return (
                <li key={a.id} className="flex items-center justify-between py-3">
                  <div>
                    <Link href={`/assignments/${a.id}`} className="font-medium hover:underline">
                      {a.title}
                    </Link>
                    <p className="text-xs text-gray-500">
                      {a.type === "puzzle" ? "퍼즐" : a.type === "github" ? "GitHub 제출" : "코드 실행"}
                      {a.dueAt && ` · 마감 ${formatDate(a.dueAt)}`}
                    </p>
                  </div>
                  <div className="text-right">
                    {best ? (
                      <span className="badge bg-green-100 text-green-700">{best.score}점</span>
                    ) : (
                      <span className="badge bg-gray-100 text-gray-600">미제출</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardInner />
    </ProtectedRoute>
  );
}
