"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { simMarkAlertsRead } from "@/features/live/sim-actions";
import { D, store } from "@/lib/qvek/store";
import { ASSET, counts, matchRider } from "@/lib/qvek/selectors";
import { NAV, RIDER_APP_URL, titleFor } from "@/lib/qvek/routes";
import { useDemoClock, useStore } from "@/lib/qvek/use-store";
import { U } from "@/lib/qvek/utils";
import { useAdmin } from "./admin-context";
import { Avatar } from "./bits";
import { Icon } from "./icon";

/* ------------------------------------------------------------------ anchored menu (alerts / profile) */
function AnchoredMenu({ anchor, className, children }: { anchor: HTMLElement; className: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = anchor.getBoundingClientRect();
    const w = el.offsetWidth;
    setPos({ top: r.bottom + 8 + window.scrollY, left: Math.max(12, Math.min(window.innerWidth - w - 12, r.right - w)) });
    const f = el.querySelector<HTMLElement>("button, a");
    f?.focus();
  }, [anchor]);

  return createPortal(
    <div ref={ref} className={"menu " + className} role="menu" style={{ top: pos.top, left: pos.left }}>
      {children}
    </div>,
    document.body,
  );
}

const ALERT_TONE: Record<string, [string, string]> = { info: ["info", "tone-blue"], warning: ["alert", "tone-amber"], critical: ["alertCircle", "tone-red"] };

function AlertsMenu({ onClose }: { onClose: () => void }) {
  const admin = useAdmin();
  const s = useStore();
  const list = s.alerts.slice().sort((a, b) => b.at - a.at).slice(0, 15);
  return (
    <>
      <div className="alerts__head">
        <b>Alerts</b>
        {list.some((a) => !a.read) ? (
          <Button variant="subtle" size="sm" style={{ width: "auto" }} onClick={() => { simMarkAlertsRead(s.alerts.map((a) => a.id)); onClose(); }}>
            Mark all read
          </Button>
        ) : (
          <span className="cell-sub">All read</span>
        )}
      </div>
      <div className="alerts__list">
        {list.length ? (
          list.map((a) => (
            <button
              key={a.id}
              type="button"
              className={"alert-item" + (a.read ? "" : " unread")}
              onClick={() => {
                simMarkAlertsRead([a.id]);
                onClose();
                if (a.ref.type === "vehicle") admin.openVehicle(a.ref.id);
                else admin.openRider(a.ref.id);
              }}
            >
              <span className={"tl-dot " + ALERT_TONE[a.level][1]}>
                <Icon name={ALERT_TONE[a.level][0]} size={15} />
              </span>
              <span>
                <b>{a.title}</b>
                <p>{a.body}</p>
                <time>
                  {U.relTime(a.at, D.now())} · {U.fmtDateTime(a.at)}
                </time>
              </span>
            </button>
          ))
        ) : (
          <p className="cell-sub" style={{ padding: 14 }}>No alerts.</p>
        )}
      </div>
    </>
  );
}

function ProfileMenu({ onClose }: { onClose: () => void }) {
  const admin = useAdmin();
  const cfg = store.state.config.admin;
  return (
    <>
      <div className="menu__head">
        <b>{cfg.name}</b>
        <small>{cfg.id}</small>
      </div>
      <Link href="/settings" onClick={onClose}>
        <Icon name="settings" size={16} />
        Settings
      </Link>
      <a href={RIDER_APP_URL} target="_blank" rel="noopener">
        <Icon name="smartphone" size={16} />
        Open Rider App
      </a>
<hr />
      <button type="button" className="danger" onClick={() => { onClose(); admin.logout(); }}>
        <Icon name="logout" size={16} />
        Log out
      </button>
    </>
  );
}

