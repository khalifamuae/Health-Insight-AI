# BioTrack AI - تطبيق الهاتف
# BioTrack AI - Mobile App
**by Alshira company**

تطبيق React Native/Expo لتحليل نتائج الفحوصات الطبية بالذكاء الاصطناعي.

A React Native/Expo app for AI-powered analysis of medical lab results.

## المميزات | Features

- 📊 تحليل PDF بالذكاء الاصطناعي | AI-powered PDF analysis
- 🧪 50 نوع فحص | 50 test types
- 🔴🟢 ترميز لوني للنتائج | Color-coded results
- 🌐 عربي/إنجليزي مع RTL | Arabic/English with RTL
- 🔔 تذكيرات إعادة الفحص | Recheck reminders
- 👤 ملف شخصي صحي | Health profile

## المتطلبات | Requirements

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- EAS CLI (للبناء): `npm install -g eas-cli`
- حساب Expo (مجاني)

## التشغيل المحلي | Local Development

```bash
cd mobile
npm install
npx expo start
```

ثم افتح التطبيق في:
- تطبيق Expo Go على هاتفك (مسح QR code)
- محاكي Android/iOS

## بناء التطبيق | Building the App

### إعداد حساب Expo
1. سجل في https://expo.dev
2. سجل دخول: `eas login`

### بناء APK للأندرويد
```bash
eas build --platform android --profile production
```

### بناء للـ iOS
```bash
eas build --platform ios --profile production
```

## النشر على المتاجر | Store Publishing

### Google Play Store
1. أنشئ حساب مطور ($25 مرة واحدة)
2. أنشئ تطبيق في Google Play Console
3. ارفع ملف APK أو AAB

### Apple App Store
1. أنشئ حساب مطور ($99/سنة)
2. أنشئ التطبيق في App Store Connect
3. ارفع باستخدام EAS Submit:
   ```bash
   eas submit --platform ios
   ```

## هيكل المشروع | Project Structure

```
mobile/
├── App.tsx                 # Entry point
├── app.json               # Expo configuration
├── eas.json               # EAS build configuration
├── src/
│   ├── screens/           # App screens
│   │   ├── HomeScreen.tsx
│   │   ├── TestsScreen.tsx
│   │   ├── UploadScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   ├── RemindersScreen.tsx
│   │   └── LoginScreen.tsx
│   ├── navigation/        # Navigation setup
│   │   ├── TabNavigator.tsx
│   │   └── RootNavigator.tsx
│   ├── context/           # React contexts
│   │   └── AuthContext.tsx
│   ├── hooks/             # Custom hooks
│   │   └── useAuth.ts
│   └── lib/               # Utilities
│       ├── api.ts         # API client
│       └── i18n.ts        # Translations
└── assets/                # Icons and images
```

## الإعدادات المطلوبة | Configuration

### ربط API
عدّل `src/lib/api.ts`:
```typescript
const API_BASE_URL = 'https://your-app-url.replit.app';
```

### معرف التطبيق
عدّل `app.json`:
- `ios.bundleIdentifier`
- `android.package`

## تنبيه طبي | Medical Disclaimer

هذا التطبيق للأغراض التوعوية فقط ولا يغني عن استشارة الطبيب المختص.

This app is for informational purposes only and does not replace professional medical advice.
