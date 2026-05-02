/* Chem Explorer H — single-page frontend (wired to Flask /api/*) */

const THREE_CDN = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";

/* ─── utils ─── */
function debounce(fn, delay = 420) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.dataset.src = src;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function ensureThree() {
  if (window.THREE) return;
  await loadScript(THREE_CDN);
}

/* ─── NAV ─── */
function showSection(id) {
  document.querySelectorAll(".section").forEach((s) => s.classList.remove("active"));
  const el = document.getElementById(id);
  if (el) el.classList.add("active");
  document.querySelectorAll(".nav-tab").forEach((t) => t.classList.remove("active"));
  const tabs = [...document.querySelectorAll(".nav-tab")];
  const map = { hero: 0, molecule: 1, chat: 2, quiz: 3 };
  tabs[map[id]]?.classList.add("active");
  if (id === "quiz") {
    quizEnsure();
  }
}

document.querySelectorAll(".nav-tab").forEach((btn) => {
  btn.addEventListener("click", () => showSection(btn.dataset.section));
});

document.getElementById("cta-molecule").addEventListener("click", (e) => {
  showSection("molecule");
  triggerBurst(e);
});

/* ─── background formula canvas ─── */
(function initBgCanvas() {
  const canvas = document.getElementById("bg-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let W;
  let H;
  const particles = [];
  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resize);
  resize();

  const formulas = [
    "H₂O",
    "CH₄",
    "CO₂",
    "NH₃",
    "C₆H₁₂O₆",
    "H₂SO₄",
    "NaCl",
    "⬡",
    "C₂H₅OH",
    "HCl",
    "O₂",
    "N₂",
    "Mg",
    "Fe",
    "Au",
  ];

  for (let i = 0; i < 30; i += 1) {
    particles.push({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      text: formulas[Math.floor(Math.random() * formulas.length)],
      alpha: Math.random() * 0.12 + 0.04,
      size: Math.random() * 10 + 8,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -50) p.x = W + 50;
      if (p.x > W + 50) p.x = -50;
      if (p.y < -50) p.y = H + 50;
      if (p.y > H + 50) p.y = -50;
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = "#c084fc";
      ctx.font = `${p.size}px 'Rajdhani', monospace`;
      ctx.fillText(p.text, p.x, p.y);
      ctx.restore();
    }
    requestAnimationFrame(draw);
  }
  draw();
})();

/* ─── HERO TITLE ─── */
(function buildTitle() {
  const words = ["Chem", "Explorer", "H"];
  const ids = ["word1", "word2", "word3"];
  words.forEach((word, wi) => {
    const el = document.getElementById(ids[wi]);
    if (!el) return;
    [...word].forEach((ch) => {
      const span = document.createElement("span");
      span.className = "letter";
      span.textContent = ch;
      span.addEventListener("mouseenter", () => {
        span.classList.add("jiggle");
        setTimeout(() => span.classList.remove("jiggle"), 400);
      });
      el.appendChild(span);
    });
  });
})();

document.addEventListener("mousemove", (e) => {
  document.querySelectorAll(".letter").forEach((l) => {
    const rect = l.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 120) {
      const force = (120 - dist) / 120;
      const mx = dx * force * 0.18;
      const my = dy * force * 0.18;
      l.style.transform = `translate(${mx}px, ${my}px)`;
    } else {
      l.style.transform = "";
    }
  });
});

