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

// Wrap user code so input() reads from a queue (avoids browser prompt() blocking).
function wrapCode(userCode, stdin) {
  const lines = (stdin ?? "").split("\n");
  const queue = JSON.stringify(lines);
  return `
import builtins as __b, sys as __s
__queue = ${queue}
def __input(prompt=""):
    try:
        __s.stdout.write(str(prompt))
    except Exception: pass
    if not __queue:
        raise EOFError("EOF when reading a line")
    val = __queue.pop(0)
    __s.stdout.write(val + "\\n")
    return val
__b.input = __input
del __b, __s, __queue, __input

${userCode}
`;
}

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
