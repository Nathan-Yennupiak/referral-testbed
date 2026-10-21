# Threat Model and Security Properties

Oct 19, 2026 · @Zeferra

## 1. Purpose and scope

This model states precisely what the three architectures are expected to guarantee when the custodian misbehaves, so that the experiments test stated claims rather than impressions. It is a working draft for the candidate to study, challenge and refine; it will become the core of thesis Chapter Three.

The model covers the integrity and availability of the *referral history*: the ordered sequence of signed referral events. It does not cover the truth of what an event says (a validly signed false event), the confidentiality of metadata, or attacks by facilities on each other. Section 9 lists these limits.

Notation is kept light. Formulas appear only where a sentence would be ambiguous, and every formula is followed by its meaning in words.

## 2. System model

The system consists of facilities that create signed events, and record-keeping parties that order, store and serve them; the architectures differ only in who those record-keeping parties are.

### Parties

- **Facilities** F = {f1, ..., fm}. Each facility f holds a signing key pair (skf, pkf). The registry R of facility public keys is known to every honest party and assumed authentic (Section 9).
- **Custodian** C: the single operator in A0 and A1.
- **Witnesses** W = {w1, ..., wn}: independent parties in A1.
- **Members** M = {m1, ..., m5}: consortium organisations in A2, four of which also run an orderer.

### Events and histories

An event e is valid when its signature verifies under the registry key of its signer and the lifecycle rules allow it:

```latex
\mathrm{valid}(e) \iff \mathrm{Verify}(pk_{\mathrm{signer}(e)}, \mathrm{canon}(e), \sigma_e) = 1 \;\wedge\; \mathrm{allowed}(e)
```

In words: the signature is correct over the canonical form of the event, and the transition is permitted.

A **history** H = (e1, e2, ..., eN) is an ordered sequence of valid events, where position i is the event's index. The **view** Vp(t) of party p is the history p has been shown up to time t. Two views are **consistent** if one is a prefix of the other; otherwise they form a **fork**.

### Commitment

An event e is **committed at time t** if its submitter holds, by t, a valid receipt for e. What counts as a valid receipt differs by architecture (Section 3). The set of events committed before time t is written Committed(t).

### Assumptions

1. **Cryptography.** The hash function is collision-resistant and signatures cannot be forged without the private key (EUF-CMA). Bounds hold except with negligible probability.
2. **Communication.** Messages between honest parties are delivered within a known bound Δ (synchrony between honest parties). This is needed for detection-time guarantees and is discussed in Section 9.
3. **Honest behaviour.** An honest party follows the protocol in the build specification exactly.
4. **Facility keys.** Facility private keys are not compromised.

## 3. The architectures in the model

Each architecture is defined by who stores the history, what a receipt proves, and how a facility verifies an event.

|  | A0 Central database | A1 Witnessed log | A2 Consortium blockchain |
| --- | --- | --- | --- |
| Who stores H | C only | C, plus a mirror at each witness | Every member (full replica) |
| Who orders events | C | C | BFT ordering service: 4 orderers, tolerates 1 Byzantine orderer |
| Receipt for e | (index, time), unsigned, from C | (index, checkpoint c, inclusion proof), where c is signed by C and co-signed by at least k witnesses | (block number, transaction id), endorsed by 2 members and ordered by the BFT service |
| How f verifies e | Cannot verify independently | Inclusion proof of e against a checkpoint co-signed by at least k witnesses | Identical copies of e from at least q distinct members |
| Parameters | none | n witnesses, threshold k | q members required to agree |

### Checkpoints and co-signing (A1)

A checkpoint c = (s, r) states that the log has size s and Merkle root r, signed by C. An honest witness co-signs c only if:

1. c is consistent with the last checkpoint it co-signed (verified by a consistency proof), and
2. its own mirror holds all s leaves and recomputes root r.

Condition 2 is essential for availability (Section 6), and it corrects the current build specification (Section 8).

A facility accepts a checkpoint only if it carries at least k valid witness co-signatures.

## 4. Adversary model

The adversary is the custodian, possibly helped by a bounded number of colluders; it controls everything those parties store and send, but cannot forge anyone else's signatures.

### Who the adversary controls

- **A0 and A1:** the custodian C, plus c colluding witnesses (A1 only), with 0 ≤ c ≤ n.
- **A2:** member GHSMSP (standing in for the custodian), plus c colluding members. The adversary controls a = 1 + c members. Of the four orderers, it controls **b**, the number of its members that run one (GHSMSP does, NHIAMSP does not). So b ≤ a, and b depends on which members collude. BFT ordering stays safe only while b ≤ 1.

