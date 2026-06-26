import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <main className="w-full max-w-3xl rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="flex items-center justify-between gap-6">
          <div className="flex flex-col gap-2">
            <div className="text-xs font-semibold tracking-wide text-zinc-500">
              ZapChicken
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Digital Signage
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Painel administrativo e player para exibição em TV.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-black hover:bg-accent-2"
            >
              Abrir Painel
            </Link>
            <Link
              href="/player"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-card px-4 text-sm font-semibold hover:bg-muted"
            >
              Abrir Player
            </Link>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-muted p-4">
            <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Layouts → Zonas → Timelines
            </div>
            <div className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">
              Estruture a tela e controle o tempo.
            </div>
          </div>
          <div className="rounded-xl border border-border bg-muted p-4">
            <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              RSS + Marketing
            </div>
            <div className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">
              Notícias misturadas com mensagens.
            </div>
          </div>
          <div className="rounded-xl border border-border bg-muted p-4">
            <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Cache local
            </div>
            <div className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">
              Funciona offline após carregar.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
