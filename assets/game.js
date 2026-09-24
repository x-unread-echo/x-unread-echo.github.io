/* ============================================================
   《大吉》共享状态 / 提示系统 / 音效
   ============================================================ */

const DJ = (() => {
  const KEY = "daji_state_v1";
  const def = () => ({
    name: "",            // 序章输入的称呼
    chapter: 0,          // 已解锁的最大章节 (1~6)
    incense: 3,          // 香火
    flags: {},           // 各线索旗标
    fails: 0,            // 终章密码失败次数
    badPulls: 0,         // 问卦连续落空次数（保底用）
    done: false,         // 是否通关
    ts: Date.now()
  });
  let s;
  try { s = JSON.parse(localStorage.getItem(KEY)) || def(); }
  catch (e) { s = def(); }
  const save = () => { s.ts = Date.now(); localStorage.setItem(KEY, JSON.stringify(s)); };

  /* ---- 状态 API ---- */
  const toast = (text) => {
    try {
      const t = document.createElement("div");
      t.id = "djtoast";
      t.textContent = text;
      document.body.appendChild(t);
      setTimeout(() => t.classList.add("show"), 60);
      setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 900); }, 3400);
    } catch (e) {}
  };
  const api = {
    state: s,
    save,
    toast,
    flag(k, v = true) {
      const isNew = !s.flags[k];
      s.flags[k] = v; save();
      /* 进度反馈：每记下一条新线索，轻轻浮一下 */
      if (isNew && !s.done){
        const n = Object.keys(s.flags).length;
        toast("◈ 已记下一条线索 · 第 " + n + " 条");
      }
    },
    has(k) { return !!s.flags[k]; },
    /** 重访计数：每个页面每次进入都 +1。返回值 1=第一次来，2=第二次……
        各页面据此做"异变"——第二次来，世界悄悄不一样。 */
    revisit(key) {
      s.rv = s.rv || {};
      s.rv[key] = (s.rv[key] || 0) + 1;
      save();
      return s.rv[key];
    },
    rvOf(key) { return (s.rv && s.rv[key]) || 0; },
    addIncense(n) { s.incense = Math.max(0, s.incense + n); save(); },
    /** 页面门禁：未解锁则踢回序章 */
    gate(ch) {
      if (s.chapter < ch) { location.href = "index.html?locked=1"; return false; }
      return true;
    },
    unlock(ch) {
      if (s.chapter < ch) {
        s.chapter = ch; save();
        /* 自动存档提示：像老式单机游戏那样，轻轻浮一下 */
        const names = { 1:"未 读", 2:"青 云 观", 3:"倒影小组", 4:"亥 时", 5:"面 具", 6:"档 案 室", 7:"顺其自然" };
        toast("◈ 已存档 · 第" + "一二三四五六七"[ch-1] + "章「" + names[ch] + "」");
      }
    }
  };

  /* ---- 智能返回：从哪来的回哪去，绝不把玩家扔回原点 ---- */
  api.back = (fallback) => {
    try {
      if (document.referrer) {
        const u = new URL(document.referrer);
        if (u.origin === location.origin && u.pathname !== location.pathname) { history.back(); return; }
      }
    } catch (e) {}
    location.href = fallback || "chat.html";
  };

  /* ---- 极简音效（WebAudio，无外部文件） ---- */
  let AC = null;
  const tone = (freq, dur, type = "sine", vol = 0.04, delay = 0) => {
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0, AC.currentTime + delay);
      g.gain.linearRampToValueAtTime(vol, AC.currentTime + delay + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + delay + dur);
      o.connect(g); g.connect(AC.destination);
      o.start(AC.currentTime + delay); o.stop(AC.currentTime + delay + dur + 0.05);
    } catch (e) {}
  };
  api.sfx = {
    click: () => tone(660, 0.08, "sine", 0.03),
    type:  () => tone(880, 0.04, "sine", 0.015),
    ok:    () => { tone(523, 0.25); tone(784, 0.35, "sine", 0.04, 0.12); },
    err:   () => { tone(196, 0.28, "sawtooth", 0.03); tone(147, 0.4, "sawtooth", 0.025, 0.1); }, // 香灰断裂感
    read:  () => { tone(1046, 0.5, "sine", 0.02); tone(1318, 0.6, "sine", 0.012, 0.1); },        // 远处蝉鸣感
    scare: () => { tone(80, 0.6, "sawtooth", 0.06); tone(55, 0.9, "sawtooth", 0.05, 0.05); },
    pull:  () => { for (let i = 0; i < 4; i++) tone(300 + Math.random() * 400, 0.06, "square", 0.02, i * 0.09); }
  };

  /* ---- 隐形环境提示 ---- */
  let idleTimer = null, hintShown = {};
  api.envHint = (text, id, idleSec = 90) => {
    const el = document.getElementById("envhint");
    if (!el) return;
    const key = id || "h_" + text.slice(0, 6);
    const reset = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (hintShown[key]) { api.envHint(text, id, 40); return; }
        hintShown[key] = true;
        el.textContent = text;
        el.classList.add("show");
        setTimeout(() => el.classList.remove("show"), 9000);
      }, idleSec * 1000);
    };
    ["mousemove", "keydown", "click", "touchstart", "scroll"].forEach(ev =>
      window.addEventListener(ev, reset, { passive: true }));
    reset();
  };
  /* 即时环境提示：不等挂机，立刻浮出来 */
  api.envHintNow = (text) => {
    const el = document.getElementById("envhint");
    if (!el) return;
    el.textContent = text;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 9000);
  };

  /* ---- 问卦提示系统（底层保底：连续2次落空后必出有效） ---- */
  api.divine = (hintPool) => {
    // hintPool: { clear:[...], poetic:[...], empty:[...] }
    if (s.incense < 1) return { grade: "noincense", text: "香炉空了。去解谜吧——香火从来只烧给解得开的人。" };
    s.incense--; api.sfx.pull();
    let roll = Math.random();
    if (s.badPulls >= 2) roll = Math.min(roll, 0.55);      // 保底
    let grade;
    if (roll < 0.42) grade = "clear";
    else if (roll < 0.78) grade = "poetic";
    else grade = "empty";
    if (grade === "empty") s.badPulls++; else s.badPulls = 0;
    save();
    const pick = a => a[Math.floor(Math.random() * a.length)];
    const heads = { clear: "上上签", poetic: "中平签", empty: "下下签" };
    return { grade, head: heads[grade], text: pick(hintPool[grade]) };
  };

  /* ---- 问卦浮层（每页自动注入） ---- */
  api.injectDivine = (hintPool) => {
    const root = document.createElement("div");
    root.innerHTML = `
      <button class="corner" id="divbtn" style="top:56px">问 卦</button>
      <div id="divhint"><div class="divbox">
        <button class="divclose" id="divx">✕</button>
        <h3>青 云 观 · 问 己</h3>
        <div class="divstick" id="divstick"></div>
        <div class="divtext" id="divtext">心中默念所惑，摇签。</div>
        <div class="divbtns">
          <button class="btn" id="divgo">摇 签</button>
        </div>
        <div class="incense-count" id="divinc"></div>
      </div></div>`;
    document.body.appendChild(root);
    const $ = id => document.getElementById(id);
    const refresh = () => $("divinc").textContent = `香火 × ${s.incense}`;
    refresh();
    $("divbtn").onclick = () => { $("divhint").classList.add("open"); refresh(); };
    $("divx").onclick = () => $("divhint").classList.remove("open");
    $("divgo").onclick = () => {
      const r = api.divine(hintPool);
      $("divstick").classList.remove("glitch"); void $("divstick").offsetWidth;
      $("divstick").classList.add("glitch");
      $("divstick").textContent = r.head;
      $("divtext").textContent = r.text;
      if (r.grade !== "noincense") api.sfx.read();
      refresh();
    };
  };

  /* ---- 共享页脚月亮 + 提示槽 ---- */
  document.addEventListener("DOMContentLoaded", () => {
    if (!document.querySelector(".moon")) {
      const m = document.createElement("div"); m.className = "moon";
      document.body.appendChild(m);
    }
    if (!document.getElementById("envhint")) {
      const h = document.createElement("div"); h.id = "envhint";
      document.body.appendChild(h);
    }
  });

  return api;
})();
