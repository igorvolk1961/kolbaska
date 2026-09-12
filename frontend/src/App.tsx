import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import ContactsPage from "./pages/ContactsPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CatalogPage from "./pages/CatalogPage";
import ProductPage from "./pages/ProductPage";
import GourmetPage from "./pages/GourmetPage";
import CartPage from "./pages/CartPage";
import PaymentPage from "./pages/PaymentPage";
import CabinetPage from "./pages/CabinetPage";
import TechnologistOptionsPage from "./pages/TechnologistOptionsPage";
import TechnologistOrdersPage from "./pages/TechnologistOrdersPage";
import AnalystPage from "./pages/AnalystPage";
import PromosPage from "./pages/PromosPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminClientsPage from "./pages/AdminClientsPage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/originals" element={<CatalogPage />} />
        <Route path="/originals/:id" element={<ProductPage />} />
        <Route path="/gourmet" element={<GourmetPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/cart"
          element={
            <ProtectedRoute roles={["client"]}>
              <CartPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment/:orderId"
          element={
            <ProtectedRoute roles={["client"]}>
              <PaymentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cabinet"
          element={
            <ProtectedRoute roles={["client"]}>
              <CabinetPage />
            </ProtectedRoute>
          }
        />

        <Route path="/technologist" element={<Navigate to="/technologist/options" replace />} />
        <Route
          path="/technologist/options"
          element={
            <ProtectedRoute roles={["technologist", "admin"]}>
              <TechnologistOptionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/technologist/orders"
          element={
            <ProtectedRoute roles={["technologist", "admin"]}>
              <TechnologistOrdersPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/analyst"
          element={
            <ProtectedRoute roles={["analyst", "admin"]}>
              <AnalystPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analyst/promos"
          element={
            <ProtectedRoute roles={["analyst", "admin"]}>
              <PromosPage />
            </ProtectedRoute>
          }
        />

        <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AdminUsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/clients"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AdminClientsPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
}
