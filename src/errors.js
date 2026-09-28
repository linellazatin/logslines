const ERROR_KINDS = new Set([
  'validation',
  'configuration',
  'filesystem',
  'network',
  'provider',
  'protocol',
  'platform',
  'policy',
  'timeout',
  'unknown',
]);
const CODE_PATTERN = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
const CAUSE_KIND_PATTERN = /^[A-Za-z_$][A-Za-z0-9_$]*(?:[.$][A-Za-z_$][A-Za-z0-9_$]*)*$/;
const REQUIRED_KEYS = ['kind', 'code', 'message', 'retryable'];
const ALLOWED_KEYS = new Set([...REQUIRED_KEYS, 'cause_kind']);

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

export function createErrorRecord(input) {
  try {
    if (!isPlainObject(input)) return null;
    const keys = Reflect.ownKeys(input);
    if (keys.some((key) => typeof key !== 'string' || !ALLOWED_KEYS.has(key))) return null;
    if (!REQUIRED_KEYS.every((key) => Object.hasOwn(input, key))) return null;
    if (!ERROR_KINDS.has(input.kind)
      || !isNonEmptyString(input.code)
      || !CODE_PATTERN.test(input.code)
      || !isNonEmptyString(input.message)
      || typeof input.retryable !== 'boolean'
      || (Object.hasOwn(input, 'cause_kind')
        && (!isNonEmptyString(input.cause_kind) || !CAUSE_KIND_PATTERN.test(input.cause_kind)))) {
      return null;
    }

    return {
      kind: input.kind,
      code: input.code,
      message: input.message,
      retryable: input.retryable,
      ...(Object.hasOwn(input, 'cause_kind') ? { cause_kind: input.cause_kind } : {}),
    };
  } catch {
    return null;
  }
}
