"""Seeds the JMT family tree from the paper chart.

This migration is a SNAPSHOT of the hand-drawn family tree chart, transcribed
as-is. It is deliberately dumb: names, parent links and marriages are literal
constants below so a human can read and correct them without reading any
migration logic.

Later corrections must be made in NEW migrations, never by editing this file.
Editing a migration that has already run leaves every deployed database out of
sync with the code, and the corrections are themselves part of the archive's
history — the Editor-in-Chief should be able to see what the paper chart said
and what was fixed afterwards.

Assumptions made during transcription (flagged rather than silently resolved):

* The chart records no gender for the two roots, Rukondo and Mushokye, nor for
  Ganshabira. They are assigned as `father` of their children purely because
  the schema needs one of the two parent FKs; this is a placeholder, not a
  claim about the person.
* `joined_by_marriage` is set for everyone who has no parents on the chart and
  is attached to a blood descendant by marriage: Fulmera B Kishunju, Nzenia F
  Makorongo, and the seven Generation 4 spouses — nine people in all. Note
  that these nine ALSO have no parents, so "has no parents" on its own does
  not identify the two blood roots; "no parents and not married-in" does.
* Three names are ambiguous on the chart where a line appears to have wrapped.
  They are transcribed literally and marked `# TODO CONFIRM` below.
* No birth or death dates exist on the chart, so `date_of_birth` and
  `date_of_death` stay null for everyone. Deceased status is carried by
  `is_deceased`, which is the authoritative flag (FR-2.3).
"""
from django.db import migrations

# --- Pass 1 data: (full_name, is_deceased, joined_by_marriage) ---------------
# All 83 full_name values are unique, which is what makes this migration
# re-runnable via get_or_create.

MEMBERS = [
    # Generation 0 — the two independent roots.
    ('Rukondo', True, False),
    ('Mushokye', True, False),

    # Generation 1 — children of Rukondo.
    ('Ganshabira', True, False),
    ('Elizabeth Nyanzigye', True, False),
    ('Agnes Tibazaire', True, False),
    ('Kagurusi', True, False),
    ('Kabiito', True, False),

    # Generation 1 — child of Mushokye, and his married-in wife.
    ('Raphael Kishunju', True, False),
    ('Fulmera B Kishunju', True, True),

    # Generation 2 — children of Ganshabira.
    ('Annania G Makorogo', True, False),
    ('Bwataha', True, False),
    ('Matiansi Mushongora', True, False),
    ('Protazio Kazingo', True, False),
    ('Stella Nyazagara', True, False),
    ('Sebastiao Kabiyamba', True, False),
    ('Nzera G. Gaareeba', True, False),
    ('Maria Kamazoobi', True, False),
    ('Suzario Birakwate', True, False),
    ('Lazio Ruuha', True, False),
    ('Bihekeine Serapio', True, False),
    # Married into the Makorogo line.
    ('Nzenia F Makorongo', True, True),

    # Generation 2 — children of Raphael Kishunju & Fulmera B Kishunju.
    ('Specioza K Komukyera', False, False),
    ('Emmanuel Kishunju', True, False),
    ('Vivian Bashemereirwe', False, False),
    ('Raphael Kamugisha', True, False),
    ('Aloysius Baitwababo', True, False),
    ('Remmy Tinkamanyire', True, False),
    ('Joseph Owakubariho', True, False),
    # "Maama" — one half of the central union of the archive.
    ('Maria K. Mbabazi', False, False),

    # Generation 3 — children of Annania G Makorogo & Nzenia F Makorongo.
    # Januario is the other half of the central union; he is a blood
    # descendant of his own line, so joined_by_marriage stays False.
    ('Januario M Tibamanya', True, False),
    ('Susana Bucwagure', True, False),
    ('Samuel Byotaniho', True, False),
    ('Bonny Barugahare', True, False),
    ('Nzerena Nsansirwoha', True, False),
    ('Joseph Kamagara', True, False),
    ('Constancio Kembaya', False, False),
    ('Evangilista Komushana', True, False),

    # Generation 4 — children of Januario M Tibamanya & Maria K. Mbabazi,
    # each followed by their married-in spouse.
    ('Ibra Muhumuza', False, False),
    ('Mariam Tusingwire', False, True),
    ('Edith Nyangoma', False, False),
    ('Robert Nkore', True, True),
    ('Lydia Nyakato', True, False),
    ('Nyamwijja Jackline', True, False),
    ('Alice Betty Kiconco', False, False),
    ('Fred Kashaija', False, True),
    ('Patrick Byaruhanga', True, False),
    ('Dinnah Nanyonjo', False, True),
    ('Grace Busingye Rugambwa', False, False),
    ('Innocent Rugambwa', False, True),
    ('Monic Nuwagaba', False, False),
    ('Edmond Ndyaremwaki', False, True),
    ('Jude Julius Tibamanya', False, False),
    ('Angella Namaganda', False, True),

    # Generation 5 — grandchildren. None have a recorded spouse or children.
    # Ibra Muhumuza & Mariam Tusingwire.
    ('Immaculate Nabaasa', False, False),
    ('Bill J. Nuwagaba', False, False),
    # TODO CONFIRM: transcribed line-by-line from the chart. These two may
    # instead be "Godswill Agaba" and "Anna Mariam Mbabazi" if the name
    # wrapped across two lines — which would make this a family of three.
    ('Godswill Agaba Anna', False, False),
    ('Mariam Mbabazi', False, False),

    # Robert Nkore & Edith Nyangoma.
    ('Gloria Buzare', False, False),
    ('Gilbert Tayebwa', False, False),
    ('Joane Kyomugasho', False, False),
    ('Gilvazi Nkuba', False, False),
    ('Adrine Kanyesigye', False, False),
    ('Agatha Ninsiima', False, False),

    # Lydia Nyakato.
    ('Moureen Nabasa', True, False),

    # Nyamwijja Jackline.
    # TODO CONFIRM: the daughter's name is one letter off her mother's.
    # Possibly a chart typo for "Nyamwijja Jackline".
    ('Nyamwijja Jacklime', True, False),

    # Fred Kashaija & Alice Betty Kiconco.
    ('Brian Agaba', False, False),
    ('Esther Kashaija', False, False),
    ('Timothy Kashaija', False, False),

    # Patrick Byaruhanga & Dinnah Nanyonjo.
    ('Ritah Tushabe', False, False),
    ('Micheal Nyesiga', False, False),
    ('Anita Byaruhanga', False, False),
    ('Innocent Byaruhanga', False, False),

    # Innocent Rugambwa & Grace Busingye Rugambwa.
    ('Rosemary Rugambwa', False, False),
    ('Gloria Rugambwa', False, False),
    ('Emmanuel Rugambwa', False, False),
    ('Joseph Rugambwa', False, False),

    # Edmond Ndyaremwaki & Monic Nuwagaba.
    ('Ester Nagawa', False, False),
    ('Maria V. Nakafero', False, False),
    ('Abia Mirembe', False, False),

    # Jude Julius Tibamanya & Angella Namaganda.
    ('Louis Mwebembezi', False, False),
    ('Gema Akankunda', False, False),
    # TODO CONFIRM: "Redemption" and "Kemigisha" may be a single person,
    # "Redemption Kemigisha", wrapped across two lines.
    ('Redemption', False, False),
    ('Kemigisha', False, False),
]

