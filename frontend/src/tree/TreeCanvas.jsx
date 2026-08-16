import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

import { EMPHASIZED_MEMBERS } from './emphasis.js';

// Carved nameplate geometry. The plate is narrower than H_SPACING so that
// side-by-side siblings keep a gutter — node *positions* are unchanged.
const PLATE_W = 132;
// Taller than the reference's plate so that a three-line name still clears
// the 13px legibility floor (NFR-4.3) instead of being shrunk to fit.
const PLATE_H = 76;
const FRAME = 6; // carved border thickness, matches the frame symbol below
const H_SPACING = 150; // horizontal gap between sibling/leaf slots
const V_SPACING = 190; // vertical gap between generations
const SPOUSE_GAP = 1; // leaf-slot gap between spouses
const MARGIN = { top: 70, right: 60, bottom: 90, left: 60 };
const HEART_W = 12;

// Reuses the display serif the Warm Library already loads. No new webfont.
const SERIF = '"Noto Serif", Georgia, serif';
const NAME_SIZE = 13.5; // never smaller: the 13px floor is a hard requirement
const RIP_SIZE = 11;
const MIN_LEGIBLE_PX = 13; // NFR-4.3, measured on screen rather than in user units

/**
 * Turns the graph payload ({ members, unions, spouse_links }) into pixel
 * positions: a generation (depth) per member from parent chains, spouses
 * equalized onto the same generation and placed side by side, and children
 * centered under the midpoint of their parents' union.
 */
function layoutGraph(graph) {
  const members = Array.isArray(graph?.members) ? graph.members : [];
  const unions = Array.isArray(graph?.unions) ? graph.unions : [];
  const spouseLinks = Array.isArray(graph?.spouse_links) ? graph.spouse_links : [];

  const byId = new Map(members.map((member) => [member.id, member]));

  const unionsByParent = new Map();
  unions.forEach((union) => {
    [union.father_id, union.mother_id].forEach((parentId) => {
      if (parentId == null || !byId.has(parentId)) return;
      if (!unionsByParent.has(parentId)) unionsByParent.set(parentId, []);
      unionsByParent.get(parentId).push(union);
    });
  });

  const spouseOf = new Map();
  spouseLinks.forEach(({ source, target }) => {
    if (byId.has(source) && byId.has(target)) {
      if (!spouseOf.has(source)) spouseOf.set(source, target);
      if (!spouseOf.has(target)) spouseOf.set(target, source);
    }
  });

  // ---- Generation depth: children are one generation below their parents ----
  const depthById = new Map();
  function depthOf(id, guard) {
    if (depthById.has(id)) return depthById.get(id);
    if (guard.has(id)) return 0; // defensive cycle guard; well-formed trees never hit this
    guard.add(id);
    const member = byId.get(id);
    const fatherDepth =
      member.father != null && byId.has(member.father) ? depthOf(member.father, guard) : null;
    const motherDepth =
      member.mother != null && byId.has(member.mother) ? depthOf(member.mother, guard) : null;
    const depth =
      fatherDepth == null && motherDepth == null
        ? 0
        : Math.max(fatherDepth ?? motherDepth, motherDepth ?? fatherDepth) + 1;
    depthById.set(id, depth);
    return depth;
  }
  members.forEach((member) => depthOf(member.id, new Set()));

  // Spouses render on the same row even if one married in from another branch.
  for (let pass = 0; pass < members.length + 2; pass += 1) {
    let changed = false;
    spouseLinks.forEach(({ source, target }) => {
      if (!depthById.has(source) || !depthById.has(target)) return;
      const max = Math.max(depthById.get(source), depthById.get(target));
      if (depthById.get(source) !== max || depthById.get(target) !== max) {
        depthById.set(source, max);
        depthById.set(target, max);
        changed = true;
      }
    });
    if (!changed) break;
  }

  // ---- X placement: leaves get sequential slots, parents center over children ----
  const xById = new Map();
  const placed = new Set();
  let nextLeafSlot = 0;

  function place(id) {
    if (placed.has(id)) return xById.get(id);
    placed.add(id);

    const spouseId = spouseOf.get(id);
    const childIds = new Set();
    (unionsByParent.get(id) || []).forEach((union) => union.child_ids.forEach((c) => childIds.add(c)));
    if (spouseId != null) {
      (unionsByParent.get(spouseId) || []).forEach((union) =>
        union.child_ids.forEach((c) => childIds.add(c)),
      );
    }

    let x;
    if (childIds.size > 0) {
      const childXs = [...childIds].map((childId) => place(childId));
      x = (Math.min(...childXs) + Math.max(...childXs)) / 2;
    } else {
      x = nextLeafSlot;
      nextLeafSlot += 1;
    }
    xById.set(id, x);

    if (spouseId != null && !placed.has(spouseId)) {
      placed.add(spouseId);
      xById.set(spouseId, x + SPOUSE_GAP);
      nextLeafSlot = Math.max(nextLeafSlot, x + SPOUSE_GAP + 1);
    }

    return x;
  }

  members
    .filter((member) => member.father == null && member.mother == null)
    .forEach((member) => place(member.id));
  // Any member unreachable from a root (shouldn't happen for well-formed data,
  // but keeps a stray record from vanishing off-canvas) still gets a slot.
  members.forEach((member) => place(member.id));

  const emphasized = new Set(EMPHASIZED_MEMBERS);
  const nodes = members.map((member) => ({
    data: member,
    emphasis: emphasized.has(member.full_name),
    x: xById.get(member.id) * H_SPACING,
    y: depthById.get(member.id) * V_SPACING,
  }));
  const nodeById = new Map(nodes.map((node) => [node.data.id, node]));

  // ---- Descent groups: one union's stem, shared sibling bus, and child drops.
  // Positions are untouched; only the route between them is described here.
  const descents = [];
  unions.forEach((union) => {
    const father = union.father_id != null ? nodeById.get(union.father_id) : null;
    const mother = union.mother_id != null ? nodeById.get(union.mother_id) : null;
    const source = father && mother ? { x: (father.x + mother.x) / 2, y: father.y } : father || mother;
    if (!source) return;
    const children = union.child_ids.map((childId) => nodeById.get(childId)).filter(Boolean);
    if (!children.length) return;
    // With two parents the stem starts at the marriage heart, which sits in
    // the gutter between the plates; with one it starts at the plate's foot.
    descents.push({ source, children, fromHeart: Boolean(father && mother) });
  });

  const spouseSegments = [];
  const drawnPairs = new Set();
  spouseLinks.forEach(({ source, target }) => {
    const pairKey = [source, target].sort((a, b) => a - b).join('-');
    if (drawnPairs.has(pairKey)) return;
    drawnPairs.add(pairKey);
    const a = nodeById.get(source);
    const b = nodeById.get(target);
    if (a && b) spouseSegments.push({ a, b });
  });

  return { nodes, descents, spouseSegments };
}

