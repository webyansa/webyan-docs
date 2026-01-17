import { useNavigate, useSearchParams } from "react-router-dom";
import { ShieldX, ArrowRight, Home, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const UnauthorizedPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Get the attempted portal from URL params
  const attemptedPortal = searchParams.get("portal") || "unknown";
  const returnUrl = searchParams.get("returnUrl");

  // Define safe return links based on attempted portal
  const getPortalInfo = () => {
    switch (attemptedPortal) {
      case "admin":
        return {
          title: "لوحة التحكم",
          loginPath: "/admin/login",
          description: "ليس لديك صلاحية للوصول إلى لوحة التحكم. يجب أن تكون مسؤولاً للدخول."
        };
      case "staff":
      case "support":
        return {
          title: "بوابة الدعم الفني",
          loginPath: "/support/login",
          description: "ليس لديك صلاحية للوصول إلى بوابة الدعم الفني. يجب أن تكون عضو فريق دعم للدخول."
        };
      case "portal":
      case "client":
        return {
          title: "بوابة العملاء",
          loginPath: "/portal/login",
          description: "ليس لديك صلاحية للوصول إلى بوابة العملاء. يجب أن يكون لديك حساب عميل للدخول."
        };
      default:
        return {
          title: "هذه الصفحة",
          loginPath: "/",
          description: "ليس لديك صلاحية للوصول إلى هذه الصفحة."
        };
    }
  };

  const portalInfo = getPortalInfo();

  const handleGoHome = () => {
    navigate("/");
  };

  const handleGoToLogin = () => {
    const path = returnUrl 
      ? `${portalInfo.loginPath}?returnUrl=${encodeURIComponent(returnUrl)}`
      : portalInfo.loginPath;
    navigate(path);
  };

  const handleGoBack = () => {
    // Safe navigation - go back only if there's history, otherwise go home
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-muted/30 to-background"
      dir="rtl"
    >
      <Card className="w-full max-w-md text-center shadow-lg border-destructive/20">
        <CardHeader className="space-y-4 pb-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldX className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold text-destructive">
            غير مصرح بالدخول
          </CardTitle>
          <CardDescription className="text-base">
            {portalInfo.description}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4 pt-4">
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
            <p>
              إذا كنت تعتقد أن هذا خطأ، يرجى التواصل مع مسؤول النظام أو تسجيل الدخول بحساب مختلف.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Button 
              onClick={handleGoToLogin}
              className="w-full gap-2"
            >
              <LogIn className="w-4 h-4" />
              تسجيل الدخول إلى {portalInfo.title}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleGoHome}
              className="w-full gap-2"
            >
              <Home className="w-4 h-4" />
              العودة للصفحة الرئيسية
            </Button>

            <Button 
              variant="ghost" 
              onClick={handleGoBack}
              className="w-full gap-2 text-muted-foreground"
            >
              <ArrowRight className="w-4 h-4" />
              رجوع للصفحة السابقة
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UnauthorizedPage;
