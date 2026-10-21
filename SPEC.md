# Build Specification: Withdrawal-Resilience Testbed for Referral Records

Oct 19, 2026 · @Zeferra

## 1. How to use this specification

This document is the complete brief for building the experimental testbed for an MPhil Computer Science thesis, *Evaluating Blockchain for Health Data Management in Ghana: Withdrawal-Resilient Architectures for Referral Records*. Give it to the AI coding agent in full, save a copy in the repository as `SPEC.md`, and work through it milestone by milestone (Section 14).

**For the candidate.** Values marked `CONFIG` are defaults you may change. Values marked `TBD-CANDIDATE` need a decision from you or your supervisor before the milestone that uses them. Review every milestone before the next one starts. You must be able to explain every component at your viva, so read the notes the agent writes for you (Section 13).

### Instructions to the agent

You are a senior distributed-systems and security engineer building a research testbed, not a product. Your job is to build three record architectures behind one API, a workload generator, a fault-injection harness, a results pipeline and a demonstration dashboard, so that the candidate can run controlled experiments and report the results in a thesis.

Work this way:

1. Build one milestone at a time, in the order of Section 14. Do not start a milestone until the previous one meets its acceptance criteria.
2. Before writing code for a milestone, write a short plan in `docs/plans/M<n>.md` and wait for the candidate's approval.
3. Write tests with the code. A milestone is done only when its tests pass in continuous integration.
4. Record every non-obvious design decision in `docs/DECISIONS.md` (date, decision, alternatives, reason). These become thesis text.
5. After each milestone, write `docs/candidate-notes/M<n>.md`: a plain-language explanation of what was built, how it works and what the candidate should be able to explain to examiners.
6. When the specification is ambiguous or seems wrong, stop and ask. Never silently change the research design, because that changes what the thesis can claim.
7. Never fabricate, hard-code or smooth results. Every number shown anywhere must come from a recorded run.

## 2. Research context

The testbed answers one question: which record architecture keeps inter-facility referral records available and verifiable when the organisation that runs the system (the custodian) withdraws or misbehaves, and at what cost? The motivating case is Ghana's 2025 national EHR (LHIMS), whose private operator withheld access and data.

### Architectures under test

- **A0 Central database.** The custodian runs a database with an audit table. Baseline.
- **A1 Witnessed transparency log.** The custodian runs a Merkle-tree log; independent witnesses co-sign its checkpoints and mirror its contents.
- **A2 Consortium blockchain.** Hyperledger Fabric with five member organisations and Byzantine fault-tolerant (BFT) ordering; every member holds a full replica.

### Threat model

The adversary is the custodian (in A0 and A1, the operator; in A2, one member organisation, or the stated number of colluding members). It may:

- **withdraw**: stop serving everyone, or some facilities;
- **withhold**: serve some records but hide others;
- **rewrite**: alter or delete past records in its storage;
- **equivocate**: show different histories to different facilities.

Assumptions: the cryptographic primitives are secure; each facility holds its own signing key; witnesses and members may collude with the custodian up to a configured number. The custodian cannot forge facility signatures.

### Properties to measure

| Property | What the testbed must measure |
| --- | --- |
| P1 Availability after withdrawal | Share of records committed before withdrawal that can be retrieved, and verified, from parties other than the custodian |
| P2 Tamper evidence | Whether, and how quickly, an honest verifier detects a rewrite |
| P3 Equivocation detection | Whether, and how quickly, inconsistent histories shown to two facilities are detected, by number of colluders |
| P4 Independent verifiability | Whether a facility can confirm a record's inclusion without trusting the custodian |
| P5 Omission detection | Whether, and how quickly, a facility notices that committed events are being hidden from it |

### Hypotheses

- **H1.** After the custodian withdraws, A1 and A2 retain a complete, independently verifiable history; A0 does not.
- **H2.** A1 provides that resilience at lower latency and resource cost than A2.

The testbed must be able to show either hypothesis false. Do not design anything that makes one architecture look better by construction; Section 4 requires all three to share one API, one workload and one fault harness.

The precise definitions of the threat model and properties, and the claims each experiment must confirm or refute, are in the companion document *Threat Model and Security Properties*. Where the two documents differ, the threat model wins. Decisions taken there: A2 is verified by agreement between members (verifying orderer block signatures is future work), and A1's inability to accept writes without its custodian is accepted as a stated property, not fixed.

## 3. Constraints and technology stack

Use TypeScript on Node.js for every service, Python only for statistical analysis, and Docker Compose for every deployment.

### Hard constraints

- **Synthetic data only.** No real patient data, names, Ghana Card numbers or phone numbers anywhere, including test fixtures.
- **One API.** A0, A1 and A2 implement the identical HTTP API in Section 4. The workload, fault harness, verifier and dashboard talk only to that API.
- **Reproducible.** Every run is started by one command, uses a recorded random seed, and records the git commit, configuration, software versions and hardware in its results.
- **Pinned versions.** Use the latest stable release of each dependency at the start of the build, pin exact versions in lockfiles, and list them in `VERSIONS.md`.
- **Open source only.** No paid services or proprietary dependencies.
- **Runs on one machine.** The full stack must run on one workstation (target: 8 cores, 32 GB RAM; `CONFIG`). Final experiments may be spread over 2 to 3 virtual machines.

