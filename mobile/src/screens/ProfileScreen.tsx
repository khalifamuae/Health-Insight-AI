import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  I18nManager,
  Linking,
  Modal,
  Image,
  Share,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { isArabicLanguage } from '../lib/isArabic';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { queries, api } from '../lib/api';
import { pickImageFromAlbum } from '../lib/photoPicker';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { useSubscription } from '../context/SubscriptionContext';

import { getDateCalendarPreference, setDateCalendarPreference, type CalendarType } from '../lib/dateFormat';
import AppTextInput from '../components/AppTextInput';

interface UserProfile {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  dateOfBirth?: string;
  age?: number;
  gender?: 'male' | 'female';
  height?: number;
  weight?: number;
  bloodType?: string;
  fitnessGoal?: 'weight_loss' | 'maintain' | 'muscle_gain';
  subscriptionPlan?: 'free' | 'basic' | 'premium' | 'pro';
  pdfCount: number;
  profileImagePath?: string;
  bio?: string;
  specialty?: string;
  yearsOfExperience?: number;
  certifications?: string[];
  galleryImages?: string[];
  transformationPhotos?: { beforeImage: string; afterImage: string; description: string }[];
  subscriberManagementActive?: boolean;
}

const BASE_URL = 'https://health-insight-ai.replit.app';
const BLOOD_TYPE_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];