/** Right-angle route: parents' stem → shared sibling bus → drop to each child. */
function descentPath({ source, children, fromHeart }) {
  const stemTop = fromHeart ? source.y : source.y + PLATE_H / 2;
  const childTop = Math.min(...children.map((child) => child.y)) - PLATE_H / 2;
  const busY = childTop - 40;
  const xs = children.map((child) => child.x);
  const [minX, maxX] = [Math.min(...xs), Math.max(...xs)];

  const segments = [`M${source.x},${stemTop}V${busY}`];
  // A zero-length horizontal run would still paint a square cap, so skip it.
  if (maxX - minX > 0.5) segments.push(`M${minX},${busY}H${maxX}`);
  children.forEach((child) => {
    segments.push(`M${child.x},${busY}V${child.y - PLATE_H / 2}`);
  });
  return segments.join('');
}

export default function TreeCanvas({ graph, onSelect }) {
  const svgRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    let cancelled = false;

    function draw() {
      svg.selectAll('*').remove();

      const { nodes, descents, spouseSegments } = layoutGraph(graph);
      if (!nodes.length) return;

      const xs = nodes.map((node) => node.x);
      const ys = nodes.map((node) => node.y);
      const minX = Math.min(...xs) - MARGIN.left - PLATE_W / 2;
      const maxX = Math.max(...xs) + MARGIN.right + PLATE_W / 2;
      const minY = Math.min(...ys) - MARGIN.top;
      const maxY = Math.max(...ys) + MARGIN.bottom;
      const width = maxX - minX;
      const height = maxY - minY;

      svg.attr('viewBox', [minX, minY, width, height]).attr('role', 'tree');

      // ---- Shared definitions: every gradient, filter and ornament exactly once.
      // 83 nodes today and ten times that later all reference these same six ids.
      const defs = svg.append('defs');
      // Note: CSS custom properties do not resolve inside SVG *presentation*
      // attributes, only inside style declarations — hence style="" throughout.
      defs.html(`
        <linearGradient id="tree-plate" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style="stop-color: var(--tree-plate-light)" />
          <stop offset="1" style="stop-color: var(--tree-plate-dark)" />
        </linearGradient>
        <linearGradient id="tree-plate-rip" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style="stop-color: var(--tree-plate-rip-light)" />
          <stop offset="1" style="stop-color: var(--tree-plate-rip-dark)" />
        </linearGradient>

        <!-- Paper mottling: one turbulence, rendered into one 400px tile and
             repeated as a pattern. Filtering the whole canvas directly would
             mean millions of turbulence samples on every pan. -->
        <filter id="tree-paper-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="3"
                        seed="7" stitchTiles="stitch" result="noise" />
          <feColorMatrix in="noise" type="matrix"
            values="0 0 0 0 0.93  0 0 0 0 0.88  0 0 0 0 0.79  0 0 0 0.55 0" />
        </filter>
        <pattern id="tree-paper-mottle" width="400" height="400" patternUnits="userSpaceOnUse">
          <rect width="400" height="400" filter="url(#tree-paper-grain)" />
        </pattern>

        <filter id="tree-plate-shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="2.5" stdDeviation="2.5"
                        flood-color="#2E2010" flood-opacity="0.28" />
        </filter>

        <!-- The carved frame: border plus scrollwork at all four corners. One
             symbol, referenced by every plate; colour comes from the <use>. -->
        <symbol id="tree-frame" viewBox="0 0 ${PLATE_W} ${PLATE_H}">
          <rect x="3" y="3" width="${PLATE_W - 6}" height="${PLATE_H - 6}" rx="4"
                fill="none" stroke="currentColor" stroke-width="${FRAME}" />
          ${['translate(0,0)',
             `translate(${PLATE_W},0) scale(-1,1)`,
             `translate(${PLATE_W},${PLATE_H}) scale(-1,-1)`,
             `translate(0,${PLATE_H}) scale(1,-1)`]
            .map(
              (transform) => `
            <g transform="${transform}" fill="currentColor">
              <path d="M2,26 A24,24 0 0 1 26,2 L26,9 A17,17 0 0 0 9,26 Z" />
              <circle cx="26.5" cy="5.5" r="4" />
              <circle cx="5.5" cy="26.5" r="4" />
            </g>`,
            )
            .join('')}
        </symbol>

        <!-- Marriage glyph, defined once and <use>d at every union. -->
        <symbol id="tree-heart" viewBox="0 0 24 22">
          <path style="fill: var(--tree-heart)"
                d="M12,21 C4,14.5 1,10.6 1,7 A6,6 0 0 1 12,3.6 A6,6 0 0 1 23,7 C23,10.6 20,14.5 12,21 Z" />
        </symbol>
      `);

      // ---- Aged paper ground. The flat cream comes from the element's CSS
      // background so it covers the letterboxed edges too; this one rect adds
      // the mottling on top, outside the zoom viewport so the sheet stays put.
      svg
        .append('rect')
        .attr('aria-hidden', 'true')
        .style('pointer-events', 'none')
        .attr('x', minX - width * 0.1)
        .attr('y', minY - height * 0.1)
        .attr('width', width * 1.2)
        .attr('height', height * 1.2)
        .attr('fill', 'url(#tree-paper-mottle)')
        .attr('opacity', 0.6);

      const viewport = svg.append('g');

      // ---- Watermark: drawn first, beneath links and nodes, and deaf to the
      // pointer so it can never intercept a click, drag or zoom gesture.
      const watermark = viewport
        .append('g')
        .attr('aria-hidden', 'true')
        .style('pointer-events', 'none');

      const treeHeight = height * 0.92;
      watermark
        .append('path')
        .attr('d', roseTreePath())
        .attr(
          'transform',
          `translate(${minX + width * 0.06},${maxY}) scale(${treeHeight / 500})`,
        )
        .style('fill', 'var(--tree-watermark-rose)')
        .attr('opacity', 0.18);

      const branch = watermark
        .append('g')
        .attr(
          'transform',
          `translate(${maxX - width * 0.04},${minY + height * 0.03}) scale(${(height * 0.3) / 260})`,
        )
        .attr('opacity', 0.2);
      branch
        .append('path')
        .attr('d', leafBranch.stem)
        .attr('fill', 'none')
        .style('stroke', 'var(--tree-watermark-rose)')
        .attr('stroke-width', 9)
        .attr('stroke-linecap', 'round');
      leafBranch.leaves.forEach(([cx, cy, angle]) => {
        branch
          .append('ellipse')
          .attr('rx', 20)
          .attr('ry', 10)
          .attr('transform', `translate(${cx},${cy}) rotate(${angle})`)
          .style('fill', 'var(--tree-watermark-leaf)');
      });

      // ---- Descent links: plain right-angle elbows in the frame's own brown ----
      viewport
        .append('g')
        .attr('fill', 'none')
        .attr('stroke-width', 1.8)
        .attr('stroke-linecap', 'square')
        .style('stroke', 'var(--tree-frame)')
        .selectAll('path')
        .data(descents)
        .join('path')
        .attr('d', descentPath);

      // ---- Marriage ties: a short bar between the plates, hearted at the middle ----
      const marriages = viewport.append('g');
      marriages
        .selectAll('line')
        .data(spouseSegments)
        .join('line')
        .attr('x1', (d) => Math.min(d.a.x, d.b.x) + PLATE_W / 2)
        .attr('y1', (d) => d.a.y)
        .attr('x2', (d) => Math.max(d.a.x, d.b.x) - PLATE_W / 2)
        .attr('y2', (d) => d.b.y)
        .attr('stroke-width', 1.8)
        .attr('stroke-linecap', 'square')
        .style('stroke', 'var(--tree-frame)');
      marriages
        .selectAll('use')
        .data(spouseSegments)
        .join('use')
        .attr('href', '#tree-heart')
        .attr('width', HEART_W)
        .attr('height', HEART_W * (22 / 24))
        .attr('x', (d) => (d.a.x + d.b.x) / 2 - HEART_W / 2)
        .attr('y', (d) => (d.a.y + d.b.y) / 2 - (HEART_W * (22 / 24)) / 2);

      // ---- Nodes: carved nameplates ----
      const node = viewport
        .append('g')
        .selectAll('g')
        .data(nodes)
        .join('g')
        .attr('class', 'tree-node')
        .attr('transform', (d) => `translate(${d.x},${d.y})`)
        .attr('tabindex', 0)
        .attr('role', 'treeitem')
        .attr('aria-label', (d) => d.data.full_name)
        .style('cursor', 'pointer')
        .on('click', (_event, d) => onSelect(d.data.id))
        .on('keydown', (event, d) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect(d.data.id);
          }
        });

      node
        .append('rect')
        .attr('class', 'tree-plate')
        .attr('x', -PLATE_W / 2)
        .attr('y', -PLATE_H / 2)
        .attr('width', PLATE_W)
        .attr('height', PLATE_H)
        .attr('rx', 5)
        .attr('filter', 'url(#tree-plate-shadow)')
        .attr('fill', (d) => (d.data.is_deceased ? 'url(#tree-plate-rip)' : 'url(#tree-plate)'));

      // The frame's colour is a class, not an inline style, so the hover and
      // reduced-motion rules in main.css can still win.
      node
        .append('use')
        .attr('href', '#tree-frame')
        .attr('class', (d) => (d.emphasis ? 'tree-frame tree-frame--deep' : 'tree-frame'))
        .attr('x', -PLATE_W / 2)
        .attr('y', -PLATE_H / 2)
        .attr('width', PLATE_W)
        .attr('height', PLATE_H)
        // Deceased plates lose a little contrast in the frame too, so the cue
        // is carried by weight as well as by colour.
        .attr('opacity', (d) => (d.data.is_deceased && !d.emphasis ? 0.72 : 1));

      // Keyboard focus ring. Drawn explicitly rather than left to the UA
      // outline, which browsers render inconsistently on SVG groups.
      node
        .append('rect')
        .attr('class', 'tree-focus-ring')
        .attr('x', -PLATE_W / 2 - 5)
        .attr('y', -PLATE_H / 2 - 5)
        .attr('width', PLATE_W + 10)
        .attr('height', PLATE_H + 10)
        .attr('rx', 8);

      // ---- Names, wrapped to fit inside the carved border ----
      // One hidden text node measures every string; no per-node measuring DOM.
      const meter = svg
        .append('text')
        .attr('visibility', 'hidden')
        .attr('font-family', SERIF);

      function widthOf(text, size, weight) {
        meter.attr('font-size', size).attr('font-weight', weight).text(text);
        return meter.node().getComputedTextLength();
    }

    function wrap(name, size, weight, maxWidth) {
      const words = String(name || '').split(/\s+/).filter(Boolean);
      const lines = [];
      let current = '';
      words.forEach((word) => {
        const candidate = current ? `${current} ${word}` : word;
        if (current && widthOf(candidate, size, weight) > maxWidth) {
          lines.push(current);
          current = word;
        } else {
          current = candidate;
        }
      });
      if (current) lines.push(current);
      return lines;
    }

    const maxTextWidth = PLATE_W - 2 * FRAME - 14;

    node.each(function (d) {
      // 700 is the heaviest Noto Serif weight the platform loads, so emphasis
      // steps 600 → 700 rather than inventing a weight the browser would fake.
      const weight = d.emphasis ? 700 : 600;
      const size = NAME_SIZE;
      // Names wrap to as many lines as they need. Nothing is truncated and
      // nothing is shrunk — this is an archive; every name stays whole.
      const lines = wrap(d.data.full_name, size, weight, maxTextWidth);

      const lineHeight = size * 1.12;
      const ripHeight = d.data.is_deceased ? RIP_SIZE * 1.35 : 0;
      const blockTop = -(lines.length * lineHeight + ripHeight) / 2;

      const group = d3.select(this);
      const name = group
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('font-family', SERIF)
        .attr('font-size', size)
        .attr('font-weight', weight)
        .style('fill', 'var(--tree-ink)');

      lines.forEach((line, index) => {
        name
          .append('tspan')
          .attr('x', 0)
          .attr('y', blockTop + (index + 0.82) * lineHeight)
          .text(line);
      });

      if (d.data.is_deceased) {
        group
          .append('text')
          .attr('text-anchor', 'middle')
          .attr('x', 0)
          .attr('y', blockTop + lines.length * lineHeight + RIP_SIZE)
          .attr('font-family', SERIF)
          .attr('font-size', RIP_SIZE)
          .style('fill', 'var(--tree-ink-muted)')
          .text('(RIP)');
      }
    });

    meter.remove();

    // ---- Pan & zoom ----
    // The ceiling is 30x, not 2.5x: this chart is 83 plates wide, so fitting
    // it to the element scales a 13.5px name down to under 2px. At 2.5x it
    // was still unreadable — the old cap made the 13px floor (NFR-4.3)
    // unreachable at any zoom level, on desktop and on a 375px phone alike.
    const zoom = d3
      .zoom()
      .scaleExtent([0.35, 30])
      .on('zoom', (event) => viewport.attr('transform', event.transform));

    // Open at a legible scale over the emphasised union rather than at a
    // whole-chart fit nobody can read. Reset returns here, not to identity.
    // Centre on the emphasised *marriage* — the archive's centre of gravity.
    // Averaging every emphasised plate would include the far-off roots and
    // land the opening view on blank paper between them.
    const emphasised = nodes.filter((n) => n.emphasis);
    const emphasisedCouple = emphasised.filter((n) => n.data.spouse != null);
    const focusOn = emphasisedCouple.length
      ? emphasisedCouple
      : emphasised.length
        ? emphasised
        : nodes;
    const focal = {
      x: d3.mean(focusOn, (n) => n.x),
      y: d3.mean(focusOn, (n) => n.y),
    };
    const box = svgRef.current.getBoundingClientRect();
    const fitScale =
      box.width && box.height ? Math.min(box.width / width, box.height / height) : 1;
    const legible = fitScale
      ? Math.min(Math.max(MIN_LEGIBLE_PX / (NAME_SIZE * fitScale), 1), 30)
      : 1;
    // The viewBox centre is where the focal point has to land.
    const home = d3.zoomIdentity
      .translate(minX + width / 2 - legible * focal.x, minY + height / 2 - legible * focal.y)
      .scale(legible);

    svg.call(zoom);
    svg.call(zoom.transform, home);
    // Double-click to reset rather than d3's default zoom-in.
    svg.on('dblclick.zoom', null);
    svg.on('dblclick', () => {
      svg.transition().duration(500).call(zoom.transform, home);
    });
    }

    draw();

    // Name wrapping is measured with getComputedTextLength, so a first paint
    // in the fallback serif breaks lines in the wrong places and a long name
    // spills past its frame. Redraw once the display serif has landed.
    if (document.fonts && document.fonts.status !== 'loaded') {
      document.fonts.ready.then(() => {
        if (!cancelled) draw();
      });
    }

    return () => {
      cancelled = true;
      svg.on('.zoom', null);
      svg.selectAll('*').remove();
    };
  }, [graph, onSelect]);

  return (
    <figure ref={wrapperRef} className="rounded-2xl bg-surface-low p-2 shadow-lift">
      <svg
        ref={svgRef}
        className="tree-canvas h-[70vh] w-full touch-none select-none"
        aria-label="Interactive family tree"
      />
      <figcaption className="px-4 pb-3 pt-1 text-center font-body text-xs text-ink-faint">
        Drag to pan &middot; scroll to zoom &middot; double-click to reset &middot;
        select a nameplate to read their story
      </figcaption>
    </figure>
  );
}

