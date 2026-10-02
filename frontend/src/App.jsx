import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import MainLayout from "./layouts/MainLayout";

import Dashboard from "./pages/Dashboard";
import Collections from "./pages/Collections";
import Receipts from "./pages/Receipts";
import Vouchers from "./pages/Vouchers";
import Reports from "./pages/Reports";
import PendingBalances from "./pages/PendingBalances";
import Users from "./pages/Users";
import AuditTrail from "./pages/AuditTrail";

export default function App() {
    return (
        <BrowserRouter>
            <Routes>

                {/* =====================================================
                    LOGIN
                ===================================================== */}

                <Route
                    path="/"
                    element={<Login />}
                />

                {/* =====================================================
                    PROTECTED SYSTEM
                ===================================================== */}

                <Route element={<MainLayout />}>

                    <Route
                        path="/dashboard"
                        element={<Dashboard />}
                    />

                    <Route
                        path="/collections"
                        element={<Collections />}
                    />

                    <Route
                        path="/receipts"
                        element={<Receipts />}
                    />

                    <Route
                        path="/vouchers"
                        element={<Vouchers />}
                    />

                    <Route
                        path="/reports"
                        element={<Reports />}
                    />

                    <Route
                        path="/pending-balances"
                        element={<PendingBalances />}
                    />

                    <Route
                        path="/users"
                        element={<Users />}
                    />

                    <Route
                        path="/audit-trail"
                        element={<AuditTrail />}
                    />

                </Route>

                {/* =====================================================
                    UNKNOWN PAGE
                ===================================================== */}

                <Route
                    path="*"
                    element={
                        <Navigate
                            to="/"
                            replace
                        />
                    }
                />

            </Routes>
        </BrowserRouter>
    );
}