export default function ProfileScreen({ navigation }: { navigation: any }) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { logout } = useAuth();
  const { mode: themeMode, setMode: setThemeMode, isDark, colors } = useAppTheme();
  const isArabic = isArabicLanguage();
  const styles = getStyles(isArabic);

  const [dateOfBirth, setDateOfBirth] = useState('');
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
  const { isTrainer } = useSubscription();
  // Trainer profile fields
  const [bio, setBio] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [certifications, setCertifications] = useState<string[]>([]);
  const [newCertification, setNewCertification] = useState('');
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [transformationPhotos, setTransformationPhotos] = useState<{ beforeImage: string; afterImage: string; description: string }[]>([]);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<string | null>(null);

  const { data: user } = useQuery({
    queryKey: ['profile'],
    queryFn: () => queries.profile()
  });

  const { data: myLinkData } = useQuery({
    queryKey: ['myLinkId'],
    queryFn: () => api.get<any>('/api/subscriber-management/my-link-id'),
  });
  const linkCode = myLinkData?.code;

  const { data: pendingRequests } = useQuery({
    queryKey: ['pendingRequests'],
    queryFn: () => api.get<any[]>('/api/subscriber-management/pending-requests'),
  });

  const approveMutation = useMutation({
    mutationFn: (connectionId: string) => api.post(`/api/subscriber-management/approve-link/${connectionId}`, { action: 'approve' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingRequests'] });
      Alert.alert(isArabic ? 'تم' : 'Success', isArabic ? 'تم ربط الحساب بنجاح' : 'Account linked successfully');
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (connectionId: string) => api.post(`/api/subscriber-management/approve-link/${connectionId}`, { action: 'reject' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pendingRequests'] })
  });

  const { data: activeTrainers } = useQuery({
    queryKey: ['activeTrainers'],
    queryFn: () => api.get<any[]>('/api/subscriber-management/active-trainers'),
  });

  const disconnectMutation = useMutation({
    mutationFn: (connectionId: string) => api.delete(`/api/subscriber-management/disconnect/${connectionId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeTrainers'] });
      Alert.alert(isArabic ? 'تم' : 'Success', isArabic ? 'تم فصل الحساب بنجاح وتم إلغاء صلاحيات المدرب.' : 'Account disconnected successfully. The trainer no longer has access.');
    }
  });

  const handleDisconnect = (connectionId: string, trainerName: string) => {
    Alert.alert(
      isArabic ? 'فصل الحساب' : 'Disconnect Account',
      isArabic ? `هل أنت متأكد من رغبتك في فصل حسابك عن المدرب ${trainerName}؟ سيتم إلغاء وصول هذه الجهة لبياناتك بالكامل.` : `Are you sure you want to disconnect your account from trainer ${trainerName}? Their access will be completely revoked.`,
      [
         { text: isArabic ? 'إلغاء' : 'Cancel', style: 'cancel' },
         { text: isArabic ? 'فصل ومسح بياناتي' : 'Disconnect & Erase Data', style: 'destructive', onPress: () => disconnectMutation.mutate(connectionId) }
      ]
    );
  };


  const profile = user as UserProfile | undefined;

  useEffect(() => {
    if (profile) {
      if (profile.dateOfBirth) setDateOfBirth(new Date(profile.dateOfBirth).toISOString().split('T')[0]);
      if (profile.age) setAge(profile.age.toString());
      if (profile.firstName || profile.lastName) setDisplayName(`${profile.firstName || ''} ${profile.lastName || ''}`.trim());
      if (profile.profileImagePath) setProfileImagePath(profile.profileImagePath);
      if (profile.gender) setGender(profile.gender);
      if (profile.height) setHeight(profile.height.toString());
      if (profile.weight) setWeight(profile.weight.toString());
      if (profile.bloodType) setBloodType(profile.bloodType);
      if (profile.fitnessGoal) setFitnessGoal(profile.fitnessGoal);
      // Trainer fields
      if (profile.bio) setBio(profile.bio);
      if (profile.specialty) setSpecialty(profile.specialty);
      if (profile.yearsOfExperience) setYearsOfExperience(profile.yearsOfExperience.toString());
      if (profile.certifications) setCertifications(profile.certifications);
      if (profile.galleryImages) setGalleryImages(profile.galleryImages);
      if (profile.transformationPhotos) setTransformationPhotos(profile.transformationPhotos as any);
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
      queryClient.invalidateQueries({ queryKey: ['trainers-public'] });
      Alert.alert(
        isArabic ? 'تم الحفظ' : 'Saved',
        isArabic ? 'تم حفظ بياناتك بنجاح' : 'Your profile has been saved successfully'
      );
    },
    onError: () => {
      Alert.alert(t('errors.uploadFailed'));
    }
  });

  const handleSave = () => {
    const cleanedDisplayName = displayName.trim();
    const parts = cleanedDisplayName.split(' ');
    const newFirstName = parts[0] || '';
    const newLastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
    
    updateMutation.mutate({
      firstName: newFirstName,
      lastName: newLastName,
      profileImagePath: profileImagePath || undefined,
      dateOfBirth: dateOfBirth || undefined,
      age: age ? parseInt(age) : undefined,
      gender: gender || undefined,
      height: height ? parseInt(height) : undefined,
      weight: weight ? parseInt(weight) : undefined,
      bloodType: bloodType || undefined,
      fitnessGoal: fitnessGoal || undefined,
      bio: bio || undefined,
      specialty: specialty || undefined,
      yearsOfExperience: yearsOfExperience ? parseInt(yearsOfExperience) : undefined,
      certifications: certifications.length > 0 ? certifications : undefined,
      galleryImages: galleryImages.length > 0 ? galleryImages : undefined,
      transformationPhotos: transformationPhotos.length > 0 ? transformationPhotos : undefined,
    } as any);
  };

  const handleAddGalleryImage = async () => {
    if (galleryImages.length >= 20) {
      Alert.alert(isArabic ? 'الحد الأقصى' : 'Limit Reached', isArabic ? 'يمكنك إضافة 20 صورة كحد أقصى' : 'You can add up to 20 images');
      return;
    }
    try {
      const img = await pickImageFromAlbum();
      if (img?.uri) setGalleryImages(prev => [...prev, img.uri]);
    } catch {}
  };

  const handleAddTransformation = async () => {
    try {
      const beforeImg = await pickImageFromAlbum();
      if (!beforeImg?.uri) return;
      Alert.alert(
        isArabic ? 'صورة بعد' : 'After Photo',
        isArabic ? 'الآن اختر صورة "بعد" التحول' : 'Now pick the "after" transformation photo',
        [{ text: isArabic ? 'اختيار' : 'Pick', onPress: async () => {
          const afterImg = await pickImageFromAlbum();
          if (!afterImg?.uri) return;
          Alert.prompt
            ? Alert.prompt(
                isArabic ? 'وصف التحول' : 'Transformation Description',
                isArabic ? 'اكتب وصفاً قصيراً (اختياري)' : 'Write a short description (optional)',
                (desc) => {
                  setTransformationPhotos(prev => [...prev, { beforeImage: beforeImg.uri, afterImage: afterImg.uri, description: desc || '' }]);
                }
              )
            : setTransformationPhotos(prev => [...prev, { beforeImage: beforeImg.uri, afterImage: afterImg.uri, description: '' }]);
        }}]
      );
    } catch {}
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

  const handleShareLinkCode = async () => {
    if (!linkCode) return;
    try {
      const appLink = 'https://apps.apple.com/ae/app/biotrack-ai/id6759469048?l=ar';
      const msg = isArabic 
        ? `مرحباً كابتن 👋\n\nهذا رمز الربط الخاص بي على تطبيق *BioTrack AI*:\n\n🔑 *${linkCode}*\n\nيمكنك إضافتي في قائمة متدربيك من خلال التطبيق.\n⚠️ الرمز صالح لمدة ساعة واحدة فقط.\n\n📲 حمّل التطبيق: ${appLink}`
        : `Hi Coach 👋\n\nHere is my link code on *BioTrack AI*:\n\n🔑 *${linkCode}*\n\nYou can add me to your trainees list through the app.\n⚠️ This code is valid for 1 hour only.\n\n📲 Download the app: ${appLink}`;
      await Share.share({
        message: msg,
      });
    } catch (error) {
       Alert.alert(isArabic ? 'خطأ' : 'Error', isArabic ? 'تعذرت المشاركة' : 'Sharing failed');
    }
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
        <AppTextInput
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
        <Text style={[styles.sectionTitle, { color: primaryText }]}>{isArabic ? 'تاريخ الميلاد والعمر' : 'DOB & Age'}</Text>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: secondaryText }]}>{isArabic ? 'تاريخ الميلاد (YYYY-MM-DD)' : 'Date of Birth (YYYY-MM-DD)'}</Text>
          <AppTextInput
            style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderColor: colors.border, color: primaryText }]}
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
            placeholder="1995-08-24"
            autoComplete="off"
            testID="input-dob"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: secondaryText }]}>{t('profile.age')}</Text>
          <AppTextInput
            style={[styles.input, { backgroundColor: isDark ? '#1e293b' : '#e2e8f0', borderColor: colors.border, color: secondaryText }]}
            value={age}
            editable={false}
            placeholder="--"
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
            <AppTextInput
              style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderColor: colors.border, color: primaryText }]}
              value={height}
              onChangeText={setHeight}
              keyboardType="number-pad"
              placeholder="170"
              autoComplete="off"
              textContentType="none"
              autoCorrect={false}
              testID="input-height"
            />
          </View>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={[styles.label, { color: secondaryText }]}>{t('profile.weight')}</Text>
            <AppTextInput
              style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderColor: colors.border, color: primaryText }]}
              value={weight}
              onChangeText={setWeight}
              keyboardType="number-pad"
              placeholder="70"
              autoComplete="off"
              textContentType="none"
              autoCorrect={false}
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

      {/* Trainer Profile Section - only for trainers */}
      {isTrainer() && (
        <View style={[styles.section, { backgroundColor: cardBg }]}>
          <View style={[styles.subscriptionHeader]}>
            <Ionicons name="ribbon-outline" size={20} color="#f59e0b" />
            <Text style={[styles.sectionTitle, { color: '#f59e0b', marginBottom: 0, marginHorizontal: 8 }]}>
              {isArabic ? 'الملف التعريفي للمدرب' : 'Trainer Profile'}
            </Text>
          </View>
          <Text style={[styles.label, { color: secondaryText, marginBottom: 16, marginTop: 4 }]}>
            {isArabic ? 'هذه المعلومات ستظهر للمتدربين عند عرض ملفك الشخصي' : 'This info will be visible to trainees viewing your profile'}
          </Text>

          {/* Bio */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: secondaryText }]}>{isArabic ? 'النبذة التعريفية' : 'Bio'}</Text>
            <AppTextInput
              style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderColor: colors.border, color: primaryText, minHeight: 100, textAlignVertical: 'top' }]}
              value={bio}
              onChangeText={setBio}
              placeholder={isArabic ? 'اكتب نبذة عن نفسك وخبراتك...' : 'Tell trainees about yourself and your experience...'}
              placeholderTextColor={secondaryText}
              multiline
              numberOfLines={4}
              testID="input-trainer-bio"
            />
          </View>

          {/* Specialty */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: secondaryText }]}>{isArabic ? 'التخصص' : 'Specialty'}</Text>
            <AppTextInput
              style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderColor: colors.border, color: primaryText }]}
              value={specialty}
              onChangeText={setSpecialty}
              placeholder={isArabic ? 'مثال: تغذية رياضية، كمال أجسام، تخسيس' : 'e.g. Sports Nutrition, Bodybuilding, Weight Loss'}
              placeholderTextColor={secondaryText}
              testID="input-trainer-specialty"
            />
          </View>

          {/* Years of Experience */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: secondaryText }]}>{isArabic ? 'سنوات الخبرة' : 'Years of Experience'}</Text>
            <AppTextInput
              style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderColor: colors.border, color: primaryText }]}
              value={yearsOfExperience}
              onChangeText={setYearsOfExperience}
              placeholder={isArabic ? 'مثال: 5' : 'e.g. 5'}
              placeholderTextColor={secondaryText}
              keyboardType="number-pad"
              testID="input-trainer-experience"
            />
          </View>

          {/* Certifications (Image-based) */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: secondaryText }]}>{isArabic ? 'الشهادات والتراخيص' : 'Certifications'}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {certifications.map((uri, idx) => (
                <View key={idx} style={{ position: 'relative' }}>
                  <TouchableOpacity onPress={() => { setSelectedGalleryImage(uri); setShowGalleryModal(true); }}>
                    <Image source={{ uri }} style={{ width: 90, height: 90, borderRadius: 12 }} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setCertifications(prev => prev.filter((_, i) => i !== idx))}
                    style={{ position: 'absolute', top: -6, right: -6, backgroundColor: '#ef4444', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' }}
                  >
                    <Ionicons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                onPress={async () => {
                  try {
                    const img = await pickImageFromAlbum();
                    if (img?.uri) setCertifications(prev => [...prev, img.uri]);
                  } catch {}
                }}
                style={{ width: 90, height: 90, borderRadius: 12, borderWidth: 2, borderColor: '#22c55e', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#0f172a' : '#f0fdf4' }}
                testID="button-add-certification"
              >
                <Ionicons name="document-attach-outline" size={24} color="#22c55e" />
                <Text style={{ fontSize: 9, color: '#22c55e', marginTop: 3, textAlign: 'center' }}>{isArabic ? 'إضافة شهادة' : 'Add Cert'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Gallery & Transformation Photos (unified) */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: secondaryText }]}>{isArabic ? 'معرض الصور والإنجازات' : 'Photos & Achievements'} ({galleryImages.length}/20)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {galleryImages.map((uri, idx) => (
                <View key={idx} style={{ position: 'relative' }}>
                  <TouchableOpacity onPress={() => { setSelectedGalleryImage(uri); setShowGalleryModal(true); }}>
                    <Image source={{ uri }} style={{ width: 90, height: 90, borderRadius: 12 }} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setGalleryImages(prev => prev.filter((_, i) => i !== idx))}
                    style={{ position: 'absolute', top: -6, right: -6, backgroundColor: '#ef4444', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' }}
                  >
                    <Ionicons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {galleryImages.length < 20 && (
                <TouchableOpacity
                  onPress={handleAddGalleryImage}
                  style={{ width: 90, height: 90, borderRadius: 12, borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#0f172a' : '#f8fafc' }}
                  testID="button-add-gallery"
                >
                  <Ionicons name="add-circle-outline" size={28} color={secondaryText} />
                  <Text style={{ fontSize: 10, color: secondaryText, marginTop: 4 }}>{isArabic ? 'إضافة' : 'Add'}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>


          {/* Save Trainer Profile */}
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={updateMutation.isPending}
            testID="button-save-trainer-profile"
          >
            <Ionicons name="save" size={20} color="#fff" />
            <Text style={styles.saveButtonText}>{isArabic ? 'حفظ الملف التعريفي' : 'Save Trainer Profile'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Gallery Image Preview Modal */}
      <Modal visible={showGalleryModal} transparent animationType="fade" onRequestClose={() => setShowGalleryModal(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' }} activeOpacity={1} onPress={() => setShowGalleryModal(false)}>
          {selectedGalleryImage && <Image source={{ uri: selectedGalleryImage }} style={{ width: '90%', height: '70%', borderRadius: 12 }} resizeMode="contain" />}
        </TouchableOpacity>
      </Modal>

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
        <Text style={[styles.sectionTitle, { color: primaryText }]}>{isArabic ? 'نظام التدريب المكتبي' : 'Trainer Access'}</Text>
        <Text style={{ fontSize: 13, color: secondaryText, marginBottom: 16, textAlign: 'left' }}>
          {isArabic 
            ? 'هذا هو الرمز التعريفي الثابت الخاص بك. يمكنك مشاركته مع مدربك ليتمكن من إرسال طلب ربط لمتابعة وتصميم جداولك.' 
            : 'This is your permanent link ID. Share it with your trainer so they can send you a request to link and manage your plans.'}
        </Text>
        
        <View style={[styles.settingItem, { borderBottomColor: linkCode ? 'transparent' : colors.border, paddingVertical: 12 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Ionicons name="finger-print-outline" size={24} color="#8b5cf6" />
            <Text style={[styles.settingText, { color: '#8b5cf6', fontWeight: 'bold', flex: 1 }]}>
              {isArabic ? 'الرمز التعريفي' : 'Your Link ID'}
            </Text>
          </View>
          
          {linkCode ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: primaryText, letterSpacing: 2 }}>{linkCode}</Text>
              <TouchableOpacity onPress={handleShareLinkCode} style={{ backgroundColor: '#3b82f6', padding: 8, borderRadius: 8, marginStart: 12 }}>
                <Ionicons name="share-social-outline" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
               <Text style={{ fontSize: 14, color: secondaryText }}>{isArabic ? 'جاري التحميل...' : 'Loading...'}</Text>
            </View>
          )}
        </View>
      </View>

      {pendingRequests && pendingRequests.length > 0 && (
        <View style={[styles.section, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: '#f59e0b', marginBottom: 8 }]}>
             <Ionicons name="notifications-outline" size={18} /> {isArabic ? 'طلبات التدريب المعلقة' : 'Pending Trainer Requests'}
          </Text>
          <Text style={{ fontSize: 13, color: secondaryText, marginBottom: 16, textAlign: 'left' }}>
            {isArabic ? 'يقوم هؤلاء المدربين بطلب إذن الربط بحسابك.' : 'These trainers are requesting access to manage your account.'}
          </Text>
          
          {pendingRequests.map((req) => (
            <View key={req.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
               <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  {req.owner.profileImagePath ? (
                    <Image source={{ uri: req.owner.profileImagePath }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }} />
                  ) : (
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                       <Ionicons name="person" size={20} color={secondaryText} />
                    </View>
                  )}
                  <View>
                     <Text style={{ color: primaryText, fontWeight: 'bold', fontSize: 15 }}>{req.owner.firstName} {req.owner.lastName}</Text>
                     <Text style={{ color: secondaryText, fontSize: 12 }}>{isArabic ? 'مدرب' : 'Trainer'}</Text>
                  </View>
               </View>
               <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity 
                    onPress={() => rejectMutation.mutate(req.id)}
                    style={{ padding: 8, borderRadius: 8, backgroundColor: '#fee2e2' }}
                  >
                    <Ionicons name="close" size={20} color="#ef4444" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => approveMutation.mutate(req.id)}
                    style={{ padding: 8, borderRadius: 8, backgroundColor: '#dcfce7' }}
                  >
                    <Ionicons name="checkmark" size={20} color="#22c55e" />
                  </TouchableOpacity>
               </View>
            </View>
          ))}
        </View>
      )}

      {activeTrainers && activeTrainers.length > 0 && (
        <View style={[styles.section, { backgroundColor: cardBg }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
             <Ionicons name="people-outline" size={18} color={colors.primary} />
             <Text style={[styles.sectionTitle, { color: colors.primary, marginBottom: 0, textAlign: isArabic ? 'right' : 'left' }]}>
               {isArabic ? 'المدربون المتصلون' : 'Active Trainers'}
             </Text>
          </View>
          <Text style={{ fontSize: 13, color: secondaryText, marginBottom: 16, textAlign: isArabic ? 'right' : 'left' }}>
            {isArabic ? 'توضيح: هؤلاء المدربون لديهم حق الوصول وإدارة برامجك الغذائية والرياضية. يمكنك إيقاف الوصول في أي وقت عبر زر الفصل.' : 'Note: These trainers have access to manage your diet and workout plans. You can revoke access at any time by unlinking.'}
          </Text>
          
          {activeTrainers.map((req) => (
            <View key={req.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
               <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  {req.owner.profileImagePath ? (
                    <Image source={{ uri: req.owner.profileImagePath }} style={{ width: 44, height: 44, borderRadius: 22, marginEnd: 12 }} />
                  ) : (
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center', marginEnd: 12 }}>
                       <Ionicons name="person" size={24} color={secondaryText} />
                    </View>
                  )}
                  <View>
                     <Text style={{ color: primaryText, fontWeight: 'bold', fontSize: 15 }}>{req.owner.firstName} {req.owner.lastName}</Text>
                     <Text style={{ color: '#22c55e', fontSize: 12, marginTop: 2 }}>{isArabic ? 'حسابك مربوط بالمدرب' : 'Linked to Trainer'}</Text>
                     {(req.subscriptionStartDate || req.subscriptionEndDate) && (
                       <Text style={{ color: secondaryText, fontSize: 11, marginTop: 4 }}>
                         {isArabic ? 'صلاحية الاشتراك:' : 'Subscription:'} {req.subscriptionStartDate ? new Date(req.subscriptionStartDate).toLocaleDateString(isArabic ? 'ar' : 'en-US') : '--'} - {req.subscriptionEndDate ? new Date(req.subscriptionEndDate).toLocaleDateString(isArabic ? 'ar' : 'en-US') : (isArabic ? 'مفتوح' : 'Open')}
                       </Text>
                     )}
                  </View>
               </View>
               <TouchableOpacity 
                 onPress={() => handleDisconnect(req.id, `${req.owner.firstName} ${req.owner.lastName}`)}
                 style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#fee2e2', flexDirection: 'row', alignItems: 'center', gap: 6 }}
               >
                 <Ionicons name="trash-outline" size={16} color="#ef4444" />
                 <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: 'bold' }}>{isArabic ? 'فصل الحساب' : 'Unlink'}</Text>
               </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

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

const getStyles = (isArabic: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    paddingBottom: 120,
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
    textAlign: 'left',
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
    flexDirection: 'row',
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
    textAlign: 'left',
  },
  inputGroup: {
    marginBottom: 16
  },
  label: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
    textAlign: 'left',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    textAlign: 'left',
  },
  selectorInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
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
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  halfWidth: {
    width: '48%'
  },
  genderButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
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
    flexDirection: 'row',
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
    flexDirection: 'row',
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
    textAlign: 'left',
  },
  affiliateCard: {
    flexDirection: 'row',
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
    textAlign: 'left',
  },
  affiliateSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    textAlign: 'left',
  },
  logoutButton: {
    flexDirection: 'row',
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
    flexDirection: 'row',
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
    flexDirection: 'row',
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
    textAlign: 'left',
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
    textAlign: 'left',
  },
  bloodTypeGrid: {
    flexDirection: 'row',
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
    alignSelf: 'flex-end',
  },
  bloodTypeCloseBtnText: {
    color: '#64748b',
    fontWeight: '600',
  },
});
