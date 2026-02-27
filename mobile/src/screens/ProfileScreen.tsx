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
  Modal,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { isArabicLanguage } from '../lib/isArabic';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { queries, api } from '../lib/api';
import { pickImageFromAlbum } from '../lib/photoPicker';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { getDateCalendarPreference, setDateCalendarPreference, type CalendarType } from '../lib/dateFormat';

interface UserProfile {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  age?: number;
  gender?: 'male' | 'female';
  height?: number;
  weight?: number;
  bloodType?: string;
  fitnessGoal?: 'weight_loss' | 'maintain' | 'muscle_gain';
  subscriptionPlan?: 'free' | 'basic' | 'premium' | 'pro';
  pdfCount: number;
  profileImagePath?: string;
}

const BASE_URL = 'https://health-insight-ai.replit.app';
const BLOOD_TYPE_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const isArabic = I18nManager.isRTL;

export default function ProfileScreen({ navigation }: { navigation: any }) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { logout } = useAuth();
  const { mode: themeMode, setMode: setThemeMode, isDark, colors } = useAppTheme();
  const isArabic = isArabicLanguage();

  const [age, setAge] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [profileImagePath, setProfileImagePath] = useState('');
  const [showBloodTypeModal, setShowBloodTypeModal] = useState(false);
  const [fitnessGoal, setFitnessGoal] = useState<'weight_loss' | 'maintain' | 'muscle_gain' | null>(null);
  const [dateCalendar, setDateCalendar] = useState<CalendarType>('gregorian');

  const { data: user } = useQuery({
    queryKey: ['profile'],
    queryFn: queries.profile
  });

  const profile = user as UserProfile | undefined;

  useEffect(() => {
    if (profile) {
      if (profile.age) setAge(profile.age.toString());
      if (profile.firstName || profile.lastName) setDisplayName(`${profile.firstName || ''} ${profile.lastName || ''}`.trim());
      if (profile.profileImagePath) setProfileImagePath(profile.profileImagePath);
      if (profile.gender) setGender(profile.gender);
      if (profile.height) setHeight(profile.height.toString());
      if (profile.weight) setWeight(profile.weight.toString());
      if (profile.bloodType) setBloodType(profile.bloodType);
      if (profile.fitnessGoal) setFitnessGoal(profile.fitnessGoal);
    }
  }, [profile]);

  useEffect(() => {
    getDateCalendarPreference()
      .then(setDateCalendar)
      .catch(() => setDateCalendar('gregorian'));
  }, []);

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
    const cleanedDisplayName = displayName.trim();
    updateMutation.mutate({
      firstName: cleanedDisplayName || undefined,
      lastName: undefined,
      profileImagePath: profileImagePath || undefined,
      age: age ? parseInt(age) : undefined,
      gender: gender || undefined,
      height: height ? parseInt(height) : undefined,
      weight: weight ? parseInt(weight) : undefined,
      bloodType: bloodType || undefined,
      fitnessGoal: fitnessGoal || undefined
    });
  };

  const handlePickProfileImage = async () => {
    try {
      const albumImage = await pickImageFromAlbum();
      if (albumImage?.uri) {
        setProfileImagePath(albumImage.uri);
        return;
      }
      Alert.alert(
        isArabic ? 'تعذر اختيار صورة من الألبوم' : 'Could Not Pick Image From Album',
        isArabic
          ? 'تأكد من السماح للتطبيق بالوصول إلى الصور من إعدادات الجهاز.'
          : 'Please allow Photos access for the app from device settings.'
      );
    } catch {
      Alert.alert(
        isArabic ? 'تعذر اختيار صورة من الألبوم' : 'Could Not Pick Image From Album',
        isArabic
          ? 'تأكد من السماح للتطبيق بالوصول إلى الصور من إعدادات الجهاز.'
          : 'Please allow Photos access for the app from device settings.'
      );
    }
  };

  const handleThemePress = () => {
    Alert.alert(
      isArabic ? 'الوضع الليلي' : 'Theme Mode',
      isArabic ? 'اختر الوضع المناسب' : 'Choose your preferred mode',
      [
        {
          text: isArabic ? 'فاتح' : 'Light',
          onPress: async () => setThemeMode('light'),
        },
        {
          text: isArabic ? 'داكن' : 'Dark',
          onPress: async () => setThemeMode('dark'),
        },
        {
          text: isArabic ? 'تلقائي' : 'System',
          onPress: async () => setThemeMode('system'),
        },
        { text: isArabic ? 'إلغاء' : 'Cancel', style: 'cancel' },
      ]
    );
  };

  const themeBg = colors.background;
  const cardBg = colors.card;
  const primaryText = colors.text;
  const secondaryText = colors.mutedText;

  const toggleLanguage = () => {
    const newLang = isArabic ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
  };

  const handleDateCalendarPress = () => {
    Alert.alert(
      t('dateCalendar'),
      t('dateCalendarSelect'),
      [
        {
          text: t('gregorian'),
          onPress: async () => {
            await setDateCalendarPreference('gregorian');
            setDateCalendar('gregorian');
          },
        },
        {
          text: t('hijri'),
          onPress: async () => {
            await setDateCalendarPreference('hijri');
            setDateCalendar('hijri');
          },
        },
        { text: isArabic ? 'إلغاء' : 'Cancel', style: 'cancel' },
      ]
    );
  };

  const getSubscriptionInfo = () => {
    if (!profile) return { color: '#64748b', remaining: 0 };
    if (profile.subscriptionPlan === 'pro' || profile.subscriptionPlan === 'basic' || profile.subscriptionPlan === 'premium') {
      return { color: '#7c3aed', remaining: Infinity };
    }
    return { color: '#64748b', remaining: 3 - profile.pdfCount };
  };

  const subInfo = getSubscriptionInfo();

  return (
    <ScrollView style={[styles.container, { backgroundColor: themeBg }]} contentContainerStyle={styles.content}>
      <View style={styles.disclaimerSmall}>
        <Ionicons name="information-circle-outline" size={16} color="#94a3b8" />
        <Text style={styles.disclaimerSmallText}>{t('disclaimer.text')}</Text>
      </View>
      <View style={styles.header}>
        <TouchableOpacity style={styles.avatar} onPress={handlePickProfileImage} testID="button-pick-avatar">
          {profileImagePath ? (
            <Image source={{ uri: profileImagePath }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person" size={40} color="#fff" />
          )}
        </TouchableOpacity>
        <TextInput
          style={[styles.displayNameInput, { color: primaryText, borderColor: isDark ? '#334155' : '#e2e8f0', backgroundColor: isDark ? '#0f172a' : '#fff' }]}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder={isArabic ? 'اكتب الاسم أو اللقب المناسب' : 'Enter your name or nickname'}
          placeholderTextColor={secondaryText}
          testID="input-display-name"
        />
        <Text style={[styles.email, { color: secondaryText }]}>{profile?.email}</Text>
      </View>

      <View style={[styles.subscriptionCard, { backgroundColor: cardBg }]}>
        <View style={styles.subscriptionHeader}>
          <Ionicons name="diamond" size={24} color={subInfo.color} />
          <Text style={[styles.subscriptionType, { color: subInfo.color }]}>
            {t(`subscription.${profile?.subscriptionPlan || 'free'}`)}
          </Text>
        </View>
        <Text style={[styles.subscriptionRemaining, { color: secondaryText }]}>
          {subInfo.remaining === Infinity 
            ? '∞' 
            : `${Math.max(0, subInfo.remaining)} ${t('subscription.remaining')}`}
        </Text>
        {(profile?.subscriptionPlan || 'free') === 'free' && (
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => navigation.navigate('Subscription', {
              currentPlan: profile?.subscriptionPlan || 'free',
              trialEndsAt: (profile as any)?.trialEndsAt,
              isTrialActive: (profile as any)?.isTrialActive,
            })}
            testID="button-upgrade"
          >
            <Text style={styles.upgradeButtonText}>{t('subscription.upgrade')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.section, { backgroundColor: cardBg }]}>
        <Text style={[styles.sectionTitle, { color: primaryText }]}>{t('profile.age')}</Text>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: secondaryText }]}>{t('profile.age')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderColor: colors.border, color: primaryText }]}
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
            placeholder="25"
            testID="input-age"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: secondaryText }]}>{t('profile.gender')}</Text>
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
            <Text style={[styles.label, { color: secondaryText }]}>{t('profile.height')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderColor: colors.border, color: primaryText }]}
              value={height}
              onChangeText={setHeight}
              keyboardType="number-pad"
              placeholder="170"
              testID="input-height"
            />
          </View>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={[styles.label, { color: secondaryText }]}>{t('profile.weight')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderColor: colors.border, color: primaryText }]}
              value={weight}
              onChangeText={setWeight}
              keyboardType="number-pad"
              placeholder="70"
              testID="input-weight"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: secondaryText }]}>{t('profile.bloodType')}</Text>
          <TouchableOpacity
            style={[styles.selectorInput, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderColor: colors.border }]}
            onPress={() => setShowBloodTypeModal(true)}
            testID="select-blood-type"
          >
            <Text style={[styles.selectorInputText, { color: primaryText }, !bloodType && styles.selectorPlaceholder]}>
              {bloodType || (isArabic ? 'اختر فصيلة الدم' : 'Select blood type')}
            </Text>
            <Ionicons name="chevron-down" size={20} color={secondaryText} />
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: secondaryText }]}>{t('profile.fitnessGoal')}</Text>
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

      <View style={[styles.section, { backgroundColor: cardBg }]}>
        <Text style={[styles.sectionTitle, { color: primaryText }]}>{t('settings')}</Text>
        
        <TouchableOpacity 
          style={[styles.settingItem, { borderBottomColor: colors.border }]}
          onPress={toggleLanguage}
          testID="button-toggle-language"
        >
          <Ionicons name="language" size={24} color={secondaryText} />
          <Text style={[styles.settingText, { color: primaryText }]}>
            {isArabic ? 'English' : 'العربية'}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={secondaryText} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingItem, { borderBottomColor: colors.border }]}
          onPress={handleDateCalendarPress}
          testID="button-date-calendar"
        >
          <Ionicons name="calendar-outline" size={24} color={secondaryText} />
          <Text style={[styles.settingText, { color: primaryText }]}>
            {t('dateCalendar')}: {dateCalendar === 'hijri' ? t('hijri') : t('gregorian')}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={secondaryText} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingItem, { borderBottomColor: colors.border }]}
          onPress={handleThemePress}
          testID="button-theme-mode"
        >
          <Ionicons name="moon-outline" size={24} color={secondaryText} />
          <Text style={[styles.settingText, { color: primaryText }]}>
            {isArabic ? 'الوضع الليلي' : 'Theme'}: {themeMode === 'dark' ? (isArabic ? 'داكن' : 'Dark') : themeMode === 'light' ? (isArabic ? 'فاتح' : 'Light') : (isArabic ? 'تلقائي' : 'System')}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={secondaryText} />
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { backgroundColor: cardBg }]}>
        <Text style={[styles.sectionTitle, { color: primaryText }]}>{isArabic ? 'القانونية والدعم' : 'Legal & Support'}</Text>

        <TouchableOpacity
          style={[styles.settingItem, { borderBottomColor: colors.border }]}
          onPress={() => Linking.openURL(`${BASE_URL}/privacy`)}
          testID="link-privacy-profile"
        >
          <Ionicons name="shield-checkmark-outline" size={24} color={secondaryText} />
          <Text style={[styles.settingText, { color: primaryText }]}>{isArabic ? 'سياسة الخصوصية' : 'Privacy Policy'}</Text>
          <Ionicons name="open-outline" size={18} color={secondaryText} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingItem, { borderBottomColor: colors.border }]}
          onPress={() => Linking.openURL(`${BASE_URL}/terms`)}
          testID="link-terms-profile"
        >
          <Ionicons name="document-text-outline" size={24} color={secondaryText} />
          <Text style={[styles.settingText, { color: primaryText }]}>{isArabic ? 'شروط الاستخدام' : 'Terms of Use'}</Text>
          <Ionicons name="open-outline" size={18} color={secondaryText} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingItem, { borderBottomColor: colors.border }]}
          onPress={() => Linking.openURL(`${BASE_URL}/support`)}
          testID="link-support-profile"
        >
          <Ionicons name="help-circle-outline" size={24} color={secondaryText} />
          <Text style={[styles.settingText, { color: primaryText }]}>{isArabic ? 'الدعم والمساعدة' : 'Help & Support'}</Text>
          <Ionicons name="open-outline" size={18} color={secondaryText} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingItem, { borderBottomColor: colors.border }]}
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
        style={[styles.logoutButton, { backgroundColor: cardBg, borderColor: colors.border }]}
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
        <Text style={[styles.logoutText, { color: '#ef4444' }]}>{isArabic ? 'تسجيل الخروج' : 'Logout'}</Text>
      </TouchableOpacity>

      <Modal visible={showBloodTypeModal} transparent animationType="fade" onRequestClose={() => setShowBloodTypeModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.bloodTypeModalCard, { backgroundColor: cardBg }]}>
            <Text style={[styles.bloodTypeModalTitle, { color: primaryText }]}>
              {isArabic ? 'اختر فصيلة الدم' : 'Select Blood Type'}
            </Text>
            <View style={styles.bloodTypeGrid}>
              {BLOOD_TYPE_OPTIONS.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.bloodTypeOption, { borderColor: colors.border, backgroundColor: isDark ? '#0f172a' : '#fff' }, bloodType === type && styles.bloodTypeOptionSelected]}
                  onPress={() => {
                    setBloodType(type);
                    setShowBloodTypeModal(false);
                  }}
                  testID={`option-blood-type-${type}`}
                >
                  <Text style={[styles.bloodTypeOptionText, bloodType === type && styles.bloodTypeOptionTextSelected]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[styles.bloodTypeCloseBtn, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]} onPress={() => setShowBloodTypeModal(false)}>
              <Text style={styles.bloodTypeCloseBtnText}>{isArabic ? 'إلغاء' : 'Cancel'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  displayNameInput: {
    width: '90%',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    textAlign: isArabic ? 'right' : 'left',
    marginBottom: 6,
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
    flexDirection: isArabic ? 'row-reverse' : 'row',
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
    textAlign: isArabic ? 'right' : 'left'
  },
  inputGroup: {
    marginBottom: 16
  },
  label: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
    textAlign: isArabic ? 'right' : 'left'
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    textAlign: isArabic ? 'right' : 'left'
  },
  selectorInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: isArabic ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorInputText: {
    fontSize: 16,
    color: '#1e293b',
  },
  selectorPlaceholder: {
    color: '#94a3b8',
  },
  row: {
    flexDirection: isArabic ? 'row-reverse' : 'row',
    justifyContent: 'space-between'
  },
  halfWidth: {
    width: '48%'
  },
  genderButtons: {
    flexDirection: isArabic ? 'row-reverse' : 'row',
    justifyContent: 'space-between'
  },
  genderButton: {
    flex: 1,
    flexDirection: isArabic ? 'row-reverse' : 'row',
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
    flexDirection: isArabic ? 'row-reverse' : 'row',
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
    flexDirection: isArabic ? 'row-reverse' : 'row',
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
    textAlign: isArabic ? 'right' : 'left'
  },
  affiliateCard: {
    flexDirection: isArabic ? 'row-reverse' : 'row',
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
    textAlign: isArabic ? 'right' : 'left',
  },
  affiliateSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    textAlign: isArabic ? 'right' : 'left',
  },
  logoutButton: {
    flexDirection: isArabic ? 'row-reverse' : 'row',
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
    flexDirection: isArabic ? 'row-reverse' : 'row',
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
    flexDirection: isArabic ? 'row-reverse' : 'row',
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
    textAlign: isArabic ? 'right' : 'left',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  bloodTypeModalCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  bloodTypeModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: isArabic ? 'right' : 'left',
  },
  bloodTypeGrid: {
    flexDirection: isArabic ? 'row-reverse' : 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bloodTypeOption: {
    width: '23%',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  bloodTypeOptionSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  bloodTypeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  bloodTypeOptionTextSelected: {
    color: '#fff',
  },
  bloodTypeCloseBtn: {
    marginTop: 14,
    alignSelf: isArabic ? 'flex-start' : 'flex-end',
  },
  bloodTypeCloseBtnText: {
    color: '#64748b',
    fontWeight: '600',
  },
});