/* ─── orbital canvas ─── */
(function initOrbital() {
  const canvas = document.getElementById("orbital-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let W;
  let H;
  const mouse = { x: 0, y: 0 };
  let exploding = false;
  let reforming = false;

  const orbits = [
    { rx: 120, ry: 50, tilt: -0.3, speed: 0.012, count: 2, color: "#c084fc" },
    { rx: 180, ry: 75, tilt: 0.5, speed: -0.009, count: 3, color: "#e879f9" },
    { rx: 240, ry: 100, tilt: 1.1, speed: 0.007, count: 4, color: "#f472b6" },
    { rx: 80, ry: 35, tilt: 0.9, speed: -0.018, count: 1, color: "#a78bfa" },
  ];
  const particles = [];

  function resize() {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }
  window.addEventListener("resize", resize);
  resize();

  orbits.forEach((orb, oi) => {
    for (let i = 0; i < orb.count; i += 1) {
      particles.push({
        orbit: oi,
        angle: (i / orb.count) * Math.PI * 2,
        x: 0,
        y: 0,
        color: orb.color,
        burstVx: 0,
        burstVy: 0,
        burstX: 0,
        burstY: 0,
        alpha: 1,
      });
    }
  });

  canvas.addEventListener("mousemove", (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  });

  canvas.addEventListener("click", (e) => {
    if (exploding || reforming) return;
    const r = canvas.getBoundingClientRect();
    const cx = W / 2;
    const cy = H / 2;
    const dx = e.clientX - r.left - cx;
    const dy = e.clientY - r.top - cy;
    if (Math.sqrt(dx * dx + dy * dy) < 280) explode();
  });

  function explode() {
    exploding = true;
    particles.forEach((p) => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      p.burstVx = Math.cos(angle) * speed;
      p.burstVy = Math.sin(angle) * speed;
      p.burstX = p.x;
      p.burstY = p.y;
      p.alpha = 1;
    });
    setTimeout(() => {
      exploding = false;
      reforming = true;
      setTimeout(() => {
        reforming = false;
      }, 1200);
    }, 800);
  }

  let t = 0;
  function draw() {
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2;
    const cy = H / 2;
    const mx = (mouse.x - cx) / (W / 2 || 1);
    const my = (mouse.y - cy) / (H / 2 || 1);

    const nucGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 18);
    nucGrad.addColorStop(0, "rgba(255,255,255,0.9)");
    nucGrad.addColorStop(0.5, "rgba(192,132,252,0.7)");
    nucGrad.addColorStop(1, "rgba(232,121,249,0)");
    ctx.beginPath();
    ctx.arc(cx, cy, 12 + Math.sin(t * 2) * 2, 0, Math.PI * 2);
    ctx.fillStyle = nucGrad;
    ctx.fill();

    orbits.forEach((orb, oi) => {
      ctx.save();
      ctx.translate(cx + mx * 15, cy + my * 10);
      ctx.rotate(orb.tilt);
      ctx.beginPath();
      ctx.ellipse(0, 0, orb.rx + mx * 12, orb.ry + my * 8, 0, 0, Math.PI * 2);
      ctx.strokeStyle = orb.color;
      ctx.globalAlpha = 0.15;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      orbits[oi]._angle = (orbits[oi]._angle || 0) + orb.speed;
    });

    particles.forEach((p) => {
      const orb = orbits[p.orbit];
      p.angle += orb.speed;

      const baseX =
        cx +
        mx * 15 +
        Math.cos(p.angle) * (orb.rx + mx * 12) * Math.cos(orb.tilt) -
        Math.sin(p.angle) * (orb.ry + my * 8) * Math.sin(orb.tilt);
      const baseY =
        cy +
        my * 10 +
        Math.cos(p.angle) * (orb.rx + mx * 12) * Math.sin(orb.tilt) +
        Math.sin(p.angle) * (orb.ry + my * 8) * Math.cos(orb.tilt);

      if (exploding) {
        p.burstX += p.burstVx;
        p.burstY += p.burstVy;
        p.burstVx *= 0.92;
        p.burstVy *= 0.92;
        p.alpha = Math.max(0, p.alpha - 0.02);
        p.x = p.burstX;
        p.y = p.burstY;
      } else if (reforming) {
        p.x += (baseX - p.x) * 0.06;
        p.y += (baseY - p.y) * 0.06;
        p.alpha = Math.min(1, p.alpha + 0.02);
      } else {
        p.x = baseX;
        p.y = baseY;
        p.alpha = 1;
      }

      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 8);
      grad.addColorStop(0, p.color);
      grad.addColorStop(1, "transparent");
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.globalAlpha = p.alpha * 0.8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    t += 0.02;
    requestAnimationFrame(draw);
  }
  draw();
})();

