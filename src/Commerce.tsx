import { useState, useEffect } from "react";
import {
  Search,
  ShoppingCart,
  Plus,
  Trash2,
  SlidersHorizontal,
  Package,
  Download,
  ArrowUpRight,
  Star,
  Truck,
  ShieldCheck,
} from "lucide-react";
import { api, money, idem, download, type Row } from "./api";
import { useLab, Heading, useData } from "./App";
import {
  Field,
  Form,
  Badge,
  Empty,
  Modal,
  ProductImage,
  Quantity,
  DataTable,
} from "./components";
export function Store() {
  const { user, run, login, go } = useLab();
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState(""),
    [sort, setSort] = useState(""),
    [stock, setStock] = useState(false),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState<Row | null>(null),
    [qty, setQty] = useState(1);
  const { data, error } = useData(
    "/products?" +
      new URLSearchParams({
        q: query,
        category,
        sort,
        inStock: String(stock),
        page: String(page),
        pageSize: "8",
      }),
  );
  useEffect(() => setPage(1), [query, category, sort, stock]);
  const add = async (p: Row, n = 1) => {
    if (!user) {
      login();
      return;
    }
    const r = await run(
      () => api("/cart", "POST", { productId: p.id, quantity: n }),
      p.name + " agregado al carrito.",
    );
    if (r) setSelected(null);
  };
  return (
    <>
      <Heading
        eyebrow="SUPERMARKET360 / TIENDA"
        title="Todo lo que necesitas, en un solo lugar."
        description="Explora productos, combina filtros y completa una compra de principio a fin."
      >
        <button onClick={() => go("cart")}>
          <ShoppingCart size={18} /> Ver carrito
        </button>
      </Heading>
      <section className="shop-banner">
        <div>
          <Badge>COLECCIÓN DESTACADA</Badge>
          <h2>
            Esenciales para
            <br />
            tu día a día.
          </h2>
          <p>
            Aplica el cupón <strong>QA10</strong> y consigue un 10% de
            descuento.
          </p>
          <div className="banner-features">
            <span>
              <Truck size={16} /> Envío gratis desde S/ 300
            </span>
            <span>
              <ShieldCheck size={16} /> Disponibilidad por almacén
            </span>
          </div>
        </div>
        <div className="banner-product">
          <ProductImage id="P001" name="Auriculares Studio" large />
          <span className="floating-tag">
            Studio collection <strong>S/ 189.00</strong>
          </span>
        </div>
      </section>
      <div className="catalog-header">
        <h2>
          Catálogo <span className="count">{data?.total ?? "…"}</span>
        </h2>
        <span className="muted small">
          Productos para tu hogar y espacio de trabajo
        </span>
      </div>
      <div className="filters">
        <label className="search">
          <Search size={19} />
          <input
            aria-label="Buscar productos"
            placeholder="Buscar por nombre o SKU…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="Categoría"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Todas las categorías</option>
          <option>Electrónica</option>
          <option>Accesorios</option>
          <option>Hogar</option>
        </select>
        <select
          aria-label="Ordenar productos"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="">Destacados</option>
          <option value="price-asc">Menor precio</option>
          <option value="price-desc">Mayor precio</option>
        </select>
        <label className="check">
          <input
            type="checkbox"
            checked={stock}
            onChange={(e) => setStock(e.target.checked)}
          />{" "}
          En stock
        </label>
      </div>
      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : !data ? (
        <p role="status">Cargando catálogo…</p>
      ) : data.items.length === 0 ? (
        <Empty text="No encontramos productos con esos filtros." />
      ) : (
        <div className="product-grid">
          {data.items.map((p: Row) => (
            <article
              key={p.id}
              className="product-card"
              data-testid={"product-" + p.id}
            >
              <button
                className="product-open"
                aria-label={"Ver " + p.name}
                onClick={() => {
                  setSelected(p);
                  setQty(1);
                }}
              >
                <div className="product-visual">
                  <ProductImage id={p.id} name={p.name} />
                  {!p.available ? (
                    <Badge>Agotado</Badge>
                  ) : p.available <= 3 ? (
                    <Badge tone="amber">Últimas unidades</Badge>
                  ) : null}
                </div>
              </button>
              <div className="product-copy">
                <span className="product-category">{p.category}</span>
                <h3>
                  <button
                    className="text-button"
                    onClick={() => {
                      setSelected(p);
                      setQty(1);
                    }}
                  >
                    {p.name}
                  </button>
                </h3>
                <p className="product-sku">
                  {p.sku} · {p.available} disponibles en Lima
                </p>
                <div className="product-bottom">
                  <strong>{money(p.price)}</strong>
                  <button
                    className="add-button"
                    disabled={!p.available}
                    aria-label={"Agregar " + p.name}
                    onClick={() => add(p)}
                  >
                    <Plus size={19} />
                    <span>Agregar</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {data && data.total > 8 && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>
            Anterior
          </button>
          <span>
            Página {page} de {Math.ceil(data.total / 8)}
          </span>
          <button
            disabled={page * 8 >= data.total}
            onClick={() => setPage(page + 1)}
          >
            Siguiente
          </button>
        </div>
      )}
      {selected && (
        <Modal title={selected.name} onClose={() => setSelected(null)}>
          <ProductImage id={selected.id} name={selected.name} large />
          <p>
            {selected.category} · {selected.sku}
          </p>
          <h2>{money(selected.price)}</h2>
          <p>
            Stock Lima: {selected.stock.Lima} · Arequipa:{" "}
            {selected.stock.Arequipa}
          </p>
          <p>
            Disponible para compra: {selected.available}. Las reservas activas
            reducen el disponible.
          </p>
          <div className="inline">
            <Quantity value={qty} onChange={setQty} max={selected.available} />
            <button
              className="primary"
              disabled={!selected.available}
              onClick={() => add(selected, qty)}
            >
              Agregar al carrito
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function Cart() {
  const { run, go, refresh } = useLab();
  const { data: items, error } = useData("/cart");
  const [coupon, setCoupon] = useState(""),
    [quote, setQuote] = useState<Row | null>(null),
    [receipt, setReceipt] = useState<Row | null>(null);
  const subtotal =
    items?.reduce((n: number, l: Row) => n + l.price * l.quantity, 0) ?? 0;
  useEffect(() => {
    setQuote(null);
  }, [subtotal, coupon]);
  return (
    <>
      <Heading
        eyebrow="SUPERMARKET360 / CHECKOUT"
        title="Tu carrito"
        description="Revisa tus productos, aplica descuentos y confirma tu pedido."
      />
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {receipt ? (
        <section className="panel receipt">
          <Badge tone="green">COMPRA CONFIRMADA</Badge>
          <h2>Pedido {receipt.id}</h2>
          <p>
            Total pagado: <strong>{money(receipt.total)}</strong>
          </p>
          <button onClick={() => go("orders")}>Ver pedidos</button>
        </section>
      ) : !items?.length ? (
        <Empty text="Tu carrito está vacío. Agrega productos desde la tienda." />
      ) : (
        <div className="two-columns">
          <section className="panel">
            {items.map((l: Row) => (
              <div className="cart-line" key={l.productId}>
                <ProductImage id={l.productId} name={l.name} />
                <div>
                  <strong>{l.name}</strong>
                  <p>{money(l.price)}</p>
                  <Quantity
                    value={l.quantity}
                    onChange={(n) =>
                      run(() =>
                        api("/cart/" + l.productId, "PATCH", { quantity: n }),
                      )
                    }
                  />
                </div>
                <button
                  className="icon-button"
                  aria-label={"Eliminar " + l.name}
                  onClick={() =>
                    run(() => api("/cart/" + l.productId, "DELETE"))
                  }
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </section>
          <section className="panel">
            <h2>Resumen de compra</h2>
            <div className="summary-line">
              <span>Subtotal</span>
              <strong>{money(subtotal)}</strong>
            </div>
            <Field label="Cupón">
              <input
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                placeholder="QA10 o ENVIO"
              />
            </Field>
            <button
              onClick={async () => {
                const r = await run(
                  () => api("/promotions/quote", "POST", { subtotal, coupon }),
                  "Cupón calculado.",
                );
                if (r) setQuote(r);
              }}
            >
              Calcular total
            </button>
            {quote && (
              <div className="quote" data-testid="quote">
                <p>Descuento: {money(quote.discount)}</p>
                <p>Envío: {money(quote.shipping)}</p>
                <h3>Total: {money(quote.total)}</h3>
              </div>
            )}
            <hr />
            <Form
              submit="Confirmar compra"
              onSubmit={async (d) => {
                const r = await api(
                  "/checkout",
                  "POST",
                  { ...d, coupon },
                  idem(),
                );
                setReceipt(r);
                refresh();
              }}
            >
              <Field label="Correo">
                <input
                  name="email"
                  type="email"
                  placeholder="cliente@example.test"
                  required
                />
              </Field>
              <Field label="Dirección de entrega">
                <input
                  name="address"
                  minLength={5}
                  required
                  placeholder="Av. Demo 123"
                />
              </Field>
              <Field label="Resultado del pago">
                <select name="payment">
                  <option value="approved">Aprobado (simulado)</option>
                  <option value="declined">Rechazado (simulado)</option>
                </select>
              </Field>
              <p className="small muted">
                No se cobran importes ni se solicitan tarjetas reales.
              </p>
            </Form>
          </section>
        </div>
      )}
    </>
  );
}
export function Orders() {
  const { data, error } = useData("/orders");
  const { user, run } = useLab();
  return (
    <>
      <Heading
        eyebrow="SUPERMARKET360 / POSVENTA"
        title="Pedidos"
        description="Consulta el estado de tus compras y gestiona los reembolsos."
      />
      <Error error={error} />
      {data && (
        <DataTable
          rows={data.map((r: Row) => ({ ...r, total: money(r.total) }))}
          columns={[
            ["id", "Pedido"],
            ["email", "Correo"],
            ["total", "Total"],
            ["status", "Estado"],
          ]}
          actions={(r) =>
            user?.role === "admin" && r.status === "paid" ? (
              <button
                onClick={() =>
                  run(
                    () => api("/orders/" + r.id + "/refund", "POST"),
                    "Pedido reembolsado.",
                  )
                }
              >
                Reembolsar
              </button>
            ) : null
          }
        />
      )}
    </>
  );
}
export function Inventory() {
  const { data, error } = useData("/products");
  const { user, run, refresh } = useLab();
  const [edit, setEdit] = useState<Row | null>(null),
    [creating, setCreating] = useState(false),
    [deleting, setDeleting] = useState<Row | null>(null);
  return (
    <>
      <Heading
        eyebrow="INVENTORYHUB / ADMINISTRACIÓN"
        title="Control de inventario"
        description="Productos, stock por almacén y disponibilidad descontando reservas."
      >
        <button
          onClick={() =>
            run(
              () => download("/lab/export", "inventory.csv"),
              "CSV descargado.",
            )
          }
        >
          <Download size={17} /> Exportar CSV
        </button>
        {user?.role === "admin" && (
          <button className="primary" onClick={() => setCreating(true)}>
            <Plus size={18} /> Nuevo producto
          </button>
        )}
      </Heading>
      <div className="stats">
        <div>
          <span>Productos</span>
          <strong>{data?.total ?? "—"}</strong>
        </div>
        <div>
          <span>Unidades en Lima</span>
          <strong>
            {data?.items.reduce((n: number, p: Row) => n + p.stock.Lima, 0) ??
              "—"}
          </strong>
        </div>
        <div>
          <span>Unidades en Arequipa</span>
          <strong>
            {data?.items.reduce(
              (n: number, p: Row) => n + p.stock.Arequipa,
              0,
            ) ?? "—"}
          </strong>
        </div>
        <div>
          <span>Permiso actual</span>
          <strong className="role-stat">{user?.role}</strong>
        </div>
      </div>
      <Error error={error} />
      {data && (
        <DataTable
          rows={data.items.map((p: Row) => ({
            ...p,
            price: money(p.price),
            lima: p.stock.Lima,
            arequipa: p.stock.Arequipa,
          }))}
          columns={[
            ["sku", "SKU"],
            ["name", "Producto"],
            ["price", "Precio"],
            ["lima", "Lima"],
            ["arequipa", "Arequipa"],
            ["available", "Disponible Lima"],
          ]}
          actions={(r) =>
            user?.role === "admin" ? (
              <>
                <button
                  onClick={() =>
                    setEdit(data.items.find((p: Row) => p.id === r.id))
                  }
                >
                  Editar
                </button>
                <button className="text-danger" onClick={() => setDeleting(r)}>
                  Eliminar
                </button>
              </>
            ) : (
              <span className="muted">Solo lectura</span>
            )
          }
        />
      )}
      {(creating || edit) && (
        <Modal
          title={edit ? "Editar producto" : "Nuevo producto"}
          onClose={() => {
            setCreating(false);
            setEdit(null);
          }}
        >
          <Form
            onSubmit={async (d) => {
              const payload = {
                ...d,
                price: Math.round(Number(d.price) * 100),
                stock: Number(d.stock),
              };
              await api(
                edit ? "/products/" + edit.id : "/products",
                edit ? "PATCH" : "POST",
                payload,
              );
              setCreating(false);
              setEdit(null);
              refresh();
            }}
          >
            {!edit && (
              <Field label="SKU">
                <input name="sku" required />
              </Field>
            )}
            <Field label="Nombre del producto">
              <input name="name" defaultValue={edit?.name} required />
            </Field>
            <Field label="Categoría">
              <select
                name="category"
                defaultValue={edit?.category ?? "Electrónica"}
              >
                <option>Electrónica</option>
                <option>Accesorios</option>
                <option>Hogar</option>
              </select>
            </Field>
            <Field label="Precio en soles">
              <input
                name="price"
                type="number"
                min="0.01"
                step="0.01"
                defaultValue={edit ? edit.price / 100 : 99}
                required
              />
            </Field>
            {!edit && (
              <Field label="Stock inicial en Lima">
                <input
                  name="stock"
                  type="number"
                  min="0"
                  defaultValue="10"
                  required
                />
              </Field>
            )}
          </Form>
        </Modal>
      )}
      {deleting && (
        <Modal title="Eliminar producto" onClose={() => setDeleting(null)}>
          <p>
            ¿Eliminar {deleting.name} del catálogo? Sus pedidos históricos se
            conservarán.
          </p>
          <button
            className="danger"
            onClick={async () => {
              if (await run(() => api("/products/" + deleting.id, "DELETE")))
                setDeleting(null);
            }}
          >
            Confirmar eliminación
          </button>
        </Modal>
      )}
    </>
  );
}
export function Error({ error }: { error: string }) {
  return error ? (
    <p role="alert" className="error">
      {error}
    </p>
  ) : null;
}
