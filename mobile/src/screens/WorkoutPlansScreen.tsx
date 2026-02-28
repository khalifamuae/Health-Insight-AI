import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
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

// --- Subcomponent: Exercise item with Video Player, Sets, Reps, and Download ---
const ExerciseCard = ({ savedExercise, globalExercise, groupId, onRemove }: { savedExercise: SavedExercise, globalExercise: GlobalExercise, groupId: string, onRemove: () => void }) => {
  const { colors, isDark } = useAppTheme();
  const isArabic = isArabicLanguage();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const [playbackUri, setPlaybackUri] = useState(globalExercise.videoUrl);

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
        <Text style={[styles.exerciseTitle, { color: colors.text }]}>
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

      <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: colors.text }]}>{savedExercise.sets}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedText }]}>{isArabic ? "جولات (Sets)" : "Sets"}</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: colors.text }]}>{savedExercise.reps}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedText }]}>{isArabic ? "تكرار (Reps)" : "Reps"}</Text>
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


  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {groups.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="barbell-outline" size={42} color={colors.mutedText} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {isArabic ? 'جدولك فارغ حالياً' : 'Your plan is empty'}
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.mutedText }]}>
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
                  <Text style={[styles.groupTitle, { color: colors.text }]}>{group.name}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteGroup(group.id)} style={{ padding: 4 }}>
                  <Ionicons name="trash" size={20} color="#ef4444" />
                </TouchableOpacity>
              </TouchableOpacity>

              {isExpanded && (
                group.exercises.length === 0 ? (
                  <Text style={{ color: colors.mutedText, textAlign: 'center', marginVertical: 10 }}>
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
    flexDirection: 'row',
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
  }
});
