import * as SecureStore from 'expo-secure-store';

export type CalendarType = 'gregorian' | 'hijri';

const DATE_CALENDAR_KEY = 'dateCalendarPreference';

export async function getDateCalendarPreference(): Promise<CalendarType> {
  const saved = await SecureStore.getItemAsync(DATE_CALENDAR_KEY);
  return saved === 'hijri' ? 'hijri' : 'gregorian';
}

export async function setDateCalendarPreference(calendar: CalendarType): Promise<void> {
  await SecureStore.setItemAsync(DATE_CALENDAR_KEY, calendar);
}

export function formatAppDate(
  value: string | Date | null | undefined,
  language: string,
  calendar: CalendarType
): string {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  const isArabic = language.startsWith('ar');
  const baseLocale = isArabic ? 'ar-SA' : 'en-US';
  const locale =
    calendar === 'hijri'
      ? `${baseLocale}-u-ca-islamic-umalqura`
      : `${baseLocale}-u-ca-gregory`;

  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return date.toLocaleDateString(baseLocale);
  }
}
