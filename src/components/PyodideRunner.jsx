"use client";

import { useEffect, useRef, useState } from "react";

const PYODIDE_VERSION = "0.26.2";
const PYODIDE_INDEX = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("no window"));
    if (window.__pyodideScriptLoaded) return resolve();
    const existing = document.querySelector(`script[data-pyodide]`);
    if (existing) {
      existing.addEventListener("load", () => {
        window.__pyodideScriptLoaded = true;
        resolve();
      });
      existing.addEventListener("error", reject);
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.dataset.pyodide = "1";
    s.onload = () => {
      window.__pyodideScriptLoaded = true;
      resolve();
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

let pyodidePromise = null;
async function getPyodide() {
  if (typeof window === "undefined") throw new Error("Pyodide must run in the browser");
  if (window.__pyodide) return window.__pyodide;
  if (pyodidePromise) return pyodidePromise;
  pyodidePromise = (async () => {
    await loadScriptOnce(`${PYODIDE_INDEX}pyodide.js`);
    const py = await window.loadPyodide({ indexURL: PYODIDE_INDEX });
    window.__pyodide = py;
    return py;
  })();
  return pyodidePromise;
}

export default function PyodideRunner({
  code,
  stdin = "",
  onResult,
  buttonLabel = "실행",
  className = "",
}) {
  const [status, setStatus] = useState("idle");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const codeRef = useRef(code);
  codeRef.current = code;

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

      const wrappedStdin = stdin
        ? `\nimport io,sys\nsys.stdin = io.StringIO(${JSON.stringify(stdin)})\n`
        : "";
      await py.runPythonAsync(wrappedStdin + codeRef.current);

      setOutput(captured.trimEnd());
      setStatus("ready");
      onResult?.({ stdout: captured.trimEnd(), error: null });
    } catch (e) {
      const msg = String(e?.message ?? e);
      setError(msg);
      setStatus("ready");
      onResult?.({ stdout: output, error: msg });
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2">
        <button
          onClick={run}
          disabled={status === "loading" || status === "running"}
          className="btn-primary"
        >
          {status === "loading" ? "Pyodide 준비 중..." : status === "running" ? "실행 중..." : buttonLabel}
        </button>
        <span className="text-xs text-gray-500">
          {status === "loading" && "처음 한 번만 ~5MB 다운로드합니다"}
          {status === "ready" && "Python 3 (Pyodide) 준비 완료"}
          {status === "error" && "Pyodide 로드 실패"}
        </span>
      </div>
      <pre className="min-h-[80px] whitespace-pre-wrap rounded-lg bg-slate-900 p-3 text-xs text-slate-100 font-mono">
        {error ? `❌ ${error}` : output || "출력이 여기에 표시됩니다."}
      </pre>
    </div>
  );
}
