import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  Pill,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  Loader2,
  Phone,
  Mail,
  User,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";

type SignupStep = "form" | "verify";

export default function AuthPage() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const isArabic = i18n.language === "ar";
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [signupStep, setSignupStep] = useState<SignupStep>("form");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setPasswordConfirm("");
    setFirstName("");
    setLastName("");
    setPhone("");
    setVerificationCode("");
    setEmailVerified(false);
    setSignupStep("form");
  };

  const handleSendCode = async () => {
    if (!email.trim()) {
      toast({ title: t("error"), description: t("authEmailRequired"), variant: "destructive" });
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      toast({ title: t("error"), description: t("authNameRequired"), variant: "destructive" });
      return;
    }
    if (!phone.trim()) {
      toast({ title: t("error"), description: t("authPhoneRequired"), variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: t("error"), description: t("authPasswordTooShort"), variant: "destructive" });
      return;
    }
    if (password !== passwordConfirm) {
      toast({ title: t("error"), description: t("authPasswordMismatch"), variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await response.json();
      if (!response.ok) {
        let errorMsg = data.error || t("error");
        if (response.status === 409) errorMsg = t("authEmailExists");
        toast({ title: t("error"), description: errorMsg, variant: "destructive" });
        return;
      }
      toast({ title: t("success"), description: t("authCodeSent") });
      setSignupStep("verify");
    } catch {
      toast({ title: t("error"), description: t("authNetworkError"), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim() || verificationCode.length !== 6) {
      toast({ title: t("error"), description: t("authInvalidCode"), variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: verificationCode.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast({ title: t("error"), description: data.error === "Verification code expired" ? t("authCodeExpired") : t("authInvalidCode"), variant: "destructive" });
        return;
      }
      setEmailVerified(true);
      toast({ title: t("success"), description: t("authEmailVerified") });
      await handleRegister();
    } catch {
      toast({ title: t("error"), description: t("authNetworkError"), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast({ title: t("error"), description: data.error || t("error"), variant: "destructive" });
        return;
      }
      await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: t("success"), description: t("authRegisterSuccess") });
    } catch {
      toast({ title: t("error"), description: t("authNetworkError"), variant: "destructive" });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast({ title: t("error"), description: response.status === 401 ? t("authInvalidCredentials") : (data.error || t("error")), variant: "destructive" });
        return;
      }
      await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: t("success"), description: t("authLoginSuccess") });
    } catch {
      toast({ title: t("error"), description: t("authNetworkError"), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupStep === "form") {
      await handleSendCode();
    } else {
      await handleVerifyCode();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Pill className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold text-lg">{t("appName")}</span>
          </div>
          <div className="flex items-center gap-1">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto p-3 rounded-full bg-primary/10 w-fit mb-2">
              {isSignUp ? (
                <UserPlus className="h-6 w-6 text-primary" />
              ) : (
                <LogIn className="h-6 w-6 text-primary" />
              )}
            </div>
            <CardTitle className="text-xl">
              {isSignUp
                ? signupStep === "verify"
                  ? t("authVerifyEmail")
                  : t("authCreateAccount")
                : t("authWelcomeBack")}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {isSignUp
                ? signupStep === "verify"
                  ? t("authVerifyEmailDesc")
                  : t("authCreateAccountDesc")
                : t("authLoginDesc")}
            </p>
          </CardHeader>
          <CardContent>
            {isSignUp ? (
              <form onSubmit={handleSignupSubmit} className="space-y-3">
                {signupStep === "form" ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="firstName" className="text-xs">{t("authFirstName")}</Label>
                        <div className="relative">
                          <User className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="firstName"
                            data-testid="input-first-name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="ps-8 h-9"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="lastName" className="text-xs">{t("authLastName")}</Label>
                        <div className="relative">
                          <User className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="lastName"
                            data-testid="input-last-name"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="ps-8 h-9"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="email" className="text-xs">{t("email")}</Label>
                      <div className="relative">
                        <Mail className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          data-testid="input-email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="ps-8 h-9"
                          placeholder="example@email.com"
                          dir="ltr"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="phone" className="text-xs">{t("phone")}</Label>
                      <div className="relative">
                        <Phone className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          type="tel"
                          data-testid="input-phone"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="ps-8 h-9"
                          dir="ltr"
                          placeholder="+971XXXXXXXXX"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="password" className="text-xs">{t("authPassword")}</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          data-testid="input-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pe-9 h-9"
                          dir="ltr"
                          minLength={6}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute end-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                          data-testid="button-toggle-password"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="passwordConfirm" className="text-xs">{t("authConfirmPassword")}</Label>
                      <div className="relative">
                        <Input
                          id="passwordConfirm"
                          type={showPassword ? "text" : "password"}
                          data-testid="input-password-confirm"
                          value={passwordConfirm}
                          onChange={(e) => setPasswordConfirm(e.target.value)}
                          className="h-9"
                          dir="ltr"
                          minLength={6}
                          required
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-10 mt-2"
                      disabled={isLoading}
                      data-testid="button-send-code"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin me-2" />
                      ) : (
                        <Mail className="h-4 w-4 me-2" />
                      )}
                      {t("authSendCode")}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 mb-2">
                      <Mail className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm text-muted-foreground truncate" dir="ltr">{email}</span>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="verificationCode" className="text-xs">{t("authEnterCode")}</Label>
                      <Input
                        id="verificationCode"
                        data-testid="input-verification-code"
                        value={verificationCode}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                          setVerificationCode(val);
                        }}
                        className="h-12 text-center text-2xl tracking-[0.5em] font-mono"
                        dir="ltr"
                        placeholder="000000"
                        maxLength={6}
                        inputMode="numeric"
                        autoFocus
                        required
                      />
                    </div>

                    <p className="text-xs text-muted-foreground text-center">
                      {t("authCodeSentTo")}
                    </p>

                    <Button
                      type="submit"
                      className="w-full h-10 mt-2"
                      disabled={isLoading || verificationCode.length !== 6}
                      data-testid="button-verify-code"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin me-2" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 me-2" />
                      )}
                      {t("authVerifyAndRegister")}
                    </Button>

                    <div className="flex items-center justify-between mt-2">
                      <button
                        type="button"
                        onClick={() => setSignupStep("form")}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                        data-testid="button-back-to-form"
                      >
                        <ArrowLeft className="h-3 w-3" />
                        {t("authBackToForm")}
                      </button>
                      <button
                        type="button"
                        onClick={handleSendCode}
                        className="text-xs text-primary hover:underline"
                        disabled={isLoading}
                        data-testid="button-resend-code"
                      >
                        {t("authResendCode")}
                      </button>
                    </div>
                  </>
                )}
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="loginEmail" className="text-xs">{t("email")}</Label>
                  <div className="relative">
                    <Mail className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="loginEmail"
                      type="email"
                      data-testid="input-email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="ps-8 h-9"
                      placeholder="example@email.com"
                      dir="ltr"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="loginPassword" className="text-xs">{t("authPassword")}</Label>
                  <div className="relative">
                    <Input
                      id="loginPassword"
                      type={showPassword ? "text" : "password"}
                      data-testid="input-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pe-9 h-9"
                      dir="ltr"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute end-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                      data-testid="button-toggle-password"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-10 mt-2"
                  disabled={isLoading}
                  data-testid="button-auth-submit"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin me-2" />
                  ) : (
                    <LogIn className="h-4 w-4 me-2" />
                  )}
                  {t("authSignIn")}
                </Button>
              </form>
            )}

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  resetForm();
                }}
                className="text-sm text-primary hover:underline"
                data-testid="button-toggle-auth-mode"
              >
                {isSignUp ? t("authAlreadyHaveAccount") : t("authDontHaveAccount")}
              </button>
            </div>

            {!isSignUp && (
              <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span>{t("authSecureLogin")}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <footer className="border-t py-4">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground">© 2024 {t("appName")}. {isArabic ? "جميع الحقوق محفوظة" : "All rights reserved."}</p>
        </div>
      </footer>
    </div>
  );
}
