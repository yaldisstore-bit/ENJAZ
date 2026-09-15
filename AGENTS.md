# ENJAZ Agent Working Protocol

This file defines the owner-facing working protocol for any AI agent or engineering assistant working on ENJAZ. It is a communication and execution companion to the technical governance files; it does not weaken or replace any engineering, security, certification, roadmap, or authority contract.

## 1. Owner comprehension is mandatory

The ENJAZ owner must never be left watching technical work without understanding what is happening.

For every meaningful implementation, database, GitHub, CI/CD, deployment, security, or certification action, explain the work in clear Arabic using this simple structure whenever practical:

1. **ماذا أفعل الآن؟** — what is being changed or checked.
2. **لماذا أفعله؟** — the business or safety reason.
3. **ما الذي حدث؟** — the actual result, including failures.
4. **ماذا يعني هذا لك؟** — the practical effect on ENJAZ or on the current phase.
5. **ما الخطوة التالية؟** — what remains next.

Do not assume that the owner understands software-engineering terminology.

## 2. Explain technical terms immediately

When a technical term is important, use it but explain it on first use in plain Arabic. Examples:

- **PR / Pull Request:** طلب لدمج تغييرات الفرع إلى النسخة الرئيسية بعد الفحص.
- **CI:** اختبارات آلية يشغّلها GitHub للتأكد أن التغيير لم يكسر المشروع.
- **SHA:** بصمة فريدة لإصدار محدد من الكود؛ نستخدمها للتأكد أننا نفحص أو ندمج النسخة الصحيحة بالضبط.
- **RPC:** أمر آمن ومحدد ترسله الواجهة إلى قاعدة البيانات بدلاً من تعديل الجداول مباشرة.
- **Migration:** ملف تغيير منظم لهيكل قاعدة البيانات أو قواعدها.
- **RLS:** قواعد حماية في قاعدة البيانات تحدد أي مستخدم يستطيع رؤية أو تعديل أي صفوف.
- **Real Cloud:** الاختبار على Supabase الحقيقي للمشروع، وليس على نموذج محلي أو وهمي.
- **Real Browser / Chromium:** تشغيل التطبيق فعلياً داخل متصفح حقيقي آلياً للتأكد أن الواجهة والسلوك يعملان كما يتوقع المستخدم.
- **Gate:** مجموعة شروط واختبارات يجب أن تنجح قبل السماح بالانتقال أو الدمج.
- **Idempotency:** إذا أُعيد نفس الأمر بسبب انقطاع أو ضغط متكرر، لا يُنفذ مرتين بالخطأ.
- **Stale version:** المستخدم يحاول تعديل بيانات تغيرت منذ أن قرأها؛ يجب رفض التعديل القديم بدلاً من الكتابة فوق الأحدث.

Do not stack unexplained acronyms such as “CI/RPC/RLS PASS on SHA” as the primary owner update.

## 3. Translate status into meaning

Raw technical status is insufficient.

Instead of only saying:

> CI PASS, PR mergeable, Real Cloud probe green.

Explain:

> اختبارات GitHub نجحت، أي أن التغيير لم يكسر البناء أو الاختبارات المعتمدة. وطلب الدمج أصبح قابلاً للدمج تقنياً. كذلك اختبرنا الأوامر على قاعدة Supabase الحقيقية ونجحت بدون ترك بيانات تجريبية.

The technical identifiers may be included after the plain-language explanation for traceability.

## 4. Explain risk before dangerous actions

Before a potentially disruptive action, state the impact in plain Arabic. This includes, at minimum:

- revoking database permissions;
- destructive migrations;
- production deployment changes;
- merging a major phase branch;
- deleting or replacing data/code;
- changing canonical authority/source-of-truth rules;
- changing authentication, secrets, RLS, or service-role boundaries.

Example:

> سأمنع الآن الكتابة المباشرة على جدول المواعيد. السبب: إجبار التطبيق على استخدام الأمر المحكوم الجديد. لن أفعل ذلك قبل التأكد أن النسخة المنشورة تستخدم المسار الجديد حتى لا تتوقف المواعيد عند المستخدمين.

## 5. Keep the owner oriented in the roadmap

During long work, periodically state in plain language:

- the current phase and slice;
- what has already been completed;
- what is being worked on now;
- what remains before the slice/phase can close;
- whether the next phase is still locked.

The owner should be able to answer “أين وصلنا؟” from the latest update without reading raw CI logs or source files.

## 6. Failures must be explained, not hidden

If a check fails, report:

- what failed;
- whether it is a real product defect, a test problem, an infrastructure/runner issue, or an expected fail-closed boundary;
- what user-facing risk exists, if any;
- what repair is being applied.

Never convert a failure into vague wording such as “minor issue” without evidence.

## 7. Simplicity must not reduce rigor

Plain-language explanation is for comprehension, not for lowering engineering standards.

Keep full technical rigor in code, tests, database security, evidence, and certification. Explain complex work simply, but do not omit critical facts merely because they are technical.

## 8. Default language and tone

- Owner-facing explanations should default to clear Arabic.
- Prefer short, connected explanations over dense jargon lists.
- Technical names, file paths, branch names, PR numbers, migration names, and SHAs may remain in English/code form, followed by their meaning when relevant.
- The owner should feel informed and in control of the project, not like an observer of an opaque engineering process.

## 9. Mandatory closing summary for substantial work

After a substantial work block, summarize in plain Arabic:

**أنجزنا:** what is truly complete.

**لم نغلق بعد:** what remains incomplete or intentionally pending.

**السبب:** why it remains pending.

**التالي:** the exact next meaningful step.

This communication protocol is persistent project guidance and should be preserved across future ENJAZ phases unless the owner explicitly changes it.
