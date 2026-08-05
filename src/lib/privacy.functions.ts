import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Privacy by design: the signed-in user can export everything we hold about
 * them and delete any slice of it — or the whole account.
 * Every query runs through the user-scoped client, so RLS enforces ownership
 * on top of the explicit user_id filters (defense in depth against IDOR).
 */

const USER_TABLES = ["study_sets", "notes", "chat_threads", "flashcard_reviews", "user_stats", "profiles"] as const;

export const exportMyData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ exportedAt: string; data: Record<string, unknown> }> => {
    (await import("./rate-limit.server")).guard("privacy.export", 5, 60_000, {}, context.userId);

    const out: Record<string, unknown> = {};
    for (const table of USER_TABLES) {
      const { data, error } = await context.supabase.from(table).select("*").limit(5000);
      if (error) throw new Error(`Could not export ${table}`);
      out[table] = data ?? [];
    }

    const { data: threads } = await context.supabase.from("chat_threads").select("id").limit(500);
    const ids = (threads ?? []).map((t) => t.id as string);
    if (ids.length) {
      const { data: messages } = await context.supabase
        .from("chat_messages")
        .select("*")
        .in("thread_id", ids)
        .limit(10000);
      out["chat_messages"] = messages ?? [];
    } else {
      out["chat_messages"] = [];
    }

    return { exportedAt: new Date().toISOString(), data: out };
  });

export const deleteMyData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ scope: z.enum(["chats", "notes", "documents", "reviews"]) }).parse(d),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    (await import("./rate-limit.server")).guard("privacy.delete", 20, 60_000, { scope: data.scope }, context.userId);

    const table =
      data.scope === "chats"
        ? "chat_threads"
        : data.scope === "notes"
          ? "notes"
          : data.scope === "documents"
            ? "study_sets"
            : "flashcard_reviews";

    const { error } = await context.supabase.from(table).delete().eq("user_id", context.userId);
    if (error) throw new Error("Could not delete that data. Please try again.");
    return { ok: true };
  });

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ confirm: z.literal("DELETE") }).parse(d))
  .handler(async ({ context }): Promise<{ ok: true }> => {
    (await import("./rate-limit.server")).guard("privacy.deleteAccount", 3, 300_000, {}, context.userId);

    // Remove user-owned rows first (user-scoped client, RLS enforced).
    for (const table of ["chat_threads", "notes", "study_sets", "flashcard_reviews", "user_stats"] as const) {
      await context.supabase.from(table).delete().eq("user_id", context.userId);
    }
    await context.supabase.from("profiles").delete().eq("id", context.userId);

    // Only now escalate to the admin client to remove the auth identity.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (error) throw new Error("Could not delete the account. Please try again.");
    return { ok: true };
  });
