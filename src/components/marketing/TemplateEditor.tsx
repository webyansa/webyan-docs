import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VariableInserter from './VariableInserter';

interface TemplateEditorProps {
  subject: string;
  onSubjectChange: (subject: string) => void;
  htmlBody: string;
  onHtmlBodyChange: (html: string) => void;
}

export default function TemplateEditor({ subject, onSubjectChange, htmlBody, onHtmlBodyChange }: TemplateEditorProps) {
  const [activeTab, setActiveTab] = useState('editor');

  const handleInsertVariable = (variable: string) => {
    onHtmlBodyChange(htmlBody + variable);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>محرر القالب</CardTitle>
          <VariableInserter onInsert={handleInsertVariable} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>عنوان البريد (Subject)</Label>
          <Input
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            placeholder="أدخل عنوان البريد..."
            dir="rtl"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="editor">محرر HTML</TabsTrigger>
            <TabsTrigger value="preview">معاينة</TabsTrigger>
          </TabsList>

          <TabsContent value="editor">
            <Textarea
              value={htmlBody}
              onChange={(e) => onHtmlBodyChange(e.target.value)}
              placeholder="أدخل محتوى HTML هنا..."
              className="min-h-[400px] font-mono text-sm"
              dir="ltr"
            />
          </TabsContent>

          <TabsContent value="preview">
            <div className="border rounded-lg p-4 min-h-[400px] bg-white">
              <div dangerouslySetInnerHTML={{ __html: htmlBody }} />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
