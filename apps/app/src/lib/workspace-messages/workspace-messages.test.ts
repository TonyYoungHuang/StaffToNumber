import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { SUPPORTED_LOCALES } from "@score/i18n";
import { buildSupportTemplates } from "../support";
import { getWorkspaceMessages, WORKSPACE_MESSAGE_CATALOGS } from "./index";

function leafKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object") return [prefix];
  return Object.entries(value).flatMap(([key, nested]) => leafKeys(nested, prefix ? `${prefix}.${key}` : key));
}

function leafStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  return Object.values(value).flatMap(leafStrings);
}

test("workspace catalogs cover identical non-empty keys in all nine locales", () => {
  assert.deepEqual(Object.keys(WORKSPACE_MESSAGE_CATALOGS), [...SUPPORTED_LOCALES]);
  const englishKeys = leafKeys(WORKSPACE_MESSAGE_CATALOGS.en).sort();

  for (const locale of SUPPORTED_LOCALES) {
    const catalog = getWorkspaceMessages(locale);
    assert.deepEqual(leafKeys(catalog).sort(), englishKeys, `${locale} workspace keys`);
    for (const message of leafStrings(catalog)) {
      assert.ok(message.trim().length > 0, `${locale} has an empty workspace message`);
    }
    assert.match(catalog.jobs.createdJob, /\{id\}/u, `${locale} created-job template`);
    assert.match(catalog.uploads.uploaded, /\{name\}/u, `${locale} upload template`);
  }
});

test("dashboard, operations, jobs, upload, validation, status, and ARIA copy is localized", () => {
  assert.equal(getWorkspaceMessages("zh-TW").dashboard.privacy.statusAria, "帳戶資料請求狀態");
  assert.equal(getWorkspaceMessages("ja").jobs.statuses.processing, "処理中");
  assert.equal(getWorkspaceMessages("ko").uploads.upload.uploadButton, "PDF 업로드");
  assert.equal(getWorkspaceMessages("fr").operations.statuses.disabled, "Désactivé");
  assert.equal(getWorkspaceMessages("es").pages.jobs.eyebrow, "Espacio de conversión");
  assert.equal(getWorkspaceMessages("de").dashboard.statuses.expired, "Abgelaufen");
  assert.equal(getWorkspaceMessages("ru").jobs.resultKinds.draft, "Черновик");

  const english = getWorkspaceMessages("en");
  for (const locale of SUPPORTED_LOCALES.filter((item) => item !== "en")) {
    const catalog = getWorkspaceMessages(locale);
    assert.notEqual(catalog.pages.dashboard.title, english.pages.dashboard.title, `${locale} dashboard title`);
    assert.notEqual(catalog.dashboard.loadingTitle, english.dashboard.loadingTitle, `${locale} loading state`);
    assert.notEqual(catalog.operations.operations.servicesAria, english.operations.operations.servicesAria, `${locale} operations ARIA`);
    assert.notEqual(catalog.jobs.monitor.empty, english.jobs.monitor.empty, `${locale} job empty state`);
    assert.notEqual(catalog.uploads.chooseFile, english.uploads.chooseFile, `${locale} upload validation`);
  }
});

test("workspace fixed statuses and service registries have localized safe mappings", () => {
  const english = getWorkspaceMessages("en");
  assert.deepEqual(Object.keys(english.dashboard.statuses).sort(), ["active", "expired", "inactive"]);
  assert.deepEqual(Object.keys(english.operations.statuses).sort(), ["disabled", "error", "ok", "warning"]);
  assert.deepEqual(Object.keys(english.operations.serviceLabels).sort(), ["api", "database", "email", "payment", "storage", "unknown", "worker"]);
  assert.deepEqual(Object.keys(english.jobs.statuses).sort(), ["completed", "failed", "processing", "queued"]);
  assert.deepEqual(Object.keys(english.jobs.resultKinds).sort(), ["draft", "final", "none"]);
  assert.deepEqual(Object.keys(english.jobs.phases).sort(), ["completed", "running", "waiting"]);
  assert.deepEqual(Object.keys(english.uploads.fileKinds).sort(), ["input_pdf", "unknown"]);
});