# --- Pass 2 data: child full_name -> (father full_name, mother full_name) ----
# None means the chart records no parent of that sex. Where a couple has
# children the male partner is father and the female partner is mother; where
# gender is not recorded (Rukondo, Mushokye, Ganshabira) the single known
# parent is filed under `father` — see the assumptions note at the top.

PARENTS = {
    # Children of Rukondo.
    'Ganshabira': ('Rukondo', None),
    'Elizabeth Nyanzigye': ('Rukondo', None),
    'Agnes Tibazaire': ('Rukondo', None),
    'Kagurusi': ('Rukondo', None),
    'Kabiito': ('Rukondo', None),

    # Child of Mushokye.
    'Raphael Kishunju': ('Mushokye', None),

    # Children of Ganshabira.
    'Annania G Makorogo': ('Ganshabira', None),
    'Bwataha': ('Ganshabira', None),
    'Matiansi Mushongora': ('Ganshabira', None),
    'Protazio Kazingo': ('Ganshabira', None),
    'Stella Nyazagara': ('Ganshabira', None),
    'Sebastiao Kabiyamba': ('Ganshabira', None),
    'Nzera G. Gaareeba': ('Ganshabira', None),
    'Maria Kamazoobi': ('Ganshabira', None),
    'Suzario Birakwate': ('Ganshabira', None),
    'Lazio Ruuha': ('Ganshabira', None),
    'Bihekeine Serapio': ('Ganshabira', None),

    # Children of Raphael Kishunju & Fulmera B Kishunju.
    'Specioza K Komukyera': ('Raphael Kishunju', 'Fulmera B Kishunju'),
    'Emmanuel Kishunju': ('Raphael Kishunju', 'Fulmera B Kishunju'),
    'Vivian Bashemereirwe': ('Raphael Kishunju', 'Fulmera B Kishunju'),
    'Raphael Kamugisha': ('Raphael Kishunju', 'Fulmera B Kishunju'),
    'Aloysius Baitwababo': ('Raphael Kishunju', 'Fulmera B Kishunju'),
    'Remmy Tinkamanyire': ('Raphael Kishunju', 'Fulmera B Kishunju'),
    'Joseph Owakubariho': ('Raphael Kishunju', 'Fulmera B Kishunju'),
    'Maria K. Mbabazi': ('Raphael Kishunju', 'Fulmera B Kishunju'),

    # Children of Annania G Makorogo & Nzenia F Makorongo.
    'Januario M Tibamanya': ('Annania G Makorogo', 'Nzenia F Makorongo'),
    'Susana Bucwagure': ('Annania G Makorogo', 'Nzenia F Makorongo'),
    'Samuel Byotaniho': ('Annania G Makorogo', 'Nzenia F Makorongo'),
    'Bonny Barugahare': ('Annania G Makorogo', 'Nzenia F Makorongo'),
    'Nzerena Nsansirwoha': ('Annania G Makorogo', 'Nzenia F Makorongo'),
    'Joseph Kamagara': ('Annania G Makorogo', 'Nzenia F Makorongo'),
    'Constancio Kembaya': ('Annania G Makorogo', 'Nzenia F Makorongo'),
    'Evangilista Komushana': ('Annania G Makorogo', 'Nzenia F Makorongo'),

    # Children of Januario M Tibamanya & Maria K. Mbabazi.
    'Ibra Muhumuza': ('Januario M Tibamanya', 'Maria K. Mbabazi'),
    'Edith Nyangoma': ('Januario M Tibamanya', 'Maria K. Mbabazi'),
    'Lydia Nyakato': ('Januario M Tibamanya', 'Maria K. Mbabazi'),
    'Nyamwijja Jackline': ('Januario M Tibamanya', 'Maria K. Mbabazi'),
    'Alice Betty Kiconco': ('Januario M Tibamanya', 'Maria K. Mbabazi'),
    'Patrick Byaruhanga': ('Januario M Tibamanya', 'Maria K. Mbabazi'),
    'Grace Busingye Rugambwa': ('Januario M Tibamanya', 'Maria K. Mbabazi'),
    'Monic Nuwagaba': ('Januario M Tibamanya', 'Maria K. Mbabazi'),
    'Jude Julius Tibamanya': ('Januario M Tibamanya', 'Maria K. Mbabazi'),

    # Generation 5 — grandchildren.
    'Immaculate Nabaasa': ('Ibra Muhumuza', 'Mariam Tusingwire'),
    'Bill J. Nuwagaba': ('Ibra Muhumuza', 'Mariam Tusingwire'),
    'Godswill Agaba Anna': ('Ibra Muhumuza', 'Mariam Tusingwire'),
    'Mariam Mbabazi': ('Ibra Muhumuza', 'Mariam Tusingwire'),

    'Gloria Buzare': ('Robert Nkore', 'Edith Nyangoma'),
    'Gilbert Tayebwa': ('Robert Nkore', 'Edith Nyangoma'),
    'Joane Kyomugasho': ('Robert Nkore', 'Edith Nyangoma'),
    'Gilvazi Nkuba': ('Robert Nkore', 'Edith Nyangoma'),
    'Adrine Kanyesigye': ('Robert Nkore', 'Edith Nyangoma'),
    'Agatha Ninsiima': ('Robert Nkore', 'Edith Nyangoma'),

    # Lydia Nyakato and Nyamwijja Jackline have no recorded partner, so their
    # children carry a mother FK only.
    'Moureen Nabasa': (None, 'Lydia Nyakato'),
    'Nyamwijja Jacklime': (None, 'Nyamwijja Jackline'),

    'Brian Agaba': ('Fred Kashaija', 'Alice Betty Kiconco'),
    'Esther Kashaija': ('Fred Kashaija', 'Alice Betty Kiconco'),
    'Timothy Kashaija': ('Fred Kashaija', 'Alice Betty Kiconco'),

    'Ritah Tushabe': ('Patrick Byaruhanga', 'Dinnah Nanyonjo'),
    'Micheal Nyesiga': ('Patrick Byaruhanga', 'Dinnah Nanyonjo'),
    'Anita Byaruhanga': ('Patrick Byaruhanga', 'Dinnah Nanyonjo'),
    'Innocent Byaruhanga': ('Patrick Byaruhanga', 'Dinnah Nanyonjo'),

    'Rosemary Rugambwa': ('Innocent Rugambwa', 'Grace Busingye Rugambwa'),
    'Gloria Rugambwa': ('Innocent Rugambwa', 'Grace Busingye Rugambwa'),
    'Emmanuel Rugambwa': ('Innocent Rugambwa', 'Grace Busingye Rugambwa'),
    'Joseph Rugambwa': ('Innocent Rugambwa', 'Grace Busingye Rugambwa'),

    'Ester Nagawa': ('Edmond Ndyaremwaki', 'Monic Nuwagaba'),
    'Maria V. Nakafero': ('Edmond Ndyaremwaki', 'Monic Nuwagaba'),
    'Abia Mirembe': ('Edmond Ndyaremwaki', 'Monic Nuwagaba'),

    'Louis Mwebembezi': ('Jude Julius Tibamanya', 'Angella Namaganda'),
    'Gema Akankunda': ('Jude Julius Tibamanya', 'Angella Namaganda'),
    'Redemption': ('Jude Julius Tibamanya', 'Angella Namaganda'),
    'Kemigisha': ('Jude Julius Tibamanya', 'Angella Namaganda'),
}

