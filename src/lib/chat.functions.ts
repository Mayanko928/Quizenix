import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ChatThread = {
  id: string;
  title: string;
  mode: string;
  is_favorite: boolean;
  updated_at: string;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "tutor";
  content: string;
  created_at: string;
};

export const listThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ChatThread[]> => {
    const { data, error } = await context.supabase
      .from("chat_threads")
      .select("id, title, mode, is_favorite, updated_at, created_at")
      .order("is_favorite", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []) as ChatThread[];
  });

export const createThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ title: z.string().min(1).max(120).optional(), mode: z.string().max(40).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { data: row, error } = await context.supabase
      .from("chat_threads")
      .insert({ user_id: context.userId, title: data.title ?? "New chat", mode: data.mode ?? "default" })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const getThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<{ thread: ChatThread; messages: ChatMessage[] }> => {
    const { data: thread, error } = await context.supabase
      .from("chat_threads")
      .select("id, title, mode, is_favorite, updated_at, created_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!thread) throw new Error("Chat not found");
    const { data: messages, error: mErr } = await context.supabase
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("thread_id", data.id)
      .order("created_at", { ascending: true });
    if (mErr) throw new Error(mErr.message);
    return { thread: thread as ChatThread, messages: (messages ?? []) as ChatMessage[] };
  });

export const updateThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        title: z.string().min(1).max(120).optional(),
        mode: z.string().max(40).optional(),
        is_favorite: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("chat_threads").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("chat_threads").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const appendMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        threadId: z.string().uuid(),
        messages: z
          .array(z.object({ role: z.enum(["user", "tutor"]), content: z.string().min(1).max(20000) }))
          .min(1)
          .max(4),
        title: z.string().min(1).max(120).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("chat_messages").insert(
      data.messages.map((m) => ({
        thread_id: data.threadId,
        user_id: context.userId,
        role: m.role,
        content: m.content,
      })),
    );
    if (error) throw new Error(error.message);
    const patch: { updated_at: string; title?: string } = { updated_at: new Date().toISOString() };
    if (data.title) patch.title = data.title;
    const { error: tErr } = await context.supabase.from("chat_threads").update(patch).eq("id", data.threadId);
    if (tErr) throw new Error(tErr.message);
    return { ok: true };
  });
