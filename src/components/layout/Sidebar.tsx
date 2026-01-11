import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, ChevronLeft } from "lucide-react";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";
import { docModules, type DocModule, type DocSubModule } from "@/data/docsData";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

function getIcon(iconName: string) {
  const IconComponent = (Icons as any)[iconName];
  return IconComponent ? <IconComponent className="h-4 w-4" /> : null;
}

function ModuleItem({ module }: { module: DocModule }) {
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(
    location.pathname.includes(`/${module.slug}`)
  );

  const isActive = location.pathname.includes(`/${module.slug}`);

  return (
    <div className="mb-1">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
          isActive
            ? "bg-sidebar-accent text-sidebar-primary"
            : "text-sidebar-foreground hover:bg-sidebar-accent/50"
        )}
      >
        <div className="flex items-center gap-2">
          {getIcon(module.icon)}
          <span>{module.title}</span>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      {isExpanded && (
        <div className="mr-4 mt-1 border-r border-sidebar-border pr-2 space-y-0.5">
          {module.subModules.map((subModule) => (
            <SubModuleItem
              key={subModule.id}
              module={module}
              subModule={subModule}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SubModuleItem({
  module,
  subModule,
}: {
  module: DocModule;
  subModule: DocSubModule;
}) {
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(
    location.pathname.includes(`/${module.slug}/${subModule.slug}`)
  );

  const hasArticles = subModule.articles.length > 0;
  const isActive = location.pathname.includes(
    `/${module.slug}/${subModule.slug}`
  );

  if (!hasArticles) {
    return (
      <Link
        to={`/docs/${module.slug}/${subModule.slug}`}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
          isActive
            ? "bg-sidebar-accent text-sidebar-primary font-medium"
            : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
        )}
      >
        {getIcon(subModule.icon)}
        <span>{subModule.title}</span>
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm transition-colors",
          isActive
            ? "text-sidebar-primary font-medium"
            : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
        )}
      >
        <div className="flex items-center gap-2">
          {getIcon(subModule.icon)}
          <span>{subModule.title}</span>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>

      {isExpanded && (
        <div className="mr-4 mt-0.5 space-y-0.5">
          {subModule.articles.map((article) => (
            <Link
              key={article.id}
              to={`/docs/${module.slug}/${subModule.slug}/${article.slug}`}
              className={cn(
                "block px-3 py-1.5 rounded text-xs transition-colors",
                location.pathname.includes(article.slug)
                  ? "bg-sidebar-accent text-sidebar-primary font-medium"
                  : "text-muted-foreground hover:text-sidebar-foreground"
              )}
            >
              {article.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-16 right-0 z-40 h-[calc(100vh-4rem)] w-72 border-l bg-sidebar transition-transform duration-300 lg:translate-x-0",
          isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}
      >
        <ScrollArea className="h-full py-4 px-3">
          <nav className="space-y-1">
            {/* Quick Links */}
            <div className="mb-4 pb-4 border-b border-sidebar-border">
              <Link
                to="/"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              >
                {getIcon("Home")}
                <span>الرئيسية</span>
              </Link>
              <Link
                to="/getting-started"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-secondary hover:bg-sidebar-accent transition-colors"
              >
                {getIcon("Rocket")}
                <span>ابدأ هنا</span>
              </Link>
            </div>

            {/* Modules */}
            {docModules.map((module) => (
              <ModuleItem key={module.id} module={module} />
            ))}
          </nav>
        </ScrollArea>
      </aside>
    </>
  );
}
