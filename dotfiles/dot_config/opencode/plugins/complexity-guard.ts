import { Plugin } from "@opencode-ai/plugin";
import { readFile } from "node:fs/promises";

// complexity-guard: enforces a cyclomatic complexity ceiling on code the model
// writes. After every `write`/`edit` tool call, the edited file is scanned and
// any function above MAX_COMPLEXITY is appended to the tool result as a
// violation — so the model sees it and must split the function.
//
// Zero dependencies. Token-based counter (comments/strings stripped); covers
// C-family (JS/TS, Go, Rust, C/C++, Java, C#), Python, and Perl. It is a
// heuristic, not a full parser — deliberate trade-off for a guardrail.
//
// ponytail: hand-rolled lexer, threshold hardcoded at 10. If miscounts get
// noisy, swap analyze() for native linters (eslint `complexity` rule, ruff
// C901, gocyclo, Perl::Critic) behind the same execute.after hook.

const MAX_COMPLEXITY = 10;

const C_FAMILY = new Set([
  "js", "mjs", "cjs", "jsx", "ts", "tsx", "mts", "cts",
  "go", "rs", "java", "c", "h", "cpp", "hpp", "cc", "hh", "cs",
]);
const ARROW_LANGS = new Set(["js", "mjs", "cjs", "jsx", "ts", "tsx", "mts", "cts"]);
const PERL = new Set(["pl", "pm", "perl"]);

interface LangConfig {
  arrows: boolean; // `=> {` opens a function body (JS-family)
  hashComments: boolean; // `#` to end of line
  subKeyword: boolean; // `sub [name] {` opens a function body (Perl)
  control: Set<string>; // keywords whose `(...)` is a control header, not a call
  decisions: Set<string>; // keywords that add +1
}

const C_CONFIG: LangConfig = {
  arrows: false,
  hashComments: false,
  subKeyword: false,
  control: new Set(["if", "for", "while", "switch", "catch", "do", "try", "else", "finally", "select"]),
  decisions: new Set(["if", "for", "while", "case", "catch", "match"]),
};

const JS_CONFIG: LangConfig = { ...C_CONFIG, arrows: true };

const PERL_CONFIG: LangConfig = {
  arrows: false, // `=>` is the fat comma in Perl
  hashComments: true,
  subKeyword: true,
  control: new Set(["if", "unless", "while", "until", "for", "foreach"]),
  decisions: new Set(["if", "elsif", "unless", "until", "while", "for", "foreach", "when", "and", "or"]),
};

export interface Violation {
  line: number;
  name: string;
  complexity: number;
}

// --- C-family ---------------------------------------------------------------

/** Blank out comments and string/template text (preserves offsets/newlines). */
export function stripNoise(src: string, hashComments = false): string {
  const out = src.split("");
  const n = src.length;
  let i = 0;
  let depth = 0;
  const tplReturn: number[] = []; // brace depths at which each ${...} entered code
  const blank = (j: number) => { if (out[j] !== "\n") out[j] = " "; };
  // blank template text until ` (end) or ${ (back to code); returns true if ${ hit
  const blankTemplate = (): boolean => {
    while (i < n && src[i] !== "`") {
      if (src[i] === "\\") { blank(i); i++; if (i < n) blank(i); i++; continue; }
      if (src[i] === "$" && src[i + 1] === "{") { tplReturn.push(depth); i += 2; return true; }
      blank(i++);
    }
    if (i < n && src[i] === "`") blank(i++);
    return false;
  };
  while (i < n) {
    const c2 = src.slice(i, i + 2);
    if (c2 === "//" || (hashComments && src[i] === "#")) { while (i < n && src[i] !== "\n") blank(i++); continue; }
    if (c2 === "/*") {
      blank(i); blank(i + 1); i += 2;
      while (i < n && src.slice(i, i + 2) !== "*/") blank(i++);
      if (i < n) { blank(i); blank(i + 1); i += 2; }
      continue;
    }
    const c = src[i];
    if (c === "/") {
      // regex literal vs division: regex if previous significant char is not
      // an identifier/number/closer (regex-literal lookahead, ponytail heuristic)
      let j = i - 1;
      let prev = "";
      while (j >= 0) { const ch = out[j]; if (ch !== " ") { prev = ch; break; } j--; }
      let isRegex = !prev || "(,=:[!&|?{};+-*%~^<>".includes(prev) || prev === "\n";
      if (/[A-Za-z]/.test(prev)) {
        // Perl match/subst operators: m// s/// qr// tr/// y/// q qq qw
        let wordEnd = j;
        while (j >= 0 && /[A-Za-z]/.test(out[j])) j--;
        const word = out.slice(j + 1, wordEnd + 1).join("");
        if (["m", "s", "qr", "tr", "y", "q", "qq", "qw"].includes(word)) isRegex = true;
      }
      if (!isRegex) { i++; continue; }
      blank(i++);
      let inClass = false;
      while (i < n && src[i] !== "\n") {
        if (src[i] === "\\") { blank(i); i++; if (i < n) blank(i); i++; continue; }
        if (src[i] === "[") inClass = true;
        else if (src[i] === "]") inClass = false;
        else if (src[i] === "/" && !inClass) { blank(i++); break; }
        blank(i++);
      }
      while (i < n && /[a-z]/.test(src[i])) blank(i++); // flags
      continue;
    }
    if (c === '"' || c === "'") {
      const q = c;
      blank(i++);
      while (i < n && src[i] !== q) {
        if (src[i] === "\\") { blank(i); i++; if (i < n) blank(i); } else blank(i);
        i++;
      }
      if (i < n) blank(i++);
      continue;
    }
    if (c === "`") { blank(i++); blankTemplate(); continue; }
    if (c === "{") { depth++; i++; continue; }
    if (c === "}") {
      if (tplReturn.length && depth === tplReturn[tplReturn.length - 1]) {
        tplReturn.pop();
        i++;
        blankTemplate();
        continue;
      }
      depth = Math.max(0, depth - 1);
      i++;
      continue;
    }
    i++;
  }
  return out.join("");
}

