import "server-only";

import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const ADMIN_SESSION_COOKIE = "zap_admin_session";

type AdminCredential = {
  username: string;
  password: string;
};

function parseAdminUsersJson(raw: string) {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const username =
          "username" in item && typeof item.username === "string"
            ? item.username.trim()
            : "";
        const password =
          "password" in item && typeof item.password === "string"
            ? item.password.trim()
            : "";
        if (!username || !password) return null;
        return { username, password } satisfies AdminCredential;
      })
      .filter((item): item is AdminCredential => Boolean(item));
  } catch {
    return [];
  }
}

function getAdminCredentials() {
  const rawUsers = process.env.ADMIN_USERS_JSON?.trim();
  if (rawUsers) {
    const parsed = parseAdminUsersJson(rawUsers);
    if (parsed.length > 0) return parsed;
  }

  const password = process.env.ADMIN_PASSWORD?.trim();
  if (!password) return [];

  const username = process.env.ADMIN_USERNAME?.trim() || "admin";
  return [{ username, password }];
}

function buildSessionToken(username: string, password: string) {
  return createHash("sha256").update(`${username}:${password}`).digest("hex");
}

function buildLegacySessionToken(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

export async function isAdminSessionValid() {
  const credentials = getAdminCredentials();
  if (credentials.length === 0) return false;

  const cookieStore = await cookies();
  const currentToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!currentToken) return false;

  return credentials.some(({ username, password }) => {
    return (
      currentToken === buildSessionToken(username, password) ||
      currentToken === buildLegacySessionToken(password)
    );
  });
}

export async function createAdminSession(input: AdminCredential) {
  if (!input.username || !input.password) {
    throw new Error("Credenciais administrativas inválidas.");
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, buildSessionToken(input.username, input.password), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export async function requireAdminSessionJson() {
  const credentials = getAdminCredentials();
  if (credentials.length === 0) {
    return NextResponse.json(
      { erro: "Credenciais administrativas não configuradas." },
      { status: 500 },
    );
  }

  if (!(await isAdminSessionValid())) {
    return NextResponse.json(
      { erro: "Sessão administrativa inválida." },
      { status: 401 },
    );
  }

  return null;
}

export function validateAdminCredentials(input: {
  username: string;
  password: string;
}) {
  const username = input.username.trim();
  const password = input.password.trim();
  if (!username || !password) return null;

  const match = getAdminCredentials().find((credential) => {
    return credential.username === username && credential.password === password;
  });

  return match ?? null;
}
