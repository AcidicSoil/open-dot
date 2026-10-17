import "server-only";
import http from "node:http";
import crypto from "node:crypto";
import OpenAI from "openai";
import { z } from "zod";
import { getSetting, setSetting } from "../db";
import { seal, unseal } from "../vault";

const ISSUER = "https://auth.openai.com";
const RESOURCE = "https://api.openai.com/v1";
const SCOPES = "openid profile email offline_access resource.invoke chatgpt.tokens.use.direct";
const accountSchema = z.object({
  id: z.string(), label: z.string(), subject: z.string(), clientId: z.string(),
  status: z.enum(["ready", "signed_out", "reauth_required", "plan_disabled"]), error: z.string().nullable(),
  blocked: z.boolean().optional(),
  tokens: z.object({ access: z.string(), refresh: z.string().optional(), id: z.string(), expiresAt: z.number(), scopes: z.array(z.string()) }).optional(),
});
type Account = z.infer<typeof accountSchema>;
type Catalog = { id: string; label: string }[];
type Session = { generation: number; abort: AbortController; refresh?: Promise<string> };
type Attempt = { cancel: () => void };
const g = globalThis as unknown as {
  __chatgptSessions?: Map<string, Session>; __chatgptPending?: Attempt;
  __chatgptError?: string | null; __chatgptCatalog?: Catalog;
};
const sessions = g.__chatgptSessions ??= new Map();

