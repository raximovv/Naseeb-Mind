# -*- coding: utf-8 -*-
u"""English rendering of the life-area content in life_content.py.

Same contract as life_content_ru.py: text only. Percentages come from the Uzbek
entry's trait weights, paired on by position, so a translation cannot move a
number. `careers` is (name, why).

Written for Uzbek students who read English comfortably: plain wording, nothing
that assumes growing up in an English-speaking country. Weaknesses are things
that happen TO the reader, never faults.
"""

LABELS = {
    'strong': u'Your strengths',
    'weak': u'Worth keeping an eye on',
    'career': u'The direction that suits you best',
    'main': u'Main direction',
    'minor': u'Extra',
    'minor_title': u'Alongside it, you can pick one of these three directions',
    # Result screen only -- see RESULT_CAREER_TITLE in life_content.py for why
    # this block stops ranking there and defers to "Directions".
    'result_career': u'Where these qualities tend to be useful',
    'result_note': (u'This is not a recommendation and not a ranking: just areas '
                    u'where these qualities are valued. Your actual suggestions '
                    u'are below, under “Directions”, that section '
                    u'also looks at your interests and your marks.'),
    'areas': {
        'family':  (u'At home',          u'At home and with the people close to you'),
        'school':  (u'At school',        u'In lessons, in exams and among classmates'),
        'friends': (u'In relationships', u'In friendship and close relationships'),
    },
}

