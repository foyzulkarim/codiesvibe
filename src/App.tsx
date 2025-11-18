import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { queryClient, reactQueryDevtoolsConfig } from "@/config/query-client";
import { apiConfig, validateApiConfig } from "@/config/api";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Validate API configuration on app startup
validateApiConfig();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>

    {/* React Query DevTools - Only in development */}
    {apiConfig.features.enableDevtools && (
      <ReactQueryDevtools {...reactQueryDevtoolsConfig} />
    )}
  </QueryClientProvider>
);

export default App;
