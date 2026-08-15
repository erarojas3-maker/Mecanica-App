import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Wrench, Users, Car, ClipboardList, Plus, X, Camera, Video,
  Phone, Mail, ChevronRight, Search, Trash2, Edit2, Share2,
  CheckCircle2, Clock, AlertCircle, PackageCheck, ImageOff, Loader2,
  FileText, DollarSign, Receipt, Settings, Lock, Image as ImageIcon, Unlock
} from "lucide-react";

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------
const COLORS = {
  bg: "#1B1D21",
  surface: "#232629",
  surfaceRaised: "#2B2F33",
  border: "#3A3E43",
  borderLight: "#4A4F55",
  text: "#F0EFEC",
  textMuted: "#9CA1A8",
  textFaint: "#6B7076",
  accent: "#D9722C", // taller orange
  accentDim: "#8A4D24",
  steel: "#5C8AA6", // steel blue
  green: "#5FA875",
  amber: "#D9A441",
  red: "#C25B4E",
};

const STATUS = {
  recibido: { label: "Recibido", color: COLORS.steel, icon: PackageCheck },
  diagnostico: { label: "Diagnóstico", color: COLORS.amber, icon: Search },
  reparacion: { label: "En reparación", color: COLORS.accent, icon: Wrench },
  listo: { label: "Listo", color: COLORS.green, icon: CheckCircle2 },
  entregado: { label: "Entregado", color: COLORS.textFaint, icon: CheckCircle2 },
};
const STATUS_ORDER = ["recibido", "diagnostico", "reparacion", "listo", "entregado"];

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const money = (n) => `₡${(Number(n) || 0).toLocaleString("es-CR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ---------------------------------------------------------------------------
// Storage helpers — llaman a la API real (Express + Postgres en Render)
// Todos los usuarios que abren la app ven los mismos datos, guardados
// en la base de datos, no en el dispositivo.
// ---------------------------------------------------------------------------
const API_BASE = "/api/store";

async function loadList(key) {
  try {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(key)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.value) ? data.value : [];
  } catch (e) {
    console.error("error cargando", key, e);
    return [];
  }
}
async function saveList(key, value) {
  try {
    await fetch(`${API_BASE}/${encodeURIComponent(key)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
  } catch (e) {
    console.error("error guardando", key, e);
  }
}
async function loadSettings() {
  try {
    const res = await fetch(`${API_BASE}/${encodeURIComponent("taller:settings")}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.value || null;
  } catch {
    return null;
  }
}
async function saveSettings(value) {
  try {
    await fetch(`${API_BASE}/${encodeURIComponent("taller:settings")}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
  } catch (e) {
    console.error("error guardando ajustes", e);
  }
}

// ---------------------------------------------------------------------------
// Small UI primitives
// ---------------------------------------------------------------------------
function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
      <span style={{ color: COLORS.textMuted, fontWeight: 600, letterSpacing: 0.3 }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle = {
  background: COLORS.bg,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8,
  padding: "10px 12px",
  color: COLORS.text,
  fontSize: 15,
  outline: "none",
  fontFamily: "inherit",
};

function TextInput(props) {
  const [focus, setFocus] = useState(false);
  return (
    <input
      {...props}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={{
        ...inputStyle,
        borderColor: focus ? COLORS.accent : COLORS.border,
        ...props.style,
      }}
    />
  );
}

function Button({ variant = "primary", children, style, ...props }) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
    padding: "10px 16px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    border: "1px solid transparent",
    transition: "filter 0.15s ease, transform 0.05s ease",
    fontFamily: "inherit",
  };
  const variants = {
    primary: { background: COLORS.accent, color: "#1B1D21" },
    ghost: { background: "transparent", color: COLORS.text, borderColor: COLORS.border },
    danger: { background: "transparent", color: COLORS.red, borderColor: COLORS.red },
    steel: { background: COLORS.steel, color: "#0F1A20" },
  };
  return (
    <button
      {...props}
      style={{ ...base, ...variants[variant], ...style }}
      onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.recibido;
  const Icon = s.icon;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 0.3,
        color: s.color,
        background: `${s.color}22`,
        border: `1px solid ${s.color}55`,
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={13} />
      {s.label}
    </span>
  );
}

function Modal({ title, onClose, children, width = 480 }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(10,11,12,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 50, padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: COLORS.surface, border: `1px solid ${COLORS.border}`,
          borderRadius: 14, width: "100%", maxWidth: width,
          maxHeight: "88vh", overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 20px", borderBottom: `1px solid ${COLORS.border}`,
          position: "sticky", top: 0, background: COLORS.surface, zIndex: 1,
        }}>
          <h3 style={{ margin: 0, fontSize: 17, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 0.4, textTransform: "uppercase" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer", padding: 4 }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "60px 20px", color: COLORS.textFaint, textAlign: "center", gap: 8,
    }}>
      <Icon size={32} strokeWidth={1.5} />
      <div style={{ fontSize: 15, color: COLORS.textMuted, fontWeight: 600 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13 }}>{subtitle}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main App