### Technology stack

| Area | Choice | Notes |
| --- | --- | --- |
| Language | TypeScript, strict mode, Node.js current LTS | All services, chaincode, tools and dashboard |
| Monorepo | pnpm workspaces | One package per component |
| HTTP services | Fastify, with zod schemas | Schemas shared from `common/` |
| Cryptography | `@noble/hashes` (SHA-256), `@noble/ed25519` | Audited, dependency-free |
| Canonical JSON | RFC 8785 (JCS), e.g. the `canonicalize` package | Signatures cover canonical bytes |
| Identifiers | ULID | Sortable, collision-safe |
| A0 storage | PostgreSQL (current stable) |  |
| A1 storage | PostgreSQL or SQLite per service | One store per log and per witness |
| A2 platform | Hyperledger Fabric v3.x with BFT ordering | Chaincode with `fabric-contract-api`; client with `@hyperledger/fabric-gateway` |
| Metrics | `prom-client`, Prometheus, cAdvisor | Container CPU, memory, disk |
| Network faults | Linux `tc netem` (or Pumba for containers) | Experiment E6 |
| Tests | Vitest; fast-check for property tests |  |
| Dashboard | React + Vite; Server-Sent Events | Section 12 |
| Analysis | Python 3, pandas, SciPy, scikit-posthocs, statsmodels, matplotlib | Section 11 |
| CI | GitHub Actions | Unit tests on every push; integration tests nightly or on demand |

If a choice turns out to be unworkable, propose an alternative in `docs/DECISIONS.md` and wait for approval.

## 4. Repository layout and shared API

All three architectures sit behind one versioned HTTP API, and a shared conformance test suite proves that each implements it identically.

### Layout

```text
referral-testbed/
  SPEC.md  VERSIONS.md  README.md
  docs/            ARCHITECTURE.md, EXPERIMENTS.md, DECISIONS.md, plans/, candidate-notes/
  packages/
    common/        event schema, canonical JSON, signing, lifecycle rules, API types, conformance suite
    verifier/      facility-side verification library (one strategy per architecture)
    a0-central/    service + PostgreSQL
    a1-log/        log server
    a1-witness/    witness service (run 3 or 5 times)
    a2-fabric/     network config, chaincode/, gateway-adapter/
    workload/      synthetic event generator and replayer
    faults/        fault-injection harness and scenario runner
    metrics/       collectors and results writer
    dashboard/     demonstration UI and its control server
  deploy/          docker-compose files per architecture and per experiment
  scenarios/       YAML experiment definitions (E1 to E6)
  results/         raw run outputs (git-ignored except samples)
  analysis/        Python scripts and notebooks
```

### Shared API (version `v1`)

Every architecture exposes these endpoints behind its own base URL. Responses are JSON. Errors use RFC 9457 problem details.

| Method and path | Purpose | Returns |
| --- | --- | --- |
| `POST /v1/events` | Submit one signed referral event | `eventId`, `index` (position in the history), `committedAt`, `receipt` (architecture-specific commitment) |
| `GET /v1/events/{eventId}` | Fetch one event | The signed event and its `index` |
| `GET /v1/referrals/{referralId}/events` | Fetch a referral's history | Events in order |
| `GET /v1/history?from={index}&limit={n}` | Bulk export in order | Events from `index`; used by mirrors and recovery |
| `GET /v1/checkpoint` | Latest commitment to the whole history | A0: `null` (unsupported). A1: signed checkpoint with witness co-signatures. A2: block height and block hash. |
| `GET /v1/proof/inclusion/{eventId}?size={n}` | Proof that an event is in the history | A0: 501. A1: Merkle inclusion proof. A2: 501 (verified by cross-member agreement instead). |
| `GET /v1/proof/consistency?from={m}&to={n}` | Proof that the history only grew | A0: 501. A1: Merkle consistency proof. A2: 501. |
| `GET /health` | Liveness and readiness |  |
| `GET /metrics` | Prometheus metrics |  |

Where an architecture cannot support an endpoint, it returns 501 Not Implemented. That is an honest result, not a gap to paper over.

### Verifier library

`packages/verifier` is the facility's view. Its core function is:

```ts
verifyEvent(eventId: string, sources: Source[]): Promise<{
  available: boolean;   // retrieved from at least one source
  verified: boolean;    // proven correct without trusting the custodian
  source: string;       // which party supplied it
  method: 'none' | 'merkle-inclusion' | 'cross-member-agreement';
  detail: string;
}>
```

