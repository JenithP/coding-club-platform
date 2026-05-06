"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

function maskName(name) {
  if (!name) return "익명";
  if (name.length <= 1) return name;
  return name[0] + "*".repeat(name.length - 1);
}

export default function LeaderboardPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "users"), orderBy("totalScore", "desc"), fbLimit(50))
        );
        setRows(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((u) => u.role !== "admin")
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">리더보드</h1>
        <p className="text-sm text-gray-500">총점 기준 상위 50명</p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">불러오는 중...</p>
      ) : rows.length === 0 ? (
        <div className="card text-sm text-gray-500">아직 랭킹 데이터가 없습니다.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">순위</th>
                <th className="px-3 py-2 text-left">이름</th>
                <th className="px-3 py-2 text-left">학과</th>
                <th className="px-3 py-2 text-right">총점</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((u, i) => (
                <tr key={u.id} className={i < 3 ? "bg-amber-50/40" : ""}>
                  <td className="px-3 py-2 font-bold">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </td>
                  <td className="px-3 py-2">{maskName(u.name)}</td>
                  <td className="px-3 py-2 text-gray-600">{u.department ?? "-"}</td>
                  <td className="px-3 py-2 text-right font-semibold">{u.totalScore ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
