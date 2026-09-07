from pathlib import Path

path = Path('src/ui-r2/core-work/CoreWorkConnected.tsx')
text = path.read_text()

def once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one marker, got {count}')
    text = text.replace(old, new, 1)

once(
    "import type { TransactionLifecycleAction } from '../../features/transactions/transactionLifecycleModel.ts';\n",
    "import type { TransactionLifecycleAction } from '../../features/transactions/transactionLifecycleModel.ts';\nimport { ConnectedGovernmentProcedurePanel } from '../workflow/GovernmentProcedurePanel.tsx';\n",
    'workflow panel import',
)
once(
    "type TabId = 'overview' | 'activity' | 'followups' | 'documents' | 'finance';",
    "type TabId = 'overview' | 'activity' | 'followups' | 'documents' | 'workflow' | 'finance';",
    'workflow tab type',
)
once(
    "  else if (tab === 'finance') panel = <Panel id=\"finance\"><div className=\"r2-golden-panel__heading\"><div><span>السياق المالي</span><h2>الأتعاب والدفعات</h2></div></div><div className=\"r2-golden-finance\"><div><span>الأتعاب الحالية</span><strong>{money(snapshot.currentFee, snapshot.feePrecisionSafe)}</strong></div><div><span>الدفعات المثبتة</span><strong>{money(snapshot.financialSummary.postedTotal, snapshot.financialSummary.precisionSafe)}</strong></div><div><span>المتبقي</span><strong>{money(remaining, snapshot.feePrecisionSafe && snapshot.financialSummary.precisionSafe)}</strong></div></div></Panel>;",
    "  else if (tab === 'workflow') panel = <Panel id=\"workflow\"><ConnectedGovernmentProcedurePanel transactionId={transactionId} /></Panel>;\n  else if (tab === 'finance') panel = <Panel id=\"finance\"><div className=\"r2-golden-panel__heading\"><div><span>السياق المالي</span><h2>الأتعاب والدفعات</h2></div></div><div className=\"r2-golden-finance\"><div><span>الأتعاب الحالية</span><strong>{money(snapshot.currentFee, snapshot.feePrecisionSafe)}</strong></div><div><span>الدفعات المثبتة</span><strong>{money(snapshot.financialSummary.postedTotal, snapshot.financialSummary.precisionSafe)}</strong></div><div><span>المتبقي</span><strong>{money(remaining, snapshot.feePrecisionSafe && snapshot.financialSummary.precisionSafe)}</strong></div></div></Panel>;",
    'workflow panel branch',
)
once(
    "{([['overview','نظرة عامة'],['activity','النشاط'],['followups','المتابعات'],['documents','الوثائق'],['finance','المالية']] as const).map",
    "{([['overview','نظرة عامة'],['activity','النشاط'],['followups','المتابعات'],['documents','الوثائق'],['workflow','الإجراء الحكومي'],['finance','المالية']] as const).map",
    'workflow navigation tab',
)
path.write_text(text)
