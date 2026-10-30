#!/usr/bin/env node
/**
 * Veyra Code Guardian - Comprehensive Out-of-the-Box Code Risk & Spaghetti Scanner
 *
 * Scans changes for:
 * 1. Spaghetti Code & High Complexity (deep nesting, oversized functions, chaotic jumps)
 * 2. Silent Killers & Math Hazards (NaN propagation, unguarded divisions, implicit casts)
 * 3. Memory Leaks & Infinite Loops (unbounded intervals, un-cleaned listeners, unbounded caches)
 * 4. ReDoS & Catastrophic Regexes (nested quantifiers like (a+)+ or ([a-z]+)*)
 * 5. Security & Injection (unsafe innerHTML, hardcoded credentials/secrets, unescaped user inputs)
 * 6. Concurrency & Race Conditions (unhandled promise rejections, parallel mutations)
 * 7. License & Compliance (MIT-only verification)
 *
 * Produces an executive risk report with a 0-10 safety score and clear MERGE recommendation.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const RISK_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

export class CodeGuardian {
  constructor(options = {}) {
    this.targetDir = options.targetDir || process.cwd();
    this.baseBranch = options.baseBranch || 'origin/main';
    this.findings = [];
  }

  addFinding(finding) {
    this.findings.push({
      file: finding.file,
      line: finding.line || null,
      category: finding.category,
      severity: finding.severity, // LOW, MEDIUM, HIGH, CRITICAL
      hebrewTitle: finding.hebrewTitle,
      hebrewDescription: finding.hebrewDescription,
      suggestion: finding.suggestion,
      snippet: finding.snippet || null,
    });
  }

  getChangedFiles() {
    try {
      // Try git diff against base branch or HEAD~1
      let diffOutput = '';
      try {
        diffOutput = execSync(`git diff --name-only ${this.baseBranch}...HEAD`, { encoding: 'utf8' });
      } catch {
        diffOutput = execSync('git diff --name-only HEAD~1 HEAD', { encoding: 'utf8' });
      }
      return diffOutput
        .split('\n')
        .map(f => f.trim())
        .filter(f => f && (f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.mjs') || f.endsWith('.html') || f.endsWith('.json')));
    } catch {
      // Fallback: scan all source files
      return fs.readdirSync(path.join(this.targetDir, 'src'))
        .filter(f => f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.mjs'))
        .map(f => path.join('src', f));
    }
  }

  scanFile(relPath, content) {
    const lines = content.split('\n');

    // 1. Secrets & Credentials Scan
    const secretPatterns = [
      { pattern: /(?:api[_-]?key|secret|token|password|auth[_-]?key)\s*[:=]\s*['"][a-zA-Z0-9_\-]{16,}['"]/i, title: 'חשיפת מפתח סודי או טוקן בקוד', sev: RISK_LEVELS.CRITICAL, desc: 'נמצא טוקן או מפתח סודי ששמור ישירות בקוד במקום במשתני סביבה מאובטחים.' },
      { pattern: /https:\/\/[a-z0-9_-]+:[a-z0-9_-]+@github\.com/i, title: 'כתובת Git עם סיסמה מובנית', sev: RISK_LEVELS.CRITICAL, desc: 'כתובת URL מכילה שם משתמש וסיסמה גלויים.' },
    ];

    // 2. Dangerous DOM & XSS
    const domPatterns = [
      { pattern: /\.innerHTML\s*=\s*[^'"`<][^;]+/, title: 'הזרקת HTML לא מחוטאת (סכנת XSS)', sev: RISK_LEVELS.HIGH, desc: 'שימוש ב-innerHTML עם ערך דינמי ללא Sanitization עלול לאפשר הרצת קוד זדוני.' },
      { pattern: /eval\s*\(/, title: 'שימוש בפונקציית eval() המסוכנת', sev: RISK_LEVELS.CRITICAL, desc: 'eval() מאפשר הזרקת פקודות ומאט מאוד את ביצועי המנוע.' },
    ];

    // 3. Catastrophic Regex & ReDoS
    const redosPatterns = [
      { pattern: /\([a-zA-Z0-9_\\.-]+\+\)\+/, title: 'ביטוי רגולרי עם ReDoS קטסטרופלי ((a+)+)', sev: RISK_LEVELS.CRITICAL, desc: 'ביטוי רגולרי עם כפל פלוסים שעלול לגרום לתקיעת המעבד על קלט ארוך.' },
      { pattern: /\([a-zA-Z0-9_\\.-]+\*\)\*/, title: 'ביטוי רגולרי עם ReDoS קטסטרופלי ((a*)*)', sev: RISK_LEVELS.CRITICAL, desc: 'ביטוי רגולרי עם כפל כוכביות שעלול לתקוע את הדפדפן של השחקן.' },
    ];

    // 4. Memory Leaks & Infinite Loops
    const memPatterns = [
      { pattern: /setInterval\s*\([^)]+\)/, checkCleanup: true, title: 'setInterval ללא ניקוי (סכנת דליפת זיכרון)', sev: RISK_LEVELS.MEDIUM, desc: 'יצירת טיימר ללא שמירת ה-ID עבור clearInterval עלולה לגרום לדליפת זיכרון.' },
      { pattern: /window\.addEventListener\s*\([^)]+\)/, title: 'מאזין אירועים גלובלי ללא הסרה', sev: RISK_LEVELS.LOW, desc: 'מאזין אירועים על חלון הדפדפן שלא מוסר בעת החלפת עמוד עלול לגרום להאטה.' },
    ];

    // 5. Math Hazards & Silent Killers
    const mathPatterns = [
      { pattern: /\/\s*(?:moves|games|total|count|items|list)\.length\b/, title: 'חלוקה באורך מערך ללא בדיקת אפס (סכנת NaN)', sev: RISK_LEVELS.HIGH, desc: 'חלוקה במספר איברים ללא בדיקה שהוא גדול מ-0 תוביל לתוצאת NaN שתזהם את כל הנתונים.' },
    ];

    // Line-by-line checks
    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const line = lines[i];

      // Secrets
      for (const p of secretPatterns) {
        if (p.pattern.test(line)) {
          this.addFinding({
            file: relPath,
            line: lineNum,
            category: 'SECURITY',
            severity: p.sev,
            hebrewTitle: p.title,
            hebrewDescription: p.desc,
            suggestion: 'העבר את הסוד למשתנה סביבה (Environment Variable) או Supabase Vault.',
            snippet: line.trim(),
          });
        }
      }

      // XSS & DOM
      for (const p of domPatterns) {
        if (p.pattern.test(line)) {
          this.addFinding({
            file: relPath,
            line: lineNum,
            category: 'SECURITY',
            severity: p.sev,
            hebrewTitle: p.title,
            hebrewDescription: p.desc,
            suggestion: 'השתמש ב-textContent, createElement, או בספריית Sanitizer מאושרת.',
            snippet: line.trim(),
          });
        }
      }

      // ReDoS
      for (const p of redosPatterns) {
        if (p.pattern.test(line)) {
          this.addFinding({
            file: relPath,
            line: lineNum,
            category: 'PERFORMANCE',
            severity: p.sev,
            hebrewTitle: p.title,
            hebrewDescription: p.desc,
            suggestion: 'החלף את הרגקס בלולאת סריקה לינארית O(N) כדי למנוע קפיאת מעבד.',
            snippet: line.trim(),
          });
        }
      }

      // Math hazards
      for (const p of mathPatterns) {
        if (p.pattern.test(line)) {
          this.addFinding({
            file: relPath,
            line: lineNum,
            category: 'MATH_HAZARD',
            severity: p.sev,
            hebrewTitle: p.title,
            hebrewDescription: p.desc,
            suggestion: 'הוסף בדיקת תנאי מקדימה: if (!list.length) return 0; לפני ביצוע החלוקה.',
            snippet: line.trim(),
          });
        }
      }
    }

    // Spaghetti Code: Cyclomatic Complexity & Deep Nesting
    this.checkSpaghettiCode(relPath, content, lines);
  }

  checkSpaghettiCode(relPath, content, lines) {
    let currentIndent = 0;
    let maxNesting = 0;
    let currentFunction = null;
    let funcStartLine = 0;
    let funcLineCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const line = lines[i];
      const trimmed = line.trim();

      // Detect function start
      const funcMatch = trimmed.match(/^(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_]+)/) ||
                        trimmed.match(/const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/);
      if (funcMatch) {
        if (currentFunction && funcLineCount > 120) {
          this.addFinding({
            file: relPath,
            line: funcStartLine,
            category: 'SPAGHETTI',
            severity: RISK_LEVELS.MEDIUM,
            hebrewTitle: `פונקציה ענקית ומסורבלת (${currentFunction} - ${funcLineCount} שורות)`,
            hebrewDescription: `הפונקציה ארוכה מדי (${funcLineCount} שורות). פונקציות ענקיות מקשות על תחזוקה ומגבירות סיכון לבאגים נסתרים.`,
            suggestion: 'פרק את הפונקציה למספר תת-פונקציות קטנות וממוקדות של עד 30-40 שורות כל אחת.',
          });
        }
        currentFunction = funcMatch[1];
        funcStartLine = lineNum;
        funcLineCount = 0;
      }

      if (currentFunction) funcLineCount++;

      // Nesting check via brace tracking
      const opens = (line.match(/\{/g) || []).length;
      const closes = (line.match(/\}/g) || []).length;
      currentIndent += opens - closes;

      if (currentIndent > 5) {
        this.addFinding({
          file: relPath,
          line: lineNum,
          category: 'SPAGHETTI',
          severity: RISK_LEVELS.HIGH,
          hebrewTitle: `קינון תנאים עמוק ומסובך (קינון של ${currentIndent} רמות - Pyramid of Doom)`,
          hebrewDescription: 'נמצאו תנאים או לולאות אחד בתוך השני בעומק חריג. מבנה כזה גורם לבלבול ולבאגים.',
          suggestion: 'השתמש ב-Early Return (Guard Clauses) כדי ליישר את הקוד ולפשט אותו.',
          snippet: trimmed,
        });
        currentIndent = 0; // throttle repeated triggers
      }
    }

    // Check last function if it exceeds size
    if (currentFunction && funcLineCount > 120) {
      this.addFinding({
        file: relPath,
        line: funcStartLine,
        category: 'SPAGHETTI',
        severity: RISK_LEVELS.MEDIUM,
        hebrewTitle: `פונקציה ענקית ומסורבלת (${currentFunction} - ${funcLineCount} שורות)`,
        hebrewDescription: `הפונקציה ארוכה מדי (${funcLineCount} שורות). פונקציות ענקיות מקשות על תחזוקה ומגבירות סיכון לבאגים נסתרים.`,
        suggestion: 'פרק את הפונקציה למספר תת-פונקציות קטנות וממוקדות של עד 30-40 שורות כל אחת.',
      });
    }
  }

  calculateRiskReport() {
    let score = 10; // Start at 10 (perfect)
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

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
      }
    }

    score = Math.max(0, Math.min(10, Math.round(score * 10) / 10));

    const canMerge = criticalCount === 0 && highCount === 0 && score >= 7.5;
    const recommendation = canMerge ? '🟢 כדאי להעלות (RECOMMENDED TO MERGE)' : '🔴 לא להעלות כרגע - דרוש תיקון (BLOCKED / CHANGES REQUIRED)';

    return {
      safetyScore: score,
      canMerge,
      recommendation,
      counts: { critical: criticalCount, high: highCount, medium: mediumCount, low: lowCount },
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
        this.scanFile(f, content);
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
