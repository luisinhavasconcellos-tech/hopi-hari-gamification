import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { authSupabase } from "@/integrations/supabase/authClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import BrandMark from "@/components/BrandMark";

const loginPanelArtwork = "/manus-storage/hopi-bi-login-panel_bba06877.jpg";

export default function ResetPasswordPage() {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isRecovery, setIsRecovery] = useState(() => window.location.hash.includes("type=recovery"));
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const { data } = authSupabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setIsRecovery(true);
    });

    authSupabase.auth.getSession().then(({ data: sessionData }) => {
      if (sessionData.session && window.location.hash.includes("type=recovery")) setIsRecovery(true);
      setChecking(false);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      toast({ title: "Senha muito curta", description: "Use pelo menos 8 caracteres.", variant: "destructive" });
      return;
    }
    if (password !== confirmation) {
      toast({ title: "Senhas não conferem", description: "Digite a mesma senha nos dois campos.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const { error } = await authSupabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      toast({ title: "Não foi possível alterar a senha", description: error.message, variant: "destructive" });
      return;
    }
    setComplete(true);
    await authSupabase.auth.signOut();
  };

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden lg:flex w-[42%] relative flex-col justify-between overflow-hidden bg-primary text-primary-foreground p-12">
        <img
          src={loginPanelArtwork}
          alt=""
          aria-hidden
          className="absolute inset-0 size-full object-cover opacity-25 mix-blend-soft-light"
        />
        <div aria-hidden className="absolute inset-0 bg-primary/75" />
        <div className="relative flex items-center gap-3">
          <BrandMark className="size-12" />
          <div className="font-display text-2xl font-bold tracking-tight">Hopi Hari</div>
        </div>

        <div className="relative max-w-md space-y-5">
          <div className="brand-rule w-24" />
          <h1 className="font-display text-4xl xl:text-5xl font-black leading-[1.08]">
            Acesso seguro,
            <br />
            continuidade total.
          </h1>
          <p className="text-primary-foreground/85 leading-relaxed">
            Recupere sua credencial para voltar aos dados comerciais, de audiência e operação.
          </p>
        </div>

        <p className="relative text-xs text-primary-foreground/60">
          Plataforma de Inteligência · uso interno Hopi Hari
        </p>
      </aside>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <BrandMark className="size-12" />
            <div className="leading-tight">
              <h1 className="font-display text-xl font-bold">Hopi Hari</h1>
              <p className="text-sm text-muted-foreground">Plataforma de Inteligência</p>
            </div>
          </div>

          <Card className="glass brand-topline w-full">
            <CardHeader>
              <CardTitle>{complete ? "Senha alterada" : "Criar nova senha"}</CardTitle>
              <CardDescription>
                {complete ? "Sua nova senha já pode ser usada em qualquer dispositivo." : "Defina uma senha segura para voltar a acessar a plataforma."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {checking ? (
                <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-primary" /></div>
              ) : complete ? (
                <Button asChild className="w-full"><Link to="/auth">Voltar para entrar</Link></Button>
              ) : !isRecovery ? (
                <div className="space-y-4 text-sm text-muted-foreground">
                  <p>Este link de recuperação é inválido ou expirou. Solicite um novo link na tela de entrada.</p>
                  <Button asChild className="w-full"><Link to="/auth">Voltar para entrar</Link></Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Nova senha</Label>
                    <Input id="new-password" type="password" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password-confirmation">Confirmar nova senha</Label>
                    <Input id="new-password-confirmation" type="password" autoComplete="new-password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting && <Loader2 className="size-4 mr-2 animate-spin" />}
                    Alterar senha
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
