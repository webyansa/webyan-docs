import { useState } from "react";
import { ThumbsUp, ThumbsDown, Send, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface FeedbackWidgetProps {
  articleId: string;
  className?: string;
}

export function FeedbackWidget({ articleId, className }: FeedbackWidgetProps) {
  const [feedback, setFeedback] = useState<"helpful" | "not-helpful" | null>(null);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleFeedback = (value: "helpful" | "not-helpful") => {
    setFeedback(value);
    if (value === "not-helpful") {
      setShowComment(true);
    } else {
      // Submit positive feedback
      submitFeedback(value, "");
    }
  };

  const submitFeedback = (type: "helpful" | "not-helpful", text: string) => {
    // In a real app, this would send to the backend
    console.log("Feedback submitted:", { articleId, type, comment: text });
    setSubmitted(true);
  };

  const handleSubmitComment = () => {
    submitFeedback("not-helpful", comment);
  };

  if (submitted) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-4 rounded-xl bg-success/10 border border-success/20",
          className
        )}
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-success/20">
          <Check className="h-5 w-5 text-success" />
        </div>
        <div>
          <p className="font-medium text-success">شكراً لملاحظاتك!</p>
          <p className="text-sm text-muted-foreground">
            سنستخدم رأيك لتحسين جودة الدليل.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "p-6 rounded-xl border bg-card",
        className
      )}
    >
      <p className="text-lg font-semibold mb-4">هل أفادك هذا الشرح؟</p>

      {!feedback ? (
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={() => handleFeedback("helpful")}
            className="flex-1 gap-2 hover:bg-success/10 hover:text-success hover:border-success"
          >
            <ThumbsUp className="h-5 w-5" />
            نعم، أفادني
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => handleFeedback("not-helpful")}
            className="flex-1 gap-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
          >
            <ThumbsDown className="h-5 w-5" />
            لا، لم يفدني
          </Button>
        </div>
      ) : showComment ? (
        <div className="space-y-4 animate-fade-in">
          <p className="text-sm text-muted-foreground">
            نأسف لذلك! ساعدنا في تحسين الشرح بإخبارنا ما الذي يمكننا تحسينه:
          </p>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="ما الذي يمكننا تحسينه؟ (اختياري)"
            className="min-h-[100px]"
          />
          <div className="flex gap-2">
            <Button onClick={handleSubmitComment} className="gap-2">
              <Send className="h-4 w-4" />
              إرسال
            </Button>
            <Button
              variant="ghost"
              onClick={() => submitFeedback("not-helpful", "")}
            >
              تخطي
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
