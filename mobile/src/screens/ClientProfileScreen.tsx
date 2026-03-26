import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, TextInput, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppTheme } from '../context/ThemeContext';
import { isArabicLanguage } from '../lib/isArabic';
import { api, queries } from '../lib/api';

export default function ClientProfileScreen({ route, navigation }: any) {
  const { clientId, connectionId, subscriptionStartDate, subscriptionEndDate, traineeGoal, clientFirstName, clientLastName, clientProfileImage } = route.params;
  const { colors, isDark } = useAppTheme();
  const { t } = useTranslation();
  const isArabic = isArabicLanguage();

  const { data: profile, isLoading } = useQuery<any>({
    queryKey: ['clientProfile', clientId],
    queryFn: () => queries.profile(clientId),
  });

  const { data: tests } = useQuery<any[]>({
    queryKey: ['tests', clientId],
    queryFn: () => queries.allTests(clientId).then((res: any) => Array.isArray(res) ? res : res.data || []),
  });

  const bodyFatTest = tests?.find((t: any) => t.testId === 'inbody-body-fat-percentage');
  const muscleMassTest = tests?.find((t: any) => t.testId === 'inbody-skeletal-muscle-mass');

  const queryClient = useQueryClient();
  const [subStart, setSubStart] = React.useState(subscriptionStartDate ? new Date(subscriptionStartDate).toISOString().split('T')[0] : '');
  const [subEnd, setSubEnd] = React.useState(subscriptionEndDate ? new Date(subscriptionEndDate).toISOString().split('T')[0] : '');
  const [goal, setGoal] = React.useState(traineeGoal || 'maintain');

  const updateSubMutation = useMutation({
    mutationFn: () => api.patch(`/api/subscriber-management/subscription-dates/${connectionId}`, {
      subscriptionStartDate: subStart || null,
      subscriptionEndDate: subEnd || null,
      traineeGoal: goal || null
    }),
    onSuccess: () => {
      Alert.alert(isArabic ? 'تم الحفظ' : 'Saved', isArabic ? 'تم تحديث تواريخ الاشتراك بنجاح' : 'Subscription dates updated successfully');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    }
  });

  if (isLoading) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>{isArabic ? 'لم يتم العثور على بيانات هذا المشترك' : 'Client data not found'}</Text>
      </View>
    );
  }

  // Debug: Force a manual alert dialog to trace the parameter execution
  if (__DEV__) {
    console.log("CLIENT ID:", clientId, "PROFILE NAME:", profile.firstName);
  }

  const navigateToFeature = (screenName: string, additionalParams?: any) => {
    navigation.navigate('Main', {
      screen: screenName,
      params: { clientId, ...additionalParams },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Custom Header with Back Button */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerText, { color: colors.text, textAlign: 'center', width: '100%', fontSize: 18 }]}>
          {isArabic ? 'بيانات المتدرب' : 'Trainee Data'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Personal Metrics Dashboard Area */}
        <View style={[styles.statsHero, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 12 }}>
            {clientProfileImage || profile?.profileImagePath ? (
              <View style={{ width: 64, height: 64, borderRadius: 32, overflow: 'hidden', marginRight: isArabic ? 0 : 16, marginLeft: isArabic ? 16 : 0 }}>
                {/* We use Image from react-native */}
                <Image source={{ uri: clientProfileImage || profile?.profileImagePath }} style={{ width: '100%', height: '100%' }} />
              </View>
            ) : (
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center', marginRight: isArabic ? 0 : 16, marginLeft: isArabic ? 16 : 0 }}>
                <Ionicons name="person" size={32} color={colors.text} />
              </View>
            )}
            <View style={{ alignItems: isArabic ? 'flex-end' : 'flex-start' }}>
              <Text style={[styles.statsHeroTitle, { color: colors.text, marginBottom: 0 }]}>
                 {clientFirstName || profile?.firstName} {clientLastName || profile?.lastName}
              </Text>
              <Text style={[styles.statsHeroSubtitle, { color: '#22c55e', marginTop: 4 }]}>
                {isArabic ? 'حساب نشط ومربوط' : 'Active Connected Client'}
              </Text>
            </View>
          </View>

          <View style={[styles.statsContainer, { backgroundColor: isDark ? '#1e293b' : '#f8fafc' }]}>
            <View style={styles.statRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>{isArabic ? 'تاريخ الربط' : 'Linked On'}</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {profile.linkedAt ? new Date(profile.linkedAt).toLocaleDateString(isArabic ? 'ar' : 'en-US') : '--'}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>{isArabic ? 'فصيلة الدم' : 'Blood'}</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>{profile.bloodType || '--'}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>{isArabic ? 'العمر' : 'Age'}</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>{profile.age ? `${profile.age}` : '--'}</Text>
              </View>
            </View>
            <View style={styles.statRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>{isArabic ? 'الوزن' : 'Weight'}</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>{profile.weight ? `${profile.weight} kg` : '--'}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>{isArabic ? 'دهون الجسم' : 'Body Fat'}</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>{bodyFatTest?.value ? `${bodyFatTest.value}%` : '--'}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>{isArabic ? 'كتلة العضلات' : 'Muscle'}</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>{muscleMassTest?.value ? `${muscleMassTest.value} kg` : '--'}</Text>
              </View>
            </View>
            <View style={styles.statRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>{isArabic ? 'الطول' : 'Height'}</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>{profile.height ? `${profile.height} cm` : '--'}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>{isArabic ? 'الجنس' : 'Sex'}</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {profile.gender ? (profile.gender === 'male' ? (isArabic ? 'ذكر' : 'Male') : (isArabic ? 'أنثى' : 'Female')) : '--'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {connectionId && (
          <View style={{ backgroundColor: colors.card, padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 12, textAlign: isArabic ? 'right' : 'left' }}>
              {isArabic ? 'صلاحية الاشتراك' : 'Subscription Validity'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: colors.mutedText, marginBottom: 6, textAlign: isArabic ? 'right' : 'left' }}>
                  {isArabic ? 'تاريخ البدء (YYYY-MM-DD)' : 'Start Date (YYYY-MM-DD)'}
                </Text>
                <TextInput
                  style={{ backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: colors.border, borderWidth: 1, borderRadius: 8, padding: 10, color: colors.text, textAlign: isArabic ? 'right' : 'left' }}
                  value={subStart}
                  onChangeText={setSubStart}
                  placeholder="2024-01-01"
                  placeholderTextColor={colors.mutedText}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: colors.mutedText, marginBottom: 6, textAlign: isArabic ? 'right' : 'left' }}>
                   {isArabic ? 'تاريخ الانتهاء (YYYY-MM-DD)' : 'End Date (YYYY-MM-DD)'}
                </Text>
                <TextInput
                  style={{ backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: colors.border, borderWidth: 1, borderRadius: 8, padding: 10, color: colors.text, textAlign: isArabic ? 'right' : 'left' }}
                  value={subEnd}
                  onChangeText={setSubEnd}
                  placeholder="2024-12-31"
                  placeholderTextColor={colors.mutedText}
                />
              </View>
            </View>

            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 16, marginBottom: 12, textAlign: isArabic ? 'right' : 'left' }}>
              {isArabic ? 'هدف المتدرب' : 'Trainee Goal'}
            </Text>
            <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', gap: 8 }}>
              {[
                { id: 'build', labelAr: 'بناء العضلات', labelEn: 'Build Muscle' },
                { id: 'maintain', labelAr: 'الحفاظ على الوزن', labelEn: 'Maintain Weight' },
                { id: 'lose', labelAr: 'نزول الوزن', labelEn: 'Lose Weight' },
              ].map(opt => (
                <TouchableOpacity
                  key={opt.id}
                  style={{ flex: 1, paddingVertical: 8, paddingHorizontal: 4, borderRadius: 8, borderWidth: 1, borderColor: goal === opt.id ? colors.primary : colors.border, backgroundColor: goal === opt.id ? (isDark ? 'rgba(59,130,246,0.15)' : '#eff6ff') : colors.card, alignItems: 'center' }}
                  onPress={() => setGoal(opt.id)}
                >
                  <Text style={{ fontSize: 11, fontWeight: goal === opt.id ? 'bold' : 'normal', color: goal === opt.id ? colors.primary : colors.text, textAlign: 'center' }}>
                    {isArabic ? opt.labelAr : opt.labelEn}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={{ backgroundColor: colors.primary, padding: 12, borderRadius: 8, marginTop: 16, alignItems: 'center', opacity: updateSubMutation.isPending ? 0.7 : 1 }}
              onPress={() => updateSubMutation.mutate()}
              disabled={updateSubMutation.isPending}
            >
              {updateSubMutation.isPending ? (
                 <ActivityIndicator color="#fff" size="small" />
              ) : (
                 <Text style={{ color: '#fff', fontWeight: 'bold' }}>{isArabic ? 'حفظ التواريخ' : 'Save Dates'}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isArabic ? 'right' : 'left' }]}>
          {isArabic ? 'إدارة خطط المشترك' : 'Manage Client Plans'}
        </Text>

        <View style={styles.grid}>
          {/* 1. تصميم جدول تدريبي */}
          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isArabic ? 'row-reverse' : 'row' }]}
            onPress={() => navigateToFeature('WorkoutBuilder')}
          >
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(239, 68, 68, 0.15)', marginLeft: isArabic ? 16 : 0, marginRight: isArabic ? 0 : 16 }]}>
              <Ionicons name="barbell" size={28} color="#ef4444" />
            </View>
            <View style={{ flex: 1, alignItems: isArabic ? 'flex-end' : 'flex-start' }}>
              <Text style={[styles.actionTitle, { color: colors.text, textAlign: isArabic ? 'right' : 'left' }]}>
                {isArabic ? 'تصميم جدول تدريبي' : 'Create Workout Plan'}
              </Text>
              <Text style={[styles.actionDesc, { color: colors.mutedText, textAlign: isArabic ? 'right' : 'left' }]}>
                {isArabic ? 'إنشاء خطة تمرين جديدة للمتدرب' : 'Build a new workout schedule'}
              </Text>
            </View>
            <Ionicons name={isArabic ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.mutedText} />
          </TouchableOpacity>

          {/* 3. استعراض جدول التدريب (Placing related components together) */}
          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isArabic ? 'row-reverse' : 'row' }]}
            onPress={() => navigateToFeature('AssignedWorkouts')}
          >
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(249, 115, 22, 0.15)', marginLeft: isArabic ? 16 : 0, marginRight: isArabic ? 0 : 16 }]}>
              <Ionicons name="list" size={28} color="#f97316" />
            </View>
            <View style={{ flex: 1, alignItems: isArabic ? 'flex-end' : 'flex-start' }}>
              <Text style={[styles.actionTitle, { color: colors.text, textAlign: isArabic ? 'right' : 'left' }]}>
                {isArabic ? 'استعراض وتعديل جدول التدريب' : 'Review & Edit Workouts'}
              </Text>
              <Text style={[styles.actionDesc, { color: colors.mutedText, textAlign: isArabic ? 'right' : 'left' }]}>
                {isArabic ? 'إدارة الجداول الرياضية المُصممة' : 'Manage assigned workout plans'}
              </Text>
            </View>
            <Ionicons name={isArabic ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.mutedText} />
          </TouchableOpacity>

          {/* 2. تصميم جدول غذائي */}
          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isArabic ? 'row-reverse' : 'row', marginTop: 12 }]}
            onPress={() => navigateToFeature('ManualDietBuilder')}
          >
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(234, 179, 8, 0.15)', marginLeft: isArabic ? 16 : 0, marginRight: isArabic ? 0 : 16 }]}>
              <Ionicons name="restaurant" size={28} color="#eab308" />
            </View>
            <View style={{ flex: 1, alignItems: isArabic ? 'flex-end' : 'flex-start' }}>
              <Text style={[styles.actionTitle, { color: colors.text, textAlign: isArabic ? 'right' : 'left' }]}>
                {isArabic ? 'تصميم جدول غذائي' : 'Create Diet Plan'}
              </Text>
              <Text style={[styles.actionDesc, { color: colors.mutedText, textAlign: isArabic ? 'right' : 'left' }]}>
                {isArabic ? 'إنشاء نظام غذائي مخصص' : 'Build a custom diet plan'}
              </Text>
            </View>
            <Ionicons name={isArabic ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.mutedText} />
          </TouchableOpacity>

          {/* 4. استعراض الجدول الغذائي */}
          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isArabic ? 'row-reverse' : 'row' }]}
            onPress={() => navigateToFeature('MyDietPlans')}
          >
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(59, 130, 246, 0.15)', marginLeft: isArabic ? 16 : 0, marginRight: isArabic ? 0 : 16 }]}>
              <Ionicons name="nutrition" size={28} color="#3b82f6" />
            </View>
            <View style={{ flex: 1, alignItems: isArabic ? 'flex-end' : 'flex-start' }}>
              <Text style={[styles.actionTitle, { color: colors.text, textAlign: isArabic ? 'right' : 'left' }]}>
                {isArabic ? 'استعراض وتعديل الجدول الغذائي' : 'Review & Edit Diets'}
              </Text>
              <Text style={[styles.actionDesc, { color: colors.mutedText, textAlign: isArabic ? 'right' : 'left' }]}>
                {isArabic ? 'إدارة الجداول الغذائية المُصممة' : 'Manage assigned diet plans'}
              </Text>
            </View>
            <Ionicons name={isArabic ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.mutedText} />
          </TouchableOpacity>

          {/* 5. تحاليل الدم */}
          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isArabic ? 'row-reverse' : 'row', marginTop: 12 }]}
            onPress={() => navigateToFeature('Compare', { initialTab: 'lab' })}
          >
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(168, 85, 247, 0.15)', marginLeft: isArabic ? 16 : 0, marginRight: isArabic ? 0 : 16 }]}>
              <Ionicons name="medical" size={28} color="#a855f7" />
            </View>
            <View style={{ flex: 1, alignItems: isArabic ? 'flex-end' : 'flex-start' }}>
              <Text style={[styles.actionTitle, { color: colors.text, textAlign: isArabic ? 'right' : 'left' }]}>
                {isArabic ? 'التحاليل الخاصة بالمتدرب' : 'Blood Tests'}
              </Text>
              <Text style={[styles.actionDesc, { color: colors.mutedText, textAlign: isArabic ? 'right' : 'left' }]}>
                {isArabic ? 'استعراض ومقارنة فحوصات الدم المرفوعة' : 'Review and compare blood work'}
              </Text>
            </View>
            <Ionicons name={isArabic ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.mutedText} />
          </TouchableOpacity>

          {/* 6. فحوصات InBody */}
          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isArabic ? 'row-reverse' : 'row' }]}
            onPress={() => navigateToFeature('Compare', { initialTab: 'inbody' })}
          >
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.15)', marginLeft: isArabic ? 16 : 0, marginRight: isArabic ? 0 : 16 }]}>
              <Ionicons name="body" size={28} color="#10b981" />
            </View>
            <View style={{ flex: 1, alignItems: isArabic ? 'flex-end' : 'flex-start' }}>
              <Text style={[styles.actionTitle, { color: colors.text, textAlign: isArabic ? 'right' : 'left' }]}>
                {isArabic ? 'فحوصات InBody الخاصة بالمتدرب' : 'InBody Scans'}
              </Text>
              <Text style={[styles.actionDesc, { color: colors.mutedText, textAlign: isArabic ? 'right' : 'left' }]}>
                {isArabic ? 'استعراض نتائج فحوصات تكوين الجسم' : 'Body composition records'}
              </Text>
            </View>
            <Ionicons name={isArabic ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.mutedText} />
          </TouchableOpacity>

          {/* 7. الدردشة الخاصة */}
          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isArabic ? 'row-reverse' : 'row', marginTop: 12 }]}
            onPress={() => navigation.navigate('ClientChat', { connectionId, clientName: `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() })}
          >
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(236, 72, 153, 0.15)', marginLeft: isArabic ? 16 : 0, marginRight: isArabic ? 0 : 16 }]}>
              <Ionicons name="chatbubbles" size={28} color="#ec4899" />
            </View>
            <View style={{ flex: 1, alignItems: isArabic ? 'flex-end' : 'flex-start' }}>
              <Text style={[styles.actionTitle, { color: colors.text, textAlign: isArabic ? 'right' : 'left' }]}>
                {isArabic ? 'الدردشة الخاصة' : 'Private Chat'}
              </Text>
              <Text style={[styles.actionDesc, { color: colors.mutedText, textAlign: isArabic ? 'right' : 'left' }]}>
                {isArabic ? 'مشاركة الصور ومتابعة التطورات' : 'Share progress photos & chat'}
              </Text>
            </View>
            <Ionicons name={isArabic ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.mutedText} />
          </TouchableOpacity>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    paddingHorizontal: 16,
    position: 'absolute',
    bottom: 12,
    zIndex: 10,
  },
  headerText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
  },
  content: { padding: 16, paddingBottom: 100 },
  headerHero: { padding: 32, borderRadius: 16, alignItems: 'center', marginBottom: 24, borderWidth: 1 },
  statsHero: { padding: 20, borderRadius: 16, alignItems: 'center', marginBottom: 24, borderWidth: 1 },
  statsHeroTitle: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  statsHeroSubtitle: { fontSize: 13, fontWeight: '700', marginBottom: 16 },
  statsContainer: { width: '100%', borderRadius: 12, padding: 12, gap: 12 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  statBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 8 },
  statLabel: { fontSize: 11, color: '#64748b', fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
  statValue: { fontSize: 15, fontWeight: '700' },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  avatarText: { fontSize: 32, fontWeight: '700' },
  heroTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  heroSubtitle: { fontSize: 14, textAlign: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, marginHorizontal: 4 },
  grid: { gap: 12 },
  actionCard: { padding: 20, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  iconWrapper: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  actionDesc: { fontSize: 13 }
});
