# PAUSE: A Privacy-Preserving Self-Reflection Tool for AI-Associated Cognitive Offloading

**Mahbub Ul Alam** · [ORCID 0000-0002-1101-3793](https://orcid.org/0000-0002-1101-3793)\
SciLifeLab Data Centre, Uppsala University, Sweden\
<mahbub.ul.alam@scilifelab.uu.se>, <mahbub.ul.alam.anondo@gmail.com>

**PAUSE** (**P**atterns of **A**I **U**se: **S**elf-**E**xamination) is a public self-reflection tool for AI usage patterns.

**Live tool:** <https://anondo1969.github.io/pause> · **Source code:** <https://github.com/anondo1969/pause>

## Abstract

Cognitive offloading is the use of external aids, such as notes, calculators, or search engines, to reduce mental effort. Large language models (LLMs) extend this to thinking itself, and by AI-associated cognitive offloading, I mean the pattern where a person routinely substitutes LLM output for their own reasoning, idea generation, learning, or communication. Recent empirical work reports associations between some patterns of LLM use and changes in critical thinking effort, neural engagement during assisted tasks, creative diversity, learning behaviour, and social dependence. Validated instruments for AI reliance, dependence, and literacy have begun to appear. I describe **PAUSE (Patterns of AI Use: Self-Examination)**[^1], a privacy-by-design web tool (**link:** [anondo1969.github.io/pause](https://anondo1969.github.io/pause)) that occupies a different niche from these. It is a lightweight, non-diagnostic reflection aid for private individual use. PAUSE is organised around how a person’s own LLM use may relate to cognitive offloading across four everyday domains (*reasoning & critical thinking*, *creativity & originality*, *research & learning*, and *social & communicative capacity*). It delivers a short, free, no-login self-check, scores it entirely in the browser, and returns descriptive, domain-aware reflections. The self-check pairs reverse-scored behavioural items with a claim-evaluation reasoning probe, an alternative-uses creativity probe, and a small retrospective before-and-after block. PAUSE does not assume that AI use is harmful. It addresses the narrower case where AI substitutes for effort a person may want to preserve. The application is privacy-preserving by design:[^2] scoring is deterministic and runs client-side, no personal data is required, nothing is transmitted or stored beyond the browser session, and no LLM is involved in production. In this paper, I describe the conceptual grounding, the item design, the scoring, the architecture, and the design philosophy.

**PAUSE is a self-reflection tool, not a validated psychological instrument. It presents no reliability or validity evidence, and all readings should be interpreted as descriptive self-reflection rather than psychological measurement.**

**Keywords:** cognitive offloading · generative AI · AI literacy · human-AI interaction · self-reflection · critical thinking · creativity · privacy by design · reflective systems

[^1]: **PAUSE tool:** [anondo1969.github.io/pause](https://anondo1969.github.io/pause)

[^2]: **PAUSE source code:** [github.com/anondo1969/pause](https://github.com/anondo1969/pause)

## 1. Introduction

![Figure 1](media/figure1-theoretical-framework.png)

**Figure 1:** Conceptual framework: cognitive offloading across four functional capabilities. The four domains D1 through D4 map onto distinct strands of the 2023–2026 empirical literature (Section 2.2) and feed into the self-check (Section 3.1).

In four years, generative artificial intelligence (AI) has moved from a research curiosity to a daily cognitive aid for hundreds of millions of people. The benefits are real and well documented: faster writing, broader idea generation, more accessible expertise. What remained unclear until recently was the cost of this cognitive aid.

That cost is best captured as AI-associated cognitive offloading. Cognitive offloading is the use of external action or aids to reduce the mental demand of a task (Risko and Gilbert 2016). Writing a note, reaching for a calculator, and running a search are all familiar forms of it. By AI-associated cognitive offloading I mean the form this habit takes with large language models (LLMs), where what gets delegated is the thinking itself: reasoning through a problem, generating ideas, learning new material, or communicating with other people.

A growing empirical literature has recently begun to address these consequences. Across an EEG-instrumented writing study, surveys of knowledge workers, creativity experiments, and a month-long randomised trial of chatbot use, one pattern recurs. The more a person substitutes LLM output for their own cognitive effort, the more measurable the shift on the faculty being substituted (Kosmyna et al. 2025; Gerlich 2025a; Lee et al. 2025; Doshi and Hauser 2024; Holzner, Maier, and Feuerriegel 2025; Fang et al. 2025). This holds for neural engagement, enacted critical thinking, idea diversity, and loneliness and social dependence. The association appears to persist even when users understand intellectually that the LLM is not sentient (Kosmyna et al. 2025; Lee et al. 2025). Awareness alone does not appear to be protective, and the effects seem to track habitual use. Section 2.2 reviews this literature in detail.

Existing critical thinking scales such as Watson-Glaser and the California Critical Thinking Skills Test (CCTST) are paid, generic, and pre-LLM. The General Attitudes towards Artificial Intelligence Scale (GAAIS) of Schepman and Rodway (2020) measures attitudes. AI literacy scales measure knowledge (Wang, Rau, and Yuan 2023; Ng et al. 2021). A person who has read about *cognitive debt* (Kosmyna et al. 2025), de-skilling, or over-reliance has no straightforward, public, and citation-grounded way to ask how any of it applies to them.

To address this, I built a privacy-by-design web tool that acts as a periodic counter-balance: each use inserts a moment of structured self-reflection into a person’s relationship with their AI tools. Its name, **PAUSE** (***P****atterns of* ***A****I* ***U****se:* ***S****elf-****E****xamination*), signals the same intent. PAUSE does not measure habit strength, underlying ability, or neural change. It surfaces self-reported behavioural patterns that the literature associates with the concerns above, and because it is cross-sectional, it describes current offloading patterns rather than accumulated *cognitive debt*. Figure 1 shows how the four PAUSE domains map onto the literature. Figure 2 shows what *citation-grounding* means at the item level.

Two clarifications are worth making. Cognitive offloading is not inherently harmful; humans have long delegated thinking to notes, calculators, maps, calendars, search engines, and other people, usually with good results. PAUSE also does not assume AI use is harmful. Its concern is narrower: it targets unreflective, substitution-heavy offloading, where AI takes over effort a person may want to retain, and it is designed to prompt reflection rather than deliver a verdict.

In summary, PAUSE is designed to make a person briefly stop using software, attend to their own thinking, and receive evidence-based, domain-aware suggestions for more deliberate engagement. The most defensible reading of a PAUSE result is:

> *“In the last two weeks, my self-reported behaviour around AI use matches a pattern that recent empirical literature associates with cognitive offloading across four everyday domains (reasoning & critical thinking, creativity & originality, research & learning, and social & communicative capacity). The literature does not establish that I am suffering, declining, or harmed. It establishes that this pattern is associated, in studies of larger groups, with measurable changes in the relevant capability. The point of this tool is to make my own pattern visible to me, so that I can choose differently if I want to.”*

### 1.1 What this paper means by “AI”

Throughout this paper, “AI” refers to consumer-facing generative artificial intelligence built on large language models (LLMs): chat assistants such as ChatGPT, Claude, Gemini, and Copilot, their API (Application Programming Interface)-accessible models, and the smart-reply, autocomplete, and summarisation features built on top of them. This is the class of tool whose cognitive consequences the 2023–2026 literature documents, and it is the class the items ask the respondent to introspect about. The terms “AI”, “LLM”, “GenAI”, “chatbot”, and “AI tool” are used interchangeably below.

The self-check does not cover classical recommender systems, pre-LLM predictive features such as spam filters, or embodied and task-specific AI. I scope it this way for an empirical reason. The studies anchoring the four domains (Section 3.1) concern LLM-class tools used in cognitive tasks, and PAUSE inherits that scope. The respondent-facing wording uses “AI” for accessibility, and the landing page and the “About this tool” panel spell out the scope for anyone who wants the specifics.

### 1.2 Contributions

I make three contributions in this paper:

1.  A four-domain mapping from the 2023–2026 empirical literature on LLM-associated cognitive effects to a self-reflection structure, with item-level citations (Appendix A).

2.  A public, citation-grounded set of reflective items, reverse-scored to counter agreement bias, paired with two short behavioural probes (a claim-evaluation reasoning probe and an Alternative Uses creativity probe) and a non-scored retrospective before-and-after block.

3.  A privacy-by-design, no-backend reference web application that performs all scoring client-side, collects and transmits nothing, and involves no LLM in production; deployable as a static site or self-hosted.

## 2. Related Work

### 2.1 Cognitive offloading and the LLM era

PAUSE builds on the cognitive offloading framework of Risko and Gilbert (2016). Singh et al. (2025) frame the influence as bidirectional. AI mimics aspects of human reasoning and, in doing so, reshapes the cognition of its users, particularly in the problem-framing phase that precedes consultation. Shaw and Nave (2026) sharpen the vocabulary by separating *cognitive offloading* (delegating a discrete task while one’s own reasoning stays engaged) from *cognitive surrender* (adopting an AI output with minimal scrutiny, so that agency itself transfers). Their framing is about calibration, and PAUSE’s concern sits at the offloading end of this spectrum, where substitution is quiet and reflective control is what is at stake.

Riley et al. (2025) survey the emerging evidence through the psychological triad of cognition, behaviour, and emotion, structured around Bloom’s cognitive levels and the I-PACE (Interaction of Person, Affect, Cognition, Execution) behavioural framework (Brand et al. 2016), and identify three behavioural trajectories: positive (AI scaffolds cognition), negative (AI displaces agency, degrading skills and inviting overreliance), and mixed. PAUSE’s four domains map most directly onto the negative trajectory, while its recommendations draw on the positive one (Section 2.3). The emotional strand of the triad (anticipatory anxiety, AI guilt, emotional dependence) is acknowledged as related but falls outside PAUSE’s current scope: the self-check avoids items that measure affective states as such, and where the social domain touches emotionally salient situations, its items are framed as communicative substitution rather than as measures of emotional dependence.

### 2.2 Empirical findings across four functional domains

**Reasoning & critical thinking (D1).** Kosmyna et al. (2025), in an electroencephalography (EEG) instrumented essay-writing study at the MIT Media Lab (n = 54; preprint), found that participants using ChatGPT showed the weakest neural connectivity across memory, attention, and executive networks, the lowest sense of ownership over their work, and impaired recall of their own writing, with lingering effects when they later wrote unaided; the authors coined *cognitive debt* for this reduced neural engagement. Gerlich (2025a), in a mixed-methods study of 666 participants, found a significant negative correlation between AI tool use and critical thinking, mediated by cognitive offloading and strongest in younger users. Lee et al. (2025), surveying 319 knowledge workers, reported that higher confidence in generative AI predicts less enacted critical thinking, and that knowledge work shifts from problem-solving toward verifying and integrating AI output. Dergaa et al. (2024) name the mechanism AI-Chatbot-Induced Cognitive Atrophy: the gradual weakening of judgment through habitual uncritical acceptance of chatbot output. The offloaded faculty here is evaluation itself, so its erosion is the hardest kind for the user to detect.

**Creativity & originality (D2).** Doshi and Hauser (2024) found that LLM access boosts individual story creativity, especially for less inherently creative writers, while significantly homogenising output across writers. Anderson, Shah, and Kreminski (2024) and the meta-analysis of Holzner, Maier, and Feuerriegel (2025) confirm the diversity reduction across divergent thinking, idea generation, and real-world artefacts. Kumar et al. (2025) found that exposure to LLM-generated frameworks reduced the diversity of participants’ idea sets both during and after use, suggesting lasting fixation. Wadinambiarachchi et al. (2024) observed the same fixation in novice designers using Midjourney, whose designs showed less variety than those made with a simple image search or no aid, and who frequently copied visual elements from the AI images. Bastani et al. (2025) and Dell’Acqua et al. (2023) provide complementary field evidence.

**Research & learning (D3).** Abbas, Jam, and Khan (2024) found that university students who used ChatGPT heavily reported growing difficulty retaining knowledge. Etkin et al. (2025) showed that readers who already understood a topic performed worse on comprehension tests when given AI summaries instead of the original text; the summaries stripped the contextual detail skilled readers depend on. Peters and Chin-Yee (2025) demonstrated that language models systematically drop qualifiers when summarising research, presenting findings as more general than the evidence supports. Tankelevitch et al. (2024) identify forming goals, forming queries, and judging output as the loci where critical thinking must be deliberately maintained. On learning outcomes, Bastani et al. (2025) found that high-school students given GPT-4 access solved more problems in the moment but performed worse than the control group once the tool was removed. Liu et al. (2026) provide causal evidence for the same pattern in randomised controlled trials (N=1,222), adding that AI assistance also reduced persistence. At population scale, Rismanchian et al. (2026), analysing 3.2 million adaptive-tutor interactions over ten years, found that study time on AI-susceptible problems fell sharply after ChatGPT’s release, with a durable cost on later proctored retention items.

**Social & communicative capacity (D4).** Fang et al. (2025), in a four-week randomised controlled trial with 981 participants and over 300,000 messages, found dose-dependent increases in loneliness and emotional dependence with chatbot use, alongside lower socialisation with real people. Hohenstein et al. (2023) demonstrated that AI-drafted email replies became more polished and uniformly positive, yet recipients who suspected AI involvement trusted the sender less. The efficiency gain carried a relational cost. Jakesch, Hancock, and Naaman (2023) showed that even expert evaluators cannot reliably distinguish AI-written from human-written text, and Riley et al. (2025) note the downstream effect. When any message could plausibly be AI-generated, the authenticity signal of personal writing is diluted for everyone.

### 2.3 Counter-design and structured prompting

Not all evidence points toward decline. Gerlich (2025b), the provocations study of Drosos et al. (2025), and the diverse-persona work of Wan and Kalman (2026) all suggest that **how** a user engages with AI matters more than **whether**. Structured prompting, deliberate verification, alternation between AI-assisted and AI-free work, and exposure to diverse outputs can mitigate or reverse offloading effects. The session-four result of Kosmyna et al. (2025), in which brain-only participants subsequently using ChatGPT outperformed sustained LLM users, supports this directly. Makransky et al. (2025) showed that a generative-AI tutoring chatbot which prompted students to connect ideas and explain their reasoning produced better assessment performance than traditional instruction. In the same spirit, Hong, Vate-U-Lan, and Viriyavejakul (2025) found that instruction which deliberately offloaded lower-order writing tasks to AI, freeing attention for analysis and revision, produced larger critical-thinking gains. Offloading, designed well, can serve the very capacities it is often assumed to erode. I draw on this counter-design literature, along with the harm literature, when designing the recommendations.

### 2.4 Existing tools

Several validated instruments occupy adjacent constructs: the AI Dependence Scale (AIDep-22) of Wu et al. (2026), whose four factors include a cognitive-dependence dimension built on the offloading framework; the SAID questionnaire of Garcia Castro et al. (2025) for AI dependence in secondary-school students; and, for AI *literacy*, the performance-based GLAT of Jin et al. (2024), alongside the older GAAIS (Schepman and Rodway 2020) and AI literacy scales (Wang, Rau, and Yuan 2023; Ng et al. 2021; Carolus et al. 2023). Consumer-facing sites also host ad hoc “AI dependency” quizzes without methodology or citations.

Closest in spirit is the *Offloading Score* of Padmakumar et al. (2026), which is likewise framed both for individual reflection and for designers reducing overreliance. It estimates the fraction of cognitive effort offloaded by reconstructing a counterfactual workflow from behavioural logs (validated with n=40 developers on programming tasks). PAUSE instead asks a descriptive, reverse-scored questionnaire organised by four everyday domains, and stores nothing.

Against this landscape, I position PAUSE as a **reflective design probe**. The measurement corners (reliance, dependence, literacy) are already occupied by validated scales, and PAUSE borrows from that literature rather than trying to out-measure it. What is distinctive is the combination: descriptive and non-diagnostic, organised by four functional domains, anchored item by item to the literature, and privacy-preserving to the point of storing nothing. Riley et al. (2025) call for grounded evaluation frameworks that balance benefits against emerging human-centric risks; PAUSE offers one deliberately modest, public, and deployable answer to that call.

## 3. Design of the Self-Check

### 3.1 Domains

I organise reflection around four domains. These are a working vocabulary grounded in the literature, not a tested factor structure.

1.  **D1: Reasoning & Critical Thinking.** The habit and capacity to decompose problems, evaluate evidence, verify claims, and form independent conclusions.

2.  **D2: Creativity & Originality.** The habit and capacity to generate novel, divergent, and personally voiced ideas not anchored on AI templates.

3.  **D3: Research & Learning.** The habit and capacity to engage with material at depth, to synthesise across sources, and to retain understanding rather than the AI-summarised gist.

4.  **D4: Social & Communicative Capacity.** The habit and capacity to draft, negotiate, and connect with other humans without AI mediation.

Each domain is treated as a continuum. Self-reported behavioural patterns are read as indicators of offloading depth, not as direct measures of underlying ability. In the “jagged frontier” sense of Dell’Acqua et al. (2023), AI may help on some tasks within a domain and hurt on others, and a domain-level mean compresses that variation.

### 3.2 Item design principles

I developed the items under the following constraints:

![Figure 2](media/item-b5-anatomy.png)

**Figure 2:** What *citation-grounded* means, shown on item B5 as rendered by the deployed tool. Every scored item has the same three-part anatomy: the behavioural task with its response scale and a *Not applicable* option; an expandable *Why this question* panel giving the item’s rationale in plain language; and an expandable *Reference* panel containing an exact quote from the anchoring study (here Dergaa et al. (2024), pp. 4–5) above the full citation with a resolvable DOI. Both panels can be opened before answering, so the respondent can always inspect the evidence behind a question rather than take the item on trust. The full item-to-anchor mapping is in Appendix A.

- Every item targeting LLM-era behaviour is anchored in a peer-reviewed or arXiv paper from 2023 to 2026 (Figure 2); only BL0 (I-PACE baseline-stability framing, Brand et al. (2016)) and C7 (Alternative Uses Task, Guilford (1967)) use older canonical references. The full mapping is in Appendix A.

- Items are behavioural (“*In the last two weeks, how often did you …*”) rather than dispositional (“*I am the kind of person who …*”), to reduce social-desirability bias.

- Roughly one third of the items per domain (two or three of seven) are reverse-scored to counter acquiescence; the exact set is marked in Appendix A.

- Two domains (D1 and D2) include a short behavioural probe to add a limited behavioural texture to self-report.

- All items have a “*not applicable*” option for users whose work does not involve a domain.

### 3.3 Scoring

For each domain d ∈ {D1, D2, D3, D4}:

- Each Likert item is scored 0 to 4 (with reverse coding applied).

- Probe items are scored 0 to 4 against pre-specified rubrics (Section 3.5; full rubrics in Appendix B).

- The domain reading $D_d$ is the mean of valid item scores, scaled to 0 to 100. Higher values indicate greater self-reported offloading. They do not indicate cognitive impairment.

- A domain reading uses only the items the respondent actually answered; N/A responses are dropped, not imputed. If fewer than three items in a domain were answered, the tool shows no number for that domain and marks it *limited basis*. A domain answered only in part carries a short note that the reading rests on fewer items.

- Each domain reading is mapped to one of four descriptive bands for display: *Minimal offloading signal* (0 to 24), *Mild* (25 to 49), *Moderate* (50 to 74), and *Strong offloading signal* (75 to 100). These are fixed, quarter-width cut points on the 0 to 100 scale, chosen for legibility rather than derived from a norming sample, and they carry no diagnostic meaning.

**There is no overall composite.** A single number across four domains of unequal weight and uneven character would compress more than it reveals, on the jagged-frontier grounds above, so the tool neither computes nor shows one. The four domains are reported separately.

### 3.4 Domain branching

Before scoring, the user selects a primary self-identification: *Researcher or academic*, *Creative professional*, *Student*, *Knowledge worker*, *Software or data engineer*, or *Other*. All users answer the same items, but the feedback recommendations branch on this selection. A high D1 reading for a researcher emphasises peer review, replication-checking, and brain-only literature reading sessions; the same reading for a creative professional emphasises journal-based ideation, blank-page warmups, and AI-free first drafts.

### 3.5 Behavioural probes

To add a behavioural texture beyond self-report, I embed two short probes:

- **Reasoning probe (B7).** A claim-evaluation multiple-choice item. The respondent reads a short paragraph reporting a research-like claim and selects the central methodological flaw from four options, one of which is “the conclusion seems sound.” Scoring is 0 (correct flaw identified), 2 (a non-central flaw identified), or 4 (uncritical acceptance).

- **Creativity probe (C7).** A 90-second Alternative Uses Task (AUT; Guilford (1967)) on a common object. Responses are scored for fluency (count of distinct entries) and basic flexibility (rough category diversity) using deterministic client-side heuristics. The scoring thresholds are provisional and are disclosed as such on the result page.

Both probes are answerable only while their timer runs. A respondent may also skip either probe explicitly, and a B7 timer that expires without an answer is treated the same way: in both cases the probe is scored as *not applicable* and dropped from the domain mean, exactly as a Likert item marked N/A. Non-response is never scored as option (d); running out of time is a different behaviour from uncritically accepting a claim, and conflating the two would bias the reading upward for slow readers and interrupted respondents.

Both probes draw from stratified pools with client-side, cross-session rotation, so a returning respondent does not see the same fallacy type or object category twice in a row. Rotation state travels only in the optional return token (Section 4.2), which carries no respondent-identifying information, and no probe content is transmitted anywhere. Pools, selection logic, and full rubrics are in Appendix B.

### 3.6 Retrospective before-and-after block

After the context section and before D1, I add a small retrospective block framed: *“Compared to before you regularly used AI tools, how often do you now…”*. Four behavioural items (BL1-BL4) map to the four domains: independent fact-checking, idea generation from scratch, reading original sources end-to-end, and drafting personal messages on your own. The response scale runs from *much less often* to *much more often*.

These items are **not** aggregated into the domain readings. They are reported separately as a **trajectory indicator**. A purely cross-sectional reading cannot distinguish a user who *never* engaged in a given habit from one who *used to* and has stopped, and retrospective self-report is noisy and biased, so the block does not solve that problem, but it surfaces the distinction. An optional opening item (BL0) asks whether pre-AI habits in these areas were already stable; a low answer earns a note that the before-and-after direction should be read as suggestive. The block is skippable for respondents with under **twelve months** of regular LLM use, whose pre-AI baseline was likely sporadic rather than stable.

## 4. PAUSE web application

### 4.1 Architecture

I built PAUSE as a static multi-page web application with no backend. The frontend is plain HTML, CSS, and JavaScript, with no build step, no framework runtime, and no third-party scripts or requests of any kind; the typefaces are self-hosted under the SIL Open Font License, so loading a page contacts only the site’s own host. All scoring and result rendering run in the user’s browser. No server endpoint accepts responses, and the application layer logs nothing. The site is served via GitHub Pages directly from the source repository, so the running tool and its code sit in one place, and it is equally self-hostable on any static host or as a container image. No LLM is involved in production. That choice is deliberate. A tool that helps a person reflect on cognitive offloading should not itself offload.

### 4.2 Privacy by design

- No account, no upload, and no personally identifiable information collected by the application.

- Responses, scores, and free-text inputs never leave the user’s browser and are never logged.

- The only client-side storage is session-scoped and cleared on tab close, and it holds nothing but two short rotation codes recording which probe variants were seen last, so a repeat session does not present the same fallacy type or object category (Section 3.5). Responses and scores are held in memory only while the page is open; they are never written to storage, and a page refresh discards them.

- Return-visit comparison works through a self-contained scorecard token. The result page shows a short opaque string encoding the current domain readings, which the user copies and stores themselves. On a return visit, pasting it displays the earlier readings alongside the current ones. The token is never transmitted, never persisted by the application, and never linked to any account or identity. When tokens from different scoring versions are pasted together, the comparison view flags that readings across versions may not be directly comparable; the instrument version is also displayed in the site footer.

- Any platform-level analytics are governed by the static host’s own policy. The PAUSE application itself records nothing about what the respondent answered.

### 4.3 Accessibility

The self-check works on mobile and desktop browsers, with keyboard navigation, screen-reader-friendly markup (semantic HTML, ARIA labels on form controls, countdown timers excluded from live-region announcements), and a colour palette whose text pairings meet the WCAG 2.1 AA contrast threshold. All items sit at a plain-English reading level. The application requires JavaScript by construction: rendering and scoring are performed client-side precisely so that nothing is transmitted, and respondents with JavaScript disabled see a static notice explaining this. The tool ships in English; Swedish and Bengali translations are planned.

### 4.4 Result framing and ethical safeguards

I frame PAUSE throughout as a tool for self-reflection rather than a measurement instrument. A persistent banner states that it is not validated, that a reading need not reflect any stable underlying trait, and that its readings should not drive real-world decisions. In keeping with this, the four band labels (*Minimal*, *Mild*, *Moderate*, and *Strong offloading signal*) are marked as descriptive rather than normed (defined in Section 3.3).

The result page avoids clinical language: no respondent is described as “impaired” or “at risk”. Its header names the reading in neutral terms of AI-use patterns, and I keep the project name out of the reading area, placing it only in the footer and the “About this tool” panel. A high reading is neither a verdict nor a reason to stop using AI tools, and a low reading is no kind of clearance: each reports only the match between recent self-reported behaviour and a pattern the literature associates with offloading. My aim is conscious, structured engagement, not abstinence.

I present the domain-aware recommendations as practices to consider, drawn from the counter-design literature (Section 2.3), not as prescriptions, treatment advice, or claims tested on the individual respondent. A reading is for that respondent’s own reflection and must not justify any consequential decision about them or anyone else, whether hiring, admissions, performance evaluation, or clinical or educational assessment.

PAUSE is not designed for minors. A soft, non-blocking age check precedes the self-check (Section 4); a negative response explains that the tool is not intended for those under 18 and invites the respondent to return when they are. Because the design is privacy-preserving, I deliberately avoid a hard age gate that would require identity verification. Nothing a respondent enters is collected, transmitted, or stored beyond the session, so the attestation is retained nowhere and no respondent’s identity is captured at any point.

## 5. Worked example: a single result and a six-month comparison

The following is illustrative. The respondent is fabricated and the numbers are constructed to show the mechanics; no real user data is involved.

### 5.1 A single result

A creative professional (a freelance writer) selects *Creative professional*, reports 6–15 hours per week with AI tools, and over two years of regular use. Their D1 (*Reasoning & Critical Thinking*) items score as shown in Table 1, with the three reverse-coded items flipped so a higher coded value always means more offloading.

| Item                                | Response                                 |              | Coded |
|:------------------------------------|:-----------------------------------------|:------------:|:-----:|
| B1 (rev.)                           | Checks AI facts against a source         | Almost never |   4   |
| B2                                  | Reaches for AI before framing            |    Often     |   3   |
| B3 (rev.)                           | Pushes back on plausible AI reasoning    |  Sometimes   |   2   |
| B4                                  | Harder to hold an argument in their head |    Often     |   3   |
| B5                                  | Accepts AI answers they cannot verify    |    Often     |   3   |
| B6 (rev.)                           | Articulates disagreement first           |    Rarely    |   3   |
| B7 (probe)                          | Identifies a non-central flaw            |      —       |   2   |
| Total across the seven scored items |                                          |              |  20   |

**Table 1:** Worked D1 (Reasoning & Critical Thinking) scoring for the illustrative respondent of Section 5. The three reverse-scored items (B1, B3, B6) are shown *after* flipping, so a higher coded value always indicates more self-reported offloading. The seven-item total of 20 gives a mean of 20/7 = 2.86, which scales to a domain reading of 71, a *Moderate offloading signal* under the fixed bands of Section 3.3.

The mean is 20/7 = 2.86, scaled to **71** on 0–100: a *Moderate offloading signal* (Section 3.3). Their full result is *Reasoning & Critical Thinking* 71, *Creativity & Originality* 93, *Research & Learning* 71, *Social & Communicative Capacity* 75, that is, *Moderate*, *Strong*, *Moderate*, and *Strong offloading signal*. Each domain appears as a labelled bar with one practice:

- *Reasoning & Critical Thinking*, MODERATE OFFLOADING SIGNAL 71: “Before opening an AI tool, spend 10 minutes writing the problem in your own words. Keep that page.”

- *Creativity & Originality*, STRONG OFFLOADING SIGNAL 93 (with C7 USES PROVISIONAL THRESHOLDS (±1 BAND)): “Try a one-week AI-free draft. Just one draft. Notice what changes in your voice.”

- *Research & Learning*, MODERATE OFFLOADING SIGNAL 71: “When learning a new technique or reference, work from the original source for an hour before turning to AI explainers.”

- *Social & Communicative Capacity*, STRONG OFFLOADING SIGNAL 75: “Send one personal, AI-free message to a friend or collaborator this week. Notice if you feel exposed.”

A short profile-aware summary sits above the bars:

> As a creative professional, the areas that matter most are likely *Creativity & Originality* (keeping your own voice, generating your own first ideas) and *Reasoning & Critical Thinking* (pushing back on AI suggestions that sound plausible but flatten your work). Your scores suggest a high level of offloading across most areas. This does not mean you are doing something wrong, and this tool is not a diagnostic. But the pattern is pronounced enough that a deliberate experiment, one AI-free working session this week in whichever area matters most to you, may be genuinely revealing. The point is not to stop using AI; it is to find out what your own capabilities feel like without it, right now, so you can make a conscious choice.

| Domain                          | Feb | Jul | Change |              Band              |
|:--------------------------------|:---:|:---:|:------:|:------------------------------:|
| Reasoning & Critical Thinking   | 64  | 41  | -23  |  Moderate → Mild   |
| Creativity & Originality        | 88  | 62  | -26  | Strong → Moderate  |
| Research & Learning             | 52  | 18  | -34  | Moderate → Minimal |
| Social & Communicative Capacity | 35  | 80  | +45  |   Mild → Strong    |

**Table 2:** The synthetic six-month demo trajectory (February to July) shipped with the Compare view. The four domains trace deliberately distinct paths rather than parallel drift: three decline at different rates while Social rises throughout and ends in a different band from where it started, and the final readings span all four descriptive bands. *Change* is the last-minus-first difference on the 0 to 100 scale; band transitions use the fixed cut points of Section 3.3. The data are fabricated for illustration and involve no real respondent.

### 5.2 A six-month comparison

Comparison over time uses the return token (Section 4.2): the respondent copies a short opaque string at each session and keeps it; pasting several back reconstructs the trajectory entirely in the browser, and PAUSE stores nothing between visits. The tool ships with a synthetic demo trajectory of six monthly sessions (February to July), summarised in Table 2.

Figure 3a shows the trajectory chart and Figure 3b the per-domain delta cards, as the respondent sees them; the narrated analysis panel that follows is provided in Section 5.2.1.

![Figure 3a](media/compare-chart.png)

**Figure 3a:** The trajectory chart: one smoothed line per domain over six monthly sessions, with final readings labelled at the line ends. The diagonal watermark marks the data as synthetic even in a cropped screenshot.

![Figure 3b](media/compare-deltas.png)

**Figure 3b:** Per-domain delta cards: the latest reading, the last-minus-first change on the 0 to 100 scale, and the descriptive band of the latest session.

**Figure 3:** The Compare view rendering the synthetic six-month demo trajectory of Table 2, shown top to bottom as the respondent sees it. Everything in all these panels is computed in the browser from the pasted return tokens alone; no token is transmitted, stored, or linked to any identity.

#### 5.2.1 The narrated analysis

The trajectory panel narrates each change in the same neutral register:

- IMPROVING *Reasoning & Critical Thinking* dropped 23 points, from moderate to mild offloading. Whatever you changed in this area appears to be working. Stay with it.

- IMPROVING *Creativity & Originality* dropped 26 points, from strong to moderate offloading. Whatever you changed in this area appears to be working. Stay with it.

- IMPROVING *Research & Learning* dropped 34 points, from moderate to minimal offloading. Whatever you changed in this area appears to be working. Stay with it.

- NEEDS ATTENTION *Social & Communicative Capacity* climbed 45 points, from mild to strong offloading. This is the area most worth pausing on. Consider revisiting the practice recommendation from your most recent result.

## 6. Discussion

### 6.1 Implications for design, education, and policy

For AI tool designers, D1 and D3 name behaviours that current chat interfaces tend to encourage: friction-free acceptance, summarisation in place of source reading, and immediate answer delivery. The provocations literature indicates that small interface choices, such as asking the user to commit to a position before showing output, surfacing source links by default, or pacing the response, can shift these behaviours (Drosos et al. 2025; Gerlich 2025b; Makransky et al. 2025). PAUSE supplies a vocabulary for naming what such choices target.

For educators and workplace learning teams, the domain readings can scaffold curriculum design around the specific behaviours associated with offloading rather than around general AI literacy. A high D2 reading in a creative writing programme calls for AI-free first drafts and journal-based ideation; a high D3 reading in a research methods course calls for source-reading exercises and supervised summary verification. The domain-branching feature is a first attempt to translate readings into role-specific suggestions of this kind.

For policy actors concerned with the cognitive effects of generative AI, the tool is a low-cost, publicly available reference that can be self-administered at population scale without infrastructure cost.

### 6.2 Why a self-report tool?

Self-report has known limitations (Section 6.3), and higher-fidelity methods exist: behavioural tasks under controlled conditions, neuroimaging, longitudinal performance tracking. I chose self-report deliberately, because it meets a use case those methods cannot, which is individual-level access at scale. A person curious about their own AI use cannot run an EEG study on themselves, and a teacher cannot administer a four-hour cognitive battery to a class. The value is in being short, free, and immediately interpretable, and the two embedded probes add a limited behavioural signal without giving up that brevity.

### 6.3 Limitations

**Self-report of offloading is susceptible to the very faculty it concerns.** A person whose critical-thinking habits have decayed may also have decayed insight into the decay. The behavioural probes partially mitigate this without eliminating it.

**Correlation is not causation.** The tool cannot show that a given user’s pattern was *caused by* their LLM use; it can only describe a pattern. For the same reason, a reading cannot establish that AI use changed anyone’s abilities.

**Sampling is non-representative.** People who voluntarily take a self-check on AI and cognition are not a population sample.

**The four-domain structure is a working organisation,** not a confirmed factor structure. Whether “AI-associated cognitive offloading” is even a coherent construct, distinct from general technology dependence or media-multitasking effects, is an open question.

**Several anchoring studies are recent preprints.** The literature on LLM cognitive effects turns over faster than peer-review cycles. Because PAUSE’s stance is descriptive, the bar for anchoring a reflective item is lower than for a causal claim, but anchors remain supporting evidence for an item’s design, not proof that the item behaves as intended.

**Several items additionally conflate early consultation with substitution:** a respondent who deliberately brings AI in at the start of a task as a scaffold (the engagement pattern Section 2.3 describes favourably) will honestly endorse items such as B2, C1, and D1 and read as offloading. The items measure when and how often AI enters the workflow, which is an imperfect proxy for whether one’s own reasoning stayed engaged.

**The retrospective block’s directional labels should likewise be read as self-narrative rather than measurement**; the interface presents them separately from the domain readings and with an explicit stability caveat for that reason.

**The probes are simple.** B7 is multiple-choice and therefore easier than free-response flaw identification, and respondents trained in epidemiology, statistics, or experimental design will systematically read as less offloading, which is partly the construct and partly a training effect. The pool is at risk of memorisation once public, mitigated by the client-side rotation. The C7 heuristic captures fluency and category-level flexibility but not originality or elaboration; Silvia et al. (2008) describe higher-validity alternatives that the no-LLM-in-production constraint precludes, and the result page carries an explicit band-uncertainty disclosure.

## 7. Conclusion

I designed PAUSE to make visible what the 2023–2026 empirical literature has begun to document. Habitual substitution of LLM output for one’s own cognitive effort is associated with detectable shifts in reasoning, creativity, learning, and social engagement, and PAUSE turns that literature into a structured self-reflection protocol delivered through privacy-preserving software.

The design reflects three deliberate choices. First, epistemic humility. Readings describe self-reported offloading patterns, there is no overall composite, and nothing is diagnosed. Second, transparency. Every item is anchored to a specific empirical finding, and the full item set and scoring code are open from launch. Third, privacy by design. The tool records none of the respondent’s answers, sends nothing to a server, and runs no LLM in production.

The limits matter as much as the features, and they sit on the result page itself: the tool is a reflection aid, its probes are simple, some of its anchors are preprints, and its four domains are a working organisation. If PAUSE serves its purpose, people will take it briefly and periodically, notice their patterns, and choose differently where they want to. It is my attempt at public, citation-grounded, privacy-preserving self-reflection for one of the defining cognitive shifts of this decade.

## 8. Availability

- **Source code:** [github.com/anondo1969/pause](https://github.com/anondo1969/pause) (MIT licence)

- **Self-check items and scoring:** released as Appendix A of this paper and as a standalone CC-BY 4.0 document

- **Live tool:** [anondo1969.github.io/pause](https://anondo1969.github.io/pause) (GitHub Pages), no login required, no data collected

- **Verification suite:** a reproducible *Node.js* test harness in the repository re-derives the Section 5 worked example from the production scoring module (the D1 reading of 71 and the brick AUT example, band 1), asserts the Section 5 band rubric and the Section 3.5 cross-session rotation guarantee over 2,000 draws, fuzzes the return-token decoder, verifies HTML escaping and the WCAG 2.1 AA contrast of the deployed palette, confirms the absence of third-party requests, and drives the complete self-check and comparison flows in a simulated browser, including the probe skip paths. Every mechanically checkable claim in this paper is checked by it; psychometric properties are not, and are not claimed.

The scoring module, the AUT category dictionary, the B7 pool, and the feedback library are all inspectable source files in the public repository.

## Appendix A: Full Item List

All items have a “Not applicable” option in addition to the response scale shown. For the Likert items this is a checkbox; for the two timed probes (B7, C7) it takes the form of an explicit skip control, and a B7 timer that expires without an answer is likewise scored as not applicable (Section 3.5). Each behavioural item is anchored to a study that motivated its design; anchors are supporting evidence for an item’s framing, not validation of it.

*Sections A, BL, B, C, D, and E correspond to entries in the deployed `items.json` (the questionnaire flow). The age check (H) is implemented as a pre-self-check modal (Section 4).*

### Section A: Context (not part of the reading)

- **A1.** Which best describes your primary work? *Researcher / Creative / Student / Knowledge worker / Software engineer / Other.*

- **A2.** Average hours per week with AI tools? *< 1 / 1-5 / 6-15 / 16-30 / > 30.*

- **A3.** How long have you used LLM-based AI tools regularly? *< 6 months / 6-12 months / 1-2 years / > 2 years.*

### Section BL: Retrospective trajectory (reported separately, skippable if A3 < 12 months)

- **BL0.** *Before I started using AI tools regularly, my work and study habits in these four areas (verification of facts, generating ideas, reading sources, drafting messages) were already well-established and stable.* (0-4 agreement) *Anchor: Brand et al. (2016).*

- **BL1.** Compared to before you regularly used AI tools, how often do you now **verify factual claims against independent sources**? (-2 to +2) *Anchor: Gerlich (2025a).*

- **BL2.** Compared to before, how often do you now **generate ideas from scratch without external input** when starting creative work? (-2 to +2) *Anchor: Kumar et al. (2025).*

- **BL3.** Compared to before, how often do you now **read original sources end to end** rather than relying on summaries? (-2 to +2) *Anchor: Etkin et al. (2025).*

- **BL4.** Compared to before, how often do you now **draft personal or sensitive messages entirely on your own**? (-2 to +2) *Anchor: Hohenstein et al. (2023).*

### Section B: D1; Reasoning & Critical Thinking (B1, B3, B6 reverse-scored; B7 probe)

Likert (B1-B6): *Almost never (0) / Rarely (1) / Sometimes (2) / Often (3) / Almost always (4)*

- **B1.** When an AI gives me a factual answer that I will rely on (a statistic, a date, a citation), I check it against an independent source before using it. (Reverse) *Anchor: Lee et al. (2025); Tankelevitch et al. (2024).*

- **B2.** When I face a complex problem, I now reach for an AI tool before I have spent meaningful time framing the problem myself. *Anchor: Lee et al. (2025); Kosmyna et al. (2025).*

- **B3.** When an AI’s reasoning seems plausible, I push back on it and ask myself where it could be wrong. (Reverse) *Anchor: Drosos et al. (2025).*

- **B4.** I find it harder than I used to find it to hold a long argument together in my head without external help. *Anchor: Kosmyna et al. (2025); Gerlich (2025a).*

- **B5.** I accept an AI-generated answer in domains where I cannot easily verify it. *Anchor: Dergaa et al. (2024).*

- **B6.** When I disagree with an AI’s output, I take time to articulate why, in writing or aloud, before deciding what to do. (Reverse) *Anchor: Tankelevitch et al. (2024).*

- **B7. \[Probe\]** Claim-evaluation multiple-choice item drawn from a stratified pool (Appendix B). *Anchors: Lee et al. (2025); Tankelevitch et al. (2024).*

### Section C: D2; Creativity & Originality (C2, C5 reverse-scored; C7 probe)

- **C1.** When I sit down to create something, I open an AI tool before I have produced any of my own ideas. *Anchor: Doshi and Hauser (2024); Kumar et al. (2025).*

- **C2.** I keep a private space (notebook, sketch app, raw doc) where I generate ideas without any AI in the loop. (Reverse) *Anchor: Kosmyna et al. (2025); Kumar et al. (2025).*

- **C3.** I notice my finished work sounds more like a generic AI register than like me. *Anchor: Holzner, Maier, and Feuerriegel (2025); Doshi and Hauser (2024).*

- **C4.** When I get an AI suggestion I like, I tend to keep most of its structure rather than rewrite it in my own way. *Anchor: Doshi and Hauser (2024); Anderson, Shah, and Kreminski (2024).*

- **C5.** In the last month, I have produced a piece of work I am proud of that contained no AI-generated content. (Reverse) *Anchor: Kosmyna et al. (2025).*

- **C6.** When I’m stuck creatively, my first move is to ask an AI rather than to stay with the discomfort. *Anchor: Kumar et al. (2025).*

- **C7. \[Probe\]** 90-second Alternative Uses Task on a randomised common object. *Anchor: Guilford (1967).*

### Section D: D3; Research & Learning (D2, D5 reverse-scored)

- **D1.** When I need to learn something new, I ask an AI for a summary instead of reading the source. *Anchor: Abbas, Jam, and Khan (2024).*

- **D2.** I can paraphrase, in my own words and without notes, the main argument of the last serious piece I “read” through AI summarisation. (Reverse) *Anchor: Kosmyna et al. (2025).*

- **D3.** I have caught myself citing or paraphrasing a claim that turned out to be a hallucination or misattribution. *Anchor: Peters and Chin-Yee (2025).*

- **D4.** When I “understand” a topic via AI explanation, I later struggle to apply it to a new case. *Anchor: Bastani et al. (2025).*

- **D5.** I do at least one weekly task in my domain (reading, coding, writing, analysis) deliberately without AI, to keep the skill warm. (Reverse) *Anchor: Kosmyna et al. (2025).*

- **D6.** I skip the slow, frustrating part of learning (struggle, dead ends, false starts) because AI lets me. *Anchor: Kumar et al. (2025); Abbas, Jam, and Khan (2024).*

- **D7.** My notes, drafts, and intermediate work increasingly consist of pasted AI output rather than my own writing. *Anchor: Lee et al. (2025).*

### Section E: D4; Social & Communicative Capacity (E3, E7 reverse-scored)

- **E1.** I draft personal or sensitive messages (to friends, family, colleagues) by getting an AI to write them first. *Anchor: Hohenstein et al. (2023).*

- **E2.** When something is difficult or personal, I find it easier to have an AI help me work through it than to talk to a person. *Anchor: Fang et al. (2025).*

- **E3.** I have had a meaningful, AI-free conversation longer than 20 minutes in the last week (in person, by phone, or by video call). (Reverse) *Anchor: Fang et al. (2025).*

- **E4.** I notice myself reading other people’s writing and assuming it must be AI-generated. *Anchor: Jakesch, Hancock, and Naaman (2023); Riley et al. (2025).*

- **E5.** I prefer AI responses to human ones because the AI is faster, more available, or less judgmental. *Anchor: Fang et al. (2025).*

- **E6.** I have reduced the time I spend in human-to-human casual exchange (in person, on the phone, in messaging) since I started using AI tools heavily. *Anchor: Fang et al. (2025).*

- **E7.** When I face a small social or interpersonal decision, I work it out by thinking it through myself or talking to a trusted person before, or instead of, asking an AI. (Reverse) *Anchor: Tankelevitch et al. (2024).*

### Section H: Age check

- **H1.** Are you 18 years of age or older? (yes / no)

## Appendix B: Probe pools and rubrics

### B7 claim-evaluation pool

The B7 pool contains items stratified across 10 reasoning-fallacy types, with several items per type. Each item presents a short paragraph with a research-like claim about AI productivity, learning, or use, followed by four options that ask the respondent to identify the central methodological flaw. The correct flaw is one specific option (varied across items so the correct letter is not predictable); one option is always “the conclusion seems sound to me.”

**Fallacy taxonomy.**

The 10 types and their two-letter codes are: `ss` small sample size; `sb` selection bias / unrepresentative sample; `cf` confounding / correlation-causation; `rm` regression to the mean; `cb` confirmation bias / non-independent confirmation; `es` effect size vs. statistical significance; `br` base rate neglect; `sv` survivorship bias; `an` anchoring / framing effect; `ge` hasty generalisation / single-case extrapolation.

**Item selection at presentation.**

Item selection runs entirely client-side, in two stages: (1) determine the set of allowed fallacy types (all 10 unless the respondent has an avoidance hint from a prior session, in which case the most recently seen type is excluded); (2) pick a fallacy type uniformly at random from the allowed set, then pick an item uniformly at random from that type’s items.

**Cross-session avoidance.**

The avoidance hint is communicated between sessions via the optional return token (Section 4.2). The token carries a two-letter fallacy-type code and a three-letter C7 category code; these are the only non-score fields, and neither carries respondent-identifying information. The fallacy type never repeats across two consecutive sessions, and the chance of seeing a familiar paragraph is low even under perfect recall.

**Scoring.**

0 = correct flaw identified; 2 = a non-(d) wrong flaw identified; 4 = option (d), “the conclusion seems sound.”

**Full pool.**

Full text of all items, with fallacy-type codes, is in `data/instrument/b7_pool.json` in the project repository. The file is a JSON object whose `pool` field is an array of items; each item has `id`, `fallacy_type`, `paragraph`, `options` (array of four), `correct`, and `explanation_after`.

### C7 AUT scoring heuristic (deterministic, client-side)

**Object pool.**

The C7 pool contains 12 common objects stratified across 6 everyday-object categories, with two objects per category:

- `bld` (building material): brick, cinderblock

- `fst` (fastener / small office item): paperclip, rubber band

- `wrn` (wearable / personal item): shoe, leather belt

- `shl` (shelter / canopy): umbrella, tarpaulin

- `ctr` (container / vessel): plastic bucket, mason jar

- `txt` (textile / soft furnishing): bath towel, wool blanket

Object selection uses the same two-stage stratified picker as B7, with cross-session avoidance keyed on the category code rather than the fallacy type. This serves both as anti-memorisation and as protection against any object-specific affordance bias dominating a respondent’s trajectory.

**Fluency.**

Count of distinct entries after trimming, lower-casing, stripping non-alphanumeric characters, and collapsing internal whitespace. Two entries that normalise to the same string are treated as duplicates and counted once.

**Flexibility.**

Each entry is mapped to one or more category tokens via a per-object dictionary (one dictionary per object, with roughly 50–80 keyword variants distributed across 10 categories each, bundled in `data/instrument/c7_dictionaries.json`). Flexibility is the count of distinct categories spanned by the entries.

**Combined score (0-4).**

- ≥ 8 fluent and ≥ 5 categories → **0**: strong fluency and category diversity

- ≥ 5 fluent and ≥ 3 categories (not qualifying for band 0) → **1**: adequate fluency and diversity

- 3–4 fluent → **2**: moderate fluency, limited diversity

- 1–2 fluent → **3**: low fluency

- 0 fluent, or ≥ 5 fluent with < 3 categories → **4**: very low fluency or all near-duplicates

Operationally, the band-4 “all near-duplicates” case fires when a respondent produces five or more entries that all map to one or two categories (e.g., five different ways to throw or break a brick all map to `weapon`); this is the intended “fluent but fixated” case. Fluency 3–4 with no category spread falls into band 2 rather than band 4 because the small entry count makes the fixation diagnosis unreliable.

**Worked example.**

For the prompt *a brick*, the response

> `1. build a wall`  
> `2. use as a doorstop`  
> `3. sharpen a knife on it`  
> `4. hold down papers`  
> `5. as a step`

normalises to five distinct entries (fluency = 5). Mapped to the brick dictionary: `build a wall` → building; `doorstop` → weight; `sharpen` → tool; `hold down papers` → weight; `step` → building. Distinct categories: {building, weight, tool}, flexibility = 3. Score: fluency 5 with flexibility 3 → band 1.

**Threshold provenance.**

The threshold values (8, 5, 5, 3, 3, 4, 2, 1) are provisional and were set ex ante based on the distribution of fluency and flexibility values reported in the AUT literature for adult samples on common-object prompts. Any revision would change the numerical cut-points without changing the band count or the band direction.

**What the scoring heuristic does not capture.**

The deterministic client-side scoring captures fluency and category-level flexibility but not originality (statistical rarity of a use) or elaboration (depth of description); within this domain, originality is carried by the self-report items rather than the probe. Originality scoring from the probe requires sample-level frequency data, which the tool does not collect; elaboration scoring requires human raters. Both are out of scope for the probe. Because the object pool and category dictionaries are public, the heuristic is also satisfiable by keyword stuffing; a respondent determined to reach band 0 can do so mechanically. The tool’s threat model is self-deception rather than adversarial input, so this is disclosed rather than defended against.

## References

Abbas, Muhammad, Farooq Ahmed Jam, and Tariq Iqbal Khan. 2024. “Is It Harmful or Helpful? Examining the Causes and Consequences of Generative AI Usage Among University Students.” *International Journal of Educational Technology in Higher Education* 21: 10. <https://doi.org/10.1186/s41239-024-00444-7>.

Anderson, Barrett R, Jash Hemant Shah, and Max Kreminski. 2024. “Homogenization Effects of Large Language Models on Human Creative Ideation.” In *Proceedings of the 16th Conference on Creativity & Cognition*, 413–25. C&c ’24. New York, NY, USA: Association for Computing Machinery. <https://doi.org/10.1145/3635636.3656204>.

Bastani, Hamsa, Osbert Bastani, Alp Sungu, Haosen Ge, Özge Kabakcı, and Rei Mariman. 2025. “Generative AI Without Guardrails Can Harm Learning: Evidence from High School Mathematics.” *Proceedings of the National Academy of Sciences* 122 (26): e2422633122. <https://doi.org/10.1073/pnas.2422633122>.

Brand, Matthias, Kimberly S. Young, Christian Laier, Klaus Wölfling, and Marc N. Potenza. 2016. “Integrating Psychological and Neurobiological Considerations Regarding the Development and Maintenance of Specific Internet-Use Disorders: An Interaction of Person-Affect-Cognition-Execution (I-PACE) Model.” *Neuroscience & Biobehavioral Reviews* 71: 252–66. <https://doi.org/10.1016/j.neubiorev.2016.08.033>.

Carolus, Astrid, Martin J. Koch, Samantha Straka, Marc Erich Latoschik, and Carolin Wienrich. 2023. “MAILS - Meta AI Literacy Scale: Development and Testing of an AI Literacy Questionnaire Based on Well-Founded Competency Models and Psychological Change- and Meta-Competencies.” *Computers in Human Behavior: Artificial Humans* 1 (2): 100014. <https://doi.org/10.1016/j.chbah.2023.100014>.

Dell’Acqua, Fabrizio, Edward McFowland III, Ethan R. Mollick, Hila Lifshitz-Assaf, Katherine Kellogg, Saran Rajendran, Lisa Krayer, François Candelon, and Karim R. Lakhani. 2023. “Navigating the Jagged Technological Frontier: Field Experimental Evidence of the Effects of AI on Knowledge Worker Productivity and Quality.” Working Paper 24-013. Harvard Business School. <https://doi.org/10.2139/ssrn.4573321>.

Dergaa, Ismail, Helmi Ben Saad, Jordan M. Glenn, Badii Amamou, Mohamed Ben Aissa, Noomen Guelmami, Feten Fekih-Romdhane, and Karim Chamari. 2024. “From Tools to Threats: A Reflection on the Impact of Artificial-Intelligence Chatbots on Cognitive Health.” *Frontiers in Psychology* Volume 15 - 2024. <https://doi.org/10.3389/fpsyg.2024.1259845>.

Doshi, Anil R., and Oliver P. Hauser. 2024. “Generative AI Enhances Individual Creativity but Reduces the Collective Diversity of Novel Content.” *Science Advances* 10 (28): eadn5290. <https://doi.org/10.1126/sciadv.adn5290>.

Drosos, Ian, Advait Sarkar, Xiaotong, Xu, and Neil Toronto. 2025. “"It Makes You Think": Provocations Help Restore Critical Thinking to AI-Assisted Knowledge Work.” <https://arxiv.org/abs/2501.17247>.

Etkin, Hudson K., Kai J. Etkin, Ryan J. Carter, and Camarin E. Rolle. 2025. “Differential Effects of GPT-Based Tools on Comprehension of Standardized Passages.” *Frontiers in Education* Volume 10 - 2025. <https://doi.org/10.3389/feduc.2025.1506752>.

Fang, Cathy Mengying, Auren R. Liu, Valdemar Danry, Eunhae Lee, Samantha W. T. Chan, Pat Pataranutaporn, Pattie Maes, et al. 2025. “How AI and Human Behaviors Shape Psychosocial Effects of Extended Chatbot Use: A Longitudinal Randomized Controlled Study.” <https://arxiv.org/abs/2503.17473>.

Garcia Castro, Raul Alberto, William Maximo Bartesaghi Aste, Jose Luis Morales Quezada, and Lupita Esmeralda Arocutipa Huanacuni. 2025. “Artificial Intelligence Dependence in Academic Tasks: Design and Validation of the SAID Questionnaire.” *Online Journal of Communication and Media Technologies* 15 (4): e202529. <https://doi.org/10.30935/ojcmt/17303>.

Gerlich, Michael. 2025a. “AI Tools in Society: Impacts on Cognitive Offloading and the Future of Critical Thinking.” *Societies* 15 (1): 6. <https://doi.org/10.3390/soc15010006>.

Gerlich, Michael. 2025b. “From Offloading to Engagement: An Experimental Study on Structured Prompting and Critical Reasoning with Generative AI.” *Data* 10 (11). <https://doi.org/10.3390/data10110172>.

Guilford, Joy Paul. 1967. *The Nature of Human Intelligence*. McGraw-Hill. <https://archive.org/details/natureofhumanint0000guil>.

Hohenstein, Jess, René F. Kizilcec, Dominic DiFranzo, Zhila Aghajari, Hannah Mieczkowski, Karen Levy, Mor Naaman, Jeffrey Hancock, and Malte F. Jung. 2023. “Artificial Intelligence in Communication Impacts Language and Social Relationships.” *Scientific Reports* 13: 5487. <https://doi.org/10.1038/s41598-023-30938-9>.

Holzner, Niklas, Sebastian Maier, and Stefan Feuerriegel. 2025. “Generative AI and Creativity: A Systematic Literature Review and Meta-Analysis.” <https://arxiv.org/abs/2505.17241>.

Hong, Hui, Poonsri Vate-U-Lan, and Chantana Viriyavejakul. 2025. “Cognitive Offload Instruction with Generative AI: A Quasi‑experimental Study on Critical Thinking Gains in English Writing.” *Forum for Linguistic Studies*, no. 7: 325–34. <https://doi.org/10.30564/fls.v7i7.10072>.

Jakesch, Maurice, Jeffrey T. Hancock, and Mor Naaman. 2023. “Human Heuristics for AI-Generated Language Are Flawed.” *Proceedings of the National Academy of Sciences* 120 (11): e2208839120. <https://doi.org/10.1073/pnas.2208839120>.

Jin, Yueqiao, Roberto Martinez-Maldonado, Dragan Gašević, and Lixiang Yan. 2024. “GLAT: The Generative AI Literacy Assessment Test.” <https://arxiv.org/abs/2411.00283>.

Kosmyna, Nataliya, Eugene Hauptmann, Ye Tong Yuan, Jessica Situ, Xian-Hao Liao, Ashly Vivian Beresnitzky, Iris Braunstein, and Pattie Maes. 2025. “Your Brain on ChatGPT: Accumulation of Cognitive Debt When Using an AI Assistant for Essay Writing Task.” <https://doi.org/10.48550/arXiv.2506.08872>.

Kumar, Harsh, Jonathan Vincentius, Ewan Jordan, and Ashton Anderson. 2025. “Human Creativity in the Age of LLMs: Randomized Experiments on Divergent and Convergent Thinking.” In *Proceedings of the 2025 CHI Conference on Human Factors in Computing Systems*. CHI ’25. New York, NY, USA: Association for Computing Machinery. <https://doi.org/10.1145/3706598.3714198>.

Lee, Hao-Ping (Hank), Advait Sarkar, Lev Tankelevitch, Ian Drosos, Sean Rintel, Richard Banks, and Nicholas Wilson. 2025. “The Impact of Generative AI on Critical Thinking: Self-Reported Reductions in Cognitive Effort and Confidence Effects from a Survey of Knowledge Workers.” In *Proceedings of the 2025 CHI Conference on Human Factors in Computing Systems (CHI ’25)*. Yokohama, Japan: ACM. <https://doi.org/10.1145/3706598.3713778>.

Liu, Grace, Brian Christian, Tsvetomira Dumbalska, Michiel A. Bakker, and Rachit Dubey. 2026. “AI Assistance Reduces Persistence and Hurts Independent Performance.” <https://arxiv.org/abs/2604.04721>.

Makransky, Guido, Ban M. Shiwalia, Tue Herlau, and Steven Blurton. 2025. “Beyond the ‘Wow’ Factor: Using Generative AI for Increasing Generative Sense-Making.” *Educational Psychology Review* 37: 60. <https://doi.org/10.1007/s10648-025-10039-x>.

Ng, Davy Tsz Kit, Jac Ka Lok Leung, Kai Wah Samuel Chu, and Maggie Shen Qiao. 2021. “AI Literacy: Definition, Teaching, Evaluation and Ethical Issues.” *Proceedings of the Association for Information Science and Technology* 58 (1): 504–9. https://doi.org/<https://doi.org/10.1002/pra2.487>.

Padmakumar, Vishakh, Lujain Ibrahim, Zora Zhiruo Wang, Jennifer Wang, Q. Vera Liao, and Diyi Yang. 2026. “Offloading Score: Measuring AI Reliance Through Counterfactual Workflows.” <https://arxiv.org/abs/2605.29392>.

Peters, Uwe, and Benjamin Chin-Yee. 2025. “Generalization Bias in Large Language Model Summarization of Scientific Research.” *Royal Society Open Science* 12: 241776. <https://doi.org/10.1098/rsos.241776>.

Riley, Celeste, Omar Al-Refai, Yadira Colunga Reyes, and Eman Hammad. 2025. “Human-AI Interactions: Cognitive, Behavioral, and Emotional Impacts.” <https://doi.org/10.48550/arXiv.2510.17753>.

Risko, Evan F., and Sam J. Gilbert. 2016. “Cognitive Offloading.” *Trends in Cognitive Sciences* 20 (9): 676–88. <https://doi.org/10.1016/j.tics.2016.07.002>.

Rismanchian, Sina, Hasan Uzun, Jeffrey Matayoshi, Eric Cosyn, and Eyad Kurd-Misto. 2026. “Faster Completion, Less Learning: Generative AI Reduced Study Time on Math Problems and the Knowledge They Build.” <https://arxiv.org/abs/2605.21629>.

Schepman, Astrid, and Paul Rodway. 2020. “Initial Validation of the General Attitudes Towards Artificial Intelligence Scale.” *Computers in Human Behavior Reports* 1: 100014. <https://doi.org/10.1016/j.chbr.2020.100014>.

Shaw, Steven D., and Gideon Nave. 2026. “Thinking—Fast, Slow, and Artificial: How AI Is Reshaping Human Reasoning and the Rise of Cognitive Surrender.” *The Wharton School Research Paper*. <https://doi.org/10.2139/ssrn.6097646>.

Silvia, Paul J., Beate P. Winterstein, John T. Willse, Christopher M. Barona, Joshua T. Cram, Karl I. Hess, Jenna L. Martinez, and Crystal A. Richard. 2008. “Assessing Creativity with Divergent Thinking Tasks: Exploring the Reliability and Validity of New Subjective Scoring Methods.” *Psychology of Aesthetics, Creativity, and the Arts* 2 (2): 68–85. <https://doi.org/10.1037/1931-3896.2.2.68>.

Singh, Anjali, Karan Taneja, Zhitong Guan, and Avijit Ghosh. 2025. “Protecting Human Cognition in the Age of AI.” <https://doi.org/10.48550/arXiv.2502.12447>.

Tankelevitch, Lev, Viktor Kewenig, Auste Simkute, Ava Elizabeth Scott, Advait Sarkar, Abigail Sellen, and Sean Rintel. 2024. “The Metacognitive Demands and Opportunities of Generative AI.” In *Proceedings of the 2024 CHI Conference on Human Factors in Computing Systems*. CHI ’24. New York, NY, USA: Association for Computing Machinery. <https://doi.org/10.1145/3613904.3642902>.

Wadinambiarachchi, Samangi, Ryan M. Kelly, Suranjana Pareek, Qian Zhou, and Eduardo Velloso. 2024. “The Effects of Generative AI on Design Fixation and Divergent Thinking.” In *Proceedings of the 2024 CHI Conference on Human Factors in Computing Systems (CHI ’24)*. Honolulu, HI, USA: ACM. <https://doi.org/10.1145/3613904.3642919>.

Wan, Yun, and Yoram M. Kalman. 2026. “Diverse AI Personas Can Mitigate the Homogenization Effect in Human-AI Collaborative Ideation.” *Computers in Human Behavior: Artificial Humans* 8: 100289. <https://doi.org/10.1016/j.chbah.2026.100289>.

Wang, Bingcheng, Pei-Luen Patrick Rau, and Tianyi Yuan. 2023. “Measuring User Competence in Using Artificial Intelligence: Validity and Reliability of Artificial Intelligence Literacy Scale.” *Behaviour & Information Technology* 42 (9): 1324–37. <https://doi.org/10.1080/0144929X.2022.2072768>.

Wu, Houyu, Haiyang Ni, Wenfu Luo, and Tenglong Wu. 2026. “Development and Validation of the AI Dependence Scale for Chinese Undergraduates and a Preliminary Exploration.” *Frontiers in Psychology* Volume 16 - 2025. <https://doi.org/10.3389/fpsyg.2025.1725393>.

