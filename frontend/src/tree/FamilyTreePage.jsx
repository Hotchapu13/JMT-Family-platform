import { useEffect, useState } from 'react';

import { getFamilyTree } from '../js/api.js';
import TreeCanvas from './TreeCanvas.jsx';
import MemberModal from './MemberModal.jsx';

// TEMPORARY COMPATIBILITY SHIM
// -----------------------------------------------------------------------
// The backend now returns a graph-shaped payload
// ({ members, unions, spouse_links }) that models two parents and spouse
// links, since a single `parent` FK can no longer represent that. This
// component still only renders TreeCanvas's single-hierarchy D3 layout,
// so we collapse the graph back into a father-line nested tree here
// (falling back to mother when a member has no father on record).
// Mother-only branches, multi-parent unions, and spouse links are not
// represented in this view yet — TreeCanvas needs a proper graph layout
// rewrite to show those.
function graphToFatherLineRoots(graph) {
  const members = Array.isArray(graph?.members) ? graph.members : [];
  const byId = new Map(members.map((member) => [member.id, { ...member, children: [] }]));

  const roots = [];
  for (const member of byId.values()) {
    const parentId = member.father ?? member.mother;
    const parent = parentId != null ? byId.get(parentId) : null;
    if (parent) {
      parent.children.push(member);
    } else {
      roots.push(member);
    }
  }
  return roots;
}

export default function FamilyTreePage() {
  const [status, setStatus] = useState('loading');
  const [roots, setRoots] = useState([]);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    getFamilyTree()
      .then((data) => {
        if (cancelled) return;
        // The endpoint returns a graph payload; collapse it to father-line
        // roots for TreeCanvas until it's rewritten for the full graph.
        setRoots(graphToFatherLineRoots(data));
        setStatus('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err);
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center py-32 text-center">
        <span className="block h-8 w-8 animate-spin rounded-full border-2 border-outline border-t-primary" />
        <p className="mt-5 font-display text-sm italic text-ink-faint">
          Tracing the lineage…
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="py-32 text-center">
        <p className="font-display text-lg text-ink-soft">
          The family tree could not be opened.
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-faint">
          {error?.message || 'Please try again in a moment.'}
        </p>
      </div>
    );
  }

  if (!roots.length) {
    return (
      <div className="py-32 text-center">
        <p className="font-display text-lg text-ink-soft">
          No family members have been recorded yet.
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-faint">
          The curator has not added anyone to the tree so far.
        </p>
      </div>
    );
  }

  return (
    <>
      <TreeCanvas roots={roots} onSelect={setSelectedId} />
      {selectedId !== null && (
        <MemberModal memberId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </>
  );
}
