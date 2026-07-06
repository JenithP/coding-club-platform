"use client";

import { useEffect, useRef, useState } from "react";
import { getPyodide, wrapCode } from "@/lib/runPython";

export default function PyodideRunner({
  code,
  stdin = "",
  onResult,
  buttonLabel = "실행",
  className = "",
  autoRunKey = null, // change to trigger auto run
}) {
  const [status, setStatus] = useState("idle");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const codeRef = useRef(code);
  const stdinRef = useRef(stdin);
  codeRef.current = code;
  stdinRef.current = stdin;

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    getPyodide()
      .then(() => !cancelled && setStatus("ready"))
      .catch((e) => !cancelled && (setStatus("error"), setError(String(e))));
    return () => {
      cancelled = true;
    };
  }, []);

  const run = async () => {
    setStatus("running");
    setOutput("");
    setError("");
    try {
      const py = await getPyodide();
      let captured = "";
      py.setStdout({ batched: (s) => (captured += s + "\n") });
      py.setStderr({ batched: (s) => (captured += s + "\n") });

      await py.runPythonAsync(wrapCode(codeRef.current, stdinRef.current));

      const out = captured.replace(/\n+$/, "");
      setOutput(out);
      setStatus("ready");
      onResult?.({ stdout: out, error: null });
    } catch (e) {
      const msg = String(e?.message ?? e);
      setError(msg);
      setStatus("ready");
      onResult?.({ stdout: output, error: msg });
    }
  };

  useEffect(() => {
    if (autoRunKey != null && status === "ready") run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRunKey]);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2">
        <button
          onClick={run}
          disabled={status === "loading" || status === "running"}
          className="btn-primary"
        >
          {status === "loading"
            ? "Pyodide 준비 중..."
            : status === "running"
            ? "실행 중..."
            : buttonLabel}
        </button>
        <span className="text-xs text-ink-soft">
          {status === "loading" && "처음 한 번만 ~5MB 다운로드합니다"}
          {status === "ready" && "Python 3 (Pyodide) 준비 완료"}
          {status === "error" && "Pyodide 로드 실패"}
        </span>
      </div>
      <pre className="min-h-[80px] whitespace-pre-wrap rounded-xl bg-[#1a1a2e] p-4 text-xs text-slate-100 font-mono leading-relaxed">
        {error ? `❌ ${error}` : output || "출력이 여기에 표시됩니다."}
      </pre>
    </div>
  );
}
