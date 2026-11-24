// Rutas del front. "/" es el Home + login; "/dashboard" es todo lo demás
// (curso del grado, admin del colegio o super admin, según el rol).
import {
    createBrowserRouter,
    createRoutesFromElements,
    Route,
    Link,
} from "react-router-dom";
import { Layout } from "./pages/Layout";
import { Home } from "./pages/Home";
import { Dashboard } from "./pages/Dashboard";
import { lazy, Suspense } from "react";

// El demo carga sus juegos solo cuando alguien entra a /demo
const Demo = lazy(() => import("./pages/Demo").then((m) => ({ default: m.Demo })));
const DemoPage = () => (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "Figtree, system-ui, sans-serif", fontWeight: 700, color: "#0b7a50" }}>Loading the demo…</div>}>
        <Demo />
    </Suspense>
);

const NotFound = () => (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", textAlign: "center", padding: 24, fontFamily: "Figtree, system-ui, sans-serif" }}>
        <div>
            <h1 style={{ fontWeight: 800 }}>Page not found</h1>
            <p><Link to="/">Go back to FinFluent</Link></p>
        </div>
    </div>
);

export const router = createBrowserRouter(
    createRoutesFromElements(
        <Route path="/" element={<Layout />} errorElement={<NotFound />}>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/demo" element={<DemoPage />} />
            <Route path="*" element={<NotFound />} />
        </Route>
    ),
    { basename: import.meta.env.VITE_BASENAME || "/" }
);
