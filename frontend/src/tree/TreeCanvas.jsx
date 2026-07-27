import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const NODE_RADIUS = 34;
const H_SPACING = 150; // horizontal gap between sibling/leaf slots
const V_SPACING = 190; // vertical gap between generations
const SPOUSE_GAP = 1; // leaf-slot gap between spouses
const MARGIN = { top: 70, right: 60, bottom: 90, left: 60 };

/** A member's initials, used when no profile photograph exists. */
function initialsOf(name) {
  return String(name || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase();
}

function lifespanOf({ date_of_birth: birth, date_of_death: death }) {
  const born = birth ? new Date(birth).getFullYear() : null;
  const died = death ? new Date(death).getFullYear() : null;
  if (born && died) return `${born} — ${died}`;
  if (born) return `b. ${born}`;
  if (died) return `d. ${died}`;
  return '';
}

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

  const nodes = members.map((member) => ({
    data: member,
    x: xById.get(member.id) * H_SPACING,
    y: depthById.get(member.id) * V_SPACING,
  }));
  const nodeById = new Map(nodes.map((node) => [node.data.id, node]));

  // ---- Links: union midpoint (or the single known parent) down to each child ----
  const links = [];
  unions.forEach((union) => {
    const father = union.father_id != null ? nodeById.get(union.father_id) : null;
    const mother = union.mother_id != null ? nodeById.get(union.mother_id) : null;
    const source = father && mother ? { x: (father.x + mother.x) / 2, y: father.y } : father || mother;
    if (!source) return;
    union.child_ids.forEach((childId) => {
      const target = nodeById.get(childId);
      if (target) links.push({ source, target });
    });
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

  return { nodes, links, spouseSegments };
}

export default function TreeCanvas({ graph, onSelect }) {
  const svgRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { nodes, links, spouseSegments } = layoutGraph(graph);
    if (!nodes.length) return undefined;

    const xs = nodes.map((node) => node.x);
    const ys = nodes.map((node) => node.y);
    const minX = Math.min(...xs) - MARGIN.left - NODE_RADIUS;
    const maxX = Math.max(...xs) + MARGIN.right + NODE_RADIUS;
    const minY = Math.min(...ys) - MARGIN.top;
    const maxY = Math.max(...ys) + MARGIN.bottom;
    const width = maxX - minX;
    const height = maxY - minY;

    svg.attr('viewBox', [minX, minY, width, height]).attr('role', 'tree');

    const viewport = svg.append('g');

    // ---- Parent-child links: soft vertical curves, drawn beneath the nodes ----
    viewport
      .append('g')
      .attr('fill', 'none')
      .attr('stroke', '#d8cbb8')
      .attr('stroke-width', 1.5)
      .selectAll('path')
      .data(links)
      .join('path')
      .attr(
        'd',
        d3
          .linkVertical()
          .x((d) => d.x)
          .y((d) => d.y),
      );

    // ---- Spouse links: a straight tie between partners on the same row ----
    viewport
      .append('g')
      .attr('stroke', '#a23900')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '3,3')
      .selectAll('line')
      .data(spouseSegments)
      .join('line')
      .attr('x1', (d) => d.a.x)
      .attr('y1', (d) => d.a.y)
      .attr('x2', (d) => d.b.x)
      .attr('y2', (d) => d.b.y);

    // ---- Nodes ----
    const node = viewport
      .append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
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

    // Clip each portrait to its circle.
    const defs = svg.append('defs');
    defs
      .selectAll('clipPath')
      .data(nodes.filter((d) => d.data.profile_image))
      .join('clipPath')
      .attr('id', (d) => `portrait-${d.data.id}`)
      .append('circle')
      .attr('r', NODE_RADIUS);

    node
      .append('circle')
      .attr('r', NODE_RADIUS)
      .attr('fill', '#f5ebdc')
      .attr('stroke', (d) => (d.data.is_deceased ? '#4e6352' : '#a23900'))
      .attr('stroke-width', 2)
      .style('transition', 'stroke 0.25s');

    // Portrait, or initials when there is no photograph.
    node
      .filter((d) => Boolean(d.data.profile_image))
      .append('image')
      .attr('href', (d) => d.data.profile_image)
      .attr('x', -NODE_RADIUS)
      .attr('y', -NODE_RADIUS)
      .attr('width', NODE_RADIUS * 2)
      .attr('height', NODE_RADIUS * 2)
      .attr('preserveAspectRatio', 'xMidYMid slice')
      .attr('clip-path', (d) => `url(#portrait-${d.data.id})`);

    node
      .filter((d) => !d.data.profile_image)
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-family', 'Noto Serif, serif')
      .attr('font-size', 18)
      .attr('font-weight', 700)
      .attr('fill', '#a23900')
      .text((d) => initialsOf(d.data.full_name));

    // Name
    node
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('y', NODE_RADIUS + 24)
      .attr('font-family', 'Noto Serif, serif')
      .attr('font-size', 15)
      .attr('font-weight', 600)
      .attr('fill', '#2c2c2c')
      .text((d) => d.data.full_name);

    // Title / role
    node
      .filter((d) => Boolean(d.data.title))
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('y', NODE_RADIUS + 42)
      .attr('font-family', 'Work Sans, sans-serif')
      .attr('font-size', 10)
      .attr('letter-spacing', '0.1em')
      .attr('fill', '#a23900')
      .text((d) => String(d.data.title).toUpperCase());

    // Lifespan
    node
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('y', (d) => NODE_RADIUS + (d.data.title ? 58 : 40))
      .attr('font-family', 'Work Sans, sans-serif')
      .attr('font-size', 11)
      .attr('fill', '#8a8177')
      .text((d) => lifespanOf(d.data));

    // Hover affordance
    node
      .on('mouseenter', function () {
        d3.select(this).select('circle').attr('stroke-width', 3.5);
      })
      .on('mouseleave', function () {
        d3.select(this).select('circle').attr('stroke-width', 2);
      });

    // ---- Pan & zoom ----
    const zoom = d3
      .zoom()
      .scaleExtent([0.35, 2.5])
      .on('zoom', (event) => viewport.attr('transform', event.transform));

    svg.call(zoom);
    // Double-click to reset rather than d3's default zoom-in.
    svg.on('dblclick.zoom', null);
    svg.on('dblclick', () => {
      svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
    });

    return () => {
      svg.on('.zoom', null);
      svg.selectAll('*').remove();
    };
  }, [graph, onSelect]);

  return (
    <figure ref={wrapperRef} className="rounded-2xl bg-surface-low p-2 shadow-lift">
      <svg
        ref={svgRef}
        className="h-[70vh] w-full touch-none select-none"
        aria-label="Interactive family tree"
      />
      <figcaption className="px-4 pb-3 pt-1 text-center font-body text-xs text-ink-faint">
        Drag to pan &middot; scroll to zoom &middot; double-click to reset &middot;
        select a portrait to read their story
      </figcaption>
    </figure>
  );
}
