import assert from 'node:assert/strict';
import test from 'node:test';
import { SUPPORTED_LOCALES } from './locales.ts';
import { getScorePreflightMessages } from './score-preflight-messages.ts';

const placeholders = (text: string) => [...text.matchAll(/\{([a-zA-Z]+)\}/gu)].map(match => match[1]).sort();

test('all nine free preflight catalogs translate displayed controls and preserve price and coverage placeholders', () => {
  const english = getScorePreflightMessages('en');
  for (const locale of SUPPORTED_LOCALES) {
    const catalog = getScorePreflightMessages(locale);
    assert.deepEqual(Object.keys(catalog).sort(), Object.keys(english).sort(), locale);
    for (const [key, text] of Object.entries(catalog)) {
      if (key === 'reasonStrings') continue;
      assert.equal(typeof text, 'string', `${locale}.${key}`);
      assert.ok(String(text).trim(), `${locale}.${key}`);
      assert.deepEqual(placeholders(String(text)), placeholders(String(english[key as keyof typeof english])), `${locale}.${key}`);
    }
    if (locale !== 'en') for (const key of ['title', 'freeBody', 'checking', 'retry', 'manualChoice', 'confirmRecognition', 'priceChanged', 'noCredit'] as const) {
      assert.notEqual(catalog[key], english[key], `${locale}.${key} must use its translated catalog`);
    }
  }
});

test('every structural reason is translated in every locale, including partial and inconsistent analysis', () => {
  const expected = ['SINGLE_STAFF_LAYOUT', 'PIANO_STAFF_LAYOUT', 'MULTI_INSTRUMENT_LAYOUT', 'TAB_NOTATION', 'SYSTEM_GROUPING_UNCERTAIN',
    'PAGE_READ_FAILED', 'NO_STAFF_DETECTED', 'ORIENTATION_UNCERTAIN', 'LOW_RESOLUTION', 'ANALYSIS_LIMIT_REACHED', 'INCOMPLETE_ANALYSIS', 'INCONSISTENT_LAYOUT'].sort();
  for (const locale of SUPPORTED_LOCALES) {
    const reasons = getScorePreflightMessages(locale).reasonStrings;
    assert.deepEqual(Object.keys(reasons).sort(), expected, locale);
    for (const code of expected) {
      assert.ok(reasons[code]?.trim(), `${locale}.${code}`);
      assert.notEqual(reasons[code], code, `${locale}.${code}`);
      if (locale !== 'en') assert.notEqual(reasons[code], getScorePreflightMessages('en').reasonStrings[code], `${locale}.${code}`);
    }
  }
});
