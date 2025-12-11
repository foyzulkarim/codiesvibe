import { ClerkProvider } from '@clerk/clerk-react';
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import "./index.css";
import { env } from "./config/env";

// Use validated environment variable
const CLERK_PUBLISHABLE_KEY = env.VITE_CLERK_PUBLISHABLE_KEY;

createRoot(document.getElementById("root")!).render(
  <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
    <App />
  </ClerkProvider>
);
