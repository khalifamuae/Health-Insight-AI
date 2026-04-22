import React, { useCallback, useMemo, useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  I18nManager,
  Pressable,
  Modal,
  TextInput,
  Alert
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { isArabicLanguage } from '../lib/isArabic';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { api, queries } from '../lib/api';
import { useAppTheme } from '../context/ThemeContext';

import { formatAppDate, getDateCalendarPreference, type CalendarType } from '../lib/dateFormat';
import { scheduleLabReminderNotification } from '../services/ReminderNotificationService';

interface AllTestData {
  id: string;
  testId: string;
  nameEn: string;
  nameAr: string;
  category: string;
  importance: number;
  unit: string | null;
  normalRangeMin: number | null;
  normalRangeMax: number | null;
  recheckMonths: number | null;
  value: number;
  valueText: string | null;
  status: 'normal' | 'low' | 'high' | 'pending';
  testDate: string | null;
  pdfFileName: string | null;
  hasResult: boolean;
  order: number;
  descriptionEn?: string | null;
  descriptionAr?: string | null;
}

interface ReminderItem {
  id: string;
  testId: string;
  dueDate: string;
  sent?: boolean;
}

type SortMode = 'default' | 'bestToWorst' | 'worstToBest' | 'oldestToNewest' | 'newestToOldest';

type TestKnowledge = {
  ar: {
    role: string;
    what: string;
    sources: string;
    tip: string;
  };
  en: {
    role: string;
    what: string;
    sources: string;
    tip: string;
  };
};

const TEST_KNOWLEDGE: Record<string, TestKnowledge> = {
  'vitamin-d': {
    ar: {
      role: 'فيتامين د يساعد الجسم على امتصاص الكالسيوم، فيقوي العظام والأسنان ويدعم المناعة والعضلات.',
      what: 'فيتامين د مهم للعظام والعضلات والمناعة.',
      sources: 'يمكن أخذه من الشمس، السمك الدهني، صفار البيض، والحليب أو الأطعمة المدعمة.',
      tip: 'إذا كان منخفضًا، اسأل الطبيب عن الجرعة المناسبة ثم أعد الفحص في الموعد.',
    },
    en: {
      role: 'Vitamin D helps calcium absorption, supporting bones, teeth, immunity, and muscles.',
      what: 'Vitamin D is important for bone health, immunity, and muscle function.',
      sources: 'You can get it from regular sun exposure, fatty fish, egg yolk, and fortified foods.',
      tip: 'If your result is low, discuss an appropriate supplement dose with your doctor and recheck later.',
    },
  },
  'vitamin-b12': {
    ar: {
      role: 'فيتامين B12 مهم لتكوين الدم، وصحة الأعصاب، وإنتاج الطاقة داخل الخلايا.',
      what: 'فيتامين B12 مهم للأعصاب والدم والطاقة.',
      sources: 'يوجد غالبًا في اللحوم، السمك، البيض، الحليب، وبعض الأطعمة المدعمة.',
      tip: 'نقصه قد يسبب تعبًا أو تنميلًا. المتابعة مهمة خاصة لمن لا يتناول منتجات حيوانية.',
    },
    en: {
      role: 'Vitamin B12 supports blood formation, nerve function, and cellular energy production.',
      what: 'Vitamin B12 supports nerve health, red blood cell production, and energy.',
      sources: 'Main sources are meat, fish, eggs, dairy, and fortified foods.',
      tip: 'Low levels may cause fatigue or tingling; medical follow-up is important, especially for vegetarians.',
    },
  },
  ferritin: {
    ar: {
      role: 'الفيريتين هو مخزون الحديد في الجسم، ويساعدنا نعرف هل عندك احتياطي كافٍ من الحديد أم لا.',
      what: 'الفيريتين يوضح مخزون الحديد في الجسم.',
      sources: 'الحديد يوجد في اللحوم الحمراء، الكبد، العدس، السبانخ، والمكسرات.',
      tip: 'إذا كان منخفضًا لا تبدأ مكمل الحديد بنفسك، راجع الطبيب أولًا.',
    },
    en: {
      role: 'Ferritin reflects your stored iron, helping show whether your iron reserve is enough.',
      what: 'Ferritin reflects your body’s iron stores.',
      sources: 'Iron sources include red meat, liver, legumes, spinach, and nuts.',
      tip: 'Low ferritin is common with chronic iron deficiency; avoid starting iron supplements without medical advice.',
    },
  },
  iron: {
    ar: {
      role: 'الحديد يدخل في تكوين الهيموغلوبين الذي ينقل الأكسجين إلى أعضاء الجسم.',
      what: 'الحديد مهم للدم ونقل الأكسجين في الجسم.',
      sources: 'مصادره: اللحوم، البقوليات، الخضار الورقية، والحبوب المدعمة.',
      tip: 'امتصاص الحديد يتحسن مع فيتامين C ويقل عند شرب الشاي أو القهوة بعد الأكل مباشرة.',
    },
    en: {
      role: 'Iron is needed to make hemoglobin, which carries oxygen to body tissues.',
      what: 'Iron is essential for hemoglobin production and oxygen transport.',
      sources: 'Sources include meat, legumes, leafy greens, and fortified grains.',
      tip: 'Iron absorption improves with vitamin C and decreases with tea/coffee taken right after meals.',
    },
  },
  hba1c: {
    ar: {
      role: 'السكر التراكمي يعطي صورة عن السيطرة على السكر لفترة طويلة، وليس في لحظة واحدة فقط.',
      what: 'السكر التراكمي يوضح متوسط السكر خلال آخر 3 أشهر تقريبًا.',
      sources: 'يتأثر بالأكل اليومي، الحركة، والالتزام بالعلاج إذا كان موجودًا.',
      tip: 'التحسن يحتاج وقتًا، المهم الاستمرار على نظام مناسب.',
    },
    en: {
      role: 'HbA1c reflects long-term glucose control, not just a single moment reading.',
      what: 'HbA1c shows your average blood glucose over the last 2–3 months.',
      sources: 'It is influenced by diet pattern, physical activity, and treatment adherence if applicable.',
      tip: 'Improvement takes time; focus on consistency with balanced meals and regular activity.',
    },
  },
  glucose: {
    ar: {
      role: 'فحص الجلوكوز يوضح مستوى السكر الحالي في الدم وقت أخذ العينة.',
      what: 'فحص الجلوكوز يقيس سكر الدم وقت التحليل.',
      sources: 'قد يرتفع بعد الوجبات العالية بالسكر ومع قلة الحركة، وقد ينخفض مع الصيام الطويل أو بعض الأدوية.',
      tip: 'رقم واحد لا يكفي دائمًا. الأفضل متابعة أكثر من قراءة مع السكر التراكمي.',
    },
    en: {
      role: 'Glucose test shows your current blood sugar at the time of sampling.',
      what: 'Glucose test measures your blood sugar at a specific time.',
      sources: 'It rises with high-sugar meals and inactivity, and can drop with prolonged fasting or some medications.',
      tip: 'One value alone is often not enough; interpret trends with HbA1c and medical advice.',
    },
  },
  tsh: {
    ar: {
      role: 'TSH ينظم عمل الغدة الدرقية، والتي تؤثر على الحرق والطاقة والوزن والمزاج.',
      what: 'TSH فحص يساعد على معرفة نشاط الغدة الدرقية.',
      sources: 'الغدة تتأثر بعدة عوامل مثل اليود، الأدوية، والحالة الصحية.',
      tip: 'لا نعتمد على رقم TSH وحده، غالبًا نحتاج فحوصات أخرى مع الأعراض.',
    },
    en: {
      role: 'TSH regulates thyroid activity, which affects metabolism, energy, weight, and mood.',
      what: 'TSH is a key marker of thyroid function.',
      sources: 'Thyroid function is influenced by many factors, including iodine, medications, and overall health.',
      tip: 'Abnormal values should be interpreted with FT4/FT3 and symptoms, not TSH alone.',
    },
  },
  'total-cholesterol': {
    ar: {
      role: 'الكوليسترول الكلي يعطي نظرة عامة على دهون الدم للمساعدة في تقييم خطر أمراض القلب.',
      what: 'الكوليسترول الكلي يعطي فكرة عامة عن دهون الدم.',
      sources: 'يتأثر بالأكل، الوزن، الحركة، والعامل الوراثي.',
      tip: 'الأفضل قراءته مع LDL وHDL والدهون الثلاثية.',
    },
    en: {
      role: 'Total cholesterol gives an overall view of blood fats to help assess heart risk.',
      what: 'Total cholesterol is a general blood lipid marker.',
      sources: 'It is affected by diet, weight, physical activity, and genetics.',
      tip: 'Interpret it as part of the full lipid profile with LDL, HDL, and triglycerides.',
    },
  },
  ldl: {
    ar: {
      role: 'LDL ينقل الكوليسترول إلى الأوعية، وارتفاعه قد يزيد تراكم الدهون داخل الشرايين.',
      what: 'LDL يسمى غالبًا الكوليسترول الضار عندما يكون مرتفعًا.',
      sources: 'قد يرتفع مع الدهون المشبعة، قلة الحركة، أو العامل الوراثي.',
      tip: 'ينخفض عادة مع الأكل الصحي والحركة، وأحيانًا يحتاج دواء حسب رأي الطبيب.',
    },
    en: {
      role: 'LDL carries cholesterol to vessels; high levels can increase plaque buildup in arteries.',
      what: 'LDL is often called “bad cholesterol” when elevated.',
      sources: 'It can rise with saturated fats, inactivity, and genetic factors.',
      tip: 'Lowering LDL often involves lifestyle changes and sometimes medication based on medical assessment.',
    },
  },
  hdl: {
    ar: {
      role: 'HDL يساعد على سحب الكوليسترول الزائد من الدم وإعادته للكبد للتخلص منه.',
      what: 'HDL يسمى غالبًا الكوليسترول النافع.',
      sources: 'يتحسن غالبًا مع الرياضة المنتظمة، الوزن المناسب، والدهون الصحية.',
      tip: 'المهم ليس رقم HDL فقط، بل صحة القلب بشكل عام.',
    },
    en: {
      role: 'HDL helps remove excess cholesterol from blood and return it to the liver for disposal.',
      what: 'HDL is often called “good cholesterol.”',
      sources: 'It tends to improve with regular exercise, healthy weight, and healthy fats.',
      tip: 'Focus on overall cardiovascular risk profile, not HDL alone.',
    },
  },
  triglycerides: {
    ar: {
      role: 'الدهون الثلاثية تخزن الطاقة في الجسم، وارتفاعها قد يزيد خطر أمراض القلب والبنكرياس.',
      what: 'الدهون الثلاثية نوع من الدهون في الدم ويتأثر كثيرًا بنمط الحياة.',
      sources: 'ترتفع غالبًا مع السكريات العالية، زيادة الوزن، وقلة الحركة.',
      tip: 'تقليل السكر وزيادة الحركة يساعدان كثيرًا في تحسينها.',
    },
    en: {
      role: 'Triglycerides are a stored-energy fat; high levels may raise heart and pancreatitis risk.',
      what: 'Triglycerides are a blood fat marker strongly linked to lifestyle.',
      sources: 'They often rise with high sugar intake, excess weight, and low activity.',
      tip: 'Reducing simple sugars and increasing activity usually helps improve levels.',
    },
  },
  hemoglobin: {
    ar: {
      role: 'الهيموغلوبين هو الجزء الذي يحمل الأكسجين في كريات الدم الحمراء إلى كل أعضاء الجسم.',
      what: 'الهيموغلوبين ينقل الأكسجين في الدم.',
      sources: 'يتأثر بالحديد، فيتامين B12، الفولات، وشرب الماء والحالة الصحية.',
      tip: 'إذا كان منخفضًا فقد يكون هناك فقر دم، والأفضل معرفة السبب قبل العلاج.',
    },
    en: {
      role: 'Hemoglobin is the oxygen-carrying part of red blood cells that supplies body organs.',
      what: 'Hemoglobin carries oxygen in your blood.',
      sources: 'It is influenced by iron, B12, folate, hydration, and overall health.',
      tip: 'Low values may indicate anemia and should be evaluated for cause, not treated blindly.',
    },
  },
  'inbody-weight': {
    ar: {
      role: 'الوزن يعكس كتلة الجسم الحالية، ويُستخدم لمتابعة التغير مع الوقت.',
      what: 'هذا القياس يوضح وزن جسمك الحالي من تقرير InBody.',
      sources: 'يتأثر بالأكل، النشاط، السوائل، والوقت الذي تم فيه القياس.',
      tip: 'الأفضل متابعة التغير الأسبوعي بدل الاعتماد على قراءة يوم واحد.',
    },
    en: {
      role: 'Weight reflects your current body mass and helps track change over time.',
      what: 'This metric shows your current body weight from the InBody report.',
      sources: 'It is affected by food intake, activity, hydration, and time of measurement.',
      tip: 'Track weekly trend instead of relying on a single day reading.',
    },
  },
  'inbody-body-fat-percentage': {
    ar: {
      role: 'نسبة الدهون توضح كم من جسمك عبارة عن دهون مقارنةً بالكتلة الكلية.',
      what: 'هذا القياس يوضح نسبة دهون الجسم في تقرير InBody.',
      sources: 'تتأثر بنمط الأكل، النشاط البدني، وجودة النوم.',
      tip: 'الهدف تقليل الدهون تدريجيًا مع الحفاظ على العضلات.',
    },
    en: {
      role: 'Body fat percentage shows how much of your body is fat mass.',
      what: 'This metric shows your body fat percentage in the InBody report.',
      sources: 'It is influenced by nutrition, physical activity, and sleep quality.',
      tip: 'Aim to reduce fat gradually while preserving muscle.',
    },
  },
  'inbody-skeletal-muscle-mass': {
    ar: {
      role: 'كتلة العضلات مهمة للقوة، الحركة، ورفع معدل الحرق.',
      what: 'هذا القياس يوضح كتلة العضلات الهيكلية من تقرير InBody.',
      sources: 'تتحسن مع تمارين المقاومة والبروتين الكافي والنوم الجيد.',
      tip: 'لتحسينها ركز على التمرين المنتظم مع غذاء متوازن.',
    },
    en: {
      role: 'Skeletal muscle mass supports strength, mobility, and metabolic rate.',
      what: 'This metric shows skeletal muscle mass from the InBody report.',
      sources: 'It improves with resistance training, enough protein, and quality sleep.',
      tip: 'For improvement, follow regular training and balanced nutrition.',
    },
  },
  'inbody-bmi': {
    ar: {
      role: 'BMI مؤشر عام للعلاقة بين الوزن والطول.',
      what: 'هذا القياس يوضح مؤشر كتلة الجسم من تقرير InBody.',
      sources: 'يعتمد على الوزن والطول فقط ولا يفرق بدقة بين الدهون والعضلات.',
      tip: 'استخدمه مع نسبة الدهون وكتلة العضلات لقراءة أدق.',
    },
    en: {
      role: 'BMI is a general index for the relation between weight and height.',
      what: 'This metric shows Body Mass Index from the InBody report.',
      sources: 'It uses only weight and height and does not fully separate fat from muscle.',
      tip: 'Use it alongside body fat and muscle mass for better interpretation.',
    },
  },
  'inbody-visceral-fat-level': {
    ar: {
      role: 'الدهون الحشوية هي الدهون حول الأعضاء الداخلية، وارتفاعها غير مرغوب.',
      what: 'هذا القياس يوضح مستوى الدهون الحشوية في تقرير InBody.',
      sources: 'يرتفع غالبًا مع قلة الحركة وزيادة الدهون حول البطن.',
      tip: 'النشاط المنتظم وتقليل السكريات يساعدان عادة على تحسينه.',
    },
    en: {
      role: 'Visceral fat is fat around internal organs, and high levels are undesirable.',
      what: 'This metric shows visceral fat level in the InBody report.',
      sources: 'It commonly increases with inactivity and abdominal fat gain.',
      tip: 'Regular activity and reducing sugar intake usually help.',
    },
  },
  'inbody-bmr': {
    ar: {
      role: 'معدل الحرق الأساسي هو السعرات التي يحتاجها جسمك في الراحة للحفاظ على الوظائف الحيوية.',
      what: 'هذا القياس يوضح BMR من تقرير InBody.',
      sources: 'يتأثر غالبًا بكتلة العضلات، العمر، الجنس، والوزن.',
      tip: 'يساعدك في تحديد سعراتك اليومية بشكل أدق.',
    },
    en: {
      role: 'BMR is the calories your body needs at rest for vital functions.',
      what: 'This metric shows BMR from the InBody report.',
      sources: 'It is mainly affected by muscle mass, age, sex, and body weight.',
      tip: 'It helps set a more accurate daily calorie target.',
    },
  },
  'inbody-total-body-water': {
    ar: {
      role: 'ماء الجسم مهم لنقل الغذاء، تنظيم الحرارة، ووظائف الخلايا.',
      what: 'هذا القياس يوضح مستوى ماء الجسم في تقرير InBody.',
      sources: 'يتأثر بشرب الماء، الأملاح، النشاط، والوقت الذي تم فيه القياس.',
      tip: 'حافظ على شرب الماء بانتظام وخذ القياس بنفس الظروف كل مرة.',
    },
    en: {
      role: 'Body water is essential for nutrient transport, temperature control, and cell function.',
      what: 'This metric shows body water level from the InBody report.',
      sources: 'It is influenced by hydration, electrolytes, activity, and measurement timing.',
      tip: 'Stay consistently hydrated and measure under similar conditions each time.',
    },
  },
  'vitamin-c': {
    ar: { role: 'يدعم المناعة وتصنيع الكولاجين.', what: 'فيتامين C (حمض الأسكوربيك).', sources: 'الحمضيات، الفلفل، الفراولة.', tip: 'تأكد من تناول الخضار والفواكه الطازجة.' },
    en: { role: 'Supports immunity and collagen synthesis.', what: 'Vitamin C (Ascorbic Acid).', sources: 'Citrus, peppers, strawberries.', tip: 'Ensure fresh fruits and vegetables in your diet.' }
  },
  'vitamin-a': {
    ar: { role: 'مهم للرؤية، المناعة، وصحة الجلد.', what: 'فيتامين A ضروري للخلايا.', sources: 'الكبد، الجزر، البطاطا الحلوة.', tip: 'زيادته قد تكون ضارة، تابعه مع طبيبك.' },
    en: { role: 'Important for vision, immunity, and skin.', what: 'Vitamin A is essential for cellular health.', sources: 'Liver, carrots, sweet potatoes.', tip: 'Excess can be toxic, monitor with a doctor.' }
  },
  'vitamin-e': {
    ar: { role: 'مضاد أكسدة قوي يحمي الخلايا من التلف.', what: 'فيتامين E.', sources: 'المكسرات، البذور، الزيوت النباتية.', tip: 'تناول المكسرات باعتدال لزيادة مستوياته.' },
    en: { role: 'Strong antioxidant protecting cells from damage.', what: 'Vitamin E.', sources: 'Nuts, seeds, vegetable oils.', tip: 'Eat nuts in moderation to boost levels.' }
  },
  'folate': {
    ar: { role: 'مهم لانقسام الخلايا وتكوين الدم.', what: 'حمض الفوليك (فيتامين ب9).', sources: 'الخضار الورقية، البقوليات.', tip: 'ضروري جداً قبل وخلال فترة الحمل.' },
    en: { role: 'Important for cell division and blood formation.', what: 'Folic acid (Vitamin B9).', sources: 'Leafy greens, legumes.', tip: 'Crucial before and during pregnancy.' }
  },
  'calcium': {
    ar: { role: 'بناء العظام والأسنان ووظائف العضلات.', what: 'الكالسيوم في الدم.', sources: 'الألبان، الخضار الورقية الداكنة.', tip: 'يحتاج فيتامين د ليتم امتصاصه بشكل جيد.' },
    en: { role: 'Builds bones, teeth, and muscle functions.', what: 'Blood calcium.', sources: 'Dairy, dark leafy greens.', tip: 'Requires Vitamin D for good absorption.' }
  },
  'magnesium': {
    ar: { role: 'يساعد في عمل العضلات والأعصاب وتوليد الطاقة.', what: 'المغنيسيوم.', sources: 'المكسرات، البذور، الحبوب الكاملة.', tip: 'نقصه قد يسبب شد عضلي أو إرهاق.' },
    en: { role: 'Helps muscle/nerve function and energy production.', what: 'Magnesium.', sources: 'Nuts, seeds, whole grains.', tip: 'Deficiency can cause cramps or fatigue.' }
  },
  'zinc': {
    ar: { role: 'مهم جداً للمناعة والتئام الجروح وتصنيع البروتين.', what: 'الزنك.', sources: 'اللحوم، المأكولات البحرية، البقوليات.', tip: 'تناوله مع مصادر بروتينية يحسن امتصاصه.' },
    en: { role: 'Crucial for immunity, wound healing, and proteins.', what: 'Zinc.', sources: 'Meat, seafood, legumes.', tip: 'Eating with protein improves absorption.' }
  },
  'potassium': {
    ar: { role: 'ينظم ضغط الدم ونبض القلب وتوازن السوائل.', what: 'البوتاسيوم.', sources: 'الموز، البطاطس، السبانخ.', tip: 'توازن البوتاسيوم مع الصوديوم مهم جداً للقلب.' },
    en: { role: 'Regulates blood pressure, heartbeat, fluid balance.', what: 'Potassium.', sources: 'Bananas, potatoes, spinach.', tip: 'Balancing it with sodium is key for the heart.' }
  },
  'sodium': {
    ar: { role: 'يحافظ على توازن السوائل وضغط الدم.', what: 'الصوديوم.', sources: 'ملح الطعام، الأطعمة المصنعة.', tip: 'ارتفاعه قد يسبب ارتفاع ضغط الدم، قلل من الملح.' },
    en: { role: 'Maintains fluid balance and blood pressure.', what: 'Sodium.', sources: 'Table salt, processed foods.', tip: 'High levels raise blood pressure, reduce salt.' }
  },
  't3': {
    ar: { role: 'الهرمون النشط للغدة الدرقية، ينظم الحرق.', what: 'هرمون T3 (ثلاثي يود الثيرونين).', sources: 'تنتجه الغدة الدرقية.', tip: 'قراءته مع TSH و T4 تعطي صورة أوضح لنشاط الغدة.' },
    en: { role: 'Active thyroid hormone, regulates metabolism.', what: 'T3 (Triiodothyronine).', sources: 'Produced by thyroid gland.', tip: 'Read alongside TSH and T4 for a clearer picture.' }
  },
  't4': {
    ar: { role: 'الهرمون الأساسي للغدة الدرقية.', what: 'هرمون T4 (الثيروكسين).', sources: 'تنتجه الغدة الدرقية.', tip: 'يتحول في الجسم إلى T3 ليصبح نشطاً.' },
    en: { role: 'Main thyroid hormone.', what: 'T4 (Thyroxine).', sources: 'Produced by thyroid gland.', tip: 'Converts into T3 in the body to become active.' }
  },
  'free-t4': {
    ar: { role: 'الجزء الحر غير المرتبط ببروتين من T4.', what: 'T4 الحر.', sources: 'تفرزه الغدة الدرقية.', tip: 'يعتبر مؤشر أدق من T4 الكلي في بعض الحالات.' },
    en: { role: 'Unbound, active portion of T4.', what: 'Free T4.', sources: 'Secreted by thyroid gland.', tip: 'Often a more accurate marker than total T4.' }
  },
  'testosterone': {
    ar: { role: 'الهرمون الذكري الأساسي، مهم للعضلات والطاقة.', what: 'التستوستيرون.', sources: 'ينتجه الجسم يتأثر بالرياضة والنوم.', tip: 'الرياضة ونزول الوزن يساعدان في تحسين مستواه.' },
    en: { role: 'Primary male hormone, key for muscle and energy.', what: 'Testosterone.', sources: 'Produced by the body, affected by exercise/sleep.', tip: 'Exercise and weight loss help improve levels.' }
  },
  'estradiol': {
    ar: { role: 'الهرمون الأنثوي الأساسي، مهم للعظام والصحة الإنجابية.', what: 'الإستراديول (E2).', sources: 'المبيضان (عند النساء).', tip: 'مستوياته تتغير خلال الشهر وفي مراحل العمر المختلفة.' },
    en: { role: 'Primary female hormone, key for bones and reproductive health.', what: 'Estradiol (E2).', sources: 'Ovaries (in women).', tip: 'Levels fluctuate during the cycle and life stages.' }
  },
  'progesterone': {
    ar: { role: 'ينظم الدورة الشهرية ويدعم الحمل.', what: 'البروجسترون.', sources: 'المبيضان بعد التبويض.', tip: 'يستخدم للتأكد من حدوث التبويض أو متابعة الحمل.' },
    en: { role: 'Regulates menstrual cycle and supports pregnancy.', what: 'Progesterone.', sources: 'Ovaries after ovulation.', tip: 'Used to confirm ovulation or monitor pregnancy.' }
  },
  'prolactin': {
    ar: { role: 'يحفز إنتاج الحليب ويتأثر بالتوتر.', what: 'البرولاكتين (هرمون الحليب).', sources: 'الغدة النخامية في الدماغ.', tip: 'ارتفاعه قد يؤثر على الدورة الشهرية والإنجاب.' },
    en: { role: 'Stimulates milk production and is affected by stress.', what: 'Prolactin.', sources: 'Pituitary gland in the brain.', tip: 'High levels can affect menstruation and fertility.' }
  },
  'cortisol': {
    ar: { role: 'هرمون التوتر، يساعد في تنظيم السكر والالتهاب.', what: 'الكورتيزول.', sources: 'الغدة الكظرية.', tip: 'أعلى مستوياته في الصباح، ويتأثر بالضغط النفسي.' },
    en: { role: 'Stress hormone, helps regulate sugar and inflammation.', what: 'Cortisol.', sources: 'Adrenal gland.', tip: 'Peaks in the morning, strongly affected by stress.' }
  },
  'dhea': {
    ar: { role: 'مقدمة لتصنيع هرمونات أخرى مثل التستوستيرون.', what: 'DHEA-S.', sources: 'الغدة الكظرية.', tip: 'مؤشر لنشاط الغدة الكظرية وإنتاج الهرمونات.' },
    en: { role: 'Precursor to other hormones like testosterone.', what: 'DHEA-S.', sources: 'Adrenal gland.', tip: 'Marker for adrenal function and hormone production.' }
  },
  'pth': {
    ar: { role: 'ينظم مستويات الكالسيوم والفوسفور في الدم.', what: 'هرمون الجار درقية (PTH).', sources: 'الغدد الجار درقية.', tip: 'يقيم عادة مع مستوى الكالسيوم وفيتامين د.' },
    en: { role: 'Regulates blood calcium and phosphorus.', what: 'Parathyroid Hormone (PTH).', sources: 'Parathyroid glands.', tip: 'Usually evaluated alongside calcium and Vitamin D.' }
  },
  'insulin': {
    ar: { role: 'ينظم دخول السكر للخلايا لإنتاج الطاقة.', what: 'الأنسولين الصائم.', sources: 'البنكرياس.', tip: 'ارتفاعه قد يدل على مقاومة الأنسولين، ركز على الحركة وتقليل السكر.' },
    en: { role: 'Regulates sugar entry into cells for energy.', what: 'Fasting Insulin.', sources: 'Pancreas.', tip: 'High levels may indicate insulin resistance, focus on activity and low sugar.' }
  },
  'creatinine': {
    ar: { role: 'ناتج فضلات العضلات، تصفيه الكلى.', what: 'الكرياتينين.', sources: 'الكتلة العضلية واللحوم.', tip: 'مؤشر مهم جداً لوظائف الكلى، شرب الماء مهم.' },
    en: { role: 'Muscle waste product filtered by kidneys.', what: 'Creatinine.', sources: 'Muscle mass and meat intake.', tip: 'A crucial kidney function marker, hydration is key.' }
  },
  'bun': {
    ar: { role: 'ناتج تكسير البروتينات، تصفيه الكلى.', what: 'نيتروجين يوريا الدم (BUN).', sources: 'البروتينات في الغذاء.', tip: 'يرتفع مع الجفاف أو مشاكل الكلى.' },
    en: { role: 'Protein breakdown product filtered by kidneys.', what: 'Blood Urea Nitrogen (BUN).', sources: 'Dietary proteins.', tip: 'Elevated by dehydration or kidney issues.' }
  },
  'uric-acid': {
    ar: { role: 'ناتج طبيعي لتكسير بعض المواد (البيورينات).', what: 'حمض اليوريك.', sources: 'اللحوم الحمراء، البقوليات، وبعض الأسماك.', tip: 'ارتفاعه قد يسبب النقرس، ينصح بشرب الماء وتقليل اللحوم.' },
    en: { role: 'Natural byproduct of breaking down purines.', what: 'Uric Acid.', sources: 'Red meat, legumes, some fish.', tip: 'High levels can cause gout, hydrate well and limit meat.' }
  },
  'alt': {
    ar: { role: 'إنزيم كبدي، يرتفع عند وجود ضرر في خلايا الكبد.', what: 'إنزيم الكبد ALT.', sources: 'الكبد بشكل أساسي.', tip: 'مؤشر دقيق لصحة الكبد، يتأثر بالوزن والأدوية.' },
    en: { role: 'Liver enzyme, elevated when liver cells are damaged.', what: 'ALT.', sources: 'Primarily the liver.', tip: 'Accurate liver health marker, affected by weight and meds.' }
  },
  'ast': {
    ar: { role: 'إنزيم موجود في الكبد والقلب والعضلات.', what: 'إنزيم الكبد AST.', sources: 'الكبد، القلب، العضلات.', tip: 'يقرأ عادة مع ALT لتقييم صحة الكبد.' },
    en: { role: 'Enzyme in liver, heart, and muscles.', what: 'AST.', sources: 'Liver, heart, muscles.', tip: 'Usually read with ALT to assess liver health.' }
  },
  'bilirubin': {
    ar: { role: 'ناتج تكسير خلايا الدم الحمراء، يعالجه الكبد.', what: 'البيليروبين الكلي.', sources: 'تكسر الدم الطبيعي.', tip: 'ارتفاعه يسبب اصفرار الجلد (اليرقان).' },
    en: { role: 'Byproduct of red blood cell breakdown, processed by liver.', what: 'Total Bilirubin.', sources: 'Normal blood breakdown.', tip: 'High levels cause skin yellowing (jaundice).' }
  },
  'albumin': {
    ar: { role: 'البروتين الرئيسي في الدم، يصنعه الكبد.', what: 'الألبومين.', sources: 'الكبد.', tip: 'يحافظ على السوائل في الأوعية ومؤشر للتغذية الجيدة.' },
    en: { role: 'Main blood protein, made by the liver.', what: 'Albumin.', sources: 'Liver.', tip: 'Keeps fluid in vessels, marker of good nutrition.' }
  },
  'crp': {
    ar: { role: 'بروتين يرتفع بسرعة عند وجود التهاب أو عدوى.', what: 'بروتين سي التفاعلي (CRP).', sources: 'الكبد استجابة للالتهاب.', tip: 'مؤشر عام للالتهاب، لا يحدد مكانه بالضبط.' },
    en: { role: 'Protein that rises quickly during inflammation or infection.', what: 'C-Reactive Protein (CRP).', sources: 'Liver in response to inflammation.', tip: 'General inflammation marker, does not pinpoint location.' }
  },
  'hs-crp': {
    ar: { role: 'يقيس مستويات منخفضة جداً من الالتهاب لتقييم صحة القلب.', what: 'CRP عالي الحساسية.', sources: 'التهابات الأوعية الدموية.', tip: 'يستخدم لتقييم خطر الإصابة بأمراض القلب مستقبلاً.' },
    en: { role: 'Measures very low inflammation levels to assess heart health.', what: 'High-Sensitivity CRP.', sources: 'Blood vessel inflammation.', tip: 'Used to assess future cardiovascular risk.' }
  },
  'esr': {
    ar: { role: 'يقيس سرعة ترسب خلايا الدم الحمراء كمؤشر للالتهاب.', what: 'سرعة الترسيب (ESR).', sources: 'التهابات مزمنة أو عدوى.', tip: 'مؤشر بطيء نسبياً للالتهاب مقارنة بـ CRP.' },
    en: { role: 'Measures how quickly red blood cells settle, indicating inflammation.', what: 'Erythrocyte Sedimentation Rate (ESR).', sources: 'Chronic inflammation or infection.', tip: 'Relatively slow inflammation marker compared to CRP.' }
  },
  'wbc': {
    ar: { role: 'خلايا المناعة التي تدافع عن الجسم ضد العدوى.', what: 'كريات الدم البيضاء.', sources: 'نخاع العظم.', tip: 'ترتفع في حالات العدوى والالتهابات.' },
    en: { role: 'Immune cells defending against infections.', what: 'White Blood Cells (WBC).', sources: 'Bone marrow.', tip: 'Elevated during infections and inflammation.' }
  },
  'rbc': {
    ar: { role: 'الخلايا التي تنقل الأكسجين لجميع أنحاء الجسم.', what: 'كريات الدم الحمراء.', sources: 'نخاع العظم.', tip: 'نقصها يشير إلى فقر الدم (الأنيميا).' },
    en: { role: 'Cells that carry oxygen throughout the body.', what: 'Red Blood Cells (RBC).', sources: 'Bone marrow.', tip: 'Low count indicates anemia.' }
  },
  'platelets': {
    ar: { role: 'تساعد في تجلط الدم لمنع النزيف.', what: 'الصفائح الدموية.', sources: 'نخاع العظم.', tip: 'مهمة جداً لوقف النزيف عند الجروح.' },
    en: { role: 'Helps blood clot to stop bleeding.', what: 'Platelets.', sources: 'Bone marrow.', tip: 'Crucial for stopping bleeding from wounds.' }
  },
  'pt': {
    ar: { role: 'يقيس سرعة تجلط الدم (المسار الخارجي).', what: 'زمن البروثرومبين (PT).', sources: 'عوامل التخثر من الكبد.', tip: 'يستخدم لمتابعة أدوية سيولة الدم مثل الوارفارين.' },
    en: { role: 'Measures blood clotting speed (extrinsic pathway).', what: 'Prothrombin Time (PT).', sources: 'Clotting factors from liver.', tip: 'Used to monitor blood thinners like Warfarin.' }
  },
  'ptt': {
    ar: { role: 'يقيس سرعة تجلط الدم (المسار الداخلي).', what: 'زمن الثرومبوبلاستين (PTT).', sources: 'عوامل التخثر.', tip: 'يستخدم لتقييم النزيف ومتابعة علاج الهيبارين.' },
    en: { role: 'Measures blood clotting speed (intrinsic pathway).', what: 'Partial Thromboplastin Time (PTT).', sources: 'Clotting factors.', tip: 'Used to assess bleeding and monitor Heparin therapy.' }
  },
  'inr': {
    ar: { role: 'معيار دولي لسرعة تجلط الدم مبني على PT.', what: 'معدل التخثر الدولي (INR).', sources: 'حساب رياضي لزمن التخثر.', tip: 'إذا كنت تأخذ أدوية سيولة، فالطبيب يحدد لك الرقم المستهدف.' },
    en: { role: 'Standardized international clotting measure based on PT.', what: 'International Normalized Ratio (INR).', sources: 'Mathematical calculation of clotting time.', tip: 'If on blood thinners, your doctor sets a target range.' }
  },
  'd-dimer': {
    ar: { role: 'ناتج تحلل الجلطات الدموية.', what: 'دي-دايمر.', sources: 'تكسر الفيبرين (الجلطة).', tip: 'ارتفاعه لا يعني بالضرورة وجود جلطة خطيرة، الطبيب يقيمه مع الأعراض.' },
    en: { role: 'Byproduct of blood clot breakdown.', what: 'D-Dimer.', sources: 'Fibrin (clot) breakdown.', tip: 'Elevation does not always mean a dangerous clot; evaluated with symptoms.' }
  },
  'fibrinogen': {
    ar: { role: 'بروتين يساعد في تكوين شبكة الجلطة الدموية.', what: 'الفيبرينوجين.', sources: 'الكبد.', tip: 'يرتفع كاستجابة للالتهابات ويساعد في وقف النزيف.' },
    en: { role: 'Protein that helps form blood clot mesh.', what: 'Fibrinogen.', sources: 'Liver.', tip: 'Rises during inflammation and helps stop bleeding.' }
  }
};

function getCategoryRoleDescription(category: string, isArabic: boolean): string {
  const ar: Record<string, string> = {
    vitamins: 'الفيتامينات تساعد الجسم على العمل بشكل سليم وتقوي المناعة والطاقة حسب النوع.',
    minerals: 'المعادن مهمة لبناء الجسم وتنظيم السوائل والأعصاب والعضلات.',
    hormones: 'الهرمونات تنظم وظائف كثيرة مثل النوم، المزاج، النمو، والتمثيل الغذائي.',
    organ_functions: 'هذه الفحوصات توضح كفاءة عمل الأعضاء مثل الكبد والكلى.',
    lipids: 'دهون الدم تساعد في تقييم صحة القلب والشرايين.',
    immunity: 'فحوصات المناعة تساعد في معرفة حالة دفاع الجسم ضد الأمراض.',
    blood: 'فحوصات الدم تساعد في معرفة قوة الدم وقدرته على نقل الأكسجين.',
    coagulation: 'فحوصات التخثر توضح سرعة تجلط الدم وتساعد على تجنب النزيف أو الجلطات.',
    special: 'هذا فحص متخصص يعطي معلومات إضافية مهمة حسب الحالة.',
  };
  const en: Record<string, string> = {
    vitamins: 'Vitamins help the body work properly and support immunity and energy depending on the type.',
    minerals: 'Minerals are important for body structure, fluid balance, nerves, and muscles.',
    hormones: 'Hormones regulate many functions like sleep, mood, growth, and metabolism.',
    organ_functions: 'These tests show how well organs like the liver and kidneys are working.',
    lipids: 'Blood lipids help assess heart and blood vessel health.',
    immunity: 'Immune tests help show how your body defends against disease.',
    blood: 'Blood tests help evaluate blood strength and oxygen transport.',
    coagulation: 'Coagulation tests show how quickly blood clots and help avoid bleeding or clots.',
    special: 'This is a specialized test that gives extra information based on your condition.',
  };
  return isArabic
    ? (ar[category] || 'هذا الفحص يساعدك على فهم جزء مهم من صحتك.')
    : (en[category] || 'This test helps you understand an important part of your health.');
}

function getKnowledgeSection(testId: string, category: string, isArabic: boolean): string | null {
  const info = TEST_KNOWLEDGE[testId];
  if (!info) return null;
  const chosen = isArabic ? info.ar : info.en;
  const role = chosen.role || getCategoryRoleDescription(category, isArabic);
  if (isArabic) {
    return `وظيفته في الجسم:\n${role}\n\nما هذا الفحص؟\n${chosen.what}\n\nمن أين أستفيد منه؟\n${chosen.sources}\n\nنصيحة بسيطة:\n${chosen.tip}`;
  }
  return `Its role in the body:\n${role}\n\nWhat is this test?\n${chosen.what}\n\nKey sources/factors:\n${chosen.sources}\n\nPractical tip:\n${chosen.tip}`;
}

function getCategorySimpleLabel(category: string, isArabic: boolean): string {
  const ar: Record<string, string> = {
    vitamins: 'فيتامين',
    minerals: 'معدن',
    hormones: 'هرمون',
    organ_functions: 'وظائف أعضاء',
    lipids: 'دهون الدم',
    immunity: 'المناعة',
    blood: 'صحة الدم',
    coagulation: 'التخثر',
    special: 'فحص متخصص',
  };
  const en: Record<string, string> = {
    vitamins: 'vitamin marker',
    minerals: 'mineral marker',
    hormones: 'hormone marker',
    organ_functions: 'organ function marker',
    lipids: 'blood lipid marker',
    immunity: 'immune marker',
    blood: 'blood health marker',
    coagulation: 'coagulation marker',
    special: 'specialized marker',
  };
  return isArabic ? (ar[category] || 'مؤشر صحي') : (en[category] || 'health marker');
}

function buildFriendlyExplanation(test: AllTestData, isArabic: boolean): string {
  const categoryLabel = getCategorySimpleLabel(test.category, isArabic);
  const hasRange = test.normalRangeMin !== null && test.normalRangeMax !== null;
  const unitText = test.unit ? ` ${test.unit}` : '';
  const valueText = test.hasResult ? `${test.value}${unitText}` : (isArabic ? 'غير متوفر' : 'Not available');
  const rangeText = hasRange
    ? `${test.normalRangeMin} - ${test.normalRangeMax}${unitText}`
    : (isArabic ? 'غير محدد لهذا الفحص' : 'Not defined for this test');

  const statusLine = !test.hasResult || test.status === 'pending'
    ? (isArabic
      ? 'الحالة الحالية: لا توجد نتيجة حديثة لهذا الفحص حتى الآن.'
      : 'Current status: No recent result yet for this test.')
    : test.status === 'normal'
      ? (isArabic
        ? 'الحالة الحالية: النتيجة ضمن المعدل الطبيعي.'
        : 'Current status: Your result is within the normal range.')
      : test.status === 'high'
        ? (isArabic
          ? 'الحالة الحالية: النتيجة أعلى من المعدل الطبيعي.'
          : 'Current status: Your result is above the normal range.')
        : (isArabic
          ? 'الحالة الحالية: النتيجة أقل من المعدل الطبيعي.'
          : 'Current status: Your result is below the normal range.');

  const roleText = isArabic
    ? `هذا الفحص من نوع ${categoryLabel} ويساعدك تفهم جزء مهم من صحتك.`
    : `This test is a ${categoryLabel} and helps you understand an important part of your health in a simple way.`;

  const rangeLine = isArabic
    ? `المعدل الطبيعي التقريبي: ${rangeText}`
    : `Approximate normal range: ${rangeText}`;

  const valueLine = isArabic
    ? `قيمتك الحالية: ${valueText}`
    : `Your current value: ${valueText}`;

  const adviceLine = isArabic
    ? 'النصيحة: تابع النتيجة مع الوقت ولا تعتمد على قراءة واحدة فقط. إذا استمرت خارج الطبيعي راجع الطبيب.'
    : 'Tip: Track the trend over time (improving or worsening) and do not rely on one number only. Consult your doctor if results stay outside normal.';

  const disclaimerLine = isArabic
    ? 'هذا شرح مبسط للتوعية فقط وليس تشخيصًا طبيًا.'
    : 'This is an educational summary and is not a medical diagnosis.';

  const knowledgeSection = getKnowledgeSection(test.testId, test.category, isArabic);
  if (knowledgeSection) {
    return [knowledgeSection, valueLine, rangeLine, statusLine, adviceLine, disclaimerLine].join('\n\n');
  }
  return [roleText, valueLine, rangeLine, statusLine, adviceLine, disclaimerLine].join('\n\n');
}

const StatusBadge = ({ status, hasResult, styles }: { status: string; hasResult: boolean; styles: any }) => {
  const { t } = useTranslation();

  if (!hasResult) {
    return (
      <View style={[styles.badge, styles.pendingBadge]}>
        <Ionicons name="time-outline" size={12} color="#64748b" />
        <Text style={styles.pendingBadgeText}>{t('pending')}</Text>
      </View>
    );
  }

  if (status === 'normal') {
    return (
      <View style={[styles.badge, styles.normalBadge]}>
        <Ionicons name="checkmark-circle" size={12} color="#16a34a" />
        <Text style={styles.normalBadgeText}>{t('normal')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.badge, styles.abnormalBadge]}>
      <Ionicons name="close-circle" size={12} color="#dc2626" />
      <Text style={styles.abnormalBadgeText}>
        {status === 'high' ? t('high') : t('low')}
      </Text>
    </View>
  );
};

const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    vitamins: '#f59e0b',
    minerals: '#10b981',
    hormones: '#8b5cf6',
    organ_functions: '#3b82f6',
    lipids: '#ef4444',
    immunity: '#06b6d4',
    blood: '#ec4899',
    coagulation: '#f97316',
    special: '#6366f1'
  };
  return colors[category] || '#64748b';
};

