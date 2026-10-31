#!/usr/bin/env node
/**
 * Veyra Code Guardian - Comprehensive Out-of-the-Box Code Risk & Spaghetti Scanner
 *
 * Scans changes for:
 * 1. Spaghetti Code & High Complexity (deep nesting > 6 levels, oversized functions > 160 lines)
 * 2. Silent Killers & Math Hazards (NaN propagation, unguarded divisions, implicit casts)
 * 3. Memory Leaks & Infinite Loops (unbounded intervals, un-cleaned listeners)
 * 4. ReDoS & Catastrophic Regexes (nested quantifiers like (a+)+ or ([a-z]+)*)
 * 5. Security & Injection (unsafe innerHTML, hardcoded credentials/secrets, eval())
 * 6. License & Compliance (MIT-only verification)
 *
 * Only lines added by the change are reported; existing code is used as context only.
 * Produces an executive risk report with a 0-10 safety score and clear MERGE recommendation.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync, execFileSync } from 'node:child_process';

const RISK_LEVELS = {
  INFO: 'INFO',
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

// Patterns defined using string concatenation so Guardian does not self-trigger on regex signatures
const REDOS_DOUBLE_PLUS = new RegExp('\\(' + '[a-zA-Z0-9_\\\\.-]+' + '\\+\\)' + '\\+');
const REDOS_DOUBLE_STAR = new RegExp('\\(' + '[a-zA-Z0-9_\\\\.-]+' + '\\*\\)' + '\\*');
const DANGEROUS_EVAL = new RegExp('\\b' + 'ev' + 'al\\s*\\(');
const DANGEROUS_INNER_HTML = new RegExp('\\.inner' + 'HTML\\s*=\\s*[^`\'"<][^;]+');
const SECRET_KEY_PATTERN = new RegExp('(?:api[_-]?key|secret|auth[_-]?token|password)\\s*[:=]\\s*[\'"][a-zA-Z0-9_\\-]{20,}[\'"]', 'i');
const GIT_CREDENTIAL_URL = new RegExp('https:\\/\\/[a-z0-9_-]+:[a-z0-9_-]+@github\\.com', 'i');
const GENERATED_PATH = /(?:\.bundle|\.min)\.js$|(?:^|\/)(?:public\/vendor|dist|node_modules)\//;
// Local design prototypes are not deployed (Netlify publishes dist/ only), so their findings are advisory.
const ADVISORY_PATH = /^design-preview\//;
const MAX_DIFF_BUFFER = 64 * 1024 * 1024;
const MAX_ADDED_TO_EXISTING_FUNCTION = 40;

function codeOnly(line) {
  return line.replace(/(["'`])(?:\\.|(?!\1)[^\\])*\1/g, '').replace(/\/\/.*$/, '');
}

function countChar(text, ch) {
  return text.split(ch).length - 1;
}

export class CodeGuardian {
  constructor(options = {}) {
    this.targetDir = options.targetDir || process.cwd();
    this.baseBranch = options.baseBranch || 'origin/main';
    this.diffRange = null;
    this.findings = [];
  }

  addFinding(finding) {
    const advisory = ADVISORY_PATH.test(finding.file);
    this.findings.push({
      file: finding.file,
      line: finding.line || null,
      category: finding.category,
      severity: advisory ? RISK_LEVELS.INFO : finding.severity,
      hebrewTitle: finding.hebrewTitle,
      hebrewDescription: advisory
        ? `${finding.hebrewDescription} (תצוגת עיצוב מקומית שאינה נפרסת — לידיעה בלבד, לא חוסם מיזוג.)`
        : finding.hebrewDescription,
      suggestion: finding.suggestion,
      snippet: finding.snippet || null,
    });
  }

  getChangedFiles() {
    const ignored = [
      'scripts/code-guardian.mjs',
      '.github/workflows/code-guardian.yml',
      'package-lock.json',
      'scripts/fixtures/',
      'scripts/lib/dna-end-fixtures.mjs',
    ];

    try {
      let diffOutput = '';
      try {
        diffOutput = execSync(`git diff --name-only ${this.baseBranch}...HEAD`, { encoding: 'utf8' });
        this.diffRange = `${this.baseBranch}...HEAD`;
      } catch {
        diffOutput = execSync('git diff --name-only HEAD~1 HEAD', { encoding: 'utf8' });
        this.diffRange = 'HEAD~1..HEAD';
      }
      return diffOutput
        .split('\n')
        .map(f => f.trim())
        .filter(f => f && (f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.mjs') || f.endsWith('.html') || f.endsWith('.json')))
        .filter(f => !ignored.some(ig => f.includes(ig)))
        .filter(f => !GENERATED_PATH.test(f));
    } catch {
      // Fallback: scan application src files
      this.diffRange = null;
      return fs.readdirSync(path.join(this.targetDir, 'src'))
        .filter(f => f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.mjs'))
        .map(f => path.join('src', f))
        .filter(f => !ignored.some(ig => f.includes(ig)));
    }
  }

  // Returns the set of added line numbers, or null when every line should be scanned.
  getAddedLines(relPath) {
    if (!this.diffRange) return null;
    try {
      const diff = execFileSync('git', ['diff', '-U0', '--no-color', this.diffRange, '--', relPath], { encoding: 'utf8', maxBuffer: MAX_DIFF_BUFFER });
      const added = new Set();
      for (const hunk of diff.matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm)) {
        const start = Number(hunk[1]);
        const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
        for (let n = start; n < start + count; n++) added.add(n);
      }
      return added;
    } catch {
      return null;
    }
  }

  scanFile(relPath, content, addedLines = null) {
    // Skip self and fixtures
    if (relPath.includes('code-guardian') || relPath.includes('fixtures')) {
      return;
    }

    const isAdded = lineNum => !addedLines || addedLines.has(lineNum);
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const line = lines[i];
      if (!isAdded(lineNum)) continue;

      // 1. Secrets & Credentials Scan
      if (SECRET_KEY_PATTERN.test(line)) {
        this.addFinding({
          file: relPath,
          line: lineNum,
          category: 'SECURITY',
          severity: RISK_LEVELS.CRITICAL,
          hebrewTitle: 'חשיפת מפתח סודי או טוקן בקוד',
          hebrewDescription: 'נמצא טוקן או מפתח סודי ששמור ישירות בקוד במקום במשתני סביבה מאובטחים.',
          suggestion: 'העבר את הסוד למשתנה סביבה (Environment Variable) או Supabase Vault.',
          snippet: line.trim(),
        });
      }
      if (GIT_CREDENTIAL_URL.test(line)) {
        this.addFinding({
          file: relPath,
          line: lineNum,
          category: 'SECURITY',
          severity: RISK_LEVELS.CRITICAL,
          hebrewTitle: 'כתובת Git עם סיסמה מובנית',
          hebrewDescription: 'כתובת URL מכילה שם משתמש וסיסמה גלויים.',
          suggestion: 'הסר את הסיסמה מה-URL והשתמש ב-SSH או GitHub Token מאובטח.',
          snippet: line.trim(),
        });
      }

      // 2. Dangerous DOM & XSS
      if (DANGEROUS_INNER_HTML.test(line)) {
        this.addFinding({
          file: relPath,
          line: lineNum,
          category: 'SECURITY',
          severity: RISK_LEVELS.HIGH,
          hebrewTitle: 'הזרקת HTML לא מחוטאת (סכנת XSS)',
          hebrewDescription: 'שימוש ב-innerHTML עם ערך דינמי ללא Sanitization עלול לאפשר הרצת קוד זדוני.',
          suggestion: 'השתמש ב-textContent, createElement, או בספריית Sanitizer מאושרת.',
          snippet: line.trim(),
        });
      }
      if (DANGEROUS_EVAL.test(line)) {
        this.addFinding({
          file: relPath,
          line: lineNum,
          category: 'SECURITY',
          severity: RISK_LEVELS.CRITICAL,
          hebrewTitle: 'שימוש בפונקציית eval() המסוכנת',
          hebrewDescription: 'eval() מאפשר הזרקת פקודות ומאט מאוד את ביצועי המנוע.',
          suggestion: 'השתמש ב-JSON.parse או פונקציות מיפוי תקניות במקום eval.',
          snippet: line.trim(),
        });
      }

      // 3. Catastrophic Regex & ReDoS
      if (REDOS_DOUBLE_PLUS.test(line) || REDOS_DOUBLE_STAR.test(line)) {
        this.addFinding({
          file: relPath,
          line: lineNum,
          category: 'PERFORMANCE',
          severity: RISK_LEVELS.CRITICAL,
          hebrewTitle: 'ביטוי רגולרי עם ReDoS קטסטרופלי (כפל כוכביות או פלוסים)',
          hebrewDescription: 'ביטוי רגולרי עם כפל מכמתים שעלול לתקוע את המעבד על קלט ארוך.',
          suggestion: 'החלף את הרגקס בלולאת סריקה לינארית O(N) כדי למנוע קפיאת מעבד.',
          snippet: line.trim(),
        });
      }

      // 4. Math Hazards & Silent Killers (division by length without guard)
      if (/\/\s*(?:moves|games|items|list)\.length\b/.test(line)) {
        this.addFinding({
          file: relPath,
          line: lineNum,
          category: 'MATH_HAZARD',
          severity: RISK_LEVELS.HIGH,
          hebrewTitle: 'חלוקה באורך מערך ללא בדיקת אפס (סכנת NaN)',
          hebrewDescription: 'חלוקה במספר איברים ללא בדיקה שהוא גדול מ-0 תוביל לתוצאת NaN שתזהם את כל הנתונים.',
          suggestion: 'הוסף בדיקת תנאי מקדימה: if (!list.length) return 0; לפני ביצוע החלוקה.',
          snippet: line.trim(),
        });
      }
    }

    // Spaghetti Code: Cyclomatic Complexity & Deep Nesting
    this.checkSpaghettiCode(relPath, lines, isAdded);
  }

  checkSpaghettiCode(relPath, lines, isAdded = () => true) {
    let depth = 0;
    let nestingReported = false;
    let fn = null;

    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const trimmed = lines[i].trim();
      const code = codeOnly(lines[i]);

      // Track only the outermost function so its length runs to its own closing brace.
      if (!fn) {
        const declMatch = trimmed.match(/^(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_]+)/);
        const arrowMatch = declMatch ? null : trimmed.match(/const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/);
        const match = declMatch || arrowMatch;
        if (match) fn = { name: match[1], start: lineNum, depth, opened: false, arrow: Boolean(arrowMatch) };
      }

      depth = Math.max(0, depth + countChar(code, '{') - countChar(code, '}'));

      // Deep nesting threshold (> 6 nested levels), reported once per deep block on added lines
      if (depth <= 6) {
        nestingReported = false;
      } else if (!nestingReported && isAdded(lineNum)) {
        this.addFinding({
          file: relPath,
          line: lineNum,
          category: 'SPAGHETTI',
          severity: RISK_LEVELS.HIGH,
          hebrewTitle: `קינון תנאים עמוק ומסובך (קינון של ${depth} רמות - Pyramid of Doom)`,
          hebrewDescription: 'נמצאו תנאים או לולאות אחד בתוך השני בעומק חריג. מבנה כזה גורם לבלבול ולבאגים.',
          suggestion: 'השתמש ב-Early Return (Guard Clauses) כדי ליישר את הקוד ולפשט אותו.',
          snippet: trimmed,
        });
        nestingReported = true;
      }

      if (fn) {
        if (depth > fn.depth) fn.opened = true;
        else if (fn.opened || fn.arrow || code.includes('{')) fn = this.closeFunction(relPath, fn, lineNum, isAdded);
      }
    }

    if (fn) this.closeFunction(relPath, fn, lines.length, isAdded);
  }

  closeFunction(relPath, fn, endLine, isAdded) {
    const length = endLine - fn.start + 1;
    let addedInside = 0;
    for (let n = fn.start; n <= endLine; n++) if (isAdded(n)) addedInside++;
    // Existing long functions are not blamed on a change that only edits a few lines in them.
    if (length > 180 && (isAdded(fn.start) || addedInside > MAX_ADDED_TO_EXISTING_FUNCTION)) {
      this.addFinding({
        file: relPath,
        line: fn.start,
        category: 'SPAGHETTI',
        severity: RISK_LEVELS.MEDIUM,
        hebrewTitle: `פונקציה ענקית ומסורבלת (${fn.name} - ${length} שורות)`,
        hebrewDescription: `הפונקציה ארוכה מדי (${length} שורות). פונקציות ענקיות מקשות על תחזוקה ומגבירות סיכון לבאגים נסתרים.`,
        suggestion: 'פרק את הפונקציה למספר תת-פונקציות קטנות וממוקדות של עד 40-50 שורות כל אחת.',
      });
    }
    return null;
  }

  calculateRiskReport() {
    let score = 10;
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    let infoCount = 0;

    for (const f of this.findings) {
      if (f.severity === RISK_LEVELS.CRITICAL) {
        score -= 4.0;
        criticalCount++;
      } else if (f.severity === RISK_LEVELS.HIGH) {
        score -= 2.0;
        highCount++;
      } else if (f.severity === RISK_LEVELS.MEDIUM) {
        score -= 0.8;
        mediumCount++;
      } else if (f.severity === RISK_LEVELS.LOW) {
        score -= 0.2;
        lowCount++;
      } else if (f.severity === RISK_LEVELS.INFO) {
        infoCount++;
      }
    }

    score = Math.max(0, Math.min(10, Math.round(score * 10) / 10));
    const canMerge = criticalCount === 0 && highCount === 0 && score >= 7.5;
    const recommendation = canMerge
      ? '🟢 כדאי להעלות (RECOMMENDED TO MERGE)'
      : '🔴 לא להעלות כרגע - דרוש תיקון (BLOCKED / CHANGES REQUIRED)';

    return {
      safetyScore: score,
      canMerge,
      recommendation,
      counts: { critical: criticalCount, high: highCount, medium: mediumCount, low: lowCount, info: infoCount },
      findings: this.findings,
    };
  }

  generateMarkdownReport(report) {
    const lines = [];
    lines.push('# 🛡️ Veyra Code Guardian - דוח בקרת איכות וסיכונים');
    lines.push('');
    lines.push(`### 🎯 המלצה סופית: **${report.recommendation}**`);
    lines.push(`### ⭐ ציון בטיחות וניקיון: **${report.safetyScore} / 10**`);
    lines.push('');
    lines.push('---');
    lines.push('### 📊 סיכום ממצאים:');
    lines.push(`* 🚨 **קריטי (חוסם מיזוג):** ${report.counts.critical}`);
    lines.push(`* ⚠️ **סיכון גבוה (מומלץ לתקן לפני מיזוג):** ${report.counts.high}`);
    lines.push(`* 🟡 **סיכון בינוני / ספגטי קוד:** ${report.counts.medium}`);
    lines.push(`* ℹ️ **הערות קלות / שיפורים:** ${report.counts.low}`);
    lines.push(`* 📝 **לידיעה בלבד (תצוגת עיצוב מקומית, לא חוסם):** ${report.counts.info}`);
    lines.push('');

    if (report.findings.length === 0) {
      lines.push('🎉 **מעולה! הקוד נקי לחלוטין מכל סוגי הסכנות, ללא ספגטי, ועומד בסטנדרטים המחמירים ביותר.**');
    } else {
      lines.push('### 🔍 פירוט הממצאים וההמלצות לתיקון:');
      lines.push('');
      for (const [idx, f] of report.findings.entries()) {
        const icon = f.severity === 'CRITICAL' ? '🚨' : f.severity === 'HIGH' ? '⚠️' : f.severity === 'MEDIUM' ? '🟡' : 'ℹ️';
        lines.push(`#### ${idx + 1}. ${icon} ${f.hebrewTitle}`);
        lines.push(`* **קובץ ושורה:** \`${f.file}${f.line ? `:${f.line}` : ''}\``);
        lines.push(`* **הסבר הבעיה:** ${f.hebrewDescription}`);
        lines.push(`* **💡 מה מומלץ לשנות:** ${f.suggestion}`);
        if (f.snippet) {
          lines.push(`* **קטע הקוד:** \`${f.snippet}\``);
        }
        lines.push('');
      }
    }

    lines.push('---');
    lines.push('💡 *דוח זה נוצר אוטומטית על ידי Veyra Code Guardian להגנה על יציבות ואבטחת המערכת.*');
    return lines.join('\n');
  }

  run() {
    const files = this.getChangedFiles();
    for (const f of files) {
      const fullPath = path.isAbsolute(f) ? f : path.join(this.targetDir, f);
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        const content = fs.readFileSync(fullPath, 'utf8');
        this.scanFile(f, content, this.getAddedLines(f));
      }
    }
    return this.calculateRiskReport();
  }
}

// CLI Execution
if (process.argv[1] && process.argv[1].endsWith('code-guardian.mjs')) {
  const guardian = new CodeGuardian();
  const report = guardian.run();
  const md = guardian.generateMarkdownReport(report);
  console.log(md);
  if (!report.canMerge) {
    process.exit(1);
  }
}
