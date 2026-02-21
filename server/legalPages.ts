export function getPrivacyPolicyHTML(): string {
  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BioTrack AI - Privacy Policy</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.7; color: #1a1a2e; background: #f8f9fa; padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.08); }
    h1 { font-size: 28px; margin-bottom: 8px; color: #3b82f6; }
    h2 { font-size: 20px; margin-top: 32px; margin-bottom: 12px; color: #1e3a5f; }
    h3 { font-size: 16px; margin-top: 16px; margin-bottom: 8px; color: #374151; font-weight: 600; }
    p, li { font-size: 15px; margin-bottom: 10px; color: #374151; }
    ul { padding-left: 24px; margin-bottom: 16px; }
    .date { font-size: 13px; color: #6b7280; margin-bottom: 24px; }
    .lang-toggle { text-align: right; margin-bottom: 20px; }
    .lang-toggle a { color: #3b82f6; text-decoration: none; font-size: 14px; }
    a { color: #3b82f6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="lang-toggle"><a href="/privacy?lang=ar">العربية</a></div>
    <h1>Privacy Policy</h1>
    <p class="date">Last updated: February 2026</p>

    <h2>1. Introduction</h2>
    <p>BioTrack AI ("we", "our", or "the App") respects your privacy and is committed to protecting your personal data. This Privacy Policy explains how we collect, use, process, and safeguard your information when you use our mobile application.</p>
    <p>BioTrack AI is designed for educational and informational purposes only and does not provide medical diagnosis or treatment.</p>

    <h2>2. Information We Collect</h2>
    <p>We collect only the minimum data necessary to provide our services:</p>
    <h3>Account Information</h3>
    <ul>
      <li>Email address</li>
      <li>Name (if provided)</li>
      <li>Authentication credentials</li>
    </ul>
    <h3>Health Data (User Provided)</h3>
    <ul>
      <li>Laboratory test values</li>
      <li>Medical test results</li>
      <li>Weight, height, age, gender</li>
      <li>Dietary preferences and allergies</li>
    </ul>
    <h3>Uploaded Content</h3>
    <ul>
      <li>PDF lab reports</li>
      <li>Images of lab results</li>
    </ul>
    <h3>Subscription Information</h3>
    <p>Subscription status and purchase history processed securely through Apple App Store or Google Play. We do not collect or store payment card details.</p>

    <h2>3. How We Use Your Information</h2>
    <p>We use your data strictly for:</p>
    <ul>
      <li>AI-based lab result analysis</li>
      <li>Generating personalized diet plans</li>
      <li>Providing health tracking comparisons</li>
      <li>Sending optional reminders</li>
      <li>Account management</li>
      <li>Customer support</li>
    </ul>
    <p>We do NOT use your data for advertising or tracking purposes.</p>

    <h2>4. Legal Basis for Processing (GDPR Compliance)</h2>
    <p>If you are located in the European Economic Area (EEA), we process your data under:</p>
    <ul>
      <li>Your explicit consent</li>
      <li>Performance of a contract (providing app services)</li>
      <li>Compliance with legal obligations</li>
    </ul>
    <p>You may withdraw consent at any time.</p>

    <h2>5. Data Sharing</h2>
    <p>We do NOT sell, rent, or trade personal or health data.</p>
    <p>We may share limited data only:</p>
    <ul>
      <li>With secure AI processing providers solely to analyze lab results</li>
      <li>With Apple or Google for subscription verification</li>
      <li>If required by law</li>
    </ul>
    <p>Third-party AI providers do not retain your health data.</p>

    <h2>6. Data Storage & Security</h2>
    <p>We implement industry-standard safeguards:</p>
    <ul>
      <li>HTTPS encryption</li>
      <li>Encrypted database storage</li>
      <li>Secure authentication</li>
      <li>Access controls</li>
      <li>Regular security updates</li>
    </ul>
    <p>Health data is stored securely and accessible only to authorized systems.</p>

    <h2>7. Data Retention</h2>
    <p>Your data is retained while your account is active.</p>
    <p>Upon account deletion:</p>
    <ul>
      <li>All personal data</li>
      <li>Health records</li>
      <li>Uploaded files</li>
    </ul>
    <p>are permanently deleted within 30 days.</p>

    <h2>8. Your Rights</h2>
    <p>You have the right to:</p>
    <ul>
      <li>Access your personal data</li>
      <li>Request correction</li>
      <li>Request deletion</li>
      <li>Request data export</li>
      <li>Restrict or object to processing (EU users)</li>
    </ul>
    <p>To exercise these rights, contact: <a href="mailto:support@biotrack-ai.com">support@biotrack-ai.com</a></p>

    <h2>9. No Tracking or Advertising</h2>
    <p>BioTrack AI does not use:</p>
    <ul>
      <li>Advertising identifiers</li>
      <li>Cross-app tracking</li>
      <li>Third-party advertising SDKs</li>
    </ul>
    <p>We do not track users across apps or websites.</p>

    <h2>10. Children's Privacy</h2>
    <p>BioTrack AI is not intended for individuals under 13. We do not knowingly collect data from children.</p>

    <h2>11. International Users</h2>
    <p>Your data may be processed on secure servers located outside your country of residence. We ensure appropriate safeguards are in place.</p>

    <h2>12. Changes to This Policy</h2>
    <p>We may update this Privacy Policy. Significant changes will be communicated through the app.</p>

    <h2>13. Contact</h2>
    <p>For privacy-related inquiries: <a href="mailto:support@biotrack-ai.com">support@biotrack-ai.com</a></p>
  </div>
</body>
</html>`;
}

export function getPrivacyPolicyArabicHTML(): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BioTrack AI - سياسة الخصوصية</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Arabic', sans-serif; line-height: 1.9; color: #1a1a2e; background: #f8f9fa; padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.08); }
    h1 { font-size: 28px; margin-bottom: 8px; color: #3b82f6; }
    h2 { font-size: 20px; margin-top: 32px; margin-bottom: 12px; color: #1e3a5f; }
    p, li { font-size: 15px; margin-bottom: 10px; color: #374151; }
    ul { padding-right: 24px; margin-bottom: 16px; }
    .date { font-size: 13px; color: #6b7280; margin-bottom: 24px; }
    .lang-toggle { text-align: left; margin-bottom: 20px; }
    .lang-toggle a { color: #3b82f6; text-decoration: none; font-size: 14px; }
    a { color: #3b82f6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="lang-toggle"><a href="/privacy?lang=en">English</a></div>
    <h1>سياسة الخصوصية</h1>
    <p class="date">آخر تحديث: فبراير 2026</p>

    <h2>1. المقدمة</h2>
    <p>يحترم تطبيق BioTrack AI ("نحن" أو "التطبيق") خصوصيتك ويلتزم بحماية بياناتك الشخصية. توضح سياسة الخصوصية هذه كيفية جمع واستخدام ومعالجة وحماية معلوماتك عند استخدام تطبيقنا.</p>
    <p>تطبيق BioTrack AI مصمم لأغراض تعليمية وتوعوية فقط ولا يقدم تشخيصاً أو علاجاً طبياً.</p>

    <h2>2. المعلومات التي نجمعها</h2>
    <p>نجمع فقط الحد الأدنى من البيانات اللازمة لتقديم خدماتنا:</p>
    <h3>معلومات الحساب</h3>
    <ul>
      <li>البريد الإلكتروني</li>
      <li>الاسم (إن تم تقديمه)</li>
      <li>بيانات المصادقة</li>
    </ul>
    <h3>البيانات الصحية (يقدمها المستخدم)</h3>
    <ul>
      <li>قيم الفحوصات المخبرية</li>
      <li>نتائج الفحوصات الطبية</li>
      <li>الوزن، الطول، العمر، الجنس</li>
      <li>التفضيلات الغذائية والحساسية</li>
    </ul>
    <h3>المحتوى المرفوع</h3>
    <ul>
      <li>ملفات PDF لنتائج الفحوصات</li>
      <li>صور نتائج الفحوصات</li>
    </ul>
    <h3>معلومات الاشتراك</h3>
    <p>حالة الاشتراك وسجل المشتريات تتم معالجتها بأمان عبر Apple App Store أو Google Play. نحن لا نجمع أو نخزن بيانات بطاقات الدفع.</p>

    <h2>3. كيف نستخدم معلوماتك</h2>
    <p>نستخدم بياناتك حصرياً لـ:</p>
    <ul>
      <li>تحليل نتائج الفحوصات بالذكاء الاصطناعي</li>
      <li>توليد خطط غذائية مخصصة</li>
      <li>تقديم مقارنات لتتبع الصحة</li>
      <li>إرسال تذكيرات اختيارية</li>
      <li>إدارة الحساب</li>
      <li>دعم العملاء</li>
    </ul>
    <p>نحن لا نستخدم بياناتك لأغراض الإعلان أو التتبع.</p>

    <h2>4. الأساس القانوني للمعالجة (التوافق مع GDPR)</h2>
    <p>إذا كنت في المنطقة الاقتصادية الأوروبية (EEA)، نعالج بياناتك بموجب:</p>
    <ul>
      <li>موافقتك الصريحة</li>
      <li>تنفيذ العقد (تقديم خدمات التطبيق)</li>
      <li>الامتثال للالتزامات القانونية</li>
    </ul>
    <p>يمكنك سحب موافقتك في أي وقت.</p>

    <h2>5. مشاركة البيانات</h2>
    <p>نحن لا نبيع أو نؤجر أو نتاجر بالبيانات الشخصية أو الصحية.</p>
    <p>قد نشارك بيانات محدودة فقط:</p>
    <ul>
      <li>مع مزودي معالجة الذكاء الاصطناعي الآمنين فقط لتحليل نتائج الفحوصات</li>
      <li>مع Apple أو Google للتحقق من الاشتراك</li>
      <li>إذا تطلب القانون ذلك</li>
    </ul>
    <p>مزودو الذكاء الاصطناعي من الأطراف الثالثة لا يحتفظون ببياناتك الصحية.</p>

    <h2>6. تخزين البيانات والأمان</h2>
    <p>نطبق إجراءات حماية معيارية:</p>
    <ul>
      <li>تشفير HTTPS</li>
      <li>تخزين قاعدة بيانات مشفرة</li>
      <li>مصادقة آمنة</li>
      <li>ضوابط الوصول</li>
      <li>تحديثات أمنية دورية</li>
    </ul>
    <p>يتم تخزين البيانات الصحية بأمان ولا يمكن الوصول إليها إلا من الأنظمة المصرح لها.</p>

    <h2>7. الاحتفاظ بالبيانات</h2>
    <p>يتم الاحتفاظ ببياناتك طالما حسابك نشط.</p>
    <p>عند حذف الحساب:</p>
    <ul>
      <li>جميع البيانات الشخصية</li>
      <li>السجلات الصحية</li>
      <li>الملفات المرفوعة</li>
    </ul>
    <p>يتم حذفها نهائياً خلال 30 يوماً.</p>

    <h2>8. حقوقك</h2>
    <p>لديك الحق في:</p>
    <ul>
      <li>الوصول إلى بياناتك الشخصية</li>
      <li>طلب التصحيح</li>
      <li>طلب الحذف</li>
      <li>طلب تصدير البيانات</li>
      <li>تقييد أو الاعتراض على المعالجة (مستخدمو الاتحاد الأوروبي)</li>
    </ul>
    <p>لممارسة هذه الحقوق، تواصل معنا: <a href="mailto:support@biotrack-ai.com">support@biotrack-ai.com</a></p>

    <h2>9. عدم التتبع أو الإعلان</h2>
    <p>لا يستخدم BioTrack AI:</p>
    <ul>
      <li>معرّفات إعلانية</li>
      <li>تتبع عبر التطبيقات</li>
      <li>حزم SDK إعلانية من أطراف ثالثة</li>
    </ul>
    <p>نحن لا نتتبع المستخدمين عبر التطبيقات أو المواقع.</p>

    <h2>10. خصوصية الأطفال</h2>
    <p>تطبيق BioTrack AI غير مخصص للأشخاص دون سن 13 عاماً. نحن لا نجمع بيانات من الأطفال عن قصد.</p>

    <h2>11. المستخدمون الدوليون</h2>
    <p>قد تتم معالجة بياناتك على خوادم آمنة خارج بلد إقامتك. نضمن وجود إجراءات حماية مناسبة.</p>

    <h2>12. التغييرات على هذه السياسة</h2>
    <p>قد نقوم بتحديث سياسة الخصوصية هذه. سيتم إبلاغك بالتغييرات المهمة عبر التطبيق.</p>

    <h2>13. اتصل بنا</h2>
    <p>للاستفسارات المتعلقة بالخصوصية: <a href="mailto:support@biotrack-ai.com">support@biotrack-ai.com</a></p>
  </div>
</body>
</html>`;
}

export function getTermsOfServiceHTML(): string {
  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BioTrack AI - Terms of Service</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.7; color: #1a1a2e; background: #f8f9fa; padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.08); }
    h1 { font-size: 28px; margin-bottom: 8px; color: #3b82f6; }
    h2 { font-size: 20px; margin-top: 32px; margin-bottom: 12px; color: #1e3a5f; }
    p, li { font-size: 15px; margin-bottom: 10px; color: #374151; }
    ul { padding-left: 24px; margin-bottom: 16px; }
    .date { font-size: 13px; color: #6b7280; margin-bottom: 24px; }
    .lang-toggle { text-align: right; margin-bottom: 20px; }
    .lang-toggle a { color: #3b82f6; text-decoration: none; font-size: 14px; }
    a { color: #3b82f6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="lang-toggle"><a href="/terms?lang=ar">العربية</a></div>
    <h1>Terms of Service</h1>
    <p class="date">Last updated: February 2026</p>

    <h2>1. Acceptance of Terms</h2>
    <p>By downloading, installing, or using BioTrack AI ("the app"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the app.</p>

    <h2>2. Description of Service</h2>
    <p>BioTrack AI is a health tracking application that uses artificial intelligence to analyze lab results, track medical tests, and provide personalized diet and nutrition plans. The app is designed for informational and educational purposes only.</p>

    <h2>3. Medical Disclaimer</h2>
    <p><strong>BioTrack AI is NOT a medical device and does NOT provide medical advice, diagnosis, or treatment.</strong></p>
    <ul>
      <li>All AI-generated analysis and recommendations are for informational purposes only.</li>
      <li>Always consult a qualified healthcare professional before making health decisions.</li>
      <li>Do not disregard professional medical advice based on information from this app.</li>
      <li>In case of a medical emergency, contact emergency services immediately.</li>
      <li>The app does not prescribe medications or supplements as treatment.</li>
    </ul>

    <h2>4. User Accounts</h2>
    <ul>
      <li>You must be at least 13 years old to use this app.</li>
      <li>You are responsible for maintaining the security of your account.</li>
      <li>You are responsible for all activity under your account.</li>
      <li>You must provide accurate information when creating your account.</li>
    </ul>

    <h2>5. Subscription and Payments</h2>
    <ul>
      <li>BioTrack AI offers a "Pro" subscription plan at $14.99/month or $139/year.</li>
      <li>New users receive a 7-day free trial.</li>
      <li>Subscriptions are processed through the Apple App Store or Google Play Store.</li>
      <li>Subscriptions automatically renew unless cancelled at least 24 hours before the current period ends.</li>
      <li>Refunds are subject to Apple's or Google's refund policies.</li>
      <li>You can manage or cancel your subscription through your device's app store settings.</li>
    </ul>

    <h2>6. Acceptable Use</h2>
    <p>You agree NOT to:</p>
    <ul>
      <li>Use the app for any unlawful purpose.</li>
      <li>Upload false or misleading health data.</li>
      <li>Attempt to reverse-engineer or modify the app.</li>
      <li>Share your account credentials with others.</li>
      <li>Use the app to provide medical services to others.</li>
    </ul>

    <h2>7. Intellectual Property</h2>
    <p>All content, features, and functionality of BioTrack AI are owned by us and are protected by intellectual property laws. You may not copy, modify, or distribute any part of the app without our written consent.</p>

    <h2>8. Limitation of Liability</h2>
    <p>To the maximum extent permitted by law:</p>
    <ul>
      <li>BioTrack AI is provided "as is" without warranties of any kind.</li>
      <li>We are not liable for any health decisions made based on the app's output.</li>
      <li>We are not responsible for the accuracy of AI-generated analysis or recommendations.</li>
      <li>Our total liability shall not exceed the amount you paid for the subscription in the past 12 months.</li>
    </ul>

    <h2>9. Termination</h2>
    <p>We may suspend or terminate your account if you violate these terms. Upon termination, your right to use the app ceases immediately. You may delete your account at any time through the app settings.</p>

    <h2>10. Changes to Terms</h2>
    <p>We may update these Terms from time to time. Continued use of the app after changes constitutes acceptance of the updated terms.</p>

    <h2>11. Governing Law</h2>
    <p>These Terms are governed by applicable laws. Any disputes will be resolved through appropriate legal channels.</p>

    <h2>12. Contact Us</h2>
    <p>For questions about these Terms, contact us at: <a href="mailto:support@biotrack-ai.com">support@biotrack-ai.com</a></p>
  </div>
</body>
</html>`;
}

export function getTermsOfServiceArabicHTML(): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BioTrack AI - شروط الاستخدام</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Arabic', sans-serif; line-height: 1.9; color: #1a1a2e; background: #f8f9fa; padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.08); }
    h1 { font-size: 28px; margin-bottom: 8px; color: #3b82f6; }
    h2 { font-size: 20px; margin-top: 32px; margin-bottom: 12px; color: #1e3a5f; }
    p, li { font-size: 15px; margin-bottom: 10px; color: #374151; }
    ul { padding-right: 24px; margin-bottom: 16px; }
    .date { font-size: 13px; color: #6b7280; margin-bottom: 24px; }
    .lang-toggle { text-align: left; margin-bottom: 20px; }
    .lang-toggle a { color: #3b82f6; text-decoration: none; font-size: 14px; }
    a { color: #3b82f6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="lang-toggle"><a href="/terms?lang=en">English</a></div>
    <h1>شروط الاستخدام</h1>
    <p class="date">آخر تحديث: فبراير 2026</p>

    <h2>1. قبول الشروط</h2>
    <p>بتحميل أو تثبيت أو استخدام تطبيق BioTrack AI ("التطبيق")، فإنك توافق على الالتزام بشروط الاستخدام هذه. إذا كنت لا توافق، يرجى عدم استخدام التطبيق.</p>

    <h2>2. وصف الخدمة</h2>
    <p>BioTrack AI هو تطبيق لتتبع الصحة يستخدم الذكاء الاصطناعي لتحليل نتائج الفحوصات وتتبع 50 فحصاً طبياً وتقديم خطط غذائية مخصصة. التطبيق مصمم لأغراض توعوية وتعليمية فقط.</p>

    <h2>3. إخلاء المسؤولية الطبية</h2>
    <p><strong>BioTrack AI ليس جهازاً طبياً ولا يقدم نصيحة طبية أو تشخيصاً أو علاجاً.</strong></p>
    <ul>
      <li>جميع التحليلات والتوصيات المولدة بالذكاء الاصطناعي لأغراض توعوية فقط.</li>
      <li>استشر دائماً طبيباً مختصاً قبل اتخاذ قرارات صحية.</li>
      <li>لا تتجاهل النصيحة الطبية المتخصصة بناءً على معلومات من هذا التطبيق.</li>
      <li>في حالة الطوارئ الطبية، اتصل بخدمات الطوارئ فوراً.</li>
      <li>لا يصف التطبيق أدوية أو مكملات كعلاج.</li>
    </ul>

    <h2>4. حسابات المستخدمين</h2>
    <ul>
      <li>يجب أن يكون عمرك 13 سنة على الأقل لاستخدام هذا التطبيق.</li>
      <li>أنت مسؤول عن الحفاظ على أمان حسابك.</li>
      <li>أنت مسؤول عن جميع الأنشطة تحت حسابك.</li>
      <li>يجب تقديم معلومات دقيقة عند إنشاء حسابك.</li>
    </ul>

    <h2>5. الاشتراك والدفع</h2>
    <ul>
      <li>يقدم BioTrack AI خطة اشتراك "Pro" بسعر $14.99/شهرياً أو $139/سنوياً.</li>
      <li>يحصل المستخدمون الجدد على فترة تجريبية مجانية لمدة 7 أيام.</li>
      <li>تتم معالجة الاشتراكات عبر Apple App Store أو Google Play Store.</li>
      <li>يتجدد الاشتراك تلقائياً ما لم يتم الإلغاء قبل 24 ساعة على الأقل من نهاية الفترة الحالية.</li>
      <li>تخضع عمليات الاسترداد لسياسات Apple أو Google.</li>
      <li>يمكنك إدارة أو إلغاء اشتراكك من إعدادات متجر التطبيقات على جهازك.</li>
    </ul>

    <h2>6. الاستخدام المقبول</h2>
    <p>توافق على عدم:</p>
    <ul>
      <li>استخدام التطبيق لأي غرض غير قانوني.</li>
      <li>رفع بيانات صحية كاذبة أو مضللة.</li>
      <li>محاولة الهندسة العكسية أو تعديل التطبيق.</li>
      <li>مشاركة بيانات حسابك مع آخرين.</li>
      <li>استخدام التطبيق لتقديم خدمات طبية للآخرين.</li>
    </ul>

    <h2>7. الملكية الفكرية</h2>
    <p>جميع المحتويات والميزات والوظائف في BioTrack AI مملوكة لنا ومحمية بقوانين الملكية الفكرية. لا يجوز لك نسخ أو تعديل أو توزيع أي جزء من التطبيق دون موافقتنا الخطية.</p>

    <h2>8. تحديد المسؤولية</h2>
    <ul>
      <li>يُقدم BioTrack AI "كما هو" بدون ضمانات من أي نوع.</li>
      <li>نحن غير مسؤولين عن أي قرارات صحية تُتخذ بناءً على مخرجات التطبيق.</li>
      <li>نحن غير مسؤولين عن دقة التحليلات أو التوصيات المولدة بالذكاء الاصطناعي.</li>
      <li>لا تتجاوز مسؤوليتنا الإجمالية المبلغ الذي دفعته للاشتراك في الأشهر الـ 12 الماضية.</li>
    </ul>

    <h2>9. الإنهاء</h2>
    <p>يجوز لنا تعليق أو إنهاء حسابك إذا انتهكت هذه الشروط. عند الإنهاء، ينتهي حقك في استخدام التطبيق فوراً. يمكنك حذف حسابك في أي وقت من إعدادات التطبيق.</p>

    <h2>10. التغييرات على الشروط</h2>
    <p>قد نقوم بتحديث هذه الشروط من وقت لآخر. يعتبر الاستمرار في استخدام التطبيق بعد التغييرات قبولاً للشروط المحدثة.</p>

    <h2>11. القانون الحاكم</h2>
    <p>تخضع هذه الشروط للقوانين المعمول بها. يتم حل أي نزاعات من خلال القنوات القانونية المناسبة.</p>

    <h2>12. اتصل بنا</h2>
    <p>لأي أسئلة حول هذه الشروط، تواصل معنا عبر: <a href="mailto:support@biotrack-ai.com">support@biotrack-ai.com</a></p>
  </div>
</body>
</html>`;
}

export function getSupportPageHTML(): string {
  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BioTrack AI - Support</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.7; color: #1a1a2e; background: #f8f9fa; padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.08); }
    h1 { font-size: 28px; margin-bottom: 8px; color: #3b82f6; }
    h2 { font-size: 20px; margin-top: 32px; margin-bottom: 12px; color: #1e3a5f; }
    p, li { font-size: 15px; margin-bottom: 10px; color: #374151; }
    ul { padding-left: 24px; margin-bottom: 16px; }
    a { color: #3b82f6; }
    .support-card { background: #f0f7ff; border-radius: 8px; padding: 20px; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>BioTrack AI Support</h1>

    <div class="support-card">
      <h2 style="margin-top:0">Contact Us</h2>
      <p>Email: <a href="mailto:support@biotrack-ai.com">support@biotrack-ai.com</a></p>
    </div>

    <h2>Frequently Asked Questions</h2>

    <h2>How do I upload my lab results?</h2>
    <p>Tap the "Upload" button in the bottom navigation, select your PDF file, and the AI will automatically analyze and extract your test values.</p>

    <h2>How accurate is the AI analysis?</h2>
    <p>Our AI provides high-accuracy extraction of lab values. However, always verify results with your healthcare provider. The app is for informational purposes only.</p>

    <h2>How do I cancel my subscription?</h2>
    <p>You can manage or cancel your subscription through your device's app store settings (Apple App Store or Google Play Store).</p>

    <h2>How do I delete my account?</h2>
    <p>Go to Profile and select the delete account option. All your data will be permanently removed within 30 days.</p>

    <h2>Is my health data secure?</h2>
    <p>Yes. We use encryption for all data transmission and storage. We do not sell or share your health data. See our <a href="/privacy">Privacy Policy</a> for details.</p>
  </div>
</body>
</html>`;
}

export function getAccountDeletionHTML(): string {
  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BioTrack AI - Account Deletion</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.7; color: #1a1a2e; background: #f8f9fa; padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.08); }
    h1 { font-size: 28px; margin-bottom: 8px; color: #3b82f6; }
    h2 { font-size: 20px; margin-top: 24px; margin-bottom: 12px; color: #1e3a5f; }
    p, li { font-size: 15px; margin-bottom: 10px; color: #374151; }
    ul { padding-left: 24px; margin-bottom: 16px; }
    a { color: #3b82f6; }
    .warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Account Deletion</h1>
    <p>BioTrack AI allows you to delete your account and all associated data.</p>

    <h2>How to Delete Your Account</h2>
    <p>You can delete your account directly from the app:</p>
    <ul>
      <li>Open BioTrack AI</li>
      <li>Go to the Profile tab</li>
      <li>Scroll down and tap "Delete Account"</li>
      <li>Confirm the deletion</li>
    </ul>

    <p>Alternatively, you can request account deletion by emailing <a href="mailto:support@biotrack-ai.com">support@biotrack-ai.com</a> with your registered email address.</p>

    <h2>What Data Gets Deleted</h2>
    <p>Upon account deletion, the following data is permanently removed within 30 days:</p>
    <ul>
      <li>Your account profile and authentication data</li>
      <li>All uploaded lab result PDFs</li>
      <li>All test results and health records</li>
      <li>All generated diet plans</li>
      <li>All reminders and preferences</li>
      <li>Subscription history (active subscriptions must be cancelled separately through your app store)</li>
    </ul>

    <div class="warning">
      <strong>Important:</strong> If you have an active subscription, please cancel it through your device's app store settings before deleting your account. Deleting your account does not automatically cancel your subscription billing.
    </div>
  </div>
</body>
</html>`;
}
