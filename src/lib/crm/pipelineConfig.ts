// =====================================================
// CRM Pipeline Configuration - Simplified Version
// =====================================================

import { 
  UserPlus, Phone, ThumbsUp, X,
  FileText, Handshake, CheckCircle2, XCircle,
  Clock, Rocket, Wrench, TestTube, Eye, Radio, Gift,
  Target, TrendingUp, Award, AlertTriangle, XOctagon, Calendar
} from 'lucide-react';

// =====================================================
// Lead Status (Simplified - 4 statuses only)
// =====================================================
export type LeadStatus = 'new' | 'contacted' | 'interested' | 'not_interested';

export const leadStatuses: Record<LeadStatus, {
  label: string;
  labelEn: string;
  color: string;
  bgColor: string;
  icon: any;
  order: number;
}> = {
  new: {
    label: 'جديد',
    labelEn: 'New',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: UserPlus,
    order: 1,
  },
  contacted: {
    label: 'تم التواصل',
    labelEn: 'Contacted',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    icon: Phone,
    order: 2,
  },
  interested: {
    label: 'مهتم',
    labelEn: 'Interested',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: ThumbsUp,
    order: 3,
  },
  not_interested: {
    label: 'غير مهتم',
    labelEn: 'Not Interested',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    icon: X,
    order: 4,
  },
};

// =====================================================
// Deal/Opportunity Stages (7 stages with Workflow)
// =====================================================
export type DealStage = 
  | 'new_opportunity' 
  | 'meeting_scheduled'  // جديد: اجتماع مجدول
  | 'meeting_done' 
  | 'proposal_sent' 
  | 'pending_approval' 
  | 'approved' 
  | 'rejected';

export const dealStages: Record<DealStage, {
  label: string;
  labelEn: string;
  color: string;
  bgColor: string;
  icon: any;
  order: number;
  probability: number;
  requiredAction?: string;
}> = {
  new_opportunity: {
    label: 'فرصة جديدة',
    labelEn: 'New Opportunity',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: Target,
    order: 1,
    probability: 10,
  },
  meeting_scheduled: {
    label: 'اجتماع مجدول',
    labelEn: 'Meeting Scheduled',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
    icon: Calendar,
    order: 2,
    probability: 20,
    requiredAction: 'schedule_meeting',
  },
  meeting_done: {
    label: 'اجتماع تم',
    labelEn: 'Meeting Done',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    icon: Calendar,
    order: 3,
    probability: 40,
    requiredAction: 'meeting_report',
  },
  proposal_sent: {
    label: 'عرض مرسل',
    labelEn: 'Proposal Sent',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    icon: FileText,
    order: 4,
    probability: 60,
    requiredAction: 'create_quote',
  },
  pending_approval: {
    label: 'بانتظار الاعتماد',
    labelEn: 'Pending Approval',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    icon: Handshake,
    order: 5,
    probability: 80,
    requiredAction: 'stage_note',
  },
  approved: {
    label: 'معتمد',
    labelEn: 'Approved',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: CheckCircle2,
    order: 6,
    probability: 100,
    requiredAction: 'approval',
  },
  rejected: {
    label: 'مرفوض',
    labelEn: 'Rejected',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    icon: XCircle,
    order: 7,
    probability: 0,
    requiredAction: 'rejection',
  },
};

// =====================================================
// Rejection Reasons
// =====================================================
export const rejectionReasons = [
  { value: 'price_high', label: 'السعر مرتفع' },
  { value: 'no_response', label: 'لا يوجد رد من العميل' },
  { value: 'postponed', label: 'تأجيل المشروع' },
  { value: 'competitor', label: 'اختار مزود آخر' },
  { value: 'requirements_mismatch', label: 'عدم توافق المتطلبات' },
  { value: 'budget_issues', label: 'مشاكل في الميزانية' },
  { value: 'timing', label: 'التوقيت غير مناسب' },
  { value: 'other', label: 'سبب آخر' },
];

// =====================================================
// Meeting Types
// =====================================================
export const meetingTypes = [
  { value: 'in_person', label: 'حضوري' },
  { value: 'remote', label: 'عن بُعد' },
  { value: 'phone', label: 'مكالمة هاتفية' },
];

// =====================================================
// Meeting Durations
// =====================================================
export const meetingDurations = [
  { value: 30, label: '30 دقيقة' },
  { value: 60, label: 'ساعة' },
  { value: 90, label: 'ساعة ونصف' },
  { value: 120, label: 'ساعتان' },
];

// =====================================================
// Meeting Results
// =====================================================
export const meetingResults = [
  { value: 'positive', label: 'إيجابي - العميل مهتم', color: 'text-green-600' },
  { value: 'neutral', label: 'محايد - يحتاج متابعة', color: 'text-yellow-600' },
  { value: 'negative', label: 'سلبي - غير مهتم', color: 'text-red-600' },
];

