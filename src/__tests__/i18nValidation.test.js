/**
 * Translation Interpolation Validation Test
 *
 * Statically analyzes all t('key', { ... }) calls across the codebase
 * and ensures that every translation key with {{param}} interpolation
 * receives the required parameters.
 *
 * This test guards against the regression we fixed in SalesPage.jsx
 * (where {{plural}} was passed as { s } instead of { plural })
 * and the low-stock badge issue (where t('product.low_stock') was
 * called without the { count } parameter).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

// ─── Helpers ───────────────────────────────────────────────────────────────

const PROJECT_ROOT = process.cwd();

/**
 * Read a file and return its contents.
 */
function readFileSync(relativePath) {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), 'utf-8');
}

/**
 * Recursively walk source directories and return all .js / .jsx file paths
 * relative to PROJECT_ROOT, skipping excluded directories.
 */
function walkSourceFiles(dir, excludes = []) {
  const fullDir = path.join(PROJECT_ROOT, dir);
  let results = [];

  try {
    const entries = fs.readdirSync(fullDir, { withFileTypes: true });
    for (const entry of entries) {
      const rel = path.join(dir, entry.name);
      if (entry.name.startsWith('.') || excludes.includes(entry.name)) continue;
      if (entry.isDirectory()) {
        results.push(...walkSourceFiles(rel, excludes));
      } else if (
        (entry.name.endsWith('.js') || entry.name.endsWith('.jsx')) &&
        !entry.name.endsWith('.test.js') &&
        !entry.name.endsWith('.test.jsx')
      ) {
        results.push(rel);
      }
    }
  } catch {
    // directory doesn't exist — skip
  }

  return results;
}

// ─── Parse translation keys & interpolation params ────────────────────────

/**
 * Parse DEFAULT_EN_TRANSLATIONS from i18n.js and return a Map of
 * key -> array of required param names.
 *
 * Handles both single-quoted and double-quoted values.
 */
function parseInterpolationKeys() {
  const content = readFileSync('src/utils/i18n.js');

  // Find the DEFAULT_EN_TRANSLATIONS object block by tracking brace depth.
  const startMarker = 'const DEFAULT_EN_TRANSLATIONS = {';
  const startIdx = content.indexOf(startMarker);
  if (startIdx === -1) {
    throw new Error('Could not find start marker: ' + startMarker);
  }

  let depth = 0;
  let inString = false;
  let stringChar = null;
  let objStart = startIdx + startMarker.length;
  let objEnd = -1;

  for (let i = objStart; i < content.length; i++) {
    const ch = content[i];
    const prev = i > 0 ? content[i - 1] : '';

    if (inString) {
      if (ch === stringChar && prev !== '\\') inString = false;
      continue;
    }

    if (ch === "'" || ch === '"' || ch === '`') {
      inString = true;
      stringChar = ch;
      continue;
    }

    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === -1) {
        objEnd = i;
        break;
      }
    }
  }

  if (objEnd === -1) {
    throw new Error('Could not find closing brace of DEFAULT_EN_TRANSLATIONS');
  }

  const objSource = content.slice(objStart, objEnd);

  // Extract each key-value pair: 'key': 'value' or 'key': "value"
  // Uses backreference to match the opening quote character.
  const keys = new Map();
  const pairRegex = /'([^']+)'\s*:\s*(['""])((?:[^\\]|\\.)*?)\2/g;
  let match;

  while ((match = pairRegex.exec(objSource)) !== null) {
    const key = match[1];
    const value = match[3];
    // Extract {{param}} interpolation variables
    const params = [...value.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
    if (params.length > 0) {
      keys.set(key, params);
    }
  }

  return keys;
}

// ─── Scan source files for t() calls ──────────────────────────────────────

/**
 * Extract param names from an object literal source string.
 * Handles:
 *   - Regular props:  { count: x, name: y }  => ['count', 'name']
 *   - Shorthand:      { query, store }        => ['query', 'store']
 *   - Mixed:          { count, store: name }  => ['count', 'store']
 *   - Nested values:  { opts: { ... } }       => ['opts'] (skip nested)
 */
function parseObjectParams(source) {
  const names = [];
  if (!source.trim()) return names;

  let depth = 0;
  let inString = false;
  let stringChar = null;
  let current = '';

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    const prev = i > 0 ? source[i - 1] : '';

    if (inString) {
      if (ch === stringChar && prev !== '\\') inString = false;
      current += ch;
      continue;
    }

    if (ch === "'" || ch === '"' || ch === '`') {
      inString = true;
      stringChar = ch;
      current += ch;
      continue;
    }

    if (ch === '{' || ch === '[') {
      depth++;
      current += ch;
      continue;
    }

    if (ch === '}' || ch === ']') {
      depth--;
      current += ch;
      continue;
    }

    if (ch === ',' && depth === 0) {
      processPart(current.trim());
      current = '';
      continue;
    }

    current += ch;
  }

  // Last part
  if (current.trim()) processPart(current.trim());

  function processPart(part) {
    if (!part) return;
    // Check for colon (regular property)
    const colonIdx = part.indexOf(':');
    if (colonIdx > 0) {
      const name = part.slice(0, colonIdx).trim();
      if (name && /^\w+$/.test(name)) names.push(name);
    } else if (/^\w+$/.test(part)) {
      // Shorthand property — bare identifier IS the param name
      names.push(part);
    }
    // Otherwise it's a value expression or spread — skip
  }

  return names;
}

