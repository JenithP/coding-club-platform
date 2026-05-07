"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, studentIdToEmail } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!studentId || !password) return setError("학번과 비밀번호를 입력해주세요.");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, studentIdToEmail(studentId), password);
      router.push("/dashboard");
    } catch (err) {
      const code = err?.code ?? "";
      if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
        setError("학번 또는 비밀번호가 올바르지 않습니다.");
      } else {
        setError(err?.message ?? "로그인에 실패했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="card">
        <h1 className="text-2xl font-bold">로그인</h1>
        <p className="mt-1 text-sm text-gray-500">학번과 비밀번호로 로그인하세요.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label">학번</label>
            <input className="input" inputMode="numeric" value={studentId}
              onChange={(e) => setStudentId(e.target.value)} placeholder="예: 20231234" required />
          </div>
          <div>
            <label className="label">비밀번호</label>
            <input className="input" type="password" value={password}
              onChange={(e) => setPassword(e.target.value)} required />
          </div>

          {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{error}</div>}

          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className="mt-4 text-sm text-gray-600">
          아직 계정이 없나요? <Link href="/signup" className="text-lavender-500 underline">회원가입</Link>
        </p>
      </div>
    </div>
  );
}
