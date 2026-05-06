import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-12">
      <section className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-900 p-10 text-white shadow-lg">
        <p className="text-sm uppercase tracking-widest text-brand-100/80">Exception Coding Club</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-bold">
          코딩으로 사고력을 단단하게.
        </h1>
        <p className="mt-3 max-w-2xl text-brand-50/90">
          퍼즐로 배우고, 브라우저에서 바로 실행하고, GitHub로 제출하세요.
          학회의 모든 과제와 성장 기록이 한 곳에 모입니다.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/signup" className="btn bg-white text-brand-700 hover:bg-brand-50">
            지금 시작하기
          </Link>
          <Link href="/leaderboard" className="btn ring-1 ring-white/40 text-white hover:bg-white/10">
            리더보드 보기
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            t: "퍼즐 에디터",
            d: "빈칸 채우기와 드래그앤드롭으로 함수를 조립하며 문법을 익혀요.",
          },
          {
            t: "Pyodide 실행",
            d: "설치 없이 브라우저에서 바로 Python 코드를 실행하고 채점합니다.",
          },
          {
            t: "GitHub 제출",
            d: "큰 프로젝트는 GitHub 저장소 URL로 간편하게 제출하세요.",
          },
          {
            t: "성장 그래프",
            d: "과제별 점수가 시간 순으로 그려져 자신의 성장이 한눈에 보입니다.",
          },
          {
            t: "리더보드",
            d: "총점 기준 순위로 동료들과 건강하게 경쟁해요.",
          },
          {
            t: "관리자 패널",
            d: "운영진은 과제를 등록하고 학생 진행 상황을 모니터링합니다.",
          },
        ].map((f) => (
          <div key={f.t} className="card">
            <h3 className="text-lg font-semibold">{f.t}</h3>
            <p className="mt-2 text-sm text-gray-600">{f.d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
