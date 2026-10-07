import "server-only";
import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

// user, session, account and verification are better-auth's core tables, in
// the shape its CLI generates for SQLite. better-auth owns them: app code only
// touches them through better-auth's APIs.
const schema = `
create table if not exists "user" (
  "id"            text    not null primary key,
  "name"          text    not null,
  "email"         text    not null unique,
  "emailVerified" integer not null,
  "image"         text,
  "createdAt"     date    not null,
  "updatedAt"     date    not null
);

create table if not exists "session" (
  "id"        text not null primary key,
  "userId"    text not null references "user" ("id") on delete cascade,
  "token"     text not null unique,
  "expiresAt" date not null,
  "ipAddress" text,
  "userAgent" text,
  "createdAt" date not null,
  "updatedAt" date not null
);

create table if not exists "account" (
  "id"                    text not null primary key,
  "userId"                text not null references "user" ("id") on delete cascade,
  "accountId"             text not null,
  "providerId"            text not null,
  "accessToken"           text,
  "refreshToken"          text,
  "accessTokenExpiresAt"  date,
  "refreshTokenExpiresAt" date,
  "scope"                 text,
  "idToken"               text,
  "password"              text,
  "createdAt"             date not null,
  "updatedAt"             date not null
);

create table if not exists "verification" (
  "id"         text not null primary key,
  "identifier" text not null,
  "value"      text not null,
  "expiresAt"  date not null,
  "createdAt"  date not null,
  "updatedAt"  date not null
);

create index if not exists "session_userId_idx"          on "session" ("userId");
create index if not exists "account_userId_idx"          on "account" ("userId");
create index if not exists "verification_identifier_idx" on "verification" ("identifier");

create table if not exists "note" (
  "id"         text    not null primary key,
  "userId"     text    not null references "user" ("id") on delete cascade,
  "title"      text    not null default '',
  "content"    text    not null check (json_valid("content")),
  "shareToken" text    unique,
  "createdAt"  integer not null,
  "updatedAt"  integer not null
);

create index if not exists "note_userId_updatedAt_idx" on "note" ("userId", "updatedAt" desc);
`;

function openDatabase() {
  const path = process.env.DB_PATH ?? "data/app.db";
  mkdirSync(dirname(path), { recursive: true });

  const db = new Database(path, { create: true, strict: true });
  // busy_timeout goes first so switching to WAL waits for locks instead of failing.
  db.run("pragma busy_timeout = 5000");
  db.run("pragma journal_mode = WAL");
  // Applies per connection; needed for the cascading deletes.
  db.run("pragma foreign_keys = ON");

  db.transaction(() => db.exec(schema))();
  return db;
}

// Cached on globalThis so dev hot reloads reuse one connection.
const globalForDb = globalThis as typeof globalThis & { db?: Database };

export const db = (globalForDb.db ??= openDatabase());