### Capabilities

From any time t chosen by the adversary, it may:

| Capability | Definition |
| --- | --- |
| Withdraw(S) | Stop responding to the facilities in S ⊆ F (S = F for full withdrawal), permanently |
| Withhold(E′, S) | Omit the events in E′ from every response to the facilities in S, while serving everything else |
| Rewrite(E′) | Replace or delete the stored events in E′ in its own storage |
| Equivocate(S1, S2) | Show facilities S1 and S2 two views that form a fork, signing whatever commitments it can |

A colluder behaves however the adversary chooses: it may co-sign or endorse anything, refuse to serve, or serve false data.

### Limits

The adversary cannot:

- forge facility signatures, honest witnesses' co-signatures, or honest members' endorsements and block signatures;
- find hash collisions;
- delay or block messages between honest parties beyond Δ;
- corrupt the facility registry R.

### Parameters studied

| Architecture | Collusion levels tested | Default verification parameters |
| --- | --- | --- |
| A1 | c = 0, 1, 2 with n = 3; c = 0 to 4 with n = 5 | k = 2 of 3; k = 3 of 5 |
| A2 | a = 1 (b = 1); a = 2 with NHIAMSP colluding (b = 1); a = 2 with an orderer-running colluder (b = 2); a = 3 (b = 2 or 3) | q = a + 1 (Section 6) |

## 5. Property definitions

Each property is a statement that either holds or fails for an architecture under stated parameters, which is what lets an experiment confirm or refute it.

Two procedures are defined per architecture (Section 3): **Ver\_f(e)**, by which facility f accepts or rejects a single event, and **Audit\_f**, by which f checks the whole history it can see and outputs either "ok" or evidence of misbehaviour. **Hon** is the set of honest record-keeping parties (honest witnesses in A1, honest members in A2), and **H\_p** is the history held by an honest party p. Honest parties may hold different histories if the adversary forks them; P3 deals with that case.

### P4 Independent verifiability (soundness)

Defined first, because P1 depends on it.

```latex
\Pr\big[\, \mathrm{Ver}_f(e) = \mathrm{accept} \;\wedge\; \forall p \in \mathrm{Hon}:\ e \notin H_p \,\big] \le \mathrm{negl}
```

In words: whatever the adversary does, a facility accepts an event only if it is in the history of at least one honest party, except with negligible probability. An architecture with no procedure that can accept without trusting the custodian fails P4 by definition.

### P1 Availability after withdrawal

Let the adversary run Withdraw(F) at time t\_w.

```latex
\forall e \in \mathrm{Committed}(t_w):\; \exists\, p \notin \mathrm{Adv}\ \text{such that } f \text{ retrieves } e \text{ from } p \text{ and } \mathrm{Ver}_f(e) = \mathrm{accept}, \text{ by } t_w + \delta_1
```

In words: every event committed before the withdrawal can still be fetched from some party the adversary does not control, and verified, within a bounded time δ₁. **Write availability** after withdrawal (can new events still be committed?) is measured separately and is not part of P1.

### P2 Tamper evidence

Let the adversary run Rewrite(E′) on committed events at time t\_r.

```latex
\Pr\big[\, \mathrm{Audit}_f \text{ outputs evidence by } t_r + \tau + \Delta \,\big] \ge 1 - \mathrm{negl}
```

In words: an honest facility that audits at least once every τ detects the rewrite and can show evidence (for example a root mismatch, or copies that disagree) within one audit period plus network delay. Detection must not depend on the facility having kept its own copy of the rewritten event.

**Audit assumption.** In the experiments, Audit\_f retrieves and verifies the facility's full visible history once per period τ. This is feasible at experiment scale (thousands of events). At national scale a facility would check new entries plus a random sample of old ones, which makes detection probabilistic in time; Section 9 records this.

### P3 Equivocation detection

Let honest facilities f1 and f2 accept views V1 and V2 that form a fork.

```latex
V_1 \not\preceq V_2 \;\wedge\; V_2 \not\preceq V_1 \;\Longrightarrow\; \exists\ \text{honest } p \text{ that outputs a proof } \pi \text{ by } t_{\mathrm{fork}} + \delta_3
```

In words: if two facilities have been shown histories where neither extends the other, some honest party produces a **proof of equivocation** within a bounded time. A proof is transferable: anyone can check it without trusting the person who found it. It takes one of two forms:

- **Same size:** two commitments of the same size, signed by the same party (or the same required quorum), with different roots.
- **Different sizes:** two signed commitments of sizes s1 < s2, plus a leaf index i < s1 with two different leaf values, each with a valid inclusion proof against its own root. The absence of a consistency proof is not, by itself, a proof.

### P5 Omission detection

Let the adversary run Withhold(E′, {f}) from time t\_o, where E′ contains committed events.

```latex
E' \cap \mathrm{Committed}(t_o) \neq \emptyset \;\Longrightarrow\; \Pr\big[\, \mathrm{Audit}_f \text{ reports missing events by } t_o + \tau + \Delta \,\big] \ge 1 - \mathrm{negl}
```

In words: if the custodian hides committed events from a facility, including by freezing it on an old but consistent view, the facility notices within one audit period. This needs an independent commitment to compare against, such as a witness-co-signed checkpoint showing a larger size, or other members holding the events. Omission is detected, not necessarily proven: a facility can show a third party that events exist which the custodian did not serve, but the custodian may claim a temporary fault.

## 6. Claims and proof sketches

The model predicts that A0 fails every property; that A1 meets P1 to P5 exactly when colluding witnesses are fewer than the co-signing threshold (c < k), but cannot accept new writes without its custodian; and that A2 meets them when its agreement threshold exceeds the members the adversary controls (q ≥ a + 1), with some guarantees also needing the adversary to hold at most one orderer (b ≤ 1).

| Property | A0 | A1 (n witnesses, threshold k) | A2 (5 members; adversary controls a members, b orderers) |
| --- | --- | --- | --- |
| P1 Availability after withdrawal | Fails | Holds if c < k (sync co-signing) | Holds if a + 1 ≤ q ≤ 5 − a and b ≤ 1 |
| P2 Tamper evidence | Only for events the auditor kept itself | Holds if c < k | Holds if q ≥ a + 1 |
| P3 Equivocation detection | Fails | Holds if c < k and honest witnesses gossip | b ≤ 1: holds if q ≥ a + 1 and responses are signed. b ≥ 2: holds if audits compare block hashes across all reachable members |
| P4 Independent verifiability | Fails | Holds if c < k | Holds if q ≥ a + 1 |
| P5 Omission detection | Fails | Holds if c < k and facilities fetch checkpoints from witnesses | Holds if q ≥ a + 1 |
| Writes after full withdrawal | No | No | Yes if the adversary held at most 1 orderer; no otherwise |

### A0: central database

- **A0.1 (P1 fails).** Only C stores H. After Withdraw(F), no party outside the adversary holds the history. A facility holds only the events it signed itself, and cannot prove their position in H.
- **A0.2 (P4 fails).** Receipts are unsigned and no other party attests to H. A facility can check that an event was signed by its author, but that proves authorship, not inclusion.
- **A0.3 (P2 partial).** C can rewrite both the events and the audit table. A facility detects a rewrite only of events it kept a copy of; deletions or rewrites of other facilities' events go unnoticed.
- **A0.4 (P3 fails).** C signs nothing, so two facilities shown different histories have no transferable proof that C lied.
- **A0.5 (P5 fails).** Nothing outside C commits to how many events exist, so a facility cannot tell that events were hidden from it.

### A1: witnessed log

- **A1.1 (P4 holds iff c < k).** An accepted checkpoint carries at least k co-signatures. If c < k, at least one is from an honest witness p, which co-signs only a root it recomputed from its own mirror. By collision resistance, an inclusion proof against that root implies e is in H\_p. If c ≥ k, colluders can co-sign any checkpoint and the property fails.
- **A1.2 (P1 holds iff c < k, in sync mode).** A committed event's receipt names a checkpoint with at least k co-signatures, so at least one honest witness co-signed it, after mirroring every leaf up to that size. Witnesses also store the fully co-signed checkpoint (all k co-signatures), so after C withdraws, that honest witness can serve e, its inclusion proof and a checkpoint any facility will accept. In async mode, events whose checkpoint had not yet been co-signed when C withdrew may be lost; experiment E2 measures how many.
- **A1.3 (no writes after withdrawal).** C is the only sequencer, so a full withdrawal stops new commitments. This is a design property, not a failure of the implementation.
- **A1.4 (P2 holds if c < k).** A rewritten leaf changes the root, so the custodian's proofs fail against the co-signed checkpoint, while an honest witness's mirror still yields the original. A deleted leaf is still served by the honest witness. The mismatch is the evidence.
- **A1.5 (P3 holds if c < k and honest witnesses gossip).** Each accepted fork carries at least k co-signatures, so an honest witness co-signed each fork. No honest witness co-signs both, because it checks consistency, so two different honest witnesses hold conflicting checkpoints, both signed by C. Gossip exchanges them within the gossip period plus Δ. Each witness's mirror supplies the conflicting leaf and inclusion proofs, giving a proof π in either form of Section 5. If c ≥ k, colluders alone can co-sign a whole fork and detection is not guaranteed.
- **A1.6 (P5 holds if c < k and facilities fetch checkpoints from witnesses).** An honest witness's co-signed checkpoint states the true size. If C serves a facility fewer events than that checkpoint covers, or no inclusion proof for an index below that size, the facility's audit reports the gap.