function triggerBurst(e) {
  for (let i = 0; i < 16; i += 1) {
    const el = document.createElement("div");
    el.className = "burst-particle";
    const angle = (i / 16) * 360;
    const dist = 60 + Math.random() * 80;
    el.style.setProperty("--tx", `${Math.cos((angle * Math.PI) / 180) * dist}px`);
    el.style.setProperty("--ty", `${Math.sin((angle * Math.PI) / 180) * dist}px`);
    el.style.left = `${e.clientX - 3}px`;
    el.style.top = `${e.clientY - 3}px`;
    el.style.background = ["#c084fc", "#e879f9", "#f472b6"][i % 3];
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 800);
  }
}

/* ─── MOLBLOCK → geometry ─── */
function parseMolBlock(mb) {
  const lines = mb.split(/\r?\n/).map((l) => l.replace(/\t/g, " "));
  let i = 0;
  while (i < lines.length && !/\bV2000\b/.test(lines[i])) i += 1;
  if (i >= lines.length) return { atoms: [], bonds: [] };
  const parts = lines[i].trim().split(/\s+/);
  const nAtoms = Number.parseInt(parts[0], 10);
  const nBonds = Number.parseInt(parts[1], 10);
  if (!Number.isFinite(nAtoms)) return { atoms: [], bonds: [] };
  i += 1;
  const atoms = [];
  for (let a = 0; a < nAtoms; a += 1) {
    const line = lines[i + a];
    if (!line) break;
    const m = line.trim().split(/\s+/);
    atoms.push({
      serial: a + 1,
      x: Number.parseFloat(m[0]),
      y: Number.parseFloat(m[1]),
      z: Number.parseFloat(m[2]),
      element: (m[3] || "C").replace(/\d/g, ""),
    });
  }
  i += nAtoms;
  const bonds = [];
  for (let b = 0; b < nBonds; b += 1) {
    const line = lines[i + b];
    if (!line) break;
    const m = line.trim().split(/\s+/);
    bonds.push({
      a1: Number.parseInt(m[0], 10),
      a2: Number.parseInt(m[1], 10),
      order: Number.parseInt(m[2], 10) || 1,
    });
  }
  return { atoms, bonds };
}

/* ─── molecule 3d (THREE) ─── */
let mol3DScene = null;
let mol3DRenderer = null;
let mol3DCamera = null;
let mol3DAnimId = null;
let mol3DDragging = false;
let mol3DLastX = 0;
let mol3DLastY = 0;
let mol3DGroup = null;
let molStyle = "stick";
let chiralityFilter = null;
/** @type {null | {
 *  smiles:string; formula:string; weight:number;
 *  stereocenters: {atom_index:number; label:string}[];
 *  chirality:any; molParsed:{atoms:any[]; bonds:any[]};
 * }} */
let currentAnalysis = null;

const MATERIALS = {
  C: 0x9ca3af,
  H: 0xffffff,
  O: 0xff4444,
  N: 0x5567ff,
  S: 0xffcc33,
  P: 0xff8800,
  F: 0x44ffaa,
  Cl: 0x33cc66,
  Br: 0x884400,
};

function sphereRadius(style, el) {
  if (el === "H") {
    return style === "sphere" ? 0.38 : style === "ballstick" ? 0.26 : 0.12;
  }
  return style === "sphere" ? 0.82 : style === "ballstick" ? 0.52 : 0.22;
}

function bondThickness(style) {
  if (style === "sphere") return 0;
  return style === "ballstick" ? 0.1 : 0.06;
}

function stereocenterSerials(mode) {
  if (!currentAnalysis?.stereocenters) return new Set();
  const set = new Set();
  for (const sc of currentAnalysis.stereocenters) {
    const label = String(sc.label);
    const serial = sc.atom_index + 1;
    if (mode === "R" && label === "R") set.add(serial);
    if (mode === "S" && label === "S") set.add(serial);
    if (mode === "both" && (label === "R" || label === "S")) set.add(serial);
  }
  return set;
}

