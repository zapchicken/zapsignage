import type { MarketingMessage } from "@/lib/types";

export function escolherMensagemPonderada(mensagens: MarketingMessage[]) {
  const ativas = mensagens.filter((m) => m.ativo && m.texto.trim());
  if (!ativas.length) return null;
  const total = ativas.reduce((acc, m) => acc + Math.max(1, m.peso || 1), 0);
  let r = Math.random() * total;
  for (const m of ativas) {
    r -= Math.max(1, m.peso || 1);
    if (r <= 0) return m;
  }
  return ativas[ativas.length - 1];
}

export function montarTickerTexto(input: {
  noticias: string[];
  mensagens: MarketingMessage[];
  proporcaoNoticiasParaMensagem?: number;
}) {
  const proporcao = Math.max(1, input.proporcaoNoticiasParaMensagem ?? 2);
  const noticias = input.noticias.filter(Boolean).map((t) => t.trim()).filter(Boolean);
  const out: string[] = [];

  let i = 0;
  while (i < noticias.length) {
    for (let k = 0; k < proporcao && i < noticias.length; k++) {
      out.push(noticias[i++]);
    }
    const msg = escolherMensagemPonderada(input.mensagens);
    if (msg) out.push(msg.texto.trim());
  }

  if (!out.length) {
    const msg = escolherMensagemPonderada(input.mensagens);
    if (msg) out.push(msg.texto.trim());
  }

  const texto = out.join(" • ");
  return texto ? `${texto} • ` : "";
}