# --- Pass 3 data: marriages, written once and applied in both directions -----

SPOUSES = [
    ('Raphael Kishunju', 'Fulmera B Kishunju'),
    ('Annania G Makorogo', 'Nzenia F Makorongo'),
    # The central union of the archive.
    ('Januario M Tibamanya', 'Maria K. Mbabazi'),
    ('Ibra Muhumuza', 'Mariam Tusingwire'),
    ('Robert Nkore', 'Edith Nyangoma'),
    ('Fred Kashaija', 'Alice Betty Kiconco'),
    ('Patrick Byaruhanga', 'Dinnah Nanyonjo'),
    ('Innocent Rugambwa', 'Grace Busingye Rugambwa'),
    ('Edmond Ndyaremwaki', 'Monic Nuwagaba'),
    ('Jude Julius Tibamanya', 'Angella Namaganda'),
]


def forwards(apps, schema_editor):
    FamilyMember = apps.get_model('family_tree', 'FamilyMember')

    # Pass 1 — every person, with all foreign keys left null so ordering in
    # MEMBERS never matters. get_or_create keeps a re-run against a partially
    # seeded database from producing duplicates.
    for full_name, is_deceased, joined_by_marriage in MEMBERS:
        FamilyMember.objects.get_or_create(
            full_name=full_name,
            defaults={
                'is_deceased': is_deceased,
                'joined_by_marriage': joined_by_marriage,
                'title': '',
                'biography': '',
                'date_of_birth': None,
                'date_of_death': None,
                'profile_image': None,
            },
        )

    names = [full_name for full_name, _, _ in MEMBERS]
    by_name = {
        member.full_name: member
        for member in FamilyMember.objects.filter(full_name__in=names)
    }

    # Pass 2 — parent links.
    for child_name, (father_name, mother_name) in PARENTS.items():
        child = by_name[child_name]
        child.father_id = by_name[father_name].id if father_name else None
        child.mother_id = by_name[mother_name].id if mother_name else None
    FamilyMember.objects.bulk_update(
        [by_name[name] for name in PARENTS], ['father_id', 'mother_id']
    )

    # Pass 3 — marriages, set on both partners so the relation is symmetric.
    married = []
    for left_name, right_name in SPOUSES:
        left = by_name[left_name]
        right = by_name[right_name]
        left.spouse_id = right.id
        right.spouse_id = left.id
        married.extend([left, right])
    FamilyMember.objects.bulk_update(married, ['spouse_id'])


def reverse(apps, schema_editor):
    """Removes exactly the members this migration seeded, by full_name."""
    FamilyMember = apps.get_model('family_tree', 'FamilyMember')
    names = [full_name for full_name, _, _ in MEMBERS]

    # Clear the self-referential FKs first. on_delete=SET_NULL would handle
    # this, but only for rows Django loads into the collector — clearing up
    # front keeps any member outside this snapshot from holding a dangling
    # reference mid-delete.
    seeded = FamilyMember.objects.filter(full_name__in=names)
    seeded.update(father=None, mother=None, spouse=None)
    FamilyMember.objects.filter(spouse__full_name__in=names).update(spouse=None)
    FamilyMember.objects.filter(father__full_name__in=names).update(father=None)
    FamilyMember.objects.filter(mother__full_name__in=names).update(mother=None)

    FamilyMember.objects.filter(full_name__in=names).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('family_tree', '0006_familymember_is_deceased'),
    ]

    operations = [
        migrations.RunPython(forwards, reverse),
    ]
