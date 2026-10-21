# Versions

Exact versions of every runtime, image and library (SPEC.md Section 3). Library versions are also locked in `pnpm-lock.yaml`. Updated at every milestone; the hash of this file is recorded in every run manifest.

Selected on 2026-10-21 as the latest stable release of each.

## Runtimes and tools

| Component               | Version                 | Where pinned                       | Notes                                                                          |
| ----------------------- | ----------------------- | ---------------------------------- | ------------------------------------------------------------------------------ |
| Node.js                 | 24.22.1 (LTS "Krypton") | `.nvmrc`, `package.json` `engines` | CI and build machine (upgraded 2026-10-21; D-002)                              |
| pnpm                    | 12.14.0                 | `package.json` `packageManager`    |                                                                                |
| TypeScript              | 7.0.2                   | `package.json`                     | Native compiler (`tsc`)                                                        |
| Python                  | 3.13 (local 3.13.15)    | —                                  | Pinned with exact packages at M6                                               |
| Docker Engine / Compose | —                       | —                                  | Required from M2; not yet installed on the build machine                       |
| Go                      | —                       | —                                  | CI only, from M3, for the `transparency-dev/merkle` differential tests (D-017) |

## Libraries (root dev dependencies)

| Package       | Version | Purpose                  |
| ------------- | ------- | ------------------------ |
| `typescript`  | 7.0.2   | Type checking and build  |
| `@types/node` | 24.19.2 | Node 24 type definitions |
| `vitest`      | 5.0.5   | Test runner              |
| `fast-check`  | 4.10.2  | Property-based tests     |
| `prettier`    | 3.9.10  | Formatting               |

## CI actions

Pinned to commit SHAs in `.github/workflows/ci.yml`.

| Action               | Tag            | Commit                                     |
| -------------------- | -------------- | ------------------------------------------ |
| `actions/checkout`   | v7.0.1         | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| `pnpm/action-setup`  | v6.1.0         | `ea17c68df8912ef543352723c149a84f56e3d413` |
| `actions/setup-node` | v7.1.0         | `949feb2413d6458794dcd2491c4babbbce0c15c1` |
| Runner image         | `ubuntu-24.04` | —                                          |
