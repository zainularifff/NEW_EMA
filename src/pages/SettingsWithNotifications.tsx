import { useEffect, useState } from "react";
import LegacySettings from "./Settings";
import NotificationChannelsSettings from "../components/settings/NotificationChannelsSettings";

type SettingsView = "settings" | "management" | "notifications";
type ManagementSection = "aging" | "pricing" | "policy";

function readInitialView(): SettingsView {
  if (typeof window === "undefined") return "settings";
  const hash = String(window.location.hash || "").toLowerCase();
  const query = new URLSearchParams(window.location.search);
  const tab = String(query.get("tab") || "").toLowerCase();
  if (hash.includes("notification") || tab.includes("notification")) return "notifications";
  if (hash.includes("management") || tab.includes("management")) return "management";
  return "settings";
}

function readManagementSection(): ManagementSection {
  if (typeof window === "undefined") return "aging";
  const hash = String(window.location.hash || "").toLowerCase();
  const query = new URLSearchParams(window.location.search);
  const section = `${query.get("section") || ""} ${hash}`.toLowerCase();
  if (section.includes("pricing")) return "pricing";
  if (section.includes("policy")) return "policy";
  return "aging";
}

export default function SettingsWithNotifications() {
  const [view, setView] = useState<SettingsView>(readInitialView);
  const [managementSection, setManagementSection] = useState<ManagementSection>(readManagementSection);

  useEffect(() => {
    document.documentElement.classList.add("ema-settings-page-active");
    document.body.classList.add("ema-settings-page-active");

    return () => {
      document.documentElement.classList.remove("ema-settings-page-active");
      document.body.classList.remove("ema-settings-page-active");
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.dataset.settingsView = view;
    document.documentElement.dataset.settingsView = view;

    return () => {
      if (document.body.dataset.settingsView === view) delete document.body.dataset.settingsView;
      if (document.documentElement.dataset.settingsView === view) delete document.documentElement.dataset.settingsView;
    };
  }, [view]);

  useEffect(() => {
    const onHashChange = () => {
      setView(readInitialView());
      setManagementSection(readManagementSection());
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (view !== "management") return;
    const timer = window.setTimeout(() => {
      const target = document.querySelector<HTMLButtonElement>(`.management-control-wrapper .setting-btn[data-section="${managementSection}"]`);
      target?.click();
    }, 80);
    return () => window.clearTimeout(timer);
  }, [view, managementSection]);

  const switchView = (next: SettingsView) => {
    setView(next);
    if (typeof window !== "undefined") {
      const hash = next === "notifications" ? "#notifications" : next === "management" ? `#management-control-${managementSection}` : "";
      window.history.replaceState(null, "", `${window.location.pathname}${hash}`);
    }
  };

  return (
    <div className={`settings-with-notifications settings-view-${view}`} data-settings-view={view}>
      <div className="settings-notification-page-tabs">
        <button className={`notification-tab ${view === "settings" ? "active" : ""}`} onClick={() => switchView("settings")}>Settings Console</button>
        <button className={`notification-tab ${view === "management" ? "active" : ""}`} onClick={() => switchView("management")}>Management Control</button>
        <button className={`notification-tab ${view === "notifications" ? "active" : ""}`} onClick={() => switchView("notifications")}>Notification Channels</button>
      </div>

      <div className="settings-view-host">
        {view === "notifications" ? (
          <NotificationChannelsSettings />
        ) : view === "management" ? (
          <div className="management-control-wrapper" data-management-section={managementSection}>
            <LegacySettings key={`management-${managementSection}`} />
          </div>
        ) : (
          <LegacySettings />
        )}
      </div>
    </div>
  );
}
