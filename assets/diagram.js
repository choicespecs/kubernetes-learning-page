/* ==========================================================================
   Interactive cluster diagram — renders DIAGRAM_NODES / DIAGRAM_EDGES from
   data.js into an SVG, with layer toggles, click-to-inspect, and
   highlighting of the neighborhood around a selected node.
   ========================================================================== */

(function () {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const VIEW_W = 1240;
  const VIEW_H = 930;

  let svgEl, panelEl, layerFormEl;
  let selectedId = null;
  const activeLayers = new Set(DIAGRAM_LAYERS.map((l) => l.id));

  function byId(id) {
    return DIAGRAM_NODES.find((n) => n.id === id);
  }

  function realId(id) {
    const n = byId(id);
    return n && n.isAlias ? n.isAlias : id;
  }

  function el(tag, attrs, children) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const k in attrs || {}) node.setAttribute(k, attrs[k]);
    (children || []).forEach((c) => c && node.appendChild(c));
    return node;
  }

  function anchorPoint(node, side) {
    const cx = node.x + node.w / 2;
    const cy = node.y + node.h / 2;
    switch (side) {
      case "top": return { x: cx, y: node.y };
      case "bottom": return { x: cx, y: node.y + node.h };
      case "left": return { x: node.x, y: cy };
      case "right": return { x: node.x + node.w, y: cy };
      default: return { x: cx, y: cy };
    }
  }

  function edgeAnchors(a, b) {
    const ac = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
    const bc = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
    const dx = bc.x - ac.x;
    const dy = bc.y - ac.y;
    let start, end;
    if (Math.abs(dx) > Math.abs(dy)) {
      start = anchorPoint(a, dx > 0 ? "right" : "left");
      end = anchorPoint(b, dx > 0 ? "left" : "right");
    } else {
      start = anchorPoint(a, dy > 0 ? "bottom" : "top");
      end = anchorPoint(b, dy > 0 ? "top" : "bottom");
    }
    return { start, end };
  }

  function curvePath(start, end) {
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    // gentle curve: control points offset toward the midpoint on the
    // dominant axis, so lines don't just look like straight sticks.
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      return `M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`;
    }
    return `M ${start.x} ${start.y} C ${start.x} ${midY}, ${end.x} ${midY}, ${end.x} ${end.y}`;
  }

  function neighborsOf(id) {
    const set = new Set([id]);
    DIAGRAM_EDGES.forEach((e) => {
      if (realId(e.from) === id) set.add(realId(e.to));
      if (realId(e.to) === id) set.add(realId(e.from));
    });
    return set;
  }

  function render() {
    svgEl.innerHTML = "";

    const defs = el("defs", {}, [
      el("marker", {
        id: "arrow",
        viewBox: "0 0 10 10",
        refX: "9",
        refY: "5",
        markerWidth: "7",
        markerHeight: "7",
        orient: "auto-start-reverse",
      }, [el("path", { d: "M 0 0 L 10 5 L 0 10 z", class: "arrow-head" })]),
      el("marker", {
        id: "arrow-dim",
        viewBox: "0 0 10 10",
        refX: "9",
        refY: "5",
        markerWidth: "7",
        markerHeight: "7",
        orient: "auto-start-reverse",
      }, [el("path", { d: "M 0 0 L 10 5 L 0 10 z", class: "arrow-head-dim" })]),
    ]);
    svgEl.appendChild(defs);

    const neighbors = selectedId ? neighborsOf(selectedId) : null;

    // group boundary boxes (drawn first, underneath everything)
    Object.entries(DIAGRAM_GROUPS).forEach(([gid, g]) => {
      const anyVisible = DIAGRAM_NODES.some(
        (n) => n.group === gid && activeLayers.has(n.layer)
      );
      if (!anyVisible) return;
      svgEl.appendChild(
        el("rect", {
          x: g.x, y: g.y, width: g.w, height: g.h,
          class: "group-box",
        })
      );
      const label = el("text", { x: g.x + 10, y: g.y + 16, class: "group-label" });
      label.textContent = g.label;
      svgEl.appendChild(label);
    });

    // namespace boundary (drawn from its node entry, isBoundary flag)
    DIAGRAM_NODES.filter((n) => n.isBoundary).forEach((n) => {
      if (!activeLayers.has(n.layer)) return;
      svgEl.appendChild(
        el("rect", { x: n.x, y: n.y, width: n.w, height: n.h, class: "ns-box" })
      );
      const label = el("text", { x: n.x + 14, y: n.y + 24, class: "ns-label" });
      label.textContent = n.label;
      svgEl.appendChild(label);
    });

    // edges
    const edgeLayer = el("g", { class: "edges" });
    DIAGRAM_EDGES.forEach((e) => {
      const a = byId(e.from);
      const b = byId(e.to);
      if (!a || !b) return;
      if (!activeLayers.has(e.layer)) return;
      if (!activeLayers.has(a.layer) || !activeLayers.has(b.layer)) return;

      const dim = selectedId && !(neighbors.has(realId(e.from)) && neighbors.has(realId(e.to)));
      const { start, end } = edgeAnchors(a, b);
      const path = el("path", {
        d: curvePath(start, end),
        class: `edge ${e.style === "dashed" ? "edge-dashed" : ""} ${dim ? "edge-dim" : "edge-active"}`,
        "marker-end": dim ? "url(#arrow-dim)" : "url(#arrow)",
      });
      edgeLayer.appendChild(path);

      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;
      const labelG = el("g", { class: `edge-label ${dim ? "edge-label-dim" : ""}` });
      const txt = el("text", { x: midX, y: midY, "text-anchor": "middle" });
      txt.textContent = e.label;
      labelG.appendChild(txt);
      edgeLayer.appendChild(labelG);
    });
    svgEl.appendChild(edgeLayer);

    // nodes
    const nodeLayer = el("g", { class: "nodes" });
    DIAGRAM_NODES.filter((n) => !n.isBoundary).forEach((n) => {
      if (!activeLayers.has(n.layer)) return;
      const rid = realId(n.id);
      const isSelected = selectedId === rid;
      const dim = selectedId && !neighbors.has(rid);

      const g = el("g", {
        class: `node ${isSelected ? "node-selected" : ""} ${dim ? "node-dim" : ""}`,
        "data-id": n.id,
        tabindex: "0",
        role: "button",
        "aria-label": n.label,
      });
      g.appendChild(el("rect", { x: n.x, y: n.y, width: n.w, height: n.h, rx: 10 }));
      const label = el("text", {
        x: n.x + n.w / 2, y: n.y + n.h / 2 + (n.sublabel ? -3 : 5),
        "text-anchor": "middle", class: "node-label",
      });
      label.textContent = n.label;
      g.appendChild(label);
      if (n.sublabel) {
        const sub = el("text", {
          x: n.x + n.w / 2, y: n.y + n.h / 2 + 14,
          "text-anchor": "middle", class: "node-sublabel",
        });
        sub.textContent = n.sublabel;
        g.appendChild(sub);
      }
      g.addEventListener("click", () => selectNode(rid));
      g.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); selectNode(rid); }
      });
      nodeLayer.appendChild(g);
    });
    svgEl.appendChild(nodeLayer);
  }

  function renderPanel() {
    if (!selectedId) {
      panelEl.innerHTML = `
        <div class="diagram-panel-empty">
          <p><strong>Click any box</strong> in the diagram to see what it is, how it connects to everything else, and a real YAML example.</p>
          <p class="muted">Use the layer checkboxes above the diagram to isolate just the part of the system you're trying to understand.</p>
        </div>`;
      return;
    }
    const data = COMPONENTS[selectedId];
    if (!data) {
      panelEl.innerHTML = `<div class="diagram-panel-empty"><p>No reference entry for this node yet.</p></div>`;
      return;
    }
    panelEl.innerHTML = "";
    panelEl.appendChild(renderComponentCard(data, selectedId, { compact: true }));
  }

  function selectNode(id) {
    selectedId = selectedId === id ? null : id;
    render();
    renderPanel();
  }

  function setupLayerToggles() {
    layerFormEl.innerHTML = "";
    DIAGRAM_LAYERS.forEach((layer) => {
      const wrap = document.createElement("label");
      wrap.className = "layer-toggle";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = true;
      cb.addEventListener("change", () => {
        if (cb.checked) activeLayers.add(layer.id);
        else activeLayers.delete(layer.id);
        render();
      });
      wrap.appendChild(cb);
      wrap.appendChild(document.createTextNode(" " + layer.label));
      layerFormEl.appendChild(wrap);
    });

    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "layer-reset";
    resetBtn.textContent = "Reset view";
    resetBtn.addEventListener("click", () => {
      selectedId = null;
      DIAGRAM_LAYERS.forEach((l) => activeLayers.add(l.id));
      layerFormEl.querySelectorAll("input[type=checkbox]").forEach((cb) => (cb.checked = true));
      render();
      renderPanel();
    });
    layerFormEl.appendChild(resetBtn);
  }

  window.initDiagram = function initDiagram() {
    svgEl = document.getElementById("cluster-diagram");
    panelEl = document.getElementById("diagram-panel");
    layerFormEl = document.getElementById("layer-toggles");
    if (!svgEl) return;
    svgEl.setAttribute("viewBox", `0 0 ${VIEW_W} ${VIEW_H}`);
    setupLayerToggles();
    render();
    renderPanel();
  };

  window.diagramSelectComponent = function (id) {
    if (!byId(id)) return;
    selectedId = id;
    window.showSection && window.showSection("diagram");
    render();
    renderPanel();
  };
})();
