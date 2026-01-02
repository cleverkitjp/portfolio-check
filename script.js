/* Portfolio Check (static, no external libs) */

(function () {
  const el = (id) => document.getElementById(id);

  // --- Elements
  const age = el("age");
  const agePill = el("agePill");

  const riskButtons = Array.from(document.querySelectorAll("[data-risk]"));
  const riskHint = el("riskHint");

  const modeButtons = Array.from(document.querySelectorAll("[data-mode]"));
  const percentBox = el("percentBox");
  const amountBox = el("amountBox");

  const amtStocks = el("amtStocks");
  const amtBonds = el("amtBonds");
  const amtCash = el("amtCash");
  const amtOther = el("amtOther");
  const amountSumRow = el("amountSumRow");
  const amountSumValue = el("amountSumValue");
  const amountSumMsg = el("amountSumMsg");
  const amountPreview = el("amountPreview");

  const pctStocks = el("pctStocks");
  const pctBonds = el("pctBonds");
  const pctCash = el("pctCash");
  const pctOther = el("pctOther");
  const percentSumRow = el("percentSumRow");

  const sumValue = el("sumValue");
  const sumMsg = el("sumMsg");
  const allocError = el("allocError");
  const allocCard = el("allocCard");
  const btnCalc = el("btnCalc");
  const btnReset = el("btnReset");

  const eqJp = el("eqJp");
  const eqGlobal = el("eqGlobal");
  const eqCrypto = el("eqCrypto");
  const eqSumValue = el("eqSumValue");
  const eqSumMsg = el("eqSumMsg");
  const eqError = el("eqError");

  const resultCard = el("resultCard");
  const verdictBadge = el("verdictBadge");
  const verdictText = el("verdictText");
  const diffList = el("diffList");
  const nextAction = el("nextAction");

  const cryptoBox = el("cryptoBox");
  const cryptoNote = el("cryptoNote");

  const modelMeta = el("modelMeta");
  const modelGrid = el("modelGrid");

  const canvas = el("barChart");
  const ctx = canvas.getContext("2d");

  // --- State
  let selectedRisk = null; // 'low' | 'mid' | 'high'
  let mode = "amount"; // 'amount' | 'percent'

  // --- Model Table (MVP)
  // ageBand: 20-34, 35-49, 50-64, 65+
  // risk: low/mid/high
  const MODELS = {
    "20-34": {
      low:  { stocks: 50, bonds: 30, cash: 20 },
      mid:  { stocks: 70, bonds: 20, cash: 10 },
      high: { stocks: 85, bonds: 10, cash: 5  }
    },
    "35-49": {
      low:  { stocks: 45, bonds: 35, cash: 20 },
      mid:  { stocks: 65, bonds: 25, cash: 10 },
      high: { stocks: 80, bonds: 15, cash: 5  }
    },
    "50-64": {
      low:  { stocks: 35, bonds: 45, cash: 20 },
      mid:  { stocks: 55, bonds: 35, cash: 10 },
      high: { stocks: 70, bonds: 25, cash: 5  }
    },
    "65+": {
      low:  { stocks: 20, bonds: 55, cash: 25 },
      mid:  { stocks: 35, bonds: 50, cash: 15 },
      high: { stocks: 50, bonds: 40, cash: 10 }
    }
  };

  const RISK_LABEL = { low: "低い", mid: "普通", high: "高い" };

  function clampOrNaN(v) {
    if (v === "" || v === null || typeof v === "undefined") return 0;
    const n = Number(v);
    if (!Number.isFinite(n)) return NaN;
    return n;
  }

  function anyNonEmpty(...inputs) {
    return inputs.some((x) => String(x.value || "").trim() !== "");
  }

  function validatePercentInput(n) {
    return Number.isFinite(n) && n >= 0 && n <= 100;
  }

  function getAgeBand(a) {
    if (a <= 34) return "20-34";
    if (a <= 49) return "35-49";
    if (a <= 64) return "50-64";
    return "65+";
  }

  function readAlloc() {
    const s = clampOrNaN(pctStocks.value);
    const b = clampOrNaN(pctBonds.value);
    const c = clampOrNaN(pctCash.value);
    const o = clampOrNaN(pctOther.value);

    return { stocks: s, bonds: b, cash: c, other: o };
  }

  function readAmountAlloc() {
    const s = clampOrNaN(amtStocks.value);
    const b = clampOrNaN(amtBonds.value);
    const c = clampOrNaN(amtCash.value);
    const o = clampOrNaN(amtOther.value);

    return { stocks: s, bonds: b, cash: c, other: o };
  }

  function allocSum(a) {
    return a.stocks + a.bonds + a.cash + a.other;
  }

  function showPercentStatus() {
    const a = readAlloc();

    // Range validation (show first issue only, keep minimal)
    const entries = [
      ["株式", a.stocks],
      ["債券", a.bonds],
      ["現金", a.cash],
      ["その他", a.other],
    ];

    let rangeError = null;
    for (const [name, val] of entries) {
      if (Number.isNaN(val)) { rangeError = `${name} は数値で入力してください。`; break; }
      if (!validatePercentInput(val)) { rangeError = `${name} は 0〜100 の範囲で入力してください。`; break; }
    }

    const sum = allocSum(a);
    const sumRounded = round1(sum);
    sumValue.textContent = `${sumRounded}%`;

    allocError.hidden = true;
    allocCard.classList.remove("has-error");
    percentSumRow.classList.remove("ok");

    if (rangeError) {
      allocError.textContent = rangeError;
      allocError.hidden = false;
      sumMsg.textContent = "入力値を確認してください";
      return { ok: false, sumOk: false, sum: sumRounded };
    }

    const diff = round1(100 - sum);
    const sumOk = nearlyEqual(sum, 100, 0.05); // allow tiny float error

    if (sumOk) {
      percentSumRow.classList.add("ok");
      sumMsg.textContent = "OK（合計100%）";
    } else {
      if (diff > 0) sumMsg.textContent = `あと +${Math.abs(diff)}%`;
      else sumMsg.textContent = `${Math.abs(diff)}% 超過`;
    }

    return { ok: true, sumOk, sum: sumRounded };
  }

  function showAmountStatus() {
    const a = readAmountAlloc();
    const entries = [
      ["株式", a.stocks],
      ["債券", a.bonds],
      ["現金", a.cash],
      ["その他", a.other],
    ];

    let rangeError = null;
    for (const [name, val] of entries) {
      if (Number.isNaN(val)) { rangeError = `${name} は数値で入力してください。`; break; }
      if (val < 0) { rangeError = `${name} は 0 以上で入力してください。`; break; }
    }

    const sum = allocSum(a);
    const sumRounded = round1(sum);
    amountSumValue.textContent = `${sumRounded}万円`;

    allocError.hidden = true;
    amountSumRow.classList.remove("ok");
    amountPreview.hidden = true;

    if (rangeError) {
      allocError.textContent = rangeError;
      allocError.hidden = false;
      amountSumMsg.textContent = "入力値を確認してください";
      return { ok: false, sumOk: false, sum: sumRounded, alloc: a, percentAlloc: null };
    }

    const sumOk = sum > 0;
    if (sumOk) {
      amountSumRow.classList.add("ok");
      amountSumMsg.textContent = "OK（合計>0）";
    } else {
      amountSumMsg.textContent = "合計が0より大きいと判定できます";
    }

    if (sumOk) {
      const percentAlloc = toPercentAlloc(a, sum);
      amountPreview.textContent = `換算後：株式${round1(percentAlloc.stocks)}%/債券${round1(percentAlloc.bonds)}%/現金${round1(percentAlloc.cash)}%/その他${round1(percentAlloc.other)}%`;
      amountPreview.hidden = false;
      return { ok: true, sumOk, sum: sumRounded, alloc: a, percentAlloc };
    }

    return { ok: true, sumOk, sum: sumRounded, alloc: a, percentAlloc: null };
  }

  function toPercentAlloc(a, total) {
    if (!total || total <= 0) return null;
    return {
      stocks: (a.stocks / total) * 100,
      bonds: (a.bonds / total) * 100,
      cash: (a.cash / total) * 100,
      other: (a.other / total) * 100,
    };
  }

  function showAllocStatus() {
    if (mode === "percent") {
      percentBox.hidden = false;
      amountBox.hidden = true;
      return showPercentStatus();
    }
    percentBox.hidden = true;
    amountBox.hidden = false;
    return showAmountStatus();
  }

  function updateCalcState() {
    const status = showAllocStatus();
    btnCalc.disabled = !(status.sumOk && !!selectedRisk);
  }

  function showEqStatus() {
    const used = anyNonEmpty(eqJp, eqGlobal, eqCrypto);
    eqError.hidden = true;

    if (!used) {
      eqSumValue.textContent = "—";
      eqSumMsg.textContent = "未入力なら判定しません";
      return { used: false, ok: false, sumOk: false, crypto: null };
    }

    const jp = clampOrNaN(eqJp.value);
    const gl = clampOrNaN(eqGlobal.value);
    const cr = clampOrNaN(eqCrypto.value);

    const entries = [
      ["国内株", jp],
      ["海外株", gl],
      ["暗号資産", cr],
    ];

    for (const [name, val] of entries) {
      if (Number.isNaN(val)) {
        eqError.textContent = `${name} は数値で入力してください。`;
        eqError.hidden = false;
        eqSumValue.textContent = "—";
        eqSumMsg.textContent = "内訳は参考表示しません";
        return { used: true, ok: false, sumOk: false, crypto: null };
      }
      if (!validatePercentInput(val)) {
        eqError.textContent = `${name} は 0〜100 の範囲で入力してください。`;
        eqError.hidden = false;
        eqSumValue.textContent = "—";
        eqSumMsg.textContent = "内訳は参考表示しません";
        return { used: true, ok: false, sumOk: false, crypto: null };
      }
    }

    const sum = jp + gl + cr;
    const sumRounded = round1(sum);
    eqSumValue.textContent = `${sumRounded}%`;

    const sumOk = nearlyEqual(sum, 100, 0.05);
    if (sumOk) {
      eqSumMsg.textContent = "OK（株式内で合計100%）";
      return { used: true, ok: true, sumOk: true, crypto: cr };
    } else {
      const diff = round1(100 - sum);
      eqSumMsg.textContent = diff > 0 ? `あと +${Math.abs(diff)}%` : `${Math.abs(diff)}% 超過`;
      return { used: true, ok: true, sumOk: false, crypto: null };
    }
  }

  function round1(n) {
    return Math.round(n * 10) / 10;
  }

  function nearlyEqual(a, b, eps) {
    return Math.abs(a - b) <= eps;
  }

  function setRisk(r) {
    selectedRisk = r;
    riskButtons.forEach((btn) => {
      const isSel = btn.dataset.risk === r;
      btn.classList.toggle("is-selected", isSel);
      btn.setAttribute("aria-checked", isSel ? "true" : "false");
    });
    riskHint.textContent = `選択中：${RISK_LABEL[r]}`;
    allocError.hidden = true;
    updateCalcState();
  }

  function setMode(nextMode) {
    if (mode === nextMode) return;
    const prevMode = mode;
    mode = nextMode;

    modeButtons.forEach((btn) => {
      const isSel = btn.dataset.mode === mode;
      btn.classList.toggle("is-selected", isSel);
      btn.setAttribute("aria-checked", isSel ? "true" : "false");
    });

    allocError.hidden = true;
    eqError.hidden = true;
    resultCard.hidden = true;
    cryptoBox.hidden = true;

    if (prevMode === "amount" && nextMode === "percent") {
      const amountStatus = showAmountStatus();
      if (amountStatus.ok && amountStatus.sumOk && amountStatus.percentAlloc) {
        const p = amountStatus.percentAlloc;
        pctStocks.value = round1(p.stocks);
        pctBonds.value = round1(p.bonds);
        pctCash.value = round1(p.cash);
        pctOther.value = round1(p.other);
      } else {
        [pctStocks, pctBonds, pctCash, pctOther].forEach((x) => (x.value = ""));
      }
    }

    if (prevMode === "percent" && nextMode === "amount") {
      [amtStocks, amtBonds, amtCash, amtOther].forEach((x) => (x.value = ""));
    }

    updateCalcState();
  }

  function resetAll() {
    age.value = "35";
    agePill.textContent = "35歳";
    selectedRisk = null;
    riskButtons.forEach((btn) => {
      btn.classList.remove("is-selected");
      btn.setAttribute("aria-checked", "false");
    });
    riskHint.textContent = "選択してください";

    [pctStocks, pctBonds, pctCash, pctOther, amtStocks, amtBonds, amtCash, amtOther, eqJp, eqGlobal, eqCrypto].forEach((x) => (x.value = ""));
    allocError.hidden = true;
    eqError.hidden = true;

    resultCard.hidden = true;
    cryptoBox.hidden = true;

    mode = "amount";
    modeButtons.forEach((btn) => {
      const isSel = btn.dataset.mode === mode;
      btn.classList.toggle("is-selected", isSel);
      btn.setAttribute("aria-checked", isSel ? "true" : "false");
    });

    updateCalcState();
    showEqStatus();
    clearCanvas();
  }

  // --- Verdict rules
  function computeVerdict(diff) {
    // diff: {stocks,bonds,cash} (you - model)
    const abs = {
      stocks: Math.abs(diff.stocks),
      bonds: Math.abs(diff.bonds),
      cash: Math.abs(diff.cash),
    };

    const maxAbs = Math.max(abs.stocks, abs.bonds, abs.cash);
    if (maxAbs > 20) {
      return {
        badge: "要確認（偏り大きめ）",
        text: "平均との差が大きい区分があります。まずは「なぜこの配分にしているか」をメモしておくと、次回の見直しが楽になります。",
        action: "偏りの理由（目的・期限・気持ち）を一言でメモしておき、年1回だけ同じ手順で再確認しましょう。"
      };
    }

    const allWithin10 = (abs.stocks <= 10 && abs.bonds <= 10 && abs.cash <= 10);
    if (allWithin10) {
      return {
        badge: "おおむね妥当",
        text: "標準モデルと大きくは外れていません。年1回、生活状況とリスク許容度が変わっていないかだけ確認しましょう。",
        action: "「生活の変化があったか」「値動きに耐えられたか」だけを年1回チェックしましょう。"
      };
    }

    const riskHigh = (diff.stocks > 10) && (diff.cash < -10 || diff.bonds < -10);
    if (riskHigh) {
      return {
        badge: "ややリスク高め",
        text: "株式比率が標準より高めです。値動きが大きい局面で気持ちが揺れやすい配分かもしれません。",
        action: "大きく下がった場面を想像し、許容度（気持ち・生活）に合っているかだけ確認しましょう。"
      };
    }

    const safeSide = (diff.stocks < -10) && (diff.cash > 10 || diff.bonds > 10);
    if (safeSide) {
      return {
        badge: "安全寄り",
        text: "株式比率が標準より低めです。「安心」を優先した配分とも言えます。意図どおりか確認しましょう。",
        action: "この配分が「意図したもの」かだけ確認し、意図があるなら維持でも問題ありません。"
      };
    }

    // fallback
    return {
      badge: "ややズレあり",
      text: "標準モデルとは少し差があります。目的や期間によって“ズレの意味”は変わります。",
      action: "次回の見直しが楽になるよう、今の配分の意図を一言メモしておきましょう。"
    };
  }

  // --- Render model mini
  function renderModelMeta(ageVal, risk) {
    const band = getAgeBand(ageVal);
    const m = MODELS[band][risk];

    modelMeta.textContent = `年齢帯：${band} ／ リスク許容度：${RISK_LABEL[risk]}`;
    modelGrid.innerHTML = "";

    const items = [
      ["株式", m.stocks],
      ["債券", m.bonds],
      ["現金", m.cash],
      ["その他", 0],
    ];

    for (const [k, v] of items) {
      const d = document.createElement("div");
      d.className = "model-cell";
      d.innerHTML = `<div class="k">${k}</div><div class="v">${v}%</div>`;
      modelGrid.appendChild(d);
    }
  }

  // --- Diff list
  function renderDiffList(diffAll) {
    // diffAll includes other too
    const rows = [
      ["株式", diffAll.stocks],
      ["債券", diffAll.bonds],
      ["現金", diffAll.cash],
      ["その他", diffAll.other],
    ];

    diffList.innerHTML = "";
    rows.forEach(([name, d]) => {
      const li = document.createElement("li");
      const sign = d > 0 ? "+" : "";
      li.textContent = `${name} ${sign}${round1(d)}%`;
      diffList.appendChild(li);
    });
  }

  // --- Canvas Chart
  function clearCanvas() {
    const { w, h, dpr } = resizeCanvasToDisplaySize(canvas, ctx);
    ctx.clearRect(0, 0, w, h);
    // keep blank
  }

  function resizeCanvasToDisplaySize(canvasEl, context) {
    const rect = canvasEl.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(320, Math.floor(rect.width * dpr));
    const h = Math.max(240, Math.floor(240 * dpr));
    if (canvasEl.width !== w || canvasEl.height !== h) {
      canvasEl.width = w;
      canvasEl.height = h;
    }
    context.setTransform(1, 0, 0, 1, 0, 0);
    return { w, h, dpr };
  }

  function drawChart(model, you) {
    const { w, h, dpr } = resizeCanvasToDisplaySize(canvas, ctx);

    // Background
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);

    const pad = 20 * dpr;
    const left = 96 * dpr;     // label space
    const top = 24 * dpr;
    const rowH = 46 * dpr;
    const barH = 12 * dpr;
    const gap = 8 * dpr;

    const maxW = w - left - pad;
    const categories = [
      { key: "stocks", label: "株式" },
      { key: "bonds",  label: "債券" },
      { key: "cash",   label: "現金" },
      { key: "other",  label: "その他" },
    ];

    // Colors (computed-ish, no hard palette dependency)
    const modelFill = "rgba(60, 90, 180, 0.25)";
    const youFill   = "rgba(60, 90, 180, 0.75)";
    const axis = "rgba(0,0,0,0.15)";
    const text = "rgba(0,0,0,0.78)";
    const sub = "rgba(0,0,0,0.55)";

    ctx.font = `${12 * dpr}px system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans JP", sans-serif`;
    ctx.textBaseline = "middle";

    // Axis grid (0,25,50,75,100)
    const ticks = [0, 25, 50, 75, 100];
    ctx.strokeStyle = axis;
    ctx.lineWidth = 1 * dpr;
    ticks.forEach((t) => {
      const x = left + (t / 100) * maxW;
      ctx.beginPath();
      ctx.moveTo(x, top - 8 * dpr);
      ctx.lineTo(x, top + rowH * categories.length + 6 * dpr);
      ctx.stroke();

      ctx.fillStyle = sub;
      ctx.fillText(`${t}`, x - 6 * dpr, top - 12 * dpr);
    });

    // Draw rows
    categories.forEach((cat, i) => {
      const yBase = top + i * rowH + 18 * dpr;

      // Label
      ctx.fillStyle = text;
      ctx.fillText(cat.label, pad, yBase);

      // Model bar
      const mv = model[cat.key];
      const mW = (mv / 100) * maxW;

      ctx.fillStyle = modelFill;
      roundRect(ctx, left, yBase - barH - gap, mW, barH, 6 * dpr);
      ctx.fill();

      // You bar
      const yv = you[cat.key];
      const yW = (yv / 100) * maxW;

      ctx.fillStyle = youFill;
      roundRect(ctx, left, yBase, yW, barH, 6 * dpr);
      ctx.fill();

      // values
      ctx.fillStyle = sub;
      ctx.fillText(`標準 ${round1(mv)}%`, left + maxW - 68 * dpr, yBase - barH - gap);
      ctx.fillText(`あなた ${round1(yv)}%`, left + maxW - 68 * dpr, yBase);
    });
  }

  function roundRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  // --- Main calc
  function calculate(options = {}) {
    const { scroll = false } = options;
    // guard
    allocError.hidden = true;
    eqError.hidden = true;

    const ageVal = Number(age.value);
    if (!selectedRisk) {
      riskHint.textContent = "選択してください";
      return;
    }

    const allocStatus = showAllocStatus();
    if (!allocStatus.ok || !allocStatus.sumOk) {
      allocError.textContent = mode === "percent"
        ? "合計が100%になるまで判定できません。"
        : "合計が0より大きいと判定できます。";
      allocError.hidden = false;
      resultCard.hidden = true;
      cryptoBox.hidden = true;
      return;
    }

    const youAlloc = mode === "percent" ? readAlloc() : allocStatus.percentAlloc;
    const band = getAgeBand(ageVal);
    const modelBase = MODELS[band][selectedRisk];

    const modelAlloc = {
      stocks: modelBase.stocks,
      bonds: modelBase.bonds,
      cash: modelBase.cash,
      other: 0
    };

    // diffs
    const diffAll = {
      stocks: youAlloc.stocks - modelAlloc.stocks,
      bonds: youAlloc.bonds - modelAlloc.bonds,
      cash: youAlloc.cash - modelAlloc.cash,
      other: youAlloc.other - modelAlloc.other
    };

    const v = computeVerdict({ stocks: diffAll.stocks, bonds: diffAll.bonds, cash: diffAll.cash });

    verdictBadge.textContent = v.badge;
    verdictText.textContent = v.text;
    nextAction.textContent = v.action;

    renderDiffList(diffAll);
    renderModelMeta(ageVal, selectedRisk);

    // crypto note (only when equity breakdown is used AND valid AND sums 100)
    const eqStatus = showEqStatus();
    cryptoBox.hidden = true;
    if (eqStatus.used && eqStatus.sumOk) {
      const cr = eqStatus.crypto; // percent within equities
      if (cr !== null && Number.isFinite(cr)) {
        const crRounded = round1(cr);
        if (cr > 20) {
          cryptoNote.textContent = `暗号資産比率が高めです（株式内の ${crRounded}%）。価格変動が大きい点に注意し、想定どおりのリスク感かだけ確認しましょう。`;
          cryptoBox.hidden = false;
        } else if (cr >= 10) {
          cryptoNote.textContent = `暗号資産を含めています（株式内の ${crRounded}%）。値動きが大きい要素なので、許容度に合っているかだけ確認しましょう。`;
          cryptoBox.hidden = false;
        } else {
          // keep it quiet (主役にしない)
          cryptoBox.hidden = true;
        }
      }
    }

    resultCard.hidden = false;

    // chart (render after card is visible to avoid overscaled text)
    requestAnimationFrame(() => {
      drawChart(modelAlloc, youAlloc);
      if (scroll) {
        resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  // --- Events
  age.addEventListener("input", () => {
    agePill.textContent = `${age.value}歳`;
    // model changes with age; keep button state updated
    showAllocStatus();
    if (!resultCard.hidden) {
      // soft update chart/model if already shown and input still valid
      if (!btnCalc.disabled) calculate({ scroll: false });
    }
  });

  riskButtons.forEach((btn) => {
    btn.addEventListener("click", () => setRisk(btn.dataset.risk));
  });

  const allocInputs = [pctStocks, pctBonds, pctCash, pctOther];
  allocInputs.forEach((inp) => {
    inp.addEventListener("input", () => {
      if (mode !== "percent") return;
      const st = showPercentStatus();
      updateCalcState();
      if (!st.sumOk) {
        resultCard.hidden = true;
        cryptoBox.hidden = true;
      }
    });
  });

  const amountInputs = [amtStocks, amtBonds, amtCash, amtOther];
  amountInputs.forEach((inp) => {
    inp.addEventListener("input", () => {
      if (mode !== "amount") return;
      const st = showAmountStatus();
      updateCalcState();
      if (!st.sumOk) {
        resultCard.hidden = true;
        cryptoBox.hidden = true;
      }
    });
  });

  const eqInputs = [eqJp, eqGlobal, eqCrypto];
  eqInputs.forEach((inp) => {
    inp.addEventListener("input", () => {
      showEqStatus();
      // don't auto recalc; keeps lightweight
    });
  });

  btnCalc.addEventListener("click", () => calculate({ scroll: true }));
  btnReset.addEventListener("click", resetAll);

  modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => setMode(btn.dataset.mode));
  });

  // initial
  agePill.textContent = `${age.value}歳`;
  updateCalcState();
  showEqStatus();
  clearCanvas();

  // re-render canvas on resize (if results visible)
  let resizeTimer = null;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (!resultCard.hidden) calculate({ scroll: false });
      else clearCanvas();
    }, 120);
  });
})();
