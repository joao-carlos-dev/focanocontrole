import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import logoAsset from "@/assets/foca-controle-logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Redefinir senha - Foca no Controle" },
      { name: "description", content: "Crie uma nova senha para sua conta." },
      { property: "og:title", content: "Redefinir senha - Foca no Controle" },
      { property: "og:description", content: "Crie uma nova senha para sua conta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("As senhas não conferem");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Senha atualizada com sucesso");
    navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <img
            src={logoAsset.url}
            alt="Foca no Controle"
            className="mx-auto h-16 w-16 rounded-full object-cover shadow-[var(--shadow-glow)] ring-1 ring-white/10"
          />
          <h1 className="text-2xl font-bold tracking-tight">Redefinir senha</h1>
          <p className="text-sm text-muted-foreground">Digite sua nova senha de acesso</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-elegant)]"
        >
          <div className="space-y-2">
            <Label>Nova senha</Label>
            <Input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Confirmar senha</Label>
            <Input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Salvando..." : "Salvar nova senha"}
          </Button>
        </form>
      </div>
    </div>
  );
}
