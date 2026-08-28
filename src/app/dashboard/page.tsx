import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import DashboardShell from "./DashboardShell";
import "./dashboard.css";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: org }, { data: comms }, { data: pericias }, { data: prazos }, { data: honorarios }] =
    await Promise.all([
      supabase.from("profiles").select("nome, onboarding_completed").eq("id", user.id).maybeSingle(),
      supabase.from("organizations").select("plan_id, subscription_status").eq("owner_id", user.id).maybeSingle(),
      supabase.from("communications").select("*").order("received_at", { ascending: false }),
      supabase.from("pericias").select("*").order("scheduled_at", { ascending: true }),
      supabase.from("prazos").select("*").order("due_date", { ascending: true }),
      supabase.from("honorarios").select("*"),
    ]);

  if (profile && !profile.onboarding_completed) redirect("/onboarding");

  return (
    <DashboardShell
      nome={profile?.nome ?? "Doutor(a)"}
      planId={org?.plan_id ?? null}
      pastDue={org?.subscription_status === "past_due"}
      comms={(comms ?? []) as any}
      pericias={(pericias ?? []) as any}
      prazos={(prazos ?? []) as any}
      honorarios={(honorarios ?? []) as any}
    />
  );
}
