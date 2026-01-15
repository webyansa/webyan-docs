import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  MessageSquare, Plus, Edit2, Trash2, Search, Loader2, 
  Save, Tag, Users, User, Globe, Zap, Copy
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickReply {
  id: string;
  title: string;
  body: string;
  shortcut: string | null;
  is_global: boolean;
  staff_id: string | null;
  staff?: { full_name: string } | null;
  created_at: string;
}

interface StaffMember {
  id: string;
  full_name: string;
}

export default function QuickRepliesPage() {
  const { toast } = useToast();
  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'global' | 'personal'>('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editingReply, setEditingReply] = useState<QuickReply | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    shortcut: '',
    is_global: true,
    staff_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [repliesRes, staffRes] = await Promise.all([
        supabase
          .from('quick_replies')
          .select('*, staff:staff_members(full_name)')
          .order('title'),
        supabase
          .from('staff_members')
          .select('id, full_name')
          .eq('is_active', true)
          .order('full_name')
      ]);

      if (repliesRes.data) setReplies(repliesRes.data as QuickReply[]);
      if (staffRes.data) setStaffMembers(staffRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (reply?: QuickReply) => {
    if (reply) {
      setEditingReply(reply);
      setFormData({
        title: reply.title,
        body: reply.body,
        shortcut: reply.shortcut || '',
        is_global: reply.is_global,
        staff_id: reply.staff_id || ''
      });
    } else {
      setEditingReply(null);
      setFormData({
        title: '',
        body: '',
        shortcut: '',
        is_global: true,
        staff_id: ''
      });
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.body.trim()) {
      toast({
        title: 'خطأ',
        description: 'يرجى ملء العنوان والنص',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: formData.title.trim(),
        body: formData.body.trim(),
        shortcut: formData.shortcut.trim() || null,
        is_global: formData.is_global,
        staff_id: formData.is_global ? null : (formData.staff_id || null)
      };

      if (editingReply) {
        const { error } = await supabase
          .from('quick_replies')
          .update(payload)
          .eq('id', editingReply.id);
        if (error) throw error;
        toast({ title: 'تم', description: 'تم تحديث الرد السريع' });
      } else {
        const { error } = await supabase
          .from('quick_replies')
          .insert(payload);
        if (error) throw error;
        toast({ title: 'تم', description: 'تم إنشاء الرد السريع' });
      }

      setShowDialog(false);
      fetchData();
    } catch (error) {
      console.error('Error saving reply:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في حفظ الرد السريع',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الرد السريع؟')) return;

    try {
      const { error } = await supabase
        .from('quick_replies')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'تم', description: 'تم حذف الرد السريع' });
      fetchData();
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في حذف الرد',
        variant: 'destructive'
      });
    }
  };

  const handleCopy = async (body: string) => {
    await navigator.clipboard.writeText(body);
    toast({ title: 'تم النسخ', description: 'تم نسخ النص للحافظة' });
  };

  const filteredReplies = replies.filter(reply => {
    const matchesSearch = !searchQuery || 
      reply.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reply.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (reply.shortcut && reply.shortcut.includes(searchQuery));
    
    const matchesFilter = filter === 'all' || 
      (filter === 'global' && reply.is_global) ||
      (filter === 'personal' && !reply.is_global);

    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6" />
            الردود السريعة
          </h1>
          <p className="text-muted-foreground">إدارة قوالب الردود الجاهزة للمحادثات</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          إضافة رد سريع
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{replies.length}</p>
              <p className="text-sm text-muted-foreground">إجمالي الردود</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Globe className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{replies.filter(r => r.is_global).length}</p>
              <p className="text-sm text-muted-foreground">ردود عامة</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{replies.filter(r => !r.is_global).length}</p>
              <p className="text-sm text-muted-foreground">ردود خاصة</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث في الردود..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9"
              />
            </div>
            <div className="flex gap-2">
              {[
                { key: 'all', label: 'الكل', icon: MessageSquare },
                { key: 'global', label: 'عامة', icon: Globe },
                { key: 'personal', label: 'خاصة', icon: User }
              ].map(({ key, label, icon: Icon }) => (
                <Button
                  key={key}
                  variant={filter === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(key as typeof filter)}
                  className="gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Replies List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredReplies.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>لا توجد ردود سريعة</p>
          </div>
        ) : (
          filteredReplies.map((reply) => (
            <Card key={reply.id} className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-semibold truncate">
                      {reply.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={reply.is_global ? 'default' : 'secondary'} className="text-[10px]">
                        {reply.is_global ? (
                          <>
                            <Globe className="h-3 w-3 ml-1" />
                            عام
                          </>
                        ) : (
                          <>
                            <User className="h-3 w-3 ml-1" />
                            {reply.staff?.full_name || 'خاص'}
                          </>
                        )}
                      </Badge>
                      {reply.shortcut && (
                        <Badge variant="outline" className="text-[10px] font-mono">
                          /{reply.shortcut}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleCopy(reply.body)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleOpenDialog(reply)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(reply.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-line">
                  {reply.body}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingReply ? 'تعديل الرد السريع' : 'إضافة رد سريع جديد'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>العنوان *</Label>
              <Input
                placeholder="مثال: ترحيب بالعميل"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>النص *</Label>
              <Textarea
                placeholder="اكتب نص الرد السريع هنا..."
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>الاختصار (اختياري)</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">/</span>
                <Input
                  placeholder="welcome"
                  value={formData.shortcut}
                  onChange={(e) => setFormData({ ...formData, shortcut: e.target.value.replace(/\s/g, '') })}
                  className="font-mono"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                اكتب /{formData.shortcut || 'shortcut'} في نافذة الدردشة لاستخدام هذا الرد
              </p>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-primary" />
                <div>
                  <Label className="text-sm font-medium">رد عام</Label>
                  <p className="text-xs text-muted-foreground">متاح لجميع الموظفين</p>
                </div>
              </div>
              <Switch
                checked={formData.is_global}
                onCheckedChange={(checked) => setFormData({ ...formData, is_global: checked })}
              />
            </div>

            {!formData.is_global && (
              <div className="space-y-2">
                <Label>تخصيص لموظف</Label>
                <Select
                  value={formData.staff_id}
                  onValueChange={(value) => setFormData({ ...formData, staff_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الموظف" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffMembers.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              ) : (
                <Save className="h-4 w-4 ml-2" />
              )}
              {editingReply ? 'تحديث' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
