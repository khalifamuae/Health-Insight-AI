# BioTrack AI - AI-Powered Health Analysis Application
**by Alshira company**

## Overview
BioTrack AI is a comprehensive health tracking application that analyzes PDF lab results using AI and helps users track 50 different medical tests. The app supports Arabic (default) and English languages with RTL support.

## Key Features
- **AI PDF Analysis**: Upload lab results and AI automatically extracts test values
- **AI Diet Plan**: Personalized nutrition plans based on lab results, weight, height, and deficiencies
- **Test Comparison**: Side-by-side comparison of old vs new test results with trend indicators
- **50 Test Types**: Vitamins, minerals, hormones, organ functions, lipids, immunity, blood, coagulation, and special tests
- **Color-Coded Results**: Red for abnormal (High/Low), green for normal
- **7 Importance Levels**: Tests organized by clinical importance
- **Bilingual**: Full Arabic and English support with RTL
- **Recheck Reminders**: Automated alerts based on recommended intervals
- **Subscription System**: Single "Pro" plan - $14.99/month or $139/year (23% savings). 7-day free trial for new users. After trial expires, user must subscribe to view uploaded data.

## Recent Changes
- **In-App Purchase (IAP) System**: Single "Pro" plan subscription for Apple App Store and Google Play
  - Pricing: $14.99/month or $139/year (23% savings)
  - 7-day free trial auto-starts on new user registration
  - Server-side endpoints: GET /api/subscription/status, POST /api/subscription/purchase, POST /api/subscription/restore, POST /api/subscription/webhook
  - Database schema: subscription_expires_at, subscription_product_id, subscription_platform, trial_started_at, trial_ends_at
  - Mobile SubscriptionScreen: Monthly/yearly toggle with savings badge, purchase flow, restore purchases, bilingual
  - IAP product IDs: com.alshira.biotrack.pro.{monthly,yearly}
  - Server enforces trial expiration (blocks all data access after 7 days if no subscription - tests, PDFs, reminders, diet plans)
  - Webhook security: x-webhook-secret header verification (set IAP_WEBHOOK_SECRET env var)
  - PRODUCTION TODO: Integrate react-native-iap SDK for real App Store/Play Store transactions and server-side receipt validation
- **Professor-Level Clinical Nutrition System**: Upgraded diet plan AI to Evidence-Based Medicine methodology
  - 5-Phase Clinical Protocol: Clinical Assessment, Advanced Energy Calculations, Metabolic Assessment, Bioavailability Optimization, Dietary Protocol Design
  - TEF (Thermic Effect of Food) calculation: protein 25%, carbs 8%, fats 3%
  - Fiber targets: 14g/1000 kcal (Academy of Nutrition and Dietetics)
  - Water intake: 33ml/kg body weight + activity adjustment (EFSA)
  - Bioavailability optimization: iron+vitC synergy, calcium+vitD, fat-soluble vitamin absorption, mineral interaction avoidance
  - Each meal includes: fiber content, preparation tips for nutrient preservation
  - Each deficiency includes: absorption optimization tips
  - Each supplement includes: timing advice, nutrient interactions
  - Each condition tip includes: scientific reasoning with references
  - Meal timing science (Chrononutrition): protein distribution, carb timing for sleep
  - Nutrient interaction warnings (e.g., calcium reduces iron absorption 50%)
  - Clinical-grade QC: macro-calorie verification, total calorie deviation checks
  - Scientific references: Mifflin-St Jeor (1990), ACSM, ASPEN, ISSN, Hallberg (1991), Cook & Reddy (2001), EFSA, DRI
  - Temperature reduced to 0.4 for consistent, professional output
