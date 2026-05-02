import { formatTime, initialChatMessage } from "./components/chat.js";
import { gameModeMultiplier } from "./components/quiz.js";

const state = {
  analysis: null,
  quiz: { score: 0, xp: 0, level: 1, streak: 0, correctRun: 0, wrongRun: 0, difficulty: "easy", timer: 25, timerRef: null },
  quizCurrent: null,
  viewers: {},
  chatHistory: [],
  activeTab: "structure",
  renderCache: { molBlock: "", style: "", group: "" },
  askedQuestionIds: new Set(),
};

const $ = (id) => document.getElementById(id);
const escapeHtml = (v) =>
  v.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const ui = {
  landing: $("landing"),
  dashboard: $("dashboard"),
  queryInput: $("queryInput"),
  analyzeBtn: $("analyzeBtn"),
  summaryPanel: $("summaryPanel"),
  styleSelector: $("styleSelector"),
  groupSelector: $("groupSelector"),
  resetGroup: $("resetGroup"),
  chiralityCards: $("chiralityCards"),
  leftCompare: $("leftCompare"),
  rightCompare: $("rightCompare"),
  compareBtn: $("compareBtn"),
  compareResult: $("compareResult"),
  startQuizBtn: $("startQuizBtn"),
  quizStats: $("quizStats"),
  quizQuestion: $("quizQuestion"),
  chatWindow: $("chatWindow"),
  chatLoading: $("chatLoading"),
  chatInput: $("chatInput"),
  chatSend: $("chatSend"),
  themeToggle: $("themeToggle"),
  tabsWrap: $("tabsWrap"),
  tabIndicator: $("tabIndicator"),
};

function createParticles() {
  const particles = $("particles");
  for (let i = 0; i < 64; i++) {
    const p = document.createElement("span");
    p.className = "particle";
    p.style.left = `${Math.random() * 100}%`;
    p.style.top = `${Math.random() * 100}%`;
    p.style.opacity = `${0.25 + Math.random() * 0.9}`;
    particles.appendChild(p);
    gsap.to(p, { y: -20 - Math.random() * 84, duration: 5 + Math.random() * 8, repeat: -1, yoyo: true, ease: "sine.inOut" });
  }
}

function setupHeroJiggle() {
  const title = $("heroTitle");
  window.addEventListener("mousemove", (e) => {
    const box = title.getBoundingClientRect();
    const dx = e.clientX - (box.left + box.width / 2);
    const dy = e.clientY - (box.top + box.height / 2);
    const dist = Math.hypot(dx, dy);
    if (dist < 240 && ui.landing.classList.contains("active")) {
      gsap.to(title, { x: dx * 0.02, y: dy * 0.02, rotation: dx * 0.008, duration: 0.7, ease: "elastic.out(1,0.5)" });
    } else {
      gsap.to(title, { x: 0, y: 0, rotation: 0, duration: 0.72, ease: "power2.out" });
    }
  });
}

function initTabs() {
  const buttons = document.querySelectorAll(".tab-btn");
  const moveIndicator = (btn) => {
    ui.tabIndicator.style.left = `${btn.offsetLeft}px`;
    ui.tabIndicator.style.width = `${btn.offsetWidth}px`;
  };
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((x) => x.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((x) => x.classList.remove("active"));
      btn.classList.add("active");
      $("tab-" + btn.dataset.tab).classList.add("active");
      state.activeTab = btn.dataset.tab;
      moveIndicator(btn);
      if (state.activeTab === "groups" && state.analysis && !state.viewers.group) {
        initGroupViewer();
        renderGroupViewer();
      }
    });
  });
  moveIndicator(buttons[0]);
}

function initViewers() {
  state.viewers.demo = $3Dmol.createViewer("demoViewer", { backgroundColor: "rgba(5,15,35,0.0)" });
  const dopamine = `
  3D
  dopamine
  0  0  0  0  0  0            999 V2000
    1.2189   -0.4447    0.0054 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.0012    0.2610    0.0032 C   0  0  0  0  0  0  0  0  0  0  0  0
   -1.2135   -0.4579   -0.0025 C   0  0  0  0  0  0  0  0  0  0  0  0
   -1.2138   -1.8620   -0.0068 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.0017   -2.5638   -0.0047 C   0  0  0  0  0  0  0  0  0  0  0  0
    1.2168   -1.8607    0.0014 C   0  0  0  0  0  0  0  0  0  0  0  0
   -2.5340    0.2359   -0.0038 C   0  0  0  0  0  0  0  0  0  0  0  0
   -3.6758   -0.7050   -0.0110 C   0  0  0  0  0  0  0  0  0  0  0  0
   -4.9390   -0.1176   -0.0107 N   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  2  0  0  0  0
  2  3  1  0  0  0  0
  3  4  2  0  0  0  0
  4  5  1  0  0  0  0
  5  6  2  0  0  0  0
  6  1  1  0  0  0  0
  3  7  1  0  0  0  0
  7  8  1  0  0  0  0
  8  9  1  0  0  0  0
  M  END
  `;
  state.viewers.demo.addModel(dopamine, "mol");
  state.viewers.demo.setStyle({}, { stick: { colorscheme: "cyanCarbon" } });
  state.viewers.demo.zoomTo();
  state.viewers.demo.render();
  animateDemoViewer();
}

