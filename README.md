# Logslines

Logslines is a language-neutral structured logging contract with a lightweight JavaScript reference emitter. Its wire identifier is `logslines/v1`.

## Current contents

- [v1 specification](spec/v1/spec.md)
- [v1 JSON Schema](spec/v1/schema.json)
- [Record examples](examples/)

Conformance tooling is available with `npm run validate`; `npm test` also checks representative invalid records. The JavaScript ESM reference emitter exports `createLogger`, `createErrorRecord`, and `createStderrSink`. It writes JSON Lines to stderr by default and accepts an injected sink. Projects consume Logslines from a pinned Git revision and bundle the needed source with their own code. Logslines is not published to npm.

## Validate

Requires Node.js `>=22.19.0`. npm is used for this repository's development tooling only. Run `npm ci`, then `npm test` and `npm run validate`.

## Ownership and scope

Logslines defines the common record shape, generic levels and statuses, normalized error shape, and reference emission behavior. Each application owns its event catalog and the allowlisted attributes for those events. Git tags identify source releases; the `logslines/v1` schema identifier remains independent of release versions.

Logslines stops at emission. It does not collect, store, rotate, ship, index, search, or display logs. It does not include a database, daemon, network service, dashboard, or application-specific event catalog.
