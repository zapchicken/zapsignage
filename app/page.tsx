import { redirect } from "next/navigation";
import { isAdminSessionValid } from "@/lib/admin-auth";

export default async function Home() {
  const authenticated = await isAdminSessionValid();
  redirect(authenticated ? "/dashboard" : "/acesso?next=/dashboard");
}
