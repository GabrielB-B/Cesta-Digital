import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import HomePage from "../pages/HomePage";
import FamiliesPage from "../pages/FamiliesPage";
import InventoryPage from "../pages/InventoryPage";
import DeliveriesPage from "../pages/DeliveriesPage";
import ReportsPage from "../pages/ReportsPage";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/familias" element={<FamiliesPage />} />
          <Route path="/estoque" element={<InventoryPage />} />
          <Route path="/entregas" element={<DeliveriesPage />} />
          <Route path="/prestacao-contas" element={<ReportsPage />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}