/* ------------------------------------------------------------------ global search */
function GlobalSearch() {
  const admin = useAdmin();
  const s = useStore();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hide = () => {
    setOpen(false);
    setQ("");
  };

  // '/' focuses the search; clicking elsewhere closes the results; Esc clears.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !t.closest("input, textarea, select")) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape" && open) hide();
    };
    const onClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("#gsearch")) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [open]);

  const query = q.trim().toLowerCase().replace(/\s/g, "");
  const riders = q.trim() ? s.riders.filter((r) => matchRider(r, q)).slice(0, 5) : [];
  const vs = q.trim()
    ? s.vehicles.filter((v) => [v.regNo, v.chassisNo, v.motorNo, v.controllerNo].some((x) => x.toLowerCase().replace(/\s/g, "").includes(query))).slice(0, 5)
    : [];
  const expanded = open && !!q.trim();

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "Enter") {
      const first = wrapRef.current?.querySelector<HTMLElement>(".gsearch__item");
      if (first) {
        e.preventDefault();
        if (e.key === "Enter") first.click();
        else first.focus();
      }
    }
  };
  const onItemKey = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const el = e.currentTarget;
    const sib = (e.key === "ArrowDown" ? el.nextElementSibling : el.previousElementSibling) as HTMLElement | null;
    if (sib) sib.focus();
    else if (e.key === "ArrowUp") inputRef.current?.focus();
  };

  return (
    <div className="gsearch" id="gsearch" ref={wrapRef}>
      <label className="sr-only" htmlFor="gq">Global search</label>
      <Icon name="search" size={16} />
      <input
        ref={inputRef}
        id="gq"
        type="search"
        placeholder="Search riders & vehicles…"
        autoComplete="off"
        role="combobox"
        aria-expanded={expanded}
        aria-controls="gq-results"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(!!e.target.value.trim());
        }}
        onKeyDown={onInputKey}
      />
      <kbd>/</kbd>
      <div className="gsearch__results" id="gq-results" role="listbox" hidden={!expanded}>
        {riders.length || vs.length ? (
          <>
            {riders.map((r) => (
              <button key={r.id} type="button" className="gsearch__item" role="option" aria-selected={false} onKeyDown={onItemKey} onClick={() => { hide(); admin.openRider(r.id); }}>
                <Avatar name={r.name} />
                <span>
                  <b>{r.name}</b>
                  <small>{r.customerId || "Applicant"} · {U.phone(r.phone)}</small>
                </span>
              </button>
            ))}
            {vs.map((v) => (
              <button key={v.id} type="button" className="gsearch__item" role="option" aria-selected={false} onKeyDown={onItemKey} onClick={() => { hide(); admin.openVehicle(v.id); }}>
                <span className="avatar" style={{ background: "var(--info-muted)", color: "var(--info)" }}>
                  <Icon name="scooter" size={16} />
                </span>
                <span>
                  <b>{v.regNo}</b>
                  <small>Chassis {v.chassisNo} · {ASSET[v.status][1]}</small>
                </span>
              </button>
            ))}
          </>
        ) : (
          <div className="gsearch__empty">No riders or vehicles match “{q}”</div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ shell */
export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const route = pathname.replace(/^\//, "").split("/")[0] || "dashboard";
  const admin = useAdmin();
  const s = useStore();
  const clock = useDemoClock();
  // Nav + menus are tied to the route they were opened on, so navigating closes them (as in the prototype).
  const [navPath, setNavPath] = useState<string | null>(null);
  const [menuState, setMenuState] = useState<{ kind: "alerts" | "profile"; anchor: HTMLElement; path: string } | null>(null);
  const navOpen = navPath === pathname;
  const menu = menuState && menuState.path === pathname ? menuState : null;
  const contentRef = useRef<HTMLElement>(null);
  const c = counts();

  const setNavOpen = (open: boolean) => setNavPath(open ? pathname : null);
  const setMenu = (m: { kind: "alerts" | "profile"; anchor: HTMLElement } | null) => setMenuState(m ? { ...m, path: pathname } : null);
  const closeNav = () => setNavOpen(false);

  // On navigation (not on first load) scroll to the top and move focus to the content region, like the
  // prototype's hashchange handler.
  const lastPath = useRef(pathname);
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    window.scrollTo(0, 0);
    contentRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  // Global dismissal: click outside a menu, Esc.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (menu && !t.closest(".menu") && !t.closest("[data-menu-toggle]")) setMenuState(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuState(null);
        if (window.innerWidth <= 960) setNavPath(null);
      }
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const toggleMenu = (kind: "alerts" | "profile", anchor: HTMLElement) => setMenu(menu && menu.kind === kind ? null : { kind, anchor });

  const badges: Record<string, ReactNode> = {
    onboarding: c.pendingApps ? <span className="nav-count nav-count--warn">{c.pendingApps}</span> : null,
    recovery: c.recovery ? <span className="nav-count nav-count--err">{c.recovery}</span> : null,
    assignment: c.eligible ? <span className="nav-count">{c.eligible}</span> : null,
  };

  return (
    <div className="layout">
      <aside className={"sidebar" + (navOpen ? " is-open" : "")} id="sidebar" aria-label="Main navigation">
        <div className="sidebar__brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/qvek-mark-white.png" alt="Qvek logo" />
          <div>
            <b>QVEK</b>
            <span>Admin panel</span>
          </div>
        </div>
        <nav className="sidebar__nav" id="sidenav">
          {NAV.map((g) => (
            <div className="nav-group" key={g.group}>
              <p>{g.group}</p>
              {g.items.map((n) => (
                <Link key={n.id} className="nav-link" href={"/" + n.id} aria-current={route === n.id ? "page" : undefined} onClick={() => { if (window.innerWidth <= 960) closeNav(); }}>
                  <Icon name={n.icon} size={18} />
                  <span>{n.label}</span>
                  {badges[n.id] || null}
                </Link>
              ))}
            </div>
          ))}
          <div className="nav-group">
            <button type="button" className="nav-link" onClick={() => admin.logout()}>
              <Icon name="logout" size={18} />
              <span>Log out</span>
            </button>
          </div>
        </nav>
        <div className="sidebar__foot">
          <div className="demo-card">
            <b>
              <Icon name="signal" size={14} />
              Live data
            </b>
            Connected to the Qvek API. Immobilize / unlock are simulated.
            <span className="clock">{U.fmtDateTime(clock)}</span>
            <a className="link" href={RIDER_APP_URL} target="_blank" rel="noopener" style={{ display: "inline-flex", gap: 4, alignItems: "center", marginTop: 6, fontSize: 12 }}>
              <Icon name="smartphone" size={13} />
              Open Rider App
            </a>
          </div>
        </div>
      </aside>
      <div className={"overlay" + (navOpen ? " is-open" : "")} id="overlay" onClick={closeNav} />
      <div className="main">
        <header className="topbar">
          <button type="button" className="icon-btn topbar__menu" aria-label="Open navigation" onClick={() => setNavOpen(true)}>
            <Icon name="menu" size={20} />
          </button>
          <div className="crumbs">
            <span className="crumb-root">Qvek Admin</span>
            <span className="crumb-root">
              <Icon name="chevronRight" size={14} />
            </span>
            <b id="crumb">{titleFor(route)}</b>
          </div>
          <GlobalSearch />
          <div className="topbar__actions">
            <span className="clock-chip" title="Current time">
              <Icon name="clock" size={14} />
              <span className="lbl">Now</span>
              <b>{U.fmtDateTime(clock)}</b>
            </span>
            <button type="button" className="icon-btn" id="alerts-btn" data-menu-toggle aria-label="Alerts" aria-haspopup="true" onClick={(e) => toggleMenu("alerts", e.currentTarget)}>
              <Icon name="bell" size={19} />
              <span id="alerts-dot">{c.unreadAlerts ? <span className="dot">{c.unreadAlerts}</span> : null}</span>
            </button>
            <button type="button" className="profile-btn" data-menu-toggle aria-haspopup="true" aria-label="Admin menu" onClick={(e) => toggleMenu("profile", e.currentTarget)}>
              <span className="avatar">FA</span>
              <span className="who">
                <b>{s.config.admin.name}</b>
                <small>{s.config.admin.id}</small>
              </span>
              <Icon name="chevronDown" size={15} />
            </button>
          </div>
        </header>
        <main className="content" id="content" tabIndex={-1} ref={contentRef}>
          {children}
        </main>
      </div>
      {menu ? (
        <AnchoredMenu key={menu.kind} anchor={menu.anchor} className={menu.kind}>
          {menu.kind === "alerts" ? <AlertsMenu onClose={() => setMenu(null)} /> : <ProfileMenu onClose={() => setMenu(null)} />}
        </AnchoredMenu>
      ) : null}
    </div>
  );
}
