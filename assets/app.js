/* ==========================================================================
   Page glue: renders the Reference, YAML, cheat sheet, tutorial and
   troubleshooting sections from data.js, wires up nav/search/accordions,
   and provides the shared component-card renderer used by both the
   Reference grid and the diagram's detail panel.
   ========================================================================== */

/* ---- tiny helpers -------------------------------------------------------*/

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inlineFormat(line) {
  let out = escapeHtml(line);
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/`(.+?)`/g, "<code>$1</code>");
  return out;
}

/* tiny markdown-ish renderer: \n\n = paragraph, "- " lines = list */
function mdLite(text) {
  if (!text) return "";
  const blocks = text.split(/\n\n+/);
  return blocks
    .map((block) => {
      const lines = block.split("\n").filter((l) => l.length);
      const isList = lines.length && lines.every((l) => l.trim().startsWith("- "));
      if (isList) {
        const items = lines.map((l) => `<li>${inlineFormat(l.trim().slice(2))}</li>`).join("");
        return `<ul>${items}</ul>`;
      }
      return `<p>${lines.map(inlineFormat).join("<br>")}</p>`;
    })
    .join("");
}

let copyBtnSeq = 0;
function codeBlock(code, opts) {
  opts = opts || {};
  const id = "code-" + ++copyBtnSeq;
  return `
    <div class="code-block">
      <div class="code-block-bar">
        <span class="code-block-lang">${opts.lang || "yaml"}</span>
        <button type="button" class="copy-btn" data-copy-target="${id}">Copy</button>
      </div>
      <pre id="${id}"><code>${escapeHtml(code)}</code></pre>
    </div>`;
}

function el(tag, className, html) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (html !== undefined) n.innerHTML = html;
  return n;
}

/* ---- shared component card (used by Reference grid + diagram panel) -----*/

function renderComponentCard(data, id, opts) {
  opts = opts || {};
  const card = el("div", "component-card" + (opts.compact ? " component-card-compact" : ""));

  let relatedHtml = "";
  if (data.related && data.related.length) {
    relatedHtml = `<div class="related-chips">` +
      data.related
        .map((rid) => {
          const rd = COMPONENTS[rid];
          if (!rd) return "";
          return `<button type="button" class="chip" data-related="${rid}">${rd.name}</button>`;
        })
        .join("") +
      `</div>`;
  }

  let commandsHtml = "";
  if (data.commands && data.commands.length) {
    commandsHtml = `<div class="mini-heading">Common commands</div><table class="cmd-table">` +
      data.commands
        .map(
          (c) =>
            `<tr><td><code>${escapeHtml(c.cmd)}</code></td><td>${escapeHtml(c.desc)}</td></tr>`
        )
        .join("") +
      `</table>`;
  }

  let tipsHtml = "";
  if (data.tips && data.tips.length) {
    tipsHtml = `<div class="mini-heading">Good to know</div><div class="tips">` +
      data.tips.map((t) => `<div class="tip">${mdLite(t)}</div>`).join("") +
      `</div>`;
  }

  const jumpLink = opts.compact
    ? `<button type="button" class="jump-link" data-jump="${id}">Full reference entry ↓</button>`
    : "";

  card.innerHTML = `
    <div class="component-card-head">
      <div>
        <span class="category-tag">${escapeHtml(data.category)}</span>
        <h3>${escapeHtml(data.name)}</h3>
      </div>
    </div>
    <p class="component-summary">${escapeHtml(data.summary)}</p>
    <div class="component-description">${mdLite(data.description)}</div>
    ${data.yaml ? codeBlock(data.yaml, { lang: "yaml" }) : ""}
    ${commandsHtml}
    ${tipsHtml}
    ${relatedHtml}
    ${jumpLink}
  `;

  card.querySelectorAll("[data-related]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const rid = btn.getAttribute("data-related");
      if (opts.compact) {
        window.diagramSelectComponent(rid);
      } else {
        expandReferenceCard(rid);
      }
    });
  });
  const jumpBtn = card.querySelector("[data-jump]");
  if (jumpBtn) {
    jumpBtn.addEventListener("click", () => expandReferenceCard(id));
  }

  return card;
}

/* ---- Reference section ---------------------------------------------------*/

