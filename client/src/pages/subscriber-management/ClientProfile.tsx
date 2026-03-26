import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowRight, ArrowLeft, Settings, User, FileText, Apple, Dumbbell, 
  Scale, Ruler, CheckSquare, ClipboardList, MessageCircle, Activity, Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { ClientChat } from "./components/ClientChat";

// Placeholder Tab Components for Phase 4
const PlaceholderTab = ({ title, icon: Icon, description }: any) => (
  <Card className="mt-4 border-dashed border-2 bg-muted/20">
    <CardContent className="flex flex-col items-center justify-center py-20 text-center space-y-4">
      <div className="p-4 bg-primary/10 rounded-full">
        <Icon className="h-10 w-10 text-primary" />
      </div>
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="text-muted-foreground max-w-sm">{description}</p>
    </CardContent>
  </Card>
);

export default function ClientProfile() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isRTL = i18n.language === "ar";
  const [, params] = useRoute("/subscriber-management/:clientId");
  const [, setLocation] = useLocation();
  const clientId = params?.clientId;

  const { data: clientsData, isLoading } = useQuery<any[]>({
    queryKey: ["/api/subscriber-management/clients"],
  });

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">{t("loading")}</div>;
  }

  const connection = clientsData?.find(c => c.clientId === clientId);
  if (!connection) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-bold">{isRTL ? "لم يتم العثور على المشترك" : "Client Not Found"}</h2>
        <Button onClick={() => setLocation("/subscriber-management")}>
          {isRTL ? "العودة للقائمة" : "Back to List"}
        </Button>
      </div>
    );
  }

  const { client, permissions } = connection;
  const isShadow = client.isShadowAccount;

  // Define the 12 tabs with their permission checks
  // Shadow accounts (unlinked) give owner full permission implicitly
  const hasPerm = (key: string) => isShadow || permissions?.[key] !== false;

  const tabs = [
    { id: "overview", label: isRTL ? "الأساسيات" : "Overview", icon: Activity, visible: true },
    { id: "personal", label: isRTL ? "المعلومات الشخصية" : "Personal Info", icon: User, visible: hasPerm('view_personal_info') },
    { id: "labs", label: isRTL ? "التحاليل الطبية" : "Medical Labs", icon: FileText, visible: hasPerm('view_medical_labs') },
    { id: "documents", label: isRTL ? "المستندات المرجعية" : "Source Docs", icon: ClipboardList, visible: hasPerm('view_source_documents') },
    { id: "diet", label: isRTL ? "النظام الغذائي" : "Diet Plan", icon: Apple, visible: hasPerm('view_nutrition') },
    { id: "supplements", label: isRTL ? "المكملات الغذائية" : "Supplements", icon: Heart, visible: hasPerm('view_nutrition') },
    { id: "workout", label: isRTL ? "جدول التمارين" : "Workout Schedule", icon: Dumbbell, visible: hasPerm('view_workout') },
    { id: "weight", label: isRTL ? "تتبع الوزن" : "Weight Tracking", icon: Scale, visible: hasPerm('view_measurements') },
    { id: "measurements", label: isRTL ? "القياسات الجسدية" : "Body Measurements", icon: Ruler, visible: hasPerm('view_measurements') },
    { id: "habits", label: isRTL ? "تتبع العادات" : "Habits Tracking", icon: CheckSquare, visible: hasPerm('view_habits') },
    { id: "questionnaire", label: isRTL ? "الاستبيان الصحي" : "Health Questionnaire", icon: FileText, visible: hasPerm('view_questionnaire') },
    { id: "chat", label: isRTL ? "المحادثة والملاحظات" : "Chat & Notes", icon: MessageCircle, visible: hasPerm('chat_enabled') },
  ].filter(t => t.visible);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10 mt-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 bg-card p-4 rounded-xl shadow-sm border">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setLocation("/subscriber-management")}
            className="shrink-0"
          >
            {isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
          </Button>
          <Avatar className="h-16 w-16 border-2 border-primary/20">
            <AvatarImage src={client.profileImagePath || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-xl">
              {client.firstName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {client.firstName} {client.lastName}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              {isShadow ? (
                 <Badge variant="outline" className="text-xs bg-muted">{isRTL ? 'ملف غير مربوط' : 'Unlinked Profile'}</Badge>
              ) : (
                 <Badge variant="default" className="text-xs bg-green-500 hover:bg-green-600">
                   {isRTL ? 'مربوط نشط' : 'Active Linked'}
                 </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {!isShadow && (
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">{isRTL ? "الصلاحيات" : "Permissions"}</span>
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full" dir={isRTL ? "rtl" : "ltr"}>
        <div className="bg-card rounded-xl shadow-sm border overflow-hidden p-1">
          <div className="overflow-x-auto pb-2 scrollbar-hide">
            <TabsList className="h-auto w-max inline-flex p-1 bg-transparent">
              {tabs.map((tab) => (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id}
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg px-4 py-2.5 flex items-center gap-2 whitespace-nowrap"
                >
                  <tab.icon className="h-4 w-4 shrink-0" />
                  <span>{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>

        {/* Dynamic Tab Contents */}
        {tabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="mt-4 outline-none">
            {tab.id === "overview" && (
              <PlaceholderTab 
                 icon={tab.icon} 
                 title={tab.label} 
                 description={isRTL ? "نظرة عامة على نشاط المشترك وآخر التحديثات." : "Overview of client activity and latest updates."} 
              />
            )}
            {tab.id === "personal" && (
              <PlaceholderTab 
                 icon={tab.icon} 
                 title={tab.label} 
                 description={isRTL ? "إدارة وتعديل المعلومات الشخصية للمشترك." : "Manage and edit client's personal information."} 
              />
            )}
            {tab.id === "labs" && (
              <PlaceholderTab 
                 icon={tab.icon} 
                 title={tab.label} 
                 description={isRTL ? "مراجعة وتحليل التقارير الطبية للمشترك." : "Review and analyze client's medical lab reports."} 
              />
            )}
            {tab.id === "documents" && (
              <PlaceholderTab 
                 icon={tab.icon} 
                 title={tab.label} 
                 description={isRTL ? "المستعرض الآمن للمستندات الأصلية والمرفقات." : "Secure viewer for source documents and attachments."} 
              />
            )}
            {tab.id === "diet" && (
              <PlaceholderTab 
                 icon={tab.icon} 
                 title={tab.label} 
                 description={isRTL ? "إصدار ومتابعة النظام الغذائي (Diet Builder)." : "Generate and track the Diet Plan (Diet Builder)."} 
              />
            )}
            {tab.id === "chat" && (
              <ClientChat connectionId={connection.id} currentUserId={user?.id || ""} />
            )}
            {!["overview", "personal", "labs", "documents", "diet", "chat"].includes(tab.id) && (
              <PlaceholderTab 
                 icon={tab.icon} 
                 title={tab.label} 
                 description={isRTL ? "محتوى هذه التبويبة قيد التطوير." : "Content for this tab is under development."} 
              />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
