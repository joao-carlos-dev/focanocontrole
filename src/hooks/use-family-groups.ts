import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type FamilyGroup = {
  id: string;
  name: string;
  owner_user_id: string;
};

export type FamilyMember = {
  id: string;
  group_id: string;
  user_id: string | null;
  invited_email: string;
  role: string;
  status: string;
};

export function useFamilyGroups() {
  const { user, profile, refreshProfile } = useAuth();
  const [groups, setGroups] = useState<FamilyGroup[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: groupData }, { data: memberData }] = await Promise.all([
      supabase.from("family_groups").select("*").order("created_at", { ascending: true }),
      supabase.from("family_group_members").select("*").order("created_at", { ascending: true }),
    ]);
    setGroups((groupData || []) as FamilyGroup[]);
    setMembers((memberData || []) as FamilyMember[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user, load]);

  const createGroup = async (name: string) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("family_groups")
      .insert({ name: name.trim() || "Família", owner_user_id: user.id })
      .select()
      .single();
    if (error) throw error;
    await supabase.from("profiles").update({ active_group_id: data.id }).eq("user_id", user.id);
    await refreshProfile();
    await load();
    return data as FamilyGroup;
  };

  const inviteMember = async (groupId: string, email: string) => {
    if (!user) return;
    const { error } = await supabase.from("family_group_members").insert({
      group_id: groupId,
      invited_email: email.trim().toLowerCase(),
      invited_by: user.id,
    });
    if (error) throw error;
    await load();
  };

  const switchGroup = async (groupId: string | null) => {
    if (!user) return;
    await supabase.from("profiles").update({ active_group_id: groupId }).eq("user_id", user.id);
    await refreshProfile();
  };

  return {
    groups,
    members,
    loading,
    activeGroupId: profile?.active_group_id ?? null,
    createGroup,
    inviteMember,
    switchGroup,
    reload: load,
  };
}