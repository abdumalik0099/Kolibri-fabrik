import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSecret } from "./hooks/useSecret"; // Hookni import qildik
import HomePage from "./pages/HomePage";
import CatalogPage from "./pages/CatalogPage";
import ProductPage from "./pages/ProductPage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  useSecret(); // Funksiyani shu yerda ishga tushirdik

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
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;