- **Health Verification First**: AI analyzes lab results and prioritizes correcting deficiencies BEFORE recommending calorie deficit/surplus
- **BMR Safety Floor**: System never suggests diet plans below BMR (minimum safe calorie threshold)
- **Smart Deficit Adjustment**: If severe deficiencies detected (vitamin D, iron, B12, etc.), calorie deficit is automatically reduced from 500 to 200 kcal
- **Health Summary Section**: New section showing comprehensive health status from lab results
- **Intake Alignment Section**: New section explaining how current calories align with goal and health status
- **Food-Lab Linking**: Every meal's benefits field links to specific lab result improvements
- **References Section**: Scientific references added at end of each diet plan (Mifflin-St Jeor 1990, NHLBI, DRI, EFSA, NIH ODS, ISSN, Hallberg 1991)
- **Medical Safety**: No diagnosis, no drug supplements, guiding language only ("discuss with your doctor")
- **Diet Plan Questionnaire**: 4-step questionnaire before generating diet plan (activity level, allergies, protein preference, meal preference)
- **Protein Preference**: New question asking user if they prefer fish, chicken, red meat, or mixed - AI uses this to customize meals
- **3 Meal Options**: Each meal (breakfast, lunch, dinner) provides 3 varied options for daily rotation
- **Activity-Based TDEE**: TDEE calculation uses actual activity level (sedentary/light/very/extremely active)
- **Allergy Support**: 9 common allergens can be excluded from diet plan (eggs, dairy, peanuts, nuts, seafood, soy, sesame, wheat, fish)
- **Meal Preferences**: High protein, balanced, low carb, vegetarian, custom macros with macro range visualization
- **Enhanced Supplement Recommendations**: AI suggests specific supplements with dosage, duration, natural food sources (with gram amounts), target lab values, and scientific references (NIH, PubMed, Open Food Facts). Displayed with detailed cards showing food alternatives and scientific basis
- **Deficiency Compensation**: Focus on compensating deficiencies through natural food first, supplements only when needed
- **5 Meal Options**: Each meal section provides exactly 5 varied options (20 total) for daily rotation
- **Positive Tone**: All tips use encouraging, supportive language - no scary medical warnings (e.g., "bring sugar to normal range" instead of "risk of diabetes")
- **Condition-Based Tips**: Personalized health tips based on detected conditions with positive framing
- **Navigation Restructure**: Hamburger menu (top-left) with My Tests and Compare; Bottom nav reduced to 4 items (Home, Upload, Diet, Profile)
- **Nutrition Disclaimer**: Warning disclaimer shown before questionnaire starts
- **Dashboard Shortcuts**: Quick access cards for Diet Plan and Compare Results on dashboard
- **Reminder System**: Added calendar date picker in tests table for setting recheck reminders
- **Tests Table Columns**: 8 columns (#, Test Name, Category, Your Value, Normal Range, Status, Test Date, Reminder)
- **All 50 Tests Display**: Tests without results show value "0" ensuring complete table view
- Added React Native/Expo mobile application for Android and iOS
- Mobile app includes: Home, Tests, Upload, Reminders, Profile screens
- Added authentication context and secure storage for mobile
- Mobile app uses same backend API as web app
- Initial implementation of complete health tracking system
- Created 50 test definitions with Arabic/English names
- Implemented PDF upload and AI analysis using Replit AI Integrations
- Set up Replit Auth for user authentication
- Created responsive UI with dark mode support
- **Knowledge Base - Real Sources**: Rebuilt knowledge engine to fetch from REAL scientific sources (PubMed API + NIH ODS fact sheets). AI only summarizes fetched content, never generates from scratch. Every entry has verified source URL.
- Knowledge engine fetches 3 topics per domain daily from PubMed (research abstracts) and NIH (fact sheets)
- 5 domains: nutrition, aerobic training, resistance training, vitamins/minerals, hormones
- All knowledge entries include real PubMed PMID links and NIH fact sheet URLs

## Project Architecture

### Web Frontend (client/src/)
- **Framework**: React with Vite
- **UI Library**: Shadcn/ui with Tailwind CSS
- **State Management**: TanStack Query
- **Routing**: Wouter
- **i18n**: i18next with Arabic (default) and English

### Mobile App (mobile/)
- **Framework**: React Native with Expo
- **Navigation**: React Navigation (bottom tabs + stack)
- **State Management**: TanStack Query
- **i18n**: i18next with Arabic (default) and English + RTL
- **Secure Storage**: expo-secure-store for auth tokens
- **Build System**: EAS Build for Android/iOS

### Backend (server/)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth (OpenID Connect)
- **AI Integration**: OpenAI via Replit AI Integrations

### Database Tables
- `users` - User authentication (Replit Auth)
- `sessions` - Session storage
- `user_profiles` - Extended user data (health metrics, subscription)
- `test_definitions` - 50 test types with normal ranges
- `test_results` - User's test values
- `reminders` - Recheck reminders
- `uploaded_pdfs` - PDF upload tracking
- `knowledge_base` - Scientific knowledge from PubMed/NIH (real sources only)
- `knowledge_learning_log` - Tracks daily learning progress per domain

## User Preferences
- Default language: Arabic
- RTL support for Arabic interface
- Dark mode available

## Important Paths

### Web App
- Main app: `/client/src/App.tsx`
- API routes: `/server/routes.ts`
- Database schema: `/shared/schema.ts`
- Translations: `/client/src/lib/i18n.ts`
- Test definitions seed: `/server/seedTests.ts`

### Mobile App
- Main app: `/mobile/App.tsx`
- Screens: `/mobile/src/screens/`
- Navigation: `/mobile/src/navigation/`
- API client: `/mobile/src/lib/api.ts`
- Translations: `/mobile/src/lib/i18n.ts`
- Auth context: `/mobile/src/context/AuthContext.tsx`
- Build config: `/mobile/app.json`, `/mobile/eas.json`

## Running the Project

### Web App
- Development: `npm run dev`
- Database push: `npm run db:push`
- Seed tests: `npx tsx server/seedTests.ts`

### Mobile App
```bash
cd mobile
npm install
npx expo start
```

### Building Mobile App for Stores
```bash
cd mobile
eas build --platform android --profile production
eas build --platform ios --profile production
```
