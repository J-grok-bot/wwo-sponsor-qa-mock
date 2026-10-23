# Package QA: interactive mock

**Demo - example data.** Prepared for Westwood One as a discussion piece. Every sponsor, show, host, studio, promo code, link, person, and email address here is fictional. Nothing in this mock describes Westwood One's real systems, clients, or numbers.

**Live demo:** https://j-grok-bot.github.io/wwo-sponsor-qa-mock/

## What it shows

1. **Two ways in, one bot network.** A **web form** behind a mock sign-in (prefilled `jordan.lee`, not real auth) and an **email inbox** (`packages@[TBD]`, address not decided) that the bot network reads directly, with no import step. Each submission becomes its own job (`QA-W-0001`, `QA-E-0001`) and runs in parallel. Each job is checked once, and jobs never share work.
2. **Any format.** Word, PDF, Excel, CSV, JSON, plain text, or pasted links, several files per job. A **Detected contents** panel shows how the (simulated) AI mapped each file to a field, with a confidence score and an override menu. Scanned PDFs, images, and unusual schedule grids are flagged **Extra parsing**.
3. **Ten bots, side by side:** Project Manager, Interface, Schedule, Duplicate Promo Code, Wrong Promo Code, Link, Grammar, Spelling, Host Rules (banned wording), and Verification.
4. **The person stays in the loop.** Findings are named in plain words, with the offending text highlighted. For each one: **Accept fix**, **Edit**, or **Dismiss with reason**. **Re-run checks** repeats until everything is clear, and a re-check catches problems a fix introduced. A named approver then signs off. **Ship to studios** stays locked until approval. A package can also be **rejected with a reason**.
5. **Records:** an add-only audit trail, a mock Google Drive folder per package (each version saved as a new file), and a **History** view of every submission (job ID, source, submitter, time, rounds, found/fixed/dismissed, status, approver).
6. **Submitter badges** on every job: "Submitted by jordan.lee (Web)" or "From traffic@example-agency.test (Email)".

## Demo script (about 3 minutes)

1. **Intake (30 s).** Point at the two lanes: *Web form → Checks → Results* and *Email → Bot inbox → Checks → Results*. Note the TBD inbox address and the "Demo login" note.
2. **Web submission (30 s).** Click **Sign in** (jordan.lee), then **Load sample package**. Show **Detected contents**: Word, Excel, CSV, JSON, and pasted links mapped to fields. The schedule grid is flagged *Extra parsing* at 78%. Change one mapping to show the override. Click **Submit for checking**.
3. **Email submission (20 s).** Click **Simulate email arriving**. A fictional email from `traffic@example-agency.test` lands with 7 attachments, including a scanned PDF flagged as not used. The bot picks it up on its own.
4. **Parallel run (20 s).** Scroll to **Jobs**. Job A (Web, Package 1) and Job B (Email, Package 2) run at the same time. Watch the Project Manager route, the Interface Bot check completeness, seven checkers run in parallel, and the Verification Bot double-check. (Or click **Run both at once** on a fresh start.)
5. **Review (60 s).** Open Job B. Each finding is one plain-language sentence with the text highlighted. **Accept** the duplicate promo code fix, **Edit** the banned-wording line, and **Dismiss** the Verification catch with a reason. Then click **Re-run checks**. Round 2 flags *New this round*: changing Juniper's code exposed a script that still says SAVE20, and removing the out-of-flight row left a gap. Fix those and re-run until **All clear**.
6. **Sign-off and ship (30 s).** Confirm the checkbox, enter the approver name and signature, and click **Approve**. **Ship to studios** unlocks, and the three fictional studios flip to *Delivered*. Show the audit trail and the Drive folder.
7. **History (10 s).** Open **History**: both jobs with source, submitter, rounds, and outcome. Optionally go back to Job A and **Reject** it with a reason.

Click **Reset demo** to start over. State is saved in your browser's localStorage.

## What is real and what is simulated

- **Real, in the browser:** the rule-based checks (`assets/engine.js`) run on the sample content, so findings, fixes, and re-checks actually work and are deterministic.
- **Simulated:** the AI layout detection, the email inbox, the sign-in, the link checks (a fixed status table), the Google Drive folder, studio delivery, and storage. There are no network calls besides loading fonts and the word list.
- Uploaded binary files (Word, PDF, Excel, images) are listed and mapped but **not actually read** in this mock. Plain text, CSV, and JSON uploads are read.

## Structure

```
index.html            app shell (Intake / Review / History)
assets/app.js         UI, jobs, bots, review loop, sign-off, shipping, audit, history
assets/engine.js      rule-based checkers (schedule, codes, links, grammar, spelling, host rules)
assets/parse.js       turns form fields into a package
assets/samples.js     two fictional packages (web: week of Nov 2; email: week of Nov 9)
assets/icons.js       Lucide icons (ISC license, see assets/LUCIDE-LICENSE)
assets/styles.css     styles, responsive down to 390 px
data/wordlist.txt     word list for the spelling check
screenshots/          desktop (1280x800) and mobile (390x844) captures
```

Run locally with `python3 -m http.server` and open http://localhost:8000.
