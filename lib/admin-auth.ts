import "server-only";

import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const ADMIN_SESSION_COOKIE = "zap_admin_session";

function getAdminPassword() {
  const password = process.env.ADMIN_PASSWORD?.trim();
  return password || null;
}

function buildSessionToken(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

export async function isAdminSessionValid() {
  const password = getAdminPassword();
  if (!password) return false;
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_SESSION_COOKIE)?.value === buildSessionToken(password);
}

export async function createAdminSession() {
  const password = getAdminPassword();
  if (!password) {
    throw new Error("ADMIN_PASSWORD não configurada.");
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, buildSessionToken(password), {
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
  const password = getAdminPassword();
  if (!password) {
    return NextResponse.json(
      { erro: "ADMIN_PASSWORD não configurada." },
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

export function validateAdminPassword(password: string) {
  const expected = getAdminPassword();
  if (!expected) return false;
  return password === expected;
}
