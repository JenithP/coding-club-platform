"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function Navbar() {
  const { user, profile, isAdmin, signOut, loading } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-30 border-b border-sand-300/70 bg-cream-50/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="group flex items-center gap-2">
          <span
            className="grid h-8 w-8 place-items-center rounded-full text-sm font-bold text-white shadow-soft"
            style={{
              background:
                "linear-gradient(135deg, #f4b8a6 0%, #ecc4d7 50%, #afa9ec 100%)",
            }}
          >
            E
          </span>
          <div className="leading-tight">
            <p className="text-[10px] uppercase tracking-[0.18em] text-ink-soft">
              Sungshin · Media Communication
            </p>
            <p className="text-sm font-semibold tracking-tight text-ink">
              Exception <span className="font-serif italic text-lavender-500">코딩학회</span>
            </p>
          </div>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-1.5">
          <NavLink href="/leaderboard">리더보드</NavLink>
          {user && (
            <>
              <NavLink href="/dashboard">대시보드</NavLink>
              <NavLink href="/assignments">과제</NavLink>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="rounded-full px-3 py-1.5 text-sm font-medium text-lavender-600 hover:bg-lavender-100"
                >
                  관리자
                </Link>
              )}
            </>
          )}

          {loading ? null : user ? (
            <div className="ml-2 flex items-center gap-2">
              <span className="hidden text-xs text-ink-soft sm:inline">
                {profile?.name ?? "학생"} · {profile?.studentId ?? ""}
              </span>
              <button onClick={handleSignOut} className="btn-ghost">
                로그아웃
              </button>
            </div>
          ) : (
            <div className="ml-2 flex items-center gap-1.5">
              <Link href="/login" className="btn-ghost">
                로그인
              </Link>
              <Link href="/signup" className="btn-primary">
                회원가입
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, children }) {
  return (
    <Link
      href={href}
      className="rounded-full px-3 py-1.5 text-sm text-ink-soft transition hover:bg-white/70 hover:text-ink"
    >
      {children}
    </Link>
  );
}
