import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  Edit,
  Trash2,
  Package,
  Wrench,
  Puzzle,
  Loader2,
  DollarSign,
  RotateCw,
  Percent,
  Save,
  Info,
} from 'lucide-react';
import { formatCurrency } from '@/lib/crm/pipelineConfig';

interface PricingPlan {
  id: string;
  name: string;
  name_en: string | null;
  description: string | null;
  plan_type: string;
  monthly_price: number;
  yearly_price: number;
  yearly_discount: number;
  features: string[];
  is_active: boolean;
  sort_order: number;
}

interface PricingService {
  id: string;
  name: string;
  description: string | null;
  service_type: string;
  price: number;
  unit: string;
  category: string | null;
  is_active: boolean;
  sort_order: number;
}

interface CustomSolution {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  price_note: string | null;
  is_active: boolean;
  sort_order: number;
}

export default function PricingSettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('plans');
  
  // VAT state
  const [vatRate, setVatRate] = useState('15');
  const [savingVat, setSavingVat] = useState(false);

  // Plan modal state
  const [planModal, setPlanModal] = useState<{ open: boolean; plan: PricingPlan | null }>({ open: false, plan: null });
  const [planForm, setPlanForm] = useState({
    name: '',
    description: '',
    yearly_price: '',
    monthly_enabled: false,
    yearly_discount: '',
    annual_discount_enabled: false,
    features: '',
    is_active: true,
  });

  // Service modal state
  const [serviceModal, setServiceModal] = useState<{ open: boolean; service: PricingService | null }>({ open: false, service: null });
  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    service_type: 'one_time',
    price: '',
    unit: 'مرة واحدة',
    category: '',
    is_active: true,
  });

  // Custom solution modal state
  const [solutionModal, setSolutionModal] = useState<{ open: boolean; solution: CustomSolution | null }>({ open: false, solution: null });
  const [solutionForm, setSolutionForm] = useState({
    name: '',
    description: '',
    base_price: '',
    price_note: '',
    is_active: true,
  });

  // Fetch VAT rate
  const { data: vatSetting } = useQuery({
    queryKey: ['system-vat-rate'],
    queryFn: async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'vat_rate')
        .single();
      return data?.value || '15';
    },
  });

  useEffect(() => {
    if (vatSetting) setVatRate(vatSetting);
  }, [vatSetting]);

  const handleSaveVat = async () => {
    setSavingVat(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ value: vatRate })
        .eq('key', 'vat_rate');
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['system-vat-rate'] });
      toast.success('تم تحديث نسبة الضريبة');
    } catch {
      toast.error('حدث خطأ');
    } finally {
      setSavingVat(false);
    }
  };

  // Fetch plans
  const { data: plans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ['pricing-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pricing_plans')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as PricingPlan[];
    },
  });

  // Fetch services (exclude recurring_annual)
  const { data: services = [], isLoading: loadingServices } = useQuery({
    queryKey: ['pricing-services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pricing_services')
        .select('*')
        .neq('service_type', 'recurring_annual')
        .order('sort_order');
      if (error) throw error;
      return data as PricingService[];
    },
  });

  // Fetch annual fees
  const { data: annualFees = [], isLoading: loadingAnnualFees } = useQuery({
    queryKey: ['pricing-annual-fees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pricing_services')
        .select('*')
        .eq('service_type', 'recurring_annual')
        .order('sort_order');
      if (error) throw error;
      return data as PricingService[];
    },
  });

  // Fetch custom solutions
  const { data: solutions = [], isLoading: loadingSolutions } = useQuery({
    queryKey: ['pricing-custom-solutions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pricing_custom_solutions')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as CustomSolution[];
    },
  });

  // Plan mutations
  const savePlanMutation = useMutation({
    mutationFn: async (data: any) => {
      if (planModal.plan) {
        const { error } = await supabase
          .from('pricing_plans')
          .update(data)
          .eq('id', planModal.plan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('pricing_plans').insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-plans'] });
      toast.success(planModal.plan ? 'تم تحديث الخطة' : 'تم إضافة الخطة');
      setPlanModal({ open: false, plan: null });
    },
    onError: () => toast.error('حدث خطأ'),
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pricing_plans').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-plans'] });
      toast.success('تم حذف الخطة');
    },
  });

  // Service mutations
  const saveServiceMutation = useMutation({
    mutationFn: async (data: any) => {
      if (serviceModal.service) {
        const { error } = await supabase
          .from('pricing_services')
          .update(data)
          .eq('id', serviceModal.service.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('pricing_services').insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-services'] });
      queryClient.invalidateQueries({ queryKey: ['pricing-annual-fees'] });
      toast.success(serviceModal.service ? 'تم تحديث الخدمة' : 'تم إضافة الخدمة');
      setServiceModal({ open: false, service: null });
    },
    onError: () => toast.error('حدث خطأ'),
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pricing_services').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-services'] });
      queryClient.invalidateQueries({ queryKey: ['pricing-annual-fees'] });
      toast.success('تم حذف الخدمة');
    },
  });

  // Solution mutations
  const saveSolutionMutation = useMutation({
    mutationFn: async (data: any) => {
      if (solutionModal.solution) {
        const { error } = await supabase
          .from('pricing_custom_solutions')
          .update(data)
          .eq('id', solutionModal.solution.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('pricing_custom_solutions').insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-custom-solutions'] });
      toast.success(solutionModal.solution ? 'تم تحديث الحل' : 'تم إضافة الحل');
      setSolutionModal({ open: false, solution: null });
    },
    onError: () => toast.error('حدث خطأ'),
  });

  const deleteSolutionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pricing_custom_solutions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-custom-solutions'] });
      toast.success('تم حذف الحل');
    },
  });

  // Open plan modal
  const openPlanModal = (plan?: PricingPlan) => {
    if (plan) {
      const isDiscountApplied = plan.yearly_discount > 0;
      const hasMonthly = plan.monthly_price > 0;
      setPlanForm({
        name: plan.name,
        description: plan.description || '',
        yearly_price: plan.yearly_price.toString(),
        monthly_enabled: hasMonthly,
        yearly_discount: plan.yearly_discount.toString(),
        annual_discount_enabled: isDiscountApplied,
        features: Array.isArray(plan.features) ? plan.features.join('\n') : '',
        is_active: plan.is_active,
      });
      setPlanModal({ open: true, plan });
    } else {
      setPlanForm({
        name: '',
        description: '',
        yearly_price: '',
        monthly_enabled: true,
        yearly_discount: '17',
        annual_discount_enabled: true,
        features: '',
        is_active: true,
      });
      setPlanModal({ open: true, plan: null });
    }
  };

  // Open service modal
  const openServiceModal = (service?: PricingService) => {
    if (service) {
      setServiceForm({
        name: service.name,
        description: service.description || '',
        service_type: service.service_type,
        price: service.price.toString(),
        unit: service.unit,
        category: service.category || '',
        is_active: service.is_active,
      });
      setServiceModal({ open: true, service });
    } else {
      setServiceForm({
        name: '',
        description: '',
        service_type: 'one_time',
        price: '',
        unit: 'مرة واحدة',
        category: '',
        is_active: true,
      });
      setServiceModal({ open: true, service: null });
    }
  };

  // Open solution modal
  const openSolutionModal = (solution?: CustomSolution) => {
    if (solution) {
      setSolutionForm({
        name: solution.name,
        description: solution.description || '',
        base_price: solution.base_price.toString(),
        price_note: solution.price_note || '',
        is_active: solution.is_active,
      });
      setSolutionModal({ open: true, solution });
    } else {
      setSolutionForm({
        name: '',
        description: '',
        base_price: '',
        price_note: '',
        is_active: true,
      });
      setSolutionModal({ open: true, solution: null });
    }
  };

  // Pricing calculation helpers
  const calcOriginalPrice = (yearlyPrice: number, discount: number) => {
    if (discount > 0 && discount < 100) {
      return +(yearlyPrice / (1 - discount / 100)).toFixed(2);
    }
    return yearlyPrice;
  };

  const calcMonthlyPrice = (originalPrice: number) => {
    return +(originalPrice / 12).toFixed(2);
  };

  // Save handlers
  const handleSavePlan = () => {
    const features = planForm.features.split('\n').filter(f => f.trim());
    const yearlyPrice = parseFloat(planForm.yearly_price) || 0;

    if (yearlyPrice <= 0) {
      toast.error('السعر السنوي مطلوب ويجب أن يكون أكبر من صفر');
      return;
    }

    const yearlyDiscount = planForm.annual_discount_enabled
      ? (parseInt(planForm.yearly_discount) || 0)
      : 0;

    if (planForm.annual_discount_enabled && (yearlyDiscount < 0 || yearlyDiscount >= 100)) {
      toast.error('نسبة الخصم يجب أن تكون بين 0% و 99%');
      return;
    }

    const originalPrice = calcOriginalPrice(yearlyPrice, yearlyDiscount);
    const monthlyPrice = planForm.monthly_enabled ? calcMonthlyPrice(originalPrice) : 0;

    savePlanMutation.mutate({
      name: planForm.name,
      name_en: null,
      description: planForm.description || null,
      monthly_price: monthlyPrice,
      yearly_price: yearlyPrice,
      yearly_discount: yearlyDiscount,
      features,
      is_active: planForm.is_active,
    });
  };

  const handleSaveService = () => {
    saveServiceMutation.mutate({
      name: serviceForm.name,
      description: serviceForm.description || null,
      service_type: serviceForm.service_type,
      price: parseFloat(serviceForm.price) || 0,
      unit: serviceForm.unit,
      category: serviceForm.category || null,
      is_active: serviceForm.is_active,
    });
  };

  const handleSaveSolution = () => {
    saveSolutionMutation.mutate({
      name: solutionForm.name,
      description: solutionForm.description || null,
      base_price: parseFloat(solutionForm.base_price) || 0,
      price_note: solutionForm.price_note || null,
      is_active: solutionForm.is_active,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            إعدادات التسعير
          </h1>
          <p className="text-muted-foreground">إدارة الخطط والخدمات والحلول المخصصة</p>
        </div>
      </div>

      {/* VAT Settings Card - Kept as is */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Percent className="h-4 w-4 text-primary" />
            إعدادات ضريبة القيمة المضافة (VAT)
          </CardTitle>
          <CardDescription>يتم تطبيق هذه النسبة تلقائياً في التسعير وعروض الأسعار والفواتير</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="space-y-2 w-48">
              <Label>نسبة الضريبة (%)</Label>
              <Input
                type="number"
                value={vatRate}
                onChange={(e) => setVatRate(e.target.value)}
                min="0"
                max="100"
                step="0.5"
              />
            </div>
            <Button onClick={handleSaveVat} disabled={savingVat} size="sm" className="gap-2">
              {savingVat ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              حفظ
            </Button>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5" />
              <span>جميع الأسعار المدخلة في النظام شاملة الضريبة</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="plans" className="gap-2">
            <Package className="h-4 w-4" />
            الخطط ({plans.length})
          </TabsTrigger>
          <TabsTrigger value="services" className="gap-2">
            <Wrench className="h-4 w-4" />
            الخدمات الإضافية ({services.length})
          </TabsTrigger>
          <TabsTrigger value="annual_fees" className="gap-2">
            <RotateCw className="h-4 w-4" />
            الرسوم السنوية ({annualFees.length})
          </TabsTrigger>
          <TabsTrigger value="solutions" className="gap-2">
            <Puzzle className="h-4 w-4" />
            الحلول المخصصة ({solutions.length})
          </TabsTrigger>
        </TabsList>

        {/* Plans Tab */}
        <TabsContent value="plans">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>خطط الاشتراك</CardTitle>
                <CardDescription>إدارة خطط اشتراكات ويبيان</CardDescription>
              </div>
              <Button onClick={() => openPlanModal()} className="gap-2">
                <Plus className="h-4 w-4" />
                إضافة خطة
              </Button>
            </CardHeader>
            <CardContent>
              {loadingPlans ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الخطة</TableHead>
                      <TableHead>السعر الأصلي</TableHead>
                      <TableHead>السنوي (بعد الخصم)</TableHead>
                      <TableHead>الشهري</TableHead>
                      <TableHead>الخصم</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plans.map((plan) => {
                      const origPrice = calcOriginalPrice(plan.yearly_price, plan.yearly_discount);
                      return (
                        <TableRow key={plan.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{plan.name}</p>
                              {plan.description && (
                                <p className="text-sm text-muted-foreground">{plan.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {plan.yearly_discount > 0 ? (
                              <p className="font-medium text-muted-foreground">{formatCurrency(origPrice)}</p>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{formatCurrency(plan.yearly_price)}</p>
                          </TableCell>
                          <TableCell>
                            {plan.monthly_price > 0 ? (
                              <p className="font-medium">{formatCurrency(plan.monthly_price)}</p>
                            ) : (
                              <Badge variant="outline" className="text-xs">سنوي فقط</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {plan.yearly_discount > 0 ? (
                              <Badge variant="outline" className="text-green-600">{plan.yearly_discount}%</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                              {plan.is_active ? 'نشط' : 'غير نشط'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" onClick={() => openPlanModal(plan)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={() => deletePlanMutation.mutate(plan.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>الخدمات الإضافية</CardTitle>
                <CardDescription>خدمات يمكن إضافتها لعروض الأسعار</CardDescription>
              </div>
              <Button onClick={() => openServiceModal()} className="gap-2">
                <Plus className="h-4 w-4" />
                إضافة خدمة
              </Button>
            </CardHeader>
            <CardContent>
              {loadingServices ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الخدمة</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>السعر</TableHead>
                      <TableHead>التصنيف</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {services.map((service) => (
                      <TableRow key={service.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{service.name}</p>
                            {service.description && (
                              <p className="text-sm text-muted-foreground">{service.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {service.service_type === 'one_time' ? 'مرة واحدة' : 'متكرر'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{formatCurrency(service.price)}</p>
                          <span className="text-sm text-muted-foreground mr-1">/ {service.unit}</span>
                        </TableCell>
                        <TableCell>{service.category || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={service.is_active ? 'default' : 'secondary'}>
                            {service.is_active ? 'نشط' : 'غير نشط'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openServiceModal(service)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => deleteServiceMutation.mutate(service.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Annual Fees Tab */}
        <TabsContent value="annual_fees">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>الرسوم السنوية</CardTitle>
                <CardDescription>بنود تشغيلية سنوية مثل الاستضافة والدعم الفني وتجديد الدومين</CardDescription>
              </div>
              <Button onClick={() => {
                setServiceForm({
                  name: '',
                  description: '',
                  service_type: 'recurring_annual',
                  price: '',
                  unit: 'سنوي',
                  category: '',
                  is_active: true,
                });
                setServiceModal({ open: true, service: null });
              }} className="gap-2">
                <Plus className="h-4 w-4" />
                إضافة رسم سنوي
              </Button>
            </CardHeader>
            <CardContent>
              {loadingAnnualFees ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>البند</TableHead>
                      <TableHead>السعر السنوي</TableHead>
                      <TableHead>التصنيف</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {annualFees.map((fee) => (
                      <TableRow key={fee.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{fee.name}</p>
                            {fee.description && (
                              <p className="text-sm text-muted-foreground">{fee.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{formatCurrency(fee.price)}</p>
                          <span className="text-sm text-muted-foreground mr-1">/ سنوي</span>
                        </TableCell>
                        <TableCell>{fee.category || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={fee.is_active ? 'default' : 'secondary'}>
                            {fee.is_active ? 'نشط' : 'غير نشط'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openServiceModal(fee)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => deleteServiceMutation.mutate(fee.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Solutions Tab */}
        <TabsContent value="solutions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>الحلول المخصصة</CardTitle>
                <CardDescription>منصات وحلول مخصصة حسب الطلب</CardDescription>
              </div>
              <Button onClick={() => openSolutionModal()} className="gap-2">
                <Plus className="h-4 w-4" />
                إضافة حل
              </Button>
            </CardHeader>
            <CardContent>
              {loadingSolutions ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الحل</TableHead>
                      <TableHead>السعر التقديري</TableHead>
                      <TableHead>ملاحظة السعر</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {solutions.map((solution) => (
                      <TableRow key={solution.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{solution.name}</p>
                            {solution.description && (
                              <p className="text-sm text-muted-foreground">{solution.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{formatCurrency(solution.base_price)}</p>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {solution.price_note || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={solution.is_active ? 'default' : 'secondary'}>
                            {solution.is_active ? 'نشط' : 'غير نشط'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openSolutionModal(solution)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => deleteSolutionMutation.mutate(solution.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Plan Modal - Simplified */}
      <Dialog open={planModal.open} onOpenChange={(open) => !open && setPlanModal({ open: false, plan: null })}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col" dir="rtl">
          <DialogHeader className="pb-2">
            <DialogTitle>{planModal.plan ? 'تعديل الخطة' : 'إضافة خطة جديدة'}</DialogTitle>
            <DialogDescription className="text-xs">إدارة تفاصيل خطة الاشتراك</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 px-1 pb-2">
            {/* Notice */}
            <div className="flex items-center gap-2 bg-muted/60 rounded-md px-3 py-2 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 shrink-0" />
              <span>جميع الأسعار شاملة ضريبة القيمة المضافة. الحسابات تتم تلقائياً حسب إعدادات النظام.</span>
            </div>

            {/* Name + Description */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">اسم الخطة *</Label>
                <Input
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  placeholder="الخطة الأساسية"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">الوصف</Label>
                <Input
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  placeholder="وصف مختصر للخطة..."
                  className="h-9"
                />
              </div>
            </div>

            {/* Single Price Input */}
            <div className="space-y-1.5">
              <Label className="text-xs">السعر السنوي النهائي (بعد الخصم) *</Label>
              <Input
                type="number"
                value={planForm.yearly_price}
                onChange={(e) => setPlanForm({ ...planForm, yearly_price: e.target.value })}
                placeholder="600"
                className="h-9"
              />
            </div>

            {/* Switches Row */}
            <div className="grid grid-cols-2 gap-3">
              {/* Annual Discount Toggle */}
              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">خصم الاشتراك السنوي</Label>
                  <Switch
                    checked={planForm.annual_discount_enabled}
                    onCheckedChange={(checked) => setPlanForm({ ...planForm, annual_discount_enabled: checked })}
                    className="scale-90"
                  />
                </div>
                {planForm.annual_discount_enabled && (
                  <div className="relative">
                    <Input
                      type="number"
                      value={planForm.yearly_discount}
                      onChange={(e) => setPlanForm({ ...planForm, yearly_discount: e.target.value })}
                      placeholder="10"
                      min="0"
                      max="99"
                      className="h-8 text-sm pe-7"
                    />
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                )}
                {planForm.annual_discount_enabled && (parseFloat(planForm.yearly_price) || 0) > 0 && (parseInt(planForm.yearly_discount) || 0) > 0 && (() => {
                  const yp = parseFloat(planForm.yearly_price) || 0;
                  const disc = parseInt(planForm.yearly_discount) || 0;
                  const orig = calcOriginalPrice(yp, disc);
                  const saved = +(orig - yp).toFixed(2);
                  return (
                    <div className="bg-muted/50 rounded p-2 space-y-0.5 text-[11px]">
                      <p className="text-muted-foreground">السعر الأصلي: <span className="font-medium text-foreground">{formatCurrency(orig)}</span></p>
                      <p className="text-green-600">الخصم: -{formatCurrency(saved)} ({disc}%)</p>
                      <p className="text-muted-foreground">النهائي: <span className="font-bold text-foreground">{formatCurrency(yp)}</span></p>
                    </div>
                  );
                })()}
              </div>

              {/* Monthly Subscription Toggle */}
              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">تفعيل الاشتراك الشهري</Label>
                  <Switch
                    checked={planForm.monthly_enabled}
                    onCheckedChange={(checked) => setPlanForm({ ...planForm, monthly_enabled: checked })}
                    className="scale-90"
                  />
                </div>
                {planForm.monthly_enabled && (parseFloat(planForm.yearly_price) || 0) > 0 && (() => {
                  const yp = parseFloat(planForm.yearly_price) || 0;
                  const disc = planForm.annual_discount_enabled ? (parseInt(planForm.yearly_discount) || 0) : 0;
                  const orig = calcOriginalPrice(yp, disc);
                  const monthly = calcMonthlyPrice(orig);
                  return (
                    <div className="bg-muted/50 rounded p-2 space-y-0.5 text-[11px]">
                      <p className="text-muted-foreground">محسوب من السعر الأصلي ({formatCurrency(orig)} ÷ 12)</p>
                      <p className="font-bold text-foreground text-sm">{formatCurrency(monthly)} <span className="text-[11px] font-normal text-muted-foreground">/ شهر</span></p>
                    </div>
                  );
                })()}
                {!planForm.monthly_enabled && (
                  <p className="text-[11px] text-muted-foreground">الخطة ستكون سنوية فقط</p>
                )}
              </div>
            </div>

            {/* Features + Status */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">المميزات (سطر لكل ميزة)</Label>
                <Textarea
                  value={planForm.features}
                  onChange={(e) => setPlanForm({ ...planForm, features: e.target.value })}
                  placeholder="5 مستخدمين&#10;دعم فني أساسي&#10;تقارير شهرية"
                  rows={3}
                  className="text-sm"
                />
              </div>
              <div className="flex flex-col justify-end gap-2">
                <div className="flex items-center gap-2 border rounded-lg p-3">
                  <Switch
                    checked={planForm.is_active}
                    onCheckedChange={(checked) => setPlanForm({ ...planForm, is_active: checked })}
                  />
                  <Label className="text-xs">خطة نشطة</Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="border-t pt-3 mt-0">
            <Button variant="outline" onClick={() => setPlanModal({ open: false, plan: null })}>
              إلغاء
            </Button>
            <Button onClick={handleSavePlan} disabled={savePlanMutation.isPending || !planForm.name}>
              {savePlanMutation.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Service Modal - Simplified (no TaxBreakdown) */}
      <Dialog open={serviceModal.open} onOpenChange={(open) => !open && setServiceModal({ open: false, service: null })}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>{serviceModal.service ? 'تعديل الخدمة' : 'إضافة خدمة جديدة'}</DialogTitle>
            <DialogDescription>أدخل تفاصيل الخدمة</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>اسم الخدمة *</Label>
              <Input
                value={serviceForm.name}
                onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                placeholder="تدريب الفريق"
              />
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea
                value={serviceForm.description}
                onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                placeholder="وصف الخدمة..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>نوع الخدمة</Label>
                <Select
                  value={serviceForm.service_type}
                  onValueChange={(value) => setServiceForm({ ...serviceForm, service_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">مرة واحدة</SelectItem>
                    <SelectItem value="recurring">متكررة</SelectItem>
                    <SelectItem value="recurring_annual">رسوم سنوية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>التصنيف</Label>
                <Input
                  value={serviceForm.category}
                  onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}
                  placeholder="تدريب"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>السعر *</Label>
                <Input
                  type="number"
                  value={serviceForm.price}
                  onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                  placeholder="500"
                />
              </div>
              <div className="space-y-2">
                <Label>الوحدة</Label>
                <Select
                  value={serviceForm.unit}
                  onValueChange={(value) => setServiceForm({ ...serviceForm, unit: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="مرة واحدة">مرة واحدة</SelectItem>
                    <SelectItem value="شهري">شهري</SelectItem>
                    <SelectItem value="سنوي">سنوي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={serviceForm.is_active}
                onCheckedChange={(checked) => setServiceForm({ ...serviceForm, is_active: checked })}
              />
              <Label>خدمة نشطة</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setServiceModal({ open: false, service: null })}>
              إلغاء
            </Button>
            <Button onClick={handleSaveService} disabled={saveServiceMutation.isPending || !serviceForm.name}>
              {saveServiceMutation.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Solution Modal - Simplified (no TaxBreakdown) */}
      <Dialog open={solutionModal.open} onOpenChange={(open) => !open && setSolutionModal({ open: false, solution: null })}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>{solutionModal.solution ? 'تعديل الحل' : 'إضافة حل جديد'}</DialogTitle>
            <DialogDescription>أدخل تفاصيل الحل المخصص</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>اسم الحل *</Label>
              <Input
                value={solutionForm.name}
                onChange={(e) => setSolutionForm({ ...solutionForm, name: e.target.value })}
                placeholder="منصة تعليمية مخصصة"
              />
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea
                value={solutionForm.description}
                onChange={(e) => setSolutionForm({ ...solutionForm, description: e.target.value })}
                placeholder="وصف الحل..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>السعر التقديري</Label>
              <Input
                type="number"
                value={solutionForm.base_price}
                onChange={(e) => setSolutionForm({ ...solutionForm, base_price: e.target.value })}
                placeholder="50000"
              />
            </div>
            <div className="space-y-2">
              <Label>ملاحظة على السعر</Label>
              <Input
                value={solutionForm.price_note}
                onChange={(e) => setSolutionForm({ ...solutionForm, price_note: e.target.value })}
                placeholder="السعر يبدأ من ويعتمد على المتطلبات"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={solutionForm.is_active}
                onCheckedChange={(checked) => setSolutionForm({ ...solutionForm, is_active: checked })}
              />
              <Label>حل نشط</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSolutionModal({ open: false, solution: null })}>
              إلغاء
            </Button>
            <Button onClick={handleSaveSolution} disabled={saveSolutionMutation.isPending || !solutionForm.name}>
              {saveSolutionMutation.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
