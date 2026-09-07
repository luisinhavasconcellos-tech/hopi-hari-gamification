#!/usr/bin/env node
/**
 * Fails when tracked files contain credential-looking strings.
 *
 * Usage: node scripts/check-secrets.mjs [--staged] [file ...]
 * Scans tracked + untracked (not ignored) files from the repository root, the
 * staged diff with --staged, or only the given paths.
 * Public Supabase anon/publishable keys are allowed; service-role JWTs and
 * everything else below are not. A line containing `check-secrets: allow`
 * (placeholders in docs/tests) is skipped.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
const args = process.argv.slice(2);
const staged = args.includes("--staged");
const explicit = args.filter(arg => !arg.startsWith("--")).map(arg => path.relative(root, path.resolve(arg)));
const list = staged
  ? "git diff --cached --name-only --diff-filter=ACMR"
  : "git ls-files --cached --others --exclude-standard";
const files = explicit.length
  ? explicit
  : execSync(list, { cwd: root, encoding: "utf8" }).split("\n").filter(Boolean);

const SKIP = /(^|\/)(node_modules|dist|\.pnpm-store)\/|\.(png|jpg|jpeg|webp|gif|ico|woff2?|ttf|zip|pdf|xlsx|lock|lockb)$|pnpm-lock\.yaml$|package-lock\.json$|scripts\/check-secrets\.mjs$/;

const PATTERNS = [
  { name: "Google API key", re: /AIza[0-9A-Za-z_-]{35}/g },
  { name: "Google OAuth client secret", re: /GOCSPX-[0-9A-Za-z_-]{20,}/g },
  { name: "Private key block", re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g },
  { name: "Database URL with password", re: /\b(?:mysql|postgres(?:ql)?|mongodb(?:\+srv)?|redis):\/\/[^\s:/@"']+:[^\s@"']+@/gi },
  { name: "AWS access key id", re: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: "Slack token", re: /\bxox[abpr]-[0-9A-Za-z-]{10,}/g },
  { name: "GitHub token", re: /\bgh[pousr]_[0-9A-Za-z]{30,}\b/g },
  { name: "OpenAI-style secret", re: /\bsk-(?:proj-)?[0-9A-Za-z_-]{20,}\b/g },
  { name: "Supabase secret key", re: /\bsb_secret_[0-9A-Za-z_-]{10,}/g },
  { name: "Manus artifact token", re: /\bart_v2_[0-9A-Za-z_?=&.-]{20,}/g },
];

const JWT = /\beyJ[0-9A-Za-z_-]{10,}\.([0-9A-Za-z_-]{10,})\.[0-9A-Za-z_-]{10,}\b/g;

function decodeJwtPayload(segment) {
  try {
    return JSON.parse(Buffer.from(segment.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
  } catch {
    return null;
  }
}

const findings = [];
for (const file of files) {
  if (SKIP.test(file)) continue;
  let text;
  try {
    text = readFileSync(path.join(root, file), "utf8");
  } catch {
    continue;
  }
  if (text.includes("\u0000")) continue; // binary

  const lines = text.split("\n");
  lines.forEach((line, index) => {
    if (line.includes("check-secrets: allow")) return;
    for (const { name, re } of PATTERNS) {
      re.lastIndex = 0;
      if (re.test(line)) findings.push({ file, line: index + 1, name });
    }
    JWT.lastIndex = 0;
    let match;
    while ((match = JWT.exec(line))) {
      const payload = decodeJwtPayload(match[1]);
      const role = payload?.role;
      if (role && role !== "anon") findings.push({ file, line: index + 1, name: `JWT with role "${role}"` });
    }
  });
}

if (findings.length) {
  console.error("Potential secrets found:");
  for (const f of findings) console.error(`  ${f.file}:${f.line}  ${f.name}`);
  console.error("\nRemove the value, move it to an environment variable and rotate the credential.");
  process.exit(1);
}
console.log(`check-secrets: ${files.length} files scanned, no secrets found.`);