### A2: consortium blockchain

- **A2.1 (P4 holds iff q ≥ a + 1).** Identical copies from q distinct members include at least one honest member p, so e is in H\_p. This holds for any b, because even if the ledger forks, an accepted event is in some honest member's ledger. For a facility to be able to accept at all, q honest members must be reachable, so q ≤ 5 − a. Both conditions hold only when a ≤ 2.
- **A2.2 (P1 holds if a + 1 ≤ q ≤ 5 − a and b ≤ 1).** With b ≤ 1, BFT ordering keeps every honest member's ledger identical, so after GHSMSP withdraws, a facility can collect q agreeing copies from honest members. With b ≥ 2, honest ledgers may diverge and agreement may fail, so P1 is not guaranteed.
- **A2.3 (writes after withdrawal).** BFT ordering with 4 orderers needs 3 to agree. If the withdrawing adversary held 1 orderer, 3 remain and writes continue, with endorsement from 2 of the remaining members. If it held 2 or more, ordering stops: no new writes.
- **A2.4 (P2 holds if q ≥ a + 1).** Rewriting any store the adversary holds (state database or adapter index) makes its copies disagree with an honest member's copy. The disagreement, plus block hashes that no longer match, is the evidence.
- **A2.5 (P3).** With b ≤ 1, BFT ordering prevents a fork of the ledger itself, so equivocation can happen only at the serving layer. A facility requiring q ≥ a + 1 agreeing copies detects it at once, and signed member responses make the conflict a transferable proof. With b ≥ 2, the adversary can fork the ledger and place honest members on different branches. Detection then requires audits to compare block hashes across all reachable members. Two blocks with the same number, each carrying a valid orderer quorum signature, are the proof.
- **A2.6 (P5 holds if q ≥ a + 1).** Honest members hold the events the adversary hides. A facility's audit, comparing histories from q members, finds events present at honest members but missing from the adversary's responses.

## 7. How the experiments test the claims

Each experiment runs parameter settings on both sides of a claimed boundary, so that a claim is confirmed only if the property holds where predicted and fails where predicted.

| Claims | Experiment | Settings that must succeed | Settings that must fail | What would falsify the claim |
| --- | --- | --- | --- | --- |
| A0.1, A1.2, A2.2 (P1) | E2 Withdrawal | A1 with c < k (sync); A2 with a = 1, b = 1 | A0; A1 with c ≥ k | Any committed event not recovered and verified where success is predicted |
| A1.2 async variant | E2 Withdrawal | none predicted | none predicted | Measures loss in async mode; reported, not a test |
| A1.3, A2.3 (writes) | E2 Withdrawal | A2 with b = 1 | A0, A1; A2 with b = 2 | New writes failing where they should succeed, or succeeding where they should stop |
| A0.3, A1.4, A2.4 (P2) | E4 Rewriting (every store the adversary holds) | A1 with c < k; A2 with q ≥ a + 1 | A0 for events the auditor did not keep | A rewrite going undetected within τ + Δ where detection is predicted |
| A0.4, A1.5, A2.5 (P3) | E5 Equivocation | A1 with c < k; A2 with q ≥ a + 1, both b = 1 and b = 2 | A0; A1 with c ≥ k | A fork accepted by two facilities with no proof produced within δ₃ |
| A0.5, A1.6, A2.6 (P5) | E3 Withholding | A1 with c < k; A2 with q ≥ a + 1 | A0; A1 with c ≥ k | Hidden committed events not reported by an audit within τ + Δ |
| All (P4) | Every experiment | Verification method recorded per event |  | An event accepted that is in no honest party's history |