const isInBodyTest = (testId: string): boolean => testId.startsWith('inbody-');

const getCategoryIcon = (category: string): string => {
  const icons: Record<string, string> = {
    all: 'apps',
    inbody: 'body',
    vitamins: 'sunny',
    minerals: 'diamond',
    hormones: 'pulse',
    organ_functions: 'fitness',
    lipids: 'water',
    immunity: 'shield-checkmark',
    blood: 'color-fill',
    coagulation: 'bandage',
    special: 'star'
  };
  return icons[category] || 'ellipse';
};

function getStatusScore(test: AllTestData): number {
  if (!test.hasResult) return 1;
  if (test.status === 'normal') return 0;
  if (test.normalRangeMin !== null && test.normalRangeMax !== null && test.value !== 0) {
    const mid = (test.normalRangeMin + test.normalRangeMax) / 2;
    const range = test.normalRangeMax - test.normalRangeMin;
    if (range > 0) {
      return Math.abs(test.value - mid) / range;
    }
  }
  return 2;
}


export default function TestsScreen({ route, navigation }: any) {
  const { clientId } = route?.params || {};
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const queryClient = useQueryClient();
  const isArabic = isArabicLanguage();
  const styles = getStyles(isArabic);
  const [dateCalendar, setDateCalendar] = useState<CalendarType>('gregorian');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [selectedReminderTestId, setSelectedReminderTestId] = useState<string | null>(null);
  const [selectedReminderTestName, setSelectedReminderTestName] = useState<string>('');
  const [reminderDateInput, setReminderDateInput] = useState('');
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [selectedInfoTitle, setSelectedInfoTitle] = useState('');
  const [selectedInfoDescription, setSelectedInfoDescription] = useState('');

  const { data: allTests, isLoading } = useQuery({
    queryKey: ['allTests', clientId],
    queryFn: () => queries.allTests(clientId)
  });
  const { data: reminders } = useQuery({
    queryKey: ['reminders', clientId],
    queryFn: () => queries.reminders(clientId)
  });

  const tests = (allTests as AllTestData[]) || [];
  const remindersList = (reminders as ReminderItem[]) || [];

  useFocusEffect(
    useCallback(() => {
      getDateCalendarPreference()
        .then(setDateCalendar)
        .catch(() => setDateCalendar('gregorian'));
    }, [])
  );

  useLayoutEffect(() => {
    if (clientId) {
      navigation.setOptions({
        headerLeft: () => (
          <TouchableOpacity 
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}
            onPress={() => clientId ? navigation.getParent()?.goBack() : navigation.goBack()}
          >
            <Ionicons name={isArabic ? 'chevron-forward' : 'chevron-back'} size={28} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: 17, marginHorizontal: 4 }}>
               {isArabic ? 'ملف المشترك' : 'Client Profile'}
            </Text>
          </TouchableOpacity>
        ),
        headerRight: undefined
      });
    }
  }, [navigation, clientId, isArabic, colors.primary]);

  const categories = ['all', 'inbody', 'vitamins', 'minerals', 'hormones', 'organ_functions', 'lipids', 'immunity', 'blood', 'coagulation', 'special'];

  const remindersByTest = useMemo(() => {
    const map: Record<string, ReminderItem> = {};
    for (const reminder of remindersList) {
      map[reminder.testId] = reminder;
    }
    return map;
  }, [remindersList]);

  const saveReminderMutation = useMutation({
    mutationFn: async ({ testId, dueDate }: { testId: string; dueDate: string }) => {
      return api.post('/api/reminders', { testId, dueDate });
    },
    onSuccess: async (_data, variables) => {
      await scheduleLabReminderNotification({
        testId: variables.testId,
        testName: selectedReminderTestName || (isArabic ? 'الفحص' : 'Lab Test'),
        dueDateIso: variables.dueDate,
        isArabic,
      });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      Alert.alert(
        isArabic ? 'تم حفظ التذكير' : 'Reminder Saved',
        isArabic ? 'سيتم تذكيرك بالتاريخ المحدد.' : 'You will be reminded on the selected date.'
      );
      setIsReminderModalOpen(false);
      setSelectedReminderTestId(null);
      setSelectedReminderTestName('');
      setReminderDateInput('');
    },
    onError: () => {
      Alert.alert(
        isArabic ? 'خطأ' : 'Error',
        isArabic ? 'تعذر حفظ التذكير، حاول مرة أخرى.' : 'Failed to save reminder. Please try again.'
      );
    },
  });

  const openReminderModal = (testId: string, testName: string, existingDueDate?: string) => {
    setSelectedReminderTestId(testId);
    setSelectedReminderTestName(testName);
    if (existingDueDate) {
      setReminderDateInput(existingDueDate.slice(0, 10));
    } else {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      setReminderDateInput(d.toISOString().slice(0, 10));
    }
    setIsReminderModalOpen(true);
  };

  const submitReminder = () => {
    if (!selectedReminderTestId) return;
    const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoRegex.test(reminderDateInput)) {
      Alert.alert(
        isArabic ? 'صيغة تاريخ غير صحيحة' : 'Invalid Date Format',
        isArabic ? 'اكتب التاريخ بهذا الشكل: 2026-03-15' : 'Use this format: 2026-03-15'
      );
      return;
    }

    const dueDate = new Date(`${reminderDateInput}T09:00:00`);
    if (Number.isNaN(dueDate.getTime())) {
      Alert.alert(isArabic ? 'تاريخ غير صالح' : 'Invalid Date');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dueDate < today) {
      Alert.alert(
        isArabic ? 'التاريخ في الماضي' : 'Date Is In The Past',
        isArabic ? 'اختر تاريخًا اليوم أو لاحقًا.' : 'Choose today or a future date.'
      );
      return;
    }

    saveReminderMutation.mutate({ testId: selectedReminderTestId, dueDate: dueDate.toISOString() });
  };

  const filteredAndSortedTests = useMemo(() => {
    let result = tests;
    if (selectedCategory && selectedCategory !== 'all') {
      result = selectedCategory === 'inbody'
        ? tests.filter(test => isInBodyTest(test.testId))
        : tests.filter(test => !isInBodyTest(test.testId) && test.category === selectedCategory);
    }

    if (sortMode === 'bestToWorst') {
      result = [...result].sort((a, b) => getStatusScore(a) - getStatusScore(b));
    } else if (sortMode === 'worstToBest') {
      result = [...result].sort((a, b) => getStatusScore(b) - getStatusScore(a));
    } else if (sortMode === 'oldestToNewest') {
      result = [...result].sort((a, b) => {
        const aTime = a.testDate ? new Date(a.testDate).getTime() : 0;
        const bTime = b.testDate ? new Date(b.testDate).getTime() : 0;
        return aTime - bTime;
      });
    } else if (sortMode === 'newestToOldest') {
      result = [...result].sort((a, b) => {
        const aTime = a.testDate ? new Date(a.testDate).getTime() : 0;
        const bTime = b.testDate ? new Date(b.testDate).getTime() : 0;
        return bTime - aTime;
      });
    }

    return result;
  }, [tests, selectedCategory, sortMode]);

  const testsWithResults = filteredAndSortedTests.filter(t => t.hasResult).length;
  const abnormalTests = filteredAndSortedTests.filter(t => t.status === 'high' || t.status === 'low').length;

  const getSortIcon = (): string => {
    if (sortMode === 'worstToBest') return 'arrow-down';
    if (sortMode === 'bestToWorst') return 'arrow-up';
    if (sortMode === 'oldestToNewest') return 'time-outline';
    if (sortMode === 'newestToOldest') return 'timer-outline';
    return 'swap-vertical';
  };

  const getSortLabel = (): string => {
    if (sortMode === 'worstToBest') return t('sortWorstToBest');
    if (sortMode === 'bestToWorst') return t('sortBestToWorst');
    if (sortMode === 'oldestToNewest') return isArabic ? 'الأقدم إلى الأحدث' : 'Oldest to Newest';
    if (sortMode === 'newestToOldest') return isArabic ? 'الأحدث إلى الأقدم' : 'Newest to Oldest';
    return t('sortDefault');
  };

  const getAllTestsLabel = () => (isArabic ? 'جميع الفحوصات' : 'All Tests');

  const renderTest = ({ item, index }: { item: AllTestData; index: number }) => {
    const testName = isArabic ? item.nameAr : item.nameEn;
    const categoryColor = getCategoryColor(item.category);
    const inBodyTest = isInBodyTest(item.testId);
    const testDescription = buildFriendlyExplanation(item, isArabic);
    const testDateLabel = item.testDate
      ? formatAppDate(item.testDate, i18n.language, dateCalendar)
      : '-';
    const existingReminder = remindersByTest[item.testId];
    const reminderDateLabel = existingReminder?.dueDate
      ? formatAppDate(existingReminder.dueDate, i18n.language, dateCalendar)
      : null;
    const detailsBorderColor = (item.status === 'high' || item.status === 'low') && isDark ? '#7f1d1d' : colors.border;

    return (
      <View
        style={[
          styles.testCard,
          { backgroundColor: colors.card, borderColor: colors.border },
          !item.hasResult && styles.testCardPending,
          !item.hasResult && isDark && { backgroundColor: '#1f2937', borderColor: colors.border },
          (item.status === 'high' || item.status === 'low') && styles.testCardAbnormal
          ,
          (item.status === 'high' || item.status === 'low') && isDark && { backgroundColor: '#3f1d1d', borderColor: '#7f1d1d' }
        ]}
        testID={`card-test-${item.testId}`}
      >
        <Text style={[styles.testDateTop, { color: colors.mutedText }]}>
          {t('testDate')}: {testDateLabel}
        </Text>

        <View style={styles.testHeader}>
          <View style={[styles.testNumberContainer, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}>
            <Text style={styles.testNumber}>{index + 1}</Text>
          </View>
          <View style={styles.testNameRow}>
            <Text style={[styles.testName, { color: colors.text }]}>{testName}</Text>
            {inBodyTest ? (
              <View style={styles.inbodyBadge}>
                <Ionicons name="body" size={12} color="#0ea5e9" />
                <Text style={styles.inbodyBadgeText}>InBody</Text>
              </View>
            ) : null}
            <TouchableOpacity
              style={[styles.infoButton, { backgroundColor: isDark ? '#1e3a8a' : '#eff6ff' }]}
              onPress={() => {
                setSelectedInfoTitle(testName);
                setSelectedInfoDescription(testDescription);
                setIsInfoModalOpen(true);
              }}
              testID={`button-test-info-${item.testId}`}
            >
              <Text style={styles.infoButtonText}>!</Text>
            </TouchableOpacity>
          </View>
          <StatusBadge status={item.status} hasResult={item.hasResult} styles={styles} />
        </View>

        <View style={[styles.testDetails, { borderTopColor: detailsBorderColor }]}>
          <View style={styles.categoryRow}>
            <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
            <Text style={[styles.categoryText, { color: colors.mutedText }]}>
              {inBodyTest ? (isArabic ? 'قياسات InBody' : 'InBody Metrics') : t(item.category)}
            </Text>
          </View>

          <View style={styles.valuesRow}>
            <View style={styles.valueBox}>
              <Text style={[styles.valueLabel, { color: colors.mutedText }]}>{t('yourValue')}</Text>
              <Text style={[
                styles.valueText,
                { color: colors.text },
                !item.hasResult && styles.valueTextPending,
                (item.status === 'high' || item.status === 'low') && styles.valueTextAbnormal
              ]}>
                {item.hasResult ? `${item.value} ${item.unit || ''}` : '0'}
              </Text>
            </View>

            <View style={styles.valueBox}>
              <Text style={[styles.valueLabel, { color: colors.mutedText }]}>{t('normalRange')}</Text>
              <Text style={[styles.rangeText, { color: colors.mutedText }]}>
                {item.normalRangeMin !== null && item.normalRangeMax !== null
                  ? `${item.normalRangeMin} - ${item.normalRangeMax} ${item.unit || ''}`
                  : '-'}
              </Text>
            </View>
          </View>

          <View style={styles.reminderRow}>
            <TouchableOpacity
              style={styles.reminderButton}
              onPress={() => openReminderModal(item.testId, testName, existingReminder?.dueDate)}
              testID={`button-reminder-${item.testId}`}
            >
              <Ionicons name="notifications-outline" size={16} color="#fff" />
              <Text style={styles.reminderButtonText}>
                {existingReminder ? (isArabic ? 'تعديل التذكير' : 'Edit Reminder') : (isArabic ? 'إضافة تذكير' : 'Set Reminder')}
              </Text>
            </TouchableOpacity>

            {reminderDateLabel ? (
              <Text style={[styles.reminderDateText, { color: colors.mutedText }]}>
                {isArabic ? 'موعد التذكير' : 'Reminder Date'}: {reminderDateLabel}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      <View style={styles.disclaimerSmall}>
        <Ionicons name="information-circle-outline" size={16} color={colors.mutedText} />
        <Text style={[styles.disclaimerSmallText, { color: colors.mutedText }]}>{t('disclaimer.text')}</Text>
      </View>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: isDark ? '#1f2937' : colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>{t('myTests')}</Text>
        <Text style={[styles.count, { color: colors.mutedText }]}>
          {testsWithResults}/{filteredAndSortedTests.length} {t('testsCompleted')} | {abnormalTests} {t('abnormal')}
        </Text>
      </View>

      <View style={[styles.categorySection, { backgroundColor: colors.card, borderBottomColor: isDark ? '#1f2937' : colors.border }]}>
        <TouchableOpacity
          style={[styles.categoryMenuButton, { backgroundColor: isDark ? '#1e3a8a' : '#eff6ff' }]}
          onPress={() => setIsCategoryMenuOpen((prev) => !prev)}
          testID="button-category-menu"
        >
          <Ionicons
            name={getCategoryIcon(selectedCategory || 'all') as any}
            size={16}
            color="#3b82f6"
          />
          <Text style={[styles.categoryMenuButtonText, { color: isDark ? '#bfdbfe' : '#1e40af' }]}>
            {selectedCategory ? (selectedCategory === 'inbody' ? 'InBody' : t(selectedCategory)) : getAllTestsLabel()}
          </Text>
          <Ionicons name={isCategoryMenuOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#3b82f6" />
        </TouchableOpacity>

        {isCategoryMenuOpen && (
          <View style={[styles.categoryMenuList, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {(isArabic ? [...categories].reverse() : categories).map((item) => {
              const isAll = item === 'all';
              const isSelected = isAll ? !selectedCategory : selectedCategory === item;
              const chipColor = item === 'inbody' ? '#0ea5e9' : (isAll ? '#3b82f6' : getCategoryColor(item));
              return (
                <Pressable
                  key={item}
                  style={[styles.categoryMenuItem, isSelected && styles.categoryMenuItemActive, isSelected && isDark && { backgroundColor: '#1e293b' }]}
                  onPress={() => {
                    setSelectedCategory(isAll ? null : item);
                    setIsCategoryMenuOpen(false);
                  }}
                  testID={`menu-category-${item}`}
                >
                  <Ionicons name={getCategoryIcon(item) as any} size={14} color={chipColor} />
                  <Text style={[styles.categoryMenuItemText, { color: colors.text }]}>
                    {isAll ? getAllTestsLabel() : item === 'inbody' ? 'InBody' : t(item)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <View style={[styles.sortBar, { backgroundColor: isDark ? colors.card : colors.background }]}>
        <TouchableOpacity
          style={[styles.sortButton, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
          onPress={() => setIsSortMenuOpen((prev) => !prev)}
          testID="button-sort-tests"
        >
          <Ionicons name={getSortIcon() as any} size={16} color="#3b82f6" />
          <Text style={[styles.sortButtonText, { color: colors.text }]}>{getSortLabel()}</Text>
          <Ionicons name={isSortMenuOpen ? 'chevron-up' : 'chevron-down'} size={14} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      {isSortMenuOpen && (
        <View style={[styles.sortMenu, { backgroundColor: colors.card, borderColor: isDark ? '#1f2937' : colors.border }]}>
          {[
            { key: 'default', label: t('sortDefault') },
            { key: 'worstToBest', label: t('sortWorstToBest') },
            { key: 'bestToWorst', label: t('sortBestToWorst') },
            { key: 'oldestToNewest', label: isArabic ? 'الأقدم إلى الأحدث' : 'Oldest to Newest' },
            { key: 'newestToOldest', label: isArabic ? 'الأحدث إلى الأقدم' : 'Newest to Oldest' },
          ].map((option) => (
            <Pressable
              key={option.key}
              style={[styles.sortMenuItem, sortMode === option.key && styles.sortMenuItemActive]}
              onPress={() => {
                setSortMode(option.key as SortMode);
                setIsSortMenuOpen(false);
              }}
            >
              <Text style={[styles.sortMenuItemText, { color: colors.text }, sortMode === option.key && styles.sortMenuItemTextActive, sortMode === option.key && isDark && { color: '#93c5fd' }]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.mutedText }]}>{t('loading')}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAndSortedTests}
          keyExtractor={item => item.id}
          renderItem={renderTest}
          style={{ backgroundColor: colors.background }}
          contentContainerStyle={[styles.listContent, { backgroundColor: colors.background }]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="flask-outline" size={64} color="#cbd5e1" />
              <Text style={[styles.emptyText, { color: colors.mutedText }]}>{t('noData')}</Text>
            </View>
          }
        />
      )}

      <Modal
        visible={isReminderModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsReminderModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {isArabic ? 'اختيار تاريخ التذكير' : 'Choose Reminder Date'}
            </Text>
            <Text style={[styles.modalHint, { color: colors.mutedText }]}>
              {isArabic ? 'أدخل التاريخ بصيغة: YYYY-MM-DD' : 'Enter date as: YYYY-MM-DD'}
            </Text>
            <TextInput
              value={reminderDateInput}
              onChangeText={setReminderDateInput}
              style={[styles.modalInput, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
              placeholder="2026-03-15"
              placeholderTextColor="#94a3b8"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}
                onPress={() => setIsReminderModalOpen(false)}
              >
                <Text style={[styles.modalBtnCancelText, { color: isDark ? '#e2e8f0' : '#334155' }]}>{isArabic ? 'إلغاء' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={submitReminder}
                disabled={saveReminderMutation.isPending}
              >
                <Text style={styles.modalBtnSaveText}>{isArabic ? 'حفظ' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isInfoModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsInfoModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedInfoTitle}</Text>
            <Text style={[styles.modalHint, { color: colors.mutedText }]}>{selectedInfoDescription}</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={() => setIsInfoModalOpen(false)}
              >
                <Text style={styles.modalBtnSaveText}>{isArabic ? 'إغلاق' : 'Close'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (isArabic: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'left',
  },
  count: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'left',
  },
  categorySection: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  categoryMenuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  categoryMenuButtonText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1e40af',
    marginHorizontal: 8,
    textAlign: 'left',
  },
  categoryMenuList: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  categoryMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  categoryMenuItemActive: {
    backgroundColor: '#eff6ff',
  },
  categoryMenuItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  sortBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  sortButtonText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600',
  },
  sortMenu: {
    marginHorizontal: 16,
    marginTop: -2,
    marginBottom: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  sortMenuItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sortMenuItemActive: {
    backgroundColor: '#eff6ff',
  },
  sortMenuItemText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
    textAlign: 'left',
  },
  sortMenuItemTextActive: {
    color: '#1d4ed8',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  testCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  testCardPending: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0'
  },
  testCardAbnormal: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca'
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10
  },
  testNumberContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center'
  },
  testNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b'
  },
  testName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    textAlign: 'left',
  },
  testNameRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
  },
  infoButtonText: {
    color: '#2563eb',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 12,
  },
  inbodyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ecfeff',
    borderColor: '#67e8f9',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  inbodyBadgeText: {
    fontSize: 10,
    color: '#0e7490',
    fontWeight: '700',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  pendingBadge: {
    backgroundColor: '#f1f5f9'
  },
  pendingBadgeText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600'
  },
  normalBadge: {
    backgroundColor: '#dcfce7'
  },
  normalBadgeText: {
    color: '#16a34a',
    fontSize: 11,
    fontWeight: '600'
  },
  abnormalBadge: {
    backgroundColor: '#fee2e2'
  },
  abnormalBadgeText: {
    color: '#dc2626',
    fontSize: 11,
    fontWeight: '600'
  },
  testDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  categoryText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500'
  },
  valuesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  valueBox: {
    flex: 1
  },
  valueLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 2,
    textAlign: 'left',
  },
  valueText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'left',
  },
  valueTextPending: {
    color: '#94a3b8'
  },
  valueTextAbnormal: {
    color: '#dc2626'
  },
  rangeText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'left',
  },
  dateText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'left',
  },
  testDateTop: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
    textAlign: 'left',
    fontWeight: '600',
  },
  reminderRow: {
    marginTop: 10,
    gap: 6,
  },
  reminderButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  reminderButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  reminderDateText: {
    fontSize: 11,
    color: '#475569',
    textAlign: 'left',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'left',
  },
  modalHint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 6,
    marginBottom: 10,
    textAlign: 'left',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    color: '#0f172a',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  modalBtn: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalBtnCancel: {
    backgroundColor: '#f1f5f9',
  },
  modalBtnSave: {
    backgroundColor: '#16a34a',
  },
  modalBtnCancelText: {
    color: '#334155',
    fontWeight: '600',
  },
  modalBtnSaveText: {
    color: '#fff',
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 16
  },
  disclaimerSmall: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 6,
  },
  disclaimerSmallText: {
    flex: 1,
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
    textAlign: 'left',
  },
});