- **A0:** fetch from the custodian only; `verified` is always `false`, because nothing independent can confirm it.
- **A1:** fetch from the custodian or any witness mirror; verify the Merkle inclusion proof against a checkpoint co-signed by at least `k` witnesses (`CONFIG`, default 2 of 3, or 3 of 5).
- **A2:** fetch from at least `q` distinct member adapters and require byte-identical, validly signed responses. Set `q = a + 1`, where `a` is the number of members the adversary controls in that run (default `a = 1`, so `q = 2`). Record `q` in every result.

A second function, `auditHistory(sources)`, scans the facility's full visible history once per audit period and reports evidence of misbehaviour. A1: fetch the latest co-signed checkpoints directly from witnesses (not only from the log), check consistency between checkpoints, and check that the log serves every index below the co-signed size. A2: compare event histories and block hashes across all reachable members, not only `q` of them. All three: check for gaps and duplicates in the index. Experiments E3 to E5 use it to detect withholding, rewriting and equivocation.

## 5. Domain model

A referral record is a chain of small signed events; no clinical content is ever stored, only a hash standing in for the referral document.

### Referral event

```json
{
  "schema": "referral-event/v1",
  "eventId": "01JB8Q7Z3K9W2X5V6N4M1P0R8T",
  "referralId": "01JB8Q7YZ0A1B2C3D4E5F6G7H8",
  "type": "ISSUE",
  "fromFacility": "CHPS-014",
  "toFacility": "DH-003",
  "urgency": "EMERGENCY",
  "patientToken": "base64url HMAC-SHA256, synthetic",
  "documentHash": "sha256 hex of a synthetic referral document",
  "reason": null,
  "clientTimestamp": "2027-03-02T14:05:11.204Z",
  "signer": "CHPS-014",
  "signature": "base64url Ed25519 over the RFC 8785 canonical form of all other fields"
}
```

- `type` is one of `ISSUE`, `ACKNOWLEDGE`, `REDIRECT`, `DECLINE`, `ARRIVAL`, `NON_ARRIVAL`, `COUNTER_REFERRAL`, `CORRECTION`.
- `urgency` is one of `ROUTINE`, `URGENT`, `EMERGENCY`.
- `reason` is a short code, used only for `REDIRECT`, `DECLINE` and `CORRECTION`.
- `patientToken` is random synthetic data of realistic length. It stands in for a per-referral keyed hash of a national ID and must never be derived from anything real.

### Facilities and keys

`common/` holds a facility registry: identifier, tier (`CHPS`, `HEALTH_CENTRE`, `DISTRICT_HOSPITAL`, `REGIONAL_HOSPITAL`, `TEACHING_HOSPITAL`), owning organisation (`GHS`, `TEACHING`, `CHAG`, `PRIVATE`) and Ed25519 public key. A seed script generates the registry and private keys deterministically from the run seed. Keys stay in local files and are never committed.

### Lifecycle rules

Shared validation in `common/` is used by all three architectures (in A2, inside chaincode). An event is rejected if its signature is invalid, its signer is not the facility allowed to make that transition, or the transition is not allowed:

| From state | Event | To state | Signed by |
| --- | --- | --- | --- |
| (none) | ISSUE | ISSUED | fromFacility |
| ISSUED | ACKNOWLEDGE | ACKNOWLEDGED | toFacility |
| ISSUED | REDIRECT | ISSUED (new toFacility) | toFacility |
| ISSUED | DECLINE | DECLINED (final) | toFacility |
| ACKNOWLEDGED | ARRIVAL | ARRIVED | toFacility |
| ACKNOWLEDGED | NON\_ARRIVAL | NOT\_ARRIVED (final) | toFacility |
| ARRIVED | COUNTER\_REFERRAL | CLOSED (final) | toFacility |
| any | CORRECTION | unchanged | the facility that signed the corrected event |

The architectures order and store events; they do not decide clinical truth. A validly signed false event is out of scope for this study and should be noted as such in `docs/DECISIONS.md`.

## 6. A0: central database baseline

A0 represents how most health record systems work today: one custodian, one database, an audit table the custodian itself controls. Build it well; a weak baseline would make the comparison unfair.

### Design

- One Fastify service (`a0-central`) and one PostgreSQL instance, both operated by the custodian.
- Tables: `events` (global `index` as a sequence, `event_id`, `referral_id`, the signed event as JSONB, `committed_at`), `referral_state` (current lifecycle state per referral), and `audit_log` (every insert, written by a database trigger).
- The application role may only `INSERT` and `SELECT`. A trigger rejects `UPDATE` and `DELETE` on `events` and `audit_log` for that role. The database owner (the custodian) can still bypass this, which is the realistic weakness under study.
- Validation uses the shared lifecycle rules (Section 5). Writes for one referral are serialised (row lock on `referral_state`).
- `receipt` in the `POST` response is the stored row's index and commit time, unsigned.
- Backups: a scheduled `pg_dump` (`CONFIG`, default every 6 hours) stored on a volume owned by the custodian. It is lost with the custodian in E2, because that is what happens in practice.
- Checkpoint and proof endpoints return `null` or 501 (Section 4).

