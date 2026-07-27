"""Builds the full family graph (members + unions + spouse links) for the frontend."""
from collections import defaultdict

from .models import FamilyMember
from .serializers import FamilyMemberNodeSerializer


def build_family_graph():
    """Graph-shaped payload for a two-parent + spouse family tree.

    {
      "members": [...],
      "unions": [{"id": "u-<father_id>-<mother_id>", "father_id": ..., "mother_id": ..., "child_ids": [...]}],
      "spouse_links": [{"source": id, "target": id}],
    }

    A union groups children by (father_id, mother_id), including unions
    where only one parent is known (the other is null). Spouse links come
    from the explicit `spouse` relationship, de-duplicated per pair.
    """
    members = list(FamilyMember.objects.all())

    child_ids_by_parent_pair = defaultdict(list)
    for member in members:
        if member.father_id is None and member.mother_id is None:
            continue
        child_ids_by_parent_pair[(member.father_id, member.mother_id)].append(member.id)

    unions = [
        {
            'id': f'u-{father_id}-{mother_id}',
            'father_id': father_id,
            'mother_id': mother_id,
            'child_ids': child_ids,
        }
        for (father_id, mother_id), child_ids in child_ids_by_parent_pair.items()
    ]

    seen_pairs = set()
    spouse_links = []
    for member in members:
        if member.spouse_id is None:
            continue
        pair = tuple(sorted((member.id, member.spouse_id)))
        if pair in seen_pairs:
            continue
        seen_pairs.add(pair)
        spouse_links.append({'source': pair[0], 'target': pair[1]})

    return {
        'members': FamilyMemberNodeSerializer(members, many=True).data,
        'unions': unions,
        'spouse_links': spouse_links,
    }
