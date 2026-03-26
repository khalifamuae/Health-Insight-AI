import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Users, UserPlus, Link as LinkIcon, Search, MoreVertical, Clock, CheckCircle2, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LinkClientModal } from "./components/LinkClientModal";
import { AddProfileModal } from "./components/AddProfileModal";

export default function SubscriberManagement() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const { data: statusData } = useQuery<{ active: boolean; used: number; limit: number }>({
    queryKey: ["/api/subscriber-management/status"],
  });

  const { data: clientsData, isLoading } = useQuery<any[]>({
    queryKey: ["/api/subscriber-management/clients"],
  });

  if (statusData && !statusData.active) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
        <Users className="h-16 w-16 text-muted-foreground opacity-50" />
        <h2 className="text-2xl font-bold">{isRTL ? "غير متاح" : "Not Available"}</h2>
        <p className="text-muted-foreground max-w-sm">
          {isRTL 
            ? "هذه الميزة تتطلب اشتراك مدفوع بخاصية إدارة المشتركين." 
            : "This feature requires a premium subscription with subscriber management enabled."}
        </p>
      </div>
    );
  }

  const clients = clientsData || [];
  const filteredClients = clients.filter((c: any) => 
    c.client?.firstName?.toLowerCase().includes(search.toLowerCase()) || 
    c.client?.lastName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10 mt-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{isRTL ? "إدارة المشتركين" : "Client Management"}</h1>
          <p className="text-muted-foreground">
            {isRTL ? "إدارة ملفات متابعيك وعملائك" : "Manage your followers and clients"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2 shrink-0" onClick={() => setLinkModalOpen(true)}>
            <LinkIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{isRTL ? "ربط مشترك" : "Link Client"}</span>
            <span className="sm:hidden">{isRTL ? "ربط" : "Link"}</span>
          </Button>
          <Button className="gap-2 shrink-0" onClick={() => setAddModalOpen(true)}>
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">{isRTL ? "إضافة ملف" : "Add Profile"}</span>
            <span className="sm:hidden">{isRTL ? "إضافة" : "Add"}</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription>{isRTL ? "إجمالي الملفات" : "Total Profiles"}</CardDescription>
            <CardTitle className="text-2xl">{statusData?.used || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription>{isRTL ? "الحد الأقصى" : "Maximum Limit"}</CardDescription>
            <CardTitle className="text-2xl">{statusData?.limit || 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="relative">
        <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-muted-foreground`} />
        <Input 
          placeholder={isRTL ? "بحث عن مشترك..." : "Search client..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={isRTL ? "pr-10" : "pl-10"}
        />
      </div>

      <div className="bg-card rounded-xl border shadow-sm divide-y">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">{t("loading")}</div>
        ) : filteredClients.length === 0 ? (
          <div className="p-10 text-center flex flex-col items-center justify-center">
             <Users className="h-10 w-10 text-muted-foreground opacity-30 mb-3" />
            <div className="text-muted-foreground font-medium">
               {isRTL ? "لا يوجد مشتركين حالياً" : "No clients found."}
            </div>
          </div>
        ) : (
          filteredClients.map((conn: any) => (
            <div 
              key={conn.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-muted/50 transition-colors cursor-pointer group"
              onClick={() => setLocation(`/subscriber-management/${conn.clientId}`)}
            >
              <div className="flex items-center gap-4 flex-1">
                <Avatar className="h-12 w-12 border">
                  <AvatarImage src={conn.client?.profileImagePath || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {conn.client?.firstName?.[0] || <Users className="h-5 w-5" />}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    {conn.client?.firstName} {conn.client?.lastName}
                    {conn.client?.isShadowAccount ? (
                       <Badge variant="outline" className="text-xs">{isRTL ? 'غير مربوط' : 'Unlinked'}</Badge>
                    ) : (
                       <Badge variant="default" className="text-xs bg-green-500 hover:bg-green-600">
                         {isRTL ? 'مربوط' : 'Linked'}
                       </Badge>
                    )}
                  </h3>
                  <div className="text-sm text-muted-foreground flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(conn.client?.lastActive || conn.createdAt).toLocaleDateString(isRTL ? 'ar-AE' : 'en-US')}
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight className={`h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors ${isRTL ? 'rotate-180' : ''}`} />
            </div>
          ))
        )}
      </div>

      <LinkClientModal open={linkModalOpen} onOpenChange={setLinkModalOpen} />
      <AddProfileModal open={addModalOpen} onOpenChange={setAddModalOpen} />
    </div>
  );
}
