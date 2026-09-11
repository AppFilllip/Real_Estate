import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { AppShell } from "./components/layout/app-shell";
import { toast } from "sonner";
import { api, setAuthToken, setSessionExpiredHandler, setWorkspaceOverride } from "./services/api";
import { LoginScreen } from "./features/auth/login-screen";
import { DashboardScreen } from "./features/dashboard/dashboard-screen";
import { DataScreen, SettingsScreen } from "./features/data/data-screen";
import { CollectionsScreen } from "./features/collections/collections-screen";
import { ReportsScreen } from "./features/reports/reports-screen";
import { MarketingScreen } from "./features/marketing/marketing-screen";
import { SiteVisitsScreen } from "./features/site-visits/site-visits-screen";
import { ProjectsScreen } from "./features/projects/projects-screen";
import { InventoryScreen } from "./features/inventory/inventory-screen";
import { BookingsScreen } from "./features/bookings/bookings-screen";
import { CustomersScreen } from "./features/customers/customers-screen";
import { ChannelPartnersScreen } from "./features/channel-partners/channel-partners-screen";
import { CallsScreen } from "./features/calls/calls-screen";
import { InboxScreen } from "./features/inbox/inbox-screen";
import { LeadDetailScreen } from "./features/leads/lead-detail-screen";
import { DetailPage } from "./features/data/detail-page";
import { Toaster } from "./components/ui/sonner";
import { parseDetailPath, sectionFromPath, sections } from "./lib/routes";
import "./styles.css";

const WORKSPACE_OVERRIDE_KEY = "estateos.activeWorkspaceId";

function App() {
  const [path, setPath] = useState(currentPath());
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(null);

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  function applyWorkspaceOverride(nextUser) {
    const isSuperAdmin = nextUser?.role?.code === "SUPER_ADMIN";
    const stored = isSuperAdmin ? localStorage.getItem(WORKSPACE_OVERRIDE_KEY) : null;
    const override = stored && stored !== nextUser?.companyId ? stored : null;
    setWorkspaceOverride(override);
    setActiveWorkspaceId(override);
  }

  useEffect(() => {
    let active = true;
    api
      .post("/auth/refresh")
      .then((response) => {
        if (!active) return;
        setAuthToken(response.data.data.accessToken);
        setToken(response.data.data.accessToken);
        setUser(response.data.data.user);
        applyWorkspaceOverride(response.data.data.user);
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function onPopState() {
      setPath(currentPath());
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      setToken("");
      setUser(null);
      navigate("/");
      toast.error("Your session has expired. Please log in again.");
    });
  }, []);

  function navigate(nextPath) {
    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
  }

  function saveSession(nextToken, nextUser) {
    setAuthToken(nextToken);
    setToken(nextToken);
    setUser(nextUser);
    applyWorkspaceOverride(nextUser);
  }

  async function logout() {
    await api.post("/auth/logout").catch(() => {});
    localStorage.removeItem(WORKSPACE_OVERRIDE_KEY);
    setWorkspaceOverride(null);
    setToken("");
    setUser(null);
    navigate("/");
  }

  function switchWorkspace(companyId) {
    if (companyId && companyId !== user?.companyId) {
      localStorage.setItem(WORKSPACE_OVERRIDE_KEY, companyId);
    } else {
      localStorage.removeItem(WORKSPACE_OVERRIDE_KEY);
    }
    // A full reload is the simplest way to get every screen's already-loaded
    // data refetched under the newly selected workspace's scope.
    window.location.reload();
  }

  if (checkingSession) return null;
  if (!token) return <LoginScreen onLogin={saveSession} />;

  const active = sectionFromPath(path) || parseDetailPath(path)?.sectionKey || "dashboard";
  const detailRoute = parseDetailPath(path);

  return (
    <AppShell
      active={active}
      navigate={navigate}
      mobileNavOpen={mobileNavOpen}
      setMobileNavOpen={setMobileNavOpen}
      user={user}
      onLogout={logout}
      activeWorkspaceId={activeWorkspaceId}
      onSwitchWorkspace={switchWorkspace}
    >
      {detailRoute?.key === "leads" ? (
        <LeadDetailScreen id={detailRoute.id} navigate={navigate} onBack={() => navigate(sections.leads.path)} />
      ) : detailRoute ? (
        <DetailPage route={detailRoute} onBack={() => navigate(sections[detailRoute.sectionKey]?.path || "/")} />
      ) : (
        <RouteScreen path={path} navigate={navigate} user={user} />
      )}
    </AppShell>
  );
}

function RouteScreen({ path, navigate, user }) {
  const active = sectionFromPath(path) || "dashboard";
  const initialSearch = new URLSearchParams(path.split("?")[1] || "").get("search") || "";

  if (active === "dashboard") return <DashboardScreen user={user} navigate={navigate} />;
  if (active === "collections") return <CollectionsScreen />;
  if (active === "reports") return <ReportsScreen />;
  if (active === "settings") {
    if (user?.role?.code !== "SUPER_ADMIN") return <AccessDeniedScreen />;
    return <SettingsScreen navigate={navigate} />;
  }
  if (active === "visits") return <SiteVisitsScreen />;
  if (active === "projects") return <ProjectsScreen navigate={navigate} />;
  if (active === "inventory") return <InventoryScreen navigate={navigate} />;
  if (active === "bookings") return <BookingsScreen />;
  if (active === "customers") return <CustomersScreen />;
  if (active === "brokers") return <ChannelPartnersScreen />;
  if (active === "calls") return <CallsScreen />;
  if (active === "inbox") return <InboxScreen />;
  if (active === "marketing") return <MarketingScreen />;

  const section = sections[active];
  if (!section?.endpoint) return <PlaceholderScreen title={section?.title || "Coming Soon"} />;
  return (
    <DataScreen
      title={section.title}
      endpoint={section.endpoint}
      columns={section.columns}
      navigate={navigate}
      routeKey={active}
      initialSearch={initialSearch}
      user={user}
    />
  );
}

function currentPath() {
  return `${window.location.pathname}${window.location.search}`;
}

function AccessDeniedScreen() {
  return (
    <section className="mx-auto max-w-[1440px] space-y-4">
      <div>
        <div className="mb-0.5 text-xs text-[#8B93A1]">EstateOS / Settings</div>
        <h1 className="font-display m-0 text-2xl font-semibold leading-8 tracking-normal text-[#101418]">Settings</h1>
        <p className="mt-0.5 text-[13px] text-[#5B6472]">Only Super Admins can manage team members, roles, permissions, and workspaces.</p>
      </div>
      <div className="rounded-[10px] border border-[#E2E5EA] bg-white p-5">
        <p className="text-sm text-[#5B6472]">You don't have access to this section.</p>
      </div>
    </section>
  );
}

function PlaceholderScreen({ title }) {
  return (
    <section className="mx-auto max-w-[1440px] space-y-4">
      <div>
        <div className="mb-0.5 text-xs text-[#8B93A1]">EstateOS / {title}</div>
        <h1 className="font-display m-0 text-2xl font-semibold leading-8 tracking-normal text-[#101418]">{title}</h1>
        <p className="mt-0.5 text-[13px] text-[#5B6472]">This workspace is part of the HTML design and will be connected next.</p>
      </div>
      <div className="rounded-[10px] border border-[#E2E5EA] bg-white p-5">
        <p className="text-sm text-[#5B6472]">Screen shell is ready. Data widgets and actions will be added in the next UI pass.</p>
      </div>
    </section>
  );
}

createRoot(document.getElementById("root")).render(
  <>
    <App />
    <Toaster />
  </>
);