function buildMoleculeMeshes(THREE_, parsed, styleOverride) {
  const style = styleOverride || molStyle;
  mol3DGroup.clear();
  const highlightSerials = stereocenterSerials(chiralityFilter);
  const bondW = bondThickness(style);

  parsed.atoms.forEach((a) => {
    const raw = MATERIALS[a.element] ?? MATERIALS.C;
    const glow = highlightSerials.has(a.serial);
    const baseColor =
      glow && chiralityFilter === "R"
        ? 0xff6b6b
        : glow && chiralityFilter === "S"
          ? 0x6b9fff
          : glow && chiralityFilter === "both"
            ? 0xc084fc
            : raw;
    const material = new THREE_.MeshPhongMaterial({
      color: baseColor,
      emissive: glow ? 0xaa44ff : 0x080008,
      emissiveIntensity: glow ? 0.55 : 0.06,
      shininess: glow ? 120 : 80,
      transparent: glow,
      opacity: glow ? 0.92 : 1,
    });
    const geo = new THREE_.SphereGeometry(sphereRadius(style, a.element), 26, 26);
    const mesh = new THREE_.Mesh(geo, material);
    mesh.position.set(a.x * 0.75, -a.z * 0.75, a.y * 0.75);
    mesh.userData = { serial: a.serial };
    mol3DGroup.add(mesh);
  });

  parsed.bonds.forEach((b) => {
    if (!bondW) return;
    const A = parsed.atoms.find((at) => at.serial === b.a1);
    const B = parsed.atoms.find((at) => at.serial === b.a2);
    if (!A || !B) return;
    const p1 = new THREE_.Vector3(A.x * 0.75, -A.z * 0.75, A.y * 0.75);
    const p2 = new THREE_.Vector3(B.x * 0.75, -B.z * 0.75, B.y * 0.75);
    const dir = new THREE_.Vector3().subVectors(p2, p1);
    const len = dir.length();
    const mid = new THREE_.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    const bGeo = new THREE_.CylinderGeometry(bondW, bondW, len, 14);
    const bMat = new THREE_.MeshPhongMaterial({
      color: 0xc084fc,
      shininess: 90,
      transparent: true,
      opacity: style === "stick" ? 0.92 : 0.85,
    });
    const bMesh = new THREE_.Mesh(bGeo, bMat);
    bMesh.position.copy(mid);
    bMesh.quaternion.setFromUnitVectors(new THREE_.Vector3(0, 1, 0), dir.clone().normalize());
    mol3DGroup.add(bMesh);
  });

  const box = new THREE_.Box3().setFromObject(mol3DGroup);
  const size = box.getSize(new THREE_.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 4);
  mol3DCamera.position.set(0, 0, maxDim * 1.85);
}

function pulseChiralMeshes() {
  if (!mol3DGroup || !chiralityFilter) return;
  const highs = stereocenterSerials(chiralityFilter);
  if (!highs.size) return;
  const t = performance.now() / 260;
  const pulse = 0.45 + 0.35 * Math.sin(t);
  mol3DGroup.children.forEach((child) => {
    if (!child.isMesh) return;
    const serial = child.userData.serial;
    if (!serial || !highs.has(serial)) return;
    if (!child.material) return;
    child.material.emissiveIntensity = pulse;
  });
}