// ---------------------------------------------------------------------------
export default function TallerApp() {
  const [tab, setTab] = useState("dashboard");
  const [clients, setClients] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [settings, setSettings] = useState({ name: "Mi Taller", logo: null, adminPin: null });
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("");
  const [pendingInvoiceOrder, setPendingInvoiceOrder] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    (async () => {
      const [c, v, o, i, s] = await Promise.all([
        loadList("taller:clients"),
        loadList("taller:vehicles"),
        loadList("taller:orders"),
        loadList("taller:invoices"),
        loadSettings(),
      ]);
      setClients(c);
      setVehicles(v);
      setOrders(o);
      setInvoices(i);
      if (s) setSettings((prev) => ({ ...prev, ...s }));
      setLoading(false);
    })();
  }, []);

  const persist = useCallback(async (key, value) => {
    setSaveStatus("Guardando...");
    await saveList(key, value);
    setSaveStatus("Guardado");
    setTimeout(() => setSaveStatus(""), 1200);
  }, []);

  const updateClients = useCallback((next) => {
    setClients(next);
    persist("taller:clients", next);
  }, [persist]);
  const updateVehicles = useCallback((next) => {
    setVehicles(next);
    persist("taller:vehicles", next);
  }, [persist]);
  const updateOrders = useCallback((next) => {
    setOrders(next);
    persist("taller:orders", next);
  }, [persist]);
  const updateInvoices = useCallback((next) => {
    setInvoices(next);
    persist("taller:invoices", next);
  }, [persist]);
  const updateSettings = useCallback((next) => {
    setSettings(next);
    setSaveStatus("Guardando...");
    saveSettings(next).then(() => {
      setSaveStatus("Guardado");
      setTimeout(() => setSaveStatus(""), 1200);
    });
  }, []);

  const clientById = useMemo(() => Object.fromEntries(clients.map((c) => [c.id, c])), [clients]);
  const vehicleById = useMemo(() => Object.fromEntries(vehicles.map((v) => [v.id, v])), [vehicles]);

  const NAV = [
    { id: "dashboard", label: "Panel", icon: ClipboardList },
    { id: "orders", label: "Órdenes", icon: Wrench },
    { id: "invoices", label: "Facturas", icon: Receipt },
    { id: "vehicles", label: "Vehículos", icon: Car },
    { id: "clients", label: "Clientes", icon: Users },
  ];

  if (loading) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center", height: 500,
        background: COLORS.bg, color: COLORS.textMuted, fontFamily: "Inter, sans-serif",
      }}>
        <Loader2 className="spin" size={22} style={{ marginRight: 10 }} />
        Cargando taller...
        <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="app-shell" style={{
      display: "flex", height: "100%", minHeight: "100vh", background: COLORS.bg, color: COLORS.text,
      fontFamily: "'Inter', -apple-system, sans-serif", overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::placeholder { color: ${COLORS.textFaint}; }
        button { font-family: inherit; }

        .app-shell { flex-direction: row; }
        .sidebar { width: 200px; flex-direction: column; padding: 18px 12px; border-right: 1px solid ${COLORS.border}; border-bottom: none; }
        .sidebar-brand { display: flex; }
        .nav-btn { flex-direction: row; justify-content: flex-start; gap: 10px; font-size: 14px; padding: 10px 10px; }
        .nav-btn span.nav-label { display: inline; }
        .sidebar-spacer { display: block; }
        .save-status { display: block; }
        .content-area { padding: 24px 28px; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .vehicles-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .parts-row { display: flex; gap: 6px; align-items: center; }
        .parts-row .part-name { flex: 1; }
        .parts-row .part-qty { width: 54px; }
        .parts-row .part-cost { width: 90px; }
        .invoice-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

        @media (max-width: 700px) {
          .app-shell { flex-direction: column; min-height: 100dvh; }
          .sidebar {
            width: 100%; flex-direction: row; align-items: center; padding: 8px 8px;
            border-right: none; border-bottom: 1px solid ${COLORS.border}; order: 2;
            position: sticky; bottom: 0; background: ${COLORS.surface}; overflow-x: auto;
            gap: 2px; z-index: 5;
          }
          .sidebar-brand { display: none; }
          .sidebar-spacer { display: none; }
          .save-status { display: none; }
          .nav-btn {
            flex-direction: column; gap: 3px; font-size: 10px; padding: 7px 6px;
            flex: 1; min-width: 56px; text-align: center; align-items: center;
          }
          .content-area { padding: 16px; order: 1; }
          .stats-grid { grid-template-columns: repeat(3, 1fr); gap: 8px; }
          .vehicles-grid { grid-template-columns: 1fr; }
          .two-col { grid-template-columns: 1fr; }
          .parts-row { flex-wrap: wrap; }
          .parts-row .part-name { flex: 1 1 100%; }
          .parts-row .part-qty { flex: 1; width: auto; }
          .parts-row .part-cost { flex: 1; width: auto; }
          .invoice-info-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Sidebar */}
      <div className="sidebar" style={{
        background: COLORS.surface, display: "flex", flexShrink: 0,
      }}>
        <div className="sidebar-brand" style={{ alignItems: "center", gap: 8, padding: "0 8px 20px 8px" }}>
          {settings.logo ? (
            <img src={settings.logo} alt="logo" style={{ width: 30, height: 30, borderRadius: 7, objectFit: "cover" }} />
          ) : (
            <div style={{
              width: 30, height: 30, borderRadius: 7, background: COLORS.accent,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Wrench size={16} color="#1B1D21" strokeWidth={2.5} />
            </div>
          )}
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 19, fontWeight: 700,
            letterSpacing: 0.5, textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{settings.name || "Mi Taller"}</span>
        </div>
        {NAV.map((n) => {
          const Icon = n.icon;
          const active = tab === n.id;
          return (
            <button
              key={n.id}
              className="nav-btn"
              onClick={() => setTab(n.id)}
              style={{
                display: "flex", alignItems: "center",
                borderRadius: 8, border: "none", cursor: "pointer", marginBottom: 2,
                background: active ? COLORS.surfaceRaised : "transparent",
                color: active ? COLORS.accent : COLORS.textMuted,
                fontWeight: 600,
              }}
            >
              <Icon size={17} />
              <span className="nav-label">{n.label}</span>
            </button>
          );
        })}
        <div className="sidebar-spacer" style={{ flex: 1 }} />
        <button
          className="nav-btn"
          onClick={() => setShowSettings(true)}
          style={{
            display: "flex", alignItems: "center", borderRadius: 8, border: "none",
            cursor: "pointer", marginBottom: 2, background: "transparent", color: COLORS.textMuted, fontWeight: 600,
          }}
        >
          <Settings size={17} />
          <span className="nav-label">Ajustes</span>
        </button>
        <div className="save-status" style={{ fontSize: 11, color: COLORS.textFaint, padding: "0 8px", minHeight: 16 }}>
          {saveStatus}
        </div>
      </div>

      {/* Content */}
      <div className="content-area" style={{ flex: 1, overflowY: "auto" }}>
        {tab === "dashboard" && (
          <Dashboard
            clients={clients} vehicles={vehicles} orders={orders}
            vehicleById={vehicleById} clientById={clientById} setTab={setTab}
          />
        )}
        {tab === "clients" && (
          <ClientsView clients={clients} vehicles={vehicles} updateClients={updateClients} />
        )}
        {tab === "vehicles" && (
          <VehiclesView
            vehicles={vehicles} clients={clients} clientById={clientById}
            updateVehicles={updateVehicles}
          />
        )}
        {tab === "orders" && (
          <OrdersView
            orders={orders} vehicles={vehicles} clients={clients}
            vehicleById={vehicleById} clientById={clientById}
            updateOrders={updateOrders}
            onCreateInvoice={(order) => { setPendingInvoiceOrder(order); setTab("invoices"); }}
          />
        )}
        {tab === "invoices" && (
          <InvoicesView
            invoices={invoices} vehicles={vehicles} orders={orders}
            vehicleById={vehicleById} clientById={clientById}
            updateInvoices={updateInvoices}
            prefillOrder={pendingInvoiceOrder}
            clearPrefill={() => setPendingInvoiceOrder(null)}
          />
        )}
      </div>

      {showSettings && (
        <SettingsModal settings={settings} onSave={updateSettings} onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
function Dashboard({ clients, vehicles, orders, vehicleById, clientById, setTab }) {
  const active = orders.filter((o) => o.status !== "entregado");
  const byStatus = STATUS_ORDER.map((s) => ({
    status: s, count: orders.filter((o) => o.status === s).length,
  }));

  const stats = [
    { label: "Clientes", value: clients.length, icon: Users, color: COLORS.steel },
    { label: "Vehículos", value: vehicles.length, icon: Car, color: COLORS.amber },
    { label: "Órdenes activas", value: active.length, icon: Wrench, color: COLORS.accent },
  ];

  return (
    <div>
      <PageHeader title="Panel general" subtitle="Resumen del taller" />
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {stats.map((s) => (
          <div key={s.label} style={{
            background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 18,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, background: `${s.color}22`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <s.icon size={16} color={s.color} />
              </div>
              <span style={{ fontSize: 13, color: COLORS.textMuted, fontWeight: 600 }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif" }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{
        background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12,
        padding: 18, marginBottom: 24,
      }}>
        <div style={{ fontSize: 13, color: COLORS.textMuted, fontWeight: 700, marginBottom: 14, letterSpacing: 0.3, textTransform: "uppercase" }}>
          Órdenes por estado
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {byStatus.map(({ status, count }) => {
            const s = STATUS[status];
            const max = Math.max(1, ...byStatus.map((b) => b.count));
            return (
              <div key={status} style={{ flex: 1, textAlign: "center" }}>
                <div style={{
                  height: 80, display: "flex", alignItems: "flex-end", justifyContent: "center", marginBottom: 8,
                }}>
                  <div style={{
                    width: "60%", background: s.color, opacity: count === 0 ? 0.2 : 0.85,
                    borderRadius: "4px 4px 0 0", height: `${Math.max(6, (count / max) * 80)}px`,
                    transition: "height 0.3s ease",
                  }} />
                </div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{count}</div>
                <div style={{ fontSize: 11, color: COLORS.textMuted }}>{s.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: COLORS.textMuted, fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase" }}>
          Órdenes activas
        </div>
        <button onClick={() => setTab("orders")} style={{
          background: "none", border: "none", color: COLORS.accent, fontSize: 13, fontWeight: 600,
          cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
        }}>
          Ver todas <ChevronRight size={14} />
        </button>
      </div>
      {active.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No hay órdenes activas" subtitle="Crea una orden desde la pestaña Órdenes" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {active.slice(0, 5).map((o) => {
            const v = vehicleById[o.vehicleId];
            const c = v ? clientById[v.clientId] : null;
            return (
              <div key={o.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "12px 16px",
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {v ? `${v.make} ${v.model} · ${v.plate}` : "Vehículo eliminado"}
                  </div>
                  <div style={{ fontSize: 12, color: COLORS.textMuted }}>
                    {c?.name || "Cliente sin datos"} · {o.description || "Sin descripción"}
                  </div>
                </div>
                <StatusBadge status={o.status} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 22 }}>
      <div>
        <h1 style={{
          margin: 0, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, fontWeight: 700,
          letterSpacing: 0.3, textTransform: "uppercase",
        }}>{title}</h1>
        {subtitle && <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 2 }}>{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------
function ClientsView({ clients, vehicles, updateClients }) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null); // null | {} | client
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = clients.filter((c) =>
    (c.name + c.phone + c.email).toLowerCase().includes(query.toLowerCase())
  );

  const save = (data) => {
    if (data.id) {
      updateClients(clients.map((c) => (c.id === data.id ? data : c)));
    } else {
      updateClients([...clients, { ...data, id: uid() }]);
    }
    setEditing(null);
  };

  const remove = (id) => {
    updateClients(clients.filter((c) => c.id !== id));
    setConfirmDelete(null);
  };

  return (
    <div>
      <PageHeader
        title="Clientes" subtitle={`${clients.length} registrados`}
        action={<Button onClick={() => setEditing({})}><Plus size={16} /> Nuevo cliente</Button>}
      />
      <div style={{ marginBottom: 16, position: "relative", maxWidth: 320 }}>
        <Search size={15} style={{ position: "absolute", left: 12, top: 12, color: COLORS.textFaint }} />
        <TextInput placeholder="Buscar cliente..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ paddingLeft: 36, width: "100%" }} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="Sin clientes" subtitle="Agrega tu primer cliente para comenzar" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((c) => {
            const vCount = vehicles.filter((v) => v.clientId === c.id).length;
            return (
              <div key={c.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "14px 16px",
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</div>
                  <div style={{ display: "flex", gap: 14, fontSize: 12, color: COLORS.textMuted, marginTop: 3 }}>
                    {c.phone && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Phone size={11} />{c.phone}</span>}
                    {c.email && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Mail size={11} />{c.email}</span>}
                    <span>{vCount} vehículo{vCount !== 1 ? "s" : ""}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <IconBtn onClick={() => setEditing(c)}><Edit2 size={14} /></IconBtn>
                  <IconBtn onClick={() => setConfirmDelete(c.id)} danger><Trash2 size={14} /></IconBtn>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <ClientModal client={editing} onClose={() => setEditing(null)} onSave={save} />
      )}
      {confirmDelete && (
        <ConfirmModal
          text="¿Eliminar este cliente? Sus vehículos no se eliminarán, pero quedarán sin cliente asignado."
          onCancel={() => setConfirmDelete(null)} onConfirm={() => remove(confirmDelete)}
        />
      )}
    </div>
  );
}

function IconBtn({ children, danger, ...props }) {
  return (
    <button {...props} style={{
      width: 30, height: 30, borderRadius: 7, border: `1px solid ${COLORS.border}`,
      background: "transparent", color: danger ? COLORS.red : COLORS.textMuted,
      display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
    }}>
      {children}
    </button>
  );
}

function ClientModal({ client, onClose, onSave }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", ...client });
  return (
    <Modal title={client.id ? "Editar cliente" : "Nuevo cliente"} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Nombre completo">
          <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. Carlos Rodríguez" />
        </Field>
        <Field label="Teléfono">
          <TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="8888-8888" />
        </Field>
        <Field label="Correo (opcional)">
          <TextInput value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="cliente@correo.com" />
        </Field>
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <Button onClick={() => form.name.trim() && onSave(form)} disabled={!form.name.trim()} style={{ opacity: form.name.trim() ? 1 : 0.5 }}>
            Guardar
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        </div>
      </div>
    </Modal>
  );
}

function ConfirmModal({ text, onCancel, onConfirm }) {
  return (
    <Modal title="Confirmar" onClose={onCancel} width={380}>
      <p style={{ fontSize: 14, color: COLORS.textMuted, lineHeight: 1.5, marginTop: 0 }}>{text}</p>
      <div style={{ display: "flex", gap: 8 }}>
        <Button variant="danger" onClick={onConfirm}>Eliminar</Button>
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Vehicles
// ---------------------------------------------------------------------------
function VehiclesView({ vehicles, clients, clientById, updateVehicles }) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = vehicles.filter((v) =>
    (v.make + v.model + v.plate).toLowerCase().includes(query.toLowerCase())
  );

  const save = (data) => {
    if (data.id) updateVehicles(vehicles.map((v) => (v.id === data.id ? data : v)));
    else updateVehicles([...vehicles, { ...data, id: uid() }]);
    setEditing(null);
  };
  const remove = (id) => {
    updateVehicles(vehicles.filter((v) => v.id !== id));
    setConfirmDelete(null);
  };

  return (
    <div>
      <PageHeader
        title="Vehículos" subtitle={`${vehicles.length} registrados`}
        action={<Button onClick={() => setEditing({})} disabled={clients.length === 0}>
          <Plus size={16} /> Nuevo vehículo
        </Button>}
      />
      {clients.length === 0 && (
        <div style={{ fontSize: 13, color: COLORS.amber, marginBottom: 14 }}>
          Agrega primero un cliente para poder registrar vehículos.
        </div>
      )}
      <div style={{ marginBottom: 16, position: "relative", maxWidth: 320 }}>
        <Search size={15} style={{ position: "absolute", left: 12, top: 12, color: COLORS.textFaint }} />
        <TextInput placeholder="Buscar por placa, marca..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ paddingLeft: 36, width: "100%" }} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Car} title="Sin vehículos" subtitle="Registra el primer vehículo de un cliente" />
      ) : (
        <div className="vehicles-grid">
          {filtered.map((v) => (
            <div key={v.id} style={{
              background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 16,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{v.make} {v.model}</div>
                  <div style={{ fontSize: 12, color: COLORS.textMuted }}>{v.year || "—"}</div>
                </div>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14,
                  background: COLORS.bg, border: `1.5px solid ${COLORS.borderLight}`, borderRadius: 5,
                  padding: "3px 8px", letterSpacing: 1,
                }}>
                  {v.plate || "S/P"}
                </div>
              </div>
              <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 12 }}>
                {clientById[v.clientId]?.name || "Sin cliente asignado"}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <IconBtn onClick={() => setEditing(v)}><Edit2 size={14} /></IconBtn>
                <IconBtn onClick={() => setConfirmDelete(v.id)} danger><Trash2 size={14} /></IconBtn>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <VehicleModal vehicle={editing} clients={clients} onClose={() => setEditing(null)} onSave={save} />}
      {confirmDelete && (
        <ConfirmModal
          text="¿Eliminar este vehículo? Las órdenes de trabajo asociadas conservarán el historial pero sin vínculo activo."
          onCancel={() => setConfirmDelete(null)} onConfirm={() => remove(confirmDelete)}
        />
      )}
    </div>
  );
}

function VehicleModal({ vehicle, clients, onClose, onSave }) {
  const [form, setForm] = useState({
    clientId: clients[0]?.id || "", make: "", model: "", year: "", plate: "", vin: "", ...vehicle,
  });
  return (
    <Modal title={vehicle.id ? "Editar vehículo" : "Nuevo vehículo"} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Cliente">
          <select
            value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}
            style={{ ...inputStyle }}
          >
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <div className="two-col">
          <Field label="Marca"><TextInput value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} placeholder="Toyota" /></Field>
          <Field label="Modelo"><TextInput value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="Corolla" /></Field>
        </div>
        <div className="two-col">
          <Field label="Año"><TextInput value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="2018" /></Field>
          <Field label="Placa"><TextInput value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value.toUpperCase() })} placeholder="ABC-123" /></Field>
        </div>
        <Field label="VIN (opcional)">
          <TextInput value={form.vin} onChange={(e) => setForm({ ...form, vin: e.target.value })} placeholder="Número de chasis" />
        </Field>
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <Button onClick={() => form.make.trim() && onSave(form)} style={{ opacity: form.make.trim() ? 1 : 0.5 }}>Guardar</Button>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------
function OrdersView({ orders, vehicles, clients, vehicleById, clientById, updateOrders, onCreateInvoice }) {
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = filterStatus === "all" ? orders : orders.filter((o) => o.status === filterStatus);
  const sorted = [...filtered].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const save = (data) => {
    if (data.id) updateOrders(orders.map((o) => (o.id === data.id ? data : o)));
    else updateOrders([...orders, { ...data, id: uid(), createdAt: Date.now(), media: data.media || [] }]);
    setEditing(null);
  };
  const remove = (id) => {
    updateOrders(orders.filter((o) => o.id !== id));
    setConfirmDelete(null);
    setViewing(null);
  };

  return (
    <div>
      <PageHeader
        title="Órdenes de trabajo" subtitle={`${orders.length} en total`}
        action={<Button onClick={() => setEditing({})} disabled={vehicles.length === 0}>
          <Plus size={16} /> Nueva orden
        </Button>}
      />
      {vehicles.length === 0 && (
        <div style={{ fontSize: 13, color: COLORS.amber, marginBottom: 14 }}>
          Registra un vehículo primero para poder crear una orden.
        </div>
      )}

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        <FilterChip active={filterStatus === "all"} onClick={() => setFilterStatus("all")}>Todas</FilterChip>
        {STATUS_ORDER.map((s) => (
          <FilterChip key={s} active={filterStatus === s} onClick={() => setFilterStatus(s)} color={STATUS[s].color}>
            {STATUS[s].label}
          </FilterChip>
        ))}
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={Wrench} title="Sin órdenes" subtitle="Crea la primera orden de trabajo" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sorted.map((o) => {
            const v = vehicleById[o.vehicleId];
            const c = v ? clientById[v.clientId] : null;
            return (
              <div key={o.id} onClick={() => setViewing(o)} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10,
                padding: "14px 16px", cursor: "pointer",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {o.media?.length > 0 && (
                    <div style={{
                      width: 34, height: 34, borderRadius: 7, background: COLORS.bg,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <Camera size={14} color={COLORS.textMuted} />
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      {v ? `${v.make} ${v.model} · ${v.plate}` : "Vehículo eliminado"}
                    </div>
                    <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
                      {c?.name || "—"} · {o.description || "Sin descripción"}
                    </div>
                  </div>
                </div>
                <StatusBadge status={o.status} />
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <OrderModal order={editing} vehicles={vehicles} clientById={clientById} vehicleById={vehicleById} onClose={() => setEditing(null)} onSave={save} />
      )}
      {viewing && (
        <OrderDetailModal
          order={viewing} vehicle={vehicleById[viewing.vehicleId]} client={clientById[vehicleById[viewing.vehicleId]?.clientId]}
          onClose={() => setViewing(null)}
          onEdit={() => { setEditing(viewing); setViewing(null); }}
          onDelete={() => setConfirmDelete(viewing.id)}
          onUpdate={(next) => { save(next); setViewing(next); }}
          onCreateInvoice={() => { onCreateInvoice(viewing); setViewing(null); }}
        />
      )}
      {confirmDelete && (
        <ConfirmModal text="¿Eliminar esta orden de trabajo y todo su respaldo de fotos/videos?" onCancel={() => setConfirmDelete(null)} onConfirm={() => remove(confirmDelete)} />
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children, color }) {
  return (
    <button onClick={onClick} style={{
      padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer",
      border: `1px solid ${active ? (color || COLORS.accent) : COLORS.border}`,
      background: active ? `${color || COLORS.accent}22` : "transparent",
      color: active ? (color || COLORS.accent) : COLORS.textMuted,
    }}>
      {children}
    </button>
  );
}

function OrderModal({ order, vehicles, vehicleById, clientById, onClose, onSave }) {
  const [form, setForm] = useState({
    vehicleId: vehicles[0]?.id || "", description: "", status: "recibido", mechanic: "", ...order,
  });
  return (
    <Modal title={order.id ? "Editar orden" : "Nueva orden de trabajo"} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Vehículo">
          <select value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })} style={inputStyle}>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.make} {v.model} · {v.plate} ({clientById[v.clientId]?.name || "sin cliente"})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Descripción del trabajo">
          <textarea
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Ej. Cambio de frenos delanteros" rows={3}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
          />
        </Field>
        <Field label="Mecánico asignado (opcional)">
          <TextInput value={form.mechanic} onChange={(e) => setForm({ ...form, mechanic: e.target.value })} placeholder="Nombre del mecánico" />
        </Field>
        <Field label="Estado">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {STATUS_ORDER.map((s) => (
              <FilterChip key={s} active={form.status === s} onClick={() => setForm({ ...form, status: s })} color={STATUS[s].color}>
                {STATUS[s].label}
              </FilterChip>
            ))}
          </div>
        </Field>
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <Button onClick={() => vehicles.length && onSave(form)} style={{ opacity: vehicles.length ? 1 : 0.5 }}>Guardar</Button>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        </div>
      </div>
    </Modal>
  );
}

function OrderDetailModal({ order, vehicle, client, onClose, onEdit, onDelete, onUpdate, onCreateInvoice }) {
  const [uploading, setUploading] = useState(false);

  const handleFiles = (fileList) => {
    const files = Array.from(fileList).slice(0, 5);
    setUploading(true);
    let processed = 0;
    const newMedia = [];
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        newMedia.push({
          id: uid(),
          type: file.type.startsWith("video") ? "video" : "photo",
          dataUrl: reader.result,
          shared: false,
          addedAt: Date.now(),
        });
        processed += 1;
        if (processed === files.length) {
          onUpdate({ ...order, media: [...(order.media || []), ...newMedia] });
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    });
    if (files.length === 0) setUploading(false);
  };

  const toggleShare = (mediaId) => {
    onUpdate({
      ...order,
      media: order.media.map((m) => (m.id === mediaId ? { ...m, shared: !m.shared } : m)),
    });
  };

  const removeMedia = (mediaId) => {
    onUpdate({ ...order, media: order.media.filter((m) => m.id !== mediaId) });
  };

  return (
    <Modal title="Detalle de orden" onClose={onClose} width={560}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 17 }}>
            {vehicle ? `${vehicle.make} ${vehicle.model}` : "Vehículo eliminado"}
          </div>
          <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 2 }}>
            {vehicle?.plate} · {client?.name || "Sin cliente"}
          </div>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {order.description && (
        <div style={{
          background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8,
          padding: 12, fontSize: 13.5, color: COLORS.text, marginBottom: 14, lineHeight: 1.5,
        }}>
          {order.description}
        </div>
      )}
      {order.mechanic && (
        <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 16 }}>
          Mecánico: <strong style={{ color: COLORS.text }}>{order.mechanic}</strong>
        </div>
      )}

      <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 10 }}>
        Fotos y videos de respaldo
      </div>

      <label style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        border: `1.5px dashed ${COLORS.border}`, borderRadius: 10, padding: "16px",
        cursor: "pointer", color: COLORS.textMuted, fontSize: 13, marginBottom: 14,
      }}>
        {uploading ? <Loader2 size={16} className="spin" /> : <Camera size={16} />}
        {uploading ? "Subiendo..." : "Agregar fotos o videos"}
        <input type="file" accept="image/*,video/*" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
      </label>

      {(!order.media || order.media.length === 0) ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.textFaint, fontSize: 13, padding: "8px 0 4px" }}>
          <ImageOff size={15} /> Sin respaldo cargado todavía
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 8 }}>
          {order.media.map((m) => (
            <div key={m.id} style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: `1px solid ${COLORS.border}` }}>
              {m.type === "photo" ? (
                <img src={m.dataUrl} alt="respaldo" style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }} />
              ) : (
                <video src={m.dataUrl} style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }} controls />
              )}
              <button onClick={() => removeMedia(m.id)} style={{
                position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)", border: "none",
                borderRadius: 5, color: "#fff", width: 20, height: 20, display: "flex", alignItems: "center",
                justifyContent: "center", cursor: "pointer",
              }}>
                <X size={12} />
              </button>
              <button onClick={() => toggleShare(m.id)} title="Compartir con cliente" style={{
                position: "absolute", bottom: 4, left: 4, right: 4, display: "flex", alignItems: "center",
                justifyContent: "center", gap: 4, fontSize: 10, fontWeight: 700, padding: "3px 0",
                borderRadius: 5, border: "none", cursor: "pointer",
                background: m.shared ? COLORS.green : "rgba(0,0,0,0.6)", color: m.shared ? "#0F1A20" : "#fff",
              }}>
                <Share2 size={10} /> {m.shared ? "Compartido" : "Compartir"}
              </button>
            </div>
          ))}
        </div>
      )}
      <div style={{ fontSize: 11, color: COLORS.textFaint, marginBottom: 20 }}>
        Marca "Compartir" en cada archivo para hacerlo visible al cliente. El resto queda solo como respaldo interno.
      </div>

      <div style={{ display: "flex", gap: 8, borderTop: `1px solid ${COLORS.border}`, paddingTop: 16 }}>
        <Button onClick={onCreateInvoice}><Receipt size={14} /> Crear factura</Button>
        <Button variant="steel" onClick={onEdit}><Edit2 size={14} /> Editar</Button>
        <Button variant="danger" onClick={onDelete}><Trash2 size={14} /> Eliminar</Button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------
