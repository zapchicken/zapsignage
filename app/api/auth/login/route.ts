import { NextResponse } from "next/server";
import { createAdminSession, validateAdminCredentials } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { username?: string; password?: string }
    | null;
  const username = body?.username?.trim() ?? "";
  const password = body?.password?.trim() ?? "";

  if (!username || !password) {
    return NextResponse.json(
      { erro: "Informe o usuário e a senha de acesso." },
      { status: 400 },
    );
  }

  const credentials = validateAdminCredentials({ username, password });
  if (!credentials) {
    return NextResponse.json({ erro: "Usuário ou senha inválidos." }, { status: 401 });
  }

  await createAdminSession(credentials);
  return NextResponse.json({ ok: true });
}