function renderReference() {
  const root = document.getElementById("reference-grid");
  if (!root) return;
  root.innerHTML = "";

  COMPONENT_CATEGORIES.forEach((cat) => {
    const ids = Object.keys(COMPONENTS).filter((k) => COMPONENTS[k].category === cat);
    if (!ids.length) return;

    const section = el("div", "ref-category");
    section.innerHTML = `<h3 class="ref-category-title">${escapeHtml(cat)}</h3>`;
    const grid = el("div", "ref-grid");

    ids.forEach((id) => {
      const data = COMPONENTS[id];
      const item = el("div", "ref-item");
      item.id = "ref-card-" + id;
      item.innerHTML = `
        <button type="button" class="ref-item-toggle">
          <span>${escapeHtml(data.name)}</span>
          <span class="ref-item-summary">${escapeHtml(data.summary)}</span>
          <span class="ref-item-chevron">▸</span>
        </button>
        <div class="ref-item-body"></div>`;
      const body = item.querySelector(".ref-item-body");
      body.appendChild(renderComponentCard(data, id, { compact: false }));
      item.querySelector(".ref-item-toggle").addEventListener("click", () => {
        item.classList.toggle("open");
      });
      grid.appendChild(item);
    });

    section.appendChild(grid);
    root.appendChild(section);
  });
}

function expandReferenceCard(id) {
  document.querySelectorAll(".ref-item.open").forEach((n) => n.classList.remove("open"));
  const target = document.getElementById("ref-card-" + id);
  if (!target) return;
  showSection("reference");
  target.classList.add("open");
  requestAnimationFrame(() => {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add("flash");
    setTimeout(() => target.classList.remove("flash"), 1200);
  });
}
window.expandReferenceCard = expandReferenceCard;

/* ---- kubectl cheat sheet --------------------------------------------------*/

function renderCheatsheet() {
  const tbody = document.getElementById("cheatsheet-body");
  const searchInput = document.getElementById("cheatsheet-search");
  const catFilters = document.getElementById("cheatsheet-cats");
  if (!tbody) return;

  const cats = ["All", ...Array.from(new Set(KUBECTL_CHEATSHEET.map((r) => r.cat)))];
  let activeCat = "All";

  catFilters.innerHTML = cats
    .map((c) => `<button type="button" class="chip cat-chip${c === "All" ? " active" : ""}" data-cat="${c}">${c}</button>`)
    .join("");

  function draw() {
    const q = (searchInput.value || "").toLowerCase().trim();
    const rows = KUBECTL_CHEATSHEET.filter((r) => {
      const matchesCat = activeCat === "All" || r.cat === activeCat;
      const matchesQ = !q || r.cmd.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q);
      return matchesCat && matchesQ;
    });
    tbody.innerHTML = rows
      .map(
        (r) => `<tr><td><code>${escapeHtml(r.cmd)}</code></td><td>${escapeHtml(r.desc)}</td><td><span class="cat-pill">${escapeHtml(r.cat)}</span></td></tr>`
      )
      .join("");
    document.getElementById("cheatsheet-count").textContent = `${rows.length} of ${KUBECTL_CHEATSHEET.length} commands`;
  }

  searchInput.addEventListener("input", draw);
  catFilters.querySelectorAll("[data-cat]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeCat = btn.getAttribute("data-cat");
      catFilters.querySelectorAll(".cat-chip").forEach((b) => b.classList.toggle("active", b === btn));
      draw();
    });
  });

  draw();
}

/* ---- Tutorial --------------------------------------------------------------*/

function renderTutorial() {
  const root = document.getElementById("tutorial-list");
  if (!root) return;
  root.innerHTML = "";

  TUTORIAL_MODULES.forEach((m, idx) => {
    const item = el("div", "tutorial-item" + (idx === 0 ? " open" : ""));
    item.innerHTML = `
      <button type="button" class="tutorial-toggle">
        <span class="tutorial-toggle-title">${escapeHtml(m.title)}</span>
        <span class="tutorial-toggle-time">${escapeHtml(m.time)}</span>
        <span class="ref-item-chevron">▸</span>
      </button>
      <div class="tutorial-body"></div>`;
    const body = item.querySelector(".tutorial-body");

    let stepsHtml = m.steps
      .map(
        (s, i) => `
        <div class="tutorial-step">
          <div class="tutorial-step-num">${i + 1}</div>
          <div class="tutorial-step-content">
            <div class="tutorial-step-text">${mdLite(s.text)}</div>
            ${s.code ? codeBlock(s.code, { lang: "bash" }) : ""}
          </div>
        </div>`
      )
      .join("");

    body.innerHTML = `
      <div class="tutorial-why">${mdLite(m.why)}</div>
      <div class="tutorial-steps">${stepsHtml}</div>
      ${m.note ? `<div class="callout callout-warn"><strong>If this goes wrong:</strong> ${mdLite(m.note)}</div>` : ""}
      <div class="callout callout-check"><strong>✅ Checkpoint:</strong> ${mdLite(m.checkpoint)}</div>
    `;

    item.querySelector(".tutorial-toggle").addEventListener("click", () => {
      item.classList.toggle("open");
    });
    root.appendChild(item);
  });

  document.getElementById("tutorial-expand-all")?.addEventListener("click", () => {
    root.querySelectorAll(".tutorial-item").forEach((n) => n.classList.add("open"));
  });
  document.getElementById("tutorial-collapse-all")?.addEventListener("click", () => {
    root.querySelectorAll(".tutorial-item").forEach((n) => n.classList.remove("open"));
  });
}

