import { useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, MailCheck } from "lucide-react";
import hopiLogo from "@/assets/hopi-logo.jpg";

export default function AuthPage() {
  const { session, loading, signIn, signUp, resetPassword, resendConfirmation } = useAuth();
  const [searchParams] = useSearchParams();
  const rawNext = searchParams.get("next") ?? "";
  // Only same-origin relative paths are accepted as a post-login destination.
  const nextPath = /^\/(?!\/)/.test(rawNext) ? rawNext : "/dashboard";
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  if (!loading && session) return <Navigate to={nextPath} replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await signIn(loginEmail.trim(), loginPassword);
    setSubmitting(false);
    if (result.error) {
      setNeedsConfirmation(!!result.emailNotConfirmed);
      toast({ title: "Erro ao entrar", description: result.error, variant: "destructive" });
    }
  };

  const handleResendConfirmation = async () => {
    setSubmitting(true);
    const { error } = await resendConfirmation(loginEmail.trim());
    setSubmitting(false);
    if (error) {
      toast({ title: "Não foi possível reenviar", description: error, variant: "destructive" });
    } else {
      toast({ title: "Link reenviado", description: "Confira sua caixa de entrada (e o spam)." });
      setNeedsConfirmation(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupPassword !== signupConfirm) {
      toast({
        title: "Senhas não conferem",
        description: "Digite a mesma senha nos dois campos.",
        variant: "destructive",
      });
      return;
    }
    if (signupPassword.length < 8) {
      toast({ title: "Senha muito curta", description: "Use pelo menos 8 caracteres.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await signUp(signupEmail.trim(), signupPassword, signupName.trim());
    setSubmitting(false);
    if (error) {
      toast({ title: "Erro ao criar conta", description: error, variant: "destructive" });
    } else {
      toast({
        title: "Confirme seu e-mail",
        description:
          "Enviamos um link de confirmação. Depois disso, sua conta aguardará aprovação de um administrador.",
      });
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await resetPassword(resetEmail.trim());
    setSubmitting(false);
    if (error) {
      toast({ title: "Não foi possível enviar o link", description: error, variant: "destructive" });
      return;
    }
    toast({ title: "Verifique seu e-mail", description: "Enviamos um link para você criar uma nova senha." });
    setShowForgotPassword(false);
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Painel da marca (desktop) */}
      <aside className="hidden lg:flex w-[46%] xl:w-[42%] relative flex-col justify-between overflow-hidden bg-[hsl(170_100%_18%)] text-[hsl(45_50%_96%)] p-12">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "radial-gradient(55% 45% at 20% 10%, hsl(41 80% 60%), transparent 60%), radial-gradient(50% 40% at 85% 90%, hsl(152 60% 45%), transparent 60%)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <img src={hopiLogo} alt="Hopi Hari" className="size-12 rounded-xl object-cover shadow-lg" />
          <div className="font-display text-2xl font-bold tracking-tight">Hopi Hari</div>
        </div>

        <div className="relative space-y-5 max-w-md">
          <div className="brand-rule w-24" />
          <h1 className="font-display text-4xl xl:text-5xl font-black leading-[1.08]">
            O parque inteiro,
            <br />
            em um só painel.
          </h1>
          <p className="text-[hsl(45_40%_88%)]/85 text-base leading-relaxed">
            Audiência, redes sociais, vendas e visitantes do Hopi Hari — dados
            unificados para decidir com confiança.
          </p>
        </div>

        <p className="relative text-xs text-[hsl(45_40%_88%)]/60">
          Plataforma de Inteligência · uso interno Hopi Hari
        </p>
      </aside>

      {/* Formulário */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex lg:hidden items-center gap-3 mb-6">
            <img
              src={hopiLogo}
              alt="Hopi Hari"
              className="size-12 rounded-xl object-cover border border-border ring-glow shrink-0"
            />
            <div className="leading-tight">
              <h1 className="font-display text-xl font-bold tracking-tight">Hopi Hari</h1>
              <p className="text-sm text-muted-foreground">Plataforma de Inteligência</p>
            </div>
          </div>

          <div className="hidden lg:block mb-6">
            <h2 className="font-display text-2xl font-bold tracking-tight">Portal de acesso</h2>
            <p className="text-sm text-muted-foreground">Entre com sua conta para abrir a plataforma.</p>
          </div>

          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar Conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Bem-vindo de volta</CardTitle>
                  <CardDescription>Acesse com seu e-mail e senha.</CardDescription>
                </CardHeader>
                <CardContent>
                  {showForgotPassword ? (
                    <form onSubmit={handlePasswordReset} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="reset-email">E-mail da conta</Label>
                        <Input
                          id="reset-email"
                          type="email"
                          autoComplete="email"
                          required
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={submitting}>
                        {submitting && <Loader2 className="size-4 mr-2 animate-spin" />}
                        Enviar link de recuperação
                      </Button>
                      <Button type="button" variant="ghost" className="w-full" onClick={() => setShowForgotPassword(false)}>
                        Voltar para entrar
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email">E-mail</Label>
                        <Input
                          id="login-email"
                          type="email"
                          autoComplete="email"
                          autoFocus
                          placeholder="voce@hopihari.com.br"
                          required
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password">Senha</Label>
                        <div className="relative">
                          <Input
                            id="login-password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            required
                            className="pr-10"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                          />
                          <button
                            type="button"
                            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowPassword((v) => !v)}
                          >
                            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                      </div>
                      <Button type="submit" className="w-full" disabled={submitting}>
                        {submitting && <Loader2 className="size-4 mr-2 animate-spin" />}
                        Entrar
                      </Button>
                      {needsConfirmation && (
                        <Button
                          type="button"
                          variant="secondary"
                          className="w-full"
                          disabled={submitting || !loginEmail.trim()}
                          onClick={handleResendConfirmation}
                        >
                          <MailCheck className="size-4 mr-2" />
                          Reenviar link de confirmação
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="link"
                        className="w-full"
                        onClick={() => {
                          setResetEmail(loginEmail);
                          setShowForgotPassword(true);
                        }}
                      >
                        Esqueci minha senha
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="signup">
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Criar conta</CardTitle>
                  <CardDescription>
                    Após o cadastro, um administrador precisa aprovar seu acesso.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Nome completo</Label>
                      <Input
                        id="signup-name"
                        autoComplete="name"
                        required
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">E-mail</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        autoComplete="email"
                        required
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Senha</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        autoComplete="new-password"
                        required
                        minLength={8}
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm">Confirmar senha</Label>
                      <Input
                        id="signup-confirm"
                        type="password"
                        autoComplete="new-password"
                        required
                        minLength={8}
                        value={signupConfirm}
                        onChange={(e) => setSignupConfirm(e.target.value)}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting && <Loader2 className="size-4 mr-2 animate-spin" />}
                      Criar conta
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