async function render3DMol(analysis) {
  await ensureThree();
  const THREE_ = window.THREE;
  const placeholder = document.getElementById("viewer-placeholder");
  const tools = document.getElementById("style-btns");
  placeholder.style.display = "none";
  tools.classList.remove("viewer-tools-hidden");

  if (mol3DAnimId) cancelAnimationFrame(mol3DAnimId);
  if (mol3DRenderer) mol3DRenderer.dispose();

  const canvas = document.getElementById("mol-3d-canvas");
  const container = document.getElementById("mol-3d-viewer");
  const W = container.clientWidth;
  const H = container.clientHeight;

  mol3DScene = new THREE_.Scene();
  mol3DCamera = new THREE_.PerspectiveCamera(60, W / H, 0.1, 2000);
  mol3DCamera.position.z = 8;

  mol3DRenderer = new THREE_.WebGLRenderer({ canvas, antialias: true, alpha: true });
  mol3DRenderer.setSize(W, H);
  mol3DRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  mol3DRenderer.setClearColor(0x000000, 0);

  mol3DScene.add(new THREE_.AmbientLight(0xffffff, 0.62));
  const dl1 = new THREE_.DirectionalLight(0xc084fc, 1.15);
  dl1.position.set(6, 6, 6);
  mol3DScene.add(dl1);
  const dl2 = new THREE_.DirectionalLight(0xf472b6, 0.75);
  dl2.position.set(-6, -5, -4);
  mol3DScene.add(dl2);

  mol3DGroup = new THREE_.Group();
  mol3DScene.add(mol3DGroup);

  const molParsed = parseMolBlock(analysis.mol_block);
  currentAnalysis.molParsed = molParsed;
  buildMoleculeMeshes(THREE_, molParsed, molStyle);
  setup3DControls(canvas, THREE_);

  function animate() {
    mol3DAnimId = requestAnimationFrame(animate);
    if (!mol3DDragging) mol3DGroup.rotation.y += 0.0035;
    pulseChiralMeshes();
    mol3DRenderer.render(mol3DScene, mol3DCamera);
  }
  animate();
}

function setup3DControls(canvas, THREE_) {
  canvas.onmousedown = (e) => {
    mol3DDragging = true;
    mol3DLastX = e.clientX;
    mol3DLastY = e.clientY;
  };
  canvas.onmouseup = () => {
    mol3DDragging = false;
  };
  canvas.onmouseleave = () => {
    mol3DDragging = false;
  };
  canvas.onmousemove = (e) => {
    if (!mol3DDragging || !mol3DGroup) return;
    const dx = e.clientX - mol3DLastX;
    const dy = e.clientY - mol3DLastY;
    mol3DGroup.rotation.y += dx * 0.01;
    mol3DGroup.rotation.x += dy * 0.01;
    mol3DLastX = e.clientX;
    mol3DLastY = e.clientY;
  };
  canvas.onwheel = (e) => {
    if (!mol3DCamera) return;
    mol3DCamera.position.z = Math.max(2.5, Math.min(42, mol3DCamera.position.z + e.deltaY * 0.012));
    e.preventDefault();
  };

  canvas.ondragstart = (e) => e.preventDefault();
}

document.getElementById("reset-camera").addEventListener("click", () => {
  if (mol3DCamera) mol3DCamera.position.set(0, 0, 8);
  if (mol3DGroup) mol3DGroup.rotation.set(0, 0, 0);
});

document.querySelectorAll("#style-btns [data-style]").forEach((b) =>
  b.addEventListener("click", () => {
    molStyle = b.dataset.style;
    document.querySelectorAll("#style-btns .btn-secondary").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    if (window.THREE && currentAnalysis?.molParsed) {
      buildMoleculeMeshes(window.THREE, currentAnalysis.molParsed);
    }
  })
);

const chiralityCopy = {
  R: {
    color: "#ff6b6b",
    title: "R (Rectus)",
    desc: "R assigns when CIP priorities 1→2→3 rotate clockwise with group 4 away.",
  },
  S: {
    color: "#6b9fff",
    title: "S (Sinister)",
    desc: "S assigns when CIP priorities 1→2→3 rotate counterclockwise with group 4 away.",
  },
  both: {
    color: "#a855f7",
    title: "Configured stereocenters",
    desc: "R/S centers highlighted on the heavy-atom geometry returned by RDKit.",
  },
};

