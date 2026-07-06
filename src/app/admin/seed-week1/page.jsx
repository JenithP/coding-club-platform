"use client";

import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ProtectedRoute from "@/components/ProtectedRoute";
import Link from "next/link";

const WEEK1 = {
  type: "multicode",
  title: "1주차 과제 — 혼자 짜보기",
  description:
    "드디어 처음부터 끝까지 혼자 만들어 볼 시간입니다. 아래 두 문제를 풀어 제출하세요. 막히면 1~9장을 다시 펼쳐 보세요. 정답을 보고 베끼는 것보다, 헤매면서 스스로 완성하는 한 줄이 열 배 더 남습니다.",
  maxScore: 100,
  problems: [
    {
      id: "p1",
      title: "과제 1. 분식집 주문 계산기 (필수)",
      required: true,
      maxScore: 60,
      description: `요구사항:
1) 김밥을 몇 줄 살지 입력받는다.
2) 라면을 몇 개 살지 입력받는다.
3) 김밥은 한 줄에 3,500원, 라면은 한 개에 4,000원이다.
4) 전체 금액을 계산해서 출력한다.

실행 예시 (이렇게 동작해야 합니다):
김밥 몇 줄? 2
라면 몇 개? 1
총 금액은 11000 원 입니다.

채점 기준:
입력 2, 1 → 출력에 11000 이 포함되면 정답.
input을 int로 감쌌는지, 가격을 변수로 두었는지도 함께 봅니다.`,
      starterCode: `# 과제 1: 분식집 주문 계산기

김밥_수 = int(input("김밥 몇 줄? "))
라면_수 = int(input("라면 몇 개? "))

김밥_가격 = 3500
라면_가격 = 4000

총금액 = 김밥_수 * 김밥_가격 + 라면_수 * 라면_가격
print(f"총 금액은 {총금액} 원 입니다.")`,
      testCases: [
        {
          stdin: "2\n1\n",
          expectedContains: "11000",
        },
      ],
    },
    {
      id: "p2",
      title: "과제 2. 나의 BMI 계산기 (도전)",
      required: false,
      maxScore: 40,
      description: `조금 더 도전해보고 싶은 사람을 위한 문제입니다.
키와 몸무게를 입력받아 BMI(체질량지수)를 계산합니다.

BMI 공식: 몸무게(kg) ÷ (키(m) × 키(m))
※ 키는 미터 단위입니다. 170cm는 1.7m.

요구사항:
1) 키를 cm 단위로 입력받는다 (예: 170).
2) 몸무게를 kg 단위로 입력받는다 (예: 65).
3) 입력받은 키를 미터로 바꾼다 (cm ÷ 100).
4) BMI를 계산해서 출력한다.

실행 예시:
키(cm): 170
몸무게(kg): 65
당신의 BMI는 22.49 입니다.

힌트:
키와 몸무게는 소수점이 있을 수 있으니 float로 받으세요.
height_m = height_cm / 100`,
      starterCode: `# 과제 2: BMI 계산기

height_cm = float(input("키(cm): "))
weight = float(input("몸무게(kg): "))

height_m = height_cm / 100
bmi = weight / (height_m * height_m)

print(f"당신의 BMI는 {bmi:.2f} 입니다.")`,
      testCases: [
        {
          stdin: "170\n65\n",
          expectedContains: "22.4",
        },
      ],
    },
  ],
};

export default function SeedWeek1Page() {
  const [status, setStatus] = useState("idle"); // idle | creating | done | error
  const [docId, setDocId] = useState(null);
  const [errMsg, setErrMsg] = useState("");

  const create = async () => {
    setStatus("creating");
    try {
      const ref = await addDoc(collection(db, "assignments"), {
        ...WEEK1,
        createdAt: serverTimestamp(),
      });
      setDocId(ref.id);
      setStatus("done");
    } catch (e) {
      setErrMsg(e?.message ?? String(e));
      setStatus("error");
    }
  };

  return (
    <ProtectedRoute adminOnly>
      <main className="mx-auto max-w-2xl px-4 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">1주차 과제 등록</h1>
          <p className="text-sm text-ink-soft mt-1">
            아래 내용으로 과제를 Firestore에 등록합니다. 한 번만 실행하세요.
          </p>
        </div>

        <div className="card space-y-2 text-sm">
          <p>
            <span className="font-semibold">제목:</span> {WEEK1.title}
          </p>
          <p>
            <span className="font-semibold">최대 점수:</span> {WEEK1.maxScore}점
          </p>
          <p>
            <span className="font-semibold">문제 수:</span> {WEEK1.problems.length}개
          </p>
          {WEEK1.problems.map((p) => (
            <div key={p.id} className="rounded-xl bg-sand-100 px-3 py-2">
              <p className="font-semibold">{p.title}</p>
              <p className="text-xs text-ink-soft">
                {p.maxScore}점 · 테스트 입력:{" "}
                <code className="font-mono">
                  {p.testCases?.[0]?.stdin?.replace(/\n/g, " / ")}
                </code>{" "}
                → 출력에{" "}
                <code className="font-mono">{p.testCases?.[0]?.expectedContains}</code> 포함
              </p>
            </div>
          ))}
        </div>

        {status === "idle" && (
          <button className="btn-primary" onClick={create}>
            과제 등록하기
          </button>
        )}

        {status === "creating" && (
          <p className="text-sm text-ink-soft">등록 중...</p>
        )}

        {status === "done" && (
          <div className="rounded-xl bg-mint-100 px-4 py-3 text-sm text-mint-500 ring-1 ring-mint-300 space-y-2">
            <p className="font-semibold">✅ 등록 완료!</p>
            <p>
              과제 ID:{" "}
              <code className="font-mono text-xs">{docId}</code>
            </p>
            <Link href="/assignments" className="block text-lavender-600 underline">
              과제 목록으로 이동 →
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="rounded-xl bg-peach-100 px-4 py-3 text-sm text-peach-500 ring-1 ring-peach-300">
            <p className="font-semibold">❌ 오류 발생</p>
            <p className="text-xs mt-1 break-all">{errMsg}</p>
          </div>
        )}

        <Link href="/admin" className="block text-sm text-lavender-600 hover:underline">
          ← 관리자 패널로 돌아가기
        </Link>
      </main>
    </ProtectedRoute>
  );
}
