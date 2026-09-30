import {
  useState,
  useEffect,
  useRef,
  type ReactNode,
  type FormEvent,
} from "react";
import { X, Minus, Plus, Package, CheckCircle2 } from "lucide-react";
import { api, type Row } from "./api";
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Badge({
  children,
  tone = "",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={"badge " + tone}>{children}</span>;
}
export function Empty({
  text = "No hay registros todavía.",
}: {
  text?: string;
}) {
  return (
    <div className="empty">
      <Package size={32} />
      <p>{text}</p>
    </div>
  );
}
export function Quantity({
  value,
  onChange,
  max = 99,
}: {
  value: number;
  onChange: (v: number) => void;
  max?: number;
}) {
  return (
    <div className="quantity">
      <button
        type="button"
        aria-label="Reducir cantidad"
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
      >
        <Minus size={15} />
      </button>
      <output aria-label="Cantidad">{value}</output>
      <button
        type="button"
        aria-label="Aumentar cantidad"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus size={15} />
      </button>
    </div>
  );
}
export function ProductImage({id,name,large=false}:{id:string;name:string;large?:boolean}){
 const n=Number(id.replace('P',''))-1;
 return Number.isInteger(n)&&n>=0&&n<12?
 <svg role="img" aria-label={name} className={'product-image '+(large?'large':'')} viewBox="0 0 362 362" preserveAspectRatio="xMidYMid meet">
   <svg x="0" y="0" width="362" height="362" viewBox={`${(n%4)*362} ${Math.floor(n/4)*362} 362 362`} overflow="hidden">
     <image href="/images/products.png" width="1448" height="1086"/>
   </svg>
 </svg>:<div className="product-image fallback"><Package size={64}/></div>;
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current?.showModal();
    return () => {
      ref.current?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Cerrar"
          onClick={onClose}
        >
          <X />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function Form({
  onSubmit,
  children,
  submit = "Guardar",
  className = "",
}: {
  onSubmit: (data: Row) => Promise<void>;
  children: ReactNode;
  submit?: string;
  className?: string;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [success, setSuccess] = useState(false);
  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setBusy(true);
    try {
      await onSubmit(Object.fromEntries(new FormData(e.currentTarget)));
      setSuccess(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={send} className={"form " + className}>
      {children}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="success">
          <CheckCircle2 size={16} /> Operación completada.
        </p>
      )}
      <button className="primary" disabled={busy}>
        {busy ? "Procesando…" : submit}
      </button>
    </form>
  );
}
export function DataTable({
  rows,
  columns,
  actions,
}: {
  rows: Row[];
  columns: [string, string][];
  actions?: (r: Row) => ReactNode;
}) {
  if (!rows.length) return <Empty />;
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {columns.map(([key, label]) => (
              <th key={key} scope="col">
                {label}
              </th>
            ))}
            {actions && <th scope="col">Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id ?? i}>
              {columns.map(([key]) => (
                <td key={key}>
                  {key === "status" ? (
                    <Badge
                      tone={
                        [
                          "paid",
                          "approved",
                          "processed",
                          "delivered",
                          "confirmed",
                          "active",
                          "completed",
                        ].includes(r[key])
                          ? "green"
                          : ""
                      }
                    >
                      {String(r[key])}
                    </Badge>
                  ) : (
                    String(r[key] ?? "—")
                  )}
                </td>
              ))}
              {actions && (
                <td>
                  <div className="row-actions">{actions(r)}</div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
const defaultAvailability = () => api("/availability");
export function Availability({
  fetcher = defaultAvailability,
}: {
  fetcher?: () => Promise<Row[]>;
}) {
  const [state, setState] = useState("loading"),
    [items, setItems] = useState<Row[]>([]),
    [selected, setSelected] = useState("");
  useEffect(() => {
    let alive = true;
    fetcher()
      .then((x) => {
        if (alive) {
          setItems(x);
          setState(x.length ? "success" : "empty");
        }
      })
      .catch(() => {
        if (alive) setState("error");
      });
    return () => {
      alive = false;
    };
  }, [fetcher]);
  return (
    <section aria-label="Disponibilidad de eventos" className="panel">
      <h3>Disponibilidad de eventos</h3>
      {state === "loading" && <p role="status">Cargando disponibilidad…</p>}
      {state === "empty" && <p>No hay eventos disponibles.</p>}
      {state === "error" && (
        <p role="alert" className="error">
          No se pudo cargar la disponibilidad.
        </p>
      )}
      {state === "success" &&
        items.map((item) => (
          <div className="event-row" key={item.id}>
            <span>
              <strong>{item.name}</strong>
              <small>{item.available} plazas disponibles</small>
            </span>
            <button
              disabled={!item.available}
              onClick={() => setSelected(item.name)}
            >
              Seleccionar {item.name}
            </button>
          </div>
        ))}
      {selected && (
        <p role="status" className="success">
          Seleccionado: {selected}
        </p>
      )}
    </section>
  );
}