Experiment E1 (performance) tests no property; it measures the cost of each design, which answers hypothesis H2.

A failed prediction is a finding, not a failure of the thesis. Either the implementation has a bug (fix it and rerun) or the model is wrong (revise the claim and explain why). Both must be recorded in `docs/DECISIONS.md`.

## 8. Corrections to the build specification

Writing and then reviewing the model exposed eight places where the build specification, as written, would make the claims untestable or false; each must be fixed before milestone M3.

| # | Specification section | Correction | Why |
| --- | --- | --- | --- |
| 1 | 7, witness service | A witness co-signs a checkpoint only after its mirror holds every leaf up to that size and recomputes the same root | Without this, a co-signed event may exist only at the custodian, and A1.2 (P1) fails |
| 2 | 4, verifier; 8, gateway adapter | Set q = a + 1 per run and record it | q = 2 is only safe with no colluders (A2.1) |
| 3 | 8, gateway adapter | Each member's adapter signs its responses | Needed for a transferable proof of equivocation in A2 (A2.5) |
| 4 | 4, 7, 10 | Record k and c in every run, and include settings with c ≥ k | The claims predict failure at c ≥ k; the experiments must test that boundary |
| 5 | 7, witness service | Witnesses store and serve the fully co-signed checkpoint (all k co-signatures), received from the log or by gossip | Otherwise no facility can verify anything after the custodian withdraws (A1.2) |
| 6 | 4, verifier | Audits fetch checkpoints from witnesses directly (A1), compare block hashes across all reachable members (A2), and scan the full visible history each period | Needed for P5 (A1.6, A2.6) and for P3 when b ≥ 2 (A2.5) |
| 7 | 8 and 10, A2 faults | Rewrite every store the adversary holds (state database and adapter index); record b and which members collude | E4 must test the adversary's full power; A2's claims depend on b |
| 8 | 2 and 10 | Add P5 omission detection; experiment E3 tests it | Withholding had an experiment but no property |

Items 1 to 4 were applied to the build specification on 19 October 2026 after the first draft; items 5 to 8 came from a self-review of the model and were applied the same day. Open questions 1 and 2 in Section 9 were settled there: agreement-based verification for A2, and A1's write limitation accepted as a stated property.

## 9. Limitations and open questions

The model has seven limitations that examiners may question, and it leaves five design choices for you to decide and defend.

### Limitations to state in the thesis

1. **Authentic registry.** Facility keys are assumed correct. In practice someone (for example HeFRA) must issue and revoke them, and a corrupt registry breaks every architecture equally.
2. **Synchrony between honest parties.** Detection-time bounds assume messages arrive within Δ. Under real rural connectivity, detection is delayed but, under these designs, still eventual. Experiment E6 explores this.
3. **Truthful content is out of scope.** The architectures prove who said what and when, not that it was true. Two colluding facilities can record a false arrival.
4. **Metadata privacy is out of scope.** The model does not consider what record-keeping parties learn from facility codes and timestamps.
5. **Static adversary.** The set of corrupted parties is fixed before a run. Parties changing sides during a run is not modelled.
6. **Full-scan audit.** Detection times assume each facility re-checks its whole visible history every period. That is realistic at experiment scale, not at national scale, where sampled audits would make detection probabilistic in time.
7. **Self-reviewed model.** The model has been reviewed only by its drafter. An independent review by someone with distributed-systems expertise is still required before the claims are reported.

### Open questions for you

1. **A2 verification method.** The model uses agreement between q members. An alternative is to verify the orderers' signatures on each block, which ties verification to the BFT quorum instead of member agreement. It is stronger but more work to build. Which will you defend?
2. **A1 write availability.** A1 cannot accept writes without its custodian (A1.3). Do you accept this as a stated limitation, or add a witness-led recovery mode as an extension? I recommend accepting it: the thesis is about preserving history, and the contrast with A2 is itself a finding.
3. **Collusion range.** Are c = 0 to 2 for A1 and a = 1 to 3 for A2 the right ranges, given that real institutions in Ghana might collude?
4. **Async co-signing.** Do you test A1 in both sync and async modes, or sync only? Both doubles the A1 runs but shows the latency-availability trade-off.
5. **Audit period τ and gossip period.** These set detection times. They should be chosen to reflect a realistic operating policy (for example, facilities audit every few minutes) and stated in Chapter Three.

Work through each claim in Section 6 until you can explain its proof sketch in your own words without notes. That is the standard your viva will apply.
