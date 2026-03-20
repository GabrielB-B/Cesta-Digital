import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { AppLayout } from "./layouts/AppLayout";
import { BasketTypeDetailPage } from "./pages/BasketTypeDetailPage";
import { BasketTypesPage } from "./pages/BasketTypesPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DeliveriesPage } from "./pages/DeliveriesPage";
import { DeliveryScheduleCreatePage } from "./pages/DeliveryScheduleCreatePage";
import { FamiliesPage } from "./pages/FamiliesPage";
import { FamilyAssessmentCreatePage } from "./pages/FamilyAssessmentCreatePage";
import { FamilyBenefitCreatePage } from "./pages/FamilyBenefitCreatePage";
import { FamilyCreatePage } from "./pages/FamilyCreatePage";
import { FamilyDetailPage } from "./pages/FamilyDetailPage";
import { FamilyPersonCreatePage } from "./pages/FamilyPersonCreatePage";
import { ItemCreatePage } from "./pages/ItemCreatePage";
import { ItemDetailPage } from "./pages/ItemDetailPage";
import { ItemsPage } from "./pages/ItemsPage";
import { LoginPage } from "./pages/LoginPage";
import { StockBatchCreatePage } from "./pages/StockBatchCreatePage";
import { ProtectedRoute } from "./routes/ProtectedRoute";

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
            <Route path="families" element={<FamiliesPage />} />
            <Route path="families/new" element={<FamilyCreatePage />} />
            <Route path="families/:familyId" element={<FamilyDetailPage />} />
            <Route
              path="families/:familyId/people/new"
              element={<FamilyPersonCreatePage />}
            />
            <Route
              path="families/:familyId/benefits/new"
              element={<FamilyBenefitCreatePage />}
            />
            <Route
              path="families/:familyId/assessments/new"
              element={<FamilyAssessmentCreatePage />}
            />
            <Route path="items" element={<ItemsPage />} />
            <Route path="items/new" element={<ItemCreatePage />} />
            <Route path="items/:itemId" element={<ItemDetailPage />} />
            <Route path="stock-batches/new" element={<StockBatchCreatePage />} />
            <Route path="basket-types" element={<BasketTypesPage />} />
            <Route
              path="basket-types/:basketTypeId"
              element={<BasketTypeDetailPage />}
            />
            <Route path="deliveries" element={<DeliveriesPage />} />
            <Route
              path="deliveries/schedules/new"
              element={<DeliveryScheduleCreatePage />}
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;