/* ---- Architecture request flow + object map --------------------------------*/

function renderArchitecture() {
  const flowRoot = document.getElementById("request-flow");
  if (flowRoot) {
    flowRoot.innerHTML = REQUEST_FLOW_STEPS
      .map((s, i) => `<li><span class="flow-num">${i + 1}</span><span>${inlineFormat(s)}</span></li>`)
      .join("");
  }
  const mapRoot = document.getElementById("object-map");
  if (mapRoot) {
    mapRoot.appendChild(document.createTextNode(""));
    mapRoot.innerHTML = codeBlock(OBJECT_RELATIONSHIP_MAP, { lang: "text" });
  }
}

/* ---- Troubleshooting ---------------------------------------------------*/

function renderTroubleshooting() {
  const root = document.getElementById("troubleshooting-list");
  if (!root) return;
  root.innerHTML = TROUBLESHOOTING
    .map(
      (t) => `
      <div class="ts-item">
        <div class="ts-symptom">${mdLite(t.symptom)}</div>
        <div class="ts-cause"><span class="ts-label">Likely cause</span>${mdLite(t.cause)}</div>
        <div class="ts-fix"><span class="ts-label">Fix</span>${mdLite(t.fix)}</div>
      </div>`
    )
    .join("");
}

/* ---- Nav / section switching --------------------------------------------*/

function showSection(id) {
  document.querySelectorAll(".page-section").forEach((s) => {
    s.classList.toggle("visible", s.id === id);
  });
  document.querySelectorAll(".nav-link").forEach((a) => {
    a.classList.toggle("active", a.getAttribute("data-section") === id);
  });
  const sidebar = document.getElementById("sidebar");
  sidebar?.classList.remove("open");
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  history.replaceState(null, "", "#" + id);
}
window.showSection = showSection;

function setupNav() {
  document.querySelectorAll(".nav-link").forEach((a) => {
    a.addEventListener("click", (ev) => {
      ev.preventDefault();
      showSection(a.getAttribute("data-section"));
    });
  });
  document.getElementById("nav-toggle")?.addEventListener("click", () => {
    document.getElementById("sidebar")?.classList.toggle("open");
  });

  const initial = (location.hash || "#overview").slice(1);
  const valid = document.getElementById(initial) ? initial : "overview";
  showSection(valid);
}

/* ---- copy-to-clipboard delegation ---------------------------------------*/

function setupCopyDelegation() {
  document.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".copy-btn");
    if (!btn) return;
    const targetId = btn.getAttribute("data-copy-target");
    const pre = document.getElementById(targetId);
    if (!pre) return;
    const text = pre.textContent;
    navigator.clipboard?.writeText(text).then(
      () => {
        const orig = btn.textContent;
        btn.textContent = "Copied!";
        btn.classList.add("copied");
        setTimeout(() => {
          btn.textContent = orig;
          btn.classList.remove("copied");
        }, 1400);
      },
      () => {
        btn.textContent = "Select & copy";
      }
    );
  });
}

/* ---- boot -----------------------------------------------------------------*/

document.addEventListener("DOMContentLoaded", () => {
  setupNav();
  setupCopyDelegation();
  renderReference();
  renderCheatsheet();
  renderTutorial();
  renderArchitecture();
  renderTroubleshooting();
  window.initDiagram();

  const year = document.getElementById("footer-year");
  if (year) year.textContent = new Date().getFullYear();
});
