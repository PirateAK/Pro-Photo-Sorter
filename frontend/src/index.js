import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/index.css";
import App from "@/App";
import ErrorBoundary from "@/components/ErrorBoundary";
import { bootRestoreFromSafetyIfEmpty } from "@/lib/bootRestore";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

// v1.2.9 — hydrate localStorage from the Safety-Backup mirror BEFORE React
// reads state, so a wiped userData folder can never lose the user's tag
// packs or their activated license. No-op in browser dev, silent on success.
async function boot() {
  try { await bootRestoreFromSafetyIfEmpty(); } catch { /* fall through */ }

  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  );
}

boot();
