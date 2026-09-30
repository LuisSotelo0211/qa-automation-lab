import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { randomUUID } from "node:crypto";
import {
  db,
  createLab,
  readLab,
  saveLab,
  seed,
  expire,
  available,
  audit,
  uid,
  USERS,
  registeredUser,
  usernameExists,
  registerUser,
  authenticate,
  type State,
  type User,
  type Row,
} from "./store.ts";

class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, message: string, code = "VALIDATION_ERROR") {
    super(message);
    this.status = status;
    this.code = code;
  }
}
const check = (
  condition: unknown,
  message: string,
  status = 422,
  code = "VALIDATION_ERROR",
): asserts condition => {
  if (!condition) throw new ApiError(status, message, code);
};
function integer(v: unknown, min = 1, max = 1000000): number {
  const n = Number(v);
  if (!Number.isSafeInteger(n) || n < min || n > max)
    throw new ApiError(422, `Se requiere un entero entre ${min} y ${max}.`);
  return n;
}
function text(v: unknown, min = 1, max = 150): string {
  if (typeof v !== "string" || v.trim().length < min || v.length > max)
    throw new ApiError(422, `Texto requerido: ${min}–${max} caracteres.`);
  return v.trim();
}
function role(user: User | undefined, ...roles: string[]): User {
  if (!user)
    throw new ApiError(401, "Inicia sesión para continuar.", "UNAUTHORIZED");
  if (roles.length && !roles.includes(user.role))
    throw new ApiError(
      403,
      "Tu rol no tiene permiso para esta operación.",
      "FORBIDDEN",
    );
  return user;
}
function own(user: User | undefined, row: Row) {
  const u = role(user);
  if (u.role !== "admin" && u.role !== "operator" && row.owner !== u.id)
    throw new ApiError(
      403,
      "No puedes acceder al recurso de otro usuario.",
      "FORBIDDEN",
    );
  return u;
}
const required = (rows: Row[], id: string) => {
  const r = rows.find((x) => x.id === id);
  if (!r) throw new ApiError(404, "Recurso no encontrado.", "NOT_FOUND");
  return r;
};
const isStaff = (u?: User) =>
  u && ["admin", "operator", "auditor"].includes(u.role);
