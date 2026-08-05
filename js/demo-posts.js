/* ==========================================================================
   demo-posts.js — placeholder content.

   These sample posts are shown ONLY while config.js has no apiKey, so you can
   look at the design before wiring up Google Drive. The moment you fill in
   your API key, the site reads your real Drive folder and ignores this file.

   You can safely delete this file (and img/demo/) once you're live — just
   remove the <script src="js/demo-posts.js"> line from index.html too.
   ========================================================================== */

window.DT_DEMO = [
  {
    id: 'demo-1',
    demo: true,
    title: 'A studio is a machine for changing your mind',
    date: '2026-07-28',
    author: 'DesignTech',
    minutes: 4,
    coverSrc: 'img/demo/demo-1.jpg',
    excerpt: 'What happens when you rebuild the lab around the work instead of the other way round — three months of moving benches, and what the layout taught us.',
    body:
      '<p>We spent the spring rearranging the lab. Not redecorating — <em>rearranging</em>, in the sense of pulling every bench off the wall and asking what it was for.</p>' +
      '<h2>The wall was the problem</h2>' +
      '<p>For years the benches faced outward, which meant every student worked with their back to every other student. Turning them inward cost us two metres of floor and bought us something we had been trying to timetable into existence for years: overhearing.</p>' +
      '<blockquote><p>You cannot schedule a conversation that happens because someone glanced sideways at a broken prototype.</p></blockquote>' +
      '<p>The second change was slower and less popular. We moved the 3D printers out of the corner and put them in the middle of the room, where they are loud and impossible to ignore.</p>' +
      '<h3>What we would do differently</h3>' +
      '<ul><li>Measure before moving. We guessed at circulation and got it wrong twice.</li>' +
      '<li>Power first. Everything else follows the sockets.</li>' +
      '<li>Leave one wall empty. It fills up on its own.</li></ul>' +
      '<p>Six months in, the room is noisier and the work is better. We are not entirely sure those two facts are related, but we are not willing to test it.</p>'
  },
  {
    id: 'demo-2',
    demo: true,
    title: 'Notes on prototyping with almost nothing',
    date: '2026-07-11',
    author: 'DesignTech',
    minutes: 3,
    coverSrc: 'img/demo/demo-2.jpg',
    excerpt: 'Cardboard, tape and a scalpel will answer most questions faster than a CAD model. A short defence of the ugly first version.',
    body:
      '<p>Every term a student asks whether they can skip the cardboard stage and model the thing properly. The answer is yes, and it will cost them a week.</p>' +
      '<h2>Fidelity is a budget</h2>' +
      '<p>Detail spent early is detail spent on the wrong thing. The first version exists to find out which question you are actually asking, and cardboard answers that question in an afternoon.</p>' +
      '<p>The trick is to be honest about what a prototype is testing. Fit, reach, sequence, weight — each of these wants a different, cheaper model. Almost none of them want a render.</p>' +
      '<h3>A rough hierarchy</h3>' +
      '<ol><li>Paper, for layout and sequence.</li>' +
      '<li>Cardboard and tape, for size and reach.</li>' +
      '<li>Foam, for weight and grip.</li>' +
      '<li>Print, only once the shape has stopped moving.</li></ol>' +
      '<p>Keep the ugly ones. They are the only record of what you used to believe.</p>'
  },
  {
    id: 'demo-3',
    demo: true,
    title: 'Teaching a workshop that has no right answer',
    date: '2026-06-19',
    author: 'DesignTech',
    minutes: 5,
    coverSrc: 'img/demo/demo-3.jpg',
    excerpt: 'A five-day brief with no deliverable and no marking rubric, and what forty engineering students did with the silence.',
    body:
      '<p>The brief was one sentence long: <em>make something that fails interestingly</em>. No deliverable, no rubric, five days.</p>' +
      '<h2>Day one was awful</h2>' +
      '<p>Engineering students are extremely good at working out what you want and giving it to you. Removing the target removed the skill, and for most of the first day the room was quietly furious.</p>' +
      '<p>By the afternoon of day two, three groups had stopped asking what counted and started arguing with each other instead. That is the whole workshop, really. Everything after it is logistics.</p>' +
      '<blockquote><p>The absence of a rubric is not the absence of standards. It just moves the standards into the conversation.</p></blockquote>' +
      '<h3>What came out of it</h3>' +
      '<p>A chair that collapsed politely. A clock that lost exactly one minute an hour and was honest about it. A door handle that could only be opened by two people at once, which turned out to be the most discussed object of the week.</p>' +
      '<p>We will run it again, with one change: day one gets a longer lunch.</p>'
  },
  {
    id: 'demo-4',
    demo: true,
    title: 'The parts drawer as documentation',
    date: '2026-05-30',
    author: 'DesignTech',
    minutes: 2,
    coverSrc: 'img/demo/demo-4.jpg',
    excerpt: 'How we stopped keeping an inventory spreadsheet and started keeping the drawer itself legible.',
    body:
      '<p>We kept an inventory spreadsheet for four years. It was accurate for roughly six weeks of that.</p>' +
      '<h2>Make the shelf tell the truth</h2>' +
      '<p>The replacement is dull and it works: one component per compartment, labelled on the front and the inside, with a photograph of a full drawer taped inside the lid. Anyone can see what is missing without opening a file.</p>' +
      '<p>The spreadsheet was a description of the drawer. The drawer is cheaper to keep honest than its description.</p>'
  }
];
