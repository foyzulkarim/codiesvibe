import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { queryClient, reactQueryDevtoolsConfig } from "@/config/query-client";
import { apiConfig, validateApiConfig } from "@/config/api";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";
import OAuthCallback from "./pages/OAuthCallback";
import ToolsList from "./pages/admin/ToolsList";
import ToolCreate from "./pages/admin/ToolCreate";

// Validate API configuration on app startup
validateApiConfig();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/auth/callback" element={<OAuthCallback />} />

              {/* Protected admin routes */}
              <Route
                path="/admin/tools"
                element={
                  <ProtectedRoute>
                    <ToolsList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/tools/new"
                element={
                  <ProtectedRoute>
                    <ToolCreate />
                  </ProtectedRoute>
                }
              />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>

      {/* React Query DevTools - Only in development */}
      {apiConfig.features.enableDevtools && (
        <ReactQueryDevtools {...reactQueryDevtoolsConfig} />
      )}
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
