import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Calendar, Clock } from "lucide-react";
import { format, formatDistanceToNow, isPast, isFuture } from "date-fns";
import type { Locale as DateLocale } from "date-fns";
import { arSA, enUS } from "date-fns/locale";

interface Reminder {
  id: string;
  testName: string;
  testNameAr: string;
  dueDate: Date;
  sent: boolean;
}

interface RemindersCardProps {
  reminders: Reminder[];
  isLoading?: boolean;
}

export function RemindersCard({ reminders, isLoading }: RemindersCardProps) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const dateLocale = isArabic ? arSA : enUS;

  const sortedReminders = [...reminders].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  const upcomingReminders = sortedReminders.filter(r => isFuture(new Date(r.dueDate)) && !r.sent);
  const overdueReminders = sortedReminders.filter(r => isPast(new Date(r.dueDate)) && !r.sent);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          {t("upcomingReminders")}
          {(upcomingReminders.length + overdueReminders.length) > 0 && (
            <Badge variant="secondary" className="ms-auto">
              {upcomingReminders.length + overdueReminders.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : sortedReminders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-10 w-10 mx-auto mb-2 opacity-20" />
            <p>{t("noReminders")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {overdueReminders.map((reminder) => (
              <ReminderItem 
                key={reminder.id} 
                reminder={reminder} 
                isArabic={isArabic}
                dateLocale={dateLocale}
                isOverdue
              />
            ))}
            {upcomingReminders.map((reminder) => (
              <ReminderItem 
                key={reminder.id} 
                reminder={reminder} 
                isArabic={isArabic}
                dateLocale={dateLocale}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReminderItem({ 
  reminder, 
  isArabic, 
  dateLocale,
  isOverdue 
}: { 
  reminder: Reminder; 
  isArabic: boolean; 
  dateLocale: DateLocale;
  isOverdue?: boolean;
}) {
  const dueDate = new Date(reminder.dueDate);
  
  return (
    <div 
      className={`flex items-center gap-3 p-3 rounded-lg border ${
        isOverdue 
          ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800" 
          : "bg-muted/50"
      }`}
      data-testid={`reminder-${reminder.id}`}
    >
      <div className={`p-2 rounded-lg ${
        isOverdue 
          ? "bg-red-100 dark:bg-red-900/30" 
          : "bg-primary/10"
      }`}>
        <Clock className={`h-4 w-4 ${isOverdue ? "text-red-600 dark:text-red-400" : "text-primary"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">
          {isArabic ? reminder.testNameAr : reminder.testName}
        </p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{format(dueDate, "PP", { locale: dateLocale })}</span>
          <span className="text-xs">
            ({formatDistanceToNow(dueDate, { addSuffix: true, locale: dateLocale })})
          </span>
        </div>
      </div>
      {isOverdue && (
        <Badge variant="destructive" className="shrink-0">
          Overdue
        </Badge>
      )}
    </div>
  );
}
