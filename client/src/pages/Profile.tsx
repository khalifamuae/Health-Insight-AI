import { useQuery } from "@tanstack/react-query";
import { ProfileForm } from "@/components/ProfileForm";
import { SubscriptionCard } from "@/components/SubscriptionCard";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { UserProfile } from "@shared/schema";

export default function Profile() {
  const [, setLocation] = useLocation();
  const { user, isLoading: userLoading } = useAuth();

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
      <div>
        <SubscriptionCard 
          currentPlan={profile?.subscriptionPlan || "free"}
          filesUsed={profile?.filesUploaded || 0}
          onUpgrade={() => setLocation("/subscription")}
        />
      </div>
    </div>
  );
}
