import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-14">
      <section className="overflow-hidden rounded-2xl bg-white/70 ring-1 ring-sand-300/70 shadow-soft">
        <div className="relative aspect-[16/9] sm:aspect-[16/8]">
          <Image
            src="/ss.png"
            alt="Sungshin Women's University Media Communication Dept · Exception"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 1024px"
            className="object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0) 60%, rgba(251,248,243,0.85) 100%)",
            }}
          />
        </div>
        <div className="px-6 py-7 sm:px-10 sm:py-9">
          <p className="text-[11px] uppercase tracking-[0.22em] text-lavender-500">
            Exception · Coding Club
          </p>
          <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-[34px]">
            코드로 <span className="font-serif italic text-lavender-500">사고</span>를 디자인하다.
          </h1>
          <p className="mt-3 max-w-xl text-sm text-ink-soft sm:text-base">
            성신여대 미디어커뮤니케이션학과 코딩학회 <strong>Exception</strong>의 학습 공간입니다.
            브레인 슬라이싱으로 문제를 쪼개고, 퍼즐로 코드를 짜고, 브라우저에서 바로 실행해보세요.
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link href="/signup" className="btn-primary">지금 시작하기</Link>
            <Link href="/leaderboard" className="btn-ghost">리더보드 보기</Link>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="section-title">학습 흐름</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { n: "01", t: "브레인 슬라이싱", d: "코딩 전에 머리로 먼저 — 문제를 5단계로 쪼개고 흐름을 그려요." },
            { n: "02", t: "퍼즐로 조립", d: "함수와 키워드를 드래그해 코드 뼈대의 빈칸을 채워봐요." },
            { n: "03", t: "실행 & 회고", d: "Pyodide로 즉시 실행, 마지막엔 짧은 회고로 마무리해요." },
          ].map((f) => (
            <div key={f.n} className="card-flat">
              <p className="font-mono text-[11px] tracking-widest text-lavender-400">{f.n}</p>
              <h3 className="mt-1 text-base font-semibold">{f.t}</h3>
              <p className="mt-2 text-sm text-ink-soft">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="section-title">기능</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["퍼즐 에디터", "빈칸 채우기 + 함수 드래그앤드롭"],
            ["Pyodide 실행", "설치 없이 브라우저에서 Python 실행"],
            ["GitHub 제출", "큰 프로젝트는 저장소 URL로 제출"],
            ["성장 그래프", "제출 점수가 시간 순으로 그려져요"],
            ["리더보드", "총점 기준 동료들과 함께"],
            ["관리자 패널", "과제 등록 · 학생 현황 · 채점"],
          ].map(([t, d]) => (
            <div key={t} className="card-flat">
              <h3 className="text-sm font-semibold">{t}</h3>
              <p className="mt-1.5 text-xs text-ink-soft">{d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