function tokenize(src: string): Array<{ t: string; off: number }> {
  const tokens: Array<{ t: string; off: number }> = [];
  const re = /[A-Za-z_$][A-Za-z0-9_$]*|[{}()]|&&|\|\||=>|\?\.|\?\?|\?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) tokens.push({ t: m[0], off: m.index });
  return tokens;
}

function lineOf(src: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset; i++) if (src[i] === "\n") line++;
  return line;
}

function analyzeCFamily(src: string, max: number, cfg: LangConfig): Violation[] {
  const tokens = tokenize(stripNoise(src, cfg.hashComments));
  const violations: Violation[] = [];
  const fns: Array<{ depth: number; line: number; name: string; complexity: number }> = [];
  const parens: Array<{ tokenIdx: number; isControl: boolean; isFunc: boolean }> = [];
  let depth = 0;

  for (let k = 0; k < tokens.length; k++) {
    const { t, off } = tokens[k];
    if (/^[A-Za-z_$]/.test(t)) {
      if (cfg.decisions.has(t) && fns.length) fns[fns.length - 1].complexity++;
      continue;
    }
    if (t === "(") {
      let isControl = false;
      for (let j = k - 1; j >= 0; j--) {
        const p = tokens[j].t;
        if (p === ")" || p === "{" || p === "}" || p === ";") break;
        if (cfg.control.has(p)) { isControl = true; break; }
      }
      parens.push({ tokenIdx: k, isControl, isFunc: false });
      continue;
    }
    if (t === ")") {
      const open = parens[parens.length - 1];
      if (open) open.isFunc = !open.isControl;
      continue;
    }
    if (t === "{") {
      depth++;
      let isFn = false;
      let name = "<anon>";
      const prev = k > 0 ? tokens[k - 1].t : "";
      if (prev === "=>") {
        isFn = cfg.arrows;
        if (cfg.arrows) {
          // name from `const name = () =>` / `name: () =>` / `foo(() =>` — first
          // identifier walking back (`=`/`:` are not tokenized)
          for (let j = k - 2; j >= 0 && j > k - 12; j--) {
            const p = tokens[j].t;
            if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(p) && !cfg.control.has(p)) { name = p; break; }
            if (p === ";" || p === "{" || p === "}") break;
          }
        }
      } else if (prev === ")" && parens.length) {
        const open = parens.pop()!;
        if (open.isFunc) {
          isFn = true;
          const before = open.tokenIdx > 0 ? tokens[open.tokenIdx - 1].t : "";
          if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(before) && !cfg.control.has(before) &&
              before !== "function" && before !== "fn" && before !== "func") {
            name = before;
          }
        }
      } else if (cfg.subKeyword && /^[A-Za-z_$]/.test(prev) && !cfg.control.has(prev)) {
        // Perl `sub [name [: attr...]] {` — walk back over identifiers to `sub`
        let j = k - 1;
        let afterSub = "";
        while (j >= 0 && tokens[j].t !== "sub" && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(tokens[j].t)) {
          afterSub = tokens[j].t; // ends as the identifier right after `sub`
          j--;
        }
        if (j >= 0 && tokens[j].t === "sub") {
          isFn = true;
          if (afterSub) name = afterSub;
        }
      }
      if (isFn) fns.push({ depth, line: lineOf(src, off), name, complexity: 1 });
      continue;
    }
    if (t === "}") {
      const idx = fns.findIndex((f) => f.depth === depth);
      if (idx >= 0) {
        const [fn] = fns.splice(idx, 1);
        if (fn.complexity > max) violations.push({ line: fn.line, name: fn.name, complexity: fn.complexity });
      }
      depth = Math.max(0, depth - 1);
      continue;
    }
    if ((t === "&&" || t === "||" || t === "?") && fns.length) fns[fns.length - 1].complexity++;
  }
  return violations;
}

