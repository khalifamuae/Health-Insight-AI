import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';

const resources = {
  ar: {
    translation: {
      appName: 'مختبر الصحة',
      home: 'الرئيسية',
      tests: 'الفحوصات',
      upload: 'رفع PDF',
      profile: 'الملف الشخصي',
      settings: 'الإعدادات',
      login: 'تسجيل الدخول',
      logout: 'تسجيل الخروج',
      welcome: 'مرحباً بك في مختبر الصحة',
      subtitle: 'تحليل نتائج فحوصاتك الطبية بالذكاء الاصطناعي',
      uploadPdf: 'رفع ملف PDF',
      selectFile: 'اختر ملف',
      analyzing: 'جاري التحليل...',
      myTests: 'فحوصاتي',
      allTests: 'جميع الفحوصات',
      abnormal: 'غير طبيعي',
      normal: 'طبيعي',
      high: 'مرتفع',
      low: 'منخفض',
      testName: 'اسم الفحص',
      value: 'القيمة',
      normalRange: 'المعدل الطبيعي',
      status: 'الحالة',
      date: 'التاريخ',
      categories: {
        vitamins: 'فيتامينات',
        minerals: 'معادن',
        hormones: 'هرمونات',
        organs: 'وظائف الأعضاء',
        lipids: 'دهون',
        immunity: 'مناعة',
        blood: 'فحوصات الدم',
        coagulation: 'تخثر الدم',
        special: 'فحوصات خاصة'
      },
      importance: {
        critical: 'حرج',
        veryHigh: 'عالي جداً',
        high: 'عالي',
        medium: 'متوسط',
        low: 'منخفض',
        routine: 'روتيني',
        optional: 'اختياري'
      },
      subscription: {
        free: 'مجاني',
        basic: 'أساسي',
        premium: 'متقدم',
        remaining: 'ملفات متبقية',
        upgrade: 'ترقية الاشتراك'
      },
      reminders: {
        title: 'التذكيرات',
        recheck: 'إعادة الفحص',
        dueIn: 'مستحق خلال',
        days: 'يوم',
        overdue: 'متأخر'
      },
      disclaimer: {
        title: 'تنبيه طبي هام',
        text: 'هذا التطبيق للأغراض التوعوية فقط ولا يغني عن استشارة الطبيب المختص. يرجى مراجعة طبيبك لتفسير النتائج واتخاذ القرارات الطبية.',
        understand: 'أفهم ذلك'
      },
      profile: {
        age: 'العمر',
        gender: 'الجنس',
        male: 'ذكر',
        female: 'أنثى',
        height: 'الطول (سم)',
        weight: 'الوزن (كجم)',
        bloodType: 'فصيلة الدم',
        save: 'حفظ'
      },
      errors: {
        uploadFailed: 'فشل رفع الملف',
        analysisFailed: 'فشل التحليل',
        loginRequired: 'يرجى تسجيل الدخول',
        limitReached: 'وصلت للحد الأقصى'
      }
    }
  },
  en: {
    translation: {
      appName: 'Health Lab',
      home: 'Home',
      tests: 'Tests',
      upload: 'Upload PDF',
      profile: 'Profile',
      settings: 'Settings',
      login: 'Login',
      logout: 'Logout',
      welcome: 'Welcome to Health Lab',
      subtitle: 'AI-powered analysis of your lab results',
      uploadPdf: 'Upload PDF File',
      selectFile: 'Select File',
      analyzing: 'Analyzing...',
      myTests: 'My Tests',
      allTests: 'All Tests',
      abnormal: 'Abnormal',
      normal: 'Normal',
      high: 'High',
      low: 'Low',
      testName: 'Test Name',
      value: 'Value',
      normalRange: 'Normal Range',
      status: 'Status',
      date: 'Date',
      categories: {
        vitamins: 'Vitamins',
        minerals: 'Minerals',
        hormones: 'Hormones',
        organs: 'Organ Functions',
        lipids: 'Lipids',
        immunity: 'Immunity',
        blood: 'Blood Tests',
        coagulation: 'Coagulation',
        special: 'Special Tests'
      },
      importance: {
        critical: 'Critical',
        veryHigh: 'Very High',
        high: 'High',
        medium: 'Medium',
        low: 'Low',
        routine: 'Routine',
        optional: 'Optional'
      },
      subscription: {
        free: 'Free',
        basic: 'Basic',
        premium: 'Premium',
        remaining: 'files remaining',
        upgrade: 'Upgrade Plan'
      },
      reminders: {
        title: 'Reminders',
        recheck: 'Recheck',
        dueIn: 'Due in',
        days: 'days',
        overdue: 'Overdue'
      },
      disclaimer: {
        title: 'Medical Disclaimer',
        text: 'This app is for informational purposes only and does not replace professional medical advice. Please consult your doctor to interpret results and make medical decisions.',
        understand: 'I Understand'
      },
      profile: {
        age: 'Age',
        gender: 'Gender',
        male: 'Male',
        female: 'Female',
        height: 'Height (cm)',
        weight: 'Weight (kg)',
        bloodType: 'Blood Type',
        save: 'Save'
      },
      errors: {
        uploadFailed: 'Upload failed',
        analysisFailed: 'Analysis failed',
        loginRequired: 'Please login',
        limitReached: 'Limit reached'
      }
    }
  }
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'ar',
  fallbackLng: 'ar',
  interpolation: {
    escapeValue: false
  }
});

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default i18n;
