(() => {
  // E:/Desarrollo/Proyectos/qa-automation-web-vanilla/js/seed.js
  var randomUUID = () => crypto.randomUUID();
  var USERS = [
    { id: "u-admin", username: "admin", role: "admin", name: "Alex Admin" },
    {
      id: "u-operator",
      username: "operator",
      role: "operator",
      name: "Olivia Operaciones"
    },
    {
      id: "u-customer",
      username: "customer",
      role: "customer",
      name: "Camila Cliente"
    },
    {
      id: "u-customer2",
      username: "customer2",
      role: "customer",
      name: "Carlos Cliente"
    },
    {
      id: "u-auditor",
      username: "auditor",
      role: "auditor",
      name: "Andrea Auditoría"
    }
  ];
  var PASSWORD = "Test123!";
  var uid = (prefix) => `${prefix}-${randomUUID().slice(0, 8)}`;
  function seed() {
    const catalog = [
      [
        "P001",
        "Auriculares Studio",
        "Electrónica",
        18900,
        "headphones",
        "#ede9fe",
        24,
        10
      ],
      [
        "P002",
        "Teclado mecánico",
        "Electrónica",
        25900,
        "keyboard",
        "#e0f2fe",
        18,
        7
      ],
      [
        "P003",
        "Mouse inalámbrico",
        "Electrónica",
        8900,
        "mouse",
        "#dcfce7",
        32,
        12
      ],
      [
        "P004",
        "Monitor 27 pulgadas",
        "Electrónica",
        89900,
        "monitor",
        "#fce7f3",
        8,
        4
      ],
      [
        "P005",
        "Mochila urbana",
        "Accesorios",
        12900,
        "backpack",
        "#fef3c7",
        15,
        8
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
        0
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
        6
      ],
      ["P011", "Cuaderno de notas", "Hogar", 2500, "book", "#fae8ff", 45, 25],
      ["P012", "Cable USB-C", "Accesorios", 3500, "cable", "#f1f5f9", 60, 30]
    ];
    return {
      products: catalog.map(
        ([id, name, category, price, icon, color, lima, arequipa]) => ({
          id: String(id),
          sku: `SKU-${id}`,
          name: String(name),
          category: String(category),
          price: Number(price),
          icon: String(icon),
          color: String(color),
          stock: { Lima: Number(lima), Arequipa: Number(arequipa) },
          active: true
        })
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
          status: "draft"
        },
        {
          id: "CLM-002",
          owner: "u-customer2",
          title: "Paquete incompleto",
          amount: 18900,
          status: "submitted"
        }
      ],
      parcels: [
        {
          id: "PKG-001",
          owner: "u-customer",
          recipient: "Camila Cliente",
          address: "Av. Demo 123, Lima",
          status: "created"
        },
        {
          id: "PKG-002",
          owner: "u-customer2",
          recipient: "Carlos Cliente",
          address: "Calle Prueba 456, Arequipa",
          status: "in_transit"
        }
      ],
      accounts: [
        { id: "ACC-001", owner: "u-customer", balance: 25e4 },
        { id: "ACC-002", owner: "u-customer2", balance: 1e5 }
      ],
      deliveries: [
        {
          id: "DEL-001",
          address: "Av. Demo 123",
          status: "assigned",
          note: "",
          attachmentId: null
        }
      ]
    };
  }
  function expire(s) {
    for (const r of s.reservations)
      if (r.status === "active" && r.expiresAt <= Date.now())
        r.status = "expired";
  }
  function available(s, p, warehouse = "Lima") {
    return (p.stock[warehouse] ?? 0) - s.reservations.filter(
      (r) => r.productId === p.id && r.warehouse === warehouse && r.status === "active"
    ).reduce((n, r) => n + r.quantity, 0);
  }
  function audit(s, user, action, correlationId) {
    s.audits.unshift({
      id: uid("AUD"),
      user: user.username,
      action,
      correlationId,
      at: (/* @__PURE__ */ new Date()).toISOString()
    });
    s.audits = s.audits.slice(0, 200);
  }

  // E:/Desarrollo/Proyectos/qa-automation-web-vanilla/js/storage.js
  var storageScope = "qa-pages:" + new URL(".", document.baseURI).pathname;
  var working;
  var queue = Promise.resolve();
  function connect() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(storageScope, 1);
      request.onupgradeneeded = () => request.result.createObjectStore("workspace");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error("Cierra otras pestañas para actualizar el almacenamiento."));
    });
  }
  function read(db) {
    return new Promise((resolve, reject) => {
      const request = db.transaction("workspace").objectStore("workspace").get("state");
      request.onsuccess = () => resolve(request.result ?? { labs: {}, users: {}, sessions: {} });
      request.onerror = () => reject(request.error);
    });
  }
  function commit(db, state) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction("workspace", "readwrite");
      tx.objectStore("workspace").put(state, "state");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("La operación no se guardó."));
    });
  }
  function transaction(operation) {
    const run = async () => {
      const db = await connect();
      try {
        working = await read(db);
        const result = await operation();
        await commit(db, working);
        return result;
      } finally {
        working = null;
        db.close();
      }
    };
    const locked = () => navigator.locks ? navigator.locks.request(storageScope, run) : run();
    const next = queue.then(locked, locked);
    queue = next.catch(() => {
    });
    return next;
  }
  function createLab() {
    const id = crypto.randomUUID();
    working.labs[id] = seed();
    return id;
  }
  var readLab = (id) => { const state = working.labs[id]; for (const product of state?.products ?? []) { if (product.sku === "QA-" + product.id) product.sku = "SKU-" + product.id; } return state; };
  var saveLab = (id, state) => {
    working.labs[id] = state;
  };
  var getSession = (token, lab) => {
    const session = working.sessions[token];
    return session?.lab === lab && session.expires > Date.now() ? session : void 0;
  };
  function openSession(lab, user) {
    const token = crypto.randomUUID();
    working.sessions[token] = { lab, user_id: user.id, expires: Date.now() + 36e5 };
    return { token, user, expiresIn: 3600 };
  }
  function closeSession(token, lab) {
    if (working.sessions[token]?.lab === lab) delete working.sessions[token];
  }
  function expireSession(token, lab) {
    if (working.sessions[token]?.lab === lab) working.sessions[token].expires = 0;
  }
  function registeredUser(lab, field2, value) {
    const row = Object.values(working.users[lab] ?? {}).find((u) => u[field2] === value);
    if (!row) return void 0;
    const { hash, salt, ...user } = row;
    return user;
  }
  var usernameExists = (lab, username) => ["locked_user", "__proto__", "constructor", "prototype"].includes(username) || USERS.some((u) => u.username === username) || !!registeredUser(lab, "username", username);
  async function digest(password, salt) {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: Uint8Array.from(salt), iterations: 1e5, hash: "SHA-256" }, key, 256);
    return Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, "0")).join("");
  }
  async function registerUser(lab, name, username, password) {
    const salt = Array.from(crypto.getRandomValues(new Uint8Array(16))), hash = await digest(password, salt);
    const user = { id: crypto.randomUUID(), name, username, role: "customer" };
    (working.users[lab] ??= {})[username] = { ...user, salt, hash };
    return user;
  }
  async function authenticate(lab, username, password) {
    const seeded = USERS.find((u) => u.username === username);
    if (seeded) return password === PASSWORD ? seeded : void 0;
    const user = working.users[lab]?.[username];
    return user && await digest(password, user.salt) === user.hash ? registeredUser(lab, "username", username) : void 0;
  }

  // E:/Desarrollo/Proyectos/qa-automation-web-vanilla/js/simulator.js
  var randomUUID2 = () => crypto.randomUUID();
  var ApiError = class extends Error {
    status;
    code;
    constructor(status, message, code = "VALIDATION_ERROR") {
      super(message);
      this.status = status;
      this.code = code;
    }
  };
  function integer(v, min = 1, max = 1e6) {
    const n = Number(v);
    if (!Number.isSafeInteger(n) || n < min || n > max)
      throw new ApiError(422, `Se requiere un entero entre ${min} y ${max}.`);
    return n;
  }
  function text(v, min = 1, max = 150) {
    if (typeof v !== "string" || v.trim().length < min || v.length > max)
      throw new ApiError(422, `Texto requerido: ${min}–${max} caracteres.`);
    return v.trim();
  }
  function role(user, ...roles) {
    if (!user)
      throw new ApiError(401, "Inicia sesión para continuar.", "UNAUTHORIZED");
    if (roles.length && !roles.includes(user.role))
      throw new ApiError(
        403,
        "Tu rol no tiene permiso para esta operación.",
        "FORBIDDEN"
      );
    return user;
  }
  function own(user, row) {
    const u = role(user);
    if (u.role !== "admin" && u.role !== "operator" && row.owner !== u.id)
      throw new ApiError(
        403,
        "No puedes acceder al recurso de otro usuario.",
        "FORBIDDEN"
      );
    return u;
  }
  var required = (rows, id) => {
    const r = rows.find((x) => x.id === id);
    if (!r) throw new ApiError(404, "Recurso no encontrado.", "NOT_FOUND");
    return r;
  };
  var isStaff = (u) => u && ["admin", "operator", "auditor"].includes(u.role);
  function quote(subtotal, coupon) {
    if (coupon && coupon !== "BIENVENIDA10" && coupon !== "ENVIO")
      throw new ApiError(422, "Cupón inválido.");
    return {
      subtotal,
      discount: coupon === "BIENVENIDA10" ? Math.round(subtotal * 0.1) : 0,
      shipping: coupon === "ENVIO" || subtotal >= 3e4 ? 0 : 1500
    };
  }
  var rate = /* @__PURE__ */ new Map();
  function rateLimit(key, max, ms) {
    const now = Date.now();
    if (rate.size > 1e4) {
      for (const [k, v] of rate) if (v.until < now) rate.delete(k);
    }
    let r = rate.get(key);
    if (!r || r.until < now) {
      r = { count: 0, until: now + ms };
      rate.set(key, r);
    }
    if (++r.count > max)
      throw new ApiError(
        429,
        "Límite alcanzado; vuelve a intentar más tarde.",
        "RATE_LIMIT"
      );
  }
  async function dispatch(req, res) {
    const labId2 = req.header("x-lab-id") ?? "";
    let s = readLab(labId2);
    if (!s)
      throw new ApiError(
        400,
        "Crea un laboratorio con POST /api/labs y envía X-Lab-Id.",
        "LAB_REQUIRED"
      );
    expire(s);
    saveLab(labId2, s);
    const token = (req.header("authorization") ?? "").replace(/^Bearer /, "");
    const session = getSession(token, labId2);
    const user = session ? USERS.find((u) => u.id === session.user_id) ?? registeredUser(labId2, "id", session.user_id) : void 0;
    const route = req.path.replace(/^\/api(?=\/|$)/, "") || "/";
    const method = req.method;
    const b = req.body ?? {};
    const correlation = String(res.getHeader("X-Correlation-ID"));
    let out;
    let status = 200;
    let mutated = false;
    const change = (name) => {
      mutated = true;
      if (user) audit(s, user, name, correlation);
    };
    const product = (id) => {
      const p = s.products.find((p2) => p2.id === id && p2.active);
      if (!p) throw new ApiError(404, "Producto no encontrado.", "NOT_FOUND");
      return p;
    };
    const idem2 = (operation) => {
      const key = req.header("idempotency-key");
      if (!key || key.length > 100)
        throw new ApiError(
          400,
          "Envía Idempotency-Key (1–100 caracteres).",
          "IDEMPOTENCY_REQUIRED"
        );
      const k = `${user?.id}:${route}:${key}`;
      const fingerprint = JSON.stringify(b);
      const old = s.idempotency[k];
      if (old) {
        if (old.fingerprint !== fingerprint)
          throw new ApiError(
            409,
            "La clave ya se usó con otros datos.",
            "IDEMPOTENCY_CONFLICT"
          );
        return old.response;
      }
      const result = operation();
      s.idempotency[k] = { fingerprint, response: result };
      return result;
    };
    const startSession = (u) => openSession(labId2, u);
    if (route === "/auth/register" && method === "POST") {
      rateLimit(`register:${labId2}`, 5, 6e4);
      const name = text(b.name, 2, 100), username = text(b.username, 3, 32).toLowerCase();
      if (!/^[a-z0-9_]{3,32}$/.test(username))
        throw new ApiError(
          422,
          "Usuario: usa de 3 a 32 letras, números o guiones bajos."
        );
      if (typeof b.password !== "string" || b.password.length < 12 || b.password.length > 128)
        throw new ApiError(
          422,
          "La contraseña debe tener entre 12 y 128 caracteres."
        );
      if (b.password !== b.confirmPassword)
        throw new ApiError(
          422,
          "Las contraseñas no coinciden.",
          "PASSWORD_MISMATCH"
        );
      if (usernameExists(labId2, username))
        throw new ApiError(
          409,
          "El usuario ya está registrado.",
          "USERNAME_TAKEN"
        );
      const u = await registerUser(labId2, name, username, b.password);
      out = startSession(u);
      status = 201;
      mutated = true;
      audit(s, u, "account.register", correlation);
    } else if (route === "/auth/login" && method === "POST") {
      rateLimit(`login:${labId2}`, 10, 6e4);
      if (b.username === "locked_user")
        throw new ApiError(423, "Usuario bloqueado.", "ACCOUNT_LOCKED");
      const username = typeof b.username === "string" ? b.username.trim().toLowerCase() : "";
      const password = typeof b.password === "string" && b.password.length <= 128 ? b.password : "";
      const u = await authenticate(labId2, username, password);
      if (!u)
        throw new ApiError(
          401,
          "Usuario o contraseña incorrectos.",
          "INVALID_CREDENTIALS"
        );
      out = startSession(u);
    } else if (route === "/auth/logout" && method === "POST") {
      closeSession(token, labId2);
      out = { ok: true };
    } else if (route === "/auth/me" && method === "GET") {
      out = role(user);
    } else if (route === "/auth/expire" && method === "POST") {
      role(user);
      expireSession(token, labId2);
      out = { ok: true };
    } else if (route === "/products" && method === "GET") {
      let items = s.products.filter((p) => p.active).map((p) => ({
        ...p,
        available: available(s, p),
        totalStock: Object.values(p.stock).reduce((a, b2) => a + b2, 0)
      }));
      if (req.query.q)
        items = items.filter(
          (p) => (p.name + " " + p.sku).toLowerCase().includes(String(req.query.q).toLowerCase())
        );
      if (req.query.category)
        items = items.filter((p) => p.category === req.query.category);
      if (req.query.inStock === "true")
        items = items.filter((p) => p.available > 0);
      if (req.query.sort === "price-asc")
        items.sort((a, b2) => a.price - b2.price);
      if (req.query.sort === "price-desc")
        items.sort((a, b2) => b2.price - a.price);
      const page = integer(req.query.page ?? 1), pageSize = integer(req.query.pageSize ?? 100, 1, 100);
      out = {
        items: items.slice((page - 1) * pageSize, page * pageSize),
        total: items.length,
        page,
        pageSize
      };
    } else if (route === "/products" && method === "POST") {
      role(user, "admin");
      const sku = text(b.sku);
      if (s.products.some((p2) => p2.sku === sku))
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
        active: true
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
        if (b.name !== void 0) p.name = text(b.name);
        if (b.price !== void 0) p.price = integer(b.price, 1);
        if (b.category !== void 0) p.category = text(b.category);
        out = p;
        change("product.update");
      } else if (method === "DELETE") {
        role(user, "admin");
        if (s.reservations.some(
          (r) => r.productId === p.id && r.status === "active"
        ))
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
      out = idem2(() => {
        const p = product(b.productId), quantity = integer(b.quantity), warehouse = text(b.warehouse ?? "Lima");
        if (!Object.hasOwn(p.stock, warehouse))
          throw new ApiError(422, "Almacén inválido.");
        if (available(s, p, warehouse) < quantity)
          throw new ApiError(
            409,
            "Stock insuficiente.",
            "INSUFFICIENT_STOCK"
          );
        const r = {
          id: uid("RSV"),
          productId: p.id,
          productName: p.name,
          warehouse,
          quantity,
          owner: u.id,
          status: "active",
          expiresAt: Date.now() + integer(b.ttlSeconds ?? 900, 1, 86400) * 1e3
        };
        s.reservations.push(r);
        return r;
      });
      status = 201;
      change("reservation.create");
    } else if (/^\/reservations\/[^/]+\/release$/.test(route) && method === "POST") {
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
      out = idem2(() => {
        const p = product(b.productId), quantity = integer(b.quantity), from = text(b.from), to = text(b.to);
        if (from === to || !Object.hasOwn(p.stock, from) || !Object.hasOwn(p.stock, to))
          throw new ApiError(422, "Selecciona dos almacenes diferentes.");
        if (available(s, p, from) < quantity)
          throw new ApiError(
            409,
            "Stock disponible insuficiente.",
            "INSUFFICIENT_STOCK"
          );
        p.stock[from] -= quantity;
        p.stock[to] += quantity;
        const m = {
          id: uid("MOV"),
          productId: p.id,
          quantity,
          from,
          to,
          at: (/* @__PURE__ */ new Date()).toISOString()
        };
        s.movements.unshift(m);
        return m;
      });
      status = 201;
      change("stock.transfer");
    } else if (route === "/cart" && method === "GET") {
      const u = role(user);
      out = s.carts[u.id] ?? [];
    } else if (route === "/cart" && method === "POST") {
      const u = role(user, "admin", "operator", "customer"), p = product(b.productId), quantity = integer(b.quantity);
      const cart2 = s.carts[u.id] ?? [];
      const line = cart2.find((x) => x.productId === p.id);
      if (available(s, p) < quantity + (line?.quantity ?? 0))
        throw new ApiError(409, "Stock insuficiente.", "INSUFFICIENT_STOCK");
      if (line) line.quantity += quantity;
      else
        cart2.push({
          productId: p.id,
          name: p.name,
          price: p.price,
          quantity
        });
      s.carts[u.id] = cart2;
      out = cart2;
      change("cart.add");
    } else if (/^\/cart\/[^/]+$/.test(route) && ["PATCH", "DELETE"].includes(method)) {
      const u = role(user, "admin", "operator", "customer"), id = route.split("/")[2], cart2 = s.carts[u.id] ?? [];
      const line = cart2.find((x) => x.productId === id);
      if (!line) throw new ApiError(404, "Producto no está en el carrito.");
      if (method === "DELETE")
        s.carts[u.id] = cart2.filter((x) => x.productId !== id);
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
      out = idem2(() => {
        const cart2 = s.carts[u.id] ?? [];
        if (!cart2.length) throw new ApiError(422, "El carrito está vacío.");
        const address = text(b.address, 5);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email ?? ""))
          throw new ApiError(422, "Correo inválido.");
        if (b.payment === "declined")
          throw new ApiError(
            402,
            "Pago rechazado (simulado).",
            "PAYMENT_DECLINED"
          );
        if (b.payment !== "approved")
          throw new ApiError(422, "Selecciona un resultado de pago válido.");
        for (const line of cart2)
          if (available(s, product(line.productId)) < line.quantity)
            throw new ApiError(
              409,
              "Stock cambió; revisa el carrito.",
              "INSUFFICIENT_STOCK"
            );
        const items = cart2.map((l) => ({
          ...l,
          price: product(l.productId).price
        }));
        const q = quote(
          items.reduce((n, l) => n + l.price * l.quantity, 0),
          String(b.coupon ?? "")
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
          at: (/* @__PURE__ */ new Date()).toISOString()
        };
        s.orders.unshift(order);
        s.carts[u.id] = [];
        s.events.push({
          id: uid("EVT"),
          type: "order.created",
          payload: { orderId: order.id },
          status: "pending",
          attempts: 0
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
        const p = s.products.find((p2) => p2.id === line.productId);
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
        status: "draft"
      };
      s.claims.push(r);
      out = r;
      status = 201;
      change("claim.create");
    } else if (/^\/claims\/[^/]+$/.test(route) && method === "GET") {
      out = required(s.claims, route.split("/")[2]);
      own(user, out);
    } else if (/^\/claims\/[^/]+\/transition$/.test(route) && method === "POST") {
      const r = required(s.claims, route.split("/")[2]);
      const u = own(user, r);
      if (u.role === "auditor")
        throw new ApiError(403, "Auditor es de solo lectura.");
      const allowed = {
        draft: ["submitted"],
        submitted: ["approved", "rejected"],
        approved: ["paid"],
        rejected: [],
        paid: []
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
        status: "created"
      };
      s.parcels.push(p);
      out = p;
      status = 201;
      change("parcel.create");
    } else if (/^\/parcels\/[^/]+\/transition$/.test(route) && method === "POST") {
      role(user, "admin", "operator");
      const p = required(s.parcels, route.split("/")[2]);
      const next = {
        created: "in_transit",
        in_transit: "delivered"
      };
      if (next[p.status] !== b.status)
        throw new ApiError(409, "Transición inválida.", "INVALID_TRANSITION");
      p.status = b.status;
      s.events.push({
        id: uid("EVT"),
        type: "parcel.updated",
        payload: { parcelId: p.id, status: p.status },
        status: "pending",
        attempts: 0
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
      out = idem2(() => {
        const from = required(s.accounts, b.from), to = required(s.accounts, b.to);
        own(u, from);
        if (from.id === to.id)
          throw new ApiError(422, "Las cuentas deben ser diferentes.");
        const amount = integer(b.amount, 1, 1e5);
        if (from.balance < amount)
          throw new ApiError(
            409,
            "Saldo insuficiente.",
            "INSUFFICIENT_FUNDS"
          );
        from.balance -= amount;
        to.balance += amount;
        const t = {
          id: uid("TRF"),
          owner: u.id,
          from: from.id,
          to: to.id,
          amount,
          status: "completed"
        };
        s.transfers.push(t);
        return t;
      });
      status = 201;
      change("transfer.create");
    } else if (route === "/events" && method === "GET") {
      role(user, "admin", "operator", "auditor");
      out = s.events;
    } else if (route === "/events" && method === "POST") {
      role(user, "admin", "operator");
      out = idem2(() => {
        const event = {
          id: uid("EVT"),
          type: text(b.type),
          payload: b.payload ?? {},
          status: "pending",
          attempts: 0
        };
        s.events.push(event);
        return event;
      });
      status = 201;
      change("event.publish");
    } else if (route === "/events/process" && method === "POST") {
      role(user, "admin", "operator");
      for (const event of s.events.filter((e) => e.status === "pending")) {
        event.attempts++;
        event.status = b.fail ? event.attempts >= 3 ? "dlq" : "pending" : "processed";
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
      out = req.query.empty === "true" ? [] : [
        { id: "EV-001", name: "Encuentro de negocios", available: 12 },
        { id: "EV-002", name: "Encuentro de comercios", available: 0 }
      ];
    } else if (route === "/appointments" && method === "GET") {
      const u = role(user);
      out = s.appointments.filter((r) => isStaff(u) || r.owner === u.id);
    } else if (route === "/appointments" && method === "POST") {
      const u = role(user, "admin", "operator", "customer");
      const name = text(b.name, 2);
      const date = text(b.date);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || date < (/* @__PURE__ */ new Date()).toISOString().slice(0, 10))
        throw new ApiError(422, "Selecciona una fecha válida desde hoy.");
      if (b.consent !== true)
        throw new ApiError(422, "Debes aceptar el consentimiento.");
      const time = text(b.time);
      if (!["09:00", "10:00", "11:00"].includes(time))
        throw new ApiError(422, "Horario inválido.");
      if (s.appointments.some((a2) => a2.date === date && a2.time === time))
        throw new ApiError(409, "Horario no disponible.");
      const a = {
        id: uid("APT"),
        owner: u.id,
        name,
        date,
        time,
        status: "confirmed"
      };
      s.appointments.push(a);
      out = a;
      status = 201;
      change("appointment.create");
    } else if (route === "/deliveries" && method === "GET") {
      role(user, "admin", "operator");
      out = s.deliveries;
    } else if (/^\/deliveries\/[^/]+\/complete$/.test(route) && method === "POST") {
      role(user, "admin", "operator");
      const d = required(s.deliveries, route.split("/")[2]);
      out = idem2(() => {
        if (d.status === "delivered")
          throw new ApiError(409, "Entrega ya confirmada.");
        if (b.attachmentId) required(s.attachments, b.attachmentId);
        d.note = text(b.note);
        d.attachmentId = b.attachmentId ?? null;
        d.status = "delivered";
        return d;
      });
      change("delivery.complete");
    } else if (route === "/attachments" && method === "GET") {
      const u = role(user);
      out = s.attachments.filter((a) => isStaff(u) || a.owner === u.id).map(({ content, ...a }) => a);
    } else if (route === "/attachments" && method === "POST") {
      const u = role(user, "admin", "operator", "customer");
      const name = text(b.name);
      if (!["image/png", "image/jpeg", "text/plain"].includes(b.type))
        throw new ApiError(415, "Solo PNG, JPEG o TXT.");
      const content = text(b.content, 1, 14e5);
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(content))
        throw new ApiError(422, "Contenido base64 inválido.");
      const bytes = decodeBase64(content);
      if (bytes.length > 1e6) throw new ApiError(413, "Máximo 1 MB.");
      if (b.type === "image/png" && ![137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v))
        throw new ApiError(422, "Firma PNG inválida.");
      if (b.type === "image/jpeg" && (bytes[0] !== 255 || bytes[1] !== 216))
        throw new ApiError(422, "Firma JPEG inválida.");
      const a = {
        id: uid("FILE"),
        owner: u.id,
        name,
        type: b.type,
        size: bytes.length,
        content
      };
      s.attachments.push(a);
      out = { ...a, content: void 0 };
      status = 201;
      change("attachment.upload");
    } else if (/^\/attachments\/[^/]+$/.test(route) && method === "GET") {
      const a = required(s.attachments, route.split("/")[2]);
      own(user, a);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${a.name.replace(/[^a-zA-Z0-9._-]/g, "_")}"`
      );
      res.type(a.type).send(decodeBase64(a.content));
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
        message: "Datos restaurados. Las sesiones permanecen activas."
      };
      mutated = true;
    } else if (route === "/lab/export" && method === "GET") {
      role(user, "admin", "operator", "auditor");
      const escape = (v) => '"' + String(v).replaceAll('"', '""') + '"';
      res.type("text/csv").setHeader(
        "Content-Disposition",
        'attachment; filename="inventory.csv"'
      );
      res.send(
        "\uFEFFid,sku,name,price_cents,stock_lima,stock_arequipa,available_lima\n" + s.products.filter((p) => p.active).map(
          (p) => [
            p.id,
            p.sku,
            p.name,
            p.price,
            p.stock.Lima,
            p.stock.Arequipa,
            available(s, p)
          ].map(escape).join(",")
        ).join("\n")
      );
      return;
    } else if (route === "/diagnostics/rate-limit" && method === "GET") {
      rateLimit(`practice:${labId2}`, 5, 1e4);
      out = { ok: true, limit: 5, windowSeconds: 10 };
    } else if (route === "/diagnostics/echo" && method === "POST") {
      out = { received: b, correlationId: correlation };
    } else if (route === "/ai/guard" && method === "POST") {
      const input2 = text(b.text, 1, 5e3);
      const findings = [
        .../[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(input2) ? ["email"] : [],
        .../\b\d{8,16}\b/.test(input2) ? ["identificador numérico"] : [],
        .../(?:sk-|password\s*[:=]|secret\s*[:=])/i.test(input2) ? ["posible secreto"] : []
      ];
      out = {
        allowed: !findings.length,
        findings,
        mode: "deterministic-rules",
        note: "Análisis por patrones; no es un detector exhaustivo de datos personales."
      };
    } else if (route === "/ai/answer" && method === "POST") {
      const question = text(b.question, 1, 2e3);
      const injection = /ignore|ignora|secret|contraseña|system prompt/i.test(
        question
      );
      out = {
        answer: injection ? "Solicitud fuera del alcance." : /reserva/i.test(question) ? "Las reservas duran 15 minutos por defecto y pueden liberarse antes." : /cup[oó]n/i.test(question) ? "BIENVENIDA10 aplica 10% de descuento al subtotal. ENVIO elimina el envío." : "No encuentro esa información en el contexto.",
        contexts: [
          "Las reservas duran 15 minutos por defecto.",
          "BIENVENIDA10 descuenta 10% del subtotal. ENVIO elimina el envío."
        ],
        refused: injection,
        mode: "deterministic-fixture",
        model: null
      };
    }
    if (out === void 0)
      throw new ApiError(404, "Endpoint no encontrado.", "NOT_FOUND");
    if (mutated) saveLab(labId2, s);
    res.status(status).json(out);
  }
  function decodeBase64(value) {
    try {
      return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
    } catch {
      throw new ApiError(422, "Contenido base64 inválido.");
    }
  }
  function responseBuilder(correlation) {
    const headers2 = new Headers({ "Content-Type": "application/json", "X-Correlation-ID": correlation, "X-Operation-Transport": "browser-simulation" });
    return {
      code: 200,
      value: null,
      headers: headers2,
      status(n) {
        this.code = n;
        return this;
      },
      getHeader(k) {
        return headers2.get(k);
      },
      setHeader(k, v) {
        headers2.set(k, v);
        return this;
      },
      type(t) {
        headers2.set("Content-Type", t);
        return this;
      },
      json(v) {
        this.value = JSON.stringify(v);
        return this;
      },
      send(v) {
        this.value = v;
        return this;
      },
      finish() {
        return new Response(this.value, { status: this.code, headers: headers2 });
      }
    };
  }
  async function simulateRequest(path, options = {}) {
    const correlation = randomUUID2(), res = responseBuilder(correlation);
    try {
      if (!path.startsWith("/api/") || path.includes("..") || path.includes("://")) throw new ApiError(400, "Ruta local inválida.");
      const url = new URL(path, "https://simulator.invalid"), headers2 = new Headers(options.headers);
      const req = { path: url.pathname, method: (options.method ?? "GET").toUpperCase(), query: Object.fromEntries(url.searchParams), header: (k) => headers2.get(k), body: {} };
      if (options.body) {
        if (options.body.length > 2e6) throw new ApiError(413, "Solicitud demasiado grande.");
        try {
          req.body = JSON.parse(options.body);
        } catch {
          throw new ApiError(400, "El cuerpo JSON no es válido.");
        }
      }
      const delay = Math.min(5e3, Math.max(0, Number(headers2.get("X-Test-Delay")) || 0));
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      if (headers2.get("X-Test-Failure") === "503") throw new ApiError(503, "Dependencia no disponible.", "SIMULATED_FAILURE");
      await transaction(async () => {
        if (req.path === "/api/health" && req.method === "GET") {
          res.json({ status: "ok", mode: "browser-simulation", storage: "IndexedDB" });
          return;
        }
        if (req.path === "/api/labs" && req.method === "POST") {
          rateLimit("spaces", 30, 6e4);
          res.status(201).json({ labId: createLab() });
          return;
        }
        await dispatch(req, res);
      });
    } catch (error) {
      const status = error.name === "QuotaExceededError" ? 507 : error.status ?? 500;
      if (status === 429) res.setHeader("Retry-After", "10");
      res.status(status).type("application/json").json({ error: { code: error.code ?? "STORAGE_ERROR", message: status === 507 ? "El almacenamiento del navegador está lleno." : error.message ?? "No se pudo completar la operación.", correlationId: correlation } });
    }
    return res.finish();
  }

  // E:/Desarrollo/Proyectos/qa-automation-web-vanilla/js/api.js
  var money = (cents) => new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(cents / 100);
  var labId = () => localStorage.getItem(storageScope + ":lab") ?? "";
  var headers = () => ({ "Content-Type": "application/json", "X-Lab-Id": labId(), Authorization: "Bearer " + (sessionStorage.getItem("qa-pages-token") ?? "") });
  async function api(path, method = "GET", body, extra = {}) {
    const response = await simulateRequest("/api" + path, { method, headers: { ...headers(), ...extra }, ...body !== void 0 ? { body: JSON.stringify(body) } : {} });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message ?? "Error " + response.status);
    return data;
  }
  var initializing;
  function ensureLab() {
    return initializing ??= (async () => {
      if (labId()) {
        const result2 = await simulateRequest("/api/products?pageSize=1", { headers: headers() });
        if (result2.ok) return;
        const error = await result2.json();
        if (error.error?.code !== "LAB_REQUIRED") throw new Error(error.error?.message ?? "No se pudo abrir el almacenamiento.");
        sessionStorage.removeItem("qa-pages-token");
      }
      const response = await simulateRequest("/api/labs", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "No se pudo crear el espacio.");
      localStorage.setItem(storageScope + ":lab", result.labId);
    })().catch((error) => {
      initializing = void 0;
      throw error;
    });
  }
  var idem = () => ({ "Idempotency-Key": crypto.randomUUID() });
  async function download(path, name) {
    const response = await simulateRequest("/api" + path, { headers: headers() });
    if (!response.ok) throw new Error((await response.json()).error.message);
    const url = URL.createObjectURL(await response.blob()), a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1e3);
  }

  // E:/Desarrollo/Proyectos/qa-automation-web-vanilla/js/ui.js
  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value == null || value === false) continue;
      if (key.startsWith("on")) node.addEventListener(key.slice(2).toLowerCase(), value);
      else if (key === "className") node.className = value;
      else if (["value", "checked", "disabled", "selected", "multiple", "required"].includes(key)) node[key] = value;
      else node.setAttribute(key, value === true ? "" : String(value));
    }
    for (const child of children.flat(Infinity)) {
      if (child != null && child !== false) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return node;
  }
  function notify(message, error = false) {
    const region = document.querySelector("#notifications");
    region.replaceChildren(el("div", { className: "toast " + (error ? "error" : "success"), role: error ? "alert" : "status" }, message));
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => region.replaceChildren(), 6e3);
  }
  var button = (label, action, attrs = {}) => el("button", { type: "button", ...attrs, onClick: async (event) => {
    const b = event.currentTarget, wasDisabled = b.disabled, hadFocus = document.activeElement === b;
    try {
      const result = action(event);
      if (result && typeof result.then === "function") {
        b.disabled = true;
        await result;
      }
    } catch (error) {
      notify(error.message, true);
    } finally {
      b.disabled = wasDisabled;
      if (hadFocus && b.isConnected && document.activeElement === document.body) b.focus();
    }
  } }, label);
  var fieldCount = 0;
  function field(label, control) {
    control.id ||= (control.name || "field") + "-" + ++fieldCount;
    return el("label", { className: "field", for: control.id }, el("span", {}, label), control);
  }
  var input = (name, type = "text", attrs = {}) => el("input", { name, type, ...attrs });
  function select(name, options, attrs = {}) {
    return el("select", { name, ...attrs }, options.map((option) => {
      const [value, label] = Array.isArray(option) ? option : [option, option];
      return el("option", { value, selected: String(value) === String(attrs.value) }, label);
    }));
  }
  var heading = (title, description, action) => el("div", { className: "page-heading" }, el("div", {}, el("p", { className: "eyebrow" }, "TIENDA NOVA / OPERACIONES"), el("h1", {}, title), el("p", { className: "muted" }, description)), action);
  var panel = (title, ...children) => el("section", { className: "panel" }, title && el("h2", {}, title), children);
  function table(rows, columns, actions) {
    return rows.length ? el("div", { className: "table-scroll" }, el("table", {}, el("thead", {}, el("tr", {}, columns.map(([, label]) => el("th", { scope: "col" }, label)), actions && el("th", { scope: "col" }, "Acciones"))), el("tbody", {}, rows.map((row) => el("tr", {}, columns.map(([key]) => el("td", {}, row[key] == null ? "—" : typeof row[key] === "object" ? JSON.stringify(row[key]) : row[key])), actions && el("td", {}, el("div", { className: "row-actions" }, actions(row)))))))) : el("div", { className: "empty" }, "No hay registros todavía.");
  }
  function modal(title, ...children) {
    const dialog = el("dialog", { className: "native-dialog", "aria-labelledby": "dialog-title" }, el("div", { className: "dialog-heading" }, el("h2", { id: "dialog-title" }, title), button("×", () => dialog.close(), { "aria-label": "Cerrar" })), el("div", { className: "dialog-body" }, children));
    const previous = document.activeElement;
    document.body.append(dialog);
    const nativeClose = dialog.close.bind(dialog);
    dialog.close = () => {
      nativeClose();
      dialog.remove();
      if (previous?.isConnected) previous.focus();
    };
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      dialog.close();
    });
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) {
        const r = dialog.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
      }
    });
    dialog.showModal();
    return dialog;
  }
  function form(controls, onSubmit, label = "Guardar") {
    const error = el("p", { className: "error", role: "alert", hidden: true });
    const submit = el("button", { type: "submit", className: "primary" }, label);
    return el("form", { className: "form", onSubmit: async (e) => {
      e.preventDefault();
      submit.disabled = true;
      error.hidden = true;
      try {
        await onSubmit(Object.fromEntries(new FormData(e.currentTarget)), e.currentTarget);
      } catch (ex) {
        error.textContent = ex.message;
        error.hidden = false;
      } finally {
        submit.disabled = false;
      }
    } }, controls, error, submit);
  }
  var confirmAction = (title, description, action) => {
    let dialog;
    dialog = modal(title, el("p", {}, description), el("div", { className: "dialog-actions" }, button("Cancelar", () => dialog.close()), button("Confirmar", async () => {
      await action();
      dialog.close();
    }, { className: "primary" })));
    return dialog;
  };
  function productImage(id, name) {
    const number = /^P\d{3}$/.test(id) ? Number(id.slice(1)) - 1 : -1;
    if (number < 0 || number > 11) return el("div", { className: "product-placeholder", role: "img", "aria-label": name }, "◇");
    const ns = "http://www.w3.org/2000/svg";
    const outer = document.createElementNS(ns, "svg");
    outer.setAttribute("viewBox", "0 0 362 362");
    outer.setAttribute("role", "img");
    outer.setAttribute("aria-label", name);
    outer.classList.add("product-photo");
    const inner = document.createElementNS(ns, "svg");
    for (const [k, v] of Object.entries({ viewBox: `${number % 4 * 362} ${Math.floor(number / 4) * 362} 362 362`, width: 362, height: 362, overflow: "hidden" })) inner.setAttribute(k, v);
    const image = document.createElementNS(ns, "image");
    image.setAttribute("href", "./images/products.png");
    image.setAttribute("width", "1448");
    image.setAttribute("height", "1086");
    inner.append(image);
    outer.append(inner);
    return outer;
  }
  function saveFile(text2, name, type = "text/plain") {
    const url = URL.createObjectURL(new Blob([text2], { type }));
    const a = el("a", { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1e3);
  }

  // E:/Desarrollo/Proyectos/qa-automation-web-vanilla/js/commerce.js
  async function commerceView(route, ctx2) {
    if (route === "store") return store(ctx2);
    if (route === "cart") return cart(ctx2);
    if (route === "orders") return orders(ctx2);
    return inventory(ctx2);
  }
  async function store(ctx2) {
    const root = el("div"), catalog = await api("/products"), cards = el("div", { className: "product-grid" }), pager = el("div", { className: "inline pagination" });
    let page = 1;
    const q = input("q", "search", { placeholder: "Buscar por nombre o SKU…" }), category = select("category", [["", "Todas las categorías"], ...new Set(catalog.items.map((p) => p.category))]), sort = select("sort", [["", "Destacados"], ["asc", "Precio menor"], ["desc", "Precio mayor"]]), stock = input("inStock", "checkbox");
    function update() {
      const items = catalog.items.filter((p) => (p.name + " " + p.sku).toLowerCase().includes(q.value.toLowerCase()) && (!category.value || p.category === category.value) && (!stock.checked || p.available > 0));
      if (sort.value) items.sort((a, b) => (a.price - b.price) * (sort.value === "asc" ? 1 : -1));
      const pages = Math.max(1, Math.ceil(items.length / 8));
      page = Math.min(page, pages);
      cards.replaceChildren(...items.slice((page - 1) * 8, page * 8).map((p) => el("article", { className: "product-card", "data-testid": "product-" + p.id }, productImage(p.id, p.name), el("div", { className: "product-content" }, el("small", {}, p.category), el("h3", {}, p.name), el("small", {}, p.sku + " · " + p.available + " disponibles en Lima"), el("div", { className: "product-bottom" }, el("strong", {}, money(p.price)), button("＋ Agregar", async () => {
        if (!ctx2.user) {
          ctx2.login();
          return;
        }
        await api("/cart", "POST", { productId: p.id, quantity: 1 });
        notify("Producto agregado al carrito.");
      }, { disabled: p.available === 0, "aria-label": "Agregar " + p.name }))))));
      if (!items.length) cards.append(el("div", { className: "empty" }, "No hay productos que coincidan."));
      pager.replaceChildren(button("Anterior", () => {
        page--;
        update();
      }, { disabled: page === 1 }), el("span", {}, `Página ${page} de ${pages}`), button("Siguiente", () => {
        page++;
        update();
      }, { disabled: page === pages }));
    }
    for (const c of [q, category, sort, stock]) c.addEventListener(c === q ? "input" : "change", () => {
      page = 1;
      update();
    });
    root.append(heading("Todo lo que necesitas, en un solo lugar.", "Productos para tu hogar y espacio de trabajo.", button("Ver carrito", () => ctx2.go("cart"))), el("section", { className: "collection-banner" }, el("div", {}, el("span", { className: "badge" }, "COLECCIÓN DESTACADA"), el("h2", {}, "Esenciales para tu día a día."), el("p", {}, "Aplica el cupón BIENVENIDA10 y consigue un 10% de descuento."), el("small", {}, "Envío gratis desde S/ 300 · Disponibilidad por almacén")), productImage("P001", "Auriculares Studio")), el("h2", {}, "Catálogo"), el("div", { className: "catalog-filters" }, field("Buscar productos", q), field("Categoría", category), field("Ordenar", sort), el("label", { className: "check" }, stock, "En stock")), cards, pager);
    update();
    return root;
  }
  async function cart(ctx2) {
    const lines = await api("/cart"), { items } = await api("/products");
    const rows = lines.map((l) => ({ ...l, ...{ name: items.find((p) => p.id === l.productId)?.name, price: items.find((p) => p.id === l.productId)?.price ?? 0 } }));
    const root = el("div", {}, heading("Tu carrito", "Revisa los productos y completa tu pedido."));
    if (!rows.length) {
      root.append(panel("", el("p", {}, "Tu carrito está vacío."), button("Explorar productos", () => ctx2.go("store"))));
      return root;
    }
    root.append(table(rows.map((l) => ({ ...l, unit: money(l.price), total: money(l.quantity * l.price) })), [["name", "Producto"], ["quantity", "Cantidad"], ["unit", "Precio"], ["total", "Total"]], (l) => [button("−", async () => {
      await api("/cart/" + l.productId, "PATCH", { quantity: l.quantity - 1 });
      await ctx2.refresh();
    }, { disabled: l.quantity <= 1, "aria-label": "Disminuir " + l.name }), button("+", async () => {
      await api("/cart/" + l.productId, "PATCH", { quantity: l.quantity + 1 });
      await ctx2.refresh();
    }, { "aria-label": "Aumentar " + l.name }), button("Eliminar", async () => {
      await api("/cart/" + l.productId, "DELETE");
      await ctx2.refresh();
    }, { "aria-label": "Eliminar " + l.name })]));
    const subtotal = rows.reduce((sum, l) => sum + l.price * l.quantity, 0), coupon = input("coupon"), summary = el("p", { role: "status" }, "Subtotal: " + money(subtotal));
    const quote2 = button("Aplicar cupón", async () => {
      const q = await api("/promotions/quote", "POST", { subtotal, coupon: coupon.value });
      summary.textContent = `Subtotal: ${money(q.subtotal)} · Descuento: ${money(q.discount)} · Envío: ${money(q.shipping)} · Total: ${money(q.total)}`;
    });
    const key = idem();
    root.append(panel("Entrega y pago", form([field("Cupón", coupon), quote2, summary, field("Dirección de entrega", input("address", "text", { required: true, minLength: 5, autocomplete: "street-address" })), field("Correo electrónico", input("email", "email", { required: true, autocomplete: "email" })), field("Resultado del pago", select("payment", [["approved", "Aprobado"], ["declined", "Rechazado"]]))], async (body) => {
      await api("/checkout", "POST", body, key);
      notify("Pedido confirmado.");
      ctx2.go("orders");
    }, "Confirmar pedido")));
    return root;
  }
  async function orders(ctx2) {
    const rows = await api("/orders");
    return el("div", {}, heading("Mis pedidos", "Consulta tus compras y su estado."), table(rows.map((r) => ({ ...r, total: money(r.total) })), [["id", "Pedido"], ["at", "Fecha"], ["total", "Total"], ["status", "Estado"]], (r) => r.status === "paid" && ["admin", "operator"].includes(ctx2.user?.role) ? button("Reembolsar", () => confirmAction("Reembolsar pedido", "Se devolverán las unidades al inventario.", async () => {
      await api("/orders/" + r.id + "/refund", "POST");
      await ctx2.refresh();
    })) : null));
  }
  async function inventory(ctx2) {
    if (!ctx2.user) throw Error("Inicia sesión para consultar el inventario.");
    const { items } = await api("/products");
    const admin = ctx2.user.role === "admin";
    function editor(product) {
      let dialog;
      dialog = modal(product ? "Editar producto" : "Crear producto", form([field("SKU", input("sku", "text", { required: true, value: product?.sku ?? "", disabled: !!product })), field("Nombre del producto", input("name", "text", { required: true, value: product?.name ?? "" })), field("Categoría", input("category", "text", { required: true, value: product?.category ?? "Electrónica" })), field("Precio S/", input("price", "number", { required: true, min: "0.01", step: "0.01", value: product ? product.price / 100 : "" })), !product && field("Stock inicial", input("stock", "number", { required: true, min: 0, step: 1, value: 0 }))].filter(Boolean), async (b) => {
        await api("/products" + (product ? "/" + product.id : ""), product ? "PATCH" : "POST", { ...b, price: Math.round(Number(b.price) * 100), stock: Number(b.stock ?? 0) });
        dialog.close();
        await ctx2.refresh();
      }));
    }
    const rows = items.map((p) => ({ ...p, price: money(p.price), lima: p.stock.Lima, arequipa: p.stock.Arequipa }));
    return el("div", {}, heading("Control de inventario", "Productos, existencias y disponibilidad por almacén.", admin && button("Crear producto", () => editor(), { className: "primary" })), table(rows, [["sku", "SKU"], ["name", "Producto"], ["price", "Precio"], ["lima", "Lima"], ["arequipa", "Arequipa"], ["available", "Disponible"]], admin ? (r) => [button("Editar", () => editor(items.find((p) => p.id === r.id)), { "aria-label": "Editar " + r.name }), button("Desactivar", () => confirmAction("Desactivar producto", r.name, async () => {
      await api("/products/" + r.id, "DELETE");
      await ctx2.refresh();
    }), { "aria-label": "Desactivar " + r.name })] : null));
  }

  // E:/Desarrollo/Proyectos/qa-automation-web-vanilla/js/operations.js
  var info = { reservations: ["Reservas de stock", "Reserva unidades y consulta su disponibilidad."], movements: ["Movimientos entre almacenes", "Gestiona el traslado de existencias."], claims: ["Gestión de siniestros", "Solicitudes, revisión y liquidación."], parcels: ["Seguimiento de envíos", "Consulta y actualiza el estado de las entregas."], wallet: ["Transferencias", "Cuentas y movimientos de saldo."], events: ["Eventos y cola de errores", "Procesamiento, incidencias y reintentos."] };
  async function operationsView(name, ctx2) {
    if (info[name]) return moduleView(name, ctx2);
    if (name === "clinic") return clinic(ctx2);
    if (name === "mobile") return mobile(ctx2);
    if (name === "data") return dataView(ctx2);
    if (name === "api") return consoleView();
    return aiView();
  }
  async function moduleView(name, ctx2) {
    const path = name === "wallet" ? "/transfers" : "/" + name, rows = await api(path), staff = ["admin", "operator"].includes(ctx2.user?.role), readonly = ctx2.user?.role === "auditor";
    const accounts = name === "wallet" ? await api("/accounts") : [];
    async function create() {
      const controls = [];
      if (["reservations", "movements"].includes(name)) {
        const { items } = await api("/products");
        controls.push(field("Producto", select("productId", items.map((p) => [p.id, p.name + " (" + p.available + " disponibles)"]))), field("Cantidad", input("quantity", "number", { required: true, min: 1, step: 1, value: 1 })));
        if (name === "reservations") controls.push(field("Almacén", select("warehouse", ["Lima", "Arequipa"])), field("Duración en segundos", input("ttlSeconds", "number", { required: true, min: 1, max: 86400, step: 1, value: 900 })));
        else controls.push(field("Origen", select("from", ["Lima", "Arequipa"])), field("Destino", select("to", ["Arequipa", "Lima"])));
      }
      if (name === "claims") controls.push(field("Descripción", input("title", "text", { required: true, maxLength: 150 })), field("Importe S/", input("amount", "number", { required: true, min: 0.01, step: 0.01 })));
      if (name === "parcels") controls.push(field("Destinatario", input("recipient", "text", { required: true, maxLength: 150 })), field("Dirección", input("address", "text", { required: true, minLength: 5, maxLength: 150 })));
      if (name === "wallet") controls.push(field("Cuenta de origen", select("from", accounts.map((a) => [a.id, a.id + " · " + money(a.balance)]), { required: true })), field("Cuenta de destino", input("to", "text", { required: true, placeholder: "ACC-002" })), field("Importe S/", input("amount", "number", { required: true, min: 0.01, max: 1e3, step: 0.01 })));
      if (name === "events") controls.push(field("Tipo de evento", input("type", "text", { required: true, value: "notification.created" })), field("Contenido JSON", el("textarea", { name: "payload", required: true }, "{}")));
      const key = idem();
      let dialog;
      dialog = modal(name === "wallet" ? "Crear transferencia" : "Crear registro", form(controls, async (b) => {
        for (const k of ["quantity", "ttlSeconds"]) if (k in b) b[k] = Number(b[k]);
        if ("amount" in b) b.amount = Math.round(Number(b.amount) * 100);
        if ("payload" in b) b.payload = JSON.parse(b.payload);
        await api(path, "POST", b, key);
        dialog.close();
        await ctx2.refresh();
        notify("Registro creado.");
      }));
    }
    const columns = { reservations: [["id", "Reserva"], ["productName", "Producto"], ["warehouse", "Almacén"], ["quantity", "Cantidad"], ["expires", "Expira"], ["status", "Estado"]], movements: [["id", "Movimiento"], ["productId", "Producto"], ["from", "Origen"], ["to", "Destino"], ["quantity", "Cantidad"]], claims: [["id", "Siniestro"], ["title", "Descripción"], ["amount", "Importe"], ["status", "Estado"]], parcels: [["id", "Envío"], ["recipient", "Destinatario"], ["address", "Dirección"], ["status", "Estado"]], wallet: [["id", "Movimiento"], ["from", "Origen"], ["to", "Destino"], ["amount", "Importe"], ["status", "Estado"]], events: [["id", "Evento"], ["type", "Tipo"], ["status", "Estado"], ["attempts", "Intentos"]] };
    const action = (label, url, body) => button(label, async () => {
      await api(url, "POST", body);
      await ctx2.refresh();
    });
    const actions = (r) => {
      if (readonly) return null;
      if (name === "reservations" && r.status === "active") return action("Liberar", "/reservations/" + r.id + "/release");
      if (name === "claims") {
        const next = { draft: ["submitted"], submitted: staff ? ["approved", "rejected"] : [], approved: staff ? ["paid"] : [] }[r.status] ?? [];
        const labels2 = { submitted: "Enviar a revisión", approved: "Aprobar", rejected: "Rechazar", paid: "Liquidar" };
        return next.map((status) => action(labels2[status], "/claims/" + r.id + "/transition", { status }));
      }
      if (name === "parcels" && staff) {
        const status = { created: "in_transit", in_transit: "delivered" }[r.status];
        if (status) return action(status === "delivered" ? "Marcar entregado" : "Enviar a tránsito", "/parcels/" + r.id + "/transition", { status });
      }
      if (name === "events" && staff && r.status === "dlq") return action("Reintentar", "/events/" + r.id + "/retry");
      return null;
    };
    const allowCreate = !readonly && (!["events", "movements"].includes(name) || staff) && (name !== "wallet" || ["admin", "customer"].includes(ctx2.user?.role));
    return el("div", {}, heading(...info[name], allowCreate && button(name === "wallet" ? "Crear transferencia" : "Crear registro", create, { className: "primary" })), name === "wallet" && el("div", { className: "stats" }, accounts.map((a) => el("div", {}, a.id, el("strong", {}, money(a.balance))))), name === "events" && staff && panel("", el("div", { className: "inline" }, action("Procesar pendientes", "/events/process", { fail: false }), action("Registrar fallo del consumidor", "/events/process", { fail: true }))), table(rows.map((r) => ({ ...r, amount: r.amount === void 0 ? void 0 : money(r.amount), expires: r.expiresAt ? new Date(r.expiresAt).toLocaleTimeString() : void 0 })), columns[name], actions), name === "reservations" && button("Actualizar disponibilidad", ctx2.refresh));
  }
  async function clinic(ctx2) {
    const rows = await api("/appointments");
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    return el("div", {}, heading("Agenda una cita", "Selecciona una fecha y un horario disponible."), panel("Nueva cita", form([field("Nombre del paciente", input("name", "text", { required: true, minLength: 2 })), field("Fecha", input("date", "date", { required: true, min: today })), field("Horario", select("time", ["09:00", "10:00", "11:00"])), el("label", { className: "check" }, input("consent", "checkbox", { required: true }), "Acepto el tratamiento de los datos de esta solicitud")], async (b) => {
      await api("/appointments", "POST", { ...b, consent: b.consent === "on" });
      await ctx2.refresh();
      notify("Cita confirmada.");
    }, "Confirmar cita")), table(rows, [["name", "Nombre"], ["date", "Fecha"], ["time", "Horario"], ["status", "Estado"]]));
  }
  async function mobile(ctx2) {
    const attachments = await api("/attachments");
    const root = el("div", {}, heading("Operaciones de campo", "Gestiona evidencias y confirma entregas."));
    root.append(panel("Adjuntar evidencia", form([field("Archivo PNG, JPEG o TXT", input("file", "file", { required: true, accept: ".png,.jpg,.jpeg,.txt" }))], async (_b, f) => {
      const file = f.elements.file.files[0];
      if (file.size > 1e6) throw Error("Máximo 1 MB.");
      const content = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = () => reject(Error("No se pudo leer el archivo."));
        reader.readAsDataURL(file);
      });
      await api("/attachments", "POST", { name: file.name, type: file.type || "text/plain", content });
      await ctx2.refresh();
    }, "Subir archivo")), table(attachments, [["name", "Archivo"], ["type", "Tipo"], ["size", "Bytes"]], (r) => button("Descargar", () => download("/attachments/" + r.id, r.name))));
    if (["admin", "operator"].includes(ctx2.user?.role)) {
      const deliveries = await api("/deliveries");
      root.append(panel("Entregas asignadas", table(deliveries, [["id", "Entrega"], ["address", "Dirección"], ["status", "Estado"]], (r) => r.status === "assigned" ? button("Confirmar entrega", () => {
        let d;
        const note = input("note", "text", { required: true, value: localStorage.getItem(storageScope + ":draft:" + r.id) ?? "" });
        note.addEventListener("input", () => localStorage.setItem(storageScope + ":draft:" + r.id, note.value));
        d = modal("Confirmar entrega", form([field("Observaciones", note), field("Evidencia", select("attachmentId", [["", "Sin adjunto"], ...attachments.map((a) => [a.id, a.name])]))], async (body) => {
          await api("/deliveries/" + r.id + "/complete", "POST", { ...body, attachmentId: body.attachmentId || null }, idem());
          localStorage.removeItem(storageScope + ":draft:" + r.id);
          d.close();
          await ctx2.refresh();
        }, "Completar entrega"));
      }) : null)));
    }
    return root;
  }
  async function dataView(ctx2) {
    const rows = await api("/lab/audit"), results = el("div"), q = input("auditFilter", "search", { placeholder: "Usuario, acción o referencia…" });
    const update = () => results.replaceChildren(table(rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q.value.toLowerCase())), [["at", "Fecha"], ["user", "Usuario"], ["action", "Operación"], ["correlationId", "Referencia"]]));
    q.addEventListener("input", update);
    update();
    return el("div", {}, heading("Datos y trazabilidad", "Consulta el historial de operaciones.", button("Descargar inventario", () => download("/lab/export", "inventario.csv"))), panel("Historial", field("Buscar operaciones", q), results), ctx2.user?.role === "admin" && panel("Administración", button("Restaurar datos iniciales", () => confirmAction("Restaurar datos", "Se restablecerán las operaciones y el catálogo de este espacio. Tus cuentas y contactos se conservarán.", async () => {
      await api("/lab/reset", "POST");
      await ctx2.refresh();
    }))));
  }
  function consoleView() {
    const output = el("pre", { "aria-live": "polite", "data-testid": "api-response" }, "Sin solicitudes pendientes.");
    const method = select("method", ["GET", "POST", "PATCH", "DELETE"]), path = input("path", "text", { required: true, value: "/products" }), body = el("textarea", { name: "body" }, "{}"), delay = input("delay", "number", { min: 0, max: 5e3, value: 0 }), failure = input("failure", "checkbox");
    return el("div", {}, heading("Consola de operaciones", "Solicitudes y respuestas simuladas en el navegador."), panel("Solicitud", form([field("Método", method), field("Ruta", path), field("Contenido JSON", body), field("Latencia en milisegundos", delay), el("label", { className: "check" }, failure, "Indisponibilidad temporal"), field("Clave de idempotencia", input("key", "text", { value: crypto.randomUUID() }))], async (values) => {
      const response = await simulateRequest("/api" + (values.path.startsWith("/") ? values.path : "/" + values.path), { method: values.method, headers: { ...headers(), "Idempotency-Key": values.key, "X-Test-Delay": values.delay, ...values.failure ? { "X-Test-Failure": "503" } : {} }, ...values.method !== "GET" ? { body: values.body } : {} });
      const text2 = await response.text();
      let content = text2;
      try {
        content = JSON.stringify(JSON.parse(text2), null, 2);
      } catch {
      }
      output.textContent = "Simulado · HTTP " + response.status + "\nReferencia: " + response.headers.get("X-Correlation-ID") + "\n\n" + content;
    }, "Ejecutar")), panel("Respuesta", output));
  }
  function aiView() {
    const guard = el("pre", { "aria-live": "polite" }), answer = el("pre", { "aria-live": "polite" });
    return el("div", {}, heading("Políticas y validación", "Revisa contenido y consulta las políticas del servicio."), el("div", { className: "two-columns" }, panel("Revisar contenido", form([field("Texto", el("textarea", { name: "text", required: true, maxLength: 5e3 }))], async (b) => {
      const result = await api("/ai/guard", "POST", b);
      guard.textContent = result.allowed ? "Sin coincidencias en las reglas disponibles." : "Coincidencias: " + result.findings.join(", ");
    }, "Analizar"), guard), panel("Consultar políticas", form([field("Pregunta", el("textarea", { name: "question", required: true, maxLength: 2e3 }))], async (b) => {
      const result = await api("/ai/answer", "POST", b);
      answer.textContent = result.answer;
    }, "Consultar"), answer)));
  }

  // E:/Desarrollo/Proyectos/qa-automation-web-vanilla/js/components.js
  var contactKey = storageScope + ":contacts";
  function readContacts() {
    try {
      const rows = JSON.parse(localStorage.getItem(contactKey) ?? "[]");
      return Array.isArray(rows) ? rows.filter((c) => c && ["id", "name", "email", "city"].every((k) => typeof c[k] === "string")) : [];
    } catch {
      return [];
    }
  }
  function componentsView(ctx2) {
    const root = el("div", {}, heading("Centro de interacciones", "Gestiona contactos, preferencias y documentos."));
    root.append(directory(ctx2), preferences(), interactions(ctx2));
    return root;
  }
  function directory(ctx2) {
    let contacts = readContacts(), page = 1;
    const q = input("contactSearch", "search", { placeholder: "Nombre, correo o ciudad" }), sort = select("contactSort", [["asc", "Nombre A–Z"], ["desc", "Nombre Z–A"]]), results = el("div"), pager = el("div", { className: "inline" }), status = el("p", { role: "status" }), progress = el("progress", { value: 0, max: 100, "aria-label": "Preparación de la exportación" }), download2 = button("Descargar contactos", () => {
      const csv = "nombre,correo,ciudad\n" + contacts.map((c) => [c.name, c.email, c.city].map((v) => '"' + String(v).replaceAll('"', '""') + '"').join(",")).join("\n");
      saveFile(csv, "contactos.csv", "text/csv;charset=utf-8");
    }, { disabled: true, className: "primary" });
    let timer;
    ctx2.onDispose(() => clearInterval(timer));
    function persist(next) {
      localStorage.setItem(contactKey, JSON.stringify(next));
      contacts = next;
      progress.value = 0;
      download2.disabled = true;
      update();
    }
    function editor(contact) {
      let d;
      d = modal(contact ? "Editar contacto" : "Nuevo contacto", form([field("Nombre del contacto", input("name", "text", { required: true, minLength: 2, maxLength: 100, value: contact?.name ?? "" })), field("Correo del contacto", input("email", "email", { required: true, maxLength: 100, value: contact?.email ?? "" })), field("Ciudad del contacto", select("city", ["Lima", "Arequipa", "Cusco", "Trujillo"], { value: contact?.city ?? "Lima" }))], async (b) => {
        if (!b.name.trim()) throw Error("Introduce el nombre del contacto.");
        b.email = b.email.trim().toLowerCase();
        if (contacts.some((c) => c.id !== contact?.id && c.email.toLowerCase() === b.email)) throw Error("El correo ya pertenece a otro contacto.");
        const next = { ...b, name: b.name.trim(), id: contact?.id ?? crypto.randomUUID() };
        persist(contact ? contacts.map((c) => c.id === contact.id ? next : c) : [...contacts, next]);
        d.close();
        notify("Contacto guardado.");
      }, "Guardar contacto"));
    }
    function update() {
      const filtered = contacts.filter((c) => (c.name + " " + c.email + " " + c.city).toLowerCase().includes(q.value.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name) * (sort.value === "asc" ? 1 : -1));
      const pages = Math.max(1, Math.ceil(filtered.length / 5));
      page = Math.min(page, pages);
      results.replaceChildren(table(filtered.slice((page - 1) * 5, page * 5), [["name", "Nombre"], ["email", "Correo"], ["city", "Ciudad"]], (c) => [button("Editar", () => editor(c), { "aria-label": "Editar " + c.name }), button("Eliminar", () => confirmAction("Eliminar contacto", "¿Eliminar a " + c.name + " del directorio?", () => {
        persist(contacts.filter((row) => row.id !== c.id));
        notify("Contacto eliminado.");
      }), { "aria-label": "Eliminar " + c.name })]));
      pager.replaceChildren(button("Anterior", () => {
        page--;
        update();
      }, { disabled: page === 1 }), el("span", {}, `${filtered.length} contactos · Página ${page} de ${pages}`), button("Siguiente", () => {
        page++;
        update();
      }, { disabled: page === pages }));
    }
    q.addEventListener("input", () => {
      page = 1;
      update();
    });
    sort.addEventListener("change", () => {
      page = 1;
      update();
    });
    update();
    const prepare = button("Preparar exportación", () => {
      if (!contacts.length) throw Error("Agrega al menos un contacto.");
      progress.value = 0;
      download2.disabled = true;
      clearInterval(timer);
      timer = setInterval(() => {
        progress.value += 10;
        status.textContent = "Preparando archivo: " + progress.value + " %";
        if (progress.value >= 100) {
          clearInterval(timer);
          status.textContent = "Archivo listo para descargar.";
          download2.disabled = false;
        }
      }, 150);
    });
    return el("div", {}, panel("Directorio de contactos", button("Nuevo contacto", () => editor(), { className: "primary" }), el("div", { className: "contact-toolbar" }, field("Buscar contactos", q), field("Ordenar contactos", sort)), results, pager), panel("Exportación de contactos", progress, status, el("div", { className: "inline" }, prepare, download2), el("div", { className: "help-tooltip" }, button("Formatos disponibles", () => {
    }, { "aria-describedby": "csv-tip" }), el("span", { id: "csv-tip", role: "tooltip" }, "CSV compatible con hojas de cálculo."))));
  }
  function preferences() {
    const cities = select("regions", ["Lima", "Arequipa", "Cusco", "Trujillo"], { multiple: true, size: 4 }), chosen = el("p", { role: "status" }, "Selecciona una o varias ciudades.");
    cities.addEventListener("change", () => {
      chosen.textContent = "Ciudades: " + Array.from(cities.selectedOptions, (o) => o.value).join(", ");
    });
    const frequency = select("frequency", ["En cada actualización", "Resumen diario"]), notifications = input("notifications", "checkbox", { role: "switch", checked: true });
    notifications.addEventListener("change", () => {
      frequency.disabled = !notifications.checked;
    });
    const range = input("priorityRange", "range", { min: 1, max: 10, value: 5 }), value = el("output", {}, "5");
    range.addEventListener("input", () => {
      value.value = range.value;
    });
    return panel("Preferencias de entrega", el("div", { className: "two-columns" }, el("div", {}, field("Cobertura por ciudad", cities), chosen, el("label", { className: "check" }, notifications, "Recibir notificaciones"), field("Frecuencia de avisos", frequency)), el("div", {}, el("fieldset", {}, el("legend", {}, "Prioridad de entrega"), ["Estándar", "Express"].map((v, i) => el("label", { className: "check" }, input("deliveryPriority", "radio", { value: v, checked: i === 0 }), v))), field("Ciudad preferida", input("preferredCity", "text", { list: "city-list", placeholder: "Escribe una ciudad" })), el("datalist", { id: "city-list" }, ["Lima", "Arequipa", "Cusco", "Trujillo"].map((value2) => el("option", { value: value2 }))), field("Nivel de prioridad", range), value)));
  }
  function interactions(ctx2) {
    const tabs = el("div", { role: "tablist", "aria-label": "Detalles del servicio", className: "tabs" }), content = el("div", { role: "tabpanel", id: "service-panel", tabindex: 0 });
    let active = 0;
    const tabButtons = ["General", "Configuración"].map((name, i) => button(name, () => activate(i), { role: "tab", id: "service-tab-" + i, "aria-controls": "service-panel", tabindex: i === 0 ? 0 : -1, "aria-selected": i === 0 ? "true" : "false" }));
    function activate(i) {
      active = i;
      tabButtons.forEach((b, j) => {
        b.setAttribute("aria-selected", String(i === j));
        b.tabIndex = i === j ? 0 : -1;
      });
      content.setAttribute("aria-labelledby", "service-tab-" + i);
      content.textContent = i === 0 ? "Consulta los datos generales del servicio." : "Personaliza la información y las preferencias del servicio.";
    }
    tabs.append(...tabButtons);
    tabs.addEventListener("keydown", (e) => {
      if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
        e.preventDefault();
        activate(e.key === "Home" ? 0 : e.key === "End" ? 1 : 1 - active);
        tabButtons[active].focus();
      }
    });
    activate(0);
    const drop = el("div", { className: "drop-zone", "data-testid": "drop-zone", role: "status" }, "Arrastra aquí para completar"), ticket = el("div", { className: "drag-item", draggable: true }, "Ticket TKT-001");
    const complete = () => {
      drop.textContent = "Ticket movido a Completado";
      drop.classList.add("done");
    };
    ticket.addEventListener("dragstart", (e) => e.dataTransfer.setData("text/plain", "ticket-1"));
    drop.addEventListener("dragover", (e) => e.preventDefault());
    drop.addEventListener("drop", (e) => {
      e.preventDefault();
      if (e.dataTransfer.getData("text/plain") === "ticket-1") complete();
    });
    const asyncResult = el("p", { role: "status" }, "Información pendiente.");
    let timeout;
    ctx2.onDispose(() => clearTimeout(timeout));
    const shadowHost = el("div", { "data-testid": "address-widget" }), shadow = shadowHost.attachShadow({ mode: "open" });
    shadow.append(el("style", {}, ":host{display:block;padding:16px;border:1px solid #e8ecf3;border-radius:12px}button,input{font:inherit;padding:8px;margin:6px}"), el("label", {}, "Código postal", input("postcode", "text", { pattern: "[0-9]{5}", maxLength: 5 })), button("Consultar código", () => {
      shadow.querySelector("output").textContent = /^\d{5}$/.test(shadow.querySelector("input").value) ? "Código válido." : "Introduce cinco dígitos.";
    }), el("output", { "aria-live": "polite" }));
    return el("div", { className: "component-grid" }, panel("Información del servicio", tabs, content, el("details", {}, el("summary", {}, "Reglas de reserva"), el("p", {}, "Las reservas no pueden superar el stock disponible.")), button("Abrir modal", () => {
      let dialog;
      dialog = modal("Detalles del contacto", form([field("Nombre en modal", input("contact", "text", { required: true }))], async () => dialog.close(), "Aceptar"));
    }), el("div", { className: "inline" }, button("Alerta nativa", () => alert("Notificación recibida")), button("Confirmación nativa", () => notify(confirm("¿Confirmar esta acción?") ? "Confirmado" : "Cancelado")), button("Introducir referencia", () => {
      const result = prompt("Referencia de la solicitud");
      notify(result === null ? "Cancelado" : "Referencia: " + result);
    })), el("p", {}, el("a", { href: "./sample.html", target: "_blank", rel: "noopener" }, "Abrir nueva pestaña")), el("a", { href: "./sample.csv", download: true }, "Descargar listado CSV")), panel("Flujo de trabajo", ticket, drop, button("Mover ticket con teclado", complete), button("Consultar disponibilidad", () => {
      asyncResult.textContent = "Consultando…";
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        asyncResult.textContent = "12 unidades disponibles.";
      }, 1200);
    }), asyncResult), panel("Formulario de contacto", el("iframe", { title: "Formulario embebido", src: "./frame.html" })), panel("Dirección de entrega", shadowHost));
  }

  // E:/Desarrollo/Proyectos/qa-automation-web-vanilla/js/app.js
  var groups = [["COMERCIO", [["store", "Tienda"], ["cart", "Carrito"], ["orders", "Pedidos"]]], ["OPERACIONES", [["inventory", "Inventario"], ["reservations", "Reservas"], ["movements", "Movimientos"], ["claims", "Siniestros"], ["parcels", "Envíos"], ["wallet", "Transferencias"]]], ["SERVICIOS", [["components", "Componentes"], ["clinic", "Agenda de citas"], ["mobile", "Campo móvil"], ["events", "Eventos y DLQ"], ["ai", "Políticas y datos"], ["data", "Datos y auditoría"], ["api", "Consola API"]]]];
  var labels = Object.fromEntries(groups.flatMap(([, items]) => items));
  var ctx = { user: null, refresh: render, login, go: (route) => {
    location.hash = "/" + route;
  }, onDispose: () => {
  }, notify };
  var revision = 0;
  var disposals = [];
  var sidebar = document.querySelector("#sidebar");
  sidebar.append(el("a", { className: "brand", href: "#/store" }, el("span", { className: "brand-icon", "aria-hidden": "true" }, "▣"), el("div", {}, "Tienda ", el("span", { className: "brand-light" }, "Nova"), el("small", {}, "COMERCIO Y OPERACIONES"))), el("div", { className: "workspace-label" }, "Panel de gestión · Comercio y operaciones"), el("nav", {}, groups.map(([group, items]) => el("div", { className: "nav-group" }, el("p", {}, group), items.map(([route, label]) => el("a", { href: "#/" + route, "data-route": route }, label))))), el("div", { className: "sidebar-bottom" }, "Inventario, pedidos y envíos."));
  document.querySelector("#menu").addEventListener("click", (e) => {
    const expanded = sidebar.classList.toggle("open");
    e.currentTarget.setAttribute("aria-expanded", String(expanded));
  });
  function sessionHeader() {
    document.querySelector("#session").replaceChildren(...ctx.user ? [el("span", { className: "user-name" }, ctx.user.name), button("Cerrar sesión", async () => {
      await api("/auth/logout", "POST");
      sessionStorage.removeItem("qa-pages-token");
      ctx.user = null;
      await render();
    })] : [button("Iniciar sesión", () => login(), { className: "primary" })]);
  }
  function login(register = false) {
    let dialog;
    const controls = [el("p", { className: "muted" }, register ? "Completa tus datos para crear una cuenta." : "Introduce tus credenciales para acceder a tu cuenta.")];
    if (register) controls.push(field("Nombre completo", input("name", "text", { required: true, minLength: 2, maxLength: 100, autocomplete: "name" })));
    controls.push(field("Usuario", input("username", "text", { required: true, minLength: register ? 3 : 1, maxLength: 32, pattern: register ? "[a-zA-Z0-9_]{3,32}" : null, autocomplete: "username" })), field("Contraseña", input("password", "password", { required: true, minLength: register ? 12 : 1, maxLength: 128, autocomplete: register ? "new-password" : "current-password" })));
    if (register) controls.push(el("p", { className: "muted small" }, "Usa de 3 a 32 letras, números o guiones bajos para el usuario. Contraseña: de 12 a 128 caracteres."), field("Confirmar contraseña", input("confirmPassword", "password", { required: true, minLength: 12, maxLength: 128, autocomplete: "new-password" })));
    const auth = form(controls, async (body) => {
      const result = await api(register ? "/auth/register" : "/auth/login", "POST", body);
      sessionStorage.setItem("qa-pages-token", result.token);
      ctx.user = result.user;
      dialog.close();
      notify(register ? "Cuenta creada." : "Sesión iniciada.");
      await render();
    }, register ? "Crear cuenta" : "Acceder");
    dialog = modal(register ? "Crear cuenta" : "Iniciar sesión", auth, el("div", { className: "auth-switch" }, button(register ? "Ya tengo una cuenta" : "Crear una cuenta", () => {
      dialog.close();
      login(!register);
    })));
  }
  async function render() {
    const current = ++revision;
    disposals.forEach((f) => f());
    disposals = [];
    ctx.onDispose = (f) => disposals.push(f);
    const main = document.querySelector("main"), route = location.hash.slice(2) || "store";
    document.querySelector("#page-title").textContent = labels[route] ?? "Página no encontrada";
    document.title = (labels[route] ?? "Tienda Nova") + " · Tienda Nova";
    sessionHeader();
    sidebar.classList.remove("open");
    document.querySelector("#menu").setAttribute("aria-expanded", "false");
    sidebar.querySelectorAll("[data-route]").forEach((a) => {
      if (a.dataset.route === route) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    main.replaceChildren(el("p", { className: "loading", role: "status" }, "Cargando…"));
    try {
      let view;
      if (!labels[route]) view = el("div", {}, el("h1", {}, "Página no encontrada"), el("a", { href: "#/store" }, "Volver a la tienda"));
      else if (["store", "cart", "orders", "inventory"].includes(route)) view = await commerceView(route, ctx);
      else if (route === "components") view = componentsView(ctx);
      else view = await operationsView(route, ctx);
      if (current === revision) main.replaceChildren(view);
    } catch (error) {
      if (current !== revision) return;
      main.replaceChildren(el("h1", {}, labels[route]), el("div", { className: "panel" }, el("p", { role: "alert", className: "error" }, error.message), !ctx.user ? button("Iniciar sesión", () => login(), { className: "primary" }) : button("Volver a intentar", render)));
    }
  }
  window.addEventListener("hashchange", render);
  window.addEventListener("offline", () => notify("Sin conexión. Las operaciones locales siguen disponibles."));
  window.addEventListener("online", () => notify("Conexión restablecida."));
  async function boot() {
    try {
      await ensureLab();
      if (sessionStorage.getItem("qa-pages-token")) try {
        ctx.user = await api("/auth/me");
      } catch {
        sessionStorage.removeItem("qa-pages-token");
      }
      await render();
    } catch (error) {
      document.querySelector("main").replaceChildren(el("h1", {}, "No se pudo abrir el espacio"), el("p", { role: "alert" }, error.message), el("p", {}, "Permite el almacenamiento de datos en este navegador. Puedes abrir index.html directamente con Chrome o Edge."));
    }
  }
  boot();
})();
