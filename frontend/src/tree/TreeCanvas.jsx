import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const NODE_RADIUS = 34;
const H_SPACING = 150; // horizontal gap between siblings
const V_SPACING = 190; // vertical gap between generations
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

export default function TreeCanvas({ roots, onSelect }) {
  const svgRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // d3.hierarchy needs a single root. When the archive records more than one
    // origin line, they hang off a synthetic root that is never drawn.
    const hasSyntheticRoot = roots.length > 1;
    const source = hasSyntheticRoot
      ? { id: '__root__', full_name: '', children: roots }
      : roots[0];

    const hierarchy = d3.hierarchy(source, (node) => node.children);
    d3.tree().nodeSize([H_SPACING, V_SPACING])(hierarchy);

    const nodes = hierarchy.descendants().filter((node) => node.data.id !== '__root__');
    const links = hierarchy
      .links()
      .filter((link) => link.source.data.id !== '__root__');

    // Fit the viewBox to the laid-out tree rather than a fixed canvas size.
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

    // ---- Links: soft vertical curves, drawn beneath the nodes ----
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
          .x((node) => node.x)
          .y((node) => node.y),
      );

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
  }, [roots, onSelect]);

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
