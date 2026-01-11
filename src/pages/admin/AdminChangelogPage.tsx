import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, History, Loader2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface ChangelogEntry {
  id: string;
  version: string;
  title: string;
  description: string | null;
  changes: { type: string; text: string }[];
  impact: string | null;
  published_at: string;
}

export default function AdminChangelogPage() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChangelog();
  }, []);

  const fetchChangelog = async () => {
    try {
      const { data, error } = await supabase
        .from('docs_changelog')
        .select('*')
        .order('published_at', { ascending: false });

      if (error) throw error;
      
      const typedData = (data || []).map(item => ({
        ...item,
        changes: (item.changes as { type: string; text: string }[]) || []
      }));
      
      setEntries(typedData);
    } catch (error) {
      console.error('Error fetching changelog:', error);
    } finally {
      setLoading(false);
    }
  };

  const getImpactBadge = (impact: string | null) => {
    switch (impact) {
      case 'major':
        return <Badge className="bg-red-100 text-red-700">تأثير كبير</Badge>;
      case 'minor':
        return <Badge className="bg-yellow-100 text-yellow-700">تأثير متوسط</Badge>;
      case 'patch':
        return <Badge className="bg-green-100 text-green-700">تحسينات بسيطة</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">سجل التحديثات</h1>
          <p className="text-muted-foreground">
            توثيق تحديثات لوحة التحكم والدليل
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          إضافة تحديث
        </Button>
      </div>

      {/* Changelog List */}
      <Card>
        <CardHeader>
          <CardTitle>جميع التحديثات</CardTitle>
          <CardDescription>{entries.length} تحديث</CardDescription>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">لا توجد تحديثات مسجلة بعد</p>
              <Button className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                إضافة أول تحديث
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{entry.version}</Badge>
                        {getImpactBadge(entry.impact)}
                      </div>
                      <h3 className="font-semibold mb-1">{entry.title}</h3>
                      {entry.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {entry.description}
                        </p>
                      )}
                      {entry.changes.length > 0 && (
                        <ul className="text-sm text-muted-foreground list-disc list-inside">
                          {entry.changes.slice(0, 3).map((change, i) => (
                            <li key={i}>{change.text}</li>
                          ))}
                          {entry.changes.length > 3 && (
                            <li className="text-primary">
                              +{entry.changes.length - 3} تغييرات أخرى
                            </li>
                          )}
                        </ul>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(entry.published_at), 'dd MMM yyyy', { locale: ar })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
