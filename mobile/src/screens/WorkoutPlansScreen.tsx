import React, { useCallback, useState, useEffect } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View, ScrollView, Share, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Video, ResizeMode } from 'expo-av';
import { BlurView } from 'expo-blur';
import { isArabicLanguage } from '../lib/isArabic';
import { useAppTheme } from '../context/ThemeContext';
import { WorkoutStore, WorkoutGroup, SavedExercise } from '../lib/WorkoutStore';
import { EXERCISE_REGISTRY, GlobalExercise } from '../lib/WorkoutRegistry';
import { VideoCacheManager } from '../lib/VideoCacheManager';
import AppTextInput from '../components/AppTextInput';

// --- Subcomponent: Exercise item with Video Player, Sets, Reps, and Download ---
const ExerciseCard = ({ savedExercise, globalExercise, groupId, onRemove, onUpdateWeights }: { savedExercise: SavedExercise, globalExercise: GlobalExercise, groupId: string, onRemove: () => void, onUpdateWeights: (groupId: string, exerciseId: string, start: number | undefined, end: number | undefined, unit: 'kg' | 'lbs') => void }) => {
  const { colors, isDark } = useAppTheme();
  const isArabic = isArabicLanguage();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const [playbackUri, setPlaybackUri] = useState(globalExercise.videoUrl);

  const [startWeight, setStartWeight] = useState<number | undefined>(savedExercise.startWeight);
  const [endWeight, setEndWeight] = useState<number | undefined>(savedExercise.endWeight);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>(savedExercise.weightUnit || 'kg');
  const handleSaveWeights = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setStartWeight(savedExercise.startWeight);
    setEndWeight(savedExercise.endWeight);
    setWeightUnit(savedExercise.weightUnit || 'kg');
  }, [savedExercise.startWeight, savedExercise.endWeight, savedExercise.weightUnit]);

  useFocusEffect(
    useCallback(() => {
      checkOfflineStatus();
    }, [])
  );

  const checkOfflineStatus = async () => {
    const cached = await VideoCacheManager.isVideoCached(globalExercise.id);
    setIsOffline(cached);
    if (cached) {
      const uri = await VideoCacheManager.getPlaybackUri(globalExercise.id, globalExercise.videoUrl);
      setPlaybackUri(uri);
    }
  };

  const handleDownloadToggle = async () => {
    if (isOffline) {
      // Delete cache
      Alert.alert(
        isArabic ? "حذف الفيديو" : "Delete Video",
        isArabic ? "هل أنت متأكد من حذف هذا الفيديو من الذاكرة؟" : "Are you sure you want to remove this video from offline storage?",
        [
          { text: isArabic ? "إلغاء" : "Cancel", style: "cancel" },
          {
            text: isArabic ? "حذف" : "Delete", style: 'destructive', onPress: async () => {
              await VideoCacheManager.removeCachedVideo(globalExercise.id);
              setPlaybackUri(globalExercise.videoUrl); // Revert to stream
              setIsOffline(false);
            }
          }
        ]
      );
    } else {
      // Download
      setIsDownloading(true);
      try {
        const localUri = await VideoCacheManager.downloadVideo(globalExercise.id, globalExercise.videoUrl, (progress) => {
          setDownloadProgress(progress);
        });
        setPlaybackUri(localUri);
        setIsOffline(true);
      } catch (e) {
        Alert.alert("Error", "Failed to download video.");
      } finally {
        setIsDownloading(false);
        setDownloadProgress(0);
      }
    }
  };

  return (
    <View style={[styles.exerciseCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={styles.exerciseHeader}>
        <Text style={[styles.exerciseTitle, { color: colors.text, textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }]}>
          {isArabic ? globalExercise.titleAr : globalExercise.titleEn}
        </Text>
        <View style={styles.exerciseActions}>
          <TouchableOpacity onPress={handleDownloadToggle} style={styles.actionBtn}>
            {isDownloading ? (
              <Text style={{ fontSize: 10, color: colors.primary }}>{Math.round(downloadProgress * 100)}%</Text>
            ) : (
              <Ionicons name={isOffline ? "cloud-done" : "cloud-download-outline"} size={22} color={isOffline ? "#22c55e" : colors.primary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onRemove()} style={styles.actionBtn}>
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.videoContainer}>
        <Video
          source={{ uri: playbackUri }}
          style={styles.videoPlayer}
          useNativeControls
          resizeMode={ResizeMode.COVER}
          isLooping
        />
        {isOffline && (
          <View style={styles.offlineBadge}>
            <Ionicons name="checkmark-circle" size={12} color="#fff" />
            <Text style={styles.offlineText}>Offline</Text>
          </View>
        )}
      </View>

      <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border, padding: 12, borderRadius: 12 }]}>
        <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', justifyContent: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>
            {isArabic ? "جدول تدريبك اليومي" : "Daily Training Plan"}
          </Text>
        </View>

        {/* 2x2 Grid matching reference image */}
        <View style={{ gap: 12 }}>
          {/* Row 1: Sets and Reps */}
          <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', gap: 12 }}>
            <View style={[styles.gridCard, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(30,41,59,0.5)' : '#f8fafc' }]}>
              <View style={[styles.gridHeader, { backgroundColor: '#709dbd' }]}>
                <Text style={styles.gridHeaderText}>{isArabic ? "عدد الجولات" : "Sets"}</Text>
              </View>
              <View style={styles.gridBody}>
                <Text style={[styles.gridBigValue, { color: colors.text }]}>{savedExercise.sets}</Text>
                <Text style={[styles.gridSubText, { color: colors.mutedText }]}>{isArabic ? "الجولات الإجمالية" : "Total Sets"}</Text>
              </View>
            </View>

            <View style={[styles.gridCard, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(30,41,59,0.5)' : '#f8fafc' }]}>
              <View style={[styles.gridHeader, { backgroundColor: '#7eb59f' }]}>
                <Text style={styles.gridHeaderText}>{isArabic ? "عدد التكرارات" : "Reps"}</Text>
              </View>
              <View style={styles.gridBody}>
                <Text style={[styles.gridBigValue, { color: colors.text }]}>{savedExercise.reps}</Text>
                <Text style={[styles.gridSubText, { color: colors.mutedText }]}>{isArabic ? "لكل جولة" : "Per Set"}</Text>
              </View>
            </View>
          </View>

          {/* Row 2: Weights */}
          <View style={{ flexDirection: isArabic ? 'row-reverse' : 'row', gap: 12 }}>
            <View style={[styles.gridCard, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(15,23,42,0.8)' : '#ffffff' }]}>
              <View style={[styles.gridHeader, { backgroundColor: '#7eb59f' }]}>
                <Text style={styles.gridHeaderText}>{isArabic ? "الجولة الأولى" : "First Set"}</Text>
              </View>
              <View style={styles.gridBodyRow}>
                <Text style={[styles.gridInputLabel, { color: colors.text }]}>
                  {isArabic ? "الوزن" : "Weight"} ({weightUnit}):
                </Text>
                <AppTextInput
                  style={[styles.gridInput, { color: colors.text, backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderColor: colors.border }]}
                  keyboardType="numeric"
                  placeholder="---"
                  placeholderTextColor={colors.mutedText}
                  value={startWeight !== undefined ? String(startWeight) : ''}
                  onChangeText={(text) => {
                    const val = text.replace(/[^0-9.]/g, '');
                    const num = val === '' ? undefined : parseFloat(val);
                    setStartWeight(num); // Ensure UI updates instantly!
                    if (handleSaveWeights.current) clearTimeout(handleSaveWeights.current);
                    handleSaveWeights.current = setTimeout(() => {
                      onUpdateWeights(groupId, savedExercise.id, num, endWeight, weightUnit);
                    }, 400);
                  }}
                />
              </View>
            </View>

            <View style={[styles.gridCard, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(15,23,42,0.8)' : '#ffffff' }]}>
              <View style={[styles.gridHeader, { backgroundColor: isDark ? '#333' : '#111' }]}>
                <Text style={styles.gridHeaderText}>{isArabic ? "الجولة الأخيرة" : "Last Set"}</Text>
              </View>
              <View style={styles.gridBodyRow}>
                <Text style={[styles.gridInputLabel, { color: colors.text }]}>
                  {isArabic ? "الوزن" : "Weight"} ({weightUnit}):
                </Text>
                <AppTextInput
                  style={[styles.gridInput, { color: colors.text, backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderColor: colors.border }]}
                  keyboardType="numeric"
                  placeholder="---"
                  placeholderTextColor={colors.mutedText}
                  value={endWeight !== undefined ? String(endWeight) : ''}
                  onChangeText={(text) => {
                    const val = text.replace(/[^0-9.]/g, '');
                    const num = val === '' ? undefined : parseFloat(val);
                    setEndWeight(num); // Ensure UI updates instantly!
                    if (handleSaveWeights.current) clearTimeout(handleSaveWeights.current);
                    handleSaveWeights.current = setTimeout(() => {
                      onUpdateWeights(groupId, savedExercise.id, startWeight, num, weightUnit);
                    }, 400);
                  }}
                />
              </View>
            </View>
          </View>
          <View style={{ alignItems: isArabic ? 'flex-start' : 'flex-end', marginTop: 4 }}>
            <TouchableOpacity
              style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.border }}
              onPress={() => {
                const newUnit = (weightUnit === 'kg' ? 'lbs' : 'kg');
                onUpdateWeights(groupId, savedExercise.id, startWeight, endWeight, newUnit);
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.text }}>
                {isArabic ? `الوحدة: ${weightUnit.toUpperCase()}` : `Unit: ${weightUnit.toUpperCase()}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {savedExercise.dateAdded && (
          <View style={{ marginTop: 12, paddingHorizontal: 4 }}>
            <Text style={{ fontSize: 11, color: colors.mutedText, textAlign: isArabic ? 'right' : 'left' }}>
              {isArabic ? 'تاريخ الإضافة: ' : 'Added on: '}
              {new Date(savedExercise.dateAdded).toLocaleDateString(isArabic ? 'ar-AE' : 'en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}


// --- Main Screen ---
export default function WorkoutPlansScreen() {
  const { colors, isDark } = useAppTheme();
  const isArabic = isArabicLanguage();
  const [groups, setGroups] = useState<WorkoutGroup[]>([]);
  const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([]);
  const [importCode, setImportCode] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isSharing, setIsSharing] = useState<string | null>(null);
  const [isSharingAll, setIsSharingAll] = useState(false);

  const loadGroups = useCallback(async () => {
    const data = await WorkoutStore.getGroups();
    setGroups(data);

    // Expand all by default initially
    if (expandedGroupIds.length === 0 && data.length > 0) {
      setExpandedGroupIds(data.map(g => g.id));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadGroups();
    }, [loadGroups])
  );

  const toggleGroup = (groupId: string) => {
    setExpandedGroupIds(prev =>
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  const handleDeleteGroup = (groupId: string) => {
    Alert.alert(
      isArabic ? "حذف المجموعة" : "Delete Group",
      isArabic ? "هل أنت متأكد من حذف هذه المجموعة بالكامل؟" : "Are you sure you want to delete this entire group?",
      [
        { text: isArabic ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: isArabic ? 'حذف' : 'Delete', style: 'destructive', onPress: async () => {
            const updated = groups.filter(g => g.id !== groupId);
            await WorkoutStore.saveGroups(updated);
            setGroups(updated);
          }
        }
      ]
    )
  };

  const handleRemoveExercise = async (groupId: string, exerciseId: string) => {
    await WorkoutStore.removeExerciseFromGroup(groupId, exerciseId);
    loadGroups();
  };

  const handleUpdateExerciseWeights = (groupId: string, exerciseId: string, start: number | undefined, end: number | undefined, unit: 'kg' | 'lbs') => {
    // 1. Update parent state immediately for UI 
    setGroups(prevGroups => prevGroups.map(g => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        exercises: g.exercises.map(e => {
          if (e.id !== exerciseId) return e;
          return { ...e, startWeight: start, endWeight: end, weightUnit: unit };
        })
      };
    }));
    // 2. Persist to async storage
    WorkoutStore.updateExerciseWeights(groupId, exerciseId, start, end, unit);
  };

  const handleImport = async () => {
    if (!importCode.trim()) return;
    setIsImporting(true);
    try {
      await WorkoutStore.importGroup(importCode.trim());
      Alert.alert(
        isArabic ? "تم الاستيراد بنجاح" : "Import Successful",
        isArabic ? "تم إضافة الجدول إلى خطتك." : "The workout plan has been added."
      );
      setImportCode('');
      loadGroups();
    } catch (error: any) {
      Alert.alert(
        isArabic ? "خطأ في الاستيراد" : "Import Error",
        error.message || (isArabic ? "كود غير صالح أو حدث خطأ" : "Invalid code or error occurred")
      );
    } finally {
      setIsImporting(false);
    }
  };

  const handleShareGroup = async (groupId: string, groupName: string) => {
    setIsSharing(groupId);
    try {
      const code = await WorkoutStore.shareGroup(groupId);
      const appLink = 'https://apps.apple.com/ae/app/biotrack-ai/id6759469048?l=ar';
      const message = isArabic
        ? `🔥 قمت بمشاركة جدول تماريني (${groupName}) على تطبيق BioTrack AI!\n\nلتحميل الجدول فوراً، افتح التطبيق وأدخل هذا الكود: ${code}\n\n📲 حمّل التطبيق: ${appLink}`
        : `🔥 I've shared my custom workout plan (${groupName}) on BioTrack AI!\n\nTo download it, open the app and enter this code: ${code}\n\n📲 Download the app: ${appLink}`;

      await Share.share({ message });
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to share workout plan");
    } finally {
      setIsSharing(null);
    }
  };

  const handleShareAllGroups = async () => {
    setIsSharingAll(true);
    try {
      const code = await WorkoutStore.shareAllGroups();
      const appLink = 'https://apps.apple.com/ae/app/biotrack-ai/id6759469048?l=ar';
      const message = isArabic
        ? `🚀 شاركت جميع جداول التمارين الخاصة بي على تطبيق BioTrack AI خطوة بخطوة!\n\nلتحميل جميع الجداول دفعة واحدة، افتح التطبيق وأدخل هذا الكود: ${code}\n\n📲 حمّل التطبيق: ${appLink}`
        : `🚀 I've shared ALL my custom workout routines on BioTrack AI!\n\nTo download my complete workout program, open the app and enter this code: ${code}\n\n📲 Download the app: ${appLink}`;

      await Share.share({ message });
    } catch (error: any) {
      Alert.alert(isArabic ? "خطأ" : "Error", error.message || (isArabic ? "فشلت عملية المشاركة" : "Failed to share workouts"));
    } finally {
      setIsSharingAll(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {groups.length > 0 && (
        <TouchableOpacity
          style={[styles.shareAllBtn, { backgroundColor: colors.primary }]}
          onPress={handleShareAllGroups}
          disabled={isSharingAll}
        >
          {isSharingAll ? (
            <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
          ) : (
            <Ionicons name="share-social" size={20} color="#fff" style={{ marginRight: 8, marginLeft: isArabic ? 8 : 0 }} />
          )}
          <Text style={[styles.shareAllText, { textAlign: isArabic ? 'right' : 'left' }]}>
            {isArabic ? "📤 مشاركة جميع جداولي" : "📤 Share All My Workouts"}
          </Text>
        </TouchableOpacity>
      )}

      <View style={[styles.importContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.importTitle, { color: colors.text, textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr', width: '100%' }]}>
          {isArabic ? "📥 استيراد جدول تمارين" : "📥 Import Workout Plan"}
        </Text>
        <View style={[styles.importRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
          <AppTextInput
            style={[styles.importInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background, textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr', marginLeft: isArabic ? 10 : 0, marginRight: isArabic ? 0 : 10 }]}
            placeholder={isArabic ? "أدخل الكود هنا (مثال: X9K2)" : "Enter code here (e.g. X9K2)"}
            placeholderTextColor={colors.mutedText}
            value={importCode}
            onChangeText={setImportCode}
            autoCapitalize="characters"
            maxLength={6}
          />
          <TouchableOpacity
            style={[styles.importBtn, { backgroundColor: colors.primary, opacity: isImporting ? 0.7 : 1 }]}
            onPress={handleImport}
            disabled={isImporting || !importCode.trim()}
          >
            <Text style={[styles.importBtnText, { textAlign: isArabic ? 'right' : 'left' }]}>
              {isImporting ? (isArabic ? 'جاري...' : 'Wait...') : (isArabic ? 'حمل' : 'Import')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {groups.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="barbell-outline" size={42} color={colors.mutedText} />
          <Text style={[styles.emptyTitle, { color: colors.text, textAlign: isArabic ? 'right' : 'left', width: '100%' }]}>
            {isArabic ? 'جدولك فارغ حالياً' : 'Your plan is empty'}
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.mutedText, textAlign: isArabic ? 'right' : 'left', width: '100%' }]}>
            {isArabic
              ? 'اذهب إلى "تصميم الجدول" لاختيار التمارين وتحديد التكرارات وبناء مجموعاتك المخصصة.'
              : 'Go to the "Workout Builder" to select exercises, set reps, and build your custom groups.'}
          </Text>
        </View>
      ) : (
        groups.map(group => {
          const isExpanded = expandedGroupIds.includes(group.id);
          return (
            <View key={group.id} style={[styles.groupContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity activeOpacity={0.7} onPress={() => toggleGroup(group.id)} style={styles.groupHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons
                    name={isExpanded ? "chevron-down" : "chevron-forward"}
                    size={20}
                    color={colors.text}
                    style={{ marginRight: 8, marginLeft: isArabic ? 8 : 0 }}
                  />
                  <Text style={[styles.groupTitle, { color: colors.text, textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }]}>{group.name}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity onPress={() => handleShareGroup(group.id, group.name)} style={{ padding: 4, marginRight: 12 }}>
                    {isSharing === group.id ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Ionicons name="share-social-outline" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteGroup(group.id)} style={{ padding: 4 }}>
                    <Ionicons name="trash" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>

              {isExpanded && (
                group.exercises.length === 0 ? (
                  <Text style={{ color: colors.mutedText, textAlign: isArabic ? 'right' : 'center', width: '100%', marginVertical: 10 }}>
                    {isArabic ? "لا توجد تمارين هنا." : "No exercises here."}
                  </Text>
                ) : (
                  group.exercises.map(savedEx => {
                    const globalEx = EXERCISE_REGISTRY.find(e => e.id === savedEx.exerciseId);
                    if (!globalEx) return null;
                    return (
                      <ExerciseCard
                        key={savedEx.id}
                        savedExercise={savedEx}
                        globalExercise={globalEx}
                        groupId={group.id}
                        onRemove={() => handleRemoveExercise(group.id, savedEx.id)}
                        onUpdateWeights={handleUpdateExerciseWeights}
                      />
                    )
                  })
                )
              )}
            </View>
          )
        })
      )}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingTop: 20 },
  emptyCard: { borderWidth: 1, borderRadius: 14, padding: 24, alignItems: 'center', marginTop: 50 },
  emptyTitle: { marginTop: 12, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptyDesc: { marginTop: 8, fontSize: 14, textAlign: 'center', lineHeight: 22 },

  groupContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 10,
    borderBottomColor: 'rgba(150,150,150,0.2)'
  },
  groupTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },

  shareAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shareAllText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  importContainer: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 20,
  },
  importTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  importRow: {
    alignItems: 'center',
    width: '100%',
  },
  importInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  importBtn: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  importBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },

  exerciseCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  exerciseTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  exerciseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionBtn: {
    padding: 2,
  },
  videoContainer: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  offlineBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  offlineText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold'
  },
  statsRow: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  statDivider: {
    width: 1,
    height: '100%',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  gridCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  gridHeader: {
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridHeaderText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  gridBody: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridBigValue: {
    fontSize: 26,
    fontWeight: '900',
  },
  gridSubText: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  gridBodyRow: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gridInputLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  gridInput: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    width: 60,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 6,
  }
});
