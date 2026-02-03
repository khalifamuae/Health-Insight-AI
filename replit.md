# HealthLab - AI-Powered Health Analysis Application

## Overview
HealthLab is a comprehensive health tracking application that analyzes PDF lab results using AI and helps users track 50 different medical tests. The app supports Arabic (default) and English languages with RTL support.

## Key Features
- **AI PDF Analysis**: Upload lab results and AI automatically extracts test values
- **50 Test Types**: Vitamins, minerals, hormones, organ functions, lipids, immunity, blood, coagulation, and special tests
- **Color-Coded Results**: Red for abnormal (High/Low), green for normal
- **7 Importance Levels**: Tests organized by clinical importance
- **Bilingual**: Full Arabic and English support with RTL
- **Recheck Reminders**: Automated alerts based on recommended intervals
- **Subscription System**: Free (3 PDFs), Basic (20 PDFs), Premium (unlimited)

## Recent Changes
- Initial implementation of complete health tracking system
- Created 50 test definitions with Arabic/English names
- Implemented PDF upload and AI analysis using Replit AI Integrations
- Set up Replit Auth for user authentication
- Created responsive UI with dark mode support

## Project Architecture

### Frontend (client/src/)
- **Framework**: React with Vite
- **UI Library**: Shadcn/ui with Tailwind CSS
- **State Management**: TanStack Query
- **Routing**: Wouter
- **i18n**: i18next with Arabic (default) and English

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

## User Preferences
- Default language: Arabic
- RTL support for Arabic interface
- Dark mode available

## Important Paths
- Main app: `/client/src/App.tsx`
- API routes: `/server/routes.ts`
- Database schema: `/shared/schema.ts`
- Translations: `/client/src/lib/i18n.ts`
- Test definitions seed: `/server/seedTests.ts`

## Running the Project
- Development: `npm run dev`
- Database push: `npm run db:push`
- Seed tests: `npx tsx server/seedTests.ts`
