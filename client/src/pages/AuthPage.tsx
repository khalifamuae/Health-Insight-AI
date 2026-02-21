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
  Calendar,
  Phone,
  Mail,
  User,
  ShieldCheck,
} from "lucide-react";

export default function AuthPage() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const isArabic = i18n.language === "ar";
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [emailConfirm, setEmailConfirm] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneConfirm, setPhoneConfirm] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [dateOfBirth, setDateOfBirth] = useState("");

  const resetForm = () => {
    setEmail("");
    setEmailConfirm("");
    setPassword("");
    setPasswordConfirm("");
    setFirstName("");
    setLastName("");
    setPhone("");
    setPhoneConfirm("");
    setGender("");
    setDateOfBirth("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        if (email.trim().toLowerCase() !== emailConfirm.trim().toLowerCase()) {
          toast({ title: t("error"), description: t("authEmailMismatch"), variant: "destructive" });
          setIsLoading(false);
          return;
        }
        if (phone.trim() !== phoneConfirm.trim()) {
          toast({ title: t("error"), description: t("authPhoneMismatch"), variant: "destructive" });
          setIsLoading(false);
          return;
        }
        if (password !== passwordConfirm) {
          toast({ title: t("error"), description: t("authPasswordMismatch"), variant: "destructive" });
          setIsLoading(false);
          return;
        }
        if (!firstName.trim() || !lastName.trim()) {
          toast({ title: t("error"), description: t("authNameRequired"), variant: "destructive" });
          setIsLoading(false);
          return;
        }
        if (!gender) {
          toast({ title: t("error"), description: t("authGenderRequired"), variant: "destructive" });
          setIsLoading(false);
          return;
        }
        if (!dateOfBirth) {
          toast({ title: t("error"), description: t("authDobRequired"), variant: "destructive" });
          setIsLoading(false);
          return;
        }
        if (password.length < 6) {
          toast({ title: t("error"), description: t("authPasswordTooShort"), variant: "destructive" });
          setIsLoading(false);
          return;
        }
      }

      const endpoint = isSignUp ? "/api/auth/register" : "/api/auth/login";
      const body = isSignUp
        ? {
            email: email.trim().toLowerCase(),
            password,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phone.trim(),
            gender,
            dateOfBirth,
          }
        : { email: email.trim().toLowerCase(), password };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMsg = data.error || t("error");
        if (response.status === 409) {
          errorMsg = t("authEmailExists");
        } else if (response.status === 401) {
          errorMsg = t("authInvalidCredentials");
        }
        toast({ title: t("error"), description: errorMsg, variant: "destructive" });
        setIsLoading(false);
        return;
      }

      await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: t("success"), description: isSignUp ? t("authRegisterSuccess") : t("authLoginSuccess") });
    } catch (err) {
      toast({ title: t("error"), description: t("authNetworkError"), variant: "destructive" });
    } finally {
      setIsLoading(false);
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
              {isSignUp ? t("authCreateAccount") : t("authWelcomeBack")}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {isSignUp ? t("authCreateAccountDesc") : t("authLoginDesc")}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              {isSignUp && (
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
                    <Label className="text-xs">{t("authGender")}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        data-testid="button-gender-male"
                        onClick={() => setGender("male")}
                        className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                          gender === "male"
                            ? "border-primary bg-primary/10 text-primary font-semibold"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        {t("male")}
                      </button>
                      <button
                        type="button"
                        data-testid="button-gender-female"
                        onClick={() => setGender("female")}
                        className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                          gender === "female"
                            ? "border-primary bg-primary/10 text-primary font-semibold"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        {t("female")}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="dateOfBirth" className="text-xs">{t("authDateOfBirth")}</Label>
                    <div className="relative">
                      <Calendar className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="dateOfBirth"
                        type="date"
                        data-testid="input-date-of-birth"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="ps-8 h-9"
                        max={new Date().toISOString().split("T")[0]}
                        required
                      />
                    </div>
                  </div>
                </>
              )}

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
                    placeholder={isArabic ? "example@email.com" : "example@email.com"}
                    dir="ltr"
                    required
                  />
                </div>
              </div>

              {isSignUp && (
                <div className="space-y-1">
                  <Label htmlFor="emailConfirm" className="text-xs">{t("authConfirmEmail")}</Label>
                  <div className="relative">
                    <Mail className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="emailConfirm"
                      type="email"
                      data-testid="input-email-confirm"
                      value={emailConfirm}
                      onChange={(e) => setEmailConfirm(e.target.value)}
                      className="ps-8 h-9"
                      dir="ltr"
                      required
                    />
                  </div>
                </div>
              )}

              {isSignUp && (
                <>
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
                    <Label htmlFor="phoneConfirm" className="text-xs">{t("authConfirmPhone")}</Label>
                    <div className="relative">
                      <Phone className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phoneConfirm"
                        type="tel"
                        data-testid="input-phone-confirm"
                        value={phoneConfirm}
                        onChange={(e) => setPhoneConfirm(e.target.value)}
                        className="ps-8 h-9"
                        dir="ltr"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

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

              {isSignUp && (
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
              )}

              <Button
                type="submit"
                className="w-full h-10 mt-2"
                disabled={isLoading}
                data-testid="button-auth-submit"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin me-2" />
                ) : isSignUp ? (
                  <UserPlus className="h-4 w-4 me-2" />
                ) : (
                  <LogIn className="h-4 w-4 me-2" />
                )}
                {isSignUp ? t("authSignUp") : t("authSignIn")}
              </Button>
            </form>

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
