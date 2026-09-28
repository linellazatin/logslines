# Logslines v1 Specification

**Schema identifier:** `logslines/v1`  
**Status:** Normative v1 contract

## 1. Purpose and scope

Logslines defines a small, language-neutral structured logging contract for applications, services, tools, extensions, adapters, and libraries. A record identifies its emitter, logical operation, outcome, severity, optional host-session correlation, bounded event-specific facts, and normalized failure information.

Logslines defines record structure and meaning. It does not define log collection, storage, rotation, transport infrastructure, indexing, search, dashboards, analytics, or application-specific event catalogs. Each consuming project owns its event catalog and attribute allowlist.

The record field `schema` MUST be exactly `logslines/v1`. This wire-contract identifier is independent of the Logslines implementation, package, and service versions.

## 2. Design principles

- Records SHOULD describe meaningful operation outcomes rather than every internal step.
- The generic envelope is closed. Producers MUST NOT add unrecognized top-level fields or unrecognized properties to the closed `service`, `context`, and non-null `error` objects.
- Attributes MUST add bounded event-specific facts and SHOULD NOT repeat envelope information.
- Records MUST NOT become secondary storage for application content.
- Logging MUST remain subordinate to the application operation; logging failures MUST NOT cause that operation to fail.

## 3. Canonical record

A record has exactly these 12 required top-level fields:

```text
schema
timestamp
level
event
message
service
context
operation
status
duration_ms
attributes
error
```

The machine-readable structural contract is [schema.json](schema.json). All 12 fields MUST be present. Additional top-level fields are invalid.

## 4. Top-level fields

### 4.1 `schema`

**Type:** string. **Required:** yes. **Value:** `logslines/v1`.

Identifies the wire contract. Producers MUST use the exact value. It does not identify a package release.

### 4.2 `timestamp`

**Type:** string. **Required:** yes.

The timestamp MUST be a valid RFC 3339 date-time in UTC and end in `Z`. Fractional seconds are optional. The emitter normally creates the timestamp when it emits the record.

Example: `2026-09-27T04:30:00.000Z`.

### 4.3 `level`

**Type:** string. **Required:** yes. **Allowed:** `debug`, `info`, `warn`, `error`.

The level describes diagnostic severity, not operation outcome. A failed operation SHOULD use `error`; a recoverable condition or policy block SHOULD use `warn`.

### 4.4 `event`

**Type:** string. **Required:** yes.

A stable, lowercase, dot-separated identifier for what happened. It MUST match:

```regex
^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9_]*)+$
```

Events SHOULD describe outcomes and remain stable across implementation refactors. Examples: `memory.retained`, `web.search.completed`, `mode.changed`.

### 4.5 `message`

**Type:** non-empty string. **Required:** yes.

A concise, reasonably stable, human-readable summary of the event. It MUST describe the outcome and MUST NOT contain raw application content or arbitrary formatted payloads.

### 4.6 `service`

**Type:** closed object. **Required:** yes.

It MUST contain exactly four non-empty strings:

| Property | Meaning |
|---|---|
| `namespace` | Organizational or application-family namespace, commonly `openlines`. |
| `name` | Product, project, or primary service identity. |
| `component` | Logical component that emitted the record. |
| `version` | Version of that component or nearest truthful distributable unit, as a JSON string. |

No additional `service` properties are permitted. Service identity MUST NOT be repeated in attributes.

### 4.7 `context`

**Type:** closed object. **Required:** yes.

It MUST contain exactly `session_id`, whose value is either a non-empty string or `null`. This is the only v1 correlation field.

When available, the value MUST be an opaque identifier supplied by the host application. Producers MUST NOT generate a substitute or derive one from a process ID, working directory, timestamp, logger instance, or random UUID. Use `null` when no meaningful host session is available. No additional `context` properties are permitted.

### 4.8 `operation`

**Type:** non-empty string. **Required:** yes.

Identifies the logical action and MUST use snake_case matching:

```regex
^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$
```

Examples: `retain`, `inject_context`, `run_benchmark`. The operation describes what was being done; the event describes what happened.

### 4.9 `status`

**Type:** string. **Required:** yes. **Allowed values:** exactly these seven:

| Status | Meaning |
|---|---|
| `ok` | The operation completed normally. |
| `empty` | It completed successfully but produced no usable results. |
| `not_found` | A specifically requested resource could not be found. |
| `skipped` | The operation deliberately performed no action. |
| `blocked` | A declared policy prevented the operation. |
| `partial` | The overall operation completed, but one or more sub-operations failed or were unavailable. |
| `failed` | The logical operation did not complete successfully. |

### 4.10 `duration_ms`

**Type:** finite non-negative JSON number or `null`. **Required:** yes.

The value is elapsed time for the logical operation in milliseconds. Producers SHOULD measure meaningful work and MUST use `null` rather than invent or approximate an unmeasured duration.

### 4.11 `attributes`

**Type:** object. **Required:** yes.

An event with no additional facts MUST use an empty object. Every key MUST be namespaced and match:

```regex
^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$
```

Values MAY be strings, booleans, finite numbers, or arrays containing only strings, only booleans, or only finite numbers. Arrays MUST be homogeneous. Empty arrays are allowed. Null values, nested objects, and arrays mixing primitive types are invalid.

Attributes SHOULD explain the specific event using bounded facts such as counts, booleans, enums, short identifiers, or short arrays of stable codes. They MUST NOT repeat information already represented by the service, context, event, operation, status, level, or error. Raw application metadata MUST NOT be copied into attributes.

V1 defines no universal byte or character ceiling. Consumer event catalogs MAY impose stricter bounds.

### 4.12 `error`

**Type:** object or `null`. **Required:** yes.

If `status` is `failed`, `error` MUST be a non-null closed object with these properties:

| Property | Requirement |
|---|---|
| `kind` | Required; one of `validation`, `configuration`, `filesystem`, `network`, `provider`, `protocol`, `platform`, `policy`, `timeout`, or `unknown`. |
| `code` | Required; non-empty component-specific snake_case identifier. |
| `message` | Required; non-empty sanitized human-readable failure summary. |
| `retryable` | Required boolean indicating whether repeating the same operation may reasonably succeed without changing its meaning. |
| `cause_kind` | Optional runtime error-class name matching `^[A-Za-z_$][A-Za-z0-9_$]*(?:[.$][A-Za-z_$][A-Za-z0-9_$]*)*$`. It MUST NOT contain a stack trace. |

Unknown error properties are invalid. Error codes MAY be component-specific; error kinds are generic.

For every status other than `failed`, `error` MUST be `null`, including `partial`, `blocked`, and `not_found`.

## 5. Privacy

Ordinary records MUST NOT include prompts, system instructions, memory contents, documents, plans, user text, search queries, page contents, browser DOM, shell commands, provider payloads, credentials, tokens, unrestricted metadata, or sensitive paths and URLs merely because that information is available.

Prefer counts, booleans, known enums, opaque IDs, sanitized error codes, and bounded measurements. A specialized forensic facility with different capture or retention behavior is outside ordinary Logslines records.

## 6. Serialization

A record MUST serialize as one valid JSON object without comments. A stream of records MUST use JSON Lines: one complete JSON object per line. JSON values that are not valid finite JSON numbers, including NaN and infinities, MUST NOT be emitted.

## 7. Compatibility

The schema identifier is independent of implementation and package versions. Changes to required fields, types, permitted values, or established semantics require a new schema identifier. Consumer event catalogs MAY evolve independently while their records conform to this contract.
