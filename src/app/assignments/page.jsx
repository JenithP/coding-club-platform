"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ProtectedRoute from "@/components/ProtectedRoute";

function typeBadge(type) {
  const map = {
    puzzle: ["퍼즐", "bg-indigo-100 text-indigo-700"],
    code: ["코드 실행", "bg-emerald-100 text-emerald-700"],
    github: ["GitHub 제출", "bg-amber-100 text-amber-700"],
  };
  const [label, cls] = map[type] ?? ["기타", "bg-gray-100 text-gray-700"];
  return <span className={`badge ${cls}`}>{label}</span>;
}

function AssignmentsInner() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const snap = await getDocs(
        query(collection(db, "assignments"), orderBy("createdAt", "desc"))
      );
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">과제 목록</h1>
      {loading ? (
        <p className="text-sm text-gray-500">불러오는 중...</p>
      ) : items.length === 0 ? (
        <div className="card text-sm text-gray-500">아직 등록된 과제가 없습니다.</div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((a) => (
            <li key={a.id}>
              <Link
                href={`/assignments/${a.id}`}
                className="card block transition hover:ring-brand-300 hover:shadow"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{a.title}</h3>
                  {typeBadge(a.type)}
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-gray-600">{a.description}</p>
                <p className="mt-3 text-xs text-gray-400">
                  최대 {a.maxScore ?? 100}점
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AssignmentsPage() {
  return (
    <ProtectedRoute>
      <AssignmentsInner />
    </ProtectedRoute>
  );
}
