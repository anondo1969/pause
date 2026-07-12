# Privacy, explained

*Why this tool keeps nothing, and how that actually works.*

---

Most things you do on the web are recorded somewhere. A quiz like this one would normally sit on a server that receives your answers, stores them in a database, and quietly logs who you are. PAUSE does none of that. That is a deliberate choice, and it is the whole point of the design. This page explains, in plain language, what does and does not happen when you use it.

## The short version

PAUSE is just a set of static files. There are a few pages, some styling, and the code that does the scoring. When you take the self-check, every calculation happens inside your own browser, on your own device. Your answers are never sent anywhere, because there is nowhere for them to be sent. When you close the tab, they are gone. If you take the whole thing and then walk away, nothing remains anywhere to say that you were ever here.

## Why a tool like this must not harvest

There is an honest tension in building software to help people notice what they hand over to software. A tool that asks you to reflect on what you delegate should not become one more thing you delegate to. It should not quietly collect your reflection either. So the privacy posture is not something bolted on at the end. It grows out of the same idea the tool is about, turned back on the tool itself. Attend to what leaves your hands, and let as little leave as possible.

## What "no backend" means

Most web applications have two halves. One part runs in your browser, and it is called the *front end*. The other part runs on a company's server, and it is called the *back end*. The back end is usually where data is stored, accounts are kept, and activity is logged.

PAUSE has no back end. There is no server that receives your responses, no database, no account system, and no submit button that sends anything away. The entire tool is delivered to your browser as plain files, and from that point on it runs locally. This is why it can promise to keep nothing. There is no machine on the other side that could keep it.

## How comparison works without storing anything

At the end of the self-check you are offered a short, opaque string called a *return token*. It encodes your four readings. You copy it and keep it yourself, in a notes app or a password manager. There is no copy on any server, because, again, there is no server.

If you come back later and paste that token into the Compare page, the comparison is worked out in your browser from the token you pasted. Your history lives with you, in the strings you chose to keep, and nowhere else. If you lose a token, it is simply gone. There is no account to recover it from. That is the same fact that makes the tool private in the first place.

## What the host can and cannot see

The pages are served from GitHub Pages. Like any web host, GitHub can see the ordinary metadata that comes with serving a file. Roughly, it can see that some browser requested a page, along with basic technical details like an IP address. That is standard for the entire web, and it is governed by the host's own privacy policy rather than by this project.

What the host cannot see is anything you answer. Your responses never travel to it. The questions you saw, the boxes you ticked, and the readings you got are never transmitted. So none of that can be logged, by the host or by anyone. The application itself adds no analytics, sets no tracking cookies, and loads no third-party scripts.

## No AI inside

It would have been easy to put a language model somewhere in here, to generate feedback or to score the open-text exercise more cleverly. There is none. A tool meant to help you reflect on cognitive offloading should not itself become a thing you offload to. It certainly should not ship your private reflection off to a model to be processed. The scoring is plain, deterministic code that you can read in the open-source repository. What it does to your answers is exactly what it says, and nothing more.

## What this means for you

No account. No login. No email. No tracking. No server. No model. Everything runs in your browser and is forgotten when you close the tab. You take it, you read your own patterns, and you leave with nothing about you stored anywhere.

We did not treat that constraint as a limitation to work around. It was the reason to build the tool this way.
