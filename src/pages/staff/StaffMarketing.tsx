import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Palette, Send, CheckCircle2, Clock, Megaphone } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const statusLabels: Record<string, string> = {
  draft: 'مسودة', waiting_design: 'بانتظار التصميم', in_design: 'قيد التصميم',
  design_done: 'تم التصميم', ready: 'جاهز للنشر', published: 'تم النشر'
};
const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800', waiting_design: 'bg-purple-100 text-purple-800',
  in_design: 'bg-orange-100 text-orange-800', design_done: 'bg-cyan-100 text-cyan-800',
  ready: 'bg-blue-100 text-blue-800', published: 'bg-green-100 text-green-800'
};

export default function StaffMarketing() {
  const { permissions } = useStaffAuth();
  const staffId = permissions.staffId;
  const [designTasks, setDesignTasks] = useState<any[]>([]);
  const [publishTasks, setPublishTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (staffId) fetchTasks();
  }, [staffId]);

  const fetchTasks = async () => {
    setLoading(true);
    const [designRes, publishRes] = await Promise.all([
      supabase.from('content_calendar').select('*').eq('designer_id', staffId).order('publish_date') as any,
      supabase.from('content_calendar').select('*').eq('publisher_id', staffId).in('status', ['design_done', 'ready']).order('publish_date') as any,
    ]);
    setDesignTasks(designRes.data || []);
    setPublishTasks(publishRes.data || []);
    setLoading(false);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdating(id);
    const { error } = await (supabase.from('content_calendar').update({ status: newStatus }).eq('id', id) as any);
    if (error) { toast.error('فشل تحديث الحالة'); }
    else { toast.success('تم تحديث الحالة'); fetchTasks(); }
    setUpdating(null);
  };

  const updateDesignUrl = async (id: string, url: string) => {
    const { error } = await (supabase.from('content_calendar').update({ design_file_url: url }).eq('id', id) as any);
    if (error) toast.error('فشل الحفظ');
    else toast.success('تم حفظ رابط التصميم');
  };

  const inProgressCount = designTasks.filter(t => ['waiting_design', 'in_design'].includes(t.status)).length;
  const awaitingPublish = publishTasks.length;
  const publishedThisWeek = [...designTasks, ...publishTasks].filter(t => {
    if (t.status !== 'published') return false;
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(t.updated_at) >= weekAgo;
  }).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Megaphone className="h-7 w-7 text-primary" />
          إدارة التسويق
        </h1>
        <p className="text-muted-foreground mt-1">مهام التصميم والنشر المسندة إليك</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <Clock className="h-5 w-5 text-orange-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inProgressCount}</p>
                <p className="text-xs text-muted-foreground">قيد التنفيذ</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Send className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{awaitingPublish}</p>
                <p className="text-xs text-muted-foreground">بانتظار النشر</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle2 className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{publishedThisWeek}</p>
                <p className="text-xs text-muted-foreground">تم النشر هذا الأسبوع</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks */}
      <Tabs defaultValue="design">
        <TabsList>
          <TabsTrigger value="design" className="gap-2">
            <Palette className="h-4 w-4" />
            مهام التصميم ({designTasks.length})
          </TabsTrigger>
          <TabsTrigger value="publish" className="gap-2">
            <Send className="h-4 w-4" />
            مهام النشر ({publishTasks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="design" className="space-y-3">
          {designTasks.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">لا توجد مهام تصميم مسندة إليك</CardContent></Card>
          ) : designTasks.map(task => (
            <Card key={task.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{task.title}</h3>
                      <Badge className={cn('text-xs', statusColors[task.status])}>{statusLabels[task.status]}</Badge>
                    </div>
                    {task.channels?.length > 0 && (
                      <div className="flex gap-1">
                        {task.channels.map((ch: string) => <Badge key={ch} variant="secondary" className="text-xs">{ch}</Badge>)}
                      </div>
                    )}
                    {task.publish_date && <p className="text-xs text-muted-foreground">📅 {task.publish_date}</p>}
                    {task.design_notes && <p className="text-xs text-muted-foreground">📝 {task.design_notes}</p>}
                    {task.design_text && <p className="text-xs bg-muted/50 p-2 rounded">{task.design_text}</p>}

                    {/* Design URL input */}
                    <div className="flex gap-2 items-center">
                      <Input
                        placeholder="رابط التصميم..."
                        defaultValue={task.design_file_url || ''}
                        dir="ltr"
                        className="h-8 text-sm"
                        onBlur={(e) => {
                          if (e.target.value !== (task.design_file_url || '')) {
                            updateDesignUrl(task.id, e.target.value);
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Status actions */}
                  <div className="flex flex-col gap-1.5 min-w-[120px]">
                    {task.status === 'waiting_design' && (
                      <Button size="sm" variant="outline" className="text-xs" disabled={updating === task.id}
                        onClick={() => updateStatus(task.id, 'in_design')}>
                        {updating === task.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'بدء التصميم'}
                      </Button>
                    )}
                    {task.status === 'in_design' && (
                      <Button size="sm" className="text-xs" disabled={updating === task.id}
                        onClick={() => updateStatus(task.id, 'design_done')}>
                        {updating === task.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'تم التصميم ✓'}
                      </Button>
                    )}
                    {task.status === 'draft' && (
                      <span className="text-xs text-muted-foreground text-center">مسودة</span>
                    )}
                    {task.status === 'design_done' && (
                      <span className="text-xs text-green-600 text-center">✓ مكتمل</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="publish" className="space-y-3">
          {publishTasks.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">لا توجد مهام نشر مسندة إليك</CardContent></Card>
          ) : publishTasks.map(task => (
            <Card key={task.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{task.title}</h3>
                      <Badge className={cn('text-xs', statusColors[task.status])}>{statusLabels[task.status]}</Badge>
                    </div>
                    {task.channels?.length > 0 && (
                      <div className="flex gap-1">
                        {task.channels.map((ch: string) => <Badge key={ch} variant="secondary" className="text-xs">{ch}</Badge>)}
                      </div>
                    )}
                    {task.publish_date && <p className="text-xs text-muted-foreground">📅 {task.publish_date}</p>}
                    {task.post_text && <p className="text-xs bg-muted/50 p-2 rounded line-clamp-2">{task.post_text}</p>}
                    {task.design_file_url && (
                      <a href={task.design_file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
                        🎨 عرض التصميم
                      </a>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5 min-w-[120px]">
                    {(task.status === 'design_done' || task.status === 'ready') && (
                      <Button size="sm" className="text-xs" disabled={updating === task.id}
                        onClick={() => updateStatus(task.id, 'published')}>
                        {updating === task.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'تم النشر ✓'}
                      </Button>
                    )}
                    {task.status === 'published' && (
                      <span className="text-xs text-green-600 text-center">✓ تم النشر</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
