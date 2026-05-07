"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

function typeBadge(a) {
  if (a.type === "html" || a.worksheetUrl) return ["워크시트", "bg-lavender-100 text-lavender-700"];
  if (a.worksheet) return ["워크시트", "bg-lavender-100 text-lavender-700"];
  const map = {
    puzzle: ["퍼즐", "bg-lavender-100 text-lavender-700"],
    code: ["코드 실행", "bg-mint-100 text-mint-500"],
    github: ["GitHub 제출", "bg-amber-50 text-amber-800"],
  };
  return map[a.type] ?? ["기타", "bg-sand-200 text-ink"];
}

export default function AssignmentsList({ onSelect }) {
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
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">과제 목록</h1>
        <p className="text-xs text-ink-soft">
          관리자가 등록한 워크시트와 과제를 풀어보세요.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-ink-soft">불러오는 중...</p>
      ) : items.length === 0 ? (
        <div className="card text-sm text-ink-soft">아직 등록된 과제가 없습니다.</div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((a) => {
            const [label, cls] = typeBadge(a);
            const card = (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{a.title}</h3>
                  <span className={`badge ${cls}`}>{label}</span>
                </div>
                {a.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-ink-soft">
                    {a.description}
                  </p>
                )}
                <p className="mt-3 text-xs text-ink-soft">
                  최대 {a.maxScore ?? 100}점
                </p>
              </>
            );
            return (
              <li key={a.id}>
                {onSelect ? (
                  <button
                    type="button"
                    onClick={() => onSelect(a.id)}
                    className="card block w-full text-left transition hover:-translate-y-0.5 hover:ring-lavender-300"
                  >
                    {card}
                  </button>
                ) : (
                  <Link
                    href={`/assignments/${a.id}`}
                    className="card block transition hover:-translate-y-0.5 hover:ring-lavender-300"
                  >
                    {card}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