function showChirality(mode) {
  chiralityFilter = mode;
  const info = chiralityCopy[mode];
  const el = document.getElementById("chirality-info");
  const sc = currentAnalysis?.stereocenters || [];
  const rCount = sc.filter((x) => x.label === "R").length;
  const sCount = sc.filter((x) => x.label === "S").length;
  const unspecified = sc.length - rCount - sCount;
  let extra = "";
  if (currentAnalysis) {
    extra = `<br>Detected R: <strong style="color:#ff6b6b">${rCount}</strong> · S: <strong style="color:#6b9fff">${sCount}</strong> · other stereo labels: ${unspecified}.`;
  } else extra = `<br>Analyze a molecule first.`;
  el.innerHTML =
    `<span style="color:${info.color}; font-weight:700;">⬡ ${info.title}</span><br>` +
    `${info.desc}${extra}`;
  el.classList.add("visible");
  if (window.THREE && currentAnalysis?.molParsed) {
    buildMoleculeMeshes(window.THREE, currentAnalysis.molParsed);
  }
}

document.querySelectorAll("[data-chiral]").forEach((btn) =>
  btn.addEventListener("click", () => showChirality(btn.dataset.chiral))
);

/* ─── analysis API ─── */
const molLoading = document.getElementById("mol-loading");
const molResult = document.getElementById("mol-result");
const molInput = document.getElementById("mol-input");

function renderMolError(payload) {
  molResult.innerHTML = `
    <div class="error-text">${payload.error || "Molecule not found"}</div>
    <div class="hint-text">${payload.hint || ""}</div>
  `;
}

function renderMolOk(a) {
  molResult.innerHTML = `
    <div><span class="prop">SMILES:</span> <span class="val">${a.smiles}</span></div>
    <div><span class="prop">Formula:</span> <span class="val">${a.formula}</span></div>
    <div><span class="prop">Mol. weight:</span> <span class="val">${a.weight}</span></div>
    <div><span class="prop">Source:</span> <span class="val">${a.source}</span></div>
    <div><span class="prop">Chirality:</span> <span class="val">${a.chirality?.is_chiral ? "Chiral" : "Achiral"} (${a.chirality?.count || 0} centers)</span></div>
  `;
}

async function analyzeMolecule() {
  const input = molInput.value.trim();
  if (!input) return;
  molLoading.style.display = "flex";
  chiralityFilter = null;
  document.getElementById("chirality-info").classList.remove("visible");

  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: input }),
    });
    const data = await res.json();
    molLoading.style.display = "none";
    if (!data.valid) {
      currentAnalysis = null;
      renderMolError(data);
      document.getElementById("viewer-placeholder").style.display = "flex";
      document.getElementById("style-btns").classList.add("viewer-tools-hidden");
      return;
    }
    currentAnalysis = data;
    renderMolOk(data);
    await render3DMol(data);
  } catch {
    molLoading.style.display = "none";
    renderMolError({
      error: "Molecule not found",
      hint: "Try glucose, caffeine, dopamine, or SMILES like CCO",
    });
  }
}

document.getElementById("mol-analyze").addEventListener("click", analyzeMolecule);
molInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") analyzeMolecule();
});
molInput.addEventListener("input", debounce(analyzeMolecule, 480));

document.querySelectorAll("[data-quick]").forEach((btn) =>
  btn.addEventListener("click", () => {
    molInput.value = btn.dataset.quick;
    analyzeMolecule();
  })
);

/* ─── tutor SSE ─── */
let chatHistory = [];

async function streamTutorSSE(body, onToken) {
  const res = await fetch("/api/chat/claude/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    throw new Error(`Stream failed (${res.status})`);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let acc = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop() || "";
    for (const part of parts) {
      if (!part.startsWith("data:")) continue;
      const d = part.slice(5).trim();
      if (d === "[DONE]") continue;
      try {
        const j = JSON.parse(d);
        if (j.token) {
          acc += j.token;
          onToken(acc);
        }
      } catch {
        /* ignore malformed chunk */
      }
    }
  }
  return acc;
}

function formatBubbleHtml(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br>");
}

