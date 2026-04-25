import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, LogOut, User as UserIcon, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useFamilyGroups } from "@/hooks/use-family-groups";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [{ title: "Perfil - Controle Financeiro Familiar" }],
  }),
  component: PerfilPage,
});

function PerfilPage() {
  const { user, profile, loading, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [monthlyCsvEmail, setMonthlyCsvEmail] = useState(true);
  const [groupName, setGroupName] = useState("Família");
  const [inviteEmail, setInviteEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const { groups, members, activeGroupId, createGroup, inviteMember, switchGroup } = useFamilyGroups();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (profile) {
      setName(profile.display_name || "");
      setWhatsapp(profile.whatsapp || "");
      setNotifyEmail(profile.notify_email);
      setMonthlyCsvEmail(profile.monthly_csv_email);
    }
  }, [profile]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: name,
        whatsapp: whatsapp || null,
        notify_email: notifyEmail,
        monthly_csv_email: monthlyCsvEmail,
      })
      .eq("user_id", user.id);
    setBusy(false);
    if (error) {
      toast.error("Erro ao salvar");
      return;
    }
    await refreshProfile();
    toast.success("Perfil atualizado");
  };

  const handleCreateGroup = async () => {
    try {
      await createGroup(groupName);
      toast.success("Grupo familiar criado");
    } catch {
      toast.error("Erro ao criar grupo");
    }
  };

  const handleInvite = async () => {
    if (!activeGroupId || !inviteEmail.trim()) return;
    try {
      await inviteMember(activeGroupId, inviteEmail);
      setInviteEmail("");
      toast.success("Convite cadastrado");
    } catch {
      toast.error("Erro ao convidar");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/auth" });
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="flex items-center justify-between">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-1.5 text-destructive">
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </header>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-elegant)]">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[image:var(--gradient-primary)]">
              <UserIcon className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Meu perfil</h1>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp</Label>
              <Input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="(11) 99999-9999"
              />
              <p className="text-[11px] text-muted-foreground">
                Será usado para lembretes via WhatsApp (em breve).
              </p>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border bg-background/40 p-3">
              <div>
                <Label className="text-sm">Receber lembretes por email</Label>
                <p className="text-[11px] text-muted-foreground">
                  Avisos 2 dias, 1 dia antes e no dia do vencimento (sempre ao meio-dia).
                </p>
              </div>
              <Switch checked={notifyEmail} onCheckedChange={setNotifyEmail} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border bg-background/40 p-3">
              <div>
                <Label className="text-sm">Receber CSV mensal por email</Label>
                <p className="text-[11px] text-muted-foreground">
                  Envio automático no último dia de cada mês às 17h.
                </p>
              </div>
              <Switch checked={monthlyCsvEmail} onCheckedChange={setMonthlyCsvEmail} />
            </div>
            <Button onClick={save} disabled={busy} className="w-full">
              {busy ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-elegant)]">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary">
              <Users className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Gastos em família</h2>
              <p className="text-xs text-muted-foreground">Compartilhe visualização e edição dos lançamentos.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Área ativa</Label>
              <Select value={activeGroupId ?? "personal"} onValueChange={(v) => switchGroup(v === "personal" ? null : v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Somente meus dados</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {groups.length === 0 ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Nome do grupo" />
                <Button onClick={handleCreateGroup}>Criar grupo</Button>
              </div>
            ) : activeGroupId ? (
              <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email@exemplo.com" />
                  <Button onClick={handleInvite}>Convidar</Button>
                </div>
                <div className="space-y-1 rounded-xl border border-border bg-background/40 p-3 text-sm">
                  {members.filter((m) => m.group_id === activeGroupId).map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-3 text-xs">
                      <span className="truncate">{m.invited_email}</span>
                      <span className="text-muted-foreground">{m.status === "active" ? "ativo" : "pendente"}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
