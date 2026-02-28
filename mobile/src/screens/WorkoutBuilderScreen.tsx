import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useAppTheme } from '../context/ThemeContext';
import { isArabicLanguage } from '../lib/isArabic';
import { GlobalExercise, EXERCISE_REGISTRY } from '../lib/WorkoutRegistry';
import { WorkoutStore, WorkoutGroup } from '../lib/WorkoutStore';

export default function WorkoutBuilderScreen({ navigation }: any) {
    const { t } = useTranslation();
    const { colors, isDark } = useAppTheme();
    const isArabic = isArabicLanguage();

    const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
    const [selectedExercise, setSelectedExercise] = useState<GlobalExercise | null>(null);

    // Modal State
    const [isModalVisible, setModalVisible] = useState(false);
    const [setsInput, setSetsInput] = useState('3');
    const [repsInput, setRepsInput] = useState('12');
    const [userGroups, setUserGroups] = useState<WorkoutGroup[]>([]);
    const [selectedUserGroupId, setSelectedUserGroupId] = useState<string | null>(null);
    const [newGroupName, setNewGroupName] = useState('');

    // Group exercises by muscle
    const groupedExercises = EXERCISE_REGISTRY.reduce((acc, ex) => {
        const key = isArabic ? ex.muscleGroupAr : ex.muscleGroupEn;
        if (!acc[key]) acc[key] = [];
        acc[key].push(ex);
        return acc;
    }, {} as Record<string, GlobalExercise[]>);

    const loadUserGroups = async () => {
        const groups = await WorkoutStore.getGroups();
        setUserGroups(groups);
        if (groups.length > 0 && !selectedUserGroupId) {
            setSelectedUserGroupId(groups[0].id);
        }
    };

    const handleAddPress = (exercise: GlobalExercise) => {
        setSelectedExercise(exercise);
        setSetsInput('3');
        setRepsInput('12');
        loadUserGroups();
        setModalVisible(true);
    };

    const handleSaveExercise = async () => {
        if (!selectedExercise) return;

        const sets = parseInt(setsInput, 10);
        const reps = parseInt(repsInput, 10);

        if (isNaN(sets) || isNaN(reps) || sets <= 0 || reps <= 0) {
            Alert.alert(isArabic ? 'خطأ' : 'Error', isArabic ? 'يرجى إدخال أرقام صحيحة' : 'Please enter valid numbers');
            return;
        }

        let targetGroupId = selectedUserGroupId;

        // Create a new group if selected but doesn't exist yet
        if (targetGroupId === 'NEW') {
            if (!newGroupName.trim()) {
                Alert.alert(isArabic ? 'خطأ' : 'Error', isArabic ? 'يرجى إدخال اسم المجموعة' : 'Please enter a group name');
                return;
            }
            const createdGroup = await WorkoutStore.createGroup(newGroupName.trim());
            targetGroupId = createdGroup.id;
        }

        if (!targetGroupId) {
            Alert.alert(isArabic ? 'خطأ' : 'Error', isArabic ? 'يرجى اختيار مجموعة' : 'Please select a group');
            return;
        }

        await WorkoutStore.addExerciseToGroup(targetGroupId, selectedExercise.id, sets, reps);
        setModalVisible(false);
        Alert.alert(
            isArabic ? 'تمت الإضافة!' : 'Added!',
            isArabic ? 'تم تصدير التمرين إلى جدولك بنجاح.' : 'Exercise exported to your plan successfully.'
        );
    };


    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                    {isArabic ? 'تصميم جدول التمارين' : 'Workout Builder'}
                </Text>
                <Text style={[styles.headerSubtitle, { color: colors.mutedText }]}>
                    {isArabic ? 'اختر العضلة لترى التمارين الخاصة بها وأضفها لجدولك.' : 'Select a muscle to view exercises and add them to your plan.'}
                </Text>

                {Object.keys(groupedExercises).map((muscleGroupName) => (
                    <View key={muscleGroupName} style={[styles.accordionContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <TouchableOpacity
                            style={styles.accordionHeader}
                            onPress={() => setExpandedGroup(expandedGroup === muscleGroupName ? null : muscleGroupName)}
                        >
                            <Text style={[styles.accordionTitle, { color: colors.text }]}>{muscleGroupName}</Text>
                            <Ionicons
                                name={expandedGroup === muscleGroupName ? 'chevron-up' : 'chevron-down'}
                                size={24}
                                color={colors.text}
                            />
                        </TouchableOpacity>

                        {expandedGroup === muscleGroupName && (
                            <View style={styles.accordionContent}>
                                {groupedExercises[muscleGroupName].map((ex) => (
                                    <View key={ex.id} style={[styles.exerciseRow, { borderBottomColor: colors.border }]}>
                                        <View style={styles.exerciseInfo}>
                                            <Ionicons name="barbell" size={20} color={colors.primary} style={{ marginRight: 8, marginLeft: isArabic ? 8 : 0 }} />
                                            <Text style={[styles.exerciseTitle, { color: colors.text }]}>{isArabic ? ex.titleAr : ex.titleEn}</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => handleAddPress(ex)} style={styles.addButton}>
                                            <Ionicons name="add-circle" size={28} color={colors.primary} />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                ))}

                {/* Extra padding at bottom for tab bar */}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* MODAL FOR SETS/REPS AND GROUP SELECTION */}
            <Modal visible={isModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={[styles.modalContent, { backgroundColor: isDark ? 'rgba(30,41,59,0.9)' : 'rgba(255,255,255,0.9)' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>{isArabic ? selectedExercise?.titleAr : selectedExercise?.titleEn}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputRow}>
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: colors.mutedText }]}>{isArabic ? 'عدد الجولات (Sets)' : 'Sets'}</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                                    keyboardType="numeric"
                                    value={setsInput}
                                    onChangeText={setSetsInput}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: colors.mutedText }]}>{isArabic ? 'التكرارات (Reps)' : 'Reps'}</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                                    keyboardType="numeric"
                                    value={repsInput}
                                    onChangeText={setRepsInput}
                                />
                            </View>
                        </View>

                        <Text style={[styles.inputLabel, { color: colors.mutedText, marginTop: 20 }]}>{isArabic ? 'إضافة إلى مجموعة:' : 'Add to Group:'}</Text>

                        <ScrollView style={{ maxHeight: 150, marginVertical: 10 }}>
                            {userGroups.map(g => (
                                <TouchableOpacity
                                    key={g.id}
                                    style={[styles.groupSelector, { borderColor: selectedUserGroupId === g.id ? colors.primary : colors.border }]}
                                    onPress={() => setSelectedUserGroupId(g.id)}
                                >
                                    <Text style={{ color: selectedUserGroupId === g.id ? colors.primary : colors.text }}>{g.name}</Text>
                                    {selectedUserGroupId === g.id && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity
                                style={[styles.groupSelector, { borderColor: selectedUserGroupId === 'NEW' ? colors.primary : colors.border }]}
                                onPress={() => setSelectedUserGroupId('NEW')}
                            >
                                <Text style={{ color: selectedUserGroupId === 'NEW' ? colors.primary : colors.text }}>{isArabic ? '+ مجموعة جديدة' : '+ New Group'}</Text>
                            </TouchableOpacity>
                        </ScrollView>

                        {selectedUserGroupId === 'NEW' && (
                            <View style={{ marginBottom: 20 }}>
                                <Text style={[styles.inputLabel, { color: colors.mutedText }]}>{isArabic ? 'اسم المجموعة (مثال: تمارين الصدر)' : 'Group Name (e.g. Chest Day)'}</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background, marginTop: 4 }]}
                                    value={newGroupName}
                                    onChangeText={setNewGroupName}
                                    placeholder={isArabic ? 'أدخل الاسم هنا...' : 'Enter name here...'}
                                    placeholderTextColor={colors.mutedText}
                                />
                            </View>
                        )}

                        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveExercise}>
                            <Text style={styles.saveBtnText}>{isArabic ? 'إضافة إلى جدولي' : 'Add to My Plan'}</Text>
                        </TouchableOpacity>

                    </BlurView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 16,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        marginBottom: 8,
        marginTop: 10,
    },
    headerSubtitle: {
        fontSize: 14,
        marginBottom: 24,
    },
    accordionContainer: {
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        overflow: 'hidden',
    },
    accordionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    accordionTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    accordionContent: {
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    exerciseRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    exerciseInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    exerciseTitle: {
        fontSize: 16,
    },
    addButton: {
        padding: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        borderRadius: 20,
        padding: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        flex: 1,
    },
    inputRow: {
        flexDirection: 'row',
        gap: 16,
    },
    inputGroup: {
        flex: 1,
    },
    inputLabel: {
        fontSize: 14,
        marginBottom: 8,
        fontWeight: '600',
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        textAlign: 'center',
    },
    groupSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 12,
        borderWidth: 1,
        borderRadius: 8,
        marginBottom: 8,
    },
    saveBtn: {
        backgroundColor: '#3b82f6',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
    },
    saveBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    }
});