function InvoicesView({ invoices, vehicles, orders, vehicleById, clientById, updateInvoices, prefillOrder, clearPrefill }) {
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    if (prefillOrder) {
      setEditing({ vehicleId: prefillOrder.vehicleId, orderId: prefillOrder.id, laborCost: 0, parts: [], notes: prefillOrder.description || "" });
      clearPrefill();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillOrder]);

  const sorted = [...invoices].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const save = (data) => {
    if (data.id) updateInvoices(invoices.map((i) => (i.id === data.id ? data : i)));
    else updateInvoices([...invoices, { ...data, id: uid(), createdAt: Date.now() }]);
    setEditing(null);
  };
  const remove = (id) => {
    updateInvoices(invoices.filter((i) => i.id !== id));
    setConfirmDelete(null);
    setViewing(null);
  };

  const total = (inv) => {
    const partsTotal = (inv.parts || []).reduce((sum, p) => sum + (Number(p.cost) || 0) * (Number(p.qty) || 1), 0);
    return partsTotal + (Number(inv.laborCost) || 0);
  };

  return (
    <div>
      <PageHeader
        title="Facturas" subtitle={`${invoices.length} generadas`}
        action={<Button onClick={() => setEditing({ vehicleId: vehicles[0]?.id || "", laborCost: 0, parts: [] })} disabled={vehicles.length === 0}>
          <Plus size={16} /> Nueva factura
        </Button>}
      />
      {vehicles.length === 0 && (
        <div style={{ fontSize: 13, color: COLORS.amber, marginBottom: 14 }}>
          Registra un vehículo primero para poder generar una factura.
        </div>
      )}

      {sorted.length === 0 ? (
        <EmptyState icon={Receipt} title="Sin facturas" subtitle="Crea la primera factura de un trabajo" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sorted.map((inv) => {
            const v = vehicleById[inv.vehicleId];
            const c = v ? clientById[v.clientId] : null;
            return (
              <div key={inv.id} onClick={() => setViewing(inv)} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10,
                padding: "14px 16px", cursor: "pointer",
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {c?.name || "Cliente sin datos"}
                  </div>
                  <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
                    {v ? `${v.make} ${v.model} · ${v.plate}` : "Vehículo eliminado"} · {new Date(inv.createdAt).toLocaleDateString("es-CR")}
                  </div>
                </div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 18, color: COLORS.accent }}>
                  {money(total(inv))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <InvoiceModal invoice={editing} vehicles={vehicles} vehicleById={vehicleById} clientById={clientById} onClose={() => setEditing(null)} onSave={save} />
      )}
      {viewing && (
        <InvoiceDetailModal
          invoice={viewing} vehicle={vehicleById[viewing.vehicleId]} client={clientById[vehicleById[viewing.vehicleId]?.clientId]}
          total={total(viewing)}
          onClose={() => setViewing(null)}
          onEdit={() => { setEditing(viewing); setViewing(null); }}
          onDelete={() => setConfirmDelete(viewing.id)}
        />
      )}
      {confirmDelete && (
        <ConfirmModal text="¿Eliminar esta factura?" onCancel={() => setConfirmDelete(null)} onConfirm={() => remove(confirmDelete)} />
      )}
    </div>
  );
}

function InvoiceModal({ invoice, vehicles, vehicleById, clientById, onClose, onSave }) {
  const [form, setForm] = useState({
    vehicleId: vehicles[0]?.id || "", laborCost: 0, parts: [], notes: "", ...invoice,
  });

  const vehicle = vehicleById[form.vehicleId];
  const client = vehicle ? clientById[vehicle.clientId] : null;

  const addPart = () => setForm({ ...form, parts: [...form.parts, { id: uid(), name: "", qty: 1, cost: 0 }] });
  const updatePart = (id, field, value) => setForm({
    ...form, parts: form.parts.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
  });
  const removePart = (id) => setForm({ ...form, parts: form.parts.filter((p) => p.id !== id) });

  const partsTotal = form.parts.reduce((sum, p) => sum + (Number(p.cost) || 0) * (Number(p.qty) || 1), 0);
  const grandTotal = partsTotal + (Number(form.laborCost) || 0);

  return (
    <Modal title={invoice.id ? "Editar factura" : "Nueva factura"} onClose={onClose} width={560}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Vehículo">
          <select value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value, orderId: undefined })} style={inputStyle}>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.make} {v.model} · {v.plate} ({clientById[v.clientId]?.name || "sin cliente"})
              </option>
            ))}
          </select>
        </Field>

        <div style={{
          background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 12,
          fontSize: 12.5, color: COLORS.textMuted, display: "flex", flexDirection: "column", gap: 3,
        }}>
          <div><strong style={{ color: COLORS.text }}>Cliente:</strong> {client?.name || "—"}</div>
          <div><strong style={{ color: COLORS.text }}>Vehículo:</strong> {vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.year || "s/a"})` : "—"}</div>
          <div><strong style={{ color: COLORS.text }}>Placa:</strong> {vehicle?.plate || "—"}</div>
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: COLORS.textMuted, fontWeight: 600 }}>Repuestos</span>
            <button onClick={addPart} style={{
              background: "none", border: "none", color: COLORS.accent, fontSize: 12, fontWeight: 700,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
            }}>
              <Plus size={13} /> Agregar repuesto
            </button>
          </div>
          {form.parts.length === 0 ? (
            <div style={{ fontSize: 12.5, color: COLORS.textFaint, padding: "6px 0" }}>Sin repuestos agregados.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {form.parts.map((p) => (
                <div key={p.id} className="parts-row">
                  <TextInput className="part-name" placeholder="Nombre del repuesto" value={p.name} onChange={(e) => updatePart(p.id, "name", e.target.value)} />
                  <TextInput className="part-qty" type="number" min="1" value={p.qty} onChange={(e) => updatePart(p.id, "qty", e.target.value)} style={{ textAlign: "center", padding: "10px 4px" }} />
                  <TextInput className="part-cost" type="number" min="0" placeholder="Costo" value={p.cost} onChange={(e) => updatePart(p.id, "cost", e.target.value)} />
                  <button onClick={() => removePart(p.id)} style={{ background: "none", border: "none", color: COLORS.red, cursor: "pointer", padding: 4, flexShrink: 0 }}>
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Field label="Mano de obra (costo total)">
          <TextInput type="number" min="0" value={form.laborCost} onChange={(e) => setForm({ ...form, laborCost: e.target.value })} placeholder="0" />
        </Field>

        <Field label="Notas (opcional)">
          <textarea
            value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
            placeholder="Observaciones adicionales para la factura"
          />
        </Field>

        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          borderTop: `1px solid ${COLORS.border}`, paddingTop: 12, fontSize: 15,
        }}>
          <span style={{ color: COLORS.textMuted, fontWeight: 600 }}>Total</span>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 22, color: COLORS.accent }}>
            {money(grandTotal)}
          </span>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <Button onClick={() => vehicle && onSave(form)} style={{ opacity: vehicle ? 1 : 0.5 }}>Guardar factura</Button>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        </div>
      </div>
    </Modal>
  );
}

function InvoiceDetailModal({ invoice, vehicle, client, total, onClose, onEdit, onDelete }) {
  const partsTotal = (invoice.parts || []).reduce((sum, p) => sum + (Number(p.cost) || 0) * (Number(p.qty) || 1), 0);
  return (
    <Modal title="Factura" onClose={onClose} width={520}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: COLORS.textFaint, marginBottom: 10 }}>
          {new Date(invoice.createdAt).toLocaleDateString("es-CR", { day: "2-digit", month: "long", year: "numeric" })}
        </div>
        <div className="invoice-info-grid" style={{ marginBottom: 14 }}>
          <div style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 11, color: COLORS.textFaint, textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>Cliente</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{client?.name || "—"}</div>
            {client?.phone && <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>{client.phone}</div>}
          </div>
          <div style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 11, color: COLORS.textFaint, textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>Vehículo</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{vehicle ? `${vehicle.make} ${vehicle.model}` : "—"}</div>
            <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>{vehicle?.plate} {vehicle?.year ? `· ${vehicle.year}` : ""}</div>
          </div>
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 8 }}>
          Repuestos
        </div>
        {(!invoice.parts || invoice.parts.length === 0) ? (
          <div style={{ fontSize: 13, color: COLORS.textFaint, marginBottom: 12 }}>Sin repuestos.</div>
        ) : (
          <div style={{ marginBottom: 12 }}>
            {invoice.parts.map((p) => (
              <div key={p.id} style={{
                display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0",
                borderBottom: `1px solid ${COLORS.border}`,
              }}>
                <span>{p.name || "Repuesto"} {Number(p.qty) > 1 ? `×${p.qty}` : ""}</span>
                <span style={{ color: COLORS.textMuted }}>{money((Number(p.cost) || 0) * (Number(p.qty) || 1))}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, marginBottom: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: COLORS.textMuted }}>
            <span>Subtotal repuestos</span><span>{money(partsTotal)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", color: COLORS.textMuted }}>
            <span>Mano de obra</span><span>{money(invoice.laborCost)}</span>
          </div>
        </div>

        {invoice.notes && (
          <div style={{ fontSize: 12.5, color: COLORS.textMuted, marginTop: 10, fontStyle: "italic" }}>{invoice.notes}</div>
        )}

        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          borderTop: `1px solid ${COLORS.border}`, marginTop: 14, paddingTop: 14, fontSize: 15,
        }}>
          <span style={{ color: COLORS.textMuted, fontWeight: 700 }}>Total</span>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 26, color: COLORS.accent }}>
            {money(total)}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, borderTop: `1px solid ${COLORS.border}`, paddingTop: 16 }}>
        <Button variant="steel" onClick={onEdit}><Edit2 size={14} /> Editar</Button>
        <Button variant="danger" onClick={onDelete}><Trash2 size={14} /> Eliminar</Button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Settings (admin-only: brand name + logo)
// ---------------------------------------------------------------------------
function SettingsModal({ settings, onSave, onClose }) {
  const hasPin = !!settings.adminPin;
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: settings.name || "Mi Taller", logo: settings.logo || null });

  const tryUnlock = () => {
    if (pinInput === settings.adminPin) {
      setUnlocked(true);
      setError("");
    } else {
      setError("PIN incorrecto");
    }
  };

  const createPin = () => {
    if (pinInput.length < 4) {
      setError("Usa al menos 4 dígitos");
      return;
    }
    if (pinInput !== pinConfirm) {
      setError("Los PIN no coinciden");
      return;
    }
    onSave({ ...settings, adminPin: pinInput });
    setUnlocked(true);
    setError("");
  };

  const handleLogo = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, logo: reader.result }));
    reader.readAsDataURL(file);
  };

  const saveBranding = () => {
    onSave({ ...settings, name: form.name.trim() || "Mi Taller", logo: form.logo });
    onClose();
  };

  // --- Gate: no PIN set yet, admin must create one ---
  if (!hasPin) {
    return (
      <Modal title="Configurar acceso de administrador" onClose={onClose} width={380}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.textMuted, fontSize: 13, marginBottom: 4 }}>
            <Lock size={15} />
            Crea un PIN para proteger el nombre y logo del taller. Solo quien lo conozca podrá editarlos.
          </div>
          <Field label="Nuevo PIN (mínimo 4 dígitos)">
            <TextInput type="password" inputMode="numeric" value={pinInput} onChange={(e) => setPinInput(e.target.value)} placeholder="••••" />
          </Field>
          <Field label="Confirmar PIN">
            <TextInput type="password" inputMode="numeric" value={pinConfirm} onChange={(e) => setPinConfirm(e.target.value)} placeholder="••••" />
          </Field>
          {error && <div style={{ color: COLORS.red, fontSize: 12.5 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <Button onClick={createPin}>Crear PIN y continuar</Button>
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          </div>
        </div>
      </Modal>
    );
  }

  // --- Gate: PIN exists but not yet entered this session ---
  if (!unlocked) {
    return (
      <Modal title="Acceso de administrador" onClose={onClose} width={360}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.textMuted, fontSize: 13, marginBottom: 4 }}>
            <Lock size={15} />
            Esta sección solo la puede editar el administrador del taller.
          </div>
          <Field label="PIN de administrador">
            <TextInput
              type="password" inputMode="numeric" value={pinInput} autoFocus
              onChange={(e) => setPinInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && tryUnlock()}
              placeholder="••••"
            />
          </Field>
          {error && <div style={{ color: COLORS.red, fontSize: 12.5 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <Button onClick={tryUnlock}><Unlock size={14} /> Desbloquear</Button>
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          </div>
        </div>
      </Modal>
    );
  }

  // --- Unlocked: edit branding ---
  return (
    <Modal title="Marca del taller" onClose={onClose} width={420}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: COLORS.green, fontSize: 12, fontWeight: 700 }}>
          <Unlock size={13} /> Acceso de administrador desbloqueado
        </div>

        <Field label="Nombre del taller">
          <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mi Taller" />
        </Field>

        <Field label="Logo">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 10, border: `1px solid ${COLORS.border}`,
              background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0,
            }}>
              {form.logo ? (
                <img src={form.logo} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <ImageIcon size={20} color={COLORS.textFaint} />
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{
                display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700,
                color: COLORS.accent, cursor: "pointer",
              }}>
                <Camera size={13} /> Subir imagen
                <input type="file" accept="image/*" hidden onChange={(e) => handleLogo(e.target.files?.[0])} />
              </label>
              {form.logo && (
                <button onClick={() => setForm({ ...form, logo: null })} style={{ background: "none", border: "none", color: COLORS.textFaint, fontSize: 12, cursor: "pointer", textAlign: "left", padding: 0 }}>
                  Quitar logo
                </button>
              )}
            </div>
          </div>
        </Field>

        <div style={{ display: "flex", gap: 8, marginTop: 4, borderTop: `1px solid ${COLORS.border}`, paddingTop: 16 }}>
          <Button onClick={saveBranding}>Guardar cambios</Button>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        </div>
      </div>
    </Modal>
  );
}