function initMainViewer() {
  if (!state.viewers.main) {
    state.viewers.main = $3Dmol.createViewer("mainViewer", { backgroundColor: "rgba(5,15,35,0.0)" });
  }
}

function initGroupViewer() {
  if (!state.viewers.group) {
    state.viewers.group = $3Dmol.createViewer("groupViewer", { backgroundColor: "rgba(5,15,35,0.0)" });
  }
}

function animateDemoViewer() {
  const wrapper = $("demoViewer");
  wrapper.addEventListener("mousemove", (e) => {
    if (!ui.landing.classList.contains("active")) return;
    const r = wrapper.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    gsap.to(wrapper, { rotationY: nx * 6, rotationX: -ny * 6, duration: 0.6, ease: "power2.out" });
  });
  wrapper.addEventListener("mouseleave", () => gsap.to(wrapper, { rotationX: 0, rotationY: 0, duration: 0.55 }));
}

function styleConfig(mode) {
  if (mode === "ballstick") return { stick: { radius: 0.16 }, sphere: { scale: 0.3 } };
  if (mode === "sphere") return { sphere: {} };
  return { stick: {} };
}

function renderMainMolecule(molBlock) {
  initMainViewer();
  const style = ui.styleSelector.value;
  const viewer = state.viewers.main;
  if (state.renderCache.molBlock === molBlock && state.renderCache.style === style) {
    return;
  }
  viewer.clear();
  viewer.addModel(molBlock, "mol");
  viewer.setStyle({}, styleConfig(style));
  if (state.analysis?.chiral_centers?.length) {
    state.analysis.chiral_centers.forEach((center) => viewer.setStyle({ serial: center.atom_index + 1 }, { sphere: { radius: 0.5, color: "#3be7ff" } }));
  }
  viewer.zoomTo();
  viewer.render();
  state.renderCache.molBlock = molBlock;
  state.renderCache.style = style;
}

function renderGroupViewer(groupName = null) {
  initGroupViewer();
  const viewer = state.viewers.group;
  if (state.renderCache.group === (groupName || "__none__")) return;
  viewer.clear();
  viewer.addModel(state.analysis.mol_block, "mol");
  viewer.setStyle({}, { stick: { radius: 0.18, colorscheme: "Jmol" } });
  if (groupName && state.analysis.functional_groups[groupName]) {
    state.analysis.functional_groups[groupName].forEach((match) => {
      match.atom_indices.forEach((idx) => {
        viewer.setStyle({ serial: idx + 1 }, { sphere: { color: "#d35dff", radius: 0.56 } });
      });
    });
  }
  viewer.zoomTo();
  viewer.render();
  state.renderCache.group = groupName || "__none__";
}

function renderSummary(data) {
  const metrics = [
    ["Formula", data.formula],
    ["Molecular Weight", data.molecular_weight],
    ["IUPAC Name", data.iupac_name],
    ["SMILES", data.smiles],
    ["logP", data.logp ?? "N/A"],
    ["H-Bond Donors", data.h_donors],
    ["H-Bond Acceptors", data.h_acceptors],
    ["Chiral Centers", `${data.chiral_present ? "Yes" : "No"} (${data.chiral_count})`],
  ];
  ui.summaryPanel.innerHTML = metrics.map(([k, v]) => `<div class="metric"><div class="k">${k}</div><div>${v}</div></div>`).join("");
}

function renderChirality(data) {
  if (!data.chiral_centers.length) {
    ui.chiralityCards.innerHTML = `<div class="card">No chiral centers detected for this molecule.</div>`;
    return;
  }
  ui.chiralityCards.innerHTML = data.chiral_centers.map((c) => {
    const cls = c.configuration === "R" ? "#4de7ff" : "#b066ff";
    return `<article class="card">
      <div class="chip" style="border-color:${cls};color:${cls}">${c.configuration} center</div>
      <h4>${c.atom_label}</h4>
      <p>${c.explanation}</p>
      <p><b>Substituents:</b> ${c.neighbors.join(", ")}</p>
    </article>`;
  }).join("");
}

