// Transform an uploaded worksheet HTML into an embeddable form:
// - strip name/info fields and print buttons
// - inject a submit button + postMessage scoring script
// - extract title / counts metadata for the admin form

const STRIP_BUTTON_TEXT = /인쇄|pdf|print/i;
const NAME_FIELD_LABEL = /이름|학번|학과|소속|name|student/i;

export function transformWorksheet(htmlText) {
  if (typeof window === "undefined" || !window.DOMParser) {
    throw new Error("브라우저 환경에서만 실행됩니다.");
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, "text/html");

  // ---- title detection ----
  const h1Text = doc.querySelector("h1")?.textContent ?? "";
  const titleText = doc.title ?? "";
  const detectedTitle = (h1Text || titleText).replace(/\s+/g, " ").trim();

  // ---- strip well-known patterns ----
  doc.querySelectorAll(".info-row, .info-field").forEach((el) => el.remove());
  doc.querySelectorAll("[data-strip='true'], [data-strip=\"true\"]").forEach((el) => el.remove());

  // remove labeled name/student/dept fields by label text (covers non-conventional markup)
  doc.querySelectorAll("label").forEach((label) => {
    const txt = (label.textContent || "").trim();
    if (NAME_FIELD_LABEL.test(txt)) {
      const wrap = label.closest("div, li, p, fieldset");
      (wrap ?? label).remove();
    }
  });

  // remove print/PDF buttons
  doc.querySelectorAll("button, a").forEach((btn) => {
    const onclick = btn.getAttribute("onclick") || "";
    const text = (btn.textContent || "").trim();
    if (/print|window\.print/i.test(onclick) || STRIP_BUTTON_TEXT.test(text)) {
      btn.remove();
    }
  });

  // ---- detect gradeable bits ----
  const blanks = doc.querySelectorAll("[data-answer]");
  const textareas = doc.querySelectorAll("textarea");

  // ---- inject submit UI + script ----
  if (!doc.getElementById("__worksheetSubmit")) {
    const block = doc.createElement("div");
    block.id = "__worksheetSubmit";
    block.style.cssText =
      "position:sticky;bottom:0;margin:24px auto 0;max-width:920px;padding:14px 32px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;background:rgba(255,255,255,0.95);backdrop-filter:blur(6px);border-top:1px solid #e0dfd8;z-index:50;";
    block.innerHTML = `
      <button id="__worksheetSubmitBtn" type="button" style="padding:10px 22px;border-radius:8px;border:0;background:#534AB7;color:#fff;font-size:14px;font-weight:600;cursor:pointer;">제출하기</button>
      <span id="__worksheetSubmitMsg" style="font-size:12px;color:#666;"></span>
    `;
    doc.body.appendChild(block);

    const script = doc.createElement("script");
    script.id = "__worksheetSubmitScript";
    script.textContent = WORKSHEET_RUNTIME;
    doc.body.appendChild(script);
  }

  const html = "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
  return {
    html,
    meta: {
      title: detectedTitle,
      blanksCount: blanks.length,
      textareasCount: textareas.length,
    },
  };
}

// Runtime injected into every transformed worksheet.
// Reads [data-answer] elements and textareas to compute a 0-100 score.
// If author defined window.__worksheetScore(), use that instead.
const WORKSHEET_RUNTIME = `
(function () {
  function defaultCompute() {
    var blanks = document.querySelectorAll('[data-answer]');
    var correct = 0;
    var puzzle = {};
    blanks.forEach(function (b, i) {
      var key = b.id || ('blank' + i);
      var got = (b.textContent || '').trim();
      var want = (b.getAttribute('data-answer') || '').trim();
      var hasValue = got !== '' && got !== '드롭' && got !== '드래그하세요';
      var ok = hasValue && got === want;
      if (ok) correct++;
      puzzle[key] = { value: got, expected: want, ok: ok };
    });
    var textareas = document.querySelectorAll('textarea');
    var taFilled = 0;
    var taValues = {};
    textareas.forEach(function (t, i) {
      var key = t.id || ('textarea' + i);
      var v = (t.value || '').trim();
      if (v.length > 0) taFilled++;
      taValues[key] = t.value;
    });
    var pTotal = blanks.length;
    var tTotal = textareas.length;
    var puzzleScore = pTotal ? Math.round((correct / pTotal) * 80) : 0;
    var taScore = tTotal ? Math.round((taFilled / tTotal) * 20) : 0;
    if (pTotal === 0 && tTotal === 0) {
      // no auto-detected gradables — full marks once submitted
      return { score: 100, answers: {}, meta: { puzzleTotal: 0, textareasTotal: 0 } };
    }
    return {
      score: Math.min(100, puzzleScore + taScore),
      answers: { puzzle: puzzle, textareas: taValues },
      meta: {
        puzzleCorrect: correct, puzzleTotal: pTotal,
        textareasFilled: taFilled, textareasTotal: tTotal
      }
    };
  }
  function compute() {
    if (typeof window.__worksheetScore === 'function') {
      try {
        var custom = window.__worksheetScore();
        var s = Number(custom && custom.score);
        if (!isFinite(s)) s = 0;
        return {
          score: Math.max(0, Math.min(100, Math.round(s))),
          answers: (custom && custom.answers) || {},
          meta: (custom && custom.meta) || {}
        };
      } catch (e) {
        return defaultCompute();
      }
    }
    return defaultCompute();
  }
  function submit() {
    var r = compute();
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'worksheet:submit',
          score: r.score,
          answers: r.answers,
          meta: Object.assign({ maxScore: 100 }, r.meta)
        }, '*');
      }
    } catch (e) {}
    var btn = document.getElementById('__worksheetSubmitBtn');
    var msg = document.getElementById('__worksheetSubmitMsg');
    if (btn) {
      var original = btn.textContent;
      btn.textContent = '제출됨 · ' + r.score + '점';
      btn.style.background = '#1D9E75';
      setTimeout(function () {
        btn.textContent = original;
        btn.style.background = '#534AB7';
      }, 2500);
    }
    if (msg) {
      var parts = [];
      if (r.meta && r.meta.puzzleTotal != null && r.meta.puzzleTotal > 0) {
        parts.push('퍼즐 ' + (r.meta.puzzleCorrect || 0) + '/' + r.meta.puzzleTotal);
      }
      if (r.meta && r.meta.textareasTotal != null && r.meta.textareasTotal > 0) {
        parts.push('작성 ' + (r.meta.textareasFilled || 0) + '/' + r.meta.textareasTotal);
      }
      msg.textContent = parts.join(' · ');
    }
  }
  var btn = document.getElementById('__worksheetSubmitBtn');
  if (btn) btn.addEventListener('click', submit);
})();
`;