### Fault hooks

Enabled only when `FAULTS_ENABLED=true`, never in normal runs. They implement the common custodian fault interface in Section 10:

- withdraw: stop serving all requests, or requests from listed facilities;
- withhold: omit listed event indices from responses to listed facilities;
- rewrite: change or delete stored rows directly as the database owner;
- equivocate: serve one of two alternative histories, chosen by the requesting facility.

### Done when

- The A0 service passes the shared conformance suite.
- A full referral lifecycle replays correctly from the workload generator.
- Each fault hook works and is covered by an integration test.

## 7. A1: witnessed transparency log

A1 keeps a single custodian for writing but lets independent witnesses check, co-sign and mirror everything it commits. It must be implemented from the published standards and tested against independent reference vectors, because examiners will ask how anyone knows it is correct.

### Log server (`a1-log`)

- **Merkle tree** exactly as in RFC 6962 and RFC 9162: leaf hash = SHA-256(0x00 ‖ leaf bytes), interior node hash = SHA-256(0x01 ‖ left ‖ right). Leaf bytes are the RFC 8785 canonical form of the signed event.
- **Sequencing.** Validated events are queued and appended in batches every `CONFIG` interval (default 500 ms). Each batch produces a new tree size and root.
- **Checkpoint.** After each batch the log signs a checkpoint (origin, tree size, root hash) with its Ed25519 key. Use the C2SP `tlog-checkpoint` and `signed-note` formats where practical; otherwise document the JSON equivalent in `docs/DECISIONS.md`.
- **Proofs.** Implement inclusion and consistency proofs following RFC 9162. Store interior nodes or tiles so that proofs take logarithmic time.
- **Co-signing mode** (`CONFIG`): `sync` (default) publishes a checkpoint only after `k` witness co-signatures arrive; `async` publishes at once and attaches co-signatures as they come. The `POST` receipt includes the leaf index and the checkpoint that covers it.

### Witness service (`a1-witness`)

Run `n` witnesses (`CONFIG`, 3 or 5), each with its own store and Ed25519 key, representing independent institutions.

- **Co-signing rule (required).** On each new checkpoint (pushed by the log, or polled every `CONFIG` second), the witness (1) fetches a consistency proof from its last co-signed size and verifies it and the log's signature, (2) brings its mirror up to the checkpoint's size and confirms that the root it recomputes equals the checkpoint's root, and only then (3) co-signs. It never co-signs a smaller tree, an inconsistent one, or one its mirror does not fully hold. Step 2 is what makes a co-signed event retrievable after the custodian withdraws.
- **Fully co-signed checkpoints (required).** When the log publishes a checkpoint with its `k` co-signatures, every witness stores that complete checkpoint, and witnesses also exchange complete checkpoints by gossip. After the log withdraws, a witness can therefore hand a facility a checkpoint carrying all `k` co-signatures, which the facility will accept.
- **Mirror.** The witness pulls new events through `/v1/history` and verifies them as above. On any mismatch it raises an alarm and stops co-signing.
- **Serving.** Each witness exposes `/v1/history`, `/v1/events/{eventId}` and `/v1/proof/inclusion/{eventId}` from its mirror, plus `GET /v1/witness/checkpoint` (the latest fully co-signed checkpoint it holds). Facilities can therefore retrieve and verify records with the log gone.
- **Gossip.** Witnesses exchange their latest checkpoints every `CONFIG` 5 seconds. A conflict is recorded as a proof in one of two forms: two checkpoints of the same size with different roots; or two checkpoints of sizes s1 < s2 plus a leaf index below s1 with different leaf values, each with an inclusion proof against its own root. The witness stores the proof and reports it.
- **Collusion switch** (`COLLUDE=true`, experiments only): a colluding witness co-signs whatever it is shown without checking or mirroring, and does not gossip.

### Correctness evidence (required)

- Unit tests with RFC 6962 and RFC 9162 example trees.
- **Differential tests:** generate random trees and proofs, and check that roots, inclusion proofs and consistency proofs match a reference implementation (the Go library `transparency-dev/merkle`, run in CI through a small Go program).
- Property tests (fast-check): every inclusion proof verifies; every consistency proof between two sizes verifies; any single-bit change to a leaf or proof fails verification.

### Fault hooks

With `FAULTS_ENABLED=true`, the log implements the common custodian fault interface (Section 10): withdraw, withhold, rewrite stored leaves, and equivocate by keeping two forks and serving each to a different set of facilities and witnesses.

### Done when

- The log and witnesses pass the conformance suite, the reference vectors and the differential tests.
- With the log stopped, a facility can retrieve and verify every committed event from witness mirrors alone.
- Equivocation with zero colluding witnesses is detected in an integration test.

## 8. A2: Hyperledger Fabric consortium

A2 removes the single custodian entirely: five member organisations each hold a full replica, and BFT ordering means no single member controls the order of history.