/**
 * Find all t('key', { ... }) or t("key", { ... }) calls in a file.
 *
 * Returns an array of objects: { key, params, file, line, match }
 *
 * Limitations:
 * - Cannot validate dynamic keys: t(variable, ...) or t(`key.${x}`, ...)
 * - Cannot validate spread params: t('key', { ...obj })
 * - Cannot validate variable params: t('key', someObject)
 */
function scanTCallsInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const calls = [];

  // Regex to match t('key', { ... }) or t("key", { ... })
  // Uses backreference for the opening quote and reluctant capture for params.
  // The reluctant .+? on the key + backreference ensures we match the
  // correct closing quote even with dots in the key.
  const re = /\bt\((['"`])(.+?)\1\s*(?:,\s*\{([\s\S]*?)\}\s*)?\)/g;
  let match;

  while ((match = re.exec(content)) !== null) {
    const key = match[2];
    const paramsBody = match[3] || '';

    // Extract param names from the object body
    // Handles both regular ({ count: x }) and shorthand ({ query }) properties
    const paramNames = parseObjectParams(paramsBody);

    const matchStart = match.index;
    const lineNum = content.slice(0, matchStart).split('\n').length;

    calls.push({
      key,
      params: paramNames,
      file: filePath,
      line: lineNum,
      match: match[0].trim(),
    });
  }

  return calls;
}

/**
 * Scan all source files for t() calls.
 */
function scanAllTCalls() {
  const files = walkSourceFiles('src', ['node_modules', '__tests__']);
  const allCalls = [];

  for (const file of files) {
    try {
      const fileCalls = scanTCallsInFile(path.join(PROJECT_ROOT, file));
      allCalls.push(...fileCalls);
    } catch {
      // skip unreadable files
    }
  }

  return allCalls;
}

// ─── Module-level parsing (synchronous, runs when file loads) ────────────

const INTERPOLATION_KEYS = parseInterpolationKeys();

// ─── Tests ────────────────────────────────────────────────────────────────

describe('Translation interpolation validation', () => {
  /** @type {{key:string, params:string[], file:string, line:number, match:string}[]} */
  let allCalls = [];
  /** @type {Map<string, {key:string, params:string[], file:string, line:number, match:string}[]>} */
  let callsByKey = new Map();

  beforeAll(() => {
    allCalls = scanAllTCalls();
    callsByKey = new Map();
    for (const call of allCalls) {
      if (!callsByKey.has(call.key)) callsByKey.set(call.key, []);
      callsByKey.get(call.key).push(call);
    }
  });

  // ── Positive: every t() call on interpolation keys passes required params ──

  describe('t() calls pass required interpolation params', () => {
    for (const [key, requiredParams] of INTERPOLATION_KEYS) {
      it(`"${key}" requires [${requiredParams.join(', ')}]`, () => {
        const actualCalls = callsByKey.get(key) || [];
        // Skip keys not found in source code (back-end or dynamic-only)
        if (actualCalls.length === 0) return;

        const failures = [];
        for (const call of actualCalls) {
          const missing = requiredParams.filter((p) => !call.params.includes(p));
          if (missing.length > 0) {
            failures.push(
              `  ${call.file}:${call.line} — ${call.match}\n` +
              `    Missing params: [${missing.join(', ')}] (has: [${call.params.join(', ')}])`
            );
          }
        }

        if (failures.length > 0) {
          expect.fail(
            `"${key}" requires [${requiredParams.join(', ')}] but found missing params:\n${failures.join('\n')}`
          );
        }
      });
    }

    it('parsed at least one interpolation key (sanity check)', () => {
      expect(INTERPOLATION_KEYS.size).toBeGreaterThan(0);
    });
  });

  // ── Per-key validation with detailed output ──

  describe('individual interpolation keys', () => {
    function checkKey(key) {
      const required = INTERPOLATION_KEYS.get(key);
      if (!required) return; // no interpolation on this key
      const calls = callsByKey.get(key) || [];
      for (const call of calls) {
        for (const param of required) {
          expect(
            call.params,
            `${call.file}:${call.line} — t('${key}', ...) missing param "${param}"`
          ).toContain(param);
        }
      }
    }

    it('"sales.active_promotions" gets {{count}} and {{plural}}', () => checkKey('sales.active_promotions'));
    it('"product.low_stock" gets {{count}}', () => checkKey('product.low_stock'));
    it('"product.only_left" gets {{count}}', () => checkKey('product.only_left'));
    it('"product.percent_off" gets {{percent}}', () => checkKey('product.percent_off'));
    it('"product.view_all_reviews" gets {{count}}', () => checkKey('product.view_all_reviews'));
    it('"product.days" gets {{count}}', () => checkKey('product.days'));
    it('"product.reviews" gets {{count}}', () => checkKey('product.reviews'));
    it('"product.sold" gets {{count}}', () => checkKey('product.sold'));
    it('"product.add_price" gets {{price}}', () => checkKey('product.add_price'));
    it('"product.save_amount" gets {{amount}}', () => checkKey('product.save_amount'));
    it('"product.above_amount" gets {{amount}}', () => checkKey('product.above_amount'));
    it('"checkout.qty" gets {{qty}}', () => checkKey('checkout.qty'));
    it('"checkout.low_stock" gets {{count}}', () => checkKey('checkout.low_stock'));
    it('"checkout.open_gateway" gets {{name}}', () => checkKey('checkout.open_gateway'));
    it('"checkout.more_items" gets {{count}}', () => checkKey('checkout.more_items'));
    it('"checkout.applied_from" gets {{names}}', () => checkKey('checkout.applied_from'));
    it('"cart.drawer.items" gets {{count}}', () => checkKey('cart.drawer.items'));
    it('"cart.drawer.item" gets {{count}}', () => checkKey('cart.drawer.item'));
    it('"cart.drawer.oos_multiple" gets {{count}}', () => checkKey('cart.drawer.oos_multiple'));
    it('"cart.drawer.remove_item" gets {{name}}', () => checkKey('cart.drawer.remove_item'));
    it('"cart.subtotal" gets {{count}}', () => checkKey('cart.subtotal'));
    it('"cart.add_free_shipping" gets {{amount}}', () => checkKey('cart.add_free_shipping'));
    it('"cart.oos_multiple" gets {{count}}', () => checkKey('cart.oos_multiple'));
    it('"wishlist.owner_shared_via" gets {{store}}', () => checkKey('wishlist.owner_shared_via'));
    it('"wishlist.low_stock" gets {{count}}', () => checkKey('wishlist.low_stock'));
    it('"profile.hello_user" gets {{name}}', () => checkKey('profile.hello_user'));
    it('"profile.manage_account" gets {{store}}', () => checkKey('profile.manage_account'));
    it('"sales.view_all_products" gets {{count}}', () => checkKey('sales.view_all_products'));
    it('"sales.up_to_off" gets {{percent}}', () => checkKey('sales.up_to_off'));
    it('"sales.percent_off" gets {{percent}}', () => checkKey('sales.percent_off'));
    it('"notifications.bell.new" gets {{count}}', () => checkKey('notifications.bell.new'));
    it('"page_view.last_updated" gets {{date}}', () => checkKey('page_view.last_updated'));
    it('"footer.above_amount" gets {{amount}}', () => checkKey('footer.above_amount'));
    it('"search.for_query" gets {{query}}', () => checkKey('search.for_query'));
    it('"auth.sign_in_account" gets {{store}}', () => checkKey('auth.sign_in_account'));
    it('"auth.join_store" gets {{store}}', () => checkKey('auth.join_store'));
    it('"auth.continue_with" gets {{provider}}', () => checkKey('auth.continue_with'));
  });

  // ── Report: all used keys with interpolation are covered ──

  describe('coverage report', () => {
    it('every interpolation key is used in at least one t() call', () => {
      const unused = [];
      for (const [key] of INTERPOLATION_KEYS) {
        if (!callsByKey.has(key) || callsByKey.get(key).length === 0) {
          unused.push(key);
        }
      }
      if (unused.length > 0) {
        console.warn(
          '⚠  ' + unused.length + ' interpolation key(s) have no t() calls in source code:\n' +
          unused.map((k) => '    - ' + k).join('\n') +
          '\n  (These may be used by back-end API translations or dynamic keys.)'
        );
      }
    });
  });

  // ── Report: summary of all t() calls found ──

  describe('scan summary', () => {
    it('reports total t() calls found', () => {
      const keysWithCalls = [...callsByKey.keys()].sort();
      console.log(
        '\n' + String.fromCodePoint(0x1F4CA) + ' Translation scan summary:\n' +
        '   Total t() calls found: ' + allCalls.length + '\n' +
        '   Unique keys used:      ' + keysWithCalls.length + '\n' +
        '   Interpolation keys:    ' + INTERPOLATION_KEYS.size + '\n' +
        '   Files scanned:         ' + walkSourceFiles('src', ['node_modules', '__tests__']).length + '\n'
      );
    });
  });
});
