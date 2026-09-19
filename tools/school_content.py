# -*- coding: utf-8 -*-
u"""How school feels: eleven subjects asked three ways.

WHY THIS IS NOT "WHICH SUBJECTS ARE YOU GOOD AT"
------------------------------------------------
subjects.py already models what a student can DO, from marks, and says plainly
that a mark beats an opinion. This bank asks something a mark cannot see. Two
students with a 5 in mathematics are not the same student if one of them dreads
every lesson, and the one who dreads it will not choose it at eighteen no matter
what the mark says.

So each subject is asked three times, on the three legs of expectancy-value:

    ability     can I do this                 "even the hard parts"
    interest    do I want to do this          "I look forward to the lesson"
    cost        what does it take out of me   "I am anxious even when prepared"

Cost is the leg that is usually left out, and it is the one that explains the
student who is good at a subject and drops it anyway. It is REVERSE scored: a
high answer is a high cost, which counts against the subject, not for it.

ELEVEN SUBJECTS, THIRTY THREE ITEMS, GENERATED NOT TYPED
--------------------------------------------------------
Every item is one of three sentence frames with a subject name in it, so the
items are built here rather than listed. Typing thirty three sentences by hand
in three languages is thirty three chances for Uzbek chemistry to be asked about
interest while Russian chemistry is asked about cost. Generating them makes that
impossible: the frames are translated once and the keying is shared.

THE SUBJECT ORDER ROTATES BETWEEN SECTIONS
------------------------------------------
Asked in one order, a student meets mathematics three times in a row and starts
answering the pattern instead of the question. Each section therefore starts one
subject further along the list, which is not an arbitrary choice: with N
subjects a rotation of k leaves N - k questions between the closest repeated
pair, so the SMALLER the rotation the further apart a subject's three questions
end up. A rotation of one is the best a rotation can do, and it puts ten
questions between one mention of a subject and the next. school_check.py asserts
the distance rather than the shift, because the distance is the thing that
matters and the shift is only how it is obtained.
"""

# The agreement scale, identical to the personality bank in test.html. A student
# meets it twice in one sitting; a second wording for the same five points would
# read as a different scale and is not worth the words it would cost.
LABELS = [
    u'Qoʻshilmayman',
    u'Biroz qoʻshilmayman',
    u'Betarafman',
    u'Biroz qoʻshilaman',
    u'Qoʻshilaman',
]

# The subjects, their order and their names in all three languages come from
# subjects.py and are NOT restated here. That module already had them, the
# recommendation engine already reads them, and a second copy would let the
# results table call a subject one thing while the question called it another.
import subjects as _subjects

SUBJECTS = list(_subjects.SUBJECT_KEYS)

# facet -> (section heading, sentence frame). {s} takes the subject name.
#
# The Uzbek frames put the subject FIRST in all three, because a subject name
# sitting mid sentence has to be lower cased to read naturally and then no
# longer matches the name shown in the results table.
FACETS = [
    ('ability', u'Nimani uddalay olasiz',
     u'{s} fanining eng qiyin mavzularini ham uddalay olaman.'),
    ('interest', u'Nimani yoqtirasiz',
     u'{s} darslarini intiqlik bilan kutaman.'),
    ('cost', u'Nima sizga qiyin',
     u'{s} darsiga tayyorlanib borsam ham, baribir xavotirlanaman.'),
]

# Answering high on a cost item counts AGAINST the subject.
REVERSE = {'ability': False, 'interest': False, 'cost': True}

# Subjects to advance by at the start of each section. One, for the reason in
# the header: it maximises the gap, it does not minimise it.
ROTATION = 1

TITLE = u'Qaysi fanlar sizga mos'
BLURB = (u'Oʻn bitta maktab fani, uch xil savol: nimani uddalaysiz, nimani '
         u'yoqtirasiz va nima sizga qiyin. Baholaringiz haqida emas.')

import school_content_ru as _ru
import school_content_en as _en

BY_LANG = {'uz': None, 'ru': _ru, 'en': _en}


def _mod(lang):
    return BY_LANG[lang]


def names_for(lang):
    return _subjects.NAMES[lang]


def labels_for(lang):
    return LABELS if lang == 'uz' else _mod(lang).LABELS


def facets_for(lang):
    u"""[(facet, heading, frame)] paired to the Uzbek BY POSITION.

    A translation supplies headings and frames only. The facet keys, the item
    order and the reverse flags stay here, so no translation can move an item
    onto another facet.
    """
    if lang == 'uz':
        return [(f, h, t) for f, h, t in FACETS]
    tr = _mod(lang).FACETS
    if len(tr) != len(FACETS):
        raise ValueError('%s has %d facets, Uzbek has %d' % (lang, len(tr), len(FACETS)))
    return [(FACETS[i][0], tr[i][0], tr[i][1]) for i in range(len(FACETS))]


def title_for(lang):
    return (TITLE, BLURB) if lang == 'uz' else (_mod(lang).TITLE, _mod(lang).BLURB)


def items_for(lang):
    u"""The full bank: [{'s': subject, 'f': facet, 'r': reverse, 't': text}].

    Order is identical in every language because it is computed, not stored.
    """
    names = names_for(lang)
    out = []
    for index, (facet, _heading, frame) in enumerate(facets_for(lang)):
        shift = (index * ROTATION) % len(SUBJECTS)
        order = SUBJECTS[shift:] + SUBJECTS[:shift]
        for subject in order:
            out.append({
                's': subject,
                'f': facet,
                'r': 1 if REVERSE[facet] else 0,
                't': frame.format(s=names[subject]),
            })
    return out


def sections_for(lang):
    u"""[(facet, heading)] in the order the sections are asked."""
    return [(f, h) for f, h, _ in facets_for(lang)]
