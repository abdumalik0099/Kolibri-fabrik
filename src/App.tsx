import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "sonner";
// ✅ @/ o'rniga nisbiy yo'llar
import { useSecret } from "./hooks/useSecret";
import HomePage from "./pages/HomePage";
import CatalogPage from "./pages/CatalogPage";
import ProductPage from "./pages/ProductPage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";
import { SearchFocusProvider } from "./context/SearchFocusContext";
import { useAnalyticsLogger } from "./hooks/useAnalyticsLogger";

const queryClient = new QueryClient();

const AppContent = () => {
  useSecret();
  useAnalyticsLogger();

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/katalog" element={<CatalogPage />} />
      <Route path="/mahsulot/:id" element={<ProductPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Sonner />
    <SearchFocusProvider>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </SearchFocusProvider>
  </QueryClientProvider>
);

export default App;
