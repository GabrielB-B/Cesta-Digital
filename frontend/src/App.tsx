import { lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { PageLifecycle } from "./components/PageLifecycle";
import { AuthProvider } from "./contexts/AuthContext";
import { AppLayout } from "./layouts/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { RoleRoute } from "./routes/RoleRoute";
import { ROUTE_ACCESS } from "./routes/routeAccess";

const AssessmentQueuePage = lazy(() =>
  import("./pages/AssessmentQueuePage").then((module) => ({ default: module.AssessmentQueuePage })),
);
const AuditLogsPage = lazy(() =>
  import("./pages/AuditLogsPage").then((module) => ({ default: module.AuditLogsPage })),
);
const BasketTypeCreatePage = lazy(() =>
  import("./pages/BasketTypeCreatePage").then((module) => ({ default: module.BasketTypeCreatePage })),
);
const BasketTypeDetailPage = lazy(() =>
  import("./pages/BasketTypeDetailPage").then((module) => ({ default: module.BasketTypeDetailPage })),
);
const BasketTypesPage = lazy(() =>
  import("./pages/BasketTypesPage").then((module) => ({ default: module.BasketTypesPage })),
);
const DashboardPage = lazy(() =>
  import("./pages/DashboardPage").then((module) => ({ default: module.DashboardPage })),
);
const DeliveriesPage = lazy(() =>
  import("./pages/DeliveriesPage").then((module) => ({ default: module.DeliveriesPage })),
);
const DeliveryScheduleCreatePage = lazy(() =>
  import("./pages/DeliveryScheduleCreatePage").then((module) => ({ default: module.DeliveryScheduleCreatePage })),
);
const FamiliesPage = lazy(() =>
  import("./pages/FamiliesPage").then((module) => ({ default: module.FamiliesPage })),
);
const FamilyAssessmentCreatePage = lazy(() =>
  import("./pages/FamilyAssessmentCreatePage").then((module) => ({ default: module.FamilyAssessmentCreatePage })),
);
const FamilyBenefitCreatePage = lazy(() =>
  import("./pages/FamilyBenefitCreatePage").then((module) => ({ default: module.FamilyBenefitCreatePage })),
);
const FamilyBenefitEditPage = lazy(() =>
  import("./pages/FamilyBenefitEditPage").then((module) => ({ default: module.FamilyBenefitEditPage })),
);
const FamilyCreatePage = lazy(() =>
  import("./pages/FamilyCreatePage").then((module) => ({ default: module.FamilyCreatePage })),
);
const FamilyDetailPage = lazy(() =>
  import("./pages/FamilyDetailPage").then((module) => ({ default: module.FamilyDetailPage })),
);
const FamilyEditPage = lazy(() =>
  import("./pages/FamilyEditPage").then((module) => ({ default: module.FamilyEditPage })),
);
const FamilyPersonCreatePage = lazy(() =>
  import("./pages/FamilyPersonCreatePage").then((module) => ({ default: module.FamilyPersonCreatePage })),
);
const FamilyPersonEditPage = lazy(() =>
  import("./pages/FamilyPersonEditPage").then((module) => ({ default: module.FamilyPersonEditPage })),
);
const ItemCategoriesPage = lazy(() =>
  import("./pages/ItemCategoriesPage").then((module) => ({ default: module.ItemCategoriesPage })),
);
const ItemCreatePage = lazy(() =>
  import("./pages/ItemCreatePage").then((module) => ({ default: module.ItemCreatePage })),
);
const ItemDetailPage = lazy(() =>
  import("./pages/ItemDetailPage").then((module) => ({ default: module.ItemDetailPage })),
);
const ItemsPage = lazy(() =>
  import("./pages/ItemsPage").then((module) => ({ default: module.ItemsPage })),
);
const NotFoundPage = lazy(() =>
  import("./pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })),
);
const ReportsPage = lazy(() =>
  import("./pages/ReportsPage").then((module) => ({ default: module.ReportsPage })),
);
const StockBatchCreatePage = lazy(() =>
  import("./pages/StockBatchCreatePage").then((module) => ({ default: module.StockBatchCreatePage })),
);
const StockBatchesPage = lazy(() =>
  import("./pages/StockBatchesPage").then((module) => ({ default: module.StockBatchesPage })),
);
const StockMovementCreatePage = lazy(() =>
  import("./pages/StockMovementCreatePage").then((module) => ({ default: module.StockMovementCreatePage })),
);
const UsersPage = lazy(() =>
  import("./pages/UsersPage").then((module) => ({ default: module.UsersPage })),
);

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
                <RoleRoute allowedRoles={ROUTE_ACCESS.familyDirectory}>
                  <FamiliesPage />
                </RoleRoute>
              }
            />
            <Route
              path="assessments"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.socialAssessments}>
                  <AssessmentQueuePage />
                </RoleRoute>
              }
            />
            <Route
              path="families/new"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.familyManagement}>
                  <FamilyCreatePage />
                </RoleRoute>
              }
            />
            <Route
              path="families/:familyId"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.familyManagement}>
                  <FamilyDetailPage />
                </RoleRoute>
              }
            />
            <Route
              path="families/:familyId/edit"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.familyManagement}>
                  <FamilyEditPage />
                </RoleRoute>
              }
            />
            <Route
              path="families/:familyId/people/new"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.familyManagement}>
                  <FamilyPersonCreatePage />
                </RoleRoute>
              }
            />
            <Route
              path="families/:familyId/people/:personId/edit"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.familyManagement}>
                  <FamilyPersonEditPage />
                </RoleRoute>
              }
            />
            <Route
              path="families/:familyId/benefits/new"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.familyManagement}>
                  <FamilyBenefitCreatePage />
                </RoleRoute>
              }
            />
            <Route
              path="families/:familyId/benefits/:benefitId/edit"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.familyManagement}>
                  <FamilyBenefitEditPage />
                </RoleRoute>
              }
            />
            <Route
              path="families/:familyId/assessments/new"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.socialAssessments}>
                  <FamilyAssessmentCreatePage />
                </RoleRoute>
              }
            />
            <Route
              path="items"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.inventoryOperations}>
                  <ItemsPage />
                </RoleRoute>
              }
            />
            <Route
              path="item-categories"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.inventoryConfiguration}>
                  <ItemCategoriesPage />
                </RoleRoute>
              }
            />
            <Route
              path="items/new"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.inventoryCatalog}>
                  <ItemCreatePage />
                </RoleRoute>
              }
            />
            <Route
              path="items/:itemId"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.inventoryOperations}>
                  <ItemDetailPage />
                </RoleRoute>
              }
            />
            <Route
              path="stock-batches"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.inventoryOperations}>
                  <StockBatchesPage />
                </RoleRoute>
              }
            />
            <Route
              path="stock-batches/new"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.inventoryOperations}>
                  <StockBatchCreatePage />
                </RoleRoute>
              }
            />
            <Route
              path="stock-movements/new"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.inventoryOperations}>
                  <StockMovementCreatePage />
                </RoleRoute>
              }
            />
            <Route
              path="basket-types"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.inventoryConfiguration}>
                  <BasketTypesPage />
                </RoleRoute>
              }
            />
            <Route
              path="basket-types/new"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.inventoryConfiguration}>
                  <BasketTypeCreatePage />
                </RoleRoute>
              }
            />
            <Route
              path="basket-types/:basketTypeId"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.inventoryConfiguration}>
                  <BasketTypeDetailPage />
                </RoleRoute>
              }
            />
            <Route
              path="deliveries"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.deliveries}>
                  <DeliveriesPage />
                </RoleRoute>
              }
            />
            <Route
              path="deliveries/schedules/new"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.deliveries}>
                  <DeliveryScheduleCreatePage />
                </RoleRoute>
              }
            />
            <Route
              path="reports"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.reports}>
                  <ReportsPage />
                </RoleRoute>
              }
            />
            <Route
              path="financial-summary"
              element={
                <RoleRoute allowedRoles={ROUTE_ACCESS.socialReports}>
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
