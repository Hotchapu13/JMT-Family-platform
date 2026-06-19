"""Builds the full family tree as a nested structure for the D3.js frontend."""
from collections import defaultdict

from .models import FamilyMember
from .serializers import FamilyMemberNodeSerializer


def build_family_tree():
    members = list(FamilyMember.objects.all())
    children_by_parent_id = defaultdict(list)
    for member in members:
        children_by_parent_id[member.parent_id].append(member)

    def serialize_node(member):
        node = FamilyMemberNodeSerializer(member).data
        node['children'] = [
            serialize_node(child) for child in children_by_parent_id.get(member.id, [])
        ]
        return node

    roots = children_by_parent_id.get(None, [])
    return [serialize_node(root) for root in roots]
