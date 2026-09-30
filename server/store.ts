import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  randomUUID,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

export type Product = {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  icon: string;
  color: string;
  stock: Record<string, number>;
  active: boolean;
};
export type User = {
  id: string;
  username: string;
  role: "admin" | "operator" | "customer" | "auditor";
  name: string;
};
export type Row = Record<string, any>;
export type State = {
  products: Product[];
  reservations: Row[];
  movements: Row[];
  claims: Row[];
  parcels: Row[];
  orders: Row[];
  carts: Record<string, Row[]>;
  accounts: Row[];
  transfers: Row[];
  events: Row[];
  attachments: Row[];
  appointments: Row[];
  audits: Row[];
  deliveries: Row[];
  idempotency: Record<string, { fingerprint: string; response: any }>;
};
export const USERS: User[] = [
  { id: "u-admin", username: "admin", role: "admin", name: "Alex Admin" },
  {
    id: "u-operator",
    username: "operator",
    role: "operator",
    name: "Olivia Operaciones",
  },
  {
    id: "u-customer",
    username: "customer",
    role: "customer",
    name: "Camila Cliente",
  },
  {
    id: "u-customer2",
    username: "customer2",
    role: "customer",
    name: "Carlos Cliente",
  },
  {
    id: "u-auditor",
    username: "auditor",
    role: "auditor",
    name: "Andrea Auditoría",
  },
];
export const PASSWORD = "Test123!";
export const uid = (prefix: string) => `${prefix}-${randomUUID().slice(0, 8)}`;
export function seed(): State {
  const catalog = [
    [
      "P001",
      "Auriculares Studio",
      "Electrónica",
      18900,
      "headphones",
      "#ede9fe",
      24,
      10,
    ],
    [
      "P002",
      "Teclado mecánico",
      "Electrónica",
      25900,
      "keyboard",
      "#e0f2fe",
      18,
      7,
    ],
    [
      "P003",
      "Mouse inalámbrico",
      "Electrónica",
      8900,
      "mouse",
      "#dcfce7",
      32,
      12,
    ],
    [
      "P004",
      "Monitor 27 pulgadas",
      "Electrónica",
      89900,
      "monitor",
      "#fce7f3",
      8,
      4,
    ],
    [
      "P005",
      "Mochila urbana",
      "Accesorios",
      12900,
      "backpack",
      "#fef3c7",
      15,
      8,
    ],
    ["P006", "Botella térmica", "Hogar", 5900, "bottle", "#cffafe", 30, 20],
    [
      "P007",
      "Cámara de escritorio",
      "Electrónica",
      19900,
      "camera",
      "#ede9fe",
      0,
      0,
    ],
    ["P008", "Lámpara de estudio", "Hogar", 7900, "lamp", "#ffedd5", 3, 2],
    ["P009", "Reloj deportivo", "Accesorios", 34900, "watch", "#e0e7ff", 12, 5],
    [
      "P010",
      "Parlante portátil",
      "Electrónica",
      14900,
      "speaker",
      "#d1fae5",
      20,
      6,
    ],
    ["P011", "Cuaderno de notas", "Hogar", 2500, "book", "#fae8ff", 45, 25],
    ["P012", "Cable USB-C", "Accesorios", 3500, "cable", "#f1f5f9", 60, 30],
  ];
  return {
    products: catalog.map(
      ([id, name, category, price, icon, color, lima, arequipa]) => ({
        id: String(id),
        sku: `QA-${id}`,
        name: String(name),
        category: String(category),
        price: Number(price),
        icon: String(icon),
        color: String(color),
        stock: { Lima: Number(lima), Arequipa: Number(arequipa) },
        active: true,
      }),
    ),
    reservations: [],
    movements: [],
    orders: [],
    carts: {},
    transfers: [],
    events: [],
    attachments: [],
    appointments: [],
    audits: [],
    idempotency: {},
    claims: [
      {
        id: "CLM-001",
        owner: "u-customer",
        title: "Pantalla dañada en entrega",
        amount: 89900,
        status: "draft",
      },
      {
        id: "CLM-002",
        owner: "u-customer2",
        title: "Paquete incompleto",
        amount: 18900,
        status: "submitted",
      },
    ],
    parcels: [
      {
        id: "PKG-001",
        owner: "u-customer",
        recipient: "Camila Cliente",
        address: "Av. Demo 123, Lima",
        status: "created",
      },
      {
        id: "PKG-002",
        owner: "u-customer2",
        recipient: "Carlos Cliente",
        address: "Calle Prueba 456, Arequipa",
        status: "in_transit",
      },
    ],
    accounts: [
      { id: "ACC-001", owner: "u-customer", balance: 250000 },
      { id: "ACC-002", owner: "u-customer2", balance: 100000 },
    ],
    deliveries: [
      {
        id: "DEL-001",
        address: "Av. Demo 123",
        status: "assigned",
        note: "",
        attachmentId: null,
      },
    ],
  };
}
const dbPath = process.env.LAB_DB ?? "./data/lab.sqlite";
if (dbPath !== ":memory:")
  mkdirSync(dirname(resolve(dbPath)), { recursive: true });
