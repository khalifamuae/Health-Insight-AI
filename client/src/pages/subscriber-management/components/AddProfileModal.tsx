import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export function AddProfileModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    gender: "male",
    dateOfBirth: "",
    height: "",
    weight: ""
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      // Calculate age from dateOfBirth if provided
      let age;
      if (data.dateOfBirth) {
        const birthDate = new Date(data.dateOfBirth);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
      }

      const res = await apiRequest("POST", "/api/subscriber-management/shadow-profile", {
        firstName: data.firstName,
        lastName: data.lastName,
        gender: data.gender,
        age,
        height: data.height ? parseFloat(data.height) : undefined,
        weight: data.weight ? parseFloat(data.weight) : undefined
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t("success"), description: isRTL ? "تم إنشاء الحساب بنجاح" : "Profile created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriber-management/clients"] });
      onOpenChange(false);
      setFormData({ firstName: "", lastName: "", gender: "male", dateOfBirth: "", height: "", weight: "" });
    },
    onError: (err: Error) => {
      toast({ title: t("error"), description: err.message, variant: "destructive" });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName) {
      toast({ title: t("error"), description: isRTL ? "الرجاء إدخال الاسم الأول والأخير" : "First and last name are required", variant: "destructive" });
      return;
    }
    mutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir={isRTL ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle>{isRTL ? "إضافة ملف جديد (غير مربوط)" : "Add New Profile (Unlinked)"}</DialogTitle>
          <DialogDescription>
            {isRTL 
              ? "إنشاء ملف جديد لعميل غير مسجل في التطبيق لإدارة جداوله الخاصة بك." 
              : "Create a new unlinked profile for a client not in the app to manage their schedules."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isRTL ? "الاسم الأول" : "First Name"}</Label>
              <Input 
                required 
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "اسم العائلة" : "Last Name"}</Label>
              <Input 
                required 
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("gender")}</Label>
            <Select 
              value={formData.gender} 
              onValueChange={(v) => setFormData({ ...formData, gender: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">{t("male")}</SelectItem>
                <SelectItem value="female">{t("female")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("weight")} ({isRTL ? "اختياري" : "Optional"})</Label>
              <Input 
                type="number"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("height")} ({isRTL ? "اختياري" : "Optional"})</Label>
              <Input 
                type="number"
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: e.target.value })}
              />
            </div>
          </div>

           <div className="space-y-2">
            <Label>{isRTL ? "تاريخ الميلاد" : "Date of Birth"} ({isRTL ? "اختياري" : "Optional"})</Label>
            <Input 
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
            />
          </div>

          <Button type="submit" className="w-full mt-4" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isRTL ? "حفظ وإنشاء الملف" : "Save and Create Profile"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
