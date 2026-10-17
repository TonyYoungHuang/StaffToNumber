import assert from 'node:assert/strict';
import test from 'node:test';
import { SUPPORTED_LOCALES } from './locales.ts';
import { getScorePreflightMessages, getScoreRequestWaitingMessages, getScoreRecognitionSupportMessage } from './score-preflight-messages.ts';
import { getPercentProgressMessages, getStagedUploadMessages } from './percent-progress-messages.ts';

test('progress and staged expiry actions are translated in all nine locales', () => {
  for (const locale of SUPPORTED_LOCALES) {
    for (const factory of [getPercentProgressMessages, getStagedUploadMessages]) {
      const english = factory('en');
      const messages = factory(locale);
      assert.deepEqual(Object.keys(messages), Object.keys(english));
      for (const [key, value] of Object.entries(messages)) {
        assert.ok(value.trim(), `${locale}.${key}`);
        if (locale !== 'en') assert.notEqual(value, english[key as keyof typeof english], `${locale}.${key}`);
      }
    }
  }
  assert.match(getStagedUploadMessages('en').expired, /expired.*upload.*once more/);
  assert.match(getStagedUploadMessages('zh-CN').expired, /过期.*再次上传一次/);
});

test('preflight waiting and long detail read messages are available in all nine locales', () => {
  for (const locale of SUPPORTED_LOCALES) {
    const copy = getScoreRequestWaitingMessages(locale);
    assert.ok(copy.preflight.trim()); assert.ok(copy.detail.trim());
    if (locale !== 'en') {
      assert.notEqual(copy.preflight, getScoreRequestWaitingMessages('en').preflight);
      assert.notEqual(copy.detail, getScoreRequestWaitingMessages('en').detail);
    }
  }
});

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

import { getRecognitionExperienceMessages, getRecognitionFailureMessage, recognitionExperienceCatalogIssues } from './recognition-experience-messages.ts';

test('recognition lanes, photo corners, alternatives and honest failures are translated in all nine locales', () => {
  assert.deepEqual(recognitionExperienceCatalogIssues(), []);
  const english = getRecognitionExperienceMessages('en');
  for (const locale of SUPPORTED_LOCALES) {
    const copy = getRecognitionExperienceMessages(locale);
    assert.deepEqual(Object.keys(copy), Object.keys(english));
    for (const [key, value] of Object.entries(copy)) {
      assert.ok(value?.trim(), `${locale}.${key}`);
      assert.deepEqual(placeholders(value), placeholders(english[key as keyof typeof english]), `${locale}.${key}`);
    }
    assert.match(copy.passCta, /2[.,]99/);
    assert.match(copy.starterCta, /Starter/);
    assert.equal(getScoreRecognitionSupportMessage(locale, 'RECOGNITION_CAPACITY_LIMIT'), copy.unsupportedLane);
    assert.notEqual(getScoreRecognitionSupportMessage(locale, 'RECOGNITION_CAPACITY_LIMIT'), getScoreRecognitionSupportMessage(locale, 'READY'));
    assert.equal(getRecognitionFailureMessage(locale, 'COVER_ONLY'), copy.coverFailure);
    assert.equal(getRecognitionFailureMessage(locale, 'LOW_RESOLUTION'), copy.blurFailure);
    assert.equal(getRecognitionFailureMessage(locale, 'NON_STAFF'), copy.notationFailure);
  }
});
