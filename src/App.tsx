import {
  useEffect,
  useState,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import {
  ShoppingBag,
  Boxes,
  ClipboardList,
  ArrowLeftRight,
  ShieldCheck,
  Truck,
  Wallet,
  Component,
  HeartPulse,
  Smartphone,
  Workflow,
  FlaskConical,
  BookOpen,
  Code2,
  LogIn,
  LogOut,
  ShoppingCart,
  Search,
  Menu,
  RotateCcw,
  Download,
  Plus,
  Check,
  Beaker,
  ChevronRight,
} from "lucide-react";
import { api, ensureLab, type Row } from "./api";
import { Modal, Form, Field, Badge } from "./components";
import { Store, Cart, Orders, Inventory } from "./Commerce";
import {
  Module,
  ComponentLab,
  Clinic,
  Mobile,
  AILab,
  ApiConsole,
  DataLab,
} from "./Modules";
type Ctx = {
  user: Row | null;
  version: number;
  refresh: () => void;
  run: (fn: () => Promise<any>, message?: string) => Promise<any>;
  login: () => void;
  go: (route: string) => void;
};
const Context = createContext<Ctx>(null!);
export const useLab = () => useContext(Context);
const NAV = [
  {
    label: "COMERCIO",
    items: [
      ["store", "Tienda", ShoppingBag],
      ["cart", "Carrito", ShoppingCart],
      ["orders", "Pedidos", ClipboardList],
    ],
  },
  {
    label: "OPERACIONES",
    items: [
      ["inventory", "Inventario", Boxes],
      ["reservations", "Reservas", ClipboardList],
      ["movements", "Movimientos", ArrowLeftRight],
      ["claims", "Siniestros", ShieldCheck],
      ["parcels", "Envíos", Truck],
      ["wallet", "Transferencias", Wallet],
    ],
  },
  {
    label: "SERVICIOS",
    items: [
      ["components", "Componentes", Component],
      ["clinic", "Agenda de citas", HeartPulse],
      ["mobile", "Campo móvil", Smartphone],
      ["events", "Eventos y DLQ", Workflow],
      ["ai", "Políticas y datos", FlaskConical],
      ["data", "Datos y auditoría", Boxes],
      ["api", "Consola API", Code2],
    ],
  },
] as const;
const titles: Record<string, string> = Object.fromEntries(
  NAV.flatMap((g) => g.items.map((i) => [i[0], i[1]])),
);
export default function App() {
  const [ready, setReady] = useState(false),
    [initError, setInitError] = useState(""),
    [user, setUser] = useState<Row | null>(null),
    [version, setVersion] = useState(0),
    [route, setRoute] = useState(location.hash.slice(2) || "store"),
    [loginOpen, setLoginOpen] = useState(false),
    [resetOpen, setResetOpen] = useState(false),
    [menu, setMenu] = useState(false),
    [notice, setNotice] = useState<{ text: string; error: boolean } | null>(
      null,
    ),
    [account, setAccount] = useState(""),
    [registering, setRegistering] = useState(false);
  const refresh = () => setVersion((v) => v + 1);
  useEffect(() => {
    ensureLab()
      .then(async () => {
        if (sessionStorage.getItem("qa-token"))
          try {
            setUser(await api("/auth/me"));
          } catch {
            sessionStorage.removeItem("qa-token");
          }
        setReady(true);
      })
      .catch((e) => setInitError(e.message));
  }, []);
  useEffect(() => {
    const changed = () => {
      setRoute(location.hash.slice(2) || "store");
      setMenu(false);
    };
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, []);
  useEffect(() => {
    document.title = (titles[route] ?? "QA Lab") + " · QA Lab";
  }, [route]);
  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(null), 6000);
      return () => clearTimeout(t);
    }
  }, [notice]);
  const go = (r: string) => {
    location.hash = "/" + r;
  };
  async function run(
    fn: () => Promise<any>,
    message = "Operación completada.",
  ) {
    try {
      const r = await fn();
      refresh();
      setNotice({ text: message, error: false });
      return r;
    } catch (e) {
      setNotice({ text: (e as Error).message, error: true });
      return undefined;
    }
  }
  if (initError)
    return (
      <main className="boot">
        <h1>No se pudo iniciar QA Lab</h1>
        <p role="alert">{initError}</p>
        <button onClick={() => location.reload()}>Reintentar</button>
      </main>
    );
  if (!ready)
    return (
      <main className="boot">
        <Beaker size={40} />
        <p role="status">Cargando tu espacio de trabajo…</p>
      </main>
    );
  const restricted = !["store", "components", "api", "roadmap", "ai"].includes(
    route,
  );
  let content: ReactNode;
  if (restricted && !user)
    content = (
      <section className="login-wall panel">
        <LogIn size={44} />
        <h2>Inicia sesión para continuar</h2>
        <p>Accede a tu cuenta para consultar y gestionar esta sección.</p>
        <button className="primary" onClick={() => setLoginOpen(true)}>
          Iniciar sesión
        </button>
      </section>
    );
  else if (route === "store") content = <Store />;
  else if (route === "cart") content = <Cart />;
  else if (route === "orders") content = <Orders />;
  else if (route === "inventory") content = <Inventory />;
  else if (
    [
      "reservations",
      "movements",
      "claims",
      "parcels",
      "wallet",
      "events",
    ].includes(route)
  )
    content = <Module key={route} name={route} />;
  else if (route === "components") content = <ComponentLab />;
  else if (route === "clinic") content = <Clinic />;
  else if (route === "mobile") content = <Mobile />;
  else if (route === "ai") content = <AILab />;
  else if (route === "api") content = <ApiConsole />;
  else if (route === "data") content = <DataLab />;
  else if (route === "roadmap") content = <Store />;
  else
    content = (
      <section className="panel">
        <h2>Página no encontrada</h2>
        <button onClick={() => go("store")}>Volver a la tienda</button>
      </section>
    );
  return (
    <Context.Provider
      value={{
        user,
        version,
        refresh,
        run,
        login: () => setLoginOpen(true),
        go,
      }}
    >
      <a className="skip-link" href="#main">
        Saltar al contenido
      </a>
      <div className="app">
        <aside className={"sidebar " + (menu ? "open" : "")}>
          <a href="#/store" className="brand">
            <span className="brand-icon">
              <Beaker size={25} />
            </span>
            <span>
              QA<span className="brand-light">lab</span>
              <small>COMERCIO Y OPERACIONES</small>
            </span>
          </a>
          <div className="workspace-label">
            <Boxes size={18} aria-hidden="true" />
            <span>
              Panel de gestión<small>Comercio y operaciones</small>
            </span>
          </div>
          <nav aria-label="Navegación principal">
            {NAV.map((group) => (
              <div key={group.label} className="nav-group">
                <p>{group.label}</p>
                {group.items.map(([id, label, Icon]) => (
                  <a
                    key={id}
                    href={"#/" + id}
                    aria-current={route === id ? "page" : undefined}
                  >
                    <Icon size={19} />
                    <span>{label}</span>
                  </a>
                ))}
              </div>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <Boxes size={20} aria-hidden="true" />
            <div>
              Gestión centralizada<small>Inventario, pedidos y envíos.</small>
            </div>
          </div>
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <div className="breadcrumb">
              <button
                className="icon-button mobile-menu"
                aria-label="Abrir menú"
                onClick={() => setMenu(!menu)}
              >
                <Menu />
              </button>
              <span>Panel</span>
              <ChevronRight size={15} />
              <strong>{titles[route] ?? "QA Lab"}</strong>
            </div>
            <div className="top-actions">
              {user ? (
                <>
                  <span className="avatar">{user.name[0]}</span>
                  <span className="user-label">
                    {user.username}
                    <small>{user.role}</small>
                  </span>
                  <button
                    className="icon-button"
                    aria-label="Cerrar sesión"
                    onClick={() =>
                      run(async () => {
                        await api("/auth/logout", "POST");
                        sessionStorage.removeItem("qa-token");
                        setUser(null);
                      }, "Sesión cerrada.")
                    }
                  >
                    <LogOut size={18} />
                  </button>
                </>
              ) : (
                <button onClick={() => setLoginOpen(true)}>
                  <LogIn size={17} /> Iniciar sesión
                </button>
              )}
            </div>
          </header>
          <main id="main" tabIndex={-1} className="main-content">
            {content}
          </main>
          <footer className="footer">
            <span>
              © {new Date().getFullYear()} QA Lab · Comercio y operaciones
            </span>
            {user?.role === "admin" && (
              <button onClick={() => setResetOpen(true)}>
                <RotateCcw size={14} /> Reiniciar datos
              </button>
            )}
          </footer>
        </div>
      </div>
      {notice && (
        <div
          className={"toast " + (notice.error ? "error" : "")}
          role={notice.error ? "alert" : "status"}
        >
          {!notice.error && <Check size={18} />} {notice.text}
          <button
            className="icon-button"
            aria-label="Cerrar notificación"
            onClick={() => setNotice(null)}
          >
            ×
          </button>
        </div>
      )}
      {loginOpen && (
        <Modal
          title={registering ? "Crear cuenta" : "Iniciar sesión"}
          onClose={() => {
            setLoginOpen(false);
            setRegistering(false);
          }}
        >
          <p className="muted">
            {registering
              ? "Completa tus datos para crear una cuenta."
              : "Introduce tus credenciales para acceder a tu cuenta."}
          </p>
          <Form
            key={String(registering)}
            submit={registering ? "Crear cuenta" : "Acceder"}
            onSubmit={async (d) => {
              const r = await api(
                registering ? "/auth/register" : "/auth/login",
                "POST",
                d,
              );
              sessionStorage.setItem("qa-token", r.token);
              setUser(r.user);
              refresh();
              setAccount("");
              setLoginOpen(false);
              setRegistering(false);
            }}
          >
            {registering && (
              <Field label="Nombre completo">
                <input
                  name="name"
                  autoComplete="name"
                  minLength={2}
                  maxLength={100}
                  required
                />
              </Field>
            )}
            <Field label="Usuario">
              <input
                name="username"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                autoComplete="username"
                minLength={registering ? 3 : undefined}
                maxLength={32}
                pattern={registering ? "[a-zA-Z0-9_]{3,32}" : undefined}
                required
              />
            </Field>
            <Field label="Contraseña">
              <input
                name="password"
                type="password"
                autoComplete={registering ? "new-password" : "current-password"}
                minLength={registering ? 12 : undefined}
                maxLength={128}
                required
              />
            </Field>
            {registering && (
              <>
                <p className="small muted">
                  Usuario: de 3 a 32 letras, números o guiones bajos.
                  Contraseña: de 12 a 128 caracteres.
                </p>
                <Field label="Confirmar contraseña">
                  <input
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                  />
                </Field>
              </>
            )}
          </Form>
          <button
            className="text-button auth-switch"
            onClick={() => {
              setRegistering(!registering);
              setAccount("");
            }}
          >
            {registering
              ? "Ya tengo una cuenta · Iniciar sesión"
              : "Crear una cuenta"}
          </button>
        </Modal>
      )}
      {resetOpen && (
        <Modal
          title="Restaurar datos iniciales"
          onClose={() => setResetOpen(false)}
        >
          <p>
            Se restaurarán productos, stock, pedidos y demás registros de este
            espacio de trabajo. Las sesiones permanecerán activas.
          </p>
          {user?.role === "admin" ? (
            <button
              className="danger"
              onClick={async () => {
                const r = await run(
                  () => api("/lab/reset", "POST"),
                  "Datos restaurados.",
                );
                if (r) setResetOpen(false);
              }}
            >
              Confirmar reinicio
            </button>
          ) : (
            <p className="error">Inicia sesión como admin para reiniciar.</p>
          )}
        </Modal>
      )}
    </Context.Provider>
  );
}
export function Heading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {children && <div className="heading-actions">{children}</div>}
    </div>
  );
}
export function useData(path: string) {
  const { version } = useLab();
  const [data, setData] = useState<any>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    setError("");
    api(path)
      .then((r) => {
        if (alive) setData(r);
      })
      .catch((e) => {
        if (alive) {
          setError(e.message);
          setData(null);
        }
      });
    return () => {
      alive = false;
    };
  }, [path, version]);
  return { data, error };
}
