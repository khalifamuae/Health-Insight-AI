import { useQuery } from "@tanstack/react-query";
import { ProfileForm } from "@/components/ProfileForm";
import { SubscriptionCard } from "@/components/SubscriptionCard";
import { useLocation } from "wouter";
import { Loader2, ShieldCheck, FileText, HelpCircle, Trash2, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserProfile } from "@shared/schema";

const BASE_URL = 'https://health-insight-ai.replit.app';

export default function Profile() {
  const [, setLocation] = useLocation();
  const { user, isLoading: userLoading } = useAuth();
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
    enabled: !!user,
  });

  if (userLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Please log in to view your profile</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <ProfileForm 
          user={{
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            profileImageUrl: user.profileImageUrl,
          }} 
          profile={profile} 
        />
      </div>
      <div className="space-y-6">
        <SubscriptionCard 
          currentPlan={profile?.subscriptionPlan || "free"}
          filesUsed={profile?.filesUploaded || 0}
          onUpgrade={() => setLocation("/subscription")}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{isArabic ? 'القانونية والدعم' : 'Legal & Support'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <a
              href={`${BASE_URL}/privacy`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors"
              data-testid="link-privacy-profile"
            >
              <ShieldCheck className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-sm">{isArabic ? 'سياسة الخصوصية' : 'Privacy Policy'}</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
            <a
              href={`${BASE_URL}/terms`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors"
              data-testid="link-terms-profile"
            >
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-sm">{isArabic ? 'شروط الاستخدام' : 'Terms of Use'}</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
            <a
              href={`${BASE_URL}/support`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors"
              data-testid="link-support-profile"
            >
              <HelpCircle className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-sm">{isArabic ? 'الدعم والمساعدة' : 'Help & Support'}</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
            <a
              href={`${BASE_URL}/account-deletion`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-destructive"
              data-testid="button-delete-account"
            >
              <Trash2 className="h-5 w-5" />
              <span className="flex-1 text-sm">{isArabic ? 'حذف الحساب' : 'Delete Account'}</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
