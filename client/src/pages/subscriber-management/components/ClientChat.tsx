import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Loader2, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";

export function ClientChat({ connectionId, currentUserId }: { connectionId: string; currentUserId: string }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading } = useQuery<any[]>({
    queryKey: [`/api/subscriber-management/chat/${connectionId}`],
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("POST", `/api/subscriber-management/chat/${connectionId}`, { content });
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: [`/api/subscriber-management/chat/${connectionId}`] });
    }
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMutation.mutate(message);
  };

  if (isLoading) {
     return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex flex-col h-[600px] border rounded-xl bg-card">
      <div className="p-4 border-b font-semibold flex items-center gap-2 shadow-sm z-10">
        <Bot className="h-5 w-5 text-primary" /> 
        {isRTL ? "المحادثة الخاصة والملاحظات" : "Private Chat & Notes"}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
        <div className="space-y-4 flex flex-col min-h-full justify-end">
          {(!messages || messages.length === 0) ? (
            <div className="text-center text-muted-foreground self-center my-auto">
              {isRTL ? "لا توجد رسائل سابقة. ابدأ المحادثة الآن!" : "No previous messages. Start the conversation now!"}
            </div>
          ) : (
            messages.map((msg: any) => {
              const isMine = msg.senderId === currentUserId;
              return (
                <div key={msg.id} className={`flex w-full ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2 flex flex-col ${
                    isMine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"
                  }`}>
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                    <span className={`text-[10px] opacity-70 mt-1 block ${isMine ? "text-right" : "text-left"}`}>
                      {new Date(msg.createdAt).toLocaleTimeString(isRTL ? 'ar-AE' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <form onSubmit={handleSend} className="p-3 border-t flex gap-2 bg-muted/20">
        <Input 
          dir={isRTL ? "rtl" : "ltr"}
          placeholder={isRTL ? "اكتب رسالتك هنا..." : "Type your message..."}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={sendMutation.isPending}
          className="rounded-full bg-background"
        />
        <Button 
          type="submit" 
          size="icon" 
          disabled={!message.trim() || sendMutation.isPending}
          className="rounded-full shrink-0"
        >
           {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />}
        </Button>
      </form>
    </div>
  );
}