LIFE = {

# ---------------------------------------------------------------------- Ijodkor
'E|O': {
 'family': {
  'strong': [
   (u'You bring the house to life', u'When you are home, it is never quiet.'),
   (u'You come up with the plan', u'The idea for what to do at the weekend usually starts with you.'),
   (u'You tell the story', u'You can make an ordinary day sound funny.'),
   (u'You play with the little ones', u'Your younger siblings are never bored with you.'),
   (u'You are open', u'You do not hide what happened to you from your family.'),
  ],
  'weak': [
   (u'Unfinished projects', u'The things you started pile up in the corner of the room.'),
   (u'Forgotten errands', u'Something interesting comes up and what you were asked to do slips your mind.'),
   (u'Cutting in', u'When you get excited you talk over people before they finish.'),
   (u'Hard to sit still at home', u'Quiet family evenings feel dull to you.'),
   (u'You and tidiness', u'Your room is always a mess, and it starts arguments.'),
  ],
 },
 'school': {
  'strong': [
   (u'Presenting', u'You feel free in front of a room.'),
   (u'Open-ended work', u'When the topic is yours to choose, your work is the one people remember.'),
   (u'In a discussion', u'Trading ideas is enjoyable for you, not stressful.'),
   (u'Waking the class up', u'One question from you brings a whole lesson to life.'),
   (u'Getting others interested', u'You can pull your classmates into a project.'),
  ],
  'weak': [
   (u'Deadlines', u'Plenty of ideas, not many finished pieces of work.'),
   (u'Drifting off', u'In class your mind wanders somewhere else.'),
   (u'Repetitive practice', u'Solving the same kind of problem ten times is painful for you.'),
   (u'A messy notebook', u'Later you cannot find what you wrote down yourself.'),
   (u'Marks below what you know', u'You know the material, but work you never handed in pulls the result down.'),
  ],
 },
 'friends': {
  'strong': [
   (u'The middle of the group', u'The mood lifts when you arrive.'),
   (u'You connect people', u'You introduce friends from different circles to each other.'),
   (u'Never dull', u'No two days with you are the same.'),
   (u'You get people going', u'You remind a friend of the plan they gave up on.'),
   (u'You warm up fast', u'You can find common ground with a stranger in a day.'),
  ],
  'weak': [
   (u'Many friends, few close ones', u'Everyone knows you; not many know you properly.'),
   (u'Forgotten arrangements', u'You agree to meet and then it goes out of your head.'),
   (u'Taking over the conversation', u'You enjoy talking so much that there is no room left for listening.'),
   (u'Cooling off quickly', u'A new group appears and the old friends are left to one side.'),
   (u'Avoiding being alone', u'To avoid being on your own you will join a group that does not suit you.'),
  ],
 },
 'careers': [
  (u'Design and visual work',
   u'Your ideas do not run out, and you are not afraid to show them to people.'),
  (u'Media, blogging, journalism',
   u'You stay yourself in front of a camera or a microphone.'),
  (u'Marketing and advertising',
   u'Getting people to catch a new idea is the whole of the job.'),
  (u'Acting and the stage',
   u'You feel free in front of an audience.'),
  (u'Teaching creative subjects',
   u'Nobody sleeps through your lesson. Only the register and the paperwork will bore you.'),
 ],
},

# --------------------------------------------------------------- Ishonchli Doʻst
'ES|A': {
 'family': {
  'strong': [
   (u"Peace at home", u"When an argument starts you do not raise your voice. Usually you are the first person to soften it."),
   (u"Trusted first", u"Your brother or sister tells you about a problem before anyone else, because they know it will not reach the adults."),
   (u"Help without being asked", u"If you can see someone is tired you do not wait to be asked. The person who washed up is usually you."),
   (u"Patience with older people", u"You listen to your grandmother tell the same story a third time without getting bored. Not many people can."),
   (u"A promise at home", u"What you promised your family, you remember. Even a small thing."),
  ],
  'weak': [
   (u"Hiding what you need", u"Saying \u201cI do not need anything\u201d often enough, you stop asking even when you really do."),
   (u"Changing the subject", u"Instead of settling a disagreement you steer the talk elsewhere. It does not go away: it collects."),
   (u"Carrying everyone else", u"\u201cIt is easier if I do it\u201d, so you do the housework yourself, and then cannot work out why you are tired."),
   (u"Not showing you are hurt", u"When something stings you go quiet. Your family does not know why, and it looks as though they have missed something."),
   (u"Hard to say no", u"You do what is asked even when it breaks your own plans. Afterwards it feels tight, because no time was left for you."),
  ],
 },
 'school': {
  'strong': [
   (u"Holding group work up", u"The part nobody took on is the part you finish at the end."),
   (u"Classmates trust you", u"Even the student who gets on with nobody opens up to you, because you do not judge."),
   (u"Calm in an exam", u"While everyone else is nervous you work at your usual speed. And you do not forget what you knew."),
   (u"How teachers see you", u"You do not push back and you keep your word, so the responsible job often comes to you."),
   (u"Slowly, but without stopping", u"Not in one night, but a little every day. That is how the result adds up by the end of the year."),
  ],
  'weak': [
   (u"Not asking questions", u"Asking about the part you did not follow feels awkward, as if you would hold the class up. Then that topic gets harder."),
   (u"Underrating yourself", u"You judge your work to be weaker than a classmate's. Most of the time that is not true."),
   (u"Standing back from leading", u"You hand the group leader's job to someone else, even when the team chose you."),
   (u"Giving way in an argument", u"If someone speaks with a firm tone you do not defend even a right answer."),
   (u"Doing it instead of helping", u"Instead of explaining, you do it yourself. They learn nothing and you work twice."),
  ],
 },
 'friends': {
  'strong': [
   (u"A real listener", u"You are not preparing your answer; you are actually listening. People notice at once."),
   (u"A secret stays with you", u"What is said to you goes no further. Your friends have tested that."),
   (u"You make peace", u"When two friends fall out, the one who talks to both is usually you."),
   (u"Friendship that lasts", u"Your friendships run for years. You are not the one who lets them go."),
   (u"No judgement", u"Even someone who got it wrong is not afraid to tell you. That is why they tell you."),
  ],
  'weak': [
   (u"Being taken advantage of", u"Someone who knows how kind you are can use it, and you are usually the last to notice."),
   (u"No boundary", u"Your phone is open at midnight too. No time is left over for you."),
   (u"Storing up hurt", u"You say nothing about what stung, then suddenly pull away. Your friend does not know why."),
   (u"Wanting to please everyone", u"You keep your view to yourself and agree with the majority. Your view was needed too."),
   (u"Leaving yourself no time", u"You give your friends so much that being alone feels like a fault. Rest is part of it as well."),
  ],
 },
 'careers': [
  (u"Psychology and counselling", u"People tell you their own things and you listen without cutting in. Staying calm under pressure is required here too."),
  (u"Social work and HR", u"You feel tension in a group before anyone else and you can settle people. Here you will also have to say what you think."),
  (u"Speech therapy and special education", u"You do not give up where nothing shows for months. Patience matters more than talent here."),
  (u"Medicine and nursing", u"An emergency does not throw you and you treat a patient as a person. Getting used to strict procedure will take more work."),
  (u"Teaching and childcare", u"A child who did not understand gets your third explanation as clearly as the first. But speaking in front of a class will be the hard part."),
 ],
},

# -------------------------------------------------------------- Xotirjam Yetakchi
'ES|E': {
 'family': {
  'strong': [
   (u"Deciding under pressure", u"When something unexpected happens at home everyone looks at you, because you do not panic."),
   (u"Receiving guests", u"When people come round you start the conversation and nobody is left out."),
   (u"Stopping an argument", u"You say one thing without raising your voice and the row settles. Your family knows this."),
   (u"An example to the younger ones", u"Your younger siblings copy you even when you say nothing."),
   (u"A shoulder to rely on", u"You get called into the important family conversation, even though you are younger."),
  ],
  'weak': [
   (u"Looking as if you do not care", u"Your calm leaves the impression that it makes no difference to you. The people close to you want more feeling."),
   (u"Silent about your own worries", u"You hear out everyone else's problem and tell nobody yours."),
   (u"Taking over unasked", u"You take a situation in hand quickly, and sometimes your family only wanted you to listen."),
   (u"The \u201cyou are strong\u201d label", u"People stop asking how you are, because you always look fine."),
   (u"Avoiding the emotional talk", u"Where there are tears you are uncomfortable, and you turn the subject to something practical."),
  ],
 },
 'school': {
  'strong': [
   (u"Speaking in front of the class", u"Your voice does not shake in a presentation. For most people that is the hardest thing."),
   (u"Leading the group", u"When the team has lost its way, you are the one who points somewhere."),
   (u"Steady in an exam", u"You do not lose what you knew to nerves, and that is worth no less than the knowledge."),
   (u"Settling a dispute", u"If classmates fall out, the teacher calls you."),
   (u"Teachers rely on you", u"The responsible job often comes to you."),
  ],
  'weak': [
   (u"Absorbing the group's work", u"\u201cIt will be faster\u201d, so you do all of it. The team learns nothing."),
   (u"Not asking for help", u"Admitting you did not understand feels like losing the lead."),
   (u"Drowning out the quiet ones", u"When you speak, the shy classmate does not speak at all."),
   (u"Bored in a slow lesson", u"When a topic is repeated your attention fades and you miss the easy part."),
   (u"Fear of getting it wrong", u"The thought that everyone is watching stops you trying something new."),
  ],
 },
 'friends': {
  'strong': [
   (u"You get everyone together", u"Whether it happens at all usually depends on you."),
   (u"Advice without panic", u"When a friend is lost you tell them what to actually do."),
   (u"Easy with new people", u"Walking into a group you do not know is not hard for you."),
   (u"A fair judge", u"You hear both sides and only then speak."),
   (u"You keep your word", u"If you said you would come, you come. Your friends count on it."),
  ],
  'weak': [
   (u"Never showing the hard part", u"Your friends cannot picture you struggling with anything."),
   (u"Everyone at the same distance", u"You are on good terms with many people and close to very few."),
   (u"Asking is difficult", u"You are always the one who gives, and you do not know how to take."),
   (u"Taking charge", u"Even meeting friends runs to your plan, and sometimes other people want to choose."),
   (u"Cutting the feelings short", u"A friend tells you what is wrong and you offer a solution straight away, when they wanted to be heard."),
  ],
 },
 'careers': [
  (u"Management", u"Deciding under pressure and getting people to follow is what the job is, day to day. Planning is the side you would have to learn separately."),
  (u"Law and advocacy", u"When the other side raises their voice, you do not. In a courtroom that is an advantage. Working through documents will take patience."),
  (u"Diplomacy and international relations", u"You can take the edge off a sharp conversation and you settle quickly into unfamiliar surroundings."),
  (u"Emergency services and medicine", u"When everyone else is panicking, your head keeps working."),
  (u"Teaching and coaching", u"Standing in front of a class is easy for you. Noticing how each student is feeling is the part to work on."),
 ],
},


# --------------------- Tashkilotchi
'E|C': {
 'family': {
  'strong': [
   (u'The party runs on you', u'A birthday or guests coming over: the plan, the list and the timing are already ready in your head.'),
   (u'What you are asked gets done', u'You do not forget the thing your mother asked you for.'),
   (u'You get the house moving', u'On a day when everyone at home is lying around, you get up and start, and it spreads.'),
   (u'You think ahead', u'You buy the thing before it runs out.'),
   (u'You break big jobs down', u'Spring cleaning at your house does not happen in one day; it happens to a plan.'),
  ],
  'weak': [
   (u'The order voice', u'When you are in a hurry it comes out as an instruction, not a request. At home that stings.'),
   (u'Impatience with slower people', u'You take the job your younger brother is doing slowly and do it yourself.'),
   (u'You do not ask', u'You announce the plan once it is finished, and your family never gets to discuss it.'),
   (u'You cannot rest', u'On a day you did nothing, you feel guilty.'),
   (u'Mess gets to you', u'Other people\u2019s untidiness bothers you more than it needs to.'),
  ],
 },
 'school': {
  'strong': [
   (u'You start the project', u'While the group is still discussing it, you have already taken the first step.'),
   (u'You make deadlines', u'You do not leave the assignment to the last night.'),
   (u'Class events', u'If there is a celebration or a competition, organising it lands with you.'),
   (u'Clear division of work', u'You decide who does what on the team, and nothing gets confused.'),
   (u'Talk turns into work', u'Your plan does not stay on paper.'),
  ],
  'weak': [
   (u'You take it all on', u'Because you do not trust it will get done, you take the team\u2019s work too, and then you are worn out.'),
   (u'You miss the better idea', u'Your plan is already made, so a better suggestion goes past you.'),
   (u'A broken plan ruins the day', u'When the timetable changes without warning, your mood drops.'),
   (u'Too much at once', u'You sign up for three clubs and end up with time for none of them.'),
   (u'You judge by results', u'You see your classmate\u2019s mark, not the effort behind it.'),
  ],
 },
 'friends': {
  'strong': [
   (u'The plan comes from you', u'You are the one who answers “so where are we going?”'),
   (u'You show up on time', u'You do not run late, and your friends count on it.'),
   (u'You bring the energy', u'The group picks up when you walk in.'),
   (u'Practical help', u'Instead of sympathy you say what to do, and then help do it.'),
   (u'New people', u'Your circle widens quickly.'),
  ],
  'weak': [
   (u'Your plan wins', u'Even when your friends want something else, your version is the one that happens.'),
   (u'Impatience with the undecided', u'The friend who keeps saying “I don\u2019t mind\u201d makes you snap.'),
   (u'No time for the long talk', u'You are always moving, so just sitting and talking happens rarely.'),
   (u'Closeness through tasks', u'Friendship starts to look like another project.'),
   (u'You will not be helped', u'You say “I have got it” even when you have not.'),
  ],
 },
 'careers': [
  (u'Project management', u'Splitting a plan across people and holding a deadline: that is already how you work.'),
  (u'Business and entrepreneurship', u'You move from talk to action fast and can pull others with you. The idea-finding side is what you would need to build.'),
  (u'Events and logistics', u'Holding a hundred small details at once does not tire you.'),
  (u'Sales and client work', u'Starting a conversation with a stranger and carrying an agreement through to the end.'),
  (u'Sports coaching', u'You build the training plan and get the team moving.'),
 ],
},

# --------------------- Kashfiyotchi
'ES|O': {
 'family': {
  'strong': [
   (u'Change does not shake you', u'Moving house or starting a new school does not hit you the way it hits other people.'),
   (u'You bring the new thing home', u'The book, the dish or the idea nobody in the family had heard of: you are the one who found it.'),
   (u'You ask calmly', u'You are not shy about asking an adult “why is it like that?”, and you do not turn it into an argument.'),
   (u'No panic', u'Even when something is wrong at home, your mood does not fall through the floor.'),
   (u'Curious about your family\u2019s past', u'You genuinely want to hear your grandfather\u2019s stories.'),
  ],
  'weak': [
   (u'Left half-finished', u'What you started at home stays at the halfway mark, and your family starts keeping count.'),
   (u'Routine bores you', u'The same chores repeating every day feel unbearably dull to you.'),
   (u'You will not commit', u'You answer a family plan with “maybe” and come across as unreliable.'),
   (u'You disappear into it', u'Once you are deep in your own interest, you can go days without talking to anyone.'),
   (u'You show little', u'The people closest to you may decide you are cold.'),
  ],
 },
 'school': {
  'strong': [
   (u'New subjects come fast', u'An unfamiliar topic does not frighten you; it interests you.'),
   (u'You teach yourself', u'You find and read the source the teacher never mentioned.'),
   (u'Calm over a hard problem', u'An unsolved problem does not make you anxious.'),
   (u'Research work', u'In a project or a paper you find your own way through.'),
   (u'You see more than one view', u'You do not stop at a single answer.'),
  ],
  'weak': [
   (u'Repetition is unbearable', u'Writing out a topic you already know a second time is torture, and your mark drops because of it.'),
   (u'The unfinished assignment', u'You do the interesting part and leave the rest.'),
   (u'Interests scatter', u'You study five things at once and go deep in none of them.'),
   (u'You resist memorising', u'A rule with no reason given behind it will not stay in your head.'),
   (u'You stay invisible', u'You know the answer and do not raise your hand, so the teacher rates you lower than you are.'),
  ],
 },
 'friends': {
  'strong': [
   (u'Worth talking to', u'People come away from a conversation with you knowing something they did not know before.'),
   (u'Very different friends', u'Your friends have nothing in common with each other.'),
   (u'You stay out of the drama', u'A fight inside the group does not pull you in.'),
   (u'Up for it', u'When a friend suggests something strange, you are the first to say yes.'),
   (u'You do not judge', u'You take someone\u2019s unusual choice as ordinary.'),
  ],
  'weak': [
   (u'You go quiet', u'You stop writing, and your friend feels as though they lost you.'),
   (u'It stays on the surface', u'You know a lot of people and have few close friends.'),
   (u'The interest ends and so does the friendship', u'A friendship can pass for you the way another subject passes.'),
   (u'When feelings are expected', u'When a friend is hurting, you do not know what to say.'),
   (u'Loyalty that does not show', u'Friendship matters to you, but nobody can tell that from the outside.'),
  ],
 },
 'careers': [
  (u'Scientific research', u'Working for months on a question with no known answer does not wear you out.'),
  (u'IT and programming', u'You pick up a new technology on your own, and being wrong does not scare you.'),
  (u'Journalism and investigation', u'A stranger and an unfamiliar place are not obstacles for you.'),
  (u'Geology, geography, expeditions', u'Rough conditions and not knowing what is ahead bother you less than they bother others.'),
  (u'Architecture and design', u'You find the new shape. Drawing it all the way out is the part that takes discipline.'),
 ],
},


# --------------------- Ijodkor Strateg
'O|C': {
 'family': {
  'strong': [
   (u'You fix it yourself', u'What breaks at home, you repair your own way.'),
   (u'A promise needs no reminder', u'If you said you would, nobody has to remind you.'),
   (u'You think far ahead', u'You are already talking today about next year’s exam.'),
   (u'Order', u'Your corner is the tidiest place in the house.'),
   (u'You want it better', u'Something you have done once, you do better the next time.'),
  ],
  'weak': [
   (u'The bar is set high', u'You hold yourself and your family to a very high standard.'),
   (u'You criticise the other way of doing it', u'When your mother does it differently, “that is wrong” comes out before you can stop it.'),
   (u'The decision does not move', u'Changing something you have already planned is hard for you.'),
   (u'You cannot rest', u'Doing nothing feels to you like time thrown away.'),
   (u'A plan instead of a hug', u'When someone close to you is hurting, you build them a plan instead of putting your arms around them.'),
  ],
 },
 'school': {
  'strong': [
   (u'You finish the project', u'You finish what you started, and in a classroom that is rare.'),
   (u'Your own solution', u'You find a route unlike anyone else’s that still works.'),
   (u'Precise planning', u'You split a big assignment across weeks.'),
   (u'High quality', u'Your work looks solid before anyone has read a line of it.'),
   (u'You work unsupervised', u'Nobody needs to check on you.'),
  ],
  'weak': [
   (u'Perfect slows you down', u'You redo work that was already good enough and run past the deadline.'),
   (u'You are hard on yourself', u'One mistake feels like it cancels the whole piece.'),
   (u'Team work is a strain', u'A classmate who does not take it as seriously as you do gets under your skin.'),
   (u'You will not ask', u'You would rather do it alone, even when alone takes twice as long.'),
   (u'You overload yourself', u'Working without a break, you arrive at the exam already tired.'),
  ],
 },
 'friends': {
  'strong': [
   (u'Your word holds', u'You arrive at the time you said and do what you said you would.'),
   (u'A thought-through gift', u'Your present is never a random one.'),
   (u'Practical advice', u'For a friend’s problem you have concrete steps, not just sympathy.'),
   (u'Few, but deep', u'You have few friends, and they last for years.'),
   (u'You remember what they said', u'You are still holding on to something your friend mentioned last month.'),
  ],
  'weak': [
   (u'No time left over', u'Your schedule is packed and friends do not fit into it.'),
   (u'You judge their choices', u'You quietly disapprove of a friend’s careless decision, and it shows.'),
   (u'Meeting with no plan', u'“Come out right now” unsettles you.'),
   (u'You cannot soften it', u'You say the true thing far too plainly.'),
   (u'A narrow circle', u'It takes you a long time to let a new person in.'),
  ],
 },
 'careers': [
  (u'Engineering and technology', u'You find the new solution and carry it all the way to the drawing and the numbers.'),
  (u'Architecture', u'Idea and exact measurement have to live in the same person, and that is you.'),
  (u'Programming and systems design', u'Breaking a complex problem into precise steps is natural to you.'),
  (u'Scientific research', u'Long work whose result arrives late does not frighten you.'),
  (u'Product and project design', u'You turn an idea into a schedule. Explaining it to a team is the side you would need to build.'),
 ],
},


# --------------------- Jamoaning Yuragi
'E|A': {
 'family': {
  'strong': [
   (u'Warmth in the house', u'In the room you are in, everyone relaxes.'),
   (u'Nobody is left out', u'The relative sitting silently is the one you pull into the conversation.'),
   (u'You keep in touch', u'You are the one who calls the distant relatives.'),
   (u'Hospitality', u'Someone who comes to your house never feels like an outsider.'),
   (u'You lift the mood', u'You can make a heavy day at home lighter.'),
  ],
  'weak': [
   (u'You go around the argument', u'Instead of naming a disagreement out loud, you get past it with a joke.'),
   (u'You keep your own view quiet', u'To hold the peace you give up what you actually wanted.'),
   (u'Good with everyone', u'When two relatives fall out, you tell both of them they are right.'),
   (u'More often out than in', u'When the house goes quiet, you leave for your friends.'),
   (u'You hide being tired', u'Even on a day you feel low, you look cheerful.'),
  ],
 },
 'school': {
  'strong': [
   (u'You tie the class together', u'Between the groups in your class, you are the bridge.'),
   (u'You take in the new student', u'The new pupil who arrives in class is met by you first.'),
   (u'Team spirit', u'In group work you make sure everyone takes part.'),
   (u'Warm with teachers', u'A lesson turns open and easy when you are in it.'),
   (u'Active at events', u'A class event without you is hard to picture.'),
  ],
  'weak': [
   (u'Talking beats the lesson', u'You get into a conversation and the topic goes past you.'),
   (u'You avoid the disagreement', u'You leave even a wrong answer uncorrected so that nobody feels hurt.'),
   (u'You do not defend your work', u'Even when a mark is unfair, you say nothing.'),
   (u'Attention scatters', u'With people around, the lesson drops to second place.'),
   (u'Studying alone is hard', u'Sitting on your own and going over it again is heavy work for you.'),
  ],
 },
 'friends': {
  'strong': [
   (u'A lot of friends', u'In very different circles you are one of their own.'),
   (u'You see the one on the edge', u'You notice the person who has gone quiet in the group and call them over.'),
   (u'You share the joy', u'You are happier about your friend’s win than about your own.'),
   (u'You bring people back together', u'Two friends who fell out end up at the same table again because of you.'),
   (u'You remember', u'Birthdays stay in your head.'),
  ],
  'weak': [
   (u'Not enough of you to go round', u'You have many friends, and none of them gets enough of your time.'),
   (u'You cannot say no', u'Even worn out, you do not turn down the invitation.'),
   (u'Quick to be hurt', u'An ordinary joke lands on you personally.'),
   (u'You smother the conflict', u'Rather than talk the problem through you close it, and it comes back.'),
   (u'You change to fit in', u'In each circle you are slightly different, and you lose track of yourself.'),
  ],
 },
 'careers': [
  (u'Teaching and education', u'Holding a class together and seeing every child in it: that is your strength.'),
  (u'HR and people management', u'You feel the tension between people, and you take it out of the room.'),
  (u'Journalism and communications', u'A stranger opens up to you, and that is half of an interview.'),
  (u'Hospitality and tourism', u'Making a person comfortable comes out of you without effort.'),
  (u'Community organisations and volunteering', u'You can gather people around one purpose.'),
 ],
},

# --------------------- Ijodkor Insonparvar
'O|A': {
 'family': {
  'strong': [
   (u'You feel the mood', u'You know your mother is tired before she says so.'),
   (u'Care with imagination', u'Your gift is not bought, it is thought up.'),
   (u'You do not look for who is to blame', u'When something goes wrong at home, you do not turn it into a question of whose fault it was.'),
   (u'You listen to the other view', u'With adults you try to understand rather than argue.'),
   (u'You make the house beautiful', u'The room and the table get decorated your own way.'),
  ],
  'weak': [
   (u'You carry the family’s trouble', u'A problem at home weighs on you more than on anyone else.'),
   (u'The practical side passes you by', u'Money, timetables and plans slip past your attention.'),
   (u'You avoid the collision', u'Even when you disagree, you do not say it out loud.'),
   (u'You idealise', u'You picture your family as flawless, so a flaw in it hits you hard.'),
   (u'You shut yourself in', u'When you are hurt, you go to your room.'),
  ],
 },
 'school': {
  'strong': [
   (u'The creative project', u'When the assignment is open, your work is the one people remember.'),
   (u'You help the one who is struggling', u'You explain it to the classmate who did not understand, and nobody else finds out.'),
   (u'The fairness question', u'“Is this fair?” is the question you are the one to ask.'),
   (u'No fight over marks', u'You do not compete for grades, and the class is calmer for it.'),
   (u'An eye for how things look', u'Your notebook, your slides and your drawings come out beautiful.'),
  ],
  'weak': [
   (u'Criticism cuts deep', u'A small remark from a teacher can spoil your mood for days.'),
   (u'Disorder', u'Deadlines and timetables get tangled for you.'),
   (u'You drop the subject you dislike', u'On a subject that does not interest you, you spend no effort at all.'),
   (u'You underrate yourself', u'If maths is hard for you, you write off your creative gift along with it.'),
   (u'You stay quiet', u'You have a good idea and you do not say it in front of the class.'),
  ],
 },
 'friends': {
  'strong': [
   (u'The deep conversation', u'Small talk does not hold you, so you ask about the thing that matters.'),
   (u'You take people as they are', u'A friend tells you even the thing they are most ashamed of.'),
   (u'You pick up on it', u'You hear the mood in someone’s voice.'),
   (u'A friendship of its own kind', u'Your friendship does not look like anybody else’s.'),
   (u'You forgive', u'You do not carry a mistake around for long.'),
  ],
  'weak': [
   (u'You take on the hurt', u'Your friend’s problem torments you more than it torments them.'),
   (u'You idealise people', u'You see someone as flawless, and when the truth shows, the disappointment is heavy.'),
   (u'You drift away without saying', u'When you are hurt you do not explain; you quietly disappear.'),
   (u'No boundary', u'For a friend you give your time away completely.'),
   (u'You avoid the conflict', u'Rather than say what the problem is, you let the friendship cool.'),
  ],
 },
 'careers': [
  (u'Psychology and therapy', u'Understanding a person and looking for a new approach are both needed in the same place here.'),
  (u'Social work and NGOs', u'When you see a problem, the people inside it are what you think about first.'),
  (u'Art and art therapy', u'Helping someone through creative work: both of your strengths working at once.'),
  (u'Special-needs teaching', u'Every child needs their own route, and you are able to find it.'),
  (u'Literature and translation', u'Carrying a person’s inner world across in words is close to you.'),
 ],
},


# --------------------- Barqaror Strateg
'ES|C': {
 'family': {
  'strong': [
   (u'A promise is a finished job', u'Your family does not remind you, because there is no need to.'),
   (u'Calm in a crisis', u'When things get bad at home, you do not panic.'),
   (u'You plan far out', u'You are the one already talking today about next year.'),
   (u'Careful with money', u'You have spent money thoughtfully since you were small.'),
   (u'The younger ones lean on you', u'When your younger siblings are stuck on their homework, they come to you.'),
  ],
  'weak': [
   (u'When the plan breaks', u'An unexpected change unsettles you more than it does other people, even when none of it shows.'),
   (u'Doing instead of saying', u'You show love and worry by doing things rather than saying them, and your family does not always read it that way.'),
   (u'Rest keeps getting postponed', u'“Work first”, and the rest never arrives.'),
   (u'Firmness', u'Changing a decision you have already made is hard for you.'),
   (u'You carry it alone', u'Even when it is heavy, you pick it up yourself.'),
  ],
 },
 'school': {
  'strong': [
   (u'You last the distance', u'Three months of preparation does not frighten you.'),
   (u'Steady in the exam', u'Nerves do not wipe out what you know.'),
   (u'You study to a schedule', u'A little every day, and by the end of the year it shows.'),
   (u'A teammate who can be relied on', u'The part given to you will be finished, without fail.'),
   (u'An orderly notebook', u'You can find what you wrote whenever you need it.'),
  ],
  'weak': [
   (u'Change is hard to take', u'When the teacher changes the method, it gets difficult for you.'),
   (u'You avoid the new way', u'You prefer the method that has been tested and do not try the other one.'),
   (u'You solve it alone', u'What you did not understand, you try to work out on your own instead of asking.'),
   (u'The pressure to be perfect', u'A four knocks you down harder than it knocks anyone else.'),
   (u'The open assignment', u'“Do whatever you like” leaves you at a loss.'),
  ],
 },
 'friends': {
  'strong': [
   (u'You are where you said you would be', u'You arrive at the time you named, every time.'),
   (u'What you are told stays with you', u'Nothing that was trusted to you travels further.'),
   (u'There on the hard day', u'You are the first to reach a friend on their hard day.'),
   (u'Friendships that last', u'Your friend from childhood is still your friend.'),
   (u'You speak clearly', u'When your friend is flustered, you are the one making sense.'),
  ],
  'weak': [
   (u'Uneasy without a plan', u'“Shall we head out right now?” throws you off.'),
   (u'Slow to let people in', u'You are in no hurry to make new friends.'),
   (u'Nothing about yourself', u'Your friends do not know that you struggle too.'),
   (u'You look cold', u'Because you show so little, people take you for indifferent.'),
   (u'Forgiving is hard', u'Someone who broke their word stays in your memory a long time.'),
  ],
 },
 'careers': [
  (u'Engineering and construction', u'Long work that demands precision suits you.'),
  (u'Finance and accounting', u'Attention and steadiness are the two things this job asks for.'),
  (u'Medicine and surgery', u'Under pressure your hand does not shake, and you follow the procedure exactly.'),
  (u'Law and notarial work', u'Meticulous work with documents does not bore you.'),
  (u'Logistics and manufacturing', u'Running a large system to a schedule is your ground.'),
 ],
},

# --------------------- Ishonchli Tayanch
'A|C': {
 'family': {
  'strong': [
   (u'You do it without being asked', u'When you see a job around the house, you do not wait to be told.'),
   (u'Loyal to a promise', u'Even a small promise you do not forget.'),
   (u'Looking after the older ones', u'Your grandparents lean on you most of all.'),
   (u'Order in the house', u'Where you are, nothing goes missing.'),
   (u'A quiet presence', u'You do not speak loudly, but the moment you are not there it is noticed.'),
  ],
  'weak': [
   (u'You take the whole load', u'Most of the housework collects on you, and you say nothing about it.'),
   (u'Guilt', u'When you cannot manage something, you blame yourself for a long time afterwards.'),
   (u'You are unable to refuse', u'Even worn out, you cannot bring yourself to turn it down.'),
   (u'You come last', u'By the time everyone else’s things are done, no time is left for you.'),
   (u'You say nothing when it goes unnoticed', u'It stings when what you did is not seen, and you do not mention it.'),
  ],
 },
 'school': {
  'strong': [
   (u'You are the one trusted with it', u'The class money or an important document gets handed to you.'),
   (u'You do not miss a deadline', u'The assignment is always in on time.'),
   (u'You help your classmates', u'Explaining it again does not tire you.'),
   (u'Quiet consistency', u'You do not stand out, and your results hold steady.'),
   (u'The dependable link in a team', u'Your part will be ready, without fail.'),
  ],
  'weak': [
   (u'The extra load', u'The group’s work gets finished by you at the end, every time.'),
   (u'You do not put yourself forward', u'Even when somebody presents your work as their own, you say nothing.'),
   (u'Afraid of getting it wrong', u'You are afraid of letting somebody down, so you do not take the risk.'),
   (u'The question stays unasked', u'Not wanting to take up time, you leave what you did not understand alone.'),
   (u'You step back from leading', u'Even when people trust you with it, you hand the leading to somebody else.'),
  ],
 },
 'friends': {
  'strong': [
   (u'The friend they lean on', u'On a hard day, you are the first person they call.'),
   (u'Nothing leaks', u'Whatever is trusted to you goes no further.'),
   (u'You hold the dates', u'You know when your friend’s exam is better than they do.'),
   (u'Honest advice', u'You say the useful thing rather than the pleasant one, but you say it gently.'),
   (u'Long loyalty', u'You are never the one who ends a friendship first.'),
  ],
  'weak': [
   (u'Your kindness gets used', u'Someone who knows how kind you are makes use of it, and you act as though you had not noticed.'),
   (u'Ready at any hour', u'You will come and help whenever you are asked, even when it costs you.'),
   (u'The hurt stays inside', u'You collect the slights within you, and then pull away all at once.'),
   (u'You do not mention your own trouble', u'Your friends think everything is always fine with you.'),
   (u'You agree to what does not suit you', u'Even an invitation that is wrong for you gets a yes.'),
  ],
 },
 'careers': [
  (u'Nursing and patient care', u'Care and precision are needed at the same time, and you have both.'),
  (u'Accounting and management accounts', u'Thoroughness and honesty are what this work is built on.'),
  (u'Primary school teaching', u'Patience and consistency are the whole of working with small children.'),
  (u'Libraries, archives and records', u'Quiet work that asks for order and for being trusted is close to you.'),
  (u'Social protection and care services', u'A field where you have to be attentive to the person and to the paperwork alike.'),
 ],
},

}

