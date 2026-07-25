import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/index.css";
import App from "@/App";
import { I18nProvider } from "@/lib/i18n";
import { installOffline } from "@/lib/offline";

installOffline();

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
// Note: StrictMode intentionally disabled — react-leaflet's MapContainer
// double-mounts under StrictMode in dev, causing "Map is already initialized".
root.render(
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <App />
    </I18nProvider>
  </QueryClientProvider>,
);