### Network

| Organisation (MSP) | Represents | Peers | Orderer |
| --- | --- | --- | --- |
| GHSMSP | Ghana Health Service facilities | 1 (`CONFIG`) | Yes |
| TeachingMSP | Teaching hospitals | 1 | Yes |
| CHAGMSP | Faith-based facilities | 1 | Yes |
| PrivateMSP | Private facilities | 1 | Yes |
| NHIAMSP | Insurer (read and verify) | 1 | No |

- Hyperledger Fabric v3.x with the BFT ordering service: 4 orderers from 4 organisations, tolerating 1 faulty orderer. Start from the official `fabric-samples` test network and its BFT option if available in the current release; otherwise use a custom Compose network with `cryptogen` or Fabric CA. Record which in `docs/DECISIONS.md`.
- One channel, `referrals`. CouchDB as the state database (it makes the rewrite experiment scriptable).
- Channel and chaincode lifecycle changes require a MAJORITY of member organisations.

### Chaincode (`a2-fabric/chaincode`, TypeScript, `fabric-contract-api`)

- `submitEvent(eventJson)`: verify the facility signature against the facility registry stored on the ledger, apply the shared lifecycle rules (bundle `common/` into the chaincode), then write `event:{eventId}` and update `referral:{referralId}`.
- `getEvent`, `getReferralEvents`, `getRegistry`; `initRegistry` callable once, by MAJORITY-endorsed admin transaction.
- **Endorsement policy:** `OutOf(2, ...)` across the five member peers, so no member can write alone.
- **No global counter key.** A shared counter causes read conflicts under load. Derive the global `index` from block number and transaction position in the adapter instead.
- Concurrent events on one referral can fail with MVCC read conflicts. Retry with backoff (`CONFIG`, up to 3 times) and record every conflict and retry as a metric, because this is part of A2's real cost.

### Gateway adapter (`a2-fabric/gateway-adapter`)

- One adapter per member organisation, connected through `@hyperledger/fabric-gateway` to that organisation's own peer, implementing the shared API (Section 4).
- Each adapter listens to block events from its own peer and keeps a local ordered index, so every member is an independent source for `/v1/history`.
- `/v1/checkpoint` returns that member's current block height and hash.
- **Signed responses (required).** Every adapter response carries an Ed25519 signature by that member over the response body and the member's identifier. Two conflicting signed responses are then a transferable proof of equivocation.
- Facilities submit through the adapter of their own organisation.
- **Verification** is by agreement: the verifier fetches the same event from `q` distinct member adapters, with `q = a + 1` (Section 4), and requires byte-identical bodies with valid member signatures and matching block hashes.

### Fault hooks

The "custodian" in A2 is GHSMSP, the largest member, and optionally a configured number of colluders. With `FAULTS_ENABLED=true`:

- withdraw: stop GHSMSP's peer, orderer and adapter (all, or for listed facilities), together with those of any colluders;
- withhold: GHSMSP's adapter (and colluders') hide listed events from listed facilities;
- rewrite: alter or delete records in every store the adversary holds, both the CouchDB state database and the adapter's local index;
- equivocate: the adversary's adapters serve a forked history to listed facilities; with two orderer-running members colluding (`b = 2`), also attempt to fork the ledger itself.

The scenario file names which members collude. Record `a` (members controlled) and `b` (orderers controlled) in every result, because the threat model's A2 claims depend on both.

### Done when

- Chaincode unit tests pass and the adapters pass the conformance suite.
- A full referral lifecycle commits with two-organisation endorsement.
- With GHSMSP stopped, the remaining members still read, verify and commit new events.

## 9. Workload generator

The generator produces one deterministic stream of signed referral events, saved to a file, and replays that same file against each architecture so that all three see identical traffic.

### Phase 1: generate (`workload generate`)

- **Synthetic region** (`CONFIG`, default): 1 teaching hospital, 1 regional hospital, 6 district hospitals, 24 health centres and 80 CHPS compounds, grouped into districts, with owners drawn from GHS, CHAG and private (`TBD-CANDIDATE`: proportions).
- **Referral arrivals:** a Poisson process whose 1x rate comes from the published figures in the calibration table below.
- **Routing:** each referral goes up one tier, usually within its district (`CONFIG` probability).
- **Receiving-facility outcomes:** accept 82%, decline 12%, call back or redirect 6%, from the published Tamale figures.
- **Steps with no published Ghanaian figure** (urgency mix, arrival and non-arrival, counter-referral, corrections): `CONFIG` placeholders, listed in `docs/EXPERIMENTS.md` as assumptions and covered by the 1x to 100x range.
- **Delays** between lifecycle steps from log-normal distributions with `CONFIG` parameters.
- Each event is signed with the generated facility keys. Output is one NDJSON file of `{offsetMs, event}` records, plus a manifest with the seed, configuration, calibration version and checksum.

### Calibration from published figures

