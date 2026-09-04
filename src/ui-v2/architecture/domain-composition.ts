export type EnjazDomainId =
  | 'transactions'
  | 'companies'
  | 'people'
  | 'finance'
  | 'workflow'
  | 'automation'
  | 'operations'
  | 'command'
  | 'risk'
  | 'documents'
  | 'followups'
  | 'copilot';

export type EnjazDomainDefinition = Readonly<{
  id: EnjazDomainId;
  label: string;
  eyebrow: string;
  description: string;
  signature: string;
  accent: 'gold' | 'finance' | 'operations' | 'violet' | 'copper' | 'danger' | 'dark';
}>;

export const enjazDomains: readonly EnjazDomainDefinition[] = [
  { id: 'transactions', label: 'المعاملات', eyebrow: 'دورة العمل', description: 'قائمة كثيفة، حالة، ملكية ومرحلة.', signature: 'pipeline+dense-queue', accent: 'gold' },
  { id: 'companies', label: 'الشركات', eyebrow: 'الكيانات', description: 'علاقة الشركة بمعاملاتها ووثائقها ومسؤوليها.', signature: 'entity-profile+relationship-map', accent: 'gold' },
  { id: 'people', label: 'الأشخاص والمحامون', eyebrow: 'شبكة العلاقات', description: 'دليل أشخاص مع الحمل والنشاط والارتباطات.', signature: 'people-directory+activity', accent: 'operations' },
  { id: 'finance', label: 'المالية', eyebrow: 'الدفتر', description: 'رصيد، حركة، استحقاق واتجاه تحصيل.', signature: 'ledger+aging', accent: 'finance' },
  { id: 'workflow', label: 'سير العمل', eyebrow: 'المراحل', description: 'مراحل واضحة وانتقالات وحواجز.', signature: 'stage-lanes+transition', accent: 'violet' },
  { id: 'automation', label: 'الأتمتة', eyebrow: 'القواعد', description: 'مشغلات وشروط وأفعال ونتائج.', signature: 'rule-stack+execution-health', accent: 'operations' },
  { id: 'operations', label: 'مركز العمليات', eyebrow: 'التشغيل', description: 'حمولة وملكية وجدول قريب.', signature: 'operations-pulse+ownership', accent: 'operations' },
  { id: 'command', label: 'مركز القيادة', eyebrow: 'القرار', description: 'استثناءات وقرارات عابرة للمجالات.', signature: 'executive-focus+cross-domain', accent: 'dark' },
  { id: 'risk', label: 'المخاطر والرؤى', eyebrow: 'الذكاء التشغيلي', description: 'خريطة مخاطر، مناظر محفوظة وإشارات.', signature: 'risk-map+saved-views', accent: 'danger' },
  { id: 'documents', label: 'الوثائق والتقارير', eyebrow: 'الخزنة', description: 'فئات، ملفات، معاينة وتقارير.', signature: 'category+list+detail', accent: 'copper' },
  { id: 'followups', label: 'المتابعات والإشعارات', eyebrow: 'مركز الانتباه', description: 'وارد موحد مرتب حسب الأثر والوقت.', signature: 'attention-inbox+timeline', accent: 'gold' },
  { id: 'copilot', label: 'مساعد إنجاز', eyebrow: 'المساعد الذكي', description: 'مساعدة سياقية مرتبطة بالسجل الحالي.', signature: 'context+assistant', accent: 'violet' },
] as const;

export const domainById = Object.fromEntries(enjazDomains.map((domain) => [domain.id, domain])) as Record<EnjazDomainId, EnjazDomainDefinition>;
