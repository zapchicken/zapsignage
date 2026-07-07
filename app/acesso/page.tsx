import { AccessForm } from "@/components/admin/AccessForm";

export default async function AcessoPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const nextUrl =
    params.next && params.next.startsWith("/") ? params.next : "/dashboard";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#ff8000_0%,_#f8ca00_22%,_#fff7eb_56%,_#fff7eb_100%)] px-6 py-10">
      <div className="w-full max-w-md">
        <AccessForm nextUrl={nextUrl} />
      </div>
    </div>
  );
}
