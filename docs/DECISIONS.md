# Decision log

Every non-obvious design decision: date, decision, alternatives, reason (SPEC.md Section 1). Changes to the research design additionally record the candidate's written approval.

Status values: **Accepted** (in force), **Proposed** (awaiting the candidate), **Superseded**.

---

## D-001 Threat model is part of the repository and wins over the spec

- **Date:** 2026-10-21 · **Status:** Accepted
- **Decision:** The companion _Threat Model and Security Properties_ (19 Oct 2026) is stored verbatim as `docs/THREAT-MODEL.md`, next to `SPEC.md`. Where they differ, the threat model wins (SPEC.md Section 2). Both files are excluded from automatic formatting so they stay byte-identical to the documents as received.
- **Alternatives:** Keep the threat model outside the repository.
- **Reason:** The experiments test the claims in that document. Examiners and the agent must be able to read the exact version the code was built against.

## D-002 Node.js 24 LTS everywhere

- **Date:** 2026-10-21 · **Status:** Accepted
- **Decision:** Target Node.js 24.22.1, the current LTS at build start, in `.nvmrc`, `engines` and CI. The build machine was upgraded from 22.17.1 to 24.22.1 the same day (official MSI, SHA-256 checked against `SHASUMS256.txt`). `engine-strict` is on, so pnpm refuses to run on any other Node version.
- **Alternatives:** Target Node 22 (maintenance LTS).
- **Reason:** SPEC.md Section 3 requires the current LTS, and results must be produced on the pinned runtime.

## D-003 TypeScript 7 with strict type checking; no ESLint for now

- **Date:** 2026-10-21 · **Status:** Accepted
- **Decision:** Use TypeScript 7.0.2 (latest stable), `strict` plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. Code quality gates in CI are Prettier formatting and `tsc` type checking. ESLint is not used.
- **Alternatives:** (a) Pin TypeScript 6.0 so that `typescript-eslint` (which supports `<6.1.0`) works. (b) Use a different linter.
- **Reason:** SPEC.md Section 3 asks for the latest stable release. The strict compiler catches most of what lint rules would; adding a linter later is cheap. Revisit if `typescript-eslint` gains TypeScript 7 support, or if chaincode tooling (M4) needs TypeScript 6.

## D-004 pnpm 12 run through npx locally

- **Date:** 2026-10-21 · **Status:** Accepted
- **Decision:** pnpm 12.14.0 is pinned in `packageManager`. Locally it runs via `npx -y pnpm@12.14.0` (or a global install); CI uses `pnpm/action-setup`, which reads `packageManager`.
- **Alternatives:** Corepack.
- **Reason:** The installed Corepack (0.33) cannot launch pnpm 12, whose package layout changed.

## D-005 LF line endings enforced

- **Date:** 2026-10-21 · **Status:** Accepted
- **Decision:** `.gitattributes` normalises every text file to LF; Prettier and `.editorconfig` agree.
- **Alternatives:** Platform-default line endings.
- **Reason:** The build machine is Windows and CI is Linux. Byte-identical workload files (SPEC.md Section 9) and checksums must not depend on the checkout platform.

## D-006 CI actions pinned to commit SHAs

- **Date:** 2026-10-21 · **Status:** Accepted
- **Decision:** Every GitHub Action is referenced by full commit SHA with its tag in a comment; versions listed in `VERSIONS.md`.
- **Alternatives:** Reference by tag only.
- **Reason:** Tags can be moved; SHAs make the CI environment reproducible, in line with the pinned-versions constraint.

## D-007 Repository is local until a remote is chosen

- **Date:** 2026-10-21 · **Status:** Accepted
- **Decision:** The repository is created at `D:\DEVELOPMENT\Blockchain\referral-testbed`. The candidate adds a private GitHub remote; until then the CI workflow's commands are run locally.
- **Alternatives:** A public repository from the start.
- **Reason:** Candidate's choice (21 Oct 2026). The M0 criterion "CI runs on push" is met at the first green run on GitHub. The repository can be made public for the archived release (M9).

## D-008 Validly signed false events are out of scope