function appendMessage(role, html) {
  const msgs = document.getElementById("chat-messages");
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.innerHTML = `<div class="msg-avatar">${role === "ai" ? "⚗" : "👤"}</div><div class="msg-bubble">${html}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

async function pingTutorStatus() {
  const dot = document.getElementById("api-dot");
  const label = document.getElementById("api-status-text");
  try {
    const r = await fetch("/api/tutor-status");
    const j = await r.json();
    if (j.anthropic_configured) {
      dot.classList.remove("offline");
      label.textContent = "Claude backend ready";
    } else {
      dot.classList.add("offline");
      label.textContent = "Fallback tutor (set ANTHROPIC_API_KEY)";
    }
  } catch {
    dot.classList.add("offline");
    label.textContent = "Offline (start Flask)";
  }
}
pingTutorStatus();

function addTyping() {
  const id = `typing-${Date.now()}`;
  const msgs = document.getElementById("chat-messages");
  const div = document.createElement("div");
  div.className = "msg ai";
  div.id = id;
  div.innerHTML = `<div class="msg-avatar">⚗</div><div class="msg-bubble"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return id;
}

function removeTyping(id) {
  document.getElementById(id)?.remove();
}

async function sendChat() {
  const input = document.getElementById("chat-input");
  const btn = document.getElementById("send-btn");
  const msgs = document.getElementById("chat-messages");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  appendMessage("user", formatBubbleHtml(text));
  chatHistory.push({ role: "user", content: text });

  const typingId = addTyping();
  btn.disabled = true;
  try {
    removeTyping(typingId);
    const bubbleHost = document.createElement("div");
    bubbleHost.className = "msg ai";
    bubbleHost.innerHTML = `<div class="msg-avatar">⚗</div><div class="msg-bubble ai-stream"></div>`;
    msgs.appendChild(bubbleHost);
    const bubble = bubbleHost.querySelector(".ai-stream");
    msgs.scrollTop = msgs.scrollHeight;

    const reply = await streamTutorSSE(
      { message: text, context: { history: chatHistory.slice(0, -1) } },
      (acc) => {
        bubble.innerHTML = formatBubbleHtml(acc);
        msgs.scrollTop = msgs.scrollHeight;
      }
    );
    chatHistory.push({ role: "assistant", content: reply || "" });
    if (!(reply || "").trim()) bubble.textContent = "(empty response)";
  } catch (e) {
    removeTyping(typingId);
    appendMessage(
      "ai",
      `<span class="error-text">Streaming error.</span><br>Open the app via Flask on <code>http://localhost:5000</code> and ensure <code>ANTHROPIC_API_KEY</code> is configured.`
    );
  }
  btn.disabled = false;
}

document.getElementById("send-btn").addEventListener("click", sendChat);
document.getElementById("chat-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendChat();
  }
});
document.querySelectorAll(".quick-btn").forEach((b) =>
  b.addEventListener("click", () => {
    document.getElementById("chat-input").value = b.dataset.q;
    sendChat();
  })
);

/* ─── quiz API ─── */
let quizScore = 0;
let quizCorrect = 0;
let quizTotal = 0;
let quizStreak = 0;
let quizXP = 0;
/** @type {null | any} */
let currentQ = null;
let quizDifficulty = "all";
let awaitingNext = false;

function pickDifficultyParam() {
  if (quizDifficulty === "all") {
    const pool = ["easy", "medium", "hard"];
    return pool[Math.floor(Math.random() * pool.length)];
  }
  return quizDifficulty;
}

async function fetchQuizQuestion() {
  const area = document.getElementById("quiz-area");
  area.innerHTML = `<div class="question-card muted-hint">Loading question…</div>`;
  const diff = pickDifficultyParam();
  const res = await fetch(`/api/quiz/question?difficulty=${encodeURIComponent(diff)}`);
  if (!res.ok) {
    area.innerHTML = `<div class="question-card muted-hint">Quiz bank not ready (${res.status}).</div>`;
    currentQ = null;
    return;
  }
  currentQ = await res.json();
  renderQuestionCard(currentQ);
  awaitingNext = false;
}

