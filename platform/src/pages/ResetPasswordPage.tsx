import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function ResetPasswordPage() {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isRecovery, setIsRecovery] = useState(() => window.location.hash.includes("type=recovery"));
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setIsRecovery(true);
    });

    supabase.auth.getSession().then(({ data: sessionData }) => {
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
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      toast({ title: "Não foi possível alterar a senha", description: error.message, variant: "destructive" });
      return;
    }
    setComplete(true);
    await supabase.auth.signOut();
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="glass w-full max-w-md">
        <CardHeader>
          <CardTitle>{complete ? "Senha alterada" : "Criar nova senha"}</CardTitle>
          <CardDescription>
            {complete ? "Sua nova senha já pode ser usada em qualquer dispositivo." : "Defina uma senha segura para voltar a acessar a plataforma."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {checking ? (
            <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin" /></div>
          ) : complete ? (
            <Button asChild className="w-full"><Link to="/auth">Voltar para entrar</Link></Button>
          ) : !isRecovery ? (
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>Este link de recuperação é inválido ou expirou. Solicite um novo link na tela de entrada.</p>
              <Button asChild variant="outline" className="w-full"><Link to="/auth">Voltar para entrar</Link></Button>
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
    </main>
  );
}