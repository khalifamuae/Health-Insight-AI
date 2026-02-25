import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  I18nManager,
  Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { queries, api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  age?: number;
  gender?: 'male' | 'female';
  height?: number;
  weight?: number;
  bloodType?: string;
  fitnessGoal?: 'weight_loss' | 'maintain' | 'muscle_gain';
  subscription: 'free' | 'pro';
  pdfCount: number;
}

const BASE_URL = 'https://health-insight-ai.replit.app';

export default function ProfileScreen({ navigation }: { navigation: any }) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { logout } = useAuth();
  const isArabic = i18n.language === 'ar';

  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [fitnessGoal, setFitnessGoal] = useState<'weight_loss' | 'maintain' | 'muscle_gain' | null>(null);

  const { data: user } = useQuery({
    queryKey: ['profile'],
    queryFn: queries.profile
  });

  const profile = user as UserProfile | undefined;

  useEffect(() => {
    if (profile) {
      if (profile.age) setAge(profile.age.toString());
      if (profile.gender) setGender(profile.gender);
      if (profile.height) setHeight(profile.height.toString());
      if (profile.weight) setWeight(profile.weight.toString());
      if (profile.bloodType) setBloodType(profile.bloodType);
      if (profile.fitnessGoal) setFitnessGoal(profile.fitnessGoal);
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<UserProfile>) => 
      api.patch('/api/profile', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      Alert.alert(t('profile.save'), t('normal'));
    },
    onError: () => {
      Alert.alert(t('errors.uploadFailed'));
    }
  });

  const handleSave = () => {
    updateMutation.mutate({
      age: age ? parseInt(age) : undefined,
      gender: gender || undefined,
      height: height ? parseInt(height) : undefined,
      weight: weight ? parseInt(weight) : undefined,
      bloodType: bloodType || undefined,
      fitnessGoal: fitnessGoal || undefined
    });
  };

  const toggleLanguage = () => {
    const newLang = isArabic ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
  };

  const getSubscriptionInfo = () => {
    if (!profile) return { color: '#64748b', remaining: 0 };
    if (profile.subscription === 'pro') {
      return { color: '#7c3aed', remaining: Infinity };
    }
    return { color: '#64748b', remaining: 3 - profile.pdfCount };
  };

  const subInfo = getSubscriptionInfo();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.disclaimerSmall}>
        <Ionicons name="information-circle-outline" size={16} color="#94a3b8" />
        <Text style={styles.disclaimerSmallText}>{t('disclaimer.text')}</Text>
      </View>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color="#fff" />
        </View>
        <Text style={styles.name}>{profile?.name || t('profile.age')}</Text>
        <Text style={styles.email}>{profile?.email}</Text>
      </View>

      <View style={styles.subscriptionCard}>
        <View style={styles.subscriptionHeader}>
          <Ionicons name="diamond" size={24} color={subInfo.color} />
          <Text style={[styles.subscriptionType, { color: subInfo.color }]}>
            {t(`subscription.${profile?.subscription || 'free'}`)}
          </Text>
        </View>
        <Text style={styles.subscriptionRemaining}>
          {subInfo.remaining === Infinity 
            ? '∞' 
            : `${Math.max(0, subInfo.remaining)} ${t('subscription.remaining')}`}
        </Text>
        {profile?.subscription !== 'pro' && (
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => navigation.navigate('Subscription', {
              currentPlan: profile?.subscription || 'free',
              trialEndsAt: (profile as any)?.trialEndsAt,
              isTrialActive: (profile as any)?.isTrialActive,
            })}
            testID="button-upgrade"
          >
            <Text style={styles.upgradeButtonText}>{t('subscription.upgrade')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.age')}</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('profile.age')}</Text>
          <TextInput
            style={styles.input}
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
            placeholder="25"
            testID="input-age"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('profile.gender')}</Text>
          <View style={styles.genderButtons}>
            <TouchableOpacity
              style={[styles.genderButton, gender === 'male' && styles.genderButtonSelected]}
              onPress={() => setGender('male')}
              testID="button-gender-male"
            >
              <Ionicons 
                name="male" 
                size={20} 
                color={gender === 'male' ? '#fff' : '#3b82f6'} 
              />
              <Text style={[
                styles.genderButtonText,
                gender === 'male' && styles.genderButtonTextSelected
              ]}>
                {t('profile.male')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.genderButton, gender === 'female' && styles.genderButtonSelected]}
              onPress={() => setGender('female')}
              testID="button-gender-female"
            >
              <Ionicons 
                name="female" 
                size={20} 
                color={gender === 'female' ? '#fff' : '#ec4899'} 
              />
              <Text style={[
                styles.genderButtonText,
                gender === 'female' && styles.genderButtonTextSelected
              ]}>
                {t('profile.female')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>{t('profile.height')}</Text>
            <TextInput
              style={styles.input}
              value={height}
              onChangeText={setHeight}
              keyboardType="number-pad"
              placeholder="170"
              testID="input-height"
            />
          </View>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>{t('profile.weight')}</Text>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              keyboardType="number-pad"
              placeholder="70"
              testID="input-weight"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('profile.bloodType')}</Text>
          <TextInput
            style={styles.input}
            value={bloodType}
            onChangeText={setBloodType}
            placeholder="A+"
            testID="input-blood-type"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('profile.fitnessGoal')}</Text>
          <View style={styles.fitnessGoalButtons}>
            <TouchableOpacity
              style={[styles.fitnessGoalButton, fitnessGoal === 'weight_loss' && styles.fitnessGoalButtonSelected]}
              onPress={() => setFitnessGoal('weight_loss')}
              testID="button-goal-weight-loss"
            >
              <Ionicons
                name="trending-down"
                size={20}
                color={fitnessGoal === 'weight_loss' ? '#fff' : '#f59e0b'}
              />
              <Text style={[
                styles.fitnessGoalButtonText,
                fitnessGoal === 'weight_loss' && styles.fitnessGoalButtonTextSelected
              ]}>
                {t('profile.goalWeightLoss')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fitnessGoalButton, fitnessGoal === 'maintain' && styles.fitnessGoalButtonSelected]}
              onPress={() => setFitnessGoal('maintain')}
              testID="button-goal-maintain"
            >
              <Ionicons
                name="swap-horizontal"
                size={20}
                color={fitnessGoal === 'maintain' ? '#fff' : '#22c55e'}
              />
              <Text style={[
                styles.fitnessGoalButtonText,
                fitnessGoal === 'maintain' && styles.fitnessGoalButtonTextSelected
              ]}>
                {t('profile.goalMaintain')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fitnessGoalButton, fitnessGoal === 'muscle_gain' && styles.fitnessGoalButtonSelected]}
              onPress={() => setFitnessGoal('muscle_gain')}
              testID="button-goal-muscle-gain"
            >
              <Ionicons
                name="trending-up"
                size={20}
                color={fitnessGoal === 'muscle_gain' ? '#fff' : '#3b82f6'}
              />
              <Text style={[
                styles.fitnessGoalButtonText,
                fitnessGoal === 'muscle_gain' && styles.fitnessGoalButtonTextSelected
              ]}>
                {t('profile.goalMuscleGain')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={updateMutation.isPending}
          testID="button-save-profile"
        >
          <Ionicons name="save" size={20} color="#fff" />
          <Text style={styles.saveButtonText}>{t('profile.save')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings')}</Text>
        
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={toggleLanguage}
          testID="button-toggle-language"
        >
          <Ionicons name="language" size={24} color="#64748b" />
          <Text style={styles.settingText}>
            {isArabic ? 'English' : 'العربية'}
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{isArabic ? 'القانونية والدعم' : 'Legal & Support'}</Text>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => Linking.openURL(`${BASE_URL}/privacy`)}
          testID="link-privacy-profile"
        >
          <Ionicons name="shield-checkmark-outline" size={24} color="#64748b" />
          <Text style={styles.settingText}>{isArabic ? 'سياسة الخصوصية' : 'Privacy Policy'}</Text>
          <Ionicons name="open-outline" size={18} color="#94a3b8" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => Linking.openURL(`${BASE_URL}/terms`)}
          testID="link-terms-profile"
        >
          <Ionicons name="document-text-outline" size={24} color="#64748b" />
          <Text style={styles.settingText}>{isArabic ? 'شروط الاستخدام' : 'Terms of Use'}</Text>
          <Ionicons name="open-outline" size={18} color="#94a3b8" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => Linking.openURL(`${BASE_URL}/support`)}
          testID="link-support-profile"
        >
          <Ionicons name="help-circle-outline" size={24} color="#64748b" />
          <Text style={styles.settingText}>{isArabic ? 'الدعم والمساعدة' : 'Help & Support'}</Text>
          <Ionicons name="open-outline" size={18} color="#94a3b8" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => {
            Alert.alert(
              isArabic ? 'حذف الحساب' : 'Delete Account',
              isArabic ? 'هل أنت متأكد من حذف حسابك؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to delete your account? This action cannot be undone.',
              [
                { text: isArabic ? 'إلغاء' : 'Cancel', style: 'cancel' },
                { text: isArabic ? 'حذف' : 'Delete', style: 'destructive', onPress: () => Linking.openURL(`${BASE_URL}/account-deletion`) },
              ]
            );
          }}
          testID="button-delete-account"
        >
          <Ionicons name="trash-outline" size={24} color="#ef4444" />
          <Text style={[styles.settingText, { color: '#ef4444' }]}>{isArabic ? 'حذف الحساب' : 'Delete Account'}</Text>
          <Ionicons name="chevron-forward" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={() => {
          Alert.alert(
            isArabic ? 'تسجيل الخروج' : 'Logout',
            isArabic ? 'هل تريد تسجيل الخروج؟' : 'Are you sure you want to logout?',
            [
              { text: isArabic ? 'إلغاء' : 'Cancel', style: 'cancel' },
              { text: isArabic ? 'خروج' : 'Logout', style: 'destructive', onPress: () => logout() },
            ]
          );
        }}
        testID="button-logout"
      >
        <Ionicons name="log-out-outline" size={22} color="#ef4444" />
        <Text style={styles.logoutText}>{isArabic ? 'تسجيل الخروج' : 'Logout'}</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  content: {
    padding: 16
  },
  header: {
    alignItems: 'center',
    marginBottom: 24
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b'
  },
  email: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4
  },
  subscriptionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  subscriptionHeader: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  subscriptionType: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 8
  },
  subscriptionRemaining: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12
  },
  upgradeButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20
  },
  upgradeButtonText: {
    color: '#fff',
    fontWeight: '600'
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: I18nManager.isRTL ? 'right' : 'left'
  },
  inputGroup: {
    marginBottom: 16
  },
  label: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
    textAlign: I18nManager.isRTL ? 'right' : 'left'
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    textAlign: I18nManager.isRTL ? 'right' : 'left'
  },
  row: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between'
  },
  halfWidth: {
    width: '48%'
  },
  genderButtons: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between'
  },
  genderButton: {
    flex: 1,
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginHorizontal: 4
  },
  genderButtonSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6'
  },
  genderButtonText: {
    fontSize: 14,
    color: '#64748b',
    marginHorizontal: 4
  },
  genderButtonTextSelected: {
    color: '#fff'
  },
  saveButton: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    borderRadius: 8,
    padding: 14,
    marginTop: 8
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 8
  },
  settingItem: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    marginHorizontal: 12,
    textAlign: I18nManager.isRTL ? 'right' : 'left'
  },
  affiliateCard: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    backgroundColor: '#faf5ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9d5ff',
    gap: 12,
  },
  affiliateIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  affiliateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7c3aed',
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  affiliateSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  logoutButton: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  fitnessGoalButtons: {
    flexDirection: 'column',
    gap: 8,
  },
  fitnessGoalButton: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  fitnessGoalButtonSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  fitnessGoalButtonText: {
    fontSize: 14,
    color: '#64748b',
  },
  fitnessGoalButtonTextSelected: {
    color: '#fff',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  disclaimerSmall: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 4,
    paddingTop: 16,
    gap: 6,
  },
  disclaimerSmallText: {
    flex: 1,
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
});
