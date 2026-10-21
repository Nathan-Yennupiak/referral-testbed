# Referral testbed

Experimental testbed for the MPhil thesis _Evaluating Blockchain for Health Data Management in Ghana: Withdrawal-Resilient Architectures for Referral Records_.

It compares three record architectures (A0 central database, A1 witnessed transparency log, A2 Hyperledger Fabric consortium) behind one HTTP API, under the same synthetic workload and the same custodian faults. The full brief is [SPEC.md](SPEC.md); the security claims under test are in [docs/THREAT-MODEL.md](docs/THREAT-MODEL.md), which takes precedence where the two differ.

**Status:** milestone M0 (foundations). Nothing runs yet beyond the toolchain check.

**Data:** synthetic only. The repository contains no real patient, facility-staff or national-ID data, and must never contain any.

## Prerequisites

- Node.js 24.22.1 (see `.nvmrc`)
- pnpm 12.14.0 (`npm install -g pnpm@12.14.0`, or prefix commands with `npx -y pnpm@12.14.0`)
- From M2: Docker Engine with Compose
- Go is not needed locally; the Merkle differential tests run in CI (D-017)

## Setup and checks

```sh
pnpm install
pnpm run ci        # format check, type check, tests
```

## Layout

See SPEC.md Section 4. Documentation lives in `docs/`:

- `docs/plans/` — plan for each milestone, approved before code is written
- `docs/DECISIONS.md` — dated design decision log
- `docs/candidate-notes/` — plain-language notes per milestone
- `docs/ARCHITECTURE.md`, `docs/EXPERIMENTS.md` — filled in from M2 onwards

How to run experiments and the demo will be added as those milestones land.