// =====================================================
// Quote Validity
// =====================================================
export const quoteValidityOptions = [
  { value: 15, label: '15 يوم' },
  { value: 30, label: '30 يوم' },
  { value: 45, label: '45 يوم' },
  { value: 60, label: '60 يوم' },
];

// Legacy support - map old types to new ones
export type LeadStage = LeadStatus;
export const leadStages = leadStatuses;

export type OpportunityStage = 
  | 'qualification' 
  | 'needs_analysis' 
  | 'proposal' 
  | 'negotiation' 
  | 'closed_won' 
  | 'closed_lost'
  | DealStage;

export const opportunityStages: Record<string, {
  label: string;
  labelEn: string;
  color: string;
  bgColor: string;
  icon: any;
  order: number;
  probability: number;
}> = {
  // New simplified stages
  ...dealStages,
  // Legacy stages for backward compatibility
  qualification: {
    label: 'تأهيل',
    labelEn: 'Qualification',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: Target,
    order: 1,
    probability: 20,
  },
  needs_analysis: {
    label: 'تحليل الاحتياجات',
    labelEn: 'Needs Analysis',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    icon: Target,
    order: 2,
    probability: 40,
  },
  proposal: {
    label: 'عرض سعر',
    labelEn: 'Proposal',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    icon: FileText,
    order: 3,
    probability: 60,
  },
  negotiation: {
    label: 'تفاوض',
    labelEn: 'Negotiation',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    icon: Handshake,
    order: 4,
    probability: 80,
  },
  closed_won: {
    label: 'فوز',
    labelEn: 'Closed Won',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: CheckCircle2,
    order: 5,
    probability: 100,
  },
  closed_lost: {
    label: 'خسارة',
    labelEn: 'Closed Lost',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    icon: XCircle,
    order: 6,
    probability: 0,
  },
};

// =====================================================
// Implementation/Delivery Pipeline Stages
// =====================================================
export type ImplementationStage = 
  | 'pending' 
  | 'kickoff' 
  | 'requirements' 
  | 'build' 
  | 'testing' 
  | 'review' 
  | 'go_live' 
  | 'handover' 
  | 'completed';

export const implementationStages: Record<ImplementationStage, {
  label: string;
  labelEn: string;
  color: string;
  bgColor: string;
  icon: any;
  order: number;
  defaultProgress: number;
}> = {
  pending: {
    label: 'انتظار',
    labelEn: 'Pending',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    icon: Clock,
    order: 1,
    defaultProgress: 0,
  },
  kickoff: {
    label: 'بداية المشروع',
    labelEn: 'Kickoff',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: Rocket,
    order: 2,
    defaultProgress: 10,
  },
  requirements: {
    label: 'جمع المتطلبات',
    labelEn: 'Requirements',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    icon: FileText,
    order: 3,
    defaultProgress: 25,
  },
  build: {
    label: 'التطوير',
    labelEn: 'Build',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    icon: Wrench,
    order: 4,
    defaultProgress: 50,
  },
  testing: {
    label: 'الاختبار',
    labelEn: 'Testing',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    icon: TestTube,
    order: 5,
    defaultProgress: 70,
  },
  review: {
    label: 'مراجعة العميل',
    labelEn: 'Review',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    icon: Eye,
    order: 6,
    defaultProgress: 85,
  },
  go_live: {
    label: 'الإطلاق',
    labelEn: 'Go Live',
    color: 'text-teal-600',
    bgColor: 'bg-teal-100',
    icon: Radio,
    order: 7,
    defaultProgress: 95,
  },
  handover: {
    label: 'التسليم',
    labelEn: 'Handover',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
    icon: Gift,
    order: 8,
    defaultProgress: 100,
  },
  completed: {
    label: 'مكتمل',
    labelEn: 'Completed',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: CheckCircle2,
    order: 9,
    defaultProgress: 100,
  },
};

// =====================================================
// Customer Success Lifecycle Stages
// =====================================================
export type SuccessStage = 
  | 'onboarding' 
  | 'adoption' 
  | 'expansion' 
  | 'advocacy' 
  | 'at_risk' 
  | 'churned';

export const successStages: Record<SuccessStage, {
  label: string;
  labelEn: string;
  color: string;
  bgColor: string;
  icon: any;
  order: number;
}> = {
  onboarding: {
    label: 'التهيئة',
    labelEn: 'Onboarding',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: Rocket,
    order: 1,
  },
  adoption: {
    label: 'التبني',
    labelEn: 'Adoption',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    icon: TrendingUp,
    order: 2,
  },
  expansion: {
    label: 'التوسع',
    labelEn: 'Expansion',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    icon: Target,
    order: 3,
  },
  advocacy: {
    label: 'التأييد',
    labelEn: 'Advocacy',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: Award,
    order: 4,
  },
  at_risk: {
    label: 'مهدد',
    labelEn: 'At Risk',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    icon: AlertTriangle,
    order: 5,
  },
  churned: {
    label: 'منتهي',
    labelEn: 'Churned',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    icon: XOctagon,
    order: 6,
  },
};