- **Date:** 2026-10-21 · **Status:** Accepted
- **Decision:** The architectures order, store and serve signed events; they do not judge whether an event is clinically true. A validly signed false event (for example two colluding facilities recording an arrival that did not happen) is accepted by every architecture alike and is outside this study.
- **Alternatives:** None considered; required by SPEC.md Section 5 and THREAT-MODEL.md Sections 1 and 9.
- **Reason:** The research question concerns custodian withdrawal and misbehaviour, not facility honesty. This is stated as thesis limitation 3.

## D-009 Event schema amendments: `corrects`, `redirectTo`, per-type fields

- **Date:** 2026-10-21 · **Status:** Accepted. Approved by the candidate in writing, 21 Oct 2026 (research-design change to SPEC.md Section 5).
- **Decision:** `referral-event/v1` gains two fields. `corrects` is required on CORRECTION (the corrected `eventId`) and `null` otherwise. `redirectTo` is required on REDIRECT (the new destination) and `null` otherwise. Every event carries `referralId`, `fromFacility`, `toFacility`, `signer` and `type`, and after ISSUE `fromFacility` and `toFacility` must match the referral's current state. `patientToken` and `urgency` appear on ISSUE only (`null` otherwise). `documentHash` is the hash of that event's own synthetic document, or `null`. REDIRECT is signed by the current `toFacility`, and the state machine moves `toFacility` to `redirectTo`.
- **Alternatives:** (a) Overload `toFacility` on REDIRECT to mean the new destination. (b) Repeat `patientToken` and `urgency` on every event.
- **Reason:** The SPEC.md rule for CORRECTION ("signed by the facility that signed the corrected event") cannot be checked without naming the corrected event. A separate `redirectTo` keeps `toFacility` meaning "the current destination" on every event. Keeping the patient token on ISSUE only means it is written once per referral.

## D-010 Corrections are appended, never applied in place

- **Date:** 2026-10-21 · **Status:** Accepted. Approved by the candidate, 21 Oct 2026.
- **Decision:** A CORRECTION is a new event in the history; the corrected event is never altered. The verifier reports a corrected event as "original + correction".
- **Alternatives:** Replace the corrected event.
- **Reason:** An in-place change would be indistinguishable from the custodian's Rewrite capability, which P2 tests for.

## D-011 Routing: up one tier, with configured bypass to the teaching hospital

- **Date:** 2026-10-21 · **Status:** Accepted. Approved by the candidate, 21 Oct 2026.
- **Decision:** By default a referral goes up one tier (CHPS, then health centre, district hospital, regional hospital, teaching hospital), within the district with configured probability. District hospitals may refer directly to the teaching hospital, and each lower tier has a configured probability of doing so. This bypass is an assumption, citing Nkyekyer (2000) and Amoah and Phillips (2017); the candidate supplies the full references for the bibliography.
- **Alternatives:** Strict one-tier routing.
- **Reason:** Taken literally, strict one-tier routing would send the teaching hospital referrals only from the regional hospital, which contradicts Nkyekyer's finding that 86% of Korle Bu peripartum referrals came from polyclinics and private midwives.

## D-012 Calibration anchor: teaching-hospital inbound, about 130 a month

- **Date:** 2026-10-21 · **Status:** Accepted. Approved by the candidate, 21 Oct 2026. Replaces the "about 400 a month" baseline in SPEC.md Section 9.
- **Decision:** At 1x, expected inbound referrals to the teaching hospital are about 130 a month (Surazu and Korsah 2023, Tamale). The Korle Bu maternity figure (Nkyekyer 2000) is reported as an upper bound. A tier's total issuing rate is proportional to tier weight times facility count; the tier weights are assumptions, and one scale constant is solved so that the teaching-hospital inbound rate matches the anchor.
- **Alternatives:** 400 a month (emergency and maternity combined), or rates set per facility by hand.
- **Reason:** The Tamale figure is recent, specific to an emergency unit and directly counted; the Korle Bu figure is from 2000. Anchoring on one published figure, with the rest stated as assumptions, is easier to defend than a combined estimate.

## D-013 "Called back" modelled as REDIRECT

