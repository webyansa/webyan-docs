import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ModulePage from "./pages/ModulePage";
import ArticlePage from "./pages/ArticlePage";
import SearchPage from "./pages/SearchPage";
import ChangelogPage from "./pages/ChangelogPage";
import ReportIssuePage from "./pages/ReportIssuePage";
import GettingStartedPage from "./pages/GettingStartedPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/getting-started" element={<GettingStartedPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/changelog" element={<ChangelogPage />} />
          <Route path="/report-issue" element={<ReportIssuePage />} />
          <Route path="/docs/:moduleSlug" element={<ModulePage />} />
          <Route path="/docs/:moduleSlug/:subModuleSlug" element={<ModulePage />} />
          <Route path="/docs/:moduleSlug/:subModuleSlug/:articleSlug" element={<ArticlePage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