function records(readOnly = false): Account[] {
  const raw = getSetting("chatgpt_accounts");
  if (!raw) return [];
  try { return z.array(accountSchema).parse(JSON.parse(unseal(raw))); }
  catch {
    if (readOnly) { g.__chatgptError = "ChatGPT vault is locked or unreadable. Restore access before changing accounts."; return []; }
    throw new Error("ChatGPT vault is locked or unreadable. Restore access before changing accounts.");
  }
}
function save(accounts: Account[]) { setSetting("chatgpt_accounts", seal(JSON.stringify(accounts))); }
function session(id: string): Session {
  let current = sessions.get(id);
  if (!current) { current = { generation: 0, abort: new AbortController() }; sessions.set(id, current); }
  return current;
}
function invalidate(id: string) {
  const current = session(id);
  current.abort.abort();
  current.generation++;
  current.abort = new AbortController();
  current.refresh = undefined;
}
async function notify(refreshCatalog = false) {
  const { resetModels } = await import("./client");
  const { emit } = await import("../bus");
  const { computerInfo } = await import("../snapshot");
  resetModels();
  emit({ type: "computer", data: computerInfo() });
  if (refreshCatalog) {
    try {
      await chatGPTModels();
      resetModels();
      const { models } = await import("./client");
      await models();
    } catch { g.__chatgptError = "Couldn't load ChatGPT models. Refresh models in Settings."; }
    emit({ type: "computer", data: computerInfo() });
  }
}
export function chatGPTAccounts() { return records(true).map(({ id, label, subject, status, error }) => ({ id, label, subject, status, error })); }
export function chatGPTAuthError() { records(true); return g.__chatgptError ?? null; }
export function knownChatGPTModels(): Catalog {
  const ready = new Set(records(true).filter((a) => a.status === "ready").map((a) => a.id));
  return (g.__chatgptCatalog ?? []).filter((m) => ready.has(m.id.split(":")[1]));
}
class OAuthError extends Error {
  constructor(readonly code: string, readonly status: number) { super(`ChatGPT authorization failed (${status}, ${code}). Try signing in again.`); }
}
const tokenSchema = z.object({
  access_token: z.string().min(1), refresh_token: z.string().min(1).optional(), id_token: z.string().min(1).optional(),
  token_type: z.string(), expires_in: z.number().positive(), scope: z.string().optional(),
});
async function exchange(body: Record<string, string>, signal?: AbortSignal) {
  const response = await fetch(`${ISSUER}/api/accounts/oauth/token`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(body),
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30_000)]) : AbortSignal.timeout(30_000), redirect: "error",
  });
  const json: unknown = await response.json();
  if (!response.ok) {
    const parsed = z.object({ error: z.string().regex(/^[a-z_]+$/) }).safeParse(json);
    throw new OAuthError(parsed.success ? parsed.data.error : "authorization_failed", response.status);
  }
  const tokens = tokenSchema.parse(json);
  if (tokens.token_type.toLowerCase() !== "bearer") throw new Error("Unsupported ChatGPT token type.");
  return tokens;
}
async function validateIdentity(token: string, clientId: string, nonce: string) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid OpenAI identity token.");
  const header = z.object({ alg: z.literal("RS256"), kid: z.string() }).parse(JSON.parse(Buffer.from(parts[0], "base64url").toString()));
  const response = await fetch(`${ISSUER}/.well-known/jwks.json`, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error("Couldn't verify OpenAI identity keys.");
  const keys = z.object({ keys: z.array(z.object({ kid: z.string(), kty: z.literal("RSA"), n: z.string(), e: z.string(), alg: z.string().optional(), use: z.string().optional() })) }).parse(await response.json());
  const key = keys.keys.find((k) => k.kid === header.kid && (!k.alg || k.alg === "RS256") && (!k.use || k.use === "sig"));
  if (!key || !crypto.verify("RSA-SHA256", Buffer.from(`${parts[0]}.${parts[1]}`), crypto.createPublicKey({ key, format: "jwk" }), Buffer.from(parts[2], "base64url"))) throw new Error("OpenAI identity signature is invalid.");
  const claims = z.object({
    iss: z.literal(ISSUER), sub: z.string().min(1), aud: z.union([z.string(), z.array(z.string())]), exp: z.number(),
    nonce: z.string(), email: z.string().optional(), azp: z.string().optional(), nbf: z.number().optional(),
  }).parse(JSON.parse(Buffer.from(parts[1], "base64url").toString()));
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audiences.includes(clientId) || (audiences.length > 1 && claims.azp !== clientId) || (claims.azp && claims.azp !== clientId) || claims.exp <= Date.now() / 1000 || (claims.nbf && claims.nbf > Date.now() / 1000) || claims.nonce !== nonce) throw new Error("OpenAI identity validation failed.");
  return claims;
}
export async function startChatGPTSignIn(accountId?: string): Promise<{ url: string }> {
  const old = accountId ? records().find((a) => a.id === accountId) : undefined;
  if (accountId && !old) throw new Error("Unknown ChatGPT registration.");
  g.__chatgptPending?.cancel();
  const hostId = getSetting("chatgpt_host_id") ?? `urn:uuid:${crypto.randomUUID()}`;
  setSetting("chatgpt_host_id", hostId);
  const state = crypto.randomBytes(32).toString("base64url"), nonce = crypto.randomBytes(32).toString("base64url"), verifier = crypto.randomBytes(32).toString("base64url");
  const listener = http.createServer();
  await new Promise<void>((resolve, reject) => { listener.once("error", reject); listener.listen(0, "127.0.0.1", () => resolve()); });
  const address = listener.address();
  if (!address || typeof address === "string") throw new Error("Couldn't start ChatGPT callback.");
  const host = `127.0.0.1:${address.port}`, redirectUri = `http://${host}/auth/callback`;
  let consumed = false;
  const abort = new AbortController();
  const finish = () => { clearTimeout(timer); listener.close(); listener.closeIdleConnections(); if (g.__chatgptPending === attempt) g.__chatgptPending = undefined; };
  const attempt: Attempt = { cancel: () => { abort.abort(); finish(); } };
  const timer = setTimeout(() => { g.__chatgptError = "ChatGPT sign-in timed out. Try again."; attempt.cancel(); void notify(); }, 300_000);
  timer.unref();
  g.__chatgptPending = attempt;
  g.__chatgptError = null;
  listener.on("request", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Referrer-Policy", "no-referrer");
    let url: URL;
    try { url = new URL(req.url ?? "/", redirectUri); }
    catch { res.writeHead(400).end("Invalid sign-in callback."); return; }
    if (req.method !== "GET" || req.headers.host !== host || url.pathname !== "/auth/callback" || url.searchParams.get("state") !== state || consumed) { res.writeHead(400).end("Invalid sign-in callback."); return; }
    consumed = true;
    try {
      if (url.searchParams.has("error")) throw new Error("ChatGPT sign-in was declined.");
      const code = url.searchParams.get("code"), issuedId = url.searchParams.get("client_id") ?? old?.clientId;
      if (!code || !issuedId || issuedId === "dynamic_agent_client" || !/^[A-Za-z0-9_-]+$/.test(issuedId) || (old && issuedId !== old.clientId)) throw new Error("Invalid ChatGPT client ID or code.");
      const tokens = await exchange({ grant_type: "authorization_code", client_id: issuedId, code, code_verifier: verifier, redirect_uri: redirectUri, resource: RESOURCE }, abort.signal);
      if (!tokens.id_token || !tokens.scope) throw new Error("Missing ChatGPT identity or permissions.");
      const identity = await validateIdentity(tokens.id_token, issuedId, nonce);
      abort.signal.throwIfAborted();
      if (g.__chatgptPending !== attempt) throw new Error("ChatGPT sign-in was cancelled.");
      const accounts = records(), existing = accounts.find((a) => a.id === issuedId);
      if ((old && identity.sub !== old.subject) || (existing && identity.sub !== existing.subject)) throw new Error("ChatGPT returned a different account.");
      const scopes = tokens.scope.split(/\s+/), direct = scopes.includes("chatgpt.tokens.use.direct") && scopes.includes("resource.invoke");
      invalidate(issuedId);
      const account: Account = {
        id: issuedId, clientId: issuedId, subject: identity.sub, label: `${identity.email ?? "ChatGPT"} · ${issuedId.slice(-8)}`,
        status: direct ? "ready" : "plan_disabled", error: direct ? null : "Allow ChatGPT plan usage to enable inference.",
        tokens: { access: tokens.access_token, refresh: tokens.refresh_token, id: tokens.id_token, expiresAt: Date.now() + tokens.expires_in * 1000, scopes },
      };
      save([...accounts.filter((a) => a.id !== issuedId), account]);
      g.__chatgptError = null;
      res.writeHead(200).end("Signed in to Open Dot. Return to Settings to choose a model. Inference access still needs verification.");
      finish();
      void notify(true);
    } catch (error) {
      if (!abort.signal.aborted) { g.__chatgptError = error instanceof OAuthError ? error.message : "ChatGPT sign-in failed or was declined. Try again from Settings."; res.writeHead(400).end(g.__chatgptError); finish(); void notify(); }
      else res.writeHead(400).end("Sign-in cancelled.");
    }
  });
  const params = new URLSearchParams({ client_id: old?.clientId ?? "dynamic_agent_client", ext_agent_host_id: hostId, response_type: "code", redirect_uri: redirectUri, scope: SCOPES, resource: RESOURCE, state, nonce, code_challenge_method: "S256", code_challenge: crypto.createHash("sha256").update(verifier).digest("base64url") });
  if (!old) params.set("agent_name_hint", "Open Dot");
  if (old?.status === "plan_disabled") params.set("prompt", "consent");
  return { url: `${ISSUER}/api/accounts/authorize?${params}` };
}
async function accessToken(id: string, allowBlocked = false): Promise<string> {
  const account = records().find((a) => a.id === id);
  if (!account?.tokens || account.status !== "ready") throw new Error("This ChatGPT account needs sign-in or plan permission. Open Settings.");
  if (account.blocked && !allowBlocked) throw new Error(account.error ?? "ChatGPT requests are paused. Check usage in Settings, then refresh models to retry.");
  if (account.tokens.expiresAt > Date.now() + 30_000) return account.tokens.access;
  const current = session(id);
  if (current.refresh) return current.refresh;
  const generation = current.generation;
  current.refresh = (async () => {
    try {
      if (!account.tokens?.refresh) throw new OAuthError("invalid_refresh_token", 401);
      const result = await exchange({ grant_type: "refresh_token", client_id: account.clientId, refresh_token: account.tokens.refresh, resource: RESOURCE }, current.abort.signal);
      const accounts = records(), latest = accounts.find((a) => a.id === id);
      if (current.generation !== generation || !latest?.tokens || latest.status !== "ready") throw new Error("ChatGPT session changed. Try again.");
      const scopes = result.scope ? result.scope.split(/\s+/) : latest.tokens.scopes;
      latest.tokens = { access: result.access_token, refresh: result.refresh_token ?? latest.tokens.refresh, id: latest.tokens.id, scopes, expiresAt: Date.now() + result.expires_in * 1000 };
      if (!scopes.includes("chatgpt.tokens.use.direct") || !scopes.includes("resource.invoke")) { latest.status = "plan_disabled"; latest.error = "ChatGPT plan permission is disabled. Sign in again to enable it."; }
      save(accounts);
      if (latest.status !== "ready") { void notify(); throw new Error(latest.error!); }
      return result.access_token;
    } catch (error) {
      if (current.generation === generation && error instanceof OAuthError && ["invalid_grant", "invalid_refresh_token", "token_expired", "refresh_token_expired", "refresh_token_invalidated", "refresh_token_reused"].includes(error.code)) {
        const accounts = records(), latest = accounts.find((a) => a.id === id);
        if (latest) { latest.tokens = undefined; latest.status = "reauth_required"; latest.error = "ChatGPT session expired or was revoked. Sign in again."; save(accounts); void notify(); }
      }
      throw error;
    }
  })().finally(() => { if (current.generation === generation) current.refresh = undefined; });
  return current.refresh;
}
async function request(id: string, url: string, init: RequestInit = {}) {
  if (!url.startsWith(`${RESOURCE}/`)) throw new Error("ChatGPT credentials may only be used with the public OpenAI API.");
  const current = session(id), generation = current.generation;
  const token = await accessToken(id, url === `${RESOURCE}/models`);
  if (current.generation !== generation) throw new Error("ChatGPT session changed. Try again.");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(url, { ...init, headers, redirect: "error", signal: AbortSignal.any([current.abort.signal, ...(init.signal ? [init.signal] : [])]) });
  if (response.status === 401 && current.generation === generation) {
    const accounts = records(), account = accounts.find((a) => a.id === id);
    if (account) {
      invalidate(id);
      account.tokens = undefined;
      account.status = "reauth_required";
      account.error = "ChatGPT session expired or was revoked. Sign in again.";
      account.blocked = false;
      save(accounts);
      void notify();
    }
  }
  if (!response.ok) {
    const parsed = z.object({ error: z.object({ code: z.string().nullable().optional() }) }).safeParse(await response.clone().json().catch(() => null));
    if (parsed.success && parsed.data.error.code) recordChatGPTFailure(id, parsed.data.error.code);
  }
  return response;
}
export function recordChatGPTFailure(id: string, code: string) {
  const messages: Record<string, string> = {
    subscription_sharing_usage_limit_exceeded: "ChatGPT usage limit reached. Requests are paused. Check ChatGPT Settings and Usage, then refresh models here to retry.",
    subscription_sharing_user_not_eligible: "This ChatGPT account or workspace is not eligible. Requests are paused. Check access, then refresh models to retry.",
  };
  if (!messages[code]) return;
  const accounts = records(), account = accounts.find((a) => a.id === id);
  if (!account || account.status !== "ready") return;
  account.error = messages[code];
  account.blocked = true;
  save(accounts);
  void notify();
}
export async function chatGPTModels(retry = false): Promise<Catalog> {
  if (retry) {
    const accounts = records();
    for (const account of accounts) { account.blocked = false; account.error = null; }
    save(accounts);
  }
  const catalog: Catalog = [];
  for (const account of records().filter((a) => a.status === "ready")) {
    try {
      const response = await request(account.id, `${RESOURCE}/models`, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error("Catalog unavailable");
      const data = z.object({ models: z.array(z.object({ slug: z.string().min(1), display_name: z.string(), visibility: z.string() })) }).parse(await response.json());
      catalog.push(...data.models.filter((m) => m.visibility === "list").map((m) => ({ id: `chatgpt:${account.id}:${m.slug}`, label: `${m.display_name} · ${account.label}` })));
    } catch {
      const accounts = records(), latest = accounts.find((a) => a.id === account.id);
      if (latest && !latest.error && latest.status === "ready") {
        latest.error = "Couldn't load this account's models. Refresh models to retry, or sign in again if access was revoked.";
        save(accounts);
      }
    }
  }
  const ready = new Set(records().filter((a) => a.status === "ready").map((a) => a.id));
  g.__chatgptCatalog = catalog.filter((m) => ready.has(m.id.split(":")[1]));
  return g.__chatgptCatalog;
}
export async function chatGPTClient(modelId: string): Promise<{ client: OpenAI; model: string; accountId: string }> {
  const match = /^chatgpt:([^:]+):(.+)$/.exec(modelId);
  if (!match) throw new Error("Invalid ChatGPT model selection.");
  await accessToken(match[1]);
  return { client: new OpenAI({ apiKey: "managed-chatgpt-session", baseURL: RESOURCE, maxRetries: 0, fetch: (url, init) => request(match[1], String(url), init) }), model: match[2], accountId: match[1] };
}
export async function signOutChatGPT(id: string): Promise<string | null> {
  const accounts = records(), account = accounts.find((a) => a.id === id);
  if (!account) return null;
  g.__chatgptPending?.cancel();
  invalidate(id);
  const refresh = account.tokens?.refresh;
  account.tokens = undefined; account.status = "signed_out"; account.error = null; account.blocked = false;
  save(accounts);
  void notify();
  if (!refresh) return null;
  try {
    const discovery = await fetch(`${ISSUER}/.well-known/openid-configuration`, { signal: AbortSignal.timeout(15_000) });
    if (!discovery.ok) throw new Error();
    const { revocation_endpoint: endpoint } = z.object({ revocation_endpoint: z.string().url() }).parse(await discovery.json());
    if (new URL(endpoint).origin !== ISSUER) throw new Error();
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token: refresh, token_type_hint: "refresh_token", client_id: account.clientId }), signal: AbortSignal.timeout(15_000), redirect: "error" });
    if (response.status !== 200) throw new Error();
    return null;
  } catch { return "Signed out locally. Remote revocation was not confirmed. Disconnect Open Dot in ChatGPT Settings."; }
}