test("workspace clients receive only server-selected copy and preserve raw backend failures", () => {
  const dashboard = readFileSync(new URL("../../components/DashboardClient.tsx", import.meta.url), "utf8");
  const banner = readFileSync(new URL("../../components/DashboardBannerActions.tsx", import.meta.url), "utf8");
  const jobs = readFileSync(new URL("../../components/JobsManager.tsx", import.meta.url), "utf8");
  const operations = readFileSync(new URL("../../components/OperationsPanel.tsx", import.meta.url), "utf8");
  const uploads = readFileSync(new URL("../../components/UploadManager.tsx", import.meta.url), "utf8");
  const dashboardPage = readFileSync(new URL("../../app/dashboard/page.tsx", import.meta.url), "utf8");
  const jobsPage = readFileSync(new URL("../../app/jobs/page.tsx", import.meta.url), "utf8");

  for (const source of [dashboard, banner, jobs, operations, uploads]) {
    assert.doesNotMatch(source, /from\s+["']\.\.\/lib\/workspace-messages["']/u);
    assert.doesNotMatch(source, /locale\s*[!=]==?\s*["']zh-CN["']/u);
  }
  assert.match(dashboard, /import type \{ WorkspaceMessages \}/u);
  assert.match(jobs, /copy: WorkspaceMessages\["jobs"\]/u);
  assert.match(uploads, /copy: WorkspaceMessages\["uploads"\]/u);
  assert.match(dashboardPage, /getWorkspaceMessages\(locale\)/u);
  assert.match(jobsPage, /<JobsManager copy=\{messages\.jobs\}/u);

  assert.match(dashboard, /setError\(result\.error\)/u);
  assert.match(dashboard, /setPrivacyMessage\(result\.error\)/u);
  assert.match(dashboard, /payload\?\.error \?\? copy\.privacy\.exportFailed/u);
  assert.match(operations, /setError\(result\.error\)/u);
  assert.match(operations, /\{service\.message\}/u);
  assert.match(jobs, /setStatus\(filesResult\.error\)/u);
  assert.match(jobs, /setStatus\(jobsResult\.error\)/u);
  assert.match(jobs, /\{job\.errorMessage\}/u);
  assert.match(uploads, /setStatus\(result\.error\)/u);
  assert.match(uploads, /setStatus\(nextError\)/u);
  assert.doesNotMatch(uploads, /userFacingError/u);
});

test("changing the UI locale never gates activation-code entry points", () => {
  const dashboard = readFileSync(new URL("../../components/DashboardClient.tsx", import.meta.url), "utf8");
  const dashboardPage = readFileSync(new URL("../../app/dashboard/page.tsx", import.meta.url), "utf8");
  const appChrome = readFileSync(new URL("../../components/AppChrome.tsx", import.meta.url), "utf8");

  assert.match(dashboardPage, /setupHref=\{APP_ROUTES\.activate\}/u);
  assert.doesNotMatch(dashboardPage, /showActivationLink/u);
  assert.match(dashboard, /<Link href=\{APP_ROUTES\.activate\} className="button button-tertiary">/u);
  assert.doesNotMatch(dashboard, /showActivationLink/u);
  assert.match(appChrome, /\{ href: APP_ROUTES\.activate, label: copy\.activate \}/u);

  for (const [name, source] of [["dashboard page", dashboardPage], ["dashboard client", dashboard], ["app chrome", appChrome]] as const) {
    assert.doesNotMatch(source, /locale\s*===\s*["']zh-CN["'][\s\S]{0,120}APP_ROUTES\.activate/u, `${name} gates activation by locale`);
  }
});

test("support route templates keep typed keys and hand off the selected locale without duplicate display copy", () => {
  const templates = buildSupportTemplates("ja");
  const support = readFileSync(new URL("../support.ts", import.meta.url), "utf8");
  const operations = readFileSync(new URL("../../components/OperationsPanel.tsx", import.meta.url), "utf8");
  const trial = readFileSync(new URL("../../components/TrialScorePreview.tsx", import.meta.url), "utf8");

  assert.deepEqual(templates.map((template) => template.key), ["payment", "activation", "job", "privacy"]);
  for (const template of templates) {
    const href = new URL(template.href);
    assert.equal(href.pathname, "/api/locale");
    assert.equal(href.searchParams.get("locale"), "ja");
    assert.equal(href.searchParams.get("next"), `/support?category=${template.key}&source=app`);
  }
  assert.doesNotMatch(support, /title:\s*["']/u);
  assert.doesNotMatch(support, /description:\s*["']/u);
  assert.match(support, /buildSupportTemplates\(locale: SupportedLocale\)/u);
  assert.match(operations, /buildSupportTemplates\(locale\)/u);
  assert.match(trial, /buildSupportTemplates\(locale\)/u);
});

test("workspace endpoints, payloads, polling, upload limits, and Intl formatting stay intact", () => {
  const dashboard = readFileSync(new URL("../../components/DashboardClient.tsx", import.meta.url), "utf8");
  const jobs = readFileSync(new URL("../../components/JobsManager.tsx", import.meta.url), "utf8");
  const operations = readFileSync(new URL("../../components/OperationsPanel.tsx", import.meta.url), "utf8");
  const uploads = readFileSync(new URL("../../components/UploadManager.tsx", import.meta.url), "utf8");

  for (const endpoint of ["/api/auth/me", "/api/account/data-export", "/api/account/deletion", "/api/account/deletion/cancel"]) {
    assert.ok(dashboard.includes(endpoint), `missing dashboard endpoint ${endpoint}`);
  }
  assert.match(dashboard, /JSON\.stringify\(\{ password: privacyPassword, confirmation: deletionConfirmation \}\)/u);
  assert.match(dashboard, /JSON\.stringify\(\{ password: privacyPassword \}\)/u);
  assert.ok(operations.includes("/api/system/status"));
  assert.ok(jobs.includes("/api/files"));
  assert.ok(jobs.includes("/api/jobs"));
  assert.match(jobs, /JSON\.stringify\(\{ inputFileId: selectedFileId, direction \}\)/u);
  assert.match(jobs, /3000\);/u);
  assert.ok(uploads.includes("/api/files/upload"));
  assert.match(uploads, /formData\.append\("file", selectedFile\)/u);
  assert.match(uploads, /accept="application\/pdf,\.pdf"/u);

  for (const source of [dashboard, jobs, operations, uploads]) {
    assert.doesNotMatch(source, /\.toLocaleString\(/u);
    assert.doesNotMatch(source, /\.toFixed\(/u);
  }
  assert.match(dashboard, /formatDateTime/u);
  assert.match(jobs, /formatDateTime/u);
  assert.match(jobs, /formatNumber/u);
  assert.match(operations, /formatDateTime/u);
  assert.match(uploads, /formatDateTime/u);
  assert.match(uploads, /formatNumber/u);
});

test("workspace localization files remain source-only extensionless imports", () => {
  const sourceFiles = [
    ...readdirSync(new URL(".", import.meta.url), { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => new URL(entry.name, import.meta.url)),
    ...readdirSync(new URL("./locales/", import.meta.url), { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => new URL(`./locales/${entry.name}`, import.meta.url)),
  ];
  for (const file of sourceFiles) {
    assert.doesNotMatch(file.pathname, /\.(?:js|d\.ts)$/u, file.pathname);
    assert.doesNotMatch(readFileSync(file, "utf8"), /from\s+["'][^"']+\.js["']/u, file.pathname);
  }
});