function quote(subtotal: number, coupon: string) {
  if (coupon && coupon !== "QA10" && coupon !== "ENVIO")
    throw new ApiError(422, "Cupón inválido.");
  return {
    subtotal,
    discount: coupon === "QA10" ? Math.round(subtotal * 0.1) : 0,
    shipping: coupon === "ENVIO" || subtotal >= 30000 ? 0 : 1500,
  };
}
const rate = new Map<string, { count: number; until: number }>();
function rateLimit(key: string, max: number, ms: number) {
  const now = Date.now();
  if (rate.size > 10000)
    for (const [k, v] of rate) if (v.until < now) rate.delete(k);
  let r = rate.get(key);
  if (!r || r.until < now) {
    r = { count: 0, until: now + ms };
    rate.set(key, r);
  }
  if (++r.count > max)
    throw new ApiError(
      429,
      "Límite alcanzado; vuelve a intentar más tarde.",
      "RATE_LIMIT",
    );
}
export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");
    res.setHeader("X-Correlation-ID", randomUUID());
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.use(express.json({ limit: "2mb" }));
  app.get("/api/health", (_req, res) =>
    res.json({
      status: "ok",
      service: "qa-automation-lab",
      database: "sqlite",
      mode: "local-training",
    }),
  );
  app.post("/api/labs", (req, res) => {
    rateLimit(`labs:${req.ip}`, 200, 60000);
    res.status(201).json({ labId: createLab() });
  });
  app.get("/api/openapi.json", (_req, res) =>
    res.sendFile("openapi.json", { root: process.cwd() + "/public" }),
  );
  app.use("/api", async (req, res, next) => {
    try {
      const delay = Math.min(
        5000,
        Math.max(0, Number(req.header("x-test-delay") ?? 0) || 0),
      );
      if (delay) await new Promise((r) => setTimeout(r, delay));
      if (req.header("x-test-failure") === "503")
        throw new ApiError(
          503,
          "Dependencia no disponible (fallo de laboratorio).",
          "SIMULATED_FAILURE",
        );
      next();
    } catch (e) {
      next(e);
    }
  });
  app.all("/api/{*path}", (req, res, next) => {
    try {
      const labId = req.header("x-lab-id") ?? "";
      let s = readLab(labId);
      if (!s)
        throw new ApiError(
          400,
          "Crea un laboratorio con POST /api/labs y envía X-Lab-Id.",
          "LAB_REQUIRED",
        );
      expire(s);
      saveLab(labId, s);
      const token = (req.header("authorization") ?? "").replace(/^Bearer /, "");
      const session = db
        .prepare(
          "SELECT user_id FROM sessions WHERE token=? AND lab_id=? AND expires>?",
        )
        .get(token, labId, Date.now()) as { user_id: string } | undefined;
      const user = session
        ? (USERS.find((u) => u.id === session.user_id) ??
          registeredUser(labId, "id", session.user_id))
        : undefined;
      const route = req.path.replace(/^\/api(?=\/|$)/, "") || "/";
      const method = req.method;
      const b = req.body ?? {};
      const correlation = String(res.getHeader("X-Correlation-ID"));
      let out: any;
      let status = 200;
      let mutated = false;
      const change = (name: string) => {
        mutated = true;
        if (user) audit(s!, user, name, correlation);
      };
      const product = (id: string) => {
        const p = s!.products.find((p) => p.id === id && p.active);
        if (!p) throw new ApiError(404, "Producto no encontrado.", "NOT_FOUND");
        return p;
      };
      const idem = (operation: () => any) => {
        const key = req.header("idempotency-key");
        if (!key || key.length > 100)
          throw new ApiError(
            400,
            "Envía Idempotency-Key (1–100 caracteres).",
            "IDEMPOTENCY_REQUIRED",
          );
        const k = `${user?.id}:${route}:${key}`;
        const fingerprint = JSON.stringify(b);
        const old = s!.idempotency[k];
        if (old) {
          if (old.fingerprint !== fingerprint)
            throw new ApiError(
              409,
              "La clave ya se usó con otros datos.",
              "IDEMPOTENCY_CONFLICT",
            );
          return old.response;
        }
        const result = operation();
        s!.idempotency[k] = { fingerprint, response: result };
        return result;
      };
      const startSession = (u: User) => {
        const t = randomUUID();
        db.prepare(
          "INSERT INTO sessions(token,lab_id,user_id,expires) VALUES (?,?,?,?)",
        ).run(t, labId, u.id, Date.now() + 3600000);
        return { token: t, user: u, expiresIn: 3600 };
      };
      if (route === "/auth/register" && method === "POST") {
        rateLimit(`register:${labId}`, 5, 60000);
        const name = text(b.name, 2, 100),
          username = text(b.username, 3, 32).toLowerCase();
        if (!/^[a-z0-9_]{3,32}$/.test(username))
          throw new ApiError(
            422,
            "Usuario: usa de 3 a 32 letras, números o guiones bajos.",
          );
        if (
          typeof b.password !== "string" ||
          b.password.length < 12 ||
          b.password.length > 128
        )
          throw new ApiError(
            422,
            "La contraseña debe tener entre 12 y 128 caracteres.",
          );
        if (b.password !== b.confirmPassword)
          throw new ApiError(
            422,
            "Las contraseñas no coinciden.",
            "PASSWORD_MISMATCH",
          );
        if (usernameExists(labId, username))
          throw new ApiError(
            409,
            "El usuario ya está registrado.",
            "USERNAME_TAKEN",
          );
        const u = registerUser(labId, name, username, b.password);
        out = startSession(u);
        status = 201;
        mutated = true;
        audit(s, u, "account.register", correlation);
      } else if (route === "/auth/login" && method === "POST") {
        rateLimit(`login:${labId}`, 10, 60000);
        if (b.username === "locked_user")
          throw new ApiError(423, "Usuario bloqueado.", "ACCOUNT_LOCKED");
        const username =
          typeof b.username === "string" ? b.username.trim().toLowerCase() : "";
        const password =
          typeof b.password === "string" && b.password.length <= 128
            ? b.password
            : "";
        const u = authenticate(labId, username, password);
        if (!u)
          throw new ApiError(
            401,
            "Usuario o contraseña incorrectos.",
            "INVALID_CREDENTIALS",
          );
        out = startSession(u);
      } else if (route === "/auth/logout" && method === "POST") {
        db.prepare("DELETE FROM sessions WHERE token=? AND lab_id=?").run(
          token,
          labId,
        );
        out = { ok: true };
      } else if (route === "/auth/me" && method === "GET") {
        out = role(user);
      } else if (route === "/auth/expire" && method === "POST") {
        role(user);
        db.prepare("UPDATE sessions SET expires=0 WHERE token=?").run(token);
        out = { ok: true };
      } else if (route === "/products" && method === "GET") {
        let items = s.products
          .filter((p) => p.active)
          .map((p) => ({
            ...p,
            available: available(s!, p),
            totalStock: Object.values(p.stock).reduce((a, b) => a + b, 0),
          }));
        if (req.query.q)
          items = items.filter((p) =>
            (p.name + " " + p.sku)
              .toLowerCase()
              .includes(String(req.query.q).toLowerCase()),
          );
        if (req.query.category)
          items = items.filter((p) => p.category === req.query.category);
        if (req.query.inStock === "true")
          items = items.filter((p) => p.available > 0);
        if (req.query.sort === "price-asc")
          items.sort((a, b) => a.price - b.price);
        if (req.query.sort === "price-desc")
          items.sort((a, b) => b.price - a.price);
        const page = integer(req.query.page ?? 1),
          pageSize = integer(req.query.pageSize ?? 100, 1, 100);
        out = {
          items: items.slice((page - 1) * pageSize, page * pageSize),
          total: items.length,
          page,
          pageSize,
        };
      } else if (route === "/products" && method === "POST") {
        role(user, "admin");
        const sku = text(b.sku);
        if (s.products.some((p) => p.sku === sku))
          throw new ApiError(409, "El SKU ya existe.", "DUPLICATE_SKU");
        const p = {
          id: uid("P"),
          sku,
          name: text(b.name),
          category: text(b.category),
          price: integer(b.price, 1),
          icon: "box",
          color: "#ede9fe",
          stock: { Lima: integer(b.stock ?? 0, 0), Arequipa: 0 },
          active: true,
        };
        s.products.push(p);
        out = p;
        status = 201;
        change("product.create");
      } else if (/^\/products\/[^/]+$/.test(route)) {
        const p = product(route.split("/")[2]);
        if (method === "GET") out = { ...p, available: available(s, p) };
        else if (method === "PATCH") {
          role(user, "admin");
          if (b.name !== undefined) p.name = text(b.name);
          if (b.price !== undefined) p.price = integer(b.price, 1);
          if (b.category !== undefined) p.category = text(b.category);
          out = p;
          change("product.update");
        } else if (method === "DELETE") {
          role(user, "admin");
          if (
            s.reservations.some(
              (r) => r.productId === p.id && r.status === "active",
            )
          )
            throw new ApiError(409, "Libera las reservas antes de eliminar.");
          p.active = false;
          out = { ok: true };
          change("product.delete");
        }
      } else if (route === "/reservations" && method === "GET") {
        const u = role(user);
        out = s.reservations.filter((r) => isStaff(u) || r.owner === u.id);
      } else if (route === "/reservations" && method === "POST") {
        const u = role(user, "admin", "operator", "customer");
        out = idem(() => {
          const p = product(b.productId),
            quantity = integer(b.quantity),
            warehouse = text(b.warehouse ?? "Lima");
          if (!(warehouse in p.stock))
            throw new ApiError(422, "Almacén inválido.");
          if (available(s!, p, warehouse) < quantity)
            throw new ApiError(
              409,
              "Stock insuficiente.",
              "INSUFFICIENT_STOCK",
            );
          const r = {
            id: uid("RSV"),
            productId: p.id,
            productName: p.name,
            warehouse,
            quantity,
            owner: u.id,
            status: "active",
            expiresAt:
              Date.now() + integer(b.ttlSeconds ?? 900, 1, 86400) * 1000,
          };
          s!.reservations.push(r);
          return r;
        });
        status = 201;
        change("reservation.create");
      } else if (
        /^\/reservations\/[^/]+\/release$/.test(route) &&
        method === "POST"
      ) {
        const r = required(s.reservations, route.split("/")[2]);
        own(user, r);
        if (r.status !== "active")
          throw new ApiError(409, "La reserva ya no está activa.");
        r.status = "released";
        out = r;
        change("reservation.release");
      } else if (route === "/movements" && method === "GET") {
        role(user, "admin", "operator", "auditor");
        out = s.movements;
      } else if (route === "/movements" && method === "POST") {
        role(user, "admin", "operator");
        out = idem(() => {
          const p = product(b.productId),
            quantity = integer(b.quantity),
            from = text(b.from),
            to = text(b.to);
          if (from === to || !(from in p.stock) || !(to in p.stock))
            throw new ApiError(422, "Selecciona dos almacenes diferentes.");
          if (available(s!, p, from) < quantity)
            throw new ApiError(
              409,
              "Stock disponible insuficiente.",
              "INSUFFICIENT_STOCK",
            );
          p.stock[from] -= quantity;
          p.stock[to] += quantity;
          const m = {
            id: uid("MOV"),
            productId: p.id,
            quantity,
            from,
            to,
            at: new Date().toISOString(),
          };
          s!.movements.unshift(m);
          return m;
        });
        status = 201;
        change("stock.transfer");
      } else if (route === "/cart" && method === "GET") {
        const u = role(user);
        out = s.carts[u.id] ?? [];
      } else if (route === "/cart" && method === "POST") {
        const u = role(user, "admin", "operator", "customer"),
          p = product(b.productId),
          quantity = integer(b.quantity);
        const cart = s.carts[u.id] ?? [];
        const line = cart.find((x) => x.productId === p.id);
        if (available(s, p) < quantity + (line?.quantity ?? 0))
          throw new ApiError(409, "Stock insuficiente.", "INSUFFICIENT_STOCK");
        if (line) line.quantity += quantity;
        else
          cart.push({
            productId: p.id,
            name: p.name,
            price: p.price,
            quantity,
          });
        s.carts[u.id] = cart;
        out = cart;
        change("cart.add");
      } else if (
        /^\/cart\/[^/]+$/.test(route) &&
        ["PATCH", "DELETE"].includes(method)
      ) {
        const u = role(user, "admin", "operator", "customer"),
          id = route.split("/")[2],
          cart = s.carts[u.id] ?? [];
        const line = cart.find((x) => x.productId === id);
        if (!line) throw new ApiError(404, "Producto no está en el carrito.");
        if (method === "DELETE")
          s.carts[u.id] = cart.filter((x) => x.productId !== id);
        else {
          const n = integer(b.quantity);
          if (available(s, product(id)) < n)
            throw new ApiError(409, "Stock insuficiente.");
          line.quantity = n;
        }
        out = s.carts[u.id];
        change("cart.update");
      } else if (route === "/promotions/quote" && method === "POST") {
        const subtotal = integer(b.subtotal, 0);
        const q = quote(subtotal, String(b.coupon ?? ""));
        out = { ...q, total: q.subtotal - q.discount + q.shipping };
      } else if (route === "/checkout" && method === "POST") {
        const u = role(user, "admin", "operator", "customer");
        out = idem(() => {
          const cart = s!.carts[u.id] ?? [];
          if (!cart.length) throw new ApiError(422, "El carrito está vacío.");
          const address = text(b.address, 5);
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email ?? ""))
            throw new ApiError(422, "Correo inválido.");
          if (b.payment === "declined")
            throw new ApiError(
              402,
              "Pago rechazado (simulado).",
              "PAYMENT_DECLINED",
            );
          if (b.payment !== "approved")
            throw new ApiError(422, "Selecciona un resultado de pago válido.");
          for (const line of cart)
            if (available(s!, product(line.productId)) < line.quantity)
              throw new ApiError(
                409,
                "Stock cambió; revisa el carrito.",
                "INSUFFICIENT_STOCK",
              );
          const items: Row[] = cart.map((l) => ({
            ...l,
            price: product(l.productId).price,
          }));
          const q = quote(
            items.reduce((n, l) => n + l.price * l.quantity, 0),
            String(b.coupon ?? ""),
          );
          for (const line of items)
            product(line.productId).stock.Lima -= line.quantity;
          const order = {
            id: uid("ORD"),
            owner: u.id,
            items,
            address,
            email: b.email,
            ...q,
            total: q.subtotal - q.discount + q.shipping,
            status: "paid",
            at: new Date().toISOString(),
          };
          s!.orders.unshift(order);
          s!.carts[u.id] = [];
          s!.events.push({
            id: uid("EVT"),
            type: "order.created",
            payload: { orderId: order.id },
            status: "pending",
            attempts: 0,
          });
          return order;
        });
        status = 201;
        change("checkout");
      } else if (route === "/orders" && method === "GET") {
        const u = role(user);
        out = s.orders.filter((r) => isStaff(u) || r.owner === u.id);
      } else if (/^\/orders\/[^/]+\/refund$/.test(route) && method === "POST") {
        role(user, "admin");
        const order = required(s.orders, route.split("/")[2]);
        if (order.status !== "paid")
          throw new ApiError(409, "Pedido ya reembolsado.");
        for (const line of order.items) {
          const p = s.products.find((p) => p.id === line.productId);
          if (p) p.stock.Lima += line.quantity;
        }
        order.status = "refunded";
        out = order;
        change("order.refund");
      } else if (route === "/claims" && method === "GET") {
        const u = role(user);
        out = s.claims.filter((r) => isStaff(u) || r.owner === u.id);
      } else if (route === "/claims" && method === "POST") {
        const u = role(user, "admin", "operator", "customer");
        const r = {
          id: uid("CLM"),
          owner: u.id,
          title: text(b.title),
          amount: integer(b.amount, 1),
          status: "draft",
        };
        s.claims.push(r);
        out = r;
        status = 201;
        change("claim.create");
      } else if (/^\/claims\/[^/]+$/.test(route) && method === "GET") {
        out = required(s.claims, route.split("/")[2]);
        own(user, out);
      } else if (
        /^\/claims\/[^/]+\/transition$/.test(route) &&
        method === "POST"
      ) {
        const r = required(s.claims, route.split("/")[2]);
        const u = own(user, r);
        if (u.role === "auditor")
          throw new ApiError(403, "Auditor es de solo lectura.");
        const allowed: Record<string, string[]> = {
          draft: ["submitted"],
          submitted: ["approved", "rejected"],
          approved: ["paid"],
          rejected: [],
          paid: [],
        };
        if (!allowed[r.status]?.includes(b.status))
          throw new ApiError(409, "Transición inválida.", "INVALID_TRANSITION");
        if (b.status !== "submitted") role(user, "admin", "operator");
        r.status = b.status;
        out = r;
        change("claim.transition");
      } else if (route === "/parcels" && method === "GET") {
        const u = role(user);
        out = s.parcels.filter((r) => isStaff(u) || r.owner === u.id);
      } else if (route === "/parcels" && method === "POST") {
        const u = role(user, "admin", "operator", "customer");
        const p = {
          id: uid("PKG"),
          owner: u.id,
          recipient: text(b.recipient),
          address: text(b.address, 5),
          status: "created",
        };
        s.parcels.push(p);
        out = p;
        status = 201;
        change("parcel.create");
      } else if (
        /^\/parcels\/[^/]+\/transition$/.test(route) &&
        method === "POST"
      ) {
        role(user, "admin", "operator");
        const p = required(s.parcels, route.split("/")[2]);
        const next: Record<string, string> = {
          created: "in_transit",
          in_transit: "delivered",
        };
        if (next[p.status] !== b.status)
          throw new ApiError(409, "Transición inválida.", "INVALID_TRANSITION");
        p.status = b.status;
        s.events.push({
          id: uid("EVT"),
          type: "parcel.updated",
          payload: { parcelId: p.id, status: p.status },
          status: "pending",
          attempts: 0,
        });
        out = p;
        change("parcel.transition");
      } else if (route === "/accounts" && method === "GET") {
        const u = role(user);
        out = s.accounts.filter((r) => isStaff(u) || r.owner === u.id);
      } else if (route === "/transfers" && method === "GET") {
        const u = role(user);
        out = s.transfers.filter((r) => isStaff(u) || r.owner === u.id);
      } else if (route === "/transfers" && method === "POST") {
        const u = role(user, "admin", "customer");
        out = idem(() => {
          const from = required(s!.accounts, b.from),
            to = required(s!.accounts, b.to);
          own(u, from);
          if (from.id === to.id)
            throw new ApiError(422, "Las cuentas deben ser diferentes.");
          const amount = integer(b.amount, 1, 100000);
          if (from.balance < amount)
            throw new ApiError(
              409,
              "Saldo insuficiente.",
              "INSUFFICIENT_FUNDS",
            );
          from.balance -= amount;
          to.balance += amount;
          const t = {
            id: uid("TRF"),
            owner: u.id,
            from: from.id,
            to: to.id,
            amount,
            status: "completed",
          };
          s!.transfers.push(t);
          return t;
        });
        status = 201;
        change("transfer.create");
      } else if (route === "/events" && method === "GET") {
        role(user, "admin", "operator", "auditor");
        out = s.events;
      } else if (route === "/events" && method === "POST") {
        role(user, "admin", "operator");
        out = idem(() => {
          const event = {
            id: uid("EVT"),
            type: text(b.type),
            payload: b.payload ?? {},
            status: "pending",
            attempts: 0,
          };
          s!.events.push(event);
          return event;
        });
        status = 201;
        change("event.publish");
      } else if (route === "/events/process" && method === "POST") {
        role(user, "admin", "operator");
        for (const event of s.events.filter((e) => e.status === "pending")) {
          event.attempts++;
          event.status = b.fail
            ? event.attempts >= 3
              ? "dlq"
              : "pending"
            : "processed";
          event.lastError = b.fail ? "Dependency unavailable" : null;
        }
        out = s.events;
        change("event.process");
      } else if (/^\/events\/[^/]+\/retry$/.test(route) && method === "POST") {
        role(user, "admin", "operator");
        const e = required(s.events, route.split("/")[2]);
        if (e.status !== "dlq")
          throw new ApiError(409, "El evento no está en DLQ.");
        e.status = "pending";
        e.attempts = 0;
        out = e;
        change("event.retry");
      } else if (route === "/availability" && method === "GET") {
        out =
          req.query.empty === "true"
            ? []
            : [
                { id: "EV-001", name: "QA Summit", available: 12 },
                { id: "EV-002", name: "Automation Meetup", available: 0 },
              ];
      } else if (route === "/appointments" && method === "GET") {
        const u = role(user);
        out = s.appointments.filter((r) => isStaff(u) || r.owner === u.id);
      } else if (route === "/appointments" && method === "POST") {
        const u = role(user, "admin", "operator", "customer");
        const name = text(b.name, 2);
        const date = text(b.date);
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
          !Number.isFinite(Date.parse(date)) ||
          date < new Date().toISOString().slice(0, 10)
        )
          throw new ApiError(422, "Selecciona una fecha válida desde hoy.");
        if (b.consent !== true)
          throw new ApiError(422, "Debes aceptar el consentimiento.");
        const time = text(b.time);
        if (!["09:00", "10:00", "11:00"].includes(time))
          throw new ApiError(422, "Horario inválido.");
        if (s.appointments.some((a) => a.date === date && a.time === time))
          throw new ApiError(409, "Horario no disponible.");
        const a = {
          id: uid("APT"),
          owner: u.id,
          name,
          date,
          time,
          status: "confirmed",
        };
        s.appointments.push(a);
        out = a;
        status = 201;
        change("appointment.create");
      } else if (route === "/deliveries" && method === "GET") {
        role(user, "admin", "operator");
        out = s.deliveries;
      } else if (
        /^\/deliveries\/[^/]+\/complete$/.test(route) &&
        method === "POST"
      ) {
        role(user, "admin", "operator");
        const d = required(s.deliveries, route.split("/")[2]);
        out = idem(() => {
          if (d.status === "delivered")
            throw new ApiError(409, "Entrega ya confirmada.");
          if (b.attachmentId) required(s!.attachments, b.attachmentId);
          d.note = text(b.note);
          d.attachmentId = b.attachmentId ?? null;
          d.status = "delivered";
          return d;
        });
        change("delivery.complete");
      } else if (route === "/attachments" && method === "GET") {
        const u = role(user);
        out = s.attachments
          .filter((a) => isStaff(u) || a.owner === u.id)
          .map(({ content, ...a }) => a);
      } else if (route === "/attachments" && method === "POST") {
        const u = role(user, "admin", "operator", "customer");
        const name = text(b.name);
        if (!["image/png", "image/jpeg", "text/plain"].includes(b.type))
          throw new ApiError(415, "Solo PNG, JPEG o TXT.");
        const content = text(b.content, 1, 1400000);
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(content))
          throw new ApiError(422, "Contenido base64 inválido.");
        const bytes = Buffer.from(content, "base64");
        if (bytes.length > 1000000) throw new ApiError(413, "Máximo 1 MB.");
        if (
          b.type === "image/png" &&
          !bytes
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        )
          throw new ApiError(422, "Firma PNG inválida.");
        if (b.type === "image/jpeg" && (bytes[0] !== 255 || bytes[1] !== 216))
          throw new ApiError(422, "Firma JPEG inválida.");
        const a = {
          id: uid("FILE"),
          owner: u.id,
          name,
          type: b.type,
          size: bytes.length,
          content,
        };
        s.attachments.push(a);
        out = { ...a, content: undefined };
        status = 201;
        change("attachment.upload");
      } else if (/^\/attachments\/[^/]+$/.test(route) && method === "GET") {
        const a = required(s.attachments, route.split("/")[2]);
        own(user, a);
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${a.name.replace(/[^a-zA-Z0-9._-]/g, "_")}"`,
        );
        res.type(a.type).send(Buffer.from(a.content, "base64"));
        return;
      } else if (route === "/lab/state" && method === "GET") {
        role(user, "admin", "auditor");
        out = s;
      } else if (route === "/lab/audit" && method === "GET") {
        role(user, "admin", "auditor");
        out = s.audits;
      } else if (route === "/lab/reset" && method === "POST") {
        role(user, "admin");
        s = seed();
        out = {
          ok: true,
          message: "Datos restaurados. Las sesiones permanecen activas.",
        };
        mutated = true;
      } else if (route === "/lab/export" && method === "GET") {
        role(user, "admin", "operator", "auditor");
        const escape = (v: any) => '"' + String(v).replaceAll('"', '""') + '"';
        res
          .type("text/csv")
          .setHeader(
            "Content-Disposition",
            'attachment; filename="inventory.csv"',
          );
        res.send(
          "\uFEFFid,sku,name,price_cents,stock_lima,stock_arequipa,available_lima\n" +
            s.products
              .filter((p) => p.active)
              .map((p) =>
                [
                  p.id,
                  p.sku,
                  p.name,
                  p.price,
                  p.stock.Lima,
                  p.stock.Arequipa,
                  available(s!, p),
                ]
                  .map(escape)
                  .join(","),
              )
              .join("\n"),
        );
        return;
      } else if (route === "/diagnostics/rate-limit" && method === "GET") {
        rateLimit(`practice:${labId}`, 5, 10000);
        out = { ok: true, limit: 5, windowSeconds: 10 };
      } else if (route === "/diagnostics/echo" && method === "POST") {
        out = { received: b, correlationId: correlation };
      } else if (route === "/ai/guard" && method === "POST") {
        const input = text(b.text, 1, 5000);
        const findings = [
          ...(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(input) ? ["email"] : []),
          ...(/\b\d{8,16}\b/.test(input) ? ["identificador numérico"] : []),
          ...(/(?:sk-|password\s*[:=]|secret\s*[:=])/i.test(input)
            ? ["posible secreto"]
            : []),
        ];
        out = {
          allowed: !findings.length,
          findings,
          mode: "deterministic-rules",
          note: "Análisis por patrones; no es un detector exhaustivo de datos personales.",
        };
      } else if (route === "/ai/answer" && method === "POST") {
        const question = text(b.question, 1, 2000);
        const injection = /ignore|ignora|secret|contraseña|system prompt/i.test(
          question,
        );
        out = {
          answer: injection
            ? "Solicitud fuera del alcance."
            : /reserva/i.test(question)
              ? "Las reservas duran 15 minutos por defecto y pueden liberarse antes."
              : /cup[oó]n/i.test(question)
                ? "QA10 aplica 10% de descuento al subtotal. ENVIO elimina el envío."
                : "No encuentro esa información en el contexto.",
          contexts: [
            "Las reservas duran 15 minutos por defecto.",
            "QA10 descuenta 10% del subtotal. ENVIO elimina el envío.",
          ],
          refused: injection,
          mode: "deterministic-fixture",
          model: null,
        };
      }
      if (out === undefined)
        throw new ApiError(404, "Endpoint no encontrado.", "NOT_FOUND");
      if (mutated) saveLab(labId, s);
      res.status(status).json(out);
    } catch (e) {
      next(e);
    }
  });
  app.post(
    "/soap/tracking",
    express.text({ type: ["text/xml", "application/soap+xml"] }),
    (req, res) => {
      const match = String(req.body).match(
        /<(?:\w+:)?parcelId>([^<]+)<\/(?:\w+:)?parcelId>/,
      );
      const s = readLab(req.header("x-lab-id") ?? "");
      const p = s?.parcels.find((p) => p.id === match?.[1]);
      const esc = (v: string) =>
        v.replace(
          /[<>&"']/g,
          (c) =>
            ({
              "<": "&lt;",
              ">": "&gt;",
              "&": "&amp;",
              '"': "&quot;",
              "'": "&apos;",
            })[c]!,
        );
      res
        .status(p ? 200 : 404)
        .type("text/xml")
        .send(
          `<?xml version="1.0"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>${p ? `<TrackResponse><parcelId>${esc(p.id)}</parcelId><status>${esc(p.status)}</status></TrackResponse>` : "<soap:Fault><faultcode>Client</faultcode><faultstring>Parcel not found</faultstring></soap:Fault>"}</soap:Body></soap:Envelope>`,
        );
    },
  );
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status ?? 500;
    if (status >= 500 && !(err instanceof ApiError)) console.error(err);
    if (status === 429) res.setHeader("Retry-After", "10");
    res
      .status(status)
      .json({
        error: {
          code: err.code ?? "INTERNAL_ERROR",
          message:
            status >= 500 && !(err instanceof ApiError)
              ? "Error interno."
              : err.message,
          correlationId: res.getHeader("X-Correlation-ID"),
        },
      });
  });
  return app;
}
