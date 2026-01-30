// =====================================================
// CRM Pipeline Configuration
// =====================================================

import { 
  UserPlus, Phone, UserCheck, Calendar, CalendarCheck,
  FileText, Handshake, CheckCircle2, XCircle,
  Clock, Rocket, Wrench, TestTube, Eye, Radio, Gift,
  Target, TrendingUp, Award, AlertTriangle, Pause, RefreshCw, XOctagon
} from 'lucide-react';

// =====================================================
// Lead Pipeline Stages
// =====================================================
export type LeadStage = 
  | 'new' 
  | 'contacted' 
  | 'qualified' 
  | 'meeting_scheduled' 
  | 'meeting_done' 
  | 'proposal_sent' 
  | 'negotiation' 
  | 'won' 
  | 'lost';

export const leadStages: Record<LeadStage, {
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
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    icon: UserPlus,
    order: 1,
  },
  contacted: {
    label: 'تم التواصل',
    labelEn: 'Contacted',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: Phone,
    order: 2,
  },
  qualified: {
    label: 'مؤهل',
    labelEn: 'Qualified',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    icon: UserCheck,
    order: 3,
  },
  meeting_scheduled: {
    label: 'اجتماع مجدول',
    labelEn: 'Meeting Scheduled',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    icon: Calendar,
    order: 4,
  },
  meeting_done: {
    label: 'تم الاجتماع',
    labelEn: 'Meeting Done',
    color: 'text-violet-600',
    bgColor: 'bg-violet-100',
    icon: CalendarCheck,
    order: 5,
  },
  proposal_sent: {
    label: 'عرض مرسل',
    labelEn: 'Proposal Sent',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    icon: FileText,
    order: 6,
  },
  negotiation: {
    label: 'تفاوض',
    labelEn: 'Negotiation',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    icon: Handshake,
    order: 7,
  },
  won: {
    label: 'فوز',
    labelEn: 'Won',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: CheckCircle2,
    order: 8,
  },
  lost: {
    label: 'خسارة',
    labelEn: 'Lost',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    icon: XCircle,
    order: 9,
  },
};

// =====================================================
// Opportunity Pipeline Stages
// =====================================================
export type OpportunityStage = 
  | 'qualification' 
  | 'needs_analysis' 
  | 'proposal' 
  | 'negotiation' 
  | 'closed_won' 
  | 'closed_lost';

export const opportunityStages: Record<OpportunityStage, {
  label: string;
  labelEn: string;
  color: string;
  bgColor: string;
  icon: any;
  order: number;
  probability: number;
}> = {
  qualification: {
    label: 'تأهيل',
    labelEn: 'Qualification',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: UserCheck,
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
// Lead Sources
// =====================================================
export type LeadSource = 
  | 'website' 
  | 'referral' 
  | 'social_media' 
  | 'event' 
  | 'cold_outreach' 
  | 'manual';

export const leadSources: Record<LeadSource, {
  label: string;
  color: string;
}> = {
  website: { label: 'الموقع الإلكتروني', color: 'text-blue-600' },
  referral: { label: 'توصية', color: 'text-green-600' },
  social_media: { label: 'وسائل التواصل', color: 'text-purple-600' },
  event: { label: 'فعالية/مؤتمر', color: 'text-orange-600' },
  cold_outreach: { label: 'تواصل مباشر', color: 'text-gray-600' },
  manual: { label: 'إدخال يدوي', color: 'text-slate-600' },
};

// =====================================================
// Lead/Customer Types
// =====================================================
export type LeadType = 'subscription' | 'custom_platform' | 'services';

export const leadTypes: Record<LeadType, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  subscription: { label: 'اشتراك ويبيان', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  custom_platform: { label: 'منصة مخصصة', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  services: { label: 'خدمات', color: 'text-green-600', bgColor: 'bg-green-100' },
};

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
// Helper Functions
// =====================================================
export function getLeadStageLabel(stage: string): string {
  return leadStages[stage as LeadStage]?.label || stage;
}

export function getOpportunityStageLabel(stage: string): string {
  return opportunityStages[stage as OpportunityStage]?.label || stage;
}

export function getImplementationStageLabel(stage: string): string {
  return implementationStages[stage as ImplementationStage]?.label || stage;
}

export function getSuccessStageLabel(stage: string): string {
  return successStages[stage as SuccessStage]?.label || stage;
}

export function formatCurrency(amount: number, currency: string = 'SAR'): string {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
