"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export function AccessForm({ nextUrl }: { nextUrl: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  return (
    <Card
      title="Acesso administrativo"
      description="Digite o usuário e a senha para liberar o painel de gerenciamento."
      className="border-border/70 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--card)_92%,var(--accent)_8%),var(--card))]"
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setErro("");
          setEnviando(true);

          try {
            const response = await fetch("/api/auth/login", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ username, password }),
            });

            const data = (await response.json().catch(() => ({}))) as { erro?: string };
            if (!response.ok) {
              throw new Error(data.erro ?? "Falha ao autenticar.");
            }

            router.push(nextUrl);
            router.refresh();
          } catch (error) {
            setErro(error instanceof Error ? error.message : "Falha ao autenticar.");
          } finally {
            setEnviando(false);
          }
        }}
      >
        <Input
          type="text"
          placeholder="Usuário"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
        />

        <Input
          type="password"
          placeholder="Senha administrativa"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="text-xs text-foreground/62">
          Se apenas a senha antiga estiver configurada, o usuário padrão é <strong>admin</strong>.
        </div>

        {erro ? (
          <div className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {erro}
          </div>
        ) : null}

        <Button type="submit" variant="primary" disabled={enviando}>
          {enviando ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </Card>
  );
}
