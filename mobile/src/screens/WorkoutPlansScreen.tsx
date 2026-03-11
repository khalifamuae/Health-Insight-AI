import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View, ScrollView, TextInput, Share, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
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

// --- Subcomponent: Exercise item with Video Player, Sets, Reps, Weights, and Download ---
const ExerciseCard = ({ savedExercise, globalExercise, groupId, onRemove, onWeightsChanged }: { savedExercise: SavedExercise, globalExercise: GlobalExercise, groupId: string, onRemove: () => void, onWeightsChanged: (exerciseId: string, startWeight?: number, endWeight?: number, weightUnit?: 'kg' | 'lbs') => void }) => {
  const { colors, isDark } = useAppTheme();
  const isArabic = isArabicLanguage();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const [playbackUri, setPlaybackUri] = useState(globalExercise.videoUrl);
  const [showVideo, setShowVideo] = useState(false);

  // Weight tracking state
  const [startWeight, setStartWeight] = useState(savedExercise.startWeight?.toString() || '');
  const [endWeight, setEndWeight] = useState(savedExercise.endWeight?.toString() || '');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>(savedExercise.weightUnit || 'kg');

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

  const saveWeights = async (sw: string, ew: string, unit: 'kg' | 'lbs') => {
    const parsedStart = sw ? parseFloat(sw) : undefined;
    const parsedEnd = ew ? parseFloat(ew) : undefined;
    if (sw && isNaN(parsedStart!)) return;
    if (ew && isNaN(parsedEnd!)) return;
    await WorkoutStore.updateExerciseWeights(groupId, savedExercise.id, parsedStart, parsedEnd, unit);
    onWeightsChanged(savedExercise.id, parsedStart, parsedEnd, unit);
  };

  const toggleUnit = async () => {
    const newUnit = weightUnit === 'kg' ? 'lbs' : 'kg';
    setWeightUnit(newUnit);
    await saveWeights(startWeight, endWeight, newUnit);
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
        {showVideo ? (
          <>
            <Video
              source={{ uri: playbackUri }}
              style={styles.videoPlayer}
              useNativeControls
              resizeMode={ResizeMode.COVER}
              isLooping
              shouldPlay
            />
            <TouchableOpacity
              onPress={() => setShowVideo(false)}
              style={styles.videoCloseBtn}
            >
              <Ionicons name="close-circle" size={28} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.videoPlayOverlay}
            onPress={() => setShowVideo(true)}
            activeOpacity={0.8}
          >
            <View style={styles.playIconCircle}>
              <Ionicons name="play" size={32} color="#fff" style={{ marginLeft: 3 }} />
            </View>
            <Text style={styles.playText}>
              {isArabic ? 'شغّل الفيديو' : 'Play Video'}
            </Text>
          </TouchableOpacity>
        )}
        {isOffline && (
          <View style={styles.offlineBadge}>
            <Ionicons name="checkmark-circle" size={12} color="#fff" />
            <Text style={styles.offlineText}>Offline</Text>
          </View>
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: isDark ? '#0f2918' : '#ecfdf5', borderColor: isDark ? '#166534' : '#a7f3d0' }]}>
          <View style={styles.statIconRow}>
            <Ionicons name="layers-outline" size={16} color={isDark ? '#4ade80' : '#16a34a'} />
            <Text style={[styles.statLabel, { color: isDark ? '#86efac' : '#15803d' }]}>{isArabic ? 'جولات' : 'Sets'}</Text>
          </View>
          <Text style={[styles.statValue, { color: isDark ? '#4ade80' : '#166534' }]}>{savedExercise.sets}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: isDark ? '#0c1a2e' : '#eff6ff', borderColor: isDark ? '#1e40af' : '#93c5fd' }]}>
          <View style={styles.statIconRow}>
            <Ionicons name="repeat-outline" size={16} color={isDark ? '#60a5fa' : '#2563eb'} />
            <Text style={[styles.statLabel, { color: isDark ? '#93c5fd' : '#1e40af' }]}>{isArabic ? 'تكرار' : 'Reps'}</Text>
          </View>
          <Text style={[styles.statValue, { color: isDark ? '#60a5fa' : '#1e40af' }]}>{savedExercise.reps}</Text>
        </View>
      </View>

      {/* Weight Tracking Row */}
      <View style={[styles.weightContainer, { backgroundColor: isDark ? '#0f172a' : '#f0f4ff', borderColor: isDark ? '#1e3a8a' : '#c7d2fe' }]}>
        <View style={styles.weightHeader}>
          <Ionicons name="barbell-outline" size={16} color={isDark ? '#818cf8' : '#6366f1'} />
          <Text style={[styles.weightHeaderText, { color: isDark ? '#a5b4fc' : '#4338ca' }]}>
            {isArabic ? 'تتبع الأوزان' : 'Weight Tracking'}
          </Text>
          <TouchableOpacity
            onPress={toggleUnit}
            style={[styles.unitToggle, { backgroundColor: isDark ? '#312e81' : '#e0e7ff' }]}
          >
            <Text style={[styles.unitText, { color: isDark ? '#a5b4fc' : '#4338ca' }]}>
              {weightUnit.toUpperCase()}
            </Text>
            <Ionicons name="swap-horizontal" size={12} color={isDark ? '#a5b4fc' : '#4338ca'} />
          </TouchableOpacity>
        </View>
        <View style={styles.weightInputsRow}>
          <View style={styles.weightInputBox}>
            <Text style={[styles.weightLabel, { color: isDark ? '#94a3b8' : '#64748b' }]}>
              {isArabic ? 'الجولة الأولى' : '1st Set'}
            </Text>
            <View style={[styles.weightInputWrapper, { backgroundColor: isDark ? '#1e293b' : '#fff', borderColor: isDark ? '#334155' : '#cbd5e1' }]}>
              <TextInput
                style={[styles.weightInput, { color: colors.text }]}
                value={startWeight}
                onChangeText={(val) => { setStartWeight(val); }}
                onEndEditing={() => saveWeights(startWeight, endWeight, weightUnit)}
                keyboardType="decimal-pad"
                placeholder="—"
                placeholderTextColor={isDark ? '#475569' : '#cbd5e1'}
                textAlign="center"
              />
              <Text style={[styles.weightSuffix, { color: isDark ? '#64748b' : '#94a3b8' }]}>{weightUnit}</Text>
            </View>
          </View>
          <View style={styles.weightInputBox}>
            <Text style={[styles.weightLabel, { color: isDark ? '#94a3b8' : '#64748b' }]}>
              {isArabic ? 'الجولة الأخيرة' : 'Last Set'}
            </Text>
            <View style={[styles.weightInputWrapper, { backgroundColor: isDark ? '#1e293b' : '#fff', borderColor: isDark ? '#334155' : '#cbd5e1' }]}>
              <TextInput
                style={[styles.weightInput, { color: colors.text }]}
                value={endWeight}
                onChangeText={(val) => { setEndWeight(val); }}
                onEndEditing={() => saveWeights(startWeight, endWeight, weightUnit)}
                keyboardType="decimal-pad"
                placeholder="—"
                placeholderTextColor={isDark ? '#475569' : '#cbd5e1'}
                textAlign="center"
              />
              <Text style={[styles.weightSuffix, { color: isDark ? '#64748b' : '#94a3b8' }]}>{weightUnit}</Text>
            </View>
          </View>
        </View>
      </View>

      {savedExercise.dateAdded && (
        <Text style={{ fontSize: 11, color: colors.mutedText, textAlign: isArabic ? 'right' : 'left', marginTop: 8 }}>
          {isArabic ? 'تاريخ الإضافة: ' : 'Added on: '}
          {new Date(savedExercise.dateAdded).toLocaleDateString(isArabic ? 'ar-AE' : 'en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </Text>
      )}
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

  const handleWeightsChanged = (groupId: string, exerciseId: string, startWeight?: number, endWeight?: number, weightUnit?: 'kg' | 'lbs') => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        exercises: g.exercises.map(ex => {
          if (ex.id !== exerciseId) return ex;
          return { ...ex, startWeight, endWeight, weightUnit };
        }),
      };
    }));
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
      const message = isArabic
        ? `🔥 قمت بمشاركة جدول تماريني (${groupName}) على تطبيق BioTrack AI!\n\nلتحميل الجدول فوراً، افتح التطبيق وأدخل هذا الكود: ${code}`
        : `🔥 I've shared my custom workout plan (${groupName}) on BioTrack AI!\n\nTo download it, open the app and enter this code: ${code}`;

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
      const message = isArabic
        ? `🚀 شاركت جميع جداول التمارين الخاصة بي على تطبيق BioTrack AI خطوة بخطوة!\n\nلتحميل جميع الجداول دفعة واحدة، افتح التطبيق وأدخل هذا الكود: ${code}`
        : `🚀 I've shared ALL my custom workout routines on BioTrack AI!\n\nTo download my complete workout program, open the app and enter this code: ${code}`;

      await Share.share({ message });
    } catch (error: any) {
      Alert.alert(isArabic ? "خطأ" : "Error", error.message || (isArabic ? "فشلت عملية المشاركة" : "Failed to share workouts"));
    } finally {
      setIsSharingAll(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
            <TextInput
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
                          onWeightsChanged={(exId, sw, ew, wu) => handleWeightsChanged(group.id, exId, sw, ew, wu)}
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
    </KeyboardAvoidingView>
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
  videoPlayOverlay: {
    width: '100%',
    height: '100%',
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  playIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
  videoCloseBtn: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
    zIndex: 10,
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
    flexDirection: 'row',
    gap: 10,
    marginBottom: 2,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  weightContainer: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  weightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  weightHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  weightInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weightInputBox: {
    flex: 1,
    alignItems: 'center',
  },
  weightLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  weightInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 8,
    width: '100%',
  },
  weightInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    paddingVertical: 0,
  },
  weightSuffix: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 2,
  },
  weightArrow: {
    paddingTop: 18,
  },
  unitToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  unitText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
