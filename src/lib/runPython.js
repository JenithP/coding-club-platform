// Client-side only – Pyodide must run in the browser.
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

export async function getPyodide() {
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

export function wrapCode(userCode, stdin) {
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

export async function runPython(code, stdin = "") {
  const py = await getPyodide();
  let captured = "";
  py.setStdout({ batched: (s) => (captured += s + "\n") });
  py.setStderr({ batched: (s) => (captured += s + "\n") });
  try {
    await py.runPythonAsync(wrapCode(code, stdin));
    return { stdout: captured.replace(/\n+$/, ""), error: null };
  } catch (e) {
    return { stdout: captured.replace(/\n+$/, ""), error: String(e?.message ?? e) };
  }
}
