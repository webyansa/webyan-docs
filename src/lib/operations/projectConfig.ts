// =====================================================
// Project Operations Configuration
// =====================================================

import { 
  Rocket, Settings, FileText, Eye, Package, CheckCircle2,
  Users, UserCog, Briefcase, ClipboardList, Globe, Monitor,
  Upload, UserCheck, Zap, Lock
} from 'lucide-react';

// =====================================================
// Project Phase Types (8 phases)
// =====================================================
export type ProjectPhaseType = 
  | 'requirements'
  | 'setup'
  | 'development'
  | 'content'
  | 'internal_review'
  | 'client_review'
  | 'launch'
  | 'closure';

export const projectPhases: Record<ProjectPhaseType, {
  label: string;
  labelEn: string;
  color: string;
  bgColor: string;
  icon: any;
  order: number;
  description: string;
}> = {
  requirements: {
    label: 'استلام المتطلبات',
    labelEn: 'Requirements',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: ClipboardList,
    order: 1,
    description: 'جمع وتوثيق متطلبات العميل',
  },
  setup: {
    label: 'تجهيز البيئة',
    labelEn: 'Setup',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    icon: Settings,
    order: 2,
    description: 'إعداد الاستضافة والبيئة التقنية',
  },
  development: {
    label: 'إعداد الموقع',
    labelEn: 'Development',
    color: 'text-violet-600',
    bgColor: 'bg-violet-100',
    icon: Monitor,
    order: 3,
    description: 'بناء وتطوير الموقع/المنصة',
  },
  content: {
    label: 'إدخال المحتوى',
    labelEn: 'Content',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    icon: Upload,
    order: 4,
    description: 'إضافة المحتوى الأساسي',
  },
  internal_review: {
    label: 'المراجعة الداخلية',
    labelEn: 'Internal Review',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    icon: Eye,
    order: 5,
    description: 'اختبار ومراجعة داخلية',
  },
  client_review: {
    label: 'مراجعة العميل',
    labelEn: 'Client Review',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    icon: UserCheck,
    order: 6,
    description: 'عرض على العميل ومعالجة الملاحظات',
  },
  launch: {
    label: 'الإطلاق',
    labelEn: 'Launch',
    color: 'text-teal-600',
    bgColor: 'bg-teal-100',
    icon: Zap,
    order: 7,
    description: 'الإطلاق والربط النهائي',
  },
  closure: {
    label: 'التسليم والإغلاق',
    labelEn: 'Closure',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: CheckCircle2,
    order: 8,
    description: 'تسليم المشروع وتوثيق البيانات',
  },
};

// Legacy mapping for backward compatibility
export const legacyPhaseMapping: Record<string, ProjectPhaseType> = {
  'kickoff': 'requirements',
  'setup': 'setup',
  'content': 'content',
  'review': 'internal_review',
  'delivery': 'launch',
  'closure': 'closure',
};

// =====================================================
// Phase Status Types
// =====================================================
export type PhaseStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';

export const phaseStatuses: Record<PhaseStatus, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  pending: {
    label: 'في الانتظار',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
  in_progress: {
    label: 'قيد التنفيذ',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  completed: {
    label: 'مكتمل',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  blocked: {
    label: 'بانتظار العميل',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
};

// =====================================================
// Team Role Types
// =====================================================
export type TeamRole = 'implementer' | 'csm' | 'project_manager';

export const teamRoles: Record<TeamRole, {
  label: string;
  labelEn: string;
  color: string;
  bgColor: string;
  icon: any;
  description: string;
}> = {
  implementer: {
    label: 'موظف التنفيذ',
    labelEn: 'Implementer',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: UserCog,
    description: 'مسؤول عن تجهيز وتنفيذ المشروع تقنياً',
  },
  csm: {
    label: 'مدير نجاح العميل',
    labelEn: 'Customer Success Manager',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: Users,
    description: 'مسؤول عن التواصل مع العميل وضمان رضاه',
  },
  project_manager: {
    label: 'مدير المشروع',
    labelEn: 'Project Manager',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    icon: Briefcase,
    description: 'مسؤول عن إدارة المشروع والجدول الزمني',
  },
};

// =====================================================
// Contract Status Types
// =====================================================
export type ContractStatus = 'preparing' | 'signed';

export const contractStatuses: Record<ContractStatus, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  preparing: {
    label: 'قيد الإعداد',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
  signed: {
    label: 'تم التوقيع',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
};

// =====================================================
// Sprint Status Types
// =====================================================
export type SprintStatus = 'planned' | 'active' | 'completed';

export const sprintStatuses: Record<SprintStatus, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  planned: {
    label: 'مخطط',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
  active: {
    label: 'نشط',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  completed: {
    label: 'مكتمل',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
};

// =====================================================
// Task Status Types
// =====================================================
export type TaskStatus = 'todo' | 'in_progress' | 'done';

export const taskStatuses: Record<TaskStatus, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  todo: {
    label: 'للتنفيذ',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
  in_progress: {
    label: 'قيد التنفيذ',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  done: {
    label: 'مكتمل',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
};

// =====================================================
// Priority Types
// =====================================================
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export const priorities: Record<Priority, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  low: {
    label: 'منخفضة',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
  medium: {
    label: 'متوسطة',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  high: {
    label: 'عالية',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  urgent: {
    label: 'عاجلة',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
};

// =====================================================
// Project Status Types
// =====================================================
export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'cancelled';

export const projectStatuses: Record<ProjectStatus, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  active: {
    label: 'نشط',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  on_hold: {
    label: 'متوقف',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
  completed: {
    label: 'مكتمل',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  cancelled: {
    label: 'ملغي',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
};

// =====================================================
// Contract Types
// =====================================================
export const contractTypes = [
  { value: 'service', label: 'عقد خدمات' },
  { value: 'subscription', label: 'عقد اشتراك' },
  { value: 'development', label: 'عقد تطوير' },
  { value: 'maintenance', label: 'عقد صيانة' },
  { value: 'other', label: 'أخرى' },
];

// =====================================================
// Project Types
// =====================================================
export const projectTypes = [
  { value: 'webyan_subscription', label: 'اشتراك ويبيان' },
  { value: 'custom_platform', label: 'منصة مخصصة' },
  { value: 'website', label: 'موقع إلكتروني' },
  { value: 'ecommerce', label: 'متجر إلكتروني' },
  { value: 'mobile_app', label: 'تطبيق جوال' },
  { value: 'other', label: 'أخرى' },
];
