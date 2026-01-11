import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Loader2, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface SearchLog {
  id: string;
  query: string;
  results_count: number;
  created_at: string;
}

interface TopSearch {
  query: string;
  count: number;
}

export default function SearchLogsPage() {
  const [logs, setLogs] = useState<SearchLog[]>([]);
  const [topSearches, setTopSearches] = useState<TopSearch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSearchLogs();
  }, []);

  const fetchSearchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('docs_search_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);

      // Calculate top searches
      const searchCounts: { [key: string]: number } = {};
      (data || []).forEach((log) => {
        const query = log.query.toLowerCase().trim();
        searchCounts[query] = (searchCounts[query] || 0) + 1;
      });

      const topSearchesList = Object.entries(searchCounts)
        .map(([query, count]) => ({ query, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setTopSearches(topSearchesList);
    } catch (error) {
      console.error('Error fetching search logs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const noResultsSearches = logs.filter((l) => l.results_count === 0).length;
  const avgResults = logs.length > 0
    ? Math.round(logs.reduce((sum, l) => sum + l.results_count, 0) / logs.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">سجل البحث</h1>
        <p className="text-muted-foreground">
          تتبع عمليات البحث في الدليل
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">إجمالي عمليات البحث</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">متوسط النتائج</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgResults}</div>
            <p className="text-xs text-muted-foreground">لكل بحث</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">بحث بدون نتائج</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{noResultsSearches}</div>
            <p className="text-xs text-muted-foreground">
              يحتاج محتوى إضافي
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top Searches */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              الأكثر بحثاً
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topSearches.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                لا توجد عمليات بحث
              </p>
            ) : (
              <div className="space-y-3">
                {topSearches.map((search, index) => (
                  <div key={search.query} className="flex items-center gap-3">
                    <Badge variant="outline" className="w-6 h-6 flex items-center justify-center text-xs">
                      {index + 1}
                    </Badge>
                    <span className="flex-1 text-sm truncate">{search.query}</span>
                    <Badge variant="secondary" className="text-xs">
                      {search.count}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Searches */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>آخر عمليات البحث</CardTitle>
            <CardDescription>آخر 100 عملية بحث</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {logs.length === 0 ? (
              <div className="text-center py-12">
                <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">لا توجد عمليات بحث</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>كلمة البحث</TableHead>
                    <TableHead>النتائج</TableHead>
                    <TableHead>التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.slice(0, 20).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.query}</TableCell>
                      <TableCell>
                        {log.results_count === 0 ? (
                          <Badge variant="outline" className="text-orange-600">
                            لا نتائج
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">
                            {log.results_count} نتيجة
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(log.created_at), 'dd MMM yyyy HH:mm', { locale: ar })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
