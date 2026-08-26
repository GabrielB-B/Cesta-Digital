import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { PageLifecycle } from "./components/PageLifecycle";
import { AuthProvider } from "./contexts/AuthContext";
import { AppLayout } from "./layouts/AppLayout";
import { BasketTypeCreatePage } from "./pages/BasketTypeCreatePage";
import { BasketTypeDetailPage } from "./pages/BasketTypeDetailPage";
import { BasketTypesPage } from "./pages/BasketTypesPage";
import { AssessmentQueuePage } from "./pages/AssessmentQueuePage";
import { AuditLogsPage } from "./pages/AuditLogsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DeliveriesPage } from "./pages/DeliveriesPage";
import { DeliveryScheduleCreatePage } from "./pages/DeliveryScheduleCreatePage";
import { ReportsPage } from "./pages/ReportsPage";
import { FamiliesPage } from "./pages/FamiliesPage";
import { FamilyAssessmentCreatePage } from "./pages/FamilyAssessmentCreatePage";
import { FamilyBenefitCreatePage } from "./pages/FamilyBenefitCreatePage";
import { FamilyBenefitEditPage } from "./pages/FamilyBenefitEditPage";
import { FamilyCreatePage } from "./pages/FamilyCreatePage";
import { FamilyDetailPage } from "./pages/FamilyDetailPage";
import { FamilyEditPage } from "./pages/FamilyEditPage";
import { FamilyPersonCreatePage } from "./pages/FamilyPersonCreatePage";
import { FamilyPersonEditPage } from "./pages/FamilyPersonEditPage";
import { ItemCategoriesPage } from "./pages/ItemCategoriesPage";
import { ItemCreatePage } from "./pages/ItemCreatePage";
import { ItemDetailPage } from "./pages/ItemDetailPage";
import { ItemsPage } from "./pages/ItemsPage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { StockBatchCreatePage } from "./pages/StockBatchCreatePage";
import { StockBatchesPage } from "./pages/StockBatchesPage";
import { StockMovementCreatePage } from "./pages/StockMovementCreatePage";
import { UsersPage } from "./pages/UsersPage";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { RoleRoute } from "./routes/RoleRoute";
import { ROUTE_ACCESS } from "./routes/routeAccess";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <PageLifecycle />
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
                <RoleRoute allowedRoles={ROUTE_ACCESS.social}>
                  <FamiliesPage />
                </RoleRoute>
              }
            />
            <Route
              path="assessments"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.social}>
                  <AssessmentQueuePage />
                </RoleRoute>
              }
            />
            <Route
              path="families/new"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.social}>
                  <FamilyCreatePage />
                </RoleRoute>
              }
            />
            <Route
              path="families/:familyId"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.social}>
                  <FamilyDetailPage />
                </RoleRoute>
              }
            />
            <Route
              path="families/:familyId/edit"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.social}>
                  <FamilyEditPage />
                </RoleRoute>
              }
            />
            <Route
              path="families/:familyId/people/new"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.social}>
                  <FamilyPersonCreatePage />
                </RoleRoute>
              }
            />
            <Route
              path="families/:familyId/people/:personId/edit"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.social}>
                  <FamilyPersonEditPage />
                </RoleRoute>
              }
            />
            <Route
              path="families/:familyId/benefits/new"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.social}>
                  <FamilyBenefitCreatePage />
                </RoleRoute>
              }
            />
            <Route
              path="families/:familyId/benefits/:benefitId/edit"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.social}>
                  <FamilyBenefitEditPage />
                </RoleRoute>
              }
            />
            <Route
              path="families/:familyId/assessments/new"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.social}>
                  <FamilyAssessmentCreatePage />
                </RoleRoute>
              }
            />
            <Route
              path="items"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.operations}>
                  <ItemsPage />
                </RoleRoute>
              }
            />
            <Route
              path="item-categories"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.operations}>
                  <ItemCategoriesPage />
                </RoleRoute>
              }
            />
            <Route
              path="items/new"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.operations}>
                  <ItemCreatePage />
                </RoleRoute>
              }
            />
            <Route
              path="items/:itemId"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.operations}>
                  <ItemDetailPage />
                </RoleRoute>
              }
            />
            <Route
              path="stock-batches"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.operations}>
                  <StockBatchesPage />
                </RoleRoute>
              }
            />
            <Route
              path="stock-batches/new"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.operations}>
                  <StockBatchCreatePage />
                </RoleRoute>
              }
            />
            <Route
              path="stock-movements/new"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.operations}>
                  <StockMovementCreatePage />
                </RoleRoute>
              }
            />
            <Route
              path="basket-types"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.operations}>
                  <BasketTypesPage />
                </RoleRoute>
              }
            />
            <Route
              path="basket-types/new"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.operations}>
                  <BasketTypeCreatePage />
                </RoleRoute>
              }
            />
            <Route
              path="basket-types/:basketTypeId"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.operations}>
                  <BasketTypeDetailPage />
                </RoleRoute>
              }
            />
            <Route
              path="deliveries"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.operations}>
                  <DeliveriesPage />
                </RoleRoute>
              }
            />
            <Route
              path="deliveries/schedules/new"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.operations}>
                  <DeliveryScheduleCreatePage />
                </RoleRoute>
              }
            />
            <Route
              path="reports"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.authenticated}>
                  <ReportsPage />
                </RoleRoute>
              }
            />
            <Route
              path="financial-summary"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.social}>
                  <Navigate to="/reports" replace />
                </RoleRoute>
              }
            />
            <Route
              path="users"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.administration}>
                  <UsersPage />
                </RoleRoute>
              }
            />
            <Route
              path="audit-logs"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.administration}>
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
