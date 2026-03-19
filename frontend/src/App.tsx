import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { AppLayout } from "./layouts/AppLayout";
import { BasketTypeDetailPage } from "./pages/BasketTypeDetailPage";
import { BasketTypesPage } from "./pages/BasketTypesPage";
import { DashboardPage } from "./pages/DashboardPage";
import { FamiliesPage } from "./pages/FamiliesPage";
import { FamilyCreatePage } from "./pages/FamilyCreatePage";
import { FamilyDetailPage } from "./pages/FamilyDetailPage";
import { ItemDetailPage } from "./pages/ItemDetailPage";
import { ItemsPage } from "./pages/ItemsPage";
import { LoginPage } from "./pages/LoginPage";
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
            <Route path="items" element={<ItemsPage />} />
            <Route path="items/:itemId" element={<ItemDetailPage />} />
            <Route path="basket-types" element={<BasketTypesPage />} />
            <Route
              path="basket-types/:basketTypeId"
              element={<BasketTypeDetailPage />}
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;