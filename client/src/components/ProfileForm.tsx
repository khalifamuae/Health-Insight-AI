import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { User, Camera, Save, Loader2, Target } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { UserProfile } from "@shared/schema";

const profileSchema = z.object({
  phone: z.string().optional(),
  age: z.coerce.number().min(1).max(120).optional(),
  weight: z.coerce.number().min(1).max(500).optional(),
  height: z.coerce.number().min(30).max(300).optional(),
  gender: z.enum(["male", "female"]).optional(),
  fitnessGoal: z.enum(["weight_loss", "maintain", "muscle_gain"]).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  user: {
    id: string;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    profileImageUrl?: string | null;
  };
  profile?: UserProfile | null;
}

const countryCodes = [
  { code: "+966", country: "SA", flag: "🇸🇦", name: "Saudi Arabia" },
  { code: "+971", country: "AE", flag: "🇦🇪", name: "UAE" },
  { code: "+973", country: "BH", flag: "🇧🇭", name: "Bahrain" },
  { code: "+965", country: "KW", flag: "🇰🇼", name: "Kuwait" },
  { code: "+968", country: "OM", flag: "🇴🇲", name: "Oman" },
  { code: "+974", country: "QA", flag: "🇶🇦", name: "Qatar" },
  { code: "+20", country: "EG", flag: "🇪🇬", name: "Egypt" },
  { code: "+962", country: "JO", flag: "🇯🇴", name: "Jordan" },
  { code: "+961", country: "LB", flag: "🇱🇧", name: "Lebanon" },
  { code: "+964", country: "IQ", flag: "🇮🇶", name: "Iraq" },
  { code: "+212", country: "MA", flag: "🇲🇦", name: "Morocco" },
  { code: "+1", country: "US", flag: "🇺🇸", name: "USA" },
  { code: "+44", country: "GB", flag: "🇬🇧", name: "UK" },
];

export function ProfileForm({ user, profile }: ProfileFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState("+966");

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      phone: profile?.phone || "",
      age: profile?.age || undefined,
      weight: profile?.weight || undefined,
      height: profile?.height || undefined,
      gender: profile?.gender || undefined,
      fitnessGoal: profile?.fitnessGoal || "maintain",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      return apiRequest("PATCH", "/api/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({
        title: t("success"),
        description: "Profile updated successfully",
      });
    },
    onError: () => {
      toast({
        title: t("error"),
        description: "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "User";
  const initials = displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          {t("personalInfo")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex flex-col items-center gap-4 pb-6 border-b">
              <div className="relative inline-block">
                <Avatar className="h-24 w-24 border-2 border-muted">
                  <AvatarImage 
                    src={imagePreview || profile?.profileImagePath || user.profileImageUrl || undefined} 
                    alt={displayName} 
                  />
                  <AvatarFallback className="text-2xl bg-muted text-muted-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <label 
                  htmlFor="avatar-upload"
                  className="absolute -bottom-1 -end-1 p-2 bg-primary text-primary-foreground rounded-full cursor-pointer shadow-md"
                >
                  <Camera className="h-4 w-4" />
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                  data-testid="input-avatar"
                />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-lg">{displayName}</h3>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("phone")}</FormLabel>
                    <div className="flex flex-row-reverse gap-2" dir="ltr">
                      <FormControl>
                        <Input 
                          {...field} 
                          type="tel"
                          placeholder="5XX XXX XXXX"
                          className="flex-1 text-start"
                          dir="ltr"
                          data-testid="input-phone"
                        />
                      </FormControl>
                      <Select value={countryCode} onValueChange={setCountryCode}>
                        <SelectTrigger className="w-[100px] shrink-0" data-testid="select-country-code">
                          <SelectValue>
                            {countryCodes.find(c => c.code === countryCode)?.flag} {countryCode}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {countryCodes.map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                              {c.flag} {c.code} ({c.name})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("age")}</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number"
                        min={1}
                        max={120}
                        placeholder="25"
                        data-testid="input-age"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("weight")}</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number"
                        min={1}
                        step={0.1}
                        placeholder="70"
                        data-testid="input-weight"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("height")}</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number"
                        min={30}
                        max={300}
                        placeholder="170"
                        data-testid="input-height"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("gender")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-gender">
                          <SelectValue placeholder={t("gender")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">{t("male")}</SelectItem>
                        <SelectItem value="female">{t("female")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fitnessGoal"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="flex items-center gap-1.5">
                      <Target className="h-4 w-4" />
                      {t("fitnessGoal")}
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-fitness-goal">
                          <SelectValue placeholder={t("fitnessGoal")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="weight_loss">{t("goalWeightLoss")}</SelectItem>
                        <SelectItem value="maintain">{t("goalMaintain")}</SelectItem>
                        <SelectItem value="muscle_gain">{t("goalMuscleGain")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={updateProfileMutation.isPending}
              data-testid="button-save-profile"
            >
              {updateProfileMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 me-2 animate-spin" />
                  {t("loading")}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 me-2" />
                  {t("saveChanges")}
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
