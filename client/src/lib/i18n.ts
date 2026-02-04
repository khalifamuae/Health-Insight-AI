import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      // App
      appName: "HealthLab",
      appDescription: "AI-Powered Health Analysis",
      medicalDisclaimer: "This app is for informational purposes only and does not replace professional medical advice. Always consult a healthcare provider.",
      
      // Navigation
      dashboard: "Dashboard",
      myTests: "My Tests",
      uploadPdf: "Upload PDF",
      profile: "Profile",
      reminders: "Reminders",
      subscription: "Subscription",
      logout: "Logout",
      login: "Login",
      
      // Dashboard
      welcomeBack: "Welcome back",
      totalTests: "Total Tests",
      normalTests: "Normal",
      abnormalTests: "Abnormal",
      pendingReminders: "Pending Reminders",
      recentUploads: "Recent Uploads",
      quickStats: "Quick Stats",
      
      // Tests
      testName: "Test Name",
      yourValue: "Your Value",
      normalRange: "Normal Range",
      testDate: "Test Date",
      status: "Status",
      category: "Category",
      normal: "Normal",
      low: "Low",
      high: "High",
      
      // Categories
      vitamins: "Vitamins",
      minerals: "Minerals",
      hormones: "Hormones",
      organ_functions: "Organ Functions",
      lipids: "Lipids",
      immunity: "Immunity",
      blood: "Blood Tests",
      coagulation: "Coagulation",
      special: "Special Tests",
      
      // Sorting
      sortBy: "Sort by",
      importance: "Importance",
      newest: "Newest",
      oldest: "Oldest",
      byStatus: "By Status",
      byCategory: "By Category",
      
      // Upload
      uploadTitle: "Upload Lab Results",
      uploadDescription: "Upload your PDF lab results and our AI will analyze them",
      dropzone: "Drop PDF here or click to upload",
      processing: "Processing...",
      analysisComplete: "Analysis Complete",
      testsFound: "tests found",
      
      // Profile
      personalInfo: "Personal Information",
      name: "Name",
      email: "Email",
      phone: "Phone",
      age: "Age",
      weight: "Weight (kg)",
      height: "Height (cm)",
      gender: "Gender",
      male: "Male",
      female: "Female",
      changePhoto: "Change Photo",
      saveChanges: "Save Changes",
      
      // Subscription
      currentPlan: "Current Plan",
      freePlan: "Free Plan",
      basicPlan: "Basic Plan",
      premiumPlan: "Premium Plan",
      filesUsed: "Files Used",
      filesLimit: "files limit",
      unlimited: "Unlimited",
      upgrade: "Upgrade",
      
      // Reminders
      upcomingReminders: "Upcoming Reminders",
      dueDate: "Due Date",
      noReminders: "No upcoming reminders",
      
      // Levels
      level1: "Level 1: Essential Tests",
      level2: "Level 2: General Health",
      level3: "Level 3: Hormones & Performance",
      level4: "Level 4: Immunity & Inflammation",
      level5: "Level 5: Advanced Vitamins & Minerals",
      level6: "Level 6: Heart & Coagulation",
      level7: "Level 7: Special Tests",
      
      // Common
      loading: "Loading...",
      error: "Error",
      success: "Success",
      cancel: "Cancel",
      confirm: "Confirm",
      noData: "No data available",
      years: "years",
      pending: "Pending",
      testsCompleted: "tests completed",
      abnormal: "abnormal",
      defaultOrder: "Default Order",
      allCategories: "All Categories",
      allStatuses: "All Statuses",
      reminder: "Reminder",
      setReminder: "Set Reminder",
      reminderSet: "Reminder Set",
      reminderSetDesc: "You will be reminded on the selected date",
      reminderDeleted: "Reminder Deleted",
      reminderError: "Failed to set reminder",
      home: "Home",
      upload: "Upload",
    }
  },
  ar: {
    translation: {
      // App
      appName: "مختبر الصحة",
      appDescription: "تحليل صحي مدعوم بالذكاء الاصطناعي",
      medicalDisclaimer: "هذا التطبيق للأغراض التوعوية فقط ولا يغني عن الاستشارة الطبية. استشر طبيبك دائماً.",
      
      // Navigation
      dashboard: "لوحة التحكم",
      myTests: "فحوصاتي",
      uploadPdf: "رفع PDF",
      profile: "الملف الشخصي",
      reminders: "التذكيرات",
      subscription: "الاشتراك",
      logout: "تسجيل خروج",
      login: "تسجيل دخول",
      
      // Dashboard
      welcomeBack: "مرحباً بعودتك",
      totalTests: "إجمالي الفحوصات",
      normalTests: "طبيعي",
      abnormalTests: "غير طبيعي",
      pendingReminders: "تذكيرات قادمة",
      recentUploads: "آخر الملفات",
      quickStats: "إحصائيات سريعة",
      
      // Tests
      testName: "اسم الفحص",
      yourValue: "قيمتك",
      normalRange: "النطاق الطبيعي",
      testDate: "تاريخ الفحص",
      status: "الحالة",
      category: "التصنيف",
      normal: "طبيعي",
      low: "منخفض",
      high: "مرتفع",
      
      // Categories
      vitamins: "الفيتامينات",
      minerals: "المعادن",
      hormones: "الهرمونات",
      organ_functions: "وظائف الأعضاء",
      lipids: "الدهون",
      immunity: "المناعة",
      blood: "فحوصات الدم",
      coagulation: "التخثر",
      special: "فحوصات خاصة",
      
      // Sorting
      sortBy: "ترتيب حسب",
      importance: "الأهمية",
      newest: "الأحدث",
      oldest: "الأقدم",
      byStatus: "الحالة",
      byCategory: "التصنيف",
      
      // Upload
      uploadTitle: "رفع نتائج التحاليل",
      uploadDescription: "ارفع ملف PDF لنتائج تحاليلك وسيقوم الذكاء الاصطناعي بتحليلها",
      dropzone: "اسحب ملف PDF هنا أو اضغط للرفع",
      processing: "جاري المعالجة...",
      analysisComplete: "اكتمل التحليل",
      testsFound: "فحص تم استخراجه",
      
      // Profile
      personalInfo: "المعلومات الشخصية",
      name: "الاسم",
      email: "البريد الإلكتروني",
      phone: "رقم الهاتف",
      age: "العمر",
      weight: "الوزن (كجم)",
      height: "الطول (سم)",
      gender: "الجنس",
      male: "ذكر",
      female: "أنثى",
      changePhoto: "تغيير الصورة",
      saveChanges: "حفظ التغييرات",
      
      // Subscription
      currentPlan: "خطتك الحالية",
      freePlan: "مجاني",
      basicPlan: "أساسي",
      premiumPlan: "متقدم",
      filesUsed: "الملفات المستخدمة",
      filesLimit: "الحد الأقصى",
      unlimited: "غير محدود",
      upgrade: "ترقية",
      
      // Reminders
      upcomingReminders: "التذكيرات القادمة",
      dueDate: "تاريخ الاستحقاق",
      noReminders: "لا توجد تذكيرات قادمة",
      
      // Levels
      level1: "المستوى الأول: الفحوصات الأساسية",
      level2: "المستوى الثاني: الصحة العامة",
      level3: "المستوى الثالث: الهرمونات والأداء",
      level4: "المستوى الرابع: المناعة والالتهابات",
      level5: "المستوى الخامس: الفيتامينات والمعادن المتقدمة",
      level6: "المستوى السادس: القلب والتخثر",
      level7: "المستوى السابع: الفحوصات الخاصة",
      
      // Common
      loading: "جاري التحميل...",
      error: "خطأ",
      success: "تم بنجاح",
      cancel: "إلغاء",
      confirm: "تأكيد",
      noData: "لا توجد بيانات",
      years: "سنة",
      pending: "معلق",
      testsCompleted: "فحص مكتمل",
      abnormal: "غير طبيعي",
      defaultOrder: "الترتيب الافتراضي",
      allCategories: "جميع التصنيفات",
      allStatuses: "جميع الحالات",
      reminder: "تذكير",
      setReminder: "تعيين تذكير",
      reminderSet: "تم تعيين التذكير",
      reminderSetDesc: "سيتم تذكيرك في التاريخ المحدد",
      reminderDeleted: "تم حذف التذكير",
      reminderError: "فشل في تعيين التذكير",
      home: "الرئيسية",
      upload: "رفع",
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ar',
    fallbackLng: 'ar',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    }
  });

export default i18n;
