import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const DEFAULT_DB_PATH = ".moyu/settings.sqlite";
const DEFAULT_KEY_PATH = ".moyu/settings.key";
const SECRET_ALGORITHM = "aes-256-gcm";
const SECRET_KEY_SALT = "moyu-settings-secret-v1";

export interface SqliteSettingsPaths {
  dbPath?: string;
  keyPath?: string;
}

export interface StoredProvider {
  id: string;
  name: string;
  type: string;
  baseUrl: string;
  defaultFor: string[];
  models: string[];
  chatModels: string[];
  imageModels: string[];
  secretConfigured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StoredModelRole {
  id: string;
  providerId: string;
  model: string;
  fallbackModel: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertProviderInput {
  id: string;
  name: string;
  type?: string;
  baseUrl: string;
  defaultFor?: string[];
  models?: string[];
  chatModels?: string[];
  imageModels?: string[];
  apiKey?: string;
}

export interface UpsertModelRoleInput {
  id: string;
  providerId: string;
  model: string;
  fallbackModel?: string | null;
}

export async function ensureSettingsStore(input: SqliteSettingsPaths = {}) {
  const dbPath = resolveDbPath(input.dbPath);
  await mkdir(path.dirname(dbPath), { recursive: true });
  await runSql(dbPath, [
    "PRAGMA journal_mode=WAL;",
    "CREATE TABLE IF NOT EXISTS providers (",
    "  id TEXT PRIMARY KEY,",
    "  name TEXT NOT NULL,",
    "  type TEXT NOT NULL,",
    "  base_url TEXT NOT NULL,",
    "  default_for_json TEXT NOT NULL,",
    "  models_json TEXT NOT NULL,",
    "  chat_models_json TEXT NOT NULL,",
    "  image_models_json TEXT NOT NULL,",
    "  created_at TEXT NOT NULL,",
    "  updated_at TEXT NOT NULL",
    ");",
    "CREATE TABLE IF NOT EXISTS model_roles (",
    "  id TEXT PRIMARY KEY,",
    "  provider_id TEXT NOT NULL,",
    "  model TEXT NOT NULL,",
    "  fallback_model TEXT,",
    "  created_at TEXT NOT NULL,",
    "  updated_at TEXT NOT NULL,",
    "  FOREIGN KEY(provider_id) REFERENCES providers(id)",
    ");",
    "CREATE TABLE IF NOT EXISTS secrets (",
    "  id TEXT PRIMARY KEY,",
    "  provider_id TEXT NOT NULL,",
    "  kind TEXT NOT NULL,",
    "  algorithm TEXT NOT NULL,",
    "  iv TEXT NOT NULL,",
    "  auth_tag TEXT NOT NULL,",
    "  ciphertext TEXT NOT NULL,",
    "  created_at TEXT NOT NULL,",
    "  updated_at TEXT NOT NULL,",
    "  FOREIGN KEY(provider_id) REFERENCES providers(id)",
    ");",
  ].join("\n"));
  return dbPath;
}

export async function upsertProvider(input: UpsertProviderInput, paths: SqliteSettingsPaths = {}) {
  const dbPath = await ensureSettingsStore(paths);
  const now = new Date().toISOString();
  const current = await getProvider(input.id, paths);
  await runSql(
    dbPath,
    formatSql(
      [
        "INSERT INTO providers (id, name, type, base_url, default_for_json, models_json, chat_models_json, image_models_json, created_at, updated_at)",
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        "ON CONFLICT(id) DO UPDATE SET",
        "  name = excluded.name,",
        "  type = excluded.type,",
        "  base_url = excluded.base_url,",
        "  default_for_json = excluded.default_for_json,",
        "  models_json = excluded.models_json,",
        "  chat_models_json = excluded.chat_models_json,",
        "  image_models_json = excluded.image_models_json,",
        "  updated_at = excluded.updated_at;",
      ].join("\n"),
      input.id,
      input.name,
      input.type || "openai-compatible",
      input.baseUrl,
      JSON.stringify(input.defaultFor || current?.defaultFor || []),
      JSON.stringify(input.models || current?.models || []),
      JSON.stringify(input.chatModels || current?.chatModels || []),
      JSON.stringify(input.imageModels || current?.imageModels || []),
      current?.createdAt || now,
      now,
    ),
  );
  if (input.apiKey) {
    await setProviderApiKey(input.id, input.apiKey, paths);
  }
}

export async function upsertModelRole(input: UpsertModelRoleInput, paths: SqliteSettingsPaths = {}) {
  const dbPath = await ensureSettingsStore(paths);
  const now = new Date().toISOString();
  const current = await getModelRole(input.id, paths);
  await runSql(
    dbPath,
    formatSql(
      [
        "INSERT INTO model_roles (id, provider_id, model, fallback_model, created_at, updated_at)",
        "VALUES (?, ?, ?, ?, ?, ?)",
        "ON CONFLICT(id) DO UPDATE SET",
        "  provider_id = excluded.provider_id,",
        "  model = excluded.model,",
        "  fallback_model = excluded.fallback_model,",
        "  updated_at = excluded.updated_at;",
      ].join("\n"),
      input.id,
      input.providerId,
      input.model,
      input.fallbackModel || null,
      current?.createdAt || now,
      now,
    ),
  );
}

export async function listProviders(paths: SqliteSettingsPaths = {}): Promise<StoredProvider[]> {
  const dbPath = await ensureSettingsStore(paths);
  const rows = await queryJson<ProviderRow>(
    dbPath,
    [
      "SELECT p.*,",
      "  CASE WHEN s.id IS NULL THEN 0 ELSE 1 END AS secret_configured",
      "FROM providers p",
      "LEFT JOIN secrets s ON s.provider_id = p.id AND s.kind = 'api_key'",
      "ORDER BY p.id;",
    ].join("\n"),
  );
  return rows.map(toStoredProvider);
}

export async function getProvider(id: string, paths: SqliteSettingsPaths = {}) {
  const providers = await listProviders(paths);
  return providers.find((provider) => provider.id === id) || null;
}

export async function listModelRoles(paths: SqliteSettingsPaths = {}): Promise<StoredModelRole[]> {
  const dbPath = await ensureSettingsStore(paths);
  const rows = await queryJson<ModelRoleRow>(dbPath, "SELECT * FROM model_roles ORDER BY id;");
  return rows.map(toStoredModelRole);
}

export async function getModelRole(id: string, paths: SqliteSettingsPaths = {}) {
  const roles = await listModelRoles(paths);
  return roles.find((role) => role.id === id) || null;
}

export async function setProviderApiKey(providerId: string, apiKey: string, paths: SqliteSettingsPaths = {}) {
  const dbPath = await ensureSettingsStore(paths);
  const now = new Date().toISOString();
  const encrypted = await encryptSecret(apiKey, paths);
  const current = await getSecretRow(providerId, paths);
  await runSql(
    dbPath,
    formatSql(
      [
        "INSERT INTO secrets (id, provider_id, kind, algorithm, iv, auth_tag, ciphertext, created_at, updated_at)",
        "VALUES (?, ?, 'api_key', ?, ?, ?, ?, ?, ?)",
        "ON CONFLICT(id) DO UPDATE SET",
        "  algorithm = excluded.algorithm,",
        "  iv = excluded.iv,",
        "  auth_tag = excluded.auth_tag,",
        "  ciphertext = excluded.ciphertext,",
        "  updated_at = excluded.updated_at;",
      ].join("\n"),
      `provider:${providerId}:api_key`,
      providerId,
      SECRET_ALGORITHM,
      encrypted.iv,
      encrypted.authTag,
      encrypted.ciphertext,
      current?.created_at || now,
      now,
    ),
  );
}

export async function readProviderApiKey(providerId: string, paths: SqliteSettingsPaths = {}) {
  const row = await getSecretRow(providerId, paths);
  if (!row) {
    return null;
  }
  return decryptSecret(
    {
      iv: row.iv,
      authTag: row.auth_tag,
      ciphertext: row.ciphertext,
    },
    paths,
  );
}

export function defaultSettingsDbPath(rootDir = process.cwd()) {
  return path.resolve(rootDir, DEFAULT_DB_PATH);
}

export function defaultSettingsKeyPath(rootDir = process.cwd()) {
  return path.resolve(rootDir, DEFAULT_KEY_PATH);
}

async function getSecretRow(providerId: string, paths: SqliteSettingsPaths = {}) {
  const dbPath = await ensureSettingsStore(paths);
  const rows = await queryJson<SecretRow>(
    dbPath,
    formatSql("SELECT * FROM secrets WHERE provider_id = ? AND kind = 'api_key' LIMIT 1;", providerId),
  );
  return rows[0] || null;
}

async function encryptSecret(value: string, paths: SqliteSettingsPaths) {
  const key = await readOrCreateSecretKey(paths);
  const iv = randomBytes(12);
  const cipher = createCipheriv(SECRET_ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return {
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

async function decryptSecret(
  encrypted: {
    iv: string;
    authTag: string;
    ciphertext: string;
  },
  paths: SqliteSettingsPaths,
) {
  const key = await readOrCreateSecretKey(paths);
  const decipher = createDecipheriv(SECRET_ALGORITHM, key, Buffer.from(encrypted.iv, "base64"));
  decipher.setAuthTag(Buffer.from(encrypted.authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

async function readOrCreateSecretKey(paths: SqliteSettingsPaths) {
  const keyPath = resolveKeyPath(paths.keyPath);
  try {
    const raw = (await readFile(keyPath, "utf8")).trim();
    if (raw) {
      return deriveKey(raw);
    }
  } catch {
    // Create below.
  }
  await mkdir(path.dirname(keyPath), { recursive: true });
  const secret = randomBytes(32).toString("base64url");
  await writeFile(keyPath, `${secret}\n`, { encoding: "utf8", mode: 0o600 });
  return deriveKey(secret);
}

function deriveKey(secret: string) {
  return scryptSync(secret, SECRET_KEY_SALT, 32);
}

async function queryJson<T>(dbPath: string, sql: string): Promise<T[]> {
  const { stdout } = await execFileAsync("sqlite3", ["-json", dbPath, sql], {
    maxBuffer: 10 * 1024 * 1024,
  });
  const trimmed = stdout.trim();
  return trimmed ? (JSON.parse(trimmed) as T[]) : [];
}

async function runSql(dbPath: string, sql: string) {
  await execFileAsync("sqlite3", [dbPath, sql], {
    maxBuffer: 10 * 1024 * 1024,
  });
}

function formatSql(sql: string, ...values: unknown[]) {
  let index = 0;
  return sql.replace(/\?/g, () => sqlLiteral(values[index++]));
}

function sqlLiteral(value: unknown) {
  if (value === null || typeof value === "undefined") {
    return "NULL";
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "NULL";
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

function resolveDbPath(dbPath = DEFAULT_DB_PATH) {
  return path.resolve(dbPath);
}

function resolveKeyPath(keyPath = DEFAULT_KEY_PATH) {
  return path.resolve(keyPath);
}

function toStoredProvider(row: ProviderRow): StoredProvider {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    baseUrl: row.base_url,
    defaultFor: parseStringArray(row.default_for_json),
    models: parseStringArray(row.models_json),
    chatModels: parseStringArray(row.chat_models_json),
    imageModels: parseStringArray(row.image_models_json),
    secretConfigured: Boolean(row.secret_configured),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toStoredModelRole(row: ModelRoleRow): StoredModelRole {
  return {
    id: row.id,
    providerId: row.provider_id,
    model: row.model,
    fallbackModel: row.fallback_model || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseStringArray(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

interface ProviderRow {
  id: string;
  name: string;
  type: string;
  base_url: string;
  default_for_json: string;
  models_json: string;
  chat_models_json: string;
  image_models_json: string;
  secret_configured: number;
  created_at: string;
  updated_at: string;
}

interface ModelRoleRow {
  id: string;
  provider_id: string;
  model: string;
  fallback_model: string | null;
  created_at: string;
  updated_at: string;
}

interface SecretRow {
  id: string;
  provider_id: string;
  kind: string;
  algorithm: string;
  iv: string;
  auth_tag: string;
  ciphertext: string;
  created_at: string;
  updated_at: string;
}