function setupGroups(data) {
  ui.groupSelector.innerHTML = Object.keys(data.functional_groups)
    .map((g) => `<option value="${g}">${g} (${data.functional_groups[g].length})</option>`)
    .join("");
}

function switchToDashboard() {
  gsap.to("#landing", {
    opacity: 0,
    y: -10,
    duration: 0.35,
    ease: "power2.out",
    onComplete: () => {
      ui.landing.classList.remove("active");
      ui.dashboard.classList.add("active");
      gsap.fromTo("#dashboard", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" });
    },
  });
}

async function analyze() {
  const query = ui.queryInput.value.trim();
  if (!query) return;
  ui.analyzeBtn.disabled = true;
  ui.analyzeBtn.textContent = "Analyzing...";
  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Analysis failed");
    state.analysis = data;
    state.renderCache = { molBlock: "", style: "", group: "" };
    renderSummary(data);
    renderMainMolecule(data.mol_block);
    renderChirality(data);
    setupGroups(data);
    renderGroupViewer();
    switchToDashboard();
  } catch (err) {
    ui.summaryPanel.innerHTML = `<div class="metric">${err.message}</div>`;
  } finally {
    ui.analyzeBtn.disabled = false;
    ui.analyzeBtn.textContent = "Analyze";
  }
}

async function runComparison() {
  const left = ui.leftCompare.value.trim();
  const right = ui.rightCompare.value.trim();
  if (!left || !right) return;
  const res = await fetch("/api/compare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ left, right }),
  });
  const data = await res.json();
  if (!res.ok) {
    ui.compareResult.innerHTML = `<div class="card">${data.error}</div>`;
    return;
  }
  const aiSummary = `Compared to ${data.right.query}, ${data.left.query} has ${
    data.delta.molecular_weight > 0 ? "higher" : "lower"
  } molecular weight and ${data.delta.logp > 0 ? "greater" : "reduced"} lipophilicity.`;
  ui.compareResult.innerHTML = `
    <article class="card"><h4>${data.left.query}</h4><p>${data.left.formula}</p><p>MW: ${data.left.molecular_weight}</p></article>
    <article class="card"><h4>${data.right.query}</h4><p>${data.right.formula}</p><p>MW: ${data.right.molecular_weight}</p></article>
    <article class="card"><h4>AI Comparison Summary</h4><p>${aiSummary}</p></article>
  `;
}

function pickDifficulty() {
  const q = state.quiz;
  if (q.correctRun >= 2) q.difficulty = q.difficulty === "easy" ? "medium" : "hard";
  if (q.wrongRun >= 2) q.difficulty = q.difficulty === "hard" ? "medium" : "easy";
}

function updateQuizStats() {
  ui.quizStats.textContent = `Score: ${state.quiz.score} | XP: ${state.quiz.xp} | Level: ${state.quiz.level} | Streak: ${state.quiz.streak} | Difficulty: ${state.quiz.difficulty} | Timer: ${state.quiz.timer}s`;
}

function shuffleList(items) {
  const clone = [...items];
  for (let i = clone.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
}

async function loadQuestion() {
  clearInterval(state.quiz.timerRef);
  state.quiz.timer = 25;
  pickDifficulty();
  const res = await fetch(`/api/quiz/question?difficulty=${state.quiz.difficulty}`);
  let q = await res.json();
  if (!res.ok) {
    ui.quizQuestion.innerHTML = q.error;
    return;
  }
  let guard = 0;
  while (state.askedQuestionIds.has(q.id) && guard < 4) {
    const retry = await fetch(`/api/quiz/question?difficulty=${state.quiz.difficulty}`);
    q = await retry.json();
    guard += 1;
  }
  state.askedQuestionIds.add(q.id);
  state.quizCurrent = q;
  const options = shuffleList(q.options);
  ui.quizQuestion.innerHTML = `
    <p class="chip">${q.topic || "General Chemistry"}</p>
    <h4>${q.question}</h4>
    <div class="quiz-options">
      ${options.map((o) => `<button class="quiz-opt">${o}</button>`).join("")}
    </div>
    <div id="quizExplain"></div>
  `;
  document.querySelectorAll(".quiz-opt").forEach((btn) => btn.addEventListener("click", () => submitAnswer(btn.textContent)));
  state.quiz.timerRef = setInterval(() => {
    state.quiz.timer -= 1;
    updateQuizStats();
    if (state.quiz.timer <= 0) {
      clearInterval(state.quiz.timerRef);
      submitAnswer("__timeout__");
    }
  }, 1000);
}

async function submitAnswer(selected) {
  const res = await fetch("/api/quiz/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: state.quizCurrent.id, selected }),
  });
  const result = await res.json();
  const explain = $("quizExplain");
  if (result.correct) {
    clearInterval(state.quiz.timerRef);
    state.quiz.score += 10;
    state.quiz.streak += 1;
    state.quiz.correctRun += 1;
    state.quiz.wrongRun = 0;
    state.quiz.xp += Math.round((15 + state.quiz.streak * 2) * gameModeMultiplier(state.quiz.streak));
  } else {
    clearInterval(state.quiz.timerRef);
    state.quiz.streak = 0;
    state.quiz.correctRun = 0;
    state.quiz.wrongRun += 1;
    state.quiz.xp = Math.max(0, state.quiz.xp - 5);
  }
  state.quiz.level = Math.floor(state.quiz.xp / 120) + 1;
  updateQuizStats();
  explain.innerHTML = `<p><b>${result.correct ? "Correct!" : "Incorrect."}</b> ${result.explanation}</p>`;
  setTimeout(loadQuestion, 1400);
}