// --- Python -----------------------------------------------------------------

function analyzePython(src: string, max: number): Violation[] {
  const violations: Violation[] = [];
  const stack: Array<{ line: number; name: string; complexity: number; indent: number }> = [];
  src.split("\n").forEach((raw, idx) => {
    const line = raw.replace(/#.*$/, "");
    const trimmed = line.trim();
    if (trimmed === "") return;
    const indent = line.length - line.trimStart().length;
    const def = trimmed.match(/^(?:async\s+)?def\s+([A-Za-z0-9_]+)/);
    if (def) {
      stack.push({ line: idx + 1, name: def[1], complexity: 1, indent });
      return;
    }
    while (stack.length && indent <= stack[stack.length - 1].indent) {
      const fn = stack.pop()!;
      if (fn.complexity > max) violations.push({ line: fn.line, name: fn.name, complexity: fn.complexity });
    }
    const fn = stack[stack.length - 1];
    if (!fn) return;
    const count = (re: RegExp) => (trimmed.match(re) ?? []).length;
    fn.complexity += count(/\bif\b/) + count(/\belif\b/) + count(/\bfor\b/) + count(/\bwhile\b/) +
      count(/\bexcept\b/) + count(/\bcase\b/) + count(/\band\b/) + count(/\bor\b/);
  });
  for (const fn of stack) if (fn.complexity > max) violations.push({ line: fn.line, name: fn.name, complexity: fn.complexity });
  return violations;
}

// --- Entry -------------------------------------------------------------------

export function analyze(path: string, src: string, max = MAX_COMPLEXITY): Violation[] {
  const ext = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
  if (ext === "py") return analyzePython(src, max);
  if (PERL.has(ext)) return analyzeCFamily(src, max, PERL_CONFIG);
  if (C_FAMILY.has(ext)) return analyzeCFamily(src, max, ARROW_LANGS.has(ext) ? JS_CONFIG : C_CONFIG);
  return [];
}

function isTarget(path: string): boolean {
  if (/node_modules|\/\.|\.min\./.test(path)) return false;
  const ext = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
  return ext === "py" || PERL.has(ext) || C_FAMILY.has(ext);
}

function format(path: string, vs: Violation[], prev: string): string {
  const lines = vs
    .sort((a, b) => b.complexity - a.complexity)
    .map((v) => `  - ${v.name} (line ${v.line}): complexity ${v.complexity} > ${MAX_COMPLEXITY}`);
  const report =
    `[complexity-guard] CYCLOMATIC COMPLEXITY VIOLATION — fix before finishing.\n` +
    `${path}:\n${lines.join("\n")}\n` +
    `Split the function(s) into smaller helpers until every function is <= ${MAX_COMPLEXITY}.`;
  return prev ? `${prev}\n\n${report}` : report;
}

async function checkEditedFile(input: unknown, result: { content?: unknown }): Promise<string | null> {
  const path = editedPath(input);
  if (!path || !isTarget(path)) return null;
  const src = await readFile(path, "utf8").catch(() => null);
  if (!src || src.length > 1_000_000) return null;
  const violations = analyze(path, src);
  if (!violations.length) return null;
  const prev = typeof result.content === "string" ? result.content : "";
  return format(path, violations, prev);
}

function editedPath(input: unknown): string | undefined {
  const rec = (input ?? {}) as Record<string, unknown>;
  const filePath = (rec.filePath ?? rec.file_path ?? rec.path) as string | undefined;
  return typeof filePath === "string" ? filePath : undefined;
}

export default Plugin.define({
  id: "local.complexity-guard",
  setup: async (ctx) => {
    await ctx.tool.hook("execute.after", async (event) => {
      if (event.status !== "completed") return;
      const tool = event.tool.toLowerCase();
      if (tool !== "write" && tool !== "edit") return;
      const report = await checkEditedFile(event.input, event.result);
      if (!report) return;
      event.result = { ...event.result, content: report };
    });
  },
});