/* ---------------------------------------------------------------------------
 * Watermark geometry. Inline paths rather than raster art: crisp at any zoom,
 * no network request, and generated once at module load.
 * ------------------------------------------------------------------------ */

/** A bare, sweeping tree built by recursive tapered limbs, drawn as one path. */
function roseTreePath() {
  const segments = [];
  const limb = (x, y, angle, length, thickness, depth) => {
    if (depth === 0 || thickness < 0.6) return;
    const x2 = x + Math.cos(angle) * length;
    const y2 = y + Math.sin(angle) * length;
    // Bow each limb slightly so the silhouette reads as grown, not diagrammed.
    const bow = length * 0.16;
    const cx = (x + x2) / 2 + Math.cos(angle + Math.PI / 2) * bow;
    const cy = (y + y2) / 2 + Math.sin(angle + Math.PI / 2) * bow;
    const nx = Math.sin(angle) * (thickness / 2);
    const ny = -Math.cos(angle) * (thickness / 2);
    const tip = thickness * 0.62;
    const tx = Math.sin(angle) * (tip / 2);
    const ty = -Math.cos(angle) * (tip / 2);
    segments.push(
      `M${x + nx},${y + ny}Q${cx + nx},${cy + ny} ${x2 + tx},${y2 + ty}` +
        `L${x2 - tx},${y2 - ty}Q${cx - nx},${cy - ny} ${x - nx},${y - ny}Z`,
    );
    limb(x2, y2, angle - 0.44, length * 0.76, tip, depth - 1);
    limb(x2, y2, angle + 0.38, length * 0.72, tip, depth - 1);
  };
  // Trunk rises from the lower left and leans into the page.
  limb(150, 0, -Math.PI / 2 + 0.06, 150, 46, 7);
  return segments.join('');
}

/** A leafy branch for the upper-right corner: one stem, leaves along it. */
const leafBranch = (() => {
  const stem = 'M0,0 C-60,18 -130,42 -200,96 C-240,128 -262,168 -272,214';
  const leaves = [];
  // Sampled off the stem curve at even intervals, alternating side to side.
  const points = [
    [-38, 12], [-84, 26], [-128, 44], [-166, 68],
    [-198, 98], [-224, 134], [-244, 172], [-258, 206],
  ];
  points.forEach(([x, y], index) => {
    const flip = index % 2 === 0 ? 1 : -1;
    leaves.push([x - 26 * flip, y - 20 * flip, index % 2 === 0 ? -34 : 46]);
    leaves.push([x + 12 * flip, y + 24 * flip, index % 2 === 0 ? 58 : -22]);
  });
  return { stem, leaves };
})();
