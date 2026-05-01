import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { AppLayout } from "./layouts/AppLayout";
import { BasketTypeCreatePage } from "./pages/BasketTypeCreatePage";
import { BasketTypeDetailPage } from "./pages/BasketTypeDetailPage";
import { BasketTypesPage } from "./pages/BasketTypesPage";
import { AuditLogsPage } from "./pages/AuditLogsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DeliveriesPage } from "./pages/DeliveriesPage";
import { DeliveryScheduleCreatePage } from "./pages/DeliveryScheduleCreatePage";
import { FinancialSummaryPage } from "./pages/FinancialSummaryPage";
import { FamiliesPage } from "./pages/FamiliesPage";
import { FamilyAssessmentCreatePage } from "./pages/FamilyAssessmentCreatePage";
import { FamilyBenefitCreatePage } from "./pages/FamilyBenefitCreatePage";
import { FamilyBenefitEditPage } from "./pages/FamilyBenefitEditPage";
import { FamilyCreatePage } from "./pages/FamilyCreatePage";
import { FamilyDetailPage } from "./pages/FamilyDetailPage";
import { FamilyPersonCreatePage } from "./pages/FamilyPersonCreatePage";
import { FamilyPersonEditPage } from "./pages/FamilyPersonEditPage";
import { ItemCategoriesPage } from "./pages/ItemCategoriesPage";
import { ItemCreatePage } from "./pages/ItemCreatePage";
import { ItemDetailPage } from "./pages/ItemDetailPage";
import { ItemsPage } from "./pages/ItemsPage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { StockBatchCreatePage } from "./pages/StockBatchCreatePage";
import { StockMovementCreatePage } from "./pages/StockMovementCreatePage";
import { UsersPage } from "./pages/UsersPage";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { RoleRoute } from "./routes/RoleRoute";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route
              path="families"
              element={
                <RoleRoute allowedRoles={["admin", "lider_social"]}>
                  <FamiliesPage />
                </RoleRoute>
              }
            />
            <Route
              path="families/new"
              element={
                <RoleRoute allowedRoles={["admin", "lider_social"]}>
                  <FamilyCreatePage />
                </RoleRoute>
              }
            />
            <Route
              path="families/:familyId"
              element={
                <RoleRoute allowedRoles={["admin", "lider_social"]}>
                  <FamilyDetailPage />
                </RoleRoute>
              }
            />
            <Route
              path="families/:familyId/people/new"
              element={
                <RoleRoute allowedRoles={["admin", "lider_social"]}>
                  <FamilyPersonCreatePage />
                </RoleRoute>
              }
            />
            <Route
              path="families/:familyId/people/:personId/edit"
              element={
                <RoleRoute allowedRoles={["admin", "lider_social"]}>
                  <FamilyPersonEditPage />
                </RoleRoute>
              }
            />
            <Route
              path="families/:familyId/benefits/new"
              element={
                <RoleRoute allowedRoles={["admin", "lider_social"]}>
                  <FamilyBenefitCreatePage />
                </RoleRoute>
              }
            />
            <Route
              path="families/:familyId/benefits/:benefitId/edit"
              element={
                <RoleRoute allowedRoles={["admin", "lider_social"]}>
                  <FamilyBenefitEditPage />
                </RoleRoute>
              }
            />
            <Route
              path="families/:familyId/assessments/new"
              element={
                <RoleRoute allowedRoles={["admin", "lider_social"]}>
                  <FamilyAssessmentCreatePage />
                </RoleRoute>
              }
            />
            <Route
              path="items"
              element={
                <RoleRoute allowedRoles={["admin", "operador"]}>
                  <ItemsPage />
                </RoleRoute>
              }
            />
            <Route
              path="item-categories"
              element={
                <RoleRoute allowedRoles={["admin", "operador"]}>
                  <ItemCategoriesPage />
                </RoleRoute>
              }
            />
            <Route
              path="items/new"
              element={
                <RoleRoute allowedRoles={["admin", "operador"]}>
                  <ItemCreatePage />
                </RoleRoute>
              }
            />
            <Route
              path="items/:itemId"
              element={
                <RoleRoute allowedRoles={["admin", "operador"]}>
                  <ItemDetailPage />
                </RoleRoute>
              }
            />
            <Route
              path="stock-batches/new"
              element={
                <RoleRoute allowedRoles={["admin", "operador"]}>
                  <StockBatchCreatePage />
                </RoleRoute>
              }
            />
            <Route
              path="stock-movements/new"
              element={
                <RoleRoute allowedRoles={["admin", "operador"]}>
                  <StockMovementCreatePage />
                </RoleRoute>
              }
            />
            <Route
              path="basket-types"
              element={
                <RoleRoute allowedRoles={["admin", "operador"]}>
                  <BasketTypesPage />
                </RoleRoute>
              }
            />
            <Route
              path="basket-types/new"
              element={
                <RoleRoute allowedRoles={["admin", "operador"]}>
                  <BasketTypeCreatePage />
                </RoleRoute>
              }
            />
            <Route
              path="basket-types/:basketTypeId"
              element={
                <RoleRoute allowedRoles={["admin", "operador"]}>
                  <BasketTypeDetailPage />
                </RoleRoute>
              }
            />
            <Route
              path="deliveries"
              element={
                <RoleRoute allowedRoles={["admin", "operador"]}>
                  <DeliveriesPage />
                </RoleRoute>
              }
            />
            <Route
              path="deliveries/schedules/new"
              element={
                <RoleRoute allowedRoles={["admin", "operador"]}>
                  <DeliveryScheduleCreatePage />
                </RoleRoute>
              }
            />
            <Route
              path="financial-summary"
              element={
                <RoleRoute allowedRoles={["admin", "lider_social"]}>
                  <FinancialSummaryPage />
                </RoleRoute>
              }
            />
            <Route
              path="users"
              element={
                <RoleRoute allowedRoles={["admin"]}>
                  <UsersPage />
                </RoleRoute>
              }
            />
            <Route
              path="audit-logs"
              element={
                <RoleRoute allowedRoles={["admin"]}>
                  <AuditLogsPage />
                </RoleRoute>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
