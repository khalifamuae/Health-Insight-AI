import i18n from './i18n';

export function isArabicLanguage(): boolean {
  const lang = (i18n.resolvedLanguage || i18n.language || '').toLowerCase();
  return lang.startsWith('ar');
}
