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
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { isArabicLanguage } from '../lib/isArabic';
import { useAppTheme } from '../context/ThemeContext';
import { api, API_BASE_URL } from '../lib/api';

interface Review {
  id: string;
  trainerId: string;
  reviewerId: string;
  rating: number;
  reviewText: string | null;
  createdAt: string;
  reviewerName: string;
  reviewerAvatar: string | null;
}

interface Trainer {
  id: string;
  name: string;
  avatarUrl: string | null;
  avgRating: number;
  totalReviews: number;
  bio: string | null;
  specialty: string | null;
  yearsOfExperience: number | null;
  certifications: string[];
  galleryImages: string[];
  transformationPhotos: { beforeImage: string; afterImage: string; description: string }[];
}

export default function TrainerReviewsScreen({ route, navigation }: any) {
  const { trainerId, trainerName } = route.params;
  const { colors, isDark } = useAppTheme();
  const isArabic = isArabicLanguage();
  const queryClient = useQueryClient();

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const styles = getStyles(isArabic);

  // Fetch single trainer info
  const { data: trainers } = useQuery<Trainer[]>({
    queryKey: ['trainers-public'],
    queryFn: () => api.get<Trainer[]>('/api/trainers/public'),
  });
  const trainer = trainers?.find(t => t.id === trainerId);

  // Helper to resolve image URLs (handles relative paths and full URLs)
  const resolveUri = (uri: string | null | undefined): string => {
    if (!uri) return '';
    if (uri.startsWith('http')) return uri;
    if (uri.startsWith('/uploads') || uri.startsWith('/')) return `${API_BASE_URL}${uri}`;
    return uri;
  };

  // Fetch reviews
  const { data: reviews, isLoading, refetch } = useQuery<Review[]>({
    queryKey: ['trainer-reviews', trainerId],
    queryFn: () => api.get<Review[]>(`/api/trainers/${trainerId}/reviews`),
  });

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  // Submit review mutation
  const submitReview = useMutation({
    mutationFn: () => api.post<Review>(`/api/trainers/${trainerId}/reviews`, {
        rating: reviewRating,
        reviewText: reviewText.trim() || null,
      }),
    onSuccess: () => {
      setShowReviewModal(false);
      setReviewText('');
      setReviewRating(5);
      queryClient.invalidateQueries({ queryKey: ['trainer-reviews', trainerId] });
      queryClient.invalidateQueries({ queryKey: ['trainers-public'] });
      Alert.alert(
        isArabic ? 'تم بنجاح' : 'Success',
        isArabic ? 'تم إرسال تقييمك بنجاح' : 'Your review has been submitted'
      );
    },
    onError: (error: any) => {
      const code = error?.response?.data?.error;
      if (code === 'MUST_BE_TRAINEE') {
        Alert.alert(
          isArabic ? 'غير مسموح' : 'Not Allowed',
          isArabic ? 'يمكنك تقييم المدربين الذين اشتركت لديهم فقط' : 'You can only review trainers you are or were subscribed to'
        );
      } else if (code === 'ALREADY_REVIEWED') {
        Alert.alert(
          isArabic ? 'تم التقييم مسبقاً' : 'Already Reviewed',
          isArabic ? 'لقد قمت بتقييم هذا المدرب بالفعل' : 'You have already reviewed this trainer'
        );
      } else {
        Alert.alert(isArabic ? 'خطأ' : 'Error', isArabic ? 'فشل في إرسال التقييم' : 'Failed to submit review');
      }
    },
  });

  const renderStars = (rating: number, size = 16) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons key={i} name={i <= Math.round(rating) ? 'star' : 'star-outline'} size={size} color="#f59e0b" />
      );
    }
    return stars;
  };

  const renderSelectableStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity key={i} onPress={() => setReviewRating(i)} testID={`star-${i}`}>
          <Ionicons name={i <= reviewRating ? 'star' : 'star-outline'} size={36} color="#f59e0b" />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const avgRating = trainer?.avgRating || 0;
  const totalReviews = trainer?.totalReviews || 0;

  const renderReview = ({ item }: { item: Review }) => (
    <View style={[styles.reviewCard, { backgroundColor: isDark ? '#1e293b' : '#fff', borderColor: colors.border }]}>
      <View style={styles.reviewHeader}>
        <View style={[styles.reviewerAvatar, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]}>
          <Text style={[styles.reviewerInitial, { color: isDark ? '#94a3b8' : '#64748b' }]}>
            {item.reviewerName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          <Text style={[styles.reviewerName, { color: colors.text }]}>{item.reviewerName}</Text>
          <Text style={[styles.reviewDate, { color: colors.mutedText }]}>{formatDate(item.createdAt)}</Text>
        </View>
        <View style={styles.reviewStars}>{renderStars(item.rating, 12)}</View>
      </View>
      {item.reviewText && (
        <Text style={[styles.reviewContent, { color: colors.text }]}>{item.reviewText}</Text>
      )}
    </View>
  );

  const ListHeader = () => {
    const screenWidth = Dimensions.get('window').width;
    return (
    <>
      {/* Trainer Profile Card */}
      <View style={[styles.profileCard, { backgroundColor: isDark ? '#1e293b' : '#fff', borderColor: colors.border }]}>
        <View style={[styles.profileAvatar, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]}>
          {trainer?.avatarUrl ? (
            <Image source={{ uri: resolveUri(trainer.avatarUrl) }} style={{ width: 80, height: 80, borderRadius: 40 }} />
          ) : (
            <Ionicons name="person" size={40} color={isDark ? '#94a3b8' : '#64748b'} />
          )}
        </View>
        <Text style={[styles.profileName, { color: colors.text }]}>{trainerName}</Text>

        {/* Specialty & Experience Badges */}
        {(trainer?.specialty || trainer?.yearsOfExperience) && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginBottom: 12 }}>
            {trainer?.specialty && (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#1e3a5f' : '#eff6ff', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, gap: 4 }}>
                <Ionicons name="fitness" size={14} color="#3b82f6" />
                <Text style={{ color: '#3b82f6', fontSize: 12, fontWeight: '600' }}>{trainer.specialty}</Text>
              </View>
            )}
            {trainer?.yearsOfExperience && (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#2d1b0e' : '#fff7ed', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, gap: 4 }}>
                <Ionicons name="time" size={14} color="#f59e0b" />
                <Text style={{ color: '#f59e0b', fontSize: 12, fontWeight: '600' }}>
                  {trainer.yearsOfExperience} {isArabic ? 'سنوات خبرة' : 'yrs exp.'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Bio */}
        {trainer?.bio && (
          <Text style={{ color: colors.mutedText, fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 12, paddingHorizontal: 8 }}>
            {trainer.bio}
          </Text>
        )}

        {/* Certifications (Images) */}
        {trainer?.certifications && trainer.certifications.length > 0 && (
          <View style={{ width: '100%', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Ionicons name="ribbon" size={16} color="#22c55e" />
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{isArabic ? 'الشهادات والتراخيص' : 'Certifications'}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {trainer.certifications.map((uri, idx) => (
                <TouchableOpacity key={idx} onPress={() => setPreviewImage(resolveUri(uri))}>
                  <Image source={{ uri: resolveUri(uri) }} style={{ width: 120, height: 120, borderRadius: 12 }} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Rating */}
        <View style={styles.ratingSection}>
          <Text style={[styles.bigRating, { color: '#f59e0b' }]}>{avgRating > 0 ? avgRating.toFixed(1) : '-'}</Text>
          <View style={styles.starsRow}>{renderStars(avgRating, 20)}</View>
          <Text style={[styles.totalReviewsText, { color: colors.mutedText }]}>
            {totalReviews} {isArabic ? 'تقييم' : totalReviews === 1 ? 'review' : 'reviews'}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.chatButton, { backgroundColor: '#3b82f6' }]}
            onPress={() => navigation.navigate('StandaloneChat', { otherUserId: trainerId, otherUserName: trainerName })}
            testID="button-chat-trainer"
          >
            <Ionicons name="chatbubbles" size={18} color="#fff" />
            <Text style={styles.chatButtonText}>{isArabic ? 'دردشة مع المدرب' : 'Chat with Trainer'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.reviewButton, { backgroundColor: isDark ? '#334155' : '#f1f5f9', borderColor: '#f59e0b' }]}
            onPress={() => setShowReviewModal(true)}
            testID="button-add-review"
          >
            <Ionicons name="star" size={18} color="#f59e0b" />
            <Text style={[styles.reviewButtonText, { color: '#f59e0b' }]}>{isArabic ? 'أضف تقييمك' : 'Add Review'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Gallery */}
      {trainer?.galleryImages && trainer.galleryImages.length > 0 && (
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Ionicons name="images" size={18} color={colors.primary} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
              {isArabic ? 'معرض الصور' : 'Photo Gallery'}
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {trainer.galleryImages.map((uri, idx) => (
              <TouchableOpacity key={idx} onPress={() => setPreviewImage(resolveUri(uri))}>
                <Image source={{ uri: resolveUri(uri) }} style={{ width: 140, height: 140, borderRadius: 14 }} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Transformation Photos */}
      {trainer?.transformationPhotos && (trainer.transformationPhotos as any[]).length > 0 && (
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Ionicons name="trophy" size={18} color="#f59e0b" />
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
              {isArabic ? 'إنجازات المتدربين' : 'Trainee Transformations'}
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {(trainer.transformationPhotos as any[]).map((t: any, idx: number) => (
              <View key={idx} style={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: 14, padding: 8, borderWidth: 1, borderColor: colors.border, width: screenWidth * 0.65 }}>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <TouchableOpacity onPress={() => setPreviewImage(resolveUri(t.beforeImage))} style={{ flex: 1 }}>
                    <Image source={{ uri: resolveUri(t.beforeImage) }} style={{ width: '100%', height: 120, borderRadius: 10 }} />
                    <View style={{ position: 'absolute', bottom: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{isArabic ? 'قبل' : 'Before'}</Text>
                    </View>
                  </TouchableOpacity>
                  <Ionicons name="arrow-forward" size={18} color="#f59e0b" />
                  <TouchableOpacity onPress={() => setPreviewImage(resolveUri(t.afterImage))} style={{ flex: 1 }}>
                    <Image source={{ uri: resolveUri(t.afterImage) }} style={{ width: '100%', height: 120, borderRadius: 10 }} />
                    <View style={{ position: 'absolute', bottom: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{isArabic ? 'بعد' : 'After'}</Text>
                    </View>
                  </TouchableOpacity>
                </View>
                {t.description ? <Text style={{ color: colors.mutedText, fontSize: 12, marginTop: 6, textAlign: 'center' }}>{t.description}</Text> : null}
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Reviews Header */}
      <View style={styles.reviewsHeader}>
        <Ionicons name="chatbox-ellipses" size={18} color={colors.primary} />
        <Text style={[styles.reviewsHeaderText, { color: colors.text }]}>
          {isArabic ? 'آراء المتدربين' : 'Trainee Reviews'}
        </Text>
        <Text style={[styles.reviewsCount, { color: colors.mutedText }]}>({totalReviews})</Text>
      </View>
    </>
  );
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      <FlatList
        data={reviews || []}
        keyExtractor={(item) => item.id}
        renderItem={renderReview}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyReviews}>
            <Ionicons name="chatbox-outline" size={48} color={colors.mutedText} />
            <Text style={[styles.emptyText, { color: colors.mutedText }]}>
              {isArabic ? 'لا توجد تقييمات بعد' : 'No reviews yet'}
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.mutedText }]}>
              {isArabic ? 'كن أول من يقيّم هذا المدرب' : 'Be the first to review this trainer'}
            </Text>
          </View>
        }
      />

      {/* Add Review Modal */}
      <Modal visible={showReviewModal} transparent animationType="slide" onRequestClose={() => setShowReviewModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowReviewModal(false)} />
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
            <View style={styles.modalHandle} />

            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {isArabic ? 'تقييم المدرب' : 'Rate Trainer'}
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.mutedText }]}>
              {trainerName}
            </Text>

            {/* Star Selector */}
            <View style={styles.starSelector}>
              {renderSelectableStars()}
            </View>
            <Text style={[styles.ratingLabel, { color: '#f59e0b' }]}>
              {reviewRating}/5
            </Text>

            {/* Review Text */}
            <TextInput
              style={[styles.reviewInput, { 
                color: colors.text, 
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                borderColor: colors.border,
              }]}
              placeholder={isArabic ? 'اكتب رأيك (اختياري)...' : 'Write your review (optional)...'}
              placeholderTextColor={colors.mutedText}
              value={reviewText}
              onChangeText={setReviewText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              textAlign={isArabic ? 'right' : 'left'}
              testID="input-review-text"
            />

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitButton, { opacity: submitReview.isPending ? 0.6 : 1 }]}
              onPress={() => submitReview.mutate()}
              disabled={submitReview.isPending}
              testID="button-submit-review"
            >
              {submitReview.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#fff" />
                  <Text style={styles.submitText}>{isArabic ? 'إرسال التقييم' : 'Submit Review'}</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Note */}
            <Text style={[styles.noteText, { color: colors.mutedText }]}>
              {isArabic
                ? '⚠️ يمكنك تقييم المدربين الذين اشتركت لديهم فقط. لا يمكن حذف التقييم إلا بطلب من المدرب عبر خدمة العملاء.'
                : '⚠️ You can only review trainers you are or were subscribed to. Reviews can only be removed by admin upon trainer request.'}
            </Text>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Image Preview Modal */}
      <Modal visible={!!previewImage} transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }} activeOpacity={1} onPress={() => setPreviewImage(null)}>
          {previewImage && <Image source={{ uri: previewImage }} style={{ width: '92%', height: '75%', borderRadius: 14 }} resizeMode="contain" />}
        </TouchableOpacity>
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
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  listContent: { padding: 16, paddingBottom: 40 },

  // Profile Card
  profileCard: {
    alignItems: 'center',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    marginBottom: 20,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileName: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  ratingSection: { alignItems: 'center', marginBottom: 16 },
  bigRating: { fontSize: 36, fontWeight: '800', marginBottom: 4 },
  starsRow: { flexDirection: 'row', gap: 2, marginBottom: 4 },
  totalReviewsText: { fontSize: 13, fontWeight: '500' },

  // Action Buttons
  actionButtons: { flexDirection: 'row', gap: 10, width: '100%' },
  chatButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  chatButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  reviewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  reviewButtonText: { fontSize: 14, fontWeight: '700' },

  // Reviews
  reviewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  reviewsHeaderText: { fontSize: 16, fontWeight: '700' },
  reviewsCount: { fontSize: 14 },
  reviewCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  reviewerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewerInitial: { fontSize: 15, fontWeight: '700' },
  reviewerName: { fontSize: 14, fontWeight: '600', textAlign: 'left' },
  reviewDate: { fontSize: 11, textAlign: 'left' },
  reviewStars: { flexDirection: 'row', gap: 1 },
  reviewContent: { fontSize: 14, lineHeight: 22, textAlign: 'left' },
  emptyReviews: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  emptySubtext: { fontSize: 13, marginTop: 4 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#94a3b8',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  modalSubtitle: { fontSize: 14, textAlign: 'center', marginBottom: 16 },
  starSelector: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 8 },
  ratingLabel: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  reviewInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    minHeight: 100,
    marginBottom: 16,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  noteText: { fontSize: 11, lineHeight: 16, textAlign: 'center' },
});

