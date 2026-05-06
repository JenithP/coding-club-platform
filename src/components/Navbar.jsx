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
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white font-bold">
            E
          </span>
          <span className="text-base font-semibold tracking-tight">Exception · 코딩학회</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link href="/leaderboard" className="rounded-lg px-3 py-1.5 text-sm hover:bg-gray-100">
            리더보드
          </Link>
          {user && (
            <>
              <Link
                href="/dashboard"
                className="rounded-lg px-3 py-1.5 text-sm hover:bg-gray-100"
              >
                대시보드
              </Link>
              <Link
                href="/assignments"
                className="rounded-lg px-3 py-1.5 text-sm hover:bg-gray-100"
              >
                과제
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50"
                >
                  관리자
                </Link>
              )}
            </>
          )}

          {loading ? null : user ? (
            <div className="ml-2 flex items-center gap-2">
              <span className="hidden sm:inline text-sm text-gray-600">
                {profile?.name ?? "학생"} ({profile?.studentId ?? ""})
              </span>
              <button onClick={handleSignOut} className="btn-ghost">
                로그아웃
              </button>
            </div>
          ) : (
            <div className="ml-2 flex items-center gap-2">
              <Link href="/login" className="btn-ghost">로그인</Link>
              <Link href="/signup" className="btn-primary">회원가입</Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