function appendBubble(text, who, timeLabel = formatTime()) {
  const b = document.createElement("div");
  b.className = `bubble ${who}`;
  b.innerHTML = `${escapeHtml(text)}<time>${timeLabel}</time>`;
  ui.chatWindow.appendChild(b);
  ui.chatWindow.scrollTo({ top: ui.chatWindow.scrollHeight, behavior: "smooth" });
  return b;
}

async function streamAIResponse(message) {
  const res = await fetch("/api/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      context: { ...(state.analysis || {}), history: state.chatHistory },
    }),
  });
  if (!res.ok || !res.body) {
    const fallback = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, context: { ...(state.analysis || {}), history: state.chatHistory } }),
    });
    const data = await fallback.json();
    const text = data.answer || data.error || "No reply.";
    appendBubble(text, "ai");
    return text;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";
  const bubble = appendBubble("", "ai");
  ui.chatLoading.classList.remove("hidden");

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";
    for (const event of events) {
      if (!event.startsWith("data:")) continue;
      const payload = event.replace("data:", "").trim();
      if (payload === "[DONE]") continue;
      try {
        const parsed = JSON.parse(payload);
        if (parsed.token) {
          fullText += parsed.token;
          bubble.innerHTML = `${escapeHtml(fullText)}<time>${formatTime()}</time>`;
          ui.chatWindow.scrollTo({ top: ui.chatWindow.scrollHeight, behavior: "smooth" });
        }
      } catch (_) {}
    }
  }
  ui.chatLoading.classList.add("hidden");
  return fullText;
}

async function askAI() {
  const msg = ui.chatInput.value.trim();
  if (!msg) return;
  appendBubble(msg, "user");
  state.chatHistory.push({ role: "user", content: msg });
  ui.chatInput.value = "";
  ui.chatSend.disabled = true;
  try {
    const answer = await streamAIResponse(msg);
    state.chatHistory.push({ role: "assistant", content: answer });
  } finally {
    ui.chatLoading.classList.add("hidden");
    ui.chatSend.disabled = false;
  }
}

function setupThemeToggle() {
  ui.themeToggle.addEventListener("click", () => {
    const next = document.body.dataset.theme === "dark" ? "light" : "dark";
    document.body.dataset.theme = next;
  });
}

function bindEvents() {
  ui.analyzeBtn.addEventListener("click", analyze);
  ui.queryInput.addEventListener("keydown", (e) => e.key === "Enter" && analyze());
  ui.styleSelector.addEventListener("change", () => state.analysis && renderMainMolecule(state.analysis.mol_block));
  ui.groupSelector.addEventListener("change", () => renderGroupViewer(ui.groupSelector.value));
  ui.resetGroup.addEventListener("click", () => renderGroupViewer());
  ui.compareBtn.addEventListener("click", runComparison);
  ui.startQuizBtn.addEventListener("click", loadQuestion);
  ui.chatSend.addEventListener("click", askAI);
  ui.chatInput.addEventListener("keydown", (e) => e.key === "Enter" && askAI());
  window.addEventListener("resize", () => {
    const active = document.querySelector(".tab-btn.active");
    if (active) {
      ui.tabIndicator.style.left = `${active.offsetLeft}px`;
      ui.tabIndicator.style.width = `${active.offsetWidth}px`;
    }
  });
}

window.addEventListener("DOMContentLoaded", () => {
  createParticles();
  setupHeroJiggle();
  setupThemeToggle();
  initTabs();
  initViewers();
  bindEvents();
  updateQuizStats();
  const bootMessage = initialChatMessage();
  appendBubble(bootMessage, "ai");
  state.chatHistory.push({ role: "assistant", content: bootMessage });
});
