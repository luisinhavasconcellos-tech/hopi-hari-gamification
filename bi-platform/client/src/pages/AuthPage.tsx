import { useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";

const hopiLogo = "/manus-storage/hopi-logo_ae1fe729.jpg";
const loginPanelArtwork = "/manus-storage/hopi-bi-login-panel_bba06877.jpg";

export default function AuthPage() {
  const { session, loading, signIn, signUp, resetPassword } = useAuth();
  const [searchParams] = useSearchParams();
  const rawNext = searchParams.get("next") ?? "";
  // Only same-origin relative paths are accepted as a post-login destination.
  const nextPath = /^\/(?!\/)/.test(rawNext) ? rawNext : "/dashboard";
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
      toast({ title: "Erro ao entrar", description: result.error, variant: "destructive" });
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
        title: "Conta criada",
        description: "Sua sessão foi iniciada. A plataforma verificará agora a aprovação do seu acesso.",
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
      <aside className="hidden lg:flex w-[46%] xl:w-[42%] relative flex-col justify-between overflow-hidden bg-primary text-primary-foreground p-12">
        <img
          src={loginPanelArtwork}
          alt=""
          aria-hidden
          className="absolute inset-0 size-full object-cover opacity-25 mix-blend-soft-light"
        />
        <div aria-hidden className="absolute inset-0 bg-primary/75" />
        <div
          aria-hidden
          className="absolute -left-24 -top-24 size-80 rounded-full bg-accent/20 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-28 -right-20 size-96 rounded-full bg-success/20 blur-3xl"
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
          <p className="text-primary-foreground/85 text-base leading-relaxed">
            Audiência, redes sociais, vendas e visitantes do Hopi Hari — dados
            unificados para decidir com confiança.
          </p>
        </div>

        <p className="relative text-xs text-primary-foreground/60">
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
                  <CardDescription>O cadastro inicia a sessão imediatamente; o acesso continua sujeito à aprovação administrativa.</CardDescription>
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