# Parallel to MINORS in life_content.py, same keys, same order.
MINORS = {
'ES|A': [
 (u'Palliative and hospice care',
  u'On the hardest days you can sit calmly beside someone, and not everyone can do that.'),
 (u'Animal-assisted therapy',
  u'A rare field that helps children through dogs and horses: patience and warmth are the main tools.'),
 (u'Sign language interpreting',
  u'You become the bridge between a deaf person and everyone around them, and your patience matters here.'),
],
'ES|E': [
 (u'Air traffic control',
  u'Guiding dozens of planes at once takes exactly the calm under pressure you have.'),
 (u'Crisis negotiation',
  u'A heated room needs someone who speaks first and brings the temperature down.'),
 (u'Expedition leading and mountain guiding',
  u'In the mountains decisions are fast and the group follows you: leadership at its most real.'),
],
'E|C': [
 (u'Film producing',
  u'Hundreds of people, a strict schedule and a budget: whoever gets a film onto the screen is an organiser.'),
 (u'Humanitarian logistics',
  u'Getting aid to a disaster zone on time takes your sense of order and your speed.'),
 (u'Esports team management',
  u'A new, fast-growing job that pulls players, sponsors and tournament schedules into one plan.'),
],
'ES|O': [
 (u'Seismology',
  u'When everyone talks about earthquakes with fear, you want to understand why they happen.'),
 (u'Archaeology',
  u'Silk Road cities are still not fully excavated, and whoever searches patiently finds things.'),
 (u'Astronomy and space research',
  u'Carrying on what Ulugh Beg started takes a curious mind that can stand long observation.'),
],
'E|O': [
 (u'Game design',
  u'You turn story, art and rules into one world, and other people get to play in it.'),
 (u'Museum and exhibition curating',
  u'Turning an old object into a story people stop to look at is creative work.'),
 (u'Gastronomy and culinary arts',
  u'Food is a stage too: inventing a new taste and presenting it to people suits you.'),
],
'O|C': [
 (u'Robotics',
  u'Taking an idea from a drawing to a working machine needs imagination and order in equal parts.'),
 (u'Restoring historic monuments',
  u'Bringing the buildings of Samarkand and Bukhara back to their original state takes millimetre precision and patience.'),
 (u'Biotechnology',
  u'Working with cells means long experiments and strict protocols, and the results can change the future.'),
],
'E|A': [
 (u'Working with children in hospital',
  u'A rare job helping children in long treatment get past their fear through play and conversation.'),
 (u'Eco-tourism guiding',
  u'You turn a group of strangers into friends in a day, and nature is the best setting for it.'),
 (u'Inclusive and Paralympic sports coaching',
  u'Making every player feel part of the team comes naturally to you.'),
],
'O|A': [
 (u'Ethnography and oral history',
  u'You record the stories of village elders before they are lost: knowing how to listen is the core of it.'),
 (u'Wildlife rescue and rehabilitation',
  u'Nursing an injured animal and returning it to the wild joins warmth and patience.'),
 (u"Writing and illustrating children's books",
  u'You understand what a child feels and can put it into pictures and words.'),
],
'ES|C': [
 (u'Forensic science',
  u'Drawing a conclusion from a tiny trace takes composure and the habit of recording every step.'),
 (u'Piloting',
  u'In a cockpit everything rests on checklists and calm, which is exactly you.'),
 (u'Nuclear energy safety',
  u'At a nuclear power plant no step is ever skipped, and that work needs your discipline.'),
],
'A|C': [
 (u'Genetic counselling',
  u'A rare job explaining complex medical information to families clearly and kindly.'),
 (u'Court and medical interpreting',
  u'Not mistranslating a single word, and treating a person in a hard moment with respect: the two pillars of this work.'),
 (u'Seed banks and plant breeding',
  u'In experiments that last years you keep every record carefully, and the result feeds a whole country.'),
],
}
