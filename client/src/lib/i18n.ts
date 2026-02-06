import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      // App
      appName: "BioTrack AI",
      appDescription: "AI-Powered Health Analysis",
      companyName: "by Alshira company",
      warning: "Warning",
      appPurpose: "This app is for health tracking and awareness purposes only.",
      medicalDisclaimer: "This app does not replace professional medical advice. Always consult a healthcare provider.",
      
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
      slightlyHigh: "Slightly High",
      slightlyLow: "Slightly Low",
      
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
      
      // Uploaded Files History
      uploadedFiles: "Uploaded Files",
      processed: "Processed",
      failed: "Failed",
      testsExtracted: "tests extracted",
      aiCouldNotRead: "AI could not read this file",
      fileDeleted: "File deleted successfully",
      deleteFileFailed: "Failed to delete file",
      retry: "Retry",
      retryFailed: "Retry failed. Please try again.",
      pleaseUploadPdf: "Please upload a PDF file",
      
      // Compare
      compare: "Compare",
      compareResults: "Compare Results",
      previousResult: "Previous",
      latestResult: "Latest",
      improved: "Improved",
      worsened: "Worsened",
      noChange: "No Change",
      noComparisonData: "No comparison data available",
      noComparisonHint: "Upload two or more lab reports to compare your results over time",

      // Share
      shareResults: "Share Results",
      shareSuccess: "Shared successfully",
      copiedToClipboard: "Copied to clipboard",
      copyFailed: "Failed to copy",
      
      // PDF Errors
      scannedPdfError: "This PDF appears to be scanned. Please upload a digital/text-based PDF.",
      analysisFailedError: "Failed to analyze this file. Please try again.",
    }
  },
  ar: {
    translation: {
      // App
      appName: "BioTrack AI",
      appDescription: "تحليل صحي مدعوم بالذكاء الاصطناعي",
      companyName: "by Alshira company",
      warning: "تحذير",
      appPurpose: "هذا التطبيق لمتابعة الصحة ولأغراض التوعوية فقط.",
      medicalDisclaimer: "لا يغني هذا التطبيق عن الاستشارة الطبية. استشر طبيبك دائماً.",
      
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
      slightlyHigh: "مرتفع بشكل بسيط",
      slightlyLow: "منخفض بشكل بسيط",
      
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
      
      // Uploaded Files History
      uploadedFiles: "الملفات المرفوعة",
      processed: "تمت المعالجة",
      failed: "فشل",
      testsExtracted: "فحص مستخرج",
      aiCouldNotRead: "لم يتمكن الذكاء الاصطناعي من قراءة هذا الملف",
      fileDeleted: "تم حذف الملف بنجاح",
      deleteFileFailed: "فشل في حذف الملف",
      retry: "إعادة المحاولة",
      retryFailed: "فشلت إعادة المحاولة. يرجى المحاولة مرة أخرى.",
      pleaseUploadPdf: "يرجى رفع ملف PDF",
      
      // Compare
      compare: "مقارنة",
      compareResults: "مقارنة النتائج",
      previousResult: "السابق",
      latestResult: "الأحدث",
      improved: "تحسّن",
      worsened: "تراجع",
      noChange: "لا تغيير",
      noComparisonData: "لا توجد بيانات للمقارنة",
      noComparisonHint: "ارفع تقريرين أو أكثر لمقارنة نتائجك عبر الزمن",

      // Share
      shareResults: "مشاركة النتائج",
      shareSuccess: "تمت المشاركة بنجاح",
      copiedToClipboard: "تم النسخ إلى الحافظة",
      copyFailed: "فشل في النسخ",
      
      // PDF Errors
      scannedPdfError: "يبدو أن هذا الملف ممسوح ضوئياً. يرجى رفع ملف PDF رقمي/نصي.",
      analysisFailedError: "فشل في تحليل هذا الملف. يرجى المحاولة مرة أخرى.",
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
