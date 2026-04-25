import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    const user = userData.user;

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: ownedGroups } = await admin
      .from("family_groups")
      .select("id")
      .eq("owner_user_id", user.id);
    const ownedGroupIds = (ownedGroups ?? []).map((group) => group.id);

    if (ownedGroupIds.length > 0) {
      await admin.from("entries").delete().in("group_id", ownedGroupIds);
      await admin.from("recurring_amounts").delete().in("group_id", ownedGroupIds);
      await admin.from("categories").delete().in("group_id", ownedGroupIds);
      await admin.from("monthly_report_sends").delete().in("group_id", ownedGroupIds);
      await admin.from("family_group_members").delete().in("group_id", ownedGroupIds);
      await admin.from("family_groups").delete().in("id", ownedGroupIds);
    }

    await admin.from("entries").delete().eq("user_id", user.id);
    await admin.from("recurring_amounts").delete().eq("user_id", user.id);
    await admin.from("categories").delete().eq("user_id", user.id);
    await admin.from("monthly_report_sends").delete().eq("user_id", user.id);
    await admin.from("family_group_members").delete().eq("user_id", user.id);

    if (user.email) {
      await admin.from("family_group_members").delete().ilike("invited_email", user.email);
    }

    await admin.from("profiles").delete().eq("user_id", user.id);

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("delete-account error", error);
    return new Response(JSON.stringify({ error: "Erro ao excluir conta" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
