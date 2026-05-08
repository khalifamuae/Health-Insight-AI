import React, { useCallback, useMemo, useState, useLayoutEffect } from 'react';
import { Alert, I18nManager, ScrollView, StyleSheet, Text, TouchableOpacity, View, TextInput, ActivityIndicator, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { isArabicLanguage } from '../lib/isArabic';
import { useFocusEffect } from '@react-navigation/native';

import { api, queries } from '../lib/api';
import { useAppTheme } from '../context/ThemeContext';
import { useSubscription } from '../context/SubscriptionContext';

import { formatAppDate, getDateCalendarPreference, type CalendarType } from '../lib/dateFormat';
import DietPlanDisplay from '../components/DietPlanDisplay';

interface SavedPlan {
  id: string;
  planData: string | unknown;
  createdAt: string;
  authorId?: string;
  userId?: string;
}

const isArabic = I18nManager.isRTL;

export default function MyDietPlansScreen({ route, navigation }: any) {
  const { clientId } = route?.params || {};
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isPaid } = useSubscription();
  const isArabic = isArabicLanguage();
  const [dateCalendar, setDateCalendar] = useState<CalendarType>('gregorian');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [importCode, setImportCode] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const queryClient = useQueryClient();

  const { data: savedPlans, isLoading, refetch } = useQuery<SavedPlan[]>({
    queryKey: ['savedDietPlans', clientId],
    queryFn: async () => (await queries.savedDietPlans(clientId)) as SavedPlan[],
  });

  const savedPlansList = useMemo(() => (Array.isArray(savedPlans) ? savedPlans : []), [savedPlans]);

  useFocusEffect(
    useCallback(() => {
      getDateCalendarPreference()
        .then(setDateCalendar)
        .catch(() => setDateCalendar('gregorian'));
      refetch();
    }, [refetch])
  );

  useLayoutEffect(() => {
    if (clientId) {
      navigation.setOptions({
        headerLeft: () => (
          <TouchableOpacity 
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name={isArabic ? 'chevron-forward' : 'chevron-back'} size={28} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: 17, marginHorizontal: 4 }}>
               {isArabic ? 'ملف المشترك' : 'Client Profile'}
            </Text>
          </TouchableOpacity>
        ),
        headerRight: undefined
      });
    }
  }, [navigation, clientId, isArabic, colors.primary]);
  const globalTotals = useMemo(() => {
    let calories = 0, protein = 0, carbs = 0, fat = 0;
    savedPlansList.forEach(plan => {
      let parsedPlan: any = null;
      try {
        parsedPlan = typeof plan.planData === 'string' ? JSON.parse(plan.planData as string) : plan.planData;
      } catch (e) { }

      if (parsedPlan?.source === 'manual') {
        calories += Number(parsedPlan.totalCalories) || 0;
        protein += Number(parsedPlan.totalProtein) || 0;
        carbs += Number(parsedPlan.totalCarbs) || 0;
        fat += Number(parsedPlan.totalFat) || 0;
      } else if (parsedPlan?.macros) { // AI plans fallback if available
        calories += Number(parsedPlan.macros.calories) || 0;
        protein += Number(parsedPlan.macros.protein) || 0;
        carbs += Number(parsedPlan.macros.carbs) || 0;
        fat += Number(parsedPlan.macros.fat) || 0;
      }
    });
    return {
      calories: Math.round(calories),
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10,
    };
  }, [savedPlansList]);

  const translateMutation = useMutation({
    mutationFn: async ({ planId, targetLanguage }: { planId: string, targetLanguage: 'en' | 'ar' }) => {
      const res = await api.post('/api/diet-plan/translate', { planId, targetLanguage });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedDietPlans', clientId] });
    },
    onError: () => {
      Alert.alert(
        isArabic ? 'خطأ' : 'Error',
        isArabic ? 'تعذر ترجمة الخطة الغذائية' : 'Failed to translate diet plan'
      );
    }
  });

  const toggleExpand = async (id: string, planData: any) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    let parsedPlan = null;
    try {
      parsedPlan = typeof planData === 'string' ? JSON.parse(planData) : planData;
    } catch (e) { }

    if (parsedPlan) {
      const isManual = parsedPlan.source === 'manual';
      const planStr = JSON.stringify(parsedPlan);
      const isPlanContentArabic = /[\u0600-\u06FF]/.test(planStr);

      const needsTranslation = !isManual && ((isArabic && !isPlanContentArabic) || (!isArabic && isPlanContentArabic));

      if (needsTranslation) {
        setTranslatingId(id);
        setExpandedId(id);
        try {
          await translateMutation.mutateAsync({
            planId: id,
            targetLanguage: isArabic ? 'ar' : 'en'
          });
        } catch (err) {
          setExpandedId(null);
        } finally {
          setTranslatingId(null);
        }
        return;
      }
    }
    setExpandedId(id);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(clientId ? `/api/saved-diet-plans/${id}?targetClientId=${clientId}` : `/api/saved-diet-plans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedDietPlans', clientId] });
    },
    onError: () => {
      Alert.alert(
        isArabic ? 'خطأ' : 'Error',
        isArabic ? 'تعذر حذف الخطة الغذائية' : 'Failed to delete diet plan'
      );
    }
  });

  const handleDelete = (id: string) => {
    Alert.alert(
      isArabic ? 'حذف الخطة' : 'Delete Plan',
      isArabic ? 'هل أنت متأكد من حذف هذه الخطة الغذائية؟' : 'Are you sure you want to delete this diet plan?',
      [
        { text: isArabic ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: isArabic ? 'حذف' : 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(id)
        }
      ]
    );
  };
  const handleShareAllManualPlans = async () => {
    if (!isPaid()) {
      Alert.alert(
        isArabic ? 'ميزة مدفوعة' : 'Premium Feature',
        isArabic ? 'ميزة مشاركة الجداول متاحة فقط للمشتركين. قم بالترقية للاستمتاع بهذه الميزة.' : 'Sharing plans is available only for subscribers. Upgrade to enjoy this feature.',
        [
          { text: isArabic ? 'إلغاء' : 'Cancel', style: 'cancel' },
          { text: isArabic ? 'ترقية' : 'Upgrade', onPress: () => navigation.navigate('Subscription') }
        ]
      );
      return;
    }
    const allGroups: any[] = [];
    savedPlansList.forEach(p => {
      try {
        const data = typeof p.planData === 'string' ? JSON.parse(p.planData) : p.planData;
        if (data?.source === 'manual' && data.groups) {
          allGroups.push(...data.groups);
        }
      } catch (e) { }
    });

    if (allGroups.length === 0) {
      Alert.alert(isArabic ? 'لا توجد بيانات' : 'Empty', isArabic ? 'لا توجد جداول يدوية للمشاركة' : 'No manual plans to share');
      return;
    }

    let calories = 0, protein = 0, carbs = 0, fat = 0;
    allGroups.forEach(g => {
      g.items?.forEach((item: any) => {
        calories += Number(item.calories) || 0;
        protein += Number(item.protein) || 0;
        carbs += Number(item.carbs) || 0;
        fat += Number(item.fat) || 0;
      });
    });

    setIsSharing(true);
    try {
      const planData = {
        source: 'manual',
        title: isArabic ? 'جميع الجداول' : 'All Plans',
        totalCalories: calories,
        totalProtein: Math.round(protein * 10) / 10,
        totalCarbs: Math.round(carbs * 10) / 10,
        totalFat: Math.round(fat * 10) / 10,
        groups: allGroups
      };
      const res = await api.post<{ shareCode: string }>('/api/diet-plans/share', { planData });
      const appLink = 'https://apps.apple.com/ae/app/biotrack-ai/id6759469048?l=ar';
      const message = isArabic
        ? `🥗 قمت بمشاركة جميع جداولي الغذائية على تطبيق *BioTrack AI*!\n\nلتحميل الجداول، افتح التطبيق وأدخل هذا الرمز:\n📋 *${res.shareCode}*\n\n📲 حمّل التطبيق: ${appLink}`
        : `🥗 I've shared all my diet plans on *BioTrack AI*!\n\nTo download them, open the app and enter this code:\n📋 *${res.shareCode}*\n\n📲 Download the app: ${appLink}`;
      await Share.share({ message });
    } catch (e) {
      Alert.alert(isArabic ? 'خطأ' : 'Error', isArabic ? 'فشل في مشاركة الجداول' : 'Failed to share plans');
    } finally {
      setIsSharing(false);
    }
  };

  const handleDeleteAllPlans = () => {
    Alert.alert(
      isArabic ? 'تأكيد الحذف' : 'Confirm Delete All',
      isArabic ? 'هل أنت متأكد من حذف جميع الجداول اليدوية بشكل نهائي؟' : 'Are you sure you want to delete ALL manual plans permanently?',
      [
        { text: isArabic ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: isArabic ? 'حذف الكل' : 'Delete All', style: 'destructive', onPress: async () => {
            const manualIds = savedPlansList.filter(p => {
              try {
                const data = typeof p.planData === 'string' ? JSON.parse(p.planData) : p.planData;
                return data?.source === 'manual';
              } catch { return false; }
            }).map(p => p.id);

            if (manualIds.length === 0) return;

            for (const id of manualIds) {
              await api.delete(clientId ? `/api/saved-diet-plans/${id}?targetClientId=${clientId}` : `/api/saved-diet-plans/${id}`);
            }
            queryClient.invalidateQueries({ queryKey: ['savedDietPlans', clientId] });
          }
        }
      ]
    );
  };


  const handleImportPlan = async () => {
    const code = importCode.trim().toUpperCase();
    if (!code) return;
    setIsImporting(true);
    try {
      const res = await api.get<{ planData: any }>(`/api/diet-plans/shared/${code}`);
      if (res && res.planData && res.planData.groups) {
        // Automatically save it using the same structure as builder
        await api.post(clientId ? `/api/saved-diet-plans?targetClientId=${clientId}` : '/api/saved-diet-plans', { planData: res.planData });
        setImportCode('');
        Alert.alert(isArabic ? 'نجاح' : 'Success', isArabic ? 'تم استيراد الجدول بنجاح!' : 'Diet plan imported successfully!');
        queryClient.invalidateQueries({ queryKey: ['savedDietPlans', clientId] });
      } else {
        Alert.alert(isArabic ? 'فشل' : 'Failed', isArabic ? 'بيانات الجدول غير صالحة' : 'Invalid diet plan data');
      }
    } catch (error) {
      console.error(error);
      Alert.alert(isArabic ? 'خطأ' : 'Error', isArabic ? 'تأكد من صحة الرمز' : 'Please check the code and try again');
    } finally {
      setIsImporting(false);
    }
  };

  const handleSharePlan = async (parsedPlan: any) => {
    if (!isPaid()) {
      Alert.alert(
        isArabic ? 'ميزة مدفوعة' : 'Premium Feature',
        isArabic ? 'ميزة مشاركة الجداول متاحة فقط للمشتركين. قم بالترقية للاستمتاع بهذه الميزة.' : 'Sharing plans is available only for subscribers. Upgrade to enjoy this feature.',
        [
          { text: isArabic ? 'إلغاء' : 'Cancel', style: 'cancel' },
          { text: isArabic ? 'ترقية' : 'Upgrade', onPress: () => navigation.navigate('Subscription') }
        ]
      );
      return;
    }
    setIsSharing(true);
    try {
      const res = await api.post<{ shareCode: string }>('/api/diet-plans/share', { planData: parsedPlan });
      const appLink = 'https://apps.apple.com/ae/app/biotrack-ai/id6759469048?l=ar';
      const planTitle = parsedPlan?.title || (isArabic ? 'جدول غذائي' : 'Diet Plan');
      const message = isArabic
        ? `🥗 يمكنك متابعة جدولي الغذائي (${planTitle}) على تطبيق *BioTrack AI*!\n\nلتحميل الجدول، افتح التطبيق وأدخل هذا الرمز:\n📋 *${res.shareCode}*\n\n📲 حمّل التطبيق: ${appLink}`
        : `🥗 You can follow my diet plan (${planTitle}) on *BioTrack AI*!\n\nTo download it, open the app and enter this code:\n📋 *${res.shareCode}*\n\n📲 Download the app: ${appLink}`;
      await Share.share({ message });
    } catch (e) {
      Alert.alert(isArabic ? 'خطأ' : 'Error', isArabic ? 'فشل في مشاركة الجدول' : 'Failed to share plan');
    } finally {
      setIsSharing(false);
    }
  };

  const handleShareGroup = async (group: any) => {
    if (!isPaid()) {
      Alert.alert(
        isArabic ? 'ميزة مدفوعة' : 'Premium Feature',
        isArabic ? 'ميزة مشاركة الجداول متاحة فقط للمشتركين. قم بالترقية للاستمتاع بهذه الميزة.' : 'Sharing plans is available only for subscribers. Upgrade to enjoy this feature.',
        [
          { text: isArabic ? 'إلغاء' : 'Cancel', style: 'cancel' },
          { text: isArabic ? 'ترقية' : 'Upgrade', onPress: () => navigation.navigate('Subscription') }
        ]
      );
      return;
    }
    setIsSharing(true);
    try {
      let calories = 0, protein = 0, carbs = 0, fat = 0;
      if (group.items) {
        group.items.forEach((item: any) => {
          calories += Number(item.calories) || 0;
          protein += Number(item.protein) || 0;
          carbs += Number(item.carbs) || 0;
          fat += Number(item.fat) || 0;
        });
      }
      const planData = {
        source: 'manual',
        title: group.name,
        totalCalories: calories,
        totalProtein: Math.round(protein * 10) / 10,
        totalCarbs: Math.round(carbs * 10) / 10,
        totalFat: Math.round(fat * 10) / 10,
        groups: [group]
      };
      const res = await api.post<{ shareCode: string }>('/api/diet-plans/share', { planData });
      const appLink = 'https://apps.apple.com/ae/app/biotrack-ai/id6759469048?l=ar';
      const message = isArabic
        ? `🥗 يمكنك متابعة جدولي الغذائي (${group.name}) على تطبيق *BioTrack AI*!\n\nلتحميل الجدول، افتح التطبيق وأدخل هذا الرمز:\n📋 *${res.shareCode}*\n\n📲 حمّل التطبيق: ${appLink}`
        : `🥗 You can follow my diet plan (${group.name}) on *BioTrack AI*!\n\nTo download it, open the app and enter this code:\n📋 *${res.shareCode}*\n\n📲 Download the app: ${appLink}`;
      await Share.share({ message });
    } catch (e) {
      Alert.alert(isArabic ? 'خطأ' : 'Error', isArabic ? 'فشل في مشاركة المجموعة' : 'Failed to share group');
    } finally {
      setIsSharing(false);
    }
  };

  const handleDeleteGroup = (planId: string, groupId: string, parsedPlan: any) => {
    Alert.alert(
      isArabic ? 'تأكيد الحذف' : 'Confirm Delete',
      isArabic ? 'هل أنت متأكد من حذف هذه المجموعة بالكامل؟' : 'Are you sure you want to delete this group?',
      [
        { text: isArabic ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: isArabic ? 'حذف' : 'Delete', style: 'destructive', onPress: async () => {
            try {
              const newGroups = parsedPlan.groups.filter((g: any) => g.id !== groupId);
              if (newGroups.length === 0) {
                deleteMutation.mutate(planId);
                return;
              }
              let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;
              newGroups.forEach((g: any) => {
                g.items?.forEach((item: any) => {
                  totalCalories += Number(item.calories) || 0;
                  totalProtein += Number(item.protein) || 0;
                  totalCarbs += Number(item.carbs) || 0;
                  totalFat += Number(item.fat) || 0;
                });
              });
              const newPlanData = {
                ...parsedPlan,
                groups: newGroups,
                totalCalories: Math.round(totalCalories),
                totalProtein: Math.round(totalProtein * 10) / 10,
                totalCarbs: Math.round(totalCarbs * 10) / 10,
                totalFat: Math.round(totalFat * 10) / 10
              };
              await api.put(clientId ? `/api/saved-diet-plans/${planId}?targetClientId=${clientId}` : `/api/saved-diet-plans/${planId}`, { planData: newPlanData });
              queryClient.invalidateQueries({ queryKey: ['savedDietPlans', clientId] });
            } catch (e) {
              Alert.alert(isArabic ? 'خطأ' : 'Error', isArabic ? 'فشل الحذف' : 'Failed to delete');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        <View style={[styles.noteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="information-circle" size={18} color={colors.primary} />
          <Text style={[styles.noteText, { color: colors.text, textAlign: 'left' }]}>
            {isArabic
              ? 'ملاحظة: يُفضّل تحديث الجدول الغذائي كل شهر للحصول على أفضل النتائج.'
              : 'Note: For best results, update your diet plan every month.'}
          </Text>
        </View>

        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              style={[{ flex: 1, backgroundColor: colors.card, color: colors.text, borderColor: colors.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, textAlign: 'left' }]}
              placeholder={isArabic ? 'كود الجدول (استيراد)...' : 'Shared plan code (Import)...'}
              placeholderTextColor={colors.mutedText}
              value={importCode}
              onChangeText={setImportCode}
              autoCapitalize="characters"
            />
            <TouchableOpacity style={{ backgroundColor: isImporting ? colors.mutedText : '#10b981', paddingHorizontal: 16, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }} onPress={handleImportPlan} disabled={isImporting}>
              {isImporting ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="download-outline" size={22} color="#fff" />}
            </TouchableOpacity>
          </View>
          {(!savedPlansList.some(p => p.authorId && p.authorId !== p.userId) && savedPlansList.some(p => { try { const data = typeof p.planData === 'string' ? JSON.parse(p.planData) : p.planData; return data?.source === 'manual'; } catch { return false; } })) && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity style={[styles.planHeader, { flex: 1, backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff', justifyContent: 'center', alignItems: 'center', borderColor: '#3b82f6', borderWidth: 1 }]} onPress={handleShareAllManualPlans}>
                <Ionicons name="share-social-outline" size={18} color="#3b82f6" />
                <Text style={{ color: '#3b82f6', fontWeight: 'bold', marginHorizontal: 6 }}>{isArabic ? 'مشاركة الكل' : 'Share All'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.planHeader, { flex: 1, backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2', justifyContent: 'center', alignItems: 'center', borderColor: '#ef4444', borderWidth: 1 }]} onPress={handleDeleteAllPlans}>
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
                <Text style={{ color: '#ef4444', fontWeight: 'bold', marginHorizontal: 6 }}>{isArabic ? 'حذف الكل' : 'Delete All'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {isLoading ? (
          <Text style={[styles.infoText, { color: colors.mutedText }]}>
            {isArabic ? 'جاري تحميل الجداول...' : 'Loading plans...'}
          </Text>
        ) : savedPlansList.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="document-text-outline" size={42} color={colors.mutedText} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {isArabic ? 'لا توجد جداول محفوظة بعد' : 'No saved plans yet'}
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedText }]}>
              {isArabic
                ? 'أنشئ جدولًا غذائيًا يدوياً أو بواسطة AI ثم احفظه هنا.'
                : 'Create a diet plan manually or with AI, then save it here.'}
            </Text>
          </View>
        ) : (
          savedPlansList.map((plan, index) => {
            const isExpanded = expandedId === plan.id;
            const isProtected = plan.authorId && plan.authorId !== plan.userId;
            let parsedPlan: any = null;
            try {
              parsedPlan = typeof plan.planData === 'string' ? JSON.parse(plan.planData as string) : plan.planData;
            } catch (e) { }

            const isManual = parsedPlan?.source === 'manual';

            return (
              <View key={plan.id} style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.planHeaderContainer}>
                  <TouchableOpacity activeOpacity={0.7} style={styles.planHeader} onPress={() => toggleExpand(plan.id, plan.planData)}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={[styles.planTitle, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
                          {isManual
                            ? (parsedPlan?.title || (parsedPlan?.groups && parsedPlan.groups.length > 0 ? parsedPlan.groups.map((g: any) => g.name).join(' + ') : (isArabic ? 'جدول يدوي' : 'Manual Plan')))
                            : (isArabic ? `الخطة رقم ${savedPlansList.length - index}` : `Plan #${savedPlansList.length - index}`)}
                        </Text>
                        <View style={{ backgroundColor: isManual ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                          <Text style={{ color: isManual ? '#22c55e' : '#f59e0b', fontSize: 9, fontWeight: '700' }}>
                            {isManual ? (isArabic ? 'يدوي' : 'Manual') : 'AI'}
                          </Text>
                        </View>
                        {isProtected && (
                          <View style={{ backgroundColor: 'rgba(59,130,246,0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                             <Text style={{ color: '#3b82f6', fontSize: 9, fontWeight: '700' }}>{isArabic ? 'صُمم بواسطة المدرب' : 'Trainer Designed'}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.planDate, { color: colors.mutedText }]}>
                        {formatAppDate(plan.createdAt, i18n.language, dateCalendar)}
                      </Text>
                      {/* Show macros summary for manual plans */}
                      {isManual && parsedPlan && (
                        <View style={{ flexDirection: 'row', marginTop: 6, gap: 8 }}>
                          <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>{parsedPlan.totalCalories} {isArabic ? 'سعرة' : 'Cal'}</Text>
                          <Text style={{ color: '#3b82f6', fontSize: 12 }}>P:{parsedPlan.totalProtein}g</Text>
                          <Text style={{ color: '#f59e0b', fontSize: 12 }}>C:{parsedPlan.totalCarbs}g</Text>
                          <Text style={{ color: '#ef4444', fontSize: 12 }}>F:{parsedPlan.totalFat}g</Text>
                        </View>
                      )}
                    </View>
                    <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={24} color={colors.text} />
                  </TouchableOpacity>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {isManual && (
                      <TouchableOpacity
                        style={[styles.deleteButton, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff' }]}
                        onPress={() => navigation.navigate(clientId ? 'SharedDietBuilder' : 'ManualDietBuilder', { editPlanId: plan.id, clientId })}
                      >
                        <Ionicons name="pencil" size={20} color="#3b82f6" />
                      </TouchableOpacity>
                    )}
                    {isManual && !isProtected && (
                      <TouchableOpacity
                        style={[styles.deleteButton, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff' }]}
                        onPress={() => handleSharePlan(parsedPlan)}
                      >
                        <Ionicons name="share-social-outline" size={20} color="#3b82f6" />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDelete(plan.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                {isExpanded && (
                  <View style={[styles.planContentContainer, { borderTopColor: colors.border }]}>
                    {isManual && (parsedPlan?.groups || parsedPlan?.items) ? (
                      <View style={{ gap: 8 }}>
                        {parsedPlan.groups ? parsedPlan.groups.map((group: any, gIdx: number) => (
                          <View key={gIdx} style={{ marginBottom: 12 }}>

                            <View style={{ backgroundColor: isDark ? 'rgba(30, 41, 59, 0.4)' : '#f8fafc', borderRadius: 12, paddingHorizontal: 12 }}>
                              {group.items.map((item: any, idx: number) => (
                                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: idx < group.items.length - 1 ? StyleSheet.hairlineWidth : 0, borderBottomColor: colors.border }}>
                                  <View style={{ flex: 1, paddingEnd: 8 }}>
                                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', textAlign: 'left' }} numberOfLines={2}>
                                      {isArabic ? item.nameAr : item.nameEn}
                                    </Text>
                                    <Text style={{ color: colors.mutedText, fontSize: 12, marginTop: 4, textAlign: 'left' }}>
                                      {item.quantity} {item.unit}
                                    </Text>
                                  </View>
                                  <View style={{ alignItems: 'flex-end', marginStart: 4 }}>
                                    <Text style={{ color: colors.primary, fontSize: 15, fontWeight: '700', textAlign: 'right' }}>{item.calories} {isArabic ? 'سعرة' : 'Cal'}</Text>
                                    <Text style={{ color: colors.mutedText, fontSize: 10, marginTop: 2, textAlign: 'right' }}>P:{item.protein}g C:{item.carbs}g F:{item.fat}g</Text>
                                  </View>
                                </View>
                              ))}
                            </View>
                          </View>
                        )) : parsedPlan.items.map((item: any, idx: number) => (
                          <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: idx < parsedPlan.items.length - 1 ? StyleSheet.hairlineWidth : 0, borderBottomColor: colors.border }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
                                {isArabic ? item.nameAr : item.nameEn}
                              </Text>
                              <Text style={{ color: colors.mutedText, fontSize: 12, marginTop: 2 }}>
                                {item.quantity} {item.unit}
                              </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={{ color: colors.primary, fontSize: 15, fontWeight: '700' }}>{item.calories} {isArabic ? 'سعرة' : 'Cal'}</Text>
                              <Text style={{ color: colors.mutedText, fontSize: 10, marginTop: 1 }}>P:{item.protein}g C:{item.carbs}g F:{item.fat}g</Text>
                            </View>
                          </View>
                        ))}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, marginTop: 4, borderTopWidth: 1, borderTopColor: colors.border }}>
                          <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700', textAlign: 'left' }}>{isArabic ? 'الإجمالي' : 'Total'}</Text>
                          <Text style={{ color: colors.primary, fontSize: 17, fontWeight: '800', textAlign: 'right' }}>{parsedPlan.totalCalories} {isArabic ? 'سعرة' : 'Cal'}</Text>
                        </View>
                      </View>
                    ) : translatingId === plan.id ? (
                      <Text style={[styles.infoText, { color: colors.primary, marginVertical: 20 }]}>
                        {isArabic ? 'جاري ترجمة الخطة لتناسب لغة التطبيق...' : 'Translating plan to match app language...'}
                      </Text>
                    ) : parsedPlan ? (
                      <DietPlanDisplay
                        plan={parsedPlan}
                        colors={colors}
                        isDark={isDark}
                        t={t}
                        isArabicSystem={isArabic}
                      />
                    ) : null}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {savedPlansList.length > 0 && (
        <View style={[styles.globalTotalsContainer, { backgroundColor: isDark ? '#0f172a' : '#ffffff', borderTopColor: colors.border }]}>
          <Text style={{ fontSize: 13, color: colors.mutedText, marginBottom: 8, textAlign: 'center' }}>
            {isArabic ? 'إجمالي السعرات والماكروز لكل الجداول' : 'Total Macros Across All Plans'}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.primary }}>{globalTotals.calories}</Text>
              <Text style={{ fontSize: 10, color: colors.mutedText }}>{isArabic ? 'سعرة' : 'Cal'}</Text>
            </View>
            <View style={{ width: 1, backgroundColor: colors.border, height: 30 }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#3b82f6' }}>{globalTotals.protein}g</Text>
              <Text style={{ fontSize: 10, color: colors.mutedText }}>{isArabic ? 'بروتين' : 'Pro'}</Text>
            </View>
            <View style={{ width: 1, backgroundColor: colors.border, height: 30 }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#f59e0b' }}>{globalTotals.carbs}g</Text>
              <Text style={{ fontSize: 10, color: colors.mutedText }}>{isArabic ? 'كارب' : 'Carbs'}</Text>
            </View>
            <View style={{ width: 1, backgroundColor: colors.border, height: 30 }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#ef4444' }}>{globalTotals.fat}g</Text>
              <Text style={{ fontSize: 10, color: colors.mutedText }}>{isArabic ? 'دهون' : 'Fat'}</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 110,
    gap: 10,
  },
  noteCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'left',
  },
  infoText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDesc: {
    marginTop: 6,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  planCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  planHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  planHeader: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    padding: 6,
  },
  planTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  planDate: {
    fontSize: 12,
    marginTop: 4,
  },
  planContentContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  globalTotalsContainer: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    paddingBottom: 105,
    borderTopWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
});
