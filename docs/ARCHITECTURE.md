# Architecture

Components, data flow and trust boundaries for each architecture, with diagrams. Becomes thesis Chapter Four.

Written incrementally; each section is completed in the milestone that builds it.

## Shared components

- `common` — event schema, canonical JSON, signing, lifecycle rules, API types (M1)
- `workload` — generator (M1) and replayer (M2)
- `verifier` — facility-side verification and audit (M2, extended in M3 and M4)
- `faults`, `metrics` — fault harness and results writer (M5)

## A0 Central database

To be written in M2.

## A1 Witnessed transparency log

To be written in M3.

## A2 Hyperledger Fabric consortium

To be written in M4.

## Trust boundaries

To be written in M2 to M4, following docs/THREAT-MODEL.md Sections 2 to 4.
