import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Copy, CheckCircle } from "lucide-react";

export function LinkClientModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [linkCode, setLinkCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  const generateCodeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/subscriber-management/generate-link-code");
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedCode(data.code);
    },
    onError: (err: Error) => {
      toast({ title: t("error"), description: err.message, variant: "destructive" });
    }
  });

  const consumeCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/subscriber-management/consume-link-code", { code });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t("success"), description: isRTL ? "تم ربط المشترك بنجاح" : "Client linked successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriber-management/clients"] });
      onOpenChange(false);
      setLinkCode("");
      setGeneratedCode(null);
    },
    onError: (err: Error) => {
      toast({ title: t("error"), description: err.message, variant: "destructive" });
    }
  });

  const handleCopy = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ description: t("copiedToClipboard") });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir={isRTL ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle>{isRTL ? "ربط مع مشترك موجود" : "Link Existing Client"}</DialogTitle>
          <DialogDescription>
            {isRTL 
              ? "يمكنك إما توليد كود دعوة وإرساله للمشترك ليقوم بإدخاله، أو إدخال الكود الذي أرسله لك المشترك." 
              : "Generate an invite code to send to your client, or enter the code they provided."}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="generate" className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate">{isRTL ? "توليد كود" : "Generate Code"}</TabsTrigger>
            <TabsTrigger value="enter">{isRTL ? "إدخال كود" : "Enter Code"}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="generate" className="space-y-4 py-4">
            {!generatedCode ? (
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  {isRTL 
                    ? "انقر أدناه لتوليد كود صالح لمدة 4 ساعات. أرسله للمشترك ليقوم بإدخاله من حسابه." 
                    : "Click below to generate a new 4-hour linking code. Send it to the client so they can enter it."}
                </p>
                <Button 
                  onClick={() => generateCodeMutation.mutate()} 
                  disabled={generateCodeMutation.isPending}
                  className="w-full"
                >
                  {generateCodeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isRTL ? "توليد كود جديد" : "Generate New Code"}
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="bg-muted p-6 rounded-lg font-mono text-3xl tracking-widest font-bold">
                  {generatedCode}
                </div>
                <Button variant="outline" onClick={handleCopy} className="w-full">
                  {copied ? <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> : <Copy className="mr-2 h-4 w-4" />}
                  {isRTL ? "نسخ الكود" : "Copy Code"}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  {isRTL ? "ينتهي صلاحية هذا الكود خلال 4 ساعات" : "This code expires in 4 hours"}
                </p>
                <Button variant="ghost" onClick={() => setGeneratedCode(null)}>
                  {isRTL ? "توليد كود آخر" : "Generate another code"}
                </Button>
              </div>
            )}
          </TabsContent>
          <TabsContent value="enter" className="space-y-4 py-4">
             <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {isRTL 
                    ? "أدخل كود الربط المكون من 6 أرقام هنا لربط الملف." 
                    : "Enter the 6-digit link code here to connect the profile."}
                </p>
                <Input 
                  placeholder="000000" 
                  value={linkCode}
                  onChange={(e) => setLinkCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  className="text-center text-2xl tracking-widest font-mono"
                  maxLength={6}
                />
                <Button 
                  onClick={() => consumeCodeMutation.mutate(linkCode)} 
                  disabled={consumeCodeMutation.isPending || linkCode.length < 6}
                  className="w-full"
                >
                  {consumeCodeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isRTL ? "تأكيد الربط" : "Confirm Linking"}
                </Button>
             </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
