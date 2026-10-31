#!/usr/bin/env node
/**
 * Test suite for Code Guardian itself to verify detection capabilities and ignore rules.
 */
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import { CodeGuardian } from './code-guardian.mjs';

const fixturePath = path.resolve('scripts/guardian-fixtures/vulnerable-sample.js');
const fixtureContent = fs.readFileSync(fixturePath, 'utf8');

const guardian = new CodeGuardian();
guardian.scanFile('test/vulnerable-sample.js', fixtureContent);

const findings = guardian.findings;
assert(findings.length >= 3, `Expected at least 3 findings in test fixture, found ${findings.length}`);

const hasEval = findings.some(f => f.hebrewTitle.includes('eval()'));
const hasSecret = findings.some(f => f.hebrewTitle.includes('מפתח סודי') || f.hebrewTitle.includes('סוד'));
const hasReDoS = findings.some(f => f.hebrewTitle.includes('ReDoS'));

assert(hasEval, 'Guardian must detect dangerous eval() call');
assert(hasSecret, 'Guardian must detect exposed secret key');
assert(hasReDoS, 'Guardian must detect catastrophic ReDoS');

console.log('✅ Code Guardian self-check tests passed successfully.');
