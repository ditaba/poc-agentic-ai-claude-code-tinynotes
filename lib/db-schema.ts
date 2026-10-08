import type { Database } from "bun:sqlite";

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

// Creates any missing tables. Kept out of lib/db.ts (server-only) so tests can
// build the same schema in memory.
export function applySchema(db: Database): void {
  db.transaction(() => db.exec(schema))();
}