export const db = new DatabaseSync(dbPath);
db.exec(`PRAGMA journal_mode=WAL;
 CREATE TABLE IF NOT EXISTS labs(id TEXT PRIMARY KEY, state TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
 CREATE TABLE IF NOT EXISTS registered_users(lab_id TEXT NOT NULL, id TEXT NOT NULL, username TEXT NOT NULL, name TEXT NOT NULL, password_hash TEXT NOT NULL, salt TEXT NOT NULL, PRIMARY KEY(lab_id,username), UNIQUE(lab_id,id));
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, lab_id TEXT NOT NULL, user_id TEXT NOT NULL, expires INTEGER NOT NULL);
 CREATE VIEW IF NOT EXISTS products AS SELECT labs.id lab_id,json_extract(value,'$.id') id,json_extract(value,'$.sku') sku,json_extract(value,'$.name') name,json_extract(value,'$.price') price_cents,json_extract(value,'$.stock.Lima') stock_lima,json_extract(value,'$.stock.Arequipa') stock_arequipa FROM labs,json_each(labs.state,'$.products');
 CREATE VIEW IF NOT EXISTS orders AS SELECT labs.id lab_id,json_extract(value,'$.id') id,json_extract(value,'$.owner') owner,json_extract(value,'$.total') total_cents,json_extract(value,'$.status') status FROM labs,json_each(labs.state,'$.orders');
 CREATE VIEW IF NOT EXISTS movements AS SELECT labs.id lab_id,value document FROM labs,json_each(labs.state,'$.movements');`);
export function createLab() {
  const id = randomUUID();
  db.prepare("INSERT INTO labs(id,state) VALUES (?,?)").run(
    id,
    JSON.stringify(seed()),
  );
  return id;
}
export function readLab(id: string): State | undefined {
  const row = db.prepare("SELECT state FROM labs WHERE id=?").get(id) as
    | { state: string }
    | undefined;
  return row ? JSON.parse(row.state) : undefined;
}
export function saveLab(id: string, state: State) {
  db.prepare("UPDATE labs SET state=? WHERE id=?").run(
    JSON.stringify(state),
    id,
  );
}
export function expire(s: State) {
  for (const r of s.reservations)
    if (r.status === "active" && r.expiresAt <= Date.now())
      r.status = "expired";
}
export function available(s: State, p: Product, warehouse = "Lima") {
  return (
    (p.stock[warehouse] ?? 0) -
    s.reservations
      .filter(
        (r) =>
          r.productId === p.id &&
          r.warehouse === warehouse &&
          r.status === "active",
      )
      .reduce((n, r) => n + r.quantity, 0)
  );
}
export function audit(
  s: State,
  user: User,
  action: string,
  correlationId: string,
) {
  s.audits.unshift({
    id: uid("AUD"),
    user: user.username,
    action,
    correlationId,
    at: new Date().toISOString(),
  });
  s.audits = s.audits.slice(0, 200);
}
export function registeredUser(
  labId: string,
  field: "id" | "username",
  value: string,
): User | undefined {
  const row = db
    .prepare(
      `SELECT id,username,name FROM registered_users WHERE lab_id=? AND ${field}=?`,
    )
    .get(labId, value) as
    | { id: string; username: string; name: string }
    | undefined;
  return row ? { ...row, role: "customer" } : undefined;
}
export function usernameExists(labId: string, username: string) {
  return (
    username === "locked_user" ||
    USERS.some((u) => u.username === username) ||
    !!registeredUser(labId, "username", username)
  );
}
export function registerUser(
  labId: string,
  name: string,
  username: string,
  password: string,
): User {
  const salt = randomBytes(16).toString("hex"),
    hash = scryptSync(password, salt, 64).toString("hex");
  const user: User = { id: randomUUID(), name, username, role: "customer" };
  db.prepare(
    "INSERT INTO registered_users(lab_id,id,username,name,password_hash,salt) VALUES(?,?,?,?,?,?)",
  ).run(labId, user.id, username, name, hash, salt);
  return user;
}
export function authenticate(
  labId: string,
  username: string,
  password: string,
): User | undefined {
  const seeded = USERS.find((u) => u.username === username);
  if (seeded) return password === PASSWORD ? seeded : undefined;
  const row = db
    .prepare(
      "SELECT password_hash,salt FROM registered_users WHERE lab_id=? AND username=?",
    )
    .get(labId, username) as
    | { password_hash: string; salt: string }
    | undefined;
  if (!row) return undefined;
  return timingSafeEqual(
    scryptSync(password, row.salt, 64),
    Buffer.from(row.password_hash, "hex"),
  )
    ? registeredUser(labId, "username", username)
    : undefined;
}
