import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Filter, Plus, Trash2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface FilterRule {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface AudienceBuilderProps {
  audienceType: 'segment' | 'manual';
  onAudienceTypeChange: (type: 'segment' | 'manual') => void;
  filters: any;
  onFiltersChange: (filters: any) => void;
  selectedOrgIds: string[];
  onSelectedOrgIdsChange: (ids: string[]) => void;
  matchCount: number;
  onMatchCountChange: (count: number) => void;
}

const fieldOptions = [
  { value: 'subscription_status', label: 'حالة الاشتراك' },
  { value: 'subscription_plan', label: 'نوع الباقة' },
  { value: 'city', label: 'المدينة' },
  { value: 'remaining_days', label: 'الأيام المتبقية' },
  { value: 'is_active', label: 'الحالة (نشط/معطل)' },
];

const operatorOptions: Record<string, { value: string; label: string }[]> = {
  subscription_status: [
    { value: 'eq', label: 'يساوي' },
    { value: 'neq', label: 'لا يساوي' },
  ],
  subscription_plan: [
    { value: 'eq', label: 'يساوي' },
    { value: 'neq', label: 'لا يساوي' },
  ],
  city: [
    { value: 'eq', label: 'يساوي' },
    { value: 'neq', label: 'لا يساوي' },
  ],
  remaining_days: [
    { value: 'lt', label: 'أقل من' },
    { value: 'lte', label: 'أقل من أو يساوي' },
    { value: 'gt', label: 'أكبر من' },
    { value: 'gte', label: 'أكبر من أو يساوي' },
  ],
  is_active: [
    { value: 'eq', label: 'يساوي' },
  ],
};

export default function AudienceBuilder({
  audienceType, onAudienceTypeChange,
  filters, onFiltersChange,
  selectedOrgIds, onSelectedOrgIdsChange,
  matchCount, onMatchCountChange,
}: AudienceBuilderProps) {
  const [rules, setRules] = useState<FilterRule[]>(filters?.rules || []);
  const [logicOperator, setLogicOperator] = useState<'and' | 'or'>(filters?.logic || 'and');
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    if (audienceType === 'segment') {
      onFiltersChange({ rules, logic: logicOperator });
      previewCount();
    }
  }, [rules, logicOperator, audienceType]);

  const fetchOrganizations = async () => {
    const { data } = await supabase
      .from('client_organizations')
      .select('id, name, contact_email, subscription_status, subscription_plan, city')
      .order('name');
    setOrganizations(data || []);
  };

  const previewCount = async () => {
    if (rules.length === 0) {
      onMatchCountChange(0);
      return;
    }
    setLoading(true);
    try {
      let query = supabase.from('client_organizations').select('id', { count: 'exact', head: true }) as any;
      
      for (const rule of rules) {
        if (rule.field === 'remaining_days') {
          continue;
        }
        if (rule.field === 'is_active') {
          query = query.eq('is_active', rule.value === 'true');
        } else if (rule.operator === 'eq') {
          query = query.eq(rule.field, rule.value);
        } else if (rule.operator === 'neq') {
          query = query.neq(rule.field, rule.value);
        }
      }

      const { count } = await query;
      onMatchCountChange(count || 0);
    } catch {
      onMatchCountChange(0);
    }
    setLoading(false);
  };

  const addRule = () => {
    setRules([...rules, { id: crypto.randomUUID(), field: 'subscription_status', operator: 'eq', value: '' }]);
  };

  const removeRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
  };

  const updateRule = (id: string, updates: Partial<FilterRule>) => {
    setRules(rules.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const filteredOrgs = organizations.filter(o =>
    o.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.contact_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleOrg = (orgId: string) => {
    if (selectedOrgIds.includes(orgId)) {
      onSelectedOrgIdsChange(selectedOrgIds.filter(id => id !== orgId));
    } else {
      onSelectedOrgIdsChange([...selectedOrgIds, orgId]);
    }
  };

  const selectAll = () => {
    onSelectedOrgIdsChange(filteredOrgs.map(o => o.id));
  };

  const deselectAll = () => {
    onSelectedOrgIdsChange([]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          منشئ الجمهور
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={audienceType} onValueChange={(v) => onAudienceTypeChange(v as 'segment' | 'manual')}>
          <TabsList className="w-full">
            <TabsTrigger value="segment" className="flex-1">استهداف تلقائي بشروط</TabsTrigger>
            <TabsTrigger value="manual" className="flex-1">اختيار يدوي</TabsTrigger>
          </TabsList>

          <TabsContent value="segment" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label>العلاقة بين الشروط:</Label>
                <Select value={logicOperator} onValueChange={(v) => setLogicOperator(v as 'and' | 'or')}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="and">AND</SelectItem>
                    <SelectItem value="or">OR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" onClick={addRule} className="gap-2">
                <Plus className="h-4 w-4" /> إضافة شرط
              </Button>
            </div>

            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                <Select value={rule.field} onValueChange={(v) => updateRule(rule.id, { field: v, operator: 'eq', value: '' })}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="اختر الحقل" />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldOptions.map(f => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={rule.operator} onValueChange={(v) => updateRule(rule.id, { operator: v })}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(operatorOptions[rule.field] || []).map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {rule.field === 'subscription_status' ? (
                  <Select value={rule.value} onValueChange={(v) => updateRule(rule.id, { value: v })}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="اختر القيمة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">نشط</SelectItem>
                      <SelectItem value="trial">تجريبي</SelectItem>
                      <SelectItem value="expired">منتهي</SelectItem>
                      <SelectItem value="suspended">معطل</SelectItem>
                      <SelectItem value="pending">معلق</SelectItem>
                    </SelectContent>
                  </Select>
                ) : rule.field === 'is_active' ? (
                  <Select value={rule.value} onValueChange={(v) => updateRule(rule.id, { value: v })}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="اختر" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">نشط</SelectItem>
                      <SelectItem value="false">معطل</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={rule.value}
                    onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                    placeholder="القيمة"
                    className="flex-1"
                  />
                )}

                <Button variant="ghost" size="icon" onClick={() => removeRule(rule.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}

            {rules.length > 0 && (
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 flex items-center gap-3">
                <Filter className="h-5 w-5 text-primary" />
                <span className="font-medium">
                  {loading ? 'جاري الحساب...' : `${matchCount} منظمة مطابقة`}
                </span>
              </div>
            )}
          </TabsContent>

          <TabsContent value="manual" className="space-y-4 mt-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="بحث عن منظمة..."
                  className="pr-10"
                />
              </div>
              <Button variant="outline" size="sm" onClick={selectAll}>تحديد الكل</Button>
              <Button variant="outline" size="sm" onClick={deselectAll}>إلغاء الكل</Button>
            </div>

            <Badge variant="secondary">{selectedOrgIds.length} منظمة محددة</Badge>

            <ScrollArea className="h-64 border rounded-lg">
              <div className="p-2 space-y-1">
                {filteredOrgs.map((org) => (
                  <div
                    key={org.id}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                    onClick={() => toggleOrg(org.id)}
                  >
                    <Checkbox checked={selectedOrgIds.includes(org.id)} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{org.name}</p>
                      <p className="text-xs text-muted-foreground">{org.contact_email}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {org.subscription_status === 'active' ? 'نشط' : org.subscription_status}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
