import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Image, Upload, Search, Loader2, FolderOpen } from 'lucide-react';

export default function MediaPage() {
  const [loading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">الوسائط</h1>
          <p className="text-muted-foreground">
            إدارة الصور والملفات المرفقة بالمقالات
          </p>
        </div>
        <Button className="gap-2">
          <Upload className="h-4 w-4" />
          رفع ملف جديد
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">البحث</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث في الوسائط..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Media Grid */}
      <Card>
        <CardHeader>
          <CardTitle>جميع الوسائط</CardTitle>
          <CardDescription>0 ملف</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="text-center py-12">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">لا توجد ملفات وسائط بعد</p>
              <p className="text-sm text-muted-foreground mt-2">
                ارفع صوراً جديدة لاستخدامها في المقالات
              </p>
              <Button className="mt-4 gap-2">
                <Upload className="h-4 w-4" />
                رفع أول ملف
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
