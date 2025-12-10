import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { queryClient, reactQueryDevtoolsConfig } from "@/config/query-client";
import { apiConfig, validateApiConfig } from "@/config/api";
import { ErrorBoundary } from "@/components/error";
import { ProtectedRoute, ClerkAuthInitializer } from "@/components/auth";
import { Index } from "./pages/Index";
import { NotFound } from "./pages/NotFound";
import { SignIn } from "./pages/SignIn";
import { SignUp } from "./pages/SignUp";
import { ToolsList } from "./pages/admin/ToolsList";
import { ToolCreate } from "./pages/admin/ToolCreate";

// Validate API configuration on app startup
validateApiConfig();

export const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ClerkAuthInitializer />
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/sign-in/*" element={<SignIn />} />
            <Route path="/sign-up/*" element={<SignUp />} />

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
            <Route
              path="/admin/tools/:id/edit"
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

      {/* React Query DevTools - Only in development */}
      {apiConfig.features.enableDevtools && (
        <ReactQueryDevtools {...reactQueryDevtoolsConfig} />
      )}
    </QueryClientProvider>
  </ErrorBoundary>
);
