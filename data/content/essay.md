# PAUSE Before You Prompt

*A private 10-minute self-check tool for using AI as a scaffold instead of a substitute.*

---

A few months ago, I caught myself doing something strange. I had a vague, half-formed question about a research problem, and before I had even finished thinking it through, my cursor was already in the chatbox. The AI gave me a crisp, plausible answer. I copied it, tweaked a sentence, and moved on. The whole interaction took ninety seconds.

It was only later that I realised I had skipped the step I actually valued: the slow, awkward process of framing the problem myself.

This is not a story about AI being bad. The answer was correct. The tool was doing exactly what it was designed to do. The problem was not that I used AI. The problem was that I used it before I had noticed what I was handing over.

## Scaffold or substitute

The useful takeaway from the research of the last few years is not that AI damages thinking. The useful takeaway is that design and sequence matter. AI used after a person has formed a position, generated initial ideas, or read a source can act as a scaffold. AI used before those steps can sometimes replace the very effort that produces learning, ownership, or originality.

The evidence points in both directions, and that is the point. On one side: a small EEG preprint reported lower neural engagement in an AI-assisted essay-writing condition and used the term "cognitive debt," a survey of knowledge workers found that higher confidence in AI was associated with less enacted critical thinking, and a large randomised trial in high-school mathematics found students with AI access solved more problems in the moment but performed worse once the tool was removed. On the other side: studies of structured prompting, deliberate verification, and provocations built into the interface suggest that engaged use can restore or even sharpen critical thinking, and one instructional study found that deliberately offloading lower-order writing tasks to AI, freeing attention for analysis and revision, produced larger critical-thinking gains than working unaided.

The variable that keeps mattering is not exposure. It is the pattern of use. Whether AI arrives before or after you have framed the problem yourself. Whether you verify or accept. Whether you rewrite its suggestions in your own voice or keep the template. These are habits, and habits are exactly the kind of thing you can notice and adjust, if you can see them.

Validated scales exist for AI dependence and AI literacy, but they are built for researchers measuring constructs. There was no public, citation-grounded way for an individual to sit down for ten minutes and ask: what does my own pattern actually look like? That ninety-second moment, and that gap, led me to build PAUSE.

## A calibration check, not a verdict

PAUSE (Patterns of AI Use: Self-Examination) is a free, no-login web tool that delivers a short self-check across the four domains where the research is concentrated. It does not diagnose you, rank you, or tell you to stop using AI. Think of it as a calibration check: a structured way to notice your current pattern.

![PAUSE conceptual framework](media/figure1-theoretical-framework.png)

*What PAUSE actually looks at, in one picture.*

**Reasoning & Critical Thinking.** Do you verify claims you will rely on? Do you frame problems yourself before consulting AI, or does the tool arrive first?

**Creativity & Originality.** Do you still generate ideas from a blank page? Does your finished work sound like you, or like a generic AI register?

**Research & Learning.** Do you read sources, or summaries of sources? Can you paraphrase, without notes, the last serious piece you "read" through AI?

**Social & Communicative Capacity.** Do you draft personal messages yourself? When did you last have a long, AI-free conversation?

The items are behavioural rather than dispositional: "in the last two weeks, how often did you..." rather than "are you the kind of person who..." The scored LLM-era items are mapped to the studies that motivated them, and the full mapping is published in the accompanying paper. Many items are reverse-scored to counter the natural tendency to agree, and two short embedded probes, a claim-evaluation exercise and a 90-second alternative-uses task, add a small moment of genuine cognitive engagement beyond self-report.

![Anatomy of a PAUSE item](media/item-b5-anatomy.png)

*Every question shows its work: why it's asked, and where it comes from.*

There is deliberately no overall score. A single "AI dependency number" would compress more than it reveals, because AI may help you on some tasks within a domain and hurt you on others. Instead you get four separate readings, each with reflections and suggested practices drawn from the same research: alternating AI-assisted and AI-free reading sessions, paraphrasing a source before opening a chatbot, keeping a private notebook for raw ideation, writing a first draft before inviting AI into the process. The goal is never abstinence. It is structure.

![The result page: four readings, each with a practice to consider](media/offloading-pattern-demo.png)

*What you get back: four readings, each with a small practice to try, and no single verdict (demo data).*

## Privacy as design principle

There is one design decision I care about more than any other. An instrument that measures cognitive offloading should not itself offload.

PAUSE is a static web application with no backend. No account, no login, no cookies beyond session progress. All scoring runs deterministically in your browser, in plain HTML, CSS, and JavaScript with no framework and no third-party scripts. No responses, scores, or free-text inputs are transmitted by the PAUSE application. They stay in the browser, and the session clears when you close the tab. If you want to compare results over time, the tool gives you a short opaque token that you copy and keep yourself. If you paste it back later, it is decoded locally in your browser. It is not sent to a server or linked to any account. And no LLM is involved in production.

![The Compare view over six sessions](media/compare-demo.png)

*Come back later and you can watch the whole pattern move: the trend, the per-domain change, and what it might mean (demo data).*

This matters because self-reflection requires psychological safety. If you are going to be honest about where you might be leaning too heavily on a tool, you should not have to trade that honesty for data harvesting.

The whole thing is open source under the MIT License, deployable as a static site or a container, and every scoring rule, item, and rubric is an inspectable file in the public repository.

## What it is, and what it is not

PAUSE is mainly for individuals who use AI regularly and want a periodic calibration check. Educators may also find it useful as a conversation starter about scaffolded AI use, though it should never be used to grade, rank, or evaluate students. Researchers and HCI practitioners can inspect, adapt, or translate the open item set and scoring logic.

And to be unambiguous: PAUSE is not a validated psychological instrument. It presents no reliability or validity evidence in the psychometric sense. The behavioural probes use provisional heuristics, some of the anchoring studies are recent preprints, and the four-domain structure is a working organisation, not a confirmed factor analysis. The most defensible reading of a result is this:

> in the last two weeks, my self-reported behaviour matches a pattern that recent studies associate with cognitive offloading in this domain. That does not mean I am declining or harmed. It means I have information I did not have before, so I can choose differently if I want to.

## Use the result lightly

If you use AI daily, and hundreds of millions of people now do, take ten minutes. Run the self-check. Look at the four domain readings. Then pick one habit, at most, to adjust. The recommendations are framed as practices to consider, not prescriptions to follow, and a reading held lightly is worth more than a score taken seriously.

The point is not to add another metric to your life. It is to insert a single, structured pause into a relationship with a technology that is otherwise optimised for frictionless, continuous use.

AI is not going away, and I do not want it to. I want to use it well. The point was never to use AI less. The point is to use it on purpose.

## Try PAUSE

**Try PAUSE:** <https://anondo1969.github.io/pause>

**Source code and full item list:** <https://github.com/anondo1969/pause> (MIT License)

**Paper, with references for every study mentioned above: (preprint, arXiv version coming shortly):** <https://anondo1969.github.io/pause/pages/paper.html>


What habit helps you keep AI as a scaffold rather than a substitute? Drop a comment or reach out directly.