// =====================================================
// Lead Sources (Simplified)
// =====================================================
export type LeadSource = 'form' | 'call' | 'referral';

export const leadSources: Record<LeadSource, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  form: { label: 'نموذج', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  call: { label: 'اتصال', color: 'text-green-600', bgColor: 'bg-green-100' },
  referral: { label: 'إحالة', color: 'text-purple-600', bgColor: 'bg-purple-100' },
};

// =====================================================
// Service Types
// =====================================================
export type ServiceType = 'subscription' | 'custom_platform';

export const serviceTypes: Record<ServiceType, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  subscription: { label: 'اشتراك ويبيان', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  custom_platform: { label: 'منصة مخصصة', color: 'text-purple-600', bgColor: 'bg-purple-100' },
};

// Legacy support
export type LeadType = ServiceType;
export const leadTypes = serviceTypes;

// =====================================================
// System Types
// =====================================================
export type SystemType = 
  | 'website' 
  | 'admin_panel' 
  | 'client_portal' 
  | 'api' 
  | 'database' 
  | 'email' 
  | 'other';

export const systemTypes: Record<SystemType, {
  label: string;
  icon: string;
}> = {
  website: { label: 'الموقع الإلكتروني', icon: '🌐' },
  admin_panel: { label: 'لوحة التحكم', icon: '🔐' },
  client_portal: { label: 'بوابة العملاء', icon: '👥' },
  api: { label: 'API', icon: '🔗' },
  database: { label: 'قاعدة البيانات', icon: '🗄️' },
  email: { label: 'البريد الإلكتروني', icon: '📧' },
  other: { label: 'أخرى', icon: '📦' },
};

// =====================================================
// Health Status
// =====================================================
export type HealthStatus = 'healthy' | 'neutral' | 'at_risk' | 'churning';

export const healthStatuses: Record<HealthStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  healthy: { label: 'ممتاز', color: 'text-green-600', bgColor: 'bg-green-100', icon: '🟢' },
  neutral: { label: 'عادي', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: '🟡' },
  at_risk: { label: 'مهدد', color: 'text-orange-600', bgColor: 'bg-orange-100', icon: '🟠' },
  churning: { label: 'متوقف', color: 'text-red-600', bgColor: 'bg-red-100', icon: '🔴' },
};

// =====================================================
// Quote Status
// =====================================================
export type QuoteStatus = 
  | 'draft' 
  | 'sent' 
  | 'viewed' 
  | 'accepted' 
  | 'rejected' 
  | 'expired' 
  | 'revised';

export const quoteStatuses: Record<QuoteStatus, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  draft: { label: 'مسودة', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  sent: { label: 'مرسل', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  viewed: { label: 'تم الاطلاع', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  accepted: { label: 'مقبول', color: 'text-green-600', bgColor: 'bg-green-100' },
  rejected: { label: 'مرفوض', color: 'text-red-600', bgColor: 'bg-red-100' },
  expired: { label: 'منتهي', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  revised: { label: 'معدّل', color: 'text-purple-600', bgColor: 'bg-purple-100' },
};

// =====================================================
// Contract Status
// =====================================================
export type ContractStatus = 
  | 'draft' 
  | 'sent' 
  | 'signed' 
  | 'active' 
  | 'expired' 
  | 'terminated' 
  | 'renewed';

export const contractStatuses: Record<ContractStatus, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  draft: { label: 'مسودة', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  sent: { label: 'مرسل', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  signed: { label: 'موقّع', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  active: { label: 'نشط', color: 'text-green-600', bgColor: 'bg-green-100' },
  expired: { label: 'منتهي', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  terminated: { label: 'ملغي', color: 'text-red-600', bgColor: 'bg-red-100' },
  renewed: { label: 'مجدد', color: 'text-teal-600', bgColor: 'bg-teal-100' },
};

// =====================================================
// Helper Functions
// =====================================================
// Helper Functions
// =====================================================
export function formatCurrency(value: number, currency: string = 'SAR'): string {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function getLeadStatusLabel(status: string): string {
  return leadStatuses[status as LeadStatus]?.label || status;
}

export function getDealStageLabel(stage: string): string {
  return dealStages[stage as DealStage]?.label || opportunityStages[stage]?.label || stage;
}

export function getImplementationStageLabel(stage: string): string {
  return implementationStages[stage as ImplementationStage]?.label || stage;
}

// Legacy function names
export function getLeadStageLabel(stage: string): string {
  return getLeadStatusLabel(stage);
}

export function getOpportunityStageLabel(stage: string): string {
  return opportunityStages[stage]?.label || getDealStageLabel(stage);
}
