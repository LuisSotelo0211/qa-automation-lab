import { useState, useEffect, useCallback } from "react";
import {
  Play,
  Download,
  Code2,
  CheckCircle2,
  BookOpen,
  Upload,
  Wifi,
  WifiOff,
  Copy,
} from "lucide-react";
import { api, idem, labId, headers, download, money, type Row } from "./api";
import { useLab, useData, Heading } from "./App";
import { Error } from "./Commerce";
import {
  Field,
  Form,
  DataTable,
  Empty,
  Badge,
  Availability,
  Modal,
  Quantity,
} from "./components";

const info: Record<string, [string, string, string]> = {
  reservations: [
    "INVENTORYHUB",
    "Reservas de stock",
    "Reserva, libera y observa la expiración sin descontar existencias físicas.",
  ],
  movements: [
    "INVENTORYHUB",
    "Movimientos entre almacenes",
    "Transfiere stock disponible sin perder unidades ni duplicar operaciones.",
  ],
  claims: [
    "CLAIMSPOLICY",
    "Gestión de siniestros",
    "Gestiona solicitudes, aprobaciones y liquidaciones.",
  ],
  parcels: [
    "PARCELTRACK",
    "Seguimiento de envíos",
    "Crea envíos y avanza estados. Cada cambio publica un evento.",
  ],
  wallet: [
    "FINFLOW",
    "Transferencias",
    "Consulta tus cuentas y realiza transferencias entre saldos disponibles.",
  ],
  events: [
    "ALERTBUS",
    "Eventos y cola de errores",
    "Consulta eventos pendientes, intentos de procesamiento y registros en la cola de errores.",
  ],
};
export function Module({ name }: { name: string }) {
  const { user, refresh, run } = useLab();
  const path = name === "wallet" ? "/transfers" : "/" + name;
  const { data, error } = useData(path),
    { data: products } = useData("/products");
  const { data: accounts } = useData("/accounts");
  const [adding, setAdding] = useState(false);
  const [eyebrow, title, description] = info[name];
  const staff = ["admin", "operator"].includes(user?.role ?? "");
  async function send(body: Row) {
    let payload = { ...body };
    if (name === "reservations")
      payload = {
        ...body,
        quantity: Number(body.quantity),
        ttlSeconds: Number(body.ttlSeconds),
      };
    if (name === "movements")
      payload = { ...body, quantity: Number(body.quantity) };
    if (name === "wallet" || name === "claims")
      payload = { ...body, amount: Math.round(Number(body.amount) * 100) };
    if (name === "events")
      payload = { type: body.type, payload: JSON.parse(body.payload || "{}") };
    await api(path, "POST", payload, idem());
    refresh();
    setAdding(false);
  }
  const productSelect = (
    <Field label="Producto">
      <select name="productId">
        {products?.items.map((p: Row) => (
          <option key={p.id} value={p.id}>
            {p.name} ({p.available} disponibles)
          </option>
        ))}
      </select>
    </Field>
  );
  return (
    <>
      <Heading
        eyebrow={eyebrow + " / OPERACIONES"}
        title={title}
        description={description}
      >
        {user?.role !== "auditor" && (
          <button className="primary" onClick={() => setAdding(true)}>
            Crear {name === "wallet" ? "transferencia" : "registro"}
          </button>
        )}
      </Heading>
      <Error error={error} />
      {name === "wallet" && accounts && (
        <div className="stats">
          {accounts.map((a: Row) => (
            <div key={a.id}>
              <span>
                {a.id} · {a.owner}
              </span>
              <strong>{money(a.balance)}</strong>
            </div>
          ))}
        </div>
      )}
      {name === "events" && staff && (
        <div className="panel inline">
          <button
            className="primary"
            onClick={() =>
              run(
                () => api("/events/process", "POST", { fail: false }),
                "Eventos procesados.",
              )
            }
          >
            Procesar pendientes
          </button>
          <button
            onClick={() =>
              run(
                () => api("/events/process", "POST", { fail: true }),
                "Fallo simulado; consulta los intentos.",
              )
            }
          >
            Simular fallo del consumidor
          </button>
        </div>
      )}
      {data && (
        <DataTable
          rows={data.map((r: Row) => ({
            ...r,
            amount: r.amount !== undefined ? money(r.amount) : undefined,
            expires: r.expiresAt
              ? new Date(r.expiresAt).toLocaleTimeString()
              : undefined,
          }))}
          columns={
            name === "reservations"
              ? [
                  ["id", "Reserva"],
                  ["productName", "Producto"],
                  ["warehouse", "Almacén"],
                  ["quantity", "Cantidad"],
                  ["expires", "Expira"],
                  ["status", "Estado"],
                ]
              : name === "movements"
                ? [
                    ["id", "Movimiento"],
                    ["productId", "Producto"],
                    ["from", "Origen"],
                    ["to", "Destino"],
                    ["quantity", "Cantidad"],
                  ]
                : name === "claims"
                  ? [
                      ["id", "Siniestro"],
                      ["title", "Descripción"],
                      ["owner", "Propietario"],
                      ["amount", "Importe"],
                      ["status", "Estado"],
                    ]
                  : name === "parcels"
                    ? [
                        ["id", "Envío"],
                        ["recipient", "Destinatario"],
                        ["address", "Dirección"],
                        ["status", "Estado"],
                      ]
                    : name === "wallet"
                      ? [
                          ["id", "Transferencia"],
                          ["from", "Origen"],
                          ["to", "Destino"],
                          ["amount", "Importe"],
                          ["status", "Estado"],
                        ]
                      : [
                          ["id", "Evento"],
                          ["type", "Tipo"],
                          ["attempts", "Intentos"],
                          ["status", "Estado"],
                        ]
          }
          actions={(r) => (
            <>
              {name === "reservations" &&
                r.status === "active" &&
                user?.role !== "auditor" && (
                  <button
                    onClick={() =>
                      run(
                        () => api("/reservations/" + r.id + "/release", "POST"),
                        "Reserva liberada.",
                      )
                    }
                  >
                    Liberar
                  </button>
                )}
              {name === "claims" && (
                <>
                  {r.status === "draft" && user?.role !== "auditor" && (
                    <button
                      onClick={() =>
                        run(() =>
                          api("/claims/" + r.id + "/transition", "POST", {
                            status: "submitted",
                          }),
                        )
                      }
                    >
                      Enviar
                    </button>
                  )}
                  {r.status === "submitted" && staff && (
                    <>
                      <button
                        onClick={() =>
                          run(() =>
                            api("/claims/" + r.id + "/transition", "POST", {
                              status: "approved",
                            }),
                          )
                        }
                      >
                        Aprobar
                      </button>
                      <button
                        onClick={() =>
                          run(() =>
                            api("/claims/" + r.id + "/transition", "POST", {
                              status: "rejected",
                            }),
                          )
                        }
                      >
                        Rechazar
                      </button>
                    </>
                  )}
                  {r.status === "approved" && staff && (
                    <button
                      onClick={() =>
                        run(() =>
                          api("/claims/" + r.id + "/transition", "POST", {
                            status: "paid",
                          }),
                        )
                      }
                    >
                      Pagar
                    </button>
                  )}
                </>
              )}
              {name === "parcels" && staff && r.status !== "delivered" && (
                <button
                  onClick={() =>
                    run(() =>
                      api("/parcels/" + r.id + "/transition", "POST", {
                        status:
                          r.status === "created" ? "in_transit" : "delivered",
                      }),
                    )
                  }
                >
                  {r.status === "created" ? "Despachar" : "Entregar"}
                </button>
              )}
              {name === "events" && staff && r.status === "dlq" && (
                <button
                  onClick={() =>
                    run(() => api("/events/" + r.id + "/retry", "POST"))
                  }
                >
                  Reenviar
                </button>
              )}
            </>
          )}
        />
      )}
      {adding && (
        <Modal title={"Crear · " + title} onClose={() => setAdding(false)}>
          <Form onSubmit={send}>
            {["reservations", "movements"].includes(name) && (
              <>
                {productSelect}
                <Field label="Cantidad">
                  <input
                    type="number"
                    name="quantity"
                    min="1"
                    defaultValue="1"
                    required
                  />
                </Field>
              </>
            )}
            {name === "reservations" && (
              <>
                <Field label="Almacén">
                  <select name="warehouse">
                    <option>Lima</option>
                    <option>Arequipa</option>
                  </select>
                </Field>
                <Field label="Expiración en segundos">
                  <input
                    name="ttlSeconds"
                    type="number"
                    min="1"
                    max="86400"
                    defaultValue="900"
                    required
                  />
                </Field>
              </>
            )}
            {name === "movements" && (
              <>
                <Field label="Origen">
                  <select name="from">
                    <option>Lima</option>
                    <option>Arequipa</option>
                  </select>
                </Field>
                <Field label="Destino">
                  <select name="to" defaultValue="Arequipa">
                    <option>Lima</option>
                    <option>Arequipa</option>
                  </select>
                </Field>
              </>
            )}
            {name === "claims" && (
              <>
                <Field label="Descripción">
                  <input name="title" required />
                </Field>
                <Field label="Importe en soles">
                  <input
                    name="amount"
                    type="number"
                    min=".01"
                    step=".01"
                    defaultValue="100"
                    required
                  />
                </Field>
              </>
            )}
            {name === "parcels" && (
              <>
                <Field label="Destinatario">
                  <input name="recipient" required />
                </Field>
                <Field label="Dirección">
                  <input name="address" minLength={5} required />
                </Field>
              </>
            )}
            {name === "wallet" && (
              <>
                <Field label="Cuenta origen">
                  <select name="from">
                    {accounts?.map((a: Row) => (
                      <option key={a.id}>{a.id}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Cuenta destino">
                  <select name="to" defaultValue="ACC-002">
                    <option>ACC-001</option>
                    <option>ACC-002</option>
                  </select>
                </Field>
                <Field label="Importe en soles">
                  <input
                    name="amount"
                    type="number"
                    min=".01"
                    step=".01"
                    defaultValue="50"
                    required
                  />
                </Field>
              </>
            )}
            {name === "events" && (
              <>
                <Field label="Tipo de evento">
                  <input name="type" defaultValue="media.uploaded" required />
                </Field>
                <Field label="Payload JSON">
                  <textarea name="payload" defaultValue={'{"fileId":"demo"}'} />
                </Field>
              </>
            )}
          </Form>
        </Modal>
      )}
    </>
  );
}
export function ComponentLab() {
  const [mode, setMode] = useState("success"),
    [quantity, setQuantity] = useState(1),
    [dialog, setDialog] = useState(false),
    [tab, setTab] = useState("general"),
    [dropped, setDropped] = useState(false),
    [selectedFile, setSelectedFile] = useState("");
  const fetcher = useCallback(
    () =>
      api(
        "/availability" + (mode === "empty" ? "?empty=true" : ""),
        "GET",
        undefined,
        mode === "error"
          ? { "x-test-failure": "503" }
          : mode === "loading"
            ? { "x-test-delay": "3000" }
            : {},
      ),
    [mode],
  );
  return (
    <>
      <Heading
        eyebrow="EVENTPASS / INTERACCIONES"
        title="Centro de interacciones"
        description="Consulta la disponibilidad de eventos, organiza tickets y gestiona tus preferencias."
      />
      <div className="two-columns">
        <div>
          <section className="panel">
            <Field label="Estado del servicio">
              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="success">Success</option>
                <option value="loading">Loading (3 segundos)</option>
                <option value="empty">Empty</option>
                <option value="error">Error 503</option>
              </select>
            </Field>
          </section>
          <Availability key={mode} fetcher={fetcher} />
          <section className="panel">
            <h3>Controles y teclado</h3>
            <Quantity value={quantity} onChange={setQuantity} max={5} />
            <Field label="Fecha del evento">
              <input type="date" />
            </Field>
            <Field label="Nivel de prioridad">
              <input type="range" min="1" max="5" defaultValue="3" />
            </Field>
            <fieldset>
              <legend>Canal de notificación</legend>
              <label className="check">
                <input type="radio" name="channel" defaultChecked />
                Correo
              </label>
              <label className="check">
                <input type="radio" name="channel" />
                SMS
              </label>
            </fieldset>
            <Field label="Archivo local (vista previa)">
              <input
                type="file"
                onChange={(e) =>
                  setSelectedFile(e.target.files?.[0]?.name ?? "")
                }
              />
            </Field>
            {selectedFile && <p role="status">{selectedFile}</p>}
          </section>
        </div>
        <div>
          <section className="panel">
            <h3>Diálogos, pestañas y acordeón</h3>
            <div role="tablist" aria-label="Detalles">
              <button
                role="tab"
                aria-selected={tab === "general"}
                onClick={() => setTab("general")}
              >
                General
              </button>
              <button
                role="tab"
                aria-selected={tab === "advanced"}
                onClick={() => setTab("advanced")}
              >
                Avanzado
              </button>
            </div>
            <div role="tabpanel">
              {tab === "general" ? (
                <p>Información general del componente.</p>
              ) : (
                <p>Configuración avanzada disponible.</p>
              )}
            </div>
            <details>
              <summary>Reglas de reserva</summary>
              <p>Una reserva no puede superar el stock disponible.</p>
            </details>
            <div className="stack">
              <button onClick={() => setDialog(true)}>Abrir modal</button>
              <button onClick={() => window.alert("Notificación recibida")}>
                Alerta nativa
              </button>
              <button
                onClick={() => {
                  const ok = window.confirm("¿Confirmar esta acción?");
                  window.alert(ok ? "Confirmado" : "Cancelado");
                }}
              >
                Confirmación nativa
              </button>
              <a href="/sample.html" target="_blank" rel="noreferrer">
                Abrir nueva pestaña
              </a>
              <a href="/sample.csv" download>
                Descargar listado CSV
              </a>
            </div>
          </section>
          <section className="panel">
            <h3>Drag & drop</h3>
            <div
              className="drag-item"
              draggable
              onDragStart={(e) =>
                e.dataTransfer.setData("text/plain", "ticket-1")
              }
            >
              Ticket QA-001
            </div>
            <div
              className={"drop-zone " + (dropped ? "done" : "")}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.getData("text/plain") === "ticket-1")
                  setDropped(true);
              }}
              data-testid="drop-zone"
            >
              {dropped
                ? "Ticket movido a Completado"
                : "Arrastra aquí para completar"}
            </div>
            <button onClick={() => setDropped(true)}>
              Mover ticket con teclado
            </button>
          </section>
          <section className="panel">
            <h3>Formulario de contacto</h3>
            <iframe title="Formulario embebido" src="/frame.html" />
          </section>
        </div>
      </div>
      {dialog && (
        <Modal title="Detalles del contacto" onClose={() => setDialog(false)}>
          <p>Introduce el nombre del contacto.</p>
          <Field label="Nombre en modal">
            <input autoFocus />
          </Field>
          <button className="primary" onClick={() => setDialog(false)}>
            Aceptar
          </button>
        </Modal>
      )}
    </>
  );
}
export function Clinic() {
  const { refresh } = useLab();
  const { data, error } = useData("/appointments");
  return (
    <>
      <Heading
        eyebrow="CLINICPORTAL / CITAS"
        title="Agenda una cita"
        description="Selecciona un horario disponible y consulta tus citas confirmadas."
      />
      <div className="two-columns">
        <section className="panel">
          <h2>Datos de la cita</h2>
          <Form
            submit="Reservar cita"
            onSubmit={async (d) => {
              await api("/appointments", "POST", {
                ...d,
                consent: d.consent === "on",
              });
              refresh();
            }}
          >
            <Field label="Nombre del paciente">
              <input name="name" minLength={2} required autoComplete="name" />
            </Field>
            <Field label="Fecha">
              <input
                name="date"
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                required
              />
            </Field>
            <Field label="Hora">
              <select name="time">
                <option>09:00</option>
                <option>10:00</option>
                <option>11:00</option>
              </select>
            </Field>
            <label className="check">
              <input name="consent" type="checkbox" required />
              Confirmo los datos de la cita.
            </label>
          </Form>
        </section>
        <section className="panel">
          <h2>Mis citas</h2>
          <Error error={error} />
          {data && (
            <DataTable
              rows={data}
              columns={[
                ["name", "Paciente"],
                ["date", "Fecha"],
                ["time", "Hora"],
                ["status", "Estado"],
              ]}
            />
          )}
        </section>
      </div>
    </>
  );
}
export function Mobile() {
  const { run, refresh } = useLab();
  const { data, error } = useData("/deliveries"),
    { data: files } = useData("/attachments");
  const [offline, setOffline] = useState(false),
    [draft, setDraft] = useState(
      () => localStorage.getItem("qa-delivery-draft") ?? "",
    ),
    [fileId, setFileId] = useState("");
  useEffect(() => {
    localStorage.setItem("qa-delivery-draft", draft);
  }, [draft]);
  async function upload(file: File) {
    const content = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(",")[1]);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    const r = await run(
      () =>
        api("/attachments", "POST", {
          name: file.name,
          type: file.type,
          content,
        }),
      "Adjunto guardado.",
    );
    if (r) setFileId(r.id);
  }
  return (
    <>
      <Heading
        eyebrow="SERVISOAR / WEB MÓVIL"
        title="Operaciones de campo"
        description="Consulta entregas asignadas, registra observaciones y adjunta comprobantes."
      />
      <div className="two-columns">
        <section className="panel phone-panel">
          <div className="inline">
            <Badge tone={offline ? "" : "green"}>
              {offline ? "Offline simulado" : "Conectado"}
            </Badge>
            <button onClick={() => setOffline(!offline)}>
              {offline ? <Wifi size={17} /> : <WifiOff size={17} />}{" "}
              {offline ? "Reconectar" : "Simular offline"}
            </button>
          </div>
          <Error error={error} />
          {data?.map((d: Row) => (
            <div key={d.id}>
              <h2>{d.id}</h2>
              <p>{d.address}</p>
              <Badge>{d.status}</Badge>
              <Field label="Nota de entrega">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Entrega recibida por el destinatario"
                />
              </Field>
              <Field label="Foto o archivo adjunto">
                <input
                  type="file"
                  accept="image/png,image/jpeg,text/plain"
                  capture="environment"
                  disabled={offline}
                  onChange={(e) => {
                    if (e.target.files?.[0]) upload(e.target.files[0]);
                  }}
                />
              </Field>
              {fileId && <p>Adjunto: {fileId}</p>}
              <button
                className="primary"
                disabled={offline || d.status === "delivered" || !draft.trim()}
                onClick={async () => {
                  const r = await run(
                    () =>
                      api(
                        "/deliveries/" + d.id + "/complete",
                        "POST",
                        { note: draft, attachmentId: fileId || undefined },
                        idem(),
                      ),
                    "Entrega confirmada.",
                  );
                  if (r) setDraft("");
                }}
              >
                Confirmar entrega
              </button>
              {offline && (
                <p role="status">
                  Borrador guardado en este navegador. Reconecta para confirmar.
                </p>
              )}
            </div>
          ))}
        </section>
        <section className="panel">
          <h2>Archivos adjuntos</h2>
          {files && (
            <DataTable
              rows={files}
              columns={[
                ["name", "Archivo"],
                ["type", "Tipo"],
                ["size", "Bytes"],
              ]}
              actions={(f) => (
                <button
                  onClick={() =>
                    run(
                      () => download("/attachments/" + f.id, f.name),
                      "Adjunto descargado.",
                    )
                  }
                >
                  <Download size={16} /> Descargar
                </button>
              )}
            />
          )}
          <p className="muted small">
            Se aceptan PNG, JPEG y TXT de hasta 1 MB. Se validan las firmas de
            las imágenes.
          </p>
        </section>
      </div>
    </>
  );
}
export function AILab() {
  const [guard, setGuard] = useState<Row | null>(null),
    [answer, setAnswer] = useState<Row | null>(null);
  return (
    <>
      <Heading
        eyebrow="SERVICIOS / POLÍTICAS"
        title="Políticas y validación"
        description="Consulta políticas operativas y revisa el contenido antes de registrarlo."
      />
      <div className="two-columns">
        <section className="panel">
          <h2>TestData Guard</h2>
          <Form
            submit="Validar datos"
            onSubmit={async (d) => setGuard(await api("/ai/guard", "POST", d))}
          >
            <Field label="Texto para analizar">
              <textarea
                name="text"
                defaultValue="Consulta sobre el pedido ORD-001."
                required
              />
            </Field>
          </Form>
          {guard && (
            <div className="answer" role="status" data-testid="guard-result">
              <Badge tone={guard.allowed ? "green" : "amber"}>
                {guard.allowed
                  ? "Sin coincidencias detectadas"
                  : "Requiere revisión"}
              </Badge>
              {guard.findings.map((finding: string) => (
                <p key={finding}>{finding}</p>
              ))}
            </div>
          )}
          <p className="small muted">
            Análisis por patrones de correos, identificadores y credenciales.
          </p>
        </section>
        <section className="panel">
          <h2>Asistente de políticas</h2>
          <Form
            submit="Consultar"
            onSubmit={async (d) =>
              setAnswer(await api("/ai/answer", "POST", d))
            }
          >
            <Field label="Pregunta">
              <textarea
                name="question"
                defaultValue="¿Cuánto dura una reserva?"
                required
              />
            </Field>
          </Form>
          {answer && (
            <div className="answer" role="status">
              <Badge>POLÍTICAS LOCALES</Badge>
              <p>{answer.answer}</p>
              <details>
                <summary>Ver políticas de referencia</summary>
                <ul>
                  {answer.contexts.map((context: string) => (
                    <li key={context}>{context}</li>
                  ))}
                </ul>
              </details>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
export function ApiConsole() {
  const [path, setPath] = useState("/products"),
    [method, setMethod] = useState("GET"),
    [body, setBody] = useState("{}"),
    [delay, setDelay] = useState("0"),
    [failure, setFailure] = useState(false),
    [result, setResult] = useState(""),
    [status, setStatus] = useState(""),
    [key, setKey] = useState("demo-key-1"),
    [busy, setBusy] = useState(false);
  const { refresh } = useLab();
  async function send() {
    setBusy(true);
    try {
      if (
        !path.startsWith("/") ||
        path.startsWith("//") ||
        path.includes("..") ||
        path.includes("://")
      )
        throw new globalThis.Error("Usa una ruta local como /products.");
      const start = performance.now();
      const r = await fetch("/api" + path, {
        method,
        headers: {
          ...headers(),
          "Idempotency-Key": key,
          "X-Test-Delay": delay,
          ...(failure ? { "X-Test-Failure": "503" } : {}),
        },
        ...(method !== "GET" ? { body: JSON.stringify(JSON.parse(body)) } : {}),
      });
      setStatus(
        "HTTP " +
          r.status +
          " · " +
          Math.round(performance.now() - start) +
          " ms · correlation " +
          r.headers.get("x-correlation-id"),
      );
      setResult(await r.text());
      if (r.ok && method !== "GET") refresh();
    } catch (e) {
      setStatus("Error");
      setResult((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading
        eyebrow="API QUALITY / REST"
        title="Consola API"
        description="Envía solicitudes y consulta el estado, tiempo de respuesta y detalle de cada operación."
      />
      <section className="panel">
        <p className="small">
          Base URL: <code>{location.origin}/api</code> · X-Lab-Id:{" "}
          <code>{labId()}</code>
        </p>
        <div className="api-request">
          <select
            aria-label="Método HTTP"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            {["GET", "POST", "PATCH", "DELETE"].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <input
            aria-label="Ruta API"
            value={path}
            onChange={(e) => setPath(e.target.value)}
          />
          <button className="primary" disabled={busy} onClick={send}>
            <Play size={17} />
            {busy ? "Enviando…" : "Enviar"}
          </button>
        </div>
        <div className="two-columns">
          <Field label="Body JSON">
            <textarea
              className="code-input"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </Field>
          <div>
            <Field label="Idempotency-Key">
              <input value={key} onChange={(e) => setKey(e.target.value)} />
            </Field>
            <Field label="Latencia simulada (ms, máximo 5000)">
              <input
                type="number"
                min="0"
                max="5000"
                value={delay}
                onChange={(e) => setDelay(e.target.value)}
              />
            </Field>
            <label className="check">
              <input
                type="checkbox"
                checked={failure}
                onChange={(e) => setFailure(e.target.checked)}
              />{" "}
              Simular HTTP 503
            </label>
          </div>
        </div>
        <p role="status" className="api-status">
          {status || "Lista para enviar una solicitud."}
        </p>
        <pre className="response">
          {result || "La respuesta aparecerá aquí."}
        </pre>
      </section>
      <section className="panel">
        <h2>Endpoints disponibles</h2>
        <div className="endpoint-list">
          {[
            "/products",
            "/reservations",
            "/claims",
            "/parcels",
            "/accounts",
            "/events",
            "/lab/state",
            "/diagnostics/rate-limit",
            "/health",
          ].map((p) => (
            <button
              key={p}
              onClick={() => {
                setPath(p);
                setMethod("GET");
              }}
            >
              <code>GET {p}</code>
            </button>
          ))}
        </div>
        <p>
          <a href="/api/openapi.json" target="_blank" rel="noreferrer">
            Contrato OpenAPI
          </a>{" "}
          ·{" "}
          <a href="/tracking.wsdl" target="_blank" rel="noreferrer">
            Contrato SOAP/WSDL
          </a>
        </p>
      </section>
    </>
  );
}
export function DataLab() {
  const { data, error } = useData("/lab/audit");
  const { run, refresh } = useLab();
  const [query, setQuery] = useState(""),
    [action, setAction] = useState("");
  const rows: Row[] = data ?? [];
  const filtered = rows.filter(
    (r) =>
      (!action || r.action === action) &&
      [r.user, r.action, r.correlationId].some((v) =>
        String(v).toLowerCase().includes(query.toLowerCase()),
      ),
  );
  return (
    <>
      <Heading
        eyebrow="OPERACIONES / AUDITORÍA"
        title="Datos y trazabilidad"
        description="Consulta las operaciones registradas, sus responsables y referencias de seguimiento."
      >
        <button
          onClick={() =>
            run(
              () => download("/lab/export", "inventory.csv"),
              "Exportación completada.",
            )
          }
        >
          <Download size={18} /> Descargar inventario
        </button>
      </Heading>
      <Error error={error} />
      {!error && !data ? (
        <p role="status">Cargando actividad…</p>
      ) : (
        !error && (
          <>
            <div className="stats">
              <div>
                <span>Operaciones registradas</span>
                <strong>{rows.length}</strong>
              </div>
              <div>
                <span>Usuarios con actividad</span>
                <strong>{new Set(rows.map((r) => r.user)).size}</strong>
              </div>
              <div>
                <span>Última actividad</span>
                <strong className="audit-date">
                  {rows[0]
                    ? new Date(rows[0].at).toLocaleString("es-PE")
                    : "Sin actividad"}
                </strong>
              </div>
            </div>
            <section className="panel">
              <div className="audit-header">
                <div>
                  <h2>Historial de operaciones</h2>
                  <p className="muted small">
                    Últimos registros de actividad del espacio de trabajo.
                  </p>
                </div>
                <button onClick={refresh}>Actualizar</button>
              </div>
              <div className="audit-toolbar">
                <Field label="Buscar actividad">
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Usuario, acción o referencia…"
                  />
                </Field>
                <Field label="Tipo de operación">
                  <select
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                  >
                    <option value="">Todas las operaciones</option>
                    {[...new Set(rows.map((r) => r.action))].map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <p className="small muted" role="status">
                {filtered.length} registros
              </p>
              {filtered.length ? (
                <DataTable
                  rows={filtered.map((r) => ({
                    ...r,
                    at: new Date(r.at).toLocaleString("es-PE"),
                  }))}
                  columns={[
                    ["at", "Fecha y hora"],
                    ["user", "Responsable"],
                    ["action", "Operación"],
                    ["correlationId", "Referencia"],
                  ]}
                />
              ) : (
                <Empty
                  text={
                    rows.length
                      ? "No hay operaciones que coincidan con los filtros."
                      : "Todavía no hay operaciones registradas."
                  }
                />
              )}
            </section>
          </>
        )
      )}
    </>
  );
}