The 1x workload is set from published Ghanaian referral volumes, not from new data requests. Derived baseline (`TBD-CANDIDATE` to confirm): about 400 referrals a month into the teaching hospital (emergency plus maternity), with lower tiers scaled by facility count.

| Published figure | Value | Source | Use in the workload |
| --- | --- | --- | --- |
| Referrals into a teaching hospital emergency unit | 1,565 from October 2020 to October 2021 (about 130 a month); 82% accepted, 12% rejected, 6% called back | Surazu and Korsah (2023), Tamale Teaching Hospital ([article](https://journal.ucc.edu.gh/index.php/ihrj/article/download/1176/591)) | Emergency inbound rate; outcome probabilities |
| Peripartum referrals into a teaching hospital | 396 in 6 weeks (about 280 a month), 17.6% of deliveries; 86% from polyclinics and private midwives | Nkyekyer (2000), Korle Bu Teaching Hospital ([record](https://ugspace.ug.edu.gh/items/a980bc1a-e71a-4b24-8de5-8dc69668f474)) | Maternity inbound rate (older data, treated as an upper bound) |
| Complicated obstetric cases referred onward by district hospitals | 9% | Bailey et al. (2019), national assessment of 977 facilities ([article](https://doaj.org/article/c3b6e157fdf54683850ea47d5bc0cd86)) | District hospital outbound share |
| Cape Coast Teaching Hospital activity, 2022 | 170,441 outpatient visits; 12,622 admissions; emergency referral trend in Table 8.6.1 | CCTH 2022 Annual Performance Report ([report](https://www.ccthghana.org/wp-content/uploads/2024/01/5th_final_2022_ANNUAL_PERFORMANCE_REPORT_Booklet.pdf)) | `TBD-CANDIDATE`: extract Table 8.6.1 to add a third teaching-hospital figure |

Every result records which calibration version it used.

### Phase 2: replay (`workload replay`)

- Open-loop replay: events are sent at their scheduled times, whether or not earlier requests have finished, so a slow system cannot slow its own workload.
- **Scale factors** 1x, 10x and 100x compress the timeline.
- **Stress profile:** a step ramp that doubles the rate every `CONFIG` interval until errors or latency exceed thresholds, to find each architecture's maximum sustainable throughput. Realistic referral volumes are low, so this profile is needed to show where each architecture breaks.
- The replayer records, for every request: send time, response time, status, returned index and receipt. Failed requests are logged, never retried silently (A2's conflict retries are counted separately).

### Done when

- The same seed produces a byte-identical file.
- A replay at 1x against A0 completes with every lifecycle valid.

## 10. Experiments and fault injection

Every experiment is a YAML scenario run by one command, on a fresh deployment, repeated 30 times (`CONFIG`) in randomised order, and it writes raw results in the format of Section 11.

### Common custodian fault interface

Each custodian (A0 service, A1 log, A2 GHSMSP adapter) exposes the same control endpoint when `FAULTS_ENABLED=true`:

```http
POST /admin/fault
{ "mode": "withdraw" | "withhold" | "rewrite" | "equivocate" | "clear",
  "targets": ["CHPS-014", "DH-003"],      // facilities affected; [] = all
  "params": { "fraction": 0.1, "colluders": 1 } }
```

Whole-node withdrawal (stopping containers) and network faults are done by the harness through Docker and `tc netem`, not by the services.

### Scenario file

```yaml
id: E2-withdraw-full
architecture: A1          # A0 | A1 | A2
seed: 20270301
workload: { file: workloads/base.ndjson, scale: 10 }
warmup_s: 120
fault: { at_s: 300, mode: withdraw, targets: [] }
observe_s: 300
repetitions: 30
params: { witnesses: 3, k: 2, colluders: 0 }
```

### Experiments

| ID | Procedure | Outcome measures |
| --- | --- | --- |
| E1 Performance | Steady replay at 1x, 10x and 100x for 10 minutes after a 2-minute warm-up; then the stress ramp | Write latency (median, 95th, 99th percentile), throughput, error rate, CPU, memory, disk growth, A2 conflict retries, maximum sustainable rate |
| E2 Withdrawal | At `at_s`, the custodian stops serving everyone (full) or listed facilities (partial). For every event committed before that moment, the verifier tries to retrieve and verify it using only parties other than the custodian. New writes continue for `observe_s`. | P1: share of prior events available; share verified; time to first and to last verified event; success rate of new writes after withdrawal |
| E3 Withholding | The custodian hides a fraction (`CONFIG`: 1% and 10%) of events from target facilities. Target facilities run `auditHistory` every `CONFIG` 10 s. | P5: detection (yes/no per trial), time to detection, share of hidden events identified |
| E4 Rewriting | The custodian alters or deletes `CONFIG` 10 events committed at least 60 s earlier, directly in every store it holds. | P2: detection, time to detection, share of altered events identified |
| E5 Equivocation | From `at_s`, the custodian serves two forked histories to two facility groups, with 0 to n colluding witnesses (A1) or members (A2). | P3: detection by number of colluders, time to detection, evidence produced |
| E6 Degraded network (optional) | Replay with network profiles (`CONFIG`): good (20 ms), rural (300 ms, 2% loss), poor (800 ms, 10% loss). Facilities queue and resubmit when the link recovers. | Commit success, latency, correctness of reconciliation (no lost or duplicated events) |

P4, independent verifiability, is recorded in every experiment as the `method` the verifier was able to use.

### Rules

- A fresh deployment and a fresh workload file seed per repetition; every seed recorded.
- The detection logic in `verifier` must be the same code for all three architectures, except for the architecture-specific verification step.
- If an architecture cannot perform a measurement at all (for example, A0 cannot verify), record that as the result, not as missing data.
- Record the trust parameters of every run: `n`, `k` and `c` for A1; `a`, `b`, `q` and the colluding members for A2; co-signing mode; audit period (`CONFIG`, default 10 s); gossip period (`CONFIG`, default 5 s).
- **Test both sides of every boundary** in the threat model (its Section 7): A1 with `c < k` and with `c ≥ k`; A2 with `a = 1, 2, 3` and with `b = 1` and `b = 2`. A claim is confirmed only if the property holds where predicted and fails where predicted.
- In E3, E4 and E5, facilities audit their full visible history every audit period.
- A1 runs in `sync` co-signing mode by default. An `async` variant of E2 is optional and is cut first if time runs short.

## 11. Metrics, results format and analysis

Every run writes raw, append-only files to `results/<scenario>/<run-id>/`, and the Python analysis reads only those files.

### Files per run

| File | Contents |
| --- | --- |
| `manifest.json` | Run id, scenario, architecture, parameters, seed, git commit, `VERSIONS.md` hash, hardware description, start and end times |
| `requests.csv` | One row per request: `t_send`, `t_recv`, `latency_ms`, `op`, `status`, `index`, `retries` |
| `resources.csv` | Per container, every 5 s: CPU %, memory MB, disk MB, network bytes |
| `verification.csv` | One row per event checked after a fault: `event_id`, `available`, `verified`, `method`, `source`, `t_checked` |
| `detection.csv` | One row per detection attempt: `t`, `facility`, `detected`, `kind` (withholding, rewrite, equivocation), `evidence_ref` |
| `summary.json` | Per-run derived values, computed by a script from the files above, never by hand |

### Analysis (`analysis/`, Python)

- `aggregate.py` builds one tidy table of all runs.
- Performance (E1, E6): medians and 95% confidence intervals (bootstrap); compare architectures with the Kruskal-Wallis test and Dunn's post-hoc test with Holm correction (scikit-posthocs).
- Properties (E2 to E5): proportion of trials passing each property, with Wilson 95% confidence intervals (statsmodels); detection times as medians with bootstrap intervals.
- A cost-resilience summary table per architecture: P1 to P4 outcomes beside latency, throughput and resource use. This table answers RQ4.
- Figures (matplotlib, saved as PNG and PDF at 300 dpi): latency distributions by scale; throughput ramp; recovery over time after withdrawal; detection rate by number of colluders.
- `make figures` regenerates every table and figure in the thesis from raw results.

## 12. Demonstration dashboard

The dashboard lets a panel watch the three architectures face the same fault at the same time; it is a window onto the real testbed, not a clinical application. Build it last.

### What it shows

- Three side-by-side panels, A0, A1 and A2, all fed by one low-rate replay (`CONFIG`, default a few events per second).
- Per panel: events committed; latest checkpoint (or "none" for A0); live write latency; and a status light for each property P1 to P4 (green when it holds, red when it fails, grey when the architecture cannot provide it).
- Buttons that trigger the same faults as the experiments, on all three at once: withdraw custodian, withhold, rewrite a record, equivocate (with a colluder count), clear faults, reset.
- After a fault, a recovery view: how many prior events each architecture can still retrieve and verify, and from which parties, updating live.
- A detection log showing evidence produced (for example, two conflicting signed checkpoints in A1).
- A results tab that shows the figures produced by `analysis/` from recorded experiment runs, clearly labelled with run ids.

### How it works

- A small control server (`dashboard/server`) calls the fault interface and the `verifier` library, and streams state to the browser over Server-Sent Events.
- The browser app (React + Vite) only displays state. All logic lives in the testbed packages, so the demonstration and the experiments use identical code.
- One command starts the full demo stack: `pnpm demo`.

### Rules

- No mock data, no scripted outcomes: if an architecture fails in the demo, the dashboard shows the failure.
- No patient-facing or clinician-facing screens.
- Readable on a projector: large type, high contrast, colour plus a text label for every status.

## 13. Testing, documentation and reproducibility

The testbed is evidence in a thesis, so its correctness, its documentation and its ability to be rerun matter as much as its features.

### Tests

| Level | What it covers | When it runs |
| --- | --- | --- |
| Unit | Canonical JSON, signatures, lifecycle rules, Merkle hashing and proofs, chaincode logic | Every push |
| Reference and differential | RFC example trees; random trees and proofs compared with `transparency-dev/merkle` | Every push |
| Property | Proof verification, tamper detection, lifecycle invariants (fast-check) | Every push |
| Conformance | One shared suite run against A0, A1 and A2 through the Section 4 API | Nightly and before each milestone sign-off |
| Fault | Each fault mode on each architecture, asserting what the verifier should observe | Nightly and before each milestone sign-off |
| Smoke | `pnpm demo` starts and reaches healthy state | Before each milestone sign-off |

### Documentation

- `README.md`: prerequisites, one-command setup, how to run each experiment and the demo.
- `docs/ARCHITECTURE.md`: components, data flow and trust boundaries for each architecture, with diagrams. This becomes thesis Chapter Four.
- `docs/EXPERIMENTS.md`: every scenario, its parameters and exactly what it measures. This becomes the core of thesis Chapter Three.
- `docs/DECISIONS.md`: dated decision log (Section 1).
- `docs/candidate-notes/`: plain-language notes per milestone, written so the candidate can explain the work to examiners: what each component does, why it was designed that way, its known limitations, and likely examiner questions with answers.
- `VERSIONS.md`: exact versions of every runtime, image and library.

### Reproducibility

- Tag the repository at each milestone and at the start of each experiment campaign.
- Results record the tag, commit, seed and configuration (Section 11).
- `make reproduce` reruns a reduced version of every experiment (`CONFIG`: 3 repetitions) and regenerates the figures, so examiners can check the pipeline.
- License the code under an open-source license (`TBD-CANDIDATE`, for example MIT or Apache-2.0) and archive the final release with a DOI (for example via Zenodo) for citation in the thesis.

## 14. Milestones and acceptance criteria

Build in this order; each milestone ends with the candidate's review and a git tag. The order matches the work plan in the research proposal.

| Milestone | Deliverables | Accepted when |
| --- | --- | --- |
| M0 Foundations | Monorepo, CI, `SPEC.md`, `VERSIONS.md`, docs skeleton, plan for M1 | CI runs on push; the candidate approves the M1 plan |
| M1 Common and workload | `common/` (schema, canonical JSON, signing, lifecycle rules, API types), facility registry and key generation, `workload generate` | Unit tests pass; same seed gives a byte-identical workload file |
| M2 A0 and conformance | A0 service and database, shared conformance suite, `workload replay`, `verifier` skeleton | A0 passes conformance; a 1x replay completes with valid lifecycles |
| M3 A1 witnessed log | Log server, witness service, proofs, gossip, mirrors, A1 verifier strategy | Reference, differential and property tests pass; A1 passes conformance; records verify from witness mirrors with the log stopped |
| M4 A2 Fabric | Network with BFT ordering, chaincode, five gateway adapters, A2 verifier strategy | Chaincode tests pass; A2 passes conformance; writes continue with GHSMSP stopped |
| M5 Faults and experiments | Fault interface in all three, harness, scenario runner, results writer, E1 to E5 scenarios (E6 if time allows) | Every scenario runs from one command on every architecture and writes the Section 11 files |
| M6 Analysis and pilot | `analysis/` pipeline; pilot campaign with 3 repetitions per scenario | The candidate and supervisor review pilot results and approve the full campaign |
| M7 Full campaign | All scenarios at 30 repetitions | Every planned run completes; failures are investigated and documented, not dropped |
| M8 Dashboard | Control server and React app (Section 12) | `pnpm demo` runs the live comparison end to end on one laptop |
| M9 Release | Final documentation, `make reproduce`, license, archived release | A clean machine reproduces the reduced campaign and figures from the README alone |

## 15. Out of scope and rules

Anything not needed to answer the research questions is out of scope, and a short list of rules protects the validity of the results.

### Out of scope

- Clinical or patient-facing applications, user accounts and login screens.
- Storage of clinical content (only document hashes are stored).
- Real integration with GHIMS, DHIMS2, NHIA or any live system.
- USSD, SMS or mobile apps.
- Production hardening: high availability, backups beyond the A0 baseline, key management services.
- Public blockchains, tokens or cryptocurrency.
- Privacy attacks on metadata (possible future work).

### Rules the agent must not break

1. Never use or generate real personal or health data.
2. Never change the research design (architectures, threat model, properties, experiments, metrics) without the candidate's written approval in `docs/DECISIONS.md`.
3. Never fabricate, edit, filter or hard-code results. Failed or surprising runs are kept and explained.
4. Never give one architecture an advantage the others lack: same hardware, workload, API, verifier logic and fault definitions.
5. Never leave fault hooks enabled outside experiment runs.
6. Keep every component explainable: no unexplained code copied from elsewhere; credit and license any reused code in `docs/DECISIONS.md`.
7. Stop and ask when a requirement here is unclear, impossible, or contradicts another one.
