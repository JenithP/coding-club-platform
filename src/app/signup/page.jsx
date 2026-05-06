"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, studentIdToEmail } from "@/lib/firebase";

const DEPARTMENTS = [
  "컴퓨터공학과",
  "소프트웨어학과",
  "인공지능학과",
  "전자공학과",
  "수학과",
  "물리학과",
  "경영학과",
  "기타",
];

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    studentId: "",
    password: "",
    passwordConfirm: "",
    name: "",
    department: DEPARTMENTS[0],
    phone: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const validate = () => {
    if (!/^\d{6,12}$/.test(form.studentId)) return "학번은 숫자 6~12자리여야 합니다.";
    if (form.password.length < 6) return "비밀번호는 최소 6자 이상이어야 합니다.";
    if (form.password !== form.passwordConfirm) return "비밀번호가 일치하지 않습니다.";
    if (!form.name.trim()) return "이름을 입력해주세요.";
    if (!/^[\d\-+\s]{8,20}$/.test(form.phone)) return "유효한 전화번호를 입력해주세요.";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (v) return setError(v);
    setError("");
    setLoading(true);
    try {
      const email = studentIdToEmail(form.studentId);
      const cred = await createUserWithEmailAndPassword(auth, email, form.password);
      await updateProfile(cred.user, { displayName: form.name });
      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid,
        studentId: form.studentId.trim(),
        name: form.name.trim(),
        department: form.department,
        phone: form.phone.trim(),
        email,
        role: "student",
        totalScore: 0,
        createdAt: serverTimestamp(),
      });
      router.push("/dashboard");
    } catch (err) {
      const code = err?.code ?? "";
      if (code === "auth/email-already-in-use") setError("이미 등록된 학번입니다.");
      else if (code === "auth/weak-password") setError("비밀번호가 너무 약합니다.");
      else setError(err?.message ?? "회원가입에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="card">
        <h1 className="text-2xl font-bold">회원가입</h1>
        <p className="mt-1 text-sm text-gray-500">학번으로 가입하여 학회 활동을 시작하세요.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label">학번</label>
            <input className="input" inputMode="numeric" autoComplete="off"
              value={form.studentId} onChange={update("studentId")} placeholder="예: 20231234" required />
            <p className="mt-1 text-xs text-gray-500">
              내부적으로 <span className="font-mono">{form.studentId || "학번"}@exception.kr</span>로 저장됩니다.
            </p>
          </div>
          <div>
            <label className="label">이름</label>
            <input className="input" value={form.name} onChange={update("name")} required />
          </div>
          <div>
            <label className="label">학과</label>
            <select className="input" value={form.department} onChange={update("department")}>
              {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="label">전화번호</label>
            <input className="input" value={form.phone} onChange={update("phone")} placeholder="010-1234-5678" required />
          </div>
          <div>
            <label className="label">비밀번호</label>
            <input className="input" type="password" value={form.password} onChange={update("password")} required />
          </div>
          <div>
            <label className="label">비밀번호 확인</label>
            <input className="input" type="password" value={form.passwordConfirm} onChange={update("passwordConfirm")} required />
          </div>

          {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{error}</div>}

          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "가입 중..." : "가입하기"}
          </button>
        </form>

        <p className="mt-4 text-sm text-gray-600">
          이미 계정이 있나요? <Link href="/login" className="text-brand-700 underline">로그인</Link>
        </p>
      </div>
    </div>
  );
}