function renderQuestionCard(q) {
  const area = document.getElementById("quiz-area");
  const opts = (q.options || []).map(
    (o, idx) => `
    <button type="button" class="option" data-idx="${idx}">
      <div class="opt-label">${String.fromCharCode(65 + idx)}</div>
      <span>${String(o)}</span>
    </button>
  `
  );
  area.innerHTML = `
    <div class="question-card">
      <div class="q-meta">
        <span class="q-num">Topic · ${escapeHtml(q.topic || "Chem")}</span>
        <span class="q-diff ${q.difficulty}">${String(q.difficulty || "").toUpperCase()}</span>
      </div>
      <div class="q-text">${escapeHtml(q.question || "")}</div>
      <div class="options">${opts.join("")}</div>
      <div class="q-explanation" id="q-exp">
        <span class="label">Explanation</span>
        <span id="q-exp-body"></span>
      </div>
    </div>
  `;
  area.querySelectorAll(".option").forEach((btn) =>
    btn.addEventListener("click", () => onOptionPick(btn.dataset.idx))
  );
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function onOptionPick(idxStr) {
  if (!currentQ || awaitingNext) return;
  const idx = Number.parseInt(idxStr, 10);
  const opts = currentQ.options || [];
  const selected = opts[idx];
  if (!selected) return;
  awaitingNext = true;

  const res = await fetch("/api/quiz/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: currentQ.id, selected }),
  });
  const verdict = await res.ok ? await res.json() : null;
  quizTotal += 1;
  document.getElementById("total-val").textContent = String(quizTotal);

  const buttons = [...document.querySelectorAll(".option")];
  buttons.forEach((b, i) => {
    b.disabled = true;
  });

  if (verdict?.correct === true) {
    quizCorrect += 1;
    quizStreak += 1;
    const xpGain = currentQ.difficulty === "hard" ? 35 : currentQ.difficulty === "medium" ? 20 : 10;
    quizXP += xpGain;
    quizScore += xpGain;
    document.getElementById("correct-val").textContent = String(quizCorrect);
    document.getElementById("score-val").textContent = String(quizScore);
    document.getElementById("streak-val").textContent = String(quizStreak);
    const sb = document.getElementById("streak-badge");
    sb.classList.add("pulse");
    setTimeout(() => sb.classList.remove("pulse"), 500);
    const correctIdx = opts.indexOf(verdict.answer);
    buttons.forEach((b, i) => {
      if (i === correctIdx) b.classList.add("correct");
    });
  } else if (verdict?.correct === false) {
    quizStreak = 0;
    document.getElementById("streak-val").textContent = "0";
    const correctAnswer = verdict?.answer;
    const correctIdx = opts.indexOf(correctAnswer);
    buttons.forEach((b, i) => {
      if (i === correctIdx) b.classList.add("correct");
      if (i === idx) b.classList.add("wrong");
    });
  } else {
    buttons[idx]?.classList.add("wrong");
  }

  const exp = document.getElementById("q-exp");
  const body = document.getElementById("q-exp-body");
  body.textContent = verdict?.explanation || "";
  exp.classList.add("visible");

  const xpPct = quizXP % 100;
  document.getElementById("xp-bar").style.width = `${xpPct}%`;
  document.getElementById("xp-val").textContent = `${quizXP} XP`;

  setTimeout(fetchQuizQuestion, verdict ? 1450 : 900);
}

function quizEnsure() {
  if (!currentQ) fetchQuizQuestion();
}

document.querySelectorAll(".diff-tab").forEach((tab) =>
  tab.addEventListener("click", () => {
    document.querySelectorAll(".diff-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    quizDifficulty = tab.dataset.diff;
    fetchQuizQuestion();
  })
);
document.getElementById("quiz-next").addEventListener("click", fetchQuizQuestion);
document.getElementById("quiz-reset").addEventListener("click", () => {
  quizScore = quizCorrect = quizTotal = quizStreak = quizXP = 0;
  document.getElementById("score-val").textContent = "0";
  document.getElementById("correct-val").textContent = "0";
  document.getElementById("total-val").textContent = "0";
  document.getElementById("streak-val").textContent = "0";
  document.getElementById("xp-bar").style.width = "0%";
  document.getElementById("xp-val").textContent = "0 XP";
  fetchQuizQuestion();
});