- **Date:** 2026-10-21 · **Status:** Accepted. Approved by the candidate, 21 Oct 2026.
- **Decision:** The 6% "called back" outcome in Surazu and Korsah (2023) is modelled as a REDIRECT to another facility of the original destination's tier, after which the referral draws a fresh outcome. EXPERIMENTS.md quotes the paper's table and wording exactly, so readers can judge the mapping. The 82/12/6 split is applied at every receiving tier, an assumption because the source is one teaching hospital. Open point: the teaching and regional tiers have one facility each, so the agent proposes that a redirect from either goes to the other (awaiting the candidate's confirmation).
- **Alternatives:** Model "called back" as DECLINE.
- **Reason:** Candidate's decision.

## D-014 Facility owners are illustrative

- **Date:** 2026-10-21 · **Status:** Accepted; TBD-CANDIDATE until a verified source is found. Approved by the candidate, 21 Oct 2026.
- **Decision:** Teaching hospital `TEACHING`; regional hospital and 5 of 6 district hospitals `GHS`; 1 district hospital `CHAG`; health centres 20 `GHS`, 3 `CHAG`, 1 `PRIVATE`; CHPS 74 `GHS`, 4 `CHAG`, 2 `PRIVATE`. The health-centre and CHPS counts are the agent's concrete reading of "mostly GHS with a few CHAG and PRIVATE". Owners are assigned to specific facilities by a seeded draw.
- **Alternatives:** None verified yet.
- **Reason:** Ownership decides which A2 member organisation a facility submits through, so every member except NHIA needs at least one facility. No P1 to P5 outcome should depend on the exact counts (D-015).

## D-015 Workload placeholders, and a sensitivity check

- **Date:** 2026-10-21 · **Status:** Accepted. Approved by the candidate, 21 Oct 2026.
- **Decision:** Steps with no published Ghanaian figure (urgency mix, arrival and non-arrival, counter-referral, correction rate, delays, tier weights, bypass probabilities, owner counts) use `CONFIG` placeholders, each listed as an assumption in EXPERIMENTS.md. No P1 to P5 outcome may depend on them. A small sensitivity check, varying the placeholders and confirming that property outcomes do not change, is scheduled for M4 at the candidate's request. Open point: measuring P1 to P5 needs the M5 fault harness, so the agent has asked whether the check should move to M5 or M6.
- **Alternatives:** Treat placeholders as fixed.
- **Reason:** The claims under test concern custodian behaviour, not clinical traffic patterns. The check demonstrates that.

## D-016 E1 saturation ramp for every architecture

- **Date:** 2026-10-21 · **Status:** Accepted. Approved by the candidate, 21 Oct 2026. Restates the SPEC.md Section 9 stress profile.
- **Decision:** E1 includes an open-loop saturation ramp for A0, A1 and A2: the offered rate increases step by step (doubling each `CONFIG` interval) until p95 write latency or error rate exceeds its `CONFIG` threshold. The maximum sustainable rate is the last step within both thresholds. Built with the replayer (M2) and run as a scenario (M5).
- **Alternatives:** Closed-loop load, where each client waits for its previous response.
- **Reason:** Realistic referral volumes are too low to stress any of the architectures. Under open-loop load a slow system cannot slow its own workload, so its saturation point is measured honestly.

## D-017 Go differential tests run in CI only

- **Date:** 2026-10-21 · **Status:** Accepted. Candidate's decision, 21 Oct 2026.
- **Decision:** The Merkle differential tests against `transparency-dev/merkle` (M3) use a small Go program that runs only in CI, where the workflow installs a pinned Go version. Go is not installed on the build machine. Locally those tests are skipped with a clear message, while the RFC vectors and property tests still run.
- **Alternatives:** Install Go locally; commit pre-generated reference vectors.
- **Reason:** Keeps the build machine simple. CI runs the tests on every push, so every commit is still checked against the reference implementation.

## D-018 Chaincode may fall back to TypeScript 6

- **Date:** 2026-10-21 · **Status:** Accepted. Candidate's decision, 21 Oct 2026.
- **Decision:** If `fabric-contract-api` (its decorators, or the Fabric chaincode build and packaging) fails under TypeScript 7, only the A2 chaincode package is pinned to the latest TypeScript 6 release; every other package stays on TypeScript 7. The shared `common/` code bundled into the chaincode must then compile under both.
- **Alternatives:** Move the whole monorepo to TypeScript 6.
- **Reason:** Limits the fallback to the one package that has the dependency. The decision is taken at M4 and recorded here in advance.
