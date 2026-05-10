import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import { isArabicLanguage } from '../lib/isArabic';
import { useAppTheme } from '../context/ThemeContext';
import { api } from '../lib/api';

const TRAINER_DISCLAIMER_HIDE_KEY = 'trainerDisclaimerHide';

interface Trainer {
  id: string;
  name: string;
  avatarUrl: string | null;
  avgRating: number;
  totalReviews: number;
}

export default function TrainerListScreen({ navigation }: any) {
  const { colors, isDark } = useAppTheme();
  const isArabic = isArabicLanguage();
  const [search, setSearch] = useState('');
  const [pendingTrainer, setPendingTrainer] = useState<Trainer | null>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [hideDisclaimer, setHideDisclaimer] = useState(false);
  const styles = getStyles(isArabic);

  React.useEffect(() => {
    SecureStore.getItemAsync(TRAINER_DISCLAIMER_HIDE_KEY).then(v => {
      if (v === '1') setHideDisclaimer(true);
    });
  }, []);

  const goToTrainer = (t: Trainer) => {
    navigation.navigate('TrainerReviews', { trainerId: t.id, trainerName: t.name });
  };

  const handleTrainerPress = (t: Trainer) => {
    if (hideDisclaimer) {
      goToTrainer(t);
    } else {
      setDontShowAgain(false);
      setPendingTrainer(t);
    }
  };

  const handleConfirmDisclaimer = async () => {
    if (dontShowAgain) {
      await SecureStore.setItemAsync(TRAINER_DISCLAIMER_HIDE_KEY, '1');
      setHideDisclaimer(true);
    }
    const t = pendingTrainer;
    setPendingTrainer(null);
    if (t) goToTrainer(t);
  };

  const { data: trainers, isLoading, refetch } = useQuery<Trainer[]>({
    queryKey: ['trainers-public'],
    queryFn: () => api.get<Trainer[]>('/api/trainers/public'),
  });

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  const filtered = (trainers || []).filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= Math.round(rating) ? 'star' : 'star-outline'}
          size={14}
          color="#f59e0b"
        />
      );
    }
    return stars;
  };

  const renderTrainer = ({ item }: { item: Trainer }) => (
    <TouchableOpacity
      style={[styles.trainerCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => handleTrainerPress(item)}
      testID={`trainer-card-${item.id}`}
    >
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]}>
        {item.avatarUrl ? (
          <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        ) : (
          <Ionicons name="person" size={28} color={isDark ? '#94a3b8' : '#64748b'} />
        )}
      </View>

      {/* Info */}
      <View style={styles.trainerInfo}>
        <Text style={[styles.trainerName, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.ratingRow}>
          <View style={styles.starsRow}>{renderStars(item.avgRating)}</View>
          <Text style={[styles.ratingText, { color: '#f59e0b' }]}>
            {item.avgRating > 0 ? item.avgRating.toFixed(1) : '-'}
          </Text>
          <Text style={[styles.reviewCount, { color: colors.mutedText }]}>
            ({item.totalReviews} {isArabic ? 'تقييم' : item.totalReviews === 1 ? 'review' : 'reviews'})
          </Text>
        </View>
      </View>

      {/* Arrow */}
      <Ionicons name="chevron-forward" size={20} color={colors.mutedText} />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
          <Ionicons name="search" size={18} color={colors.mutedText} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={isArabic ? 'ابحث عن مدرب...' : 'Search trainers...'}
            placeholderTextColor={colors.mutedText}
            value={search}
            onChangeText={setSearch}
            textAlign={isArabic ? 'right' : 'left'}
            testID="input-search-trainer"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.mutedText} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Info banner */}
      <View style={[styles.infoBanner, { backgroundColor: isDark ? '#1e3a2e' : '#f0fdf4', borderColor: isDark ? '#16a34a30' : '#bbf7d0' }]}>
        <Ionicons name="information-circle" size={18} color="#16a34a" />
        <Text style={[styles.infoText, { color: isDark ? '#86efac' : '#166534' }]}>
          {isArabic
            ? 'تواصل مع المدربين واطلع على تقييمات المتدربين قبل الاشتراك'
            : 'Browse trainers and read reviews before subscribing'}
        </Text>
      </View>


      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderTrainer}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={colors.mutedText} />
            <Text style={[styles.emptyTitle, { color: colors.mutedText }]}>
              {isArabic ? 'لا يوجد مدربين' : 'No trainers found'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedText }]}>
              {isArabic
                ? 'لم يتم العثور على مدربين مسجلين حالياً'
                : 'No registered trainers at the moment'}
            </Text>
          </View>
        }
      />

      {/* Disclaimer Modal */}
      <Modal
        visible={!!pendingTrainer}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingTrainer(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Ionicons name="warning" size={22} color="#f59e0b" />
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {isArabic ? 'إخلاء مسؤولية' : 'Disclaimer'}
              </Text>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={[styles.disclaimerIntro, { color: colors.text }]}>
                {isArabic
                  ? 'يُعد تطبيق BioTrack AI منصة وسيطة تهدف إلى تسهيل التواصل بين المستخدمين والمدربين المعتمدين فقط، ولا يُشكّل طرفاً في أي علاقة تعاقدية أو مهنية تنشأ بينهما.'
                  : 'BioTrack AI is an intermediary platform that facilitates communication between users and certified trainers only. It is not a party to any contractual or professional relationship between them.'}
              </Text>
              <Text style={[styles.disclaimerSubtitle, { color: colors.text }]}>
                {isArabic ? 'النقاط الرئيسية:' : 'Key points:'}
              </Text>
              {(isArabic
                ? [
                    'لا يتحمل التطبيق أي مسؤولية عن جودة الخدمات المقدمة من المدربين أو نتائجها',
                    'لا يتحمل التطبيق أي مسؤولية عن أي التزامات أو اتفاقيات مالية أو غير مالية بين المستخدم والمدرب',
                    'لا يتحمل التطبيق أي مسؤولية عن أي أضرار جسدية أو صحية أو مادية قد تنتج عن اتباع تعليمات المدرب',
                    'يتحمل الطرفان كامل المسؤولية عن التحقق من المؤهلات والشهادات',
                  ]
                : [
                    'The app is not responsible for the quality or outcomes of services provided by trainers',
                    'The app is not responsible for any financial or non-financial agreements between users and trainers',
                    "The app is not responsible for any physical, health, or material damages resulting from following a trainer's instructions",
                    'Both parties are fully responsible for verifying qualifications and certifications',
                  ]
              ).map((line, i) => (
                <View key={i} style={styles.disclaimerBullet}>
                  <Text style={[styles.disclaimerBulletDot, { color: '#f59e0b' }]}>•</Text>
                  <Text style={[styles.disclaimerBulletText, { color: colors.text }]}>{line}</Text>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setDontShowAgain(!dontShowAgain)}
              style={styles.checkboxRow}
              activeOpacity={0.7}
              testID="checkbox-dont-show-again"
            >
              <View style={[styles.checkbox, {
                borderColor: dontShowAgain ? colors.primary : colors.border,
                backgroundColor: dontShowAgain ? colors.primary : 'transparent',
              }]}>
                {dontShowAgain && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={[styles.checkboxLabel, { color: colors.text }]}>
                {isArabic ? 'عدم إظهار هذه الرسالة مرة أخرى' : "Don't show this message again"}
              </Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setPendingTrainer(null)}
                style={[styles.modalBtn, styles.modalBtnSecondary, { borderColor: colors.border }]}
                testID="button-disclaimer-cancel"
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmDisclaimer}
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                testID="button-disclaimer-confirm"
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>
                  {isArabic ? 'موافق' : 'Agree'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (isArabic: boolean) => StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  searchContainer: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: '500', textAlign: 'left' },
  disclaimerIntro: { fontSize: 13, lineHeight: 20, marginBottom: 10, textAlign: isArabic ? 'right' : 'left' },
  disclaimerSubtitle: { fontSize: 13, fontWeight: '700', marginBottom: 6, textAlign: isArabic ? 'right' : 'left' },
  disclaimerBullet: { flexDirection: isArabic ? 'row-reverse' : 'row', alignItems: 'flex-start', gap: 6, marginBottom: 6 },
  disclaimerBulletDot: { fontSize: 16, lineHeight: 18, fontWeight: '700' },
  disclaimerBulletText: { flex: 1, fontSize: 12, lineHeight: 18, textAlign: isArabic ? 'right' : 'left' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: isArabic ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', flex: 1, textAlign: isArabic ? 'right' : 'left' },
  modalScroll: { maxHeight: 360, marginBottom: 12 },
  checkboxRow: {
    flexDirection: isArabic ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    marginBottom: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: { flex: 1, fontSize: 13, textAlign: isArabic ? 'right' : 'left' },
  modalActions: {
    flexDirection: isArabic ? 'row-reverse' : 'row',
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnSecondary: { borderWidth: 1, backgroundColor: 'transparent' },
  modalBtnText: { fontSize: 14, fontWeight: '700' },
  listContent: { padding: 16, paddingTop: 8 },
  trainerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#64748b' },
  trainerInfo: { flex: 1, alignItems: 'flex-start' },
  trainerName: { fontSize: 16, fontWeight: '700', marginBottom: 4, textAlign: 'left' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  starsRow: { flexDirection: 'row', gap: 1 },
  ratingText: { fontSize: 14, fontWeight: '700' },
  reviewCount: { fontSize: 12 },
  emptyContainer: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubtitle: { fontSize: 14, marginTop: 4, textAlign: 'center', paddingHorizontal: 40 },
});
