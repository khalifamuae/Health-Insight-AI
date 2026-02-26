import * as SecureStore from 'expo-secure-store';

const REMINDER_NOTIFICATION_MAP_KEY = 'reminder_notification_map_v1';

async function loadNotificationsModule(): Promise<any | null> {
  try {
    const mod = await import('expo-notifications');
    return mod;
  } catch {
    console.warn('[Notifications] expo-notifications is not installed.');
    return null;
  }
}

async function readNotificationMap(): Promise<Record<string, string>> {
  try {
    const raw = await SecureStore.getItemAsync(REMINDER_NOTIFICATION_MAP_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch {
    return {};
  }
}

async function writeNotificationMap(map: Record<string, string>): Promise<void> {
  await SecureStore.setItemAsync(REMINDER_NOTIFICATION_MAP_KEY, JSON.stringify(map));
}

export async function initializeReminderNotifications(): Promise<void> {
  const Notifications = await loadNotificationsModule();
  if (!Notifications) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  const permissions = await Notifications.getPermissionsAsync();
  let status = permissions.status;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return;

  if (Notifications.AndroidImportance) {
    await Notifications.setNotificationChannelAsync('lab-reminders', {
      name: 'Lab Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3b82f6',
      sound: 'default',
    });
  }
}

export async function scheduleLabReminderNotification(params: {
  testId: string;
  testName: string;
  dueDateIso: string;
  isArabic: boolean;
}): Promise<void> {
  const Notifications = await loadNotificationsModule();
  if (!Notifications) return;

  const dueDate = new Date(params.dueDateIso);
  dueDate.setHours(9, 0, 0, 0);

  const now = new Date();
  if (dueDate < now) return;

  const map = await readNotificationMap();
  const existingNotificationId = map[params.testId];
  if (existingNotificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(existingNotificationId);
    } catch {}
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: params.isArabic ? 'تذكير بإعادة الفحص' : 'Lab Recheck Reminder',
      body: params.isArabic
        ? `اليوم تذكير بإعادة فحص ${params.testName}`
        : `Today: time to recheck ${params.testName}`,
      sound: 'default',
      data: {
        type: 'lab-reminder',
        testId: params.testId,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: dueDate,
      channelId: 'lab-reminders',
    },
  });

  map[params.testId] = notificationId;
  await writeNotificationMap(map);
}
