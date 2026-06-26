import { NextResponse } from "next/server";
import { createAdminSession, validateAdminPassword } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  const password = body?.password?.trim() ?? "";

  if (!password) {
    return NextResponse.json({ erro: "Informe a senha de acesso." }, { status: 400 });
  }

  if (!validateAdminPassword(password)) {
    return NextResponse.json({ erro: "Senha inválida." }, { status: 401 });
  }

  await createAdminSession();
  return NextResponse.json({ ok: true });
}
