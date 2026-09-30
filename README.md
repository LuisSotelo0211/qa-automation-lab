# QA Lab · Comercio y operaciones

Aplicación web para gestionar catálogo, inventario, compras, reservas y operaciones desde una interfaz unificada. Desarrollada con **React, TypeScript, Express y SQLite**, con permisos por rol, trazabilidad de operaciones y almacenamiento persistente.

## Inicio rápido

Requisitos: **Node.js 24 o posterior**, npm y Git.

```bash
git clone https://github.com/LuisSotelo0211/qa-automation-lab.git
cd qa-automation-lab
npm ci
npm run dev
```

Abre **http://127.0.0.1:3000**. La primera visita crea un espacio de trabajo y carga el catálogo inicial. Para compilar y ejecutar la aplicación:

```bash
npm run build
npm start
```

El servidor Express entrega tanto la API como la interfaz. GitHub aloja el código; esta aplicación requiere un proceso Node.js y no se ejecuta únicamente con GitHub Pages.

### Docker

```bash
docker compose up --build
```

Acceso: **http://localhost:3000**. El volumen `qa_lab_data` conserva SQLite entre reinicios.

### Configuración

| Variable | Valor predeterminado | Descripción                                    |
| -------- | -------------------- | ---------------------------------------------- |
| `PORT`   | `3000`               | Puerto HTTP.                                   |
| `HOST`   | `127.0.0.1`          | Interfaz de escucha; Docker utiliza `0.0.0.0`. |
| `LAB_DB` | `./data/lab.sqlite`  | Archivo de almacenamiento SQLite.              |

Configura estas variables en el entorno antes de iniciar el servidor. El archivo `.env.example` documenta los valores; no se carga automáticamente. En PowerShell puedes usar `$env:PORT='3001'` antes de `npm run dev`.

## Acceso y registro

Pulsa **Iniciar sesión** e introduce usuario y contraseña. Para crear un usuario, selecciona **Crear una cuenta**, completa nombre, usuario, contraseña y confirmación.

- Los nuevos usuarios reciben el rol **customer** y acceden inmediatamente.
- El usuario admite de 3 a 32 letras, números o guiones bajos y se normaliza a minúsculas.
- La contraseña requiere entre 12 y 128 caracteres; se almacena mediante scrypt y una sal aleatoria.
- Las cuentas registradas pertenecen al espacio de trabajo del navegador y se conservan al reiniciar el servidor.
- Las sesiones duran una hora. **Cerrar sesión** revoca el token actual.
- El registro no asigna permisos administrativos, no verifica correo y no incluye recuperación de contraseña.

### Cuentas iniciales

Estas cuentas permiten revisar los distintos perfiles funcionales de la aplicación. Todas utilizan la contraseña **`Test123!`**.

| Usuario     | Rol           | Acceso principal                                                           |
| ----------- | ------------- | -------------------------------------------------------------------------- |
| `admin`     | Administrador | Productos, operaciones, reembolsos, auditoría y restauración de registros. |
| `operator`  | Operador      | Movimientos de stock, envíos, eventos y entregas de campo.                 |
| `customer`  | Cliente       | Compras, reservas, citas y recursos propios. Cuenta de saldo `ACC-001`.    |
| `customer2` | Cliente       | Segundo perfil de cliente. Cuenta de saldo `ACC-002`.                      |
| `auditor`   | Auditor       | Inventario, operaciones y registro de actividad en modo consulta.          |

Las cuentas iniciales son públicas y los saldos y pagos son de demostración. Utiliza datos sintéticos. Los nuevos clientes pueden comprar y crear reservas; la aplicación no les abre una cuenta de saldo automáticamente.

El espacio de trabajo se identifica mediante `qa-lab-id` en el almacenamiento local del navegador. Otro navegador o la eliminación de ese identificador genera un espacio independiente; las cuentas creadas en uno no aparecen en el otro.

## Módulos

| Módulo                | Funciones                                                                                                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tienda**            | Catálogo con imágenes, búsqueda por nombre o SKU, filtros de categoría y disponibilidad, orden por precio, paginación y detalle de producto.                                                      |
| **Carrito**           | Cantidades, eliminación de productos, cupones, cálculo de envío y confirmación de pedidos. El proveedor de pago es simulado: no procesa dinero ni tarjetas.                                       |
| **Pedidos**           | Consulta de compras por propietario y reembolsos administrados, con reposición de existencias.                                                                                                    |
| **Inventario**        | Alta, edición y baja de productos, stock en Lima y Arequipa, disponibilidad y exportación CSV.                                                                                                    |
| **Reservas**          | Retención temporal de unidades, liberación y vencimiento. Las reservas activas reducen la disponibilidad.                                                                                         |
| **Movimientos**       | Transferencias de existencias entre almacenes, con validación del stock disponible.                                                                                                               |
| **Siniestros**        | Solicitudes con propietario, importe y estados de envío, aprobación, rechazo y liquidación.                                                                                                       |
| **Envíos**            | Seguimiento desde creación hasta despacho y entrega; los cambios generan eventos.                                                                                                                 |
| **Transferencias**    | Operaciones entre cuentas de saldo, validación de propiedad, fondos e idempotencia. No existe conexión bancaria.                                                                                  |
| **Componentes**       | Disponibilidad de eventos, selección, formularios, diálogos, pestañas, archivos, arrastrar y soltar y formulario embebido. La selección de eventos es visual y no genera una reserva persistente. |
| **Agenda de citas**   | Reserva de horarios disponibles y consulta de citas.                                                                                                                                              |
| **Campo móvil**       | Entregas asignadas, notas, borrador en el navegador y adjuntos PNG, JPEG o TXT de hasta 1 MB.                                                                                                     |
| **Eventos y DLQ**     | Publicación, procesamiento manual, reintentos y cola de errores tras tres fallos. La cola se almacena en SQLite; no utiliza Kafka ni SQS.                                                         |
| **Políticas y datos** | Detección de patrones y consulta de políticas locales. Las respuestas son deterministas, sin proveedor LLM.                                                                                       |
| **Datos y auditoría** | Historial de operaciones, responsables, referencias, búsqueda, filtros y descarga de inventario.                                                                                                  |
| **Consola API**       | Solicitudes HTTP locales con método, ruta, cuerpo, estado, duración y referencia de correlación.                                                                                                  |

### Reglas operativas

- Los importes se almacenan en céntimos y se muestran en soles.
- `QA10` descuenta el 10 % del subtotal. `ENVIO` elimina el coste de envío.
- El envío cuesta S/ 15 y es gratuito desde S/ 300 de subtotal.
- Reservas, movimientos, checkout, transferencias y ciertas operaciones requieren `Idempotency-Key`: repetir la misma operación no duplica sus efectos; cambiar el cuerpo con la misma clave devuelve `409`.
- Las transiciones inválidas, la falta de stock y los recursos ajenos se validan en el servidor.
- La restauración está disponible para administradores, previa confirmación. Reinicia registros operativos y mantiene cuentas registradas y sesiones.
- La auditoría conserva las últimas 200 operaciones registradas.

## API

Base local: `http://127.0.0.1:3000/api`.

1. `POST /api/labs` devuelve un `labId`.
2. Envía ese valor en `X-Lab-Id` en las siguientes solicitudes.
3. `POST /api/auth/login` recibe `username` y `password`.
4. `POST /api/auth/register` recibe `name`, `username`, `password` y `confirmPassword`.
5. Utiliza `Authorization: Bearer <token>` para las operaciones autenticadas.

La interfaz realiza esta configuración automáticamente. Las respuestas incluyen `X-Correlation-ID`. La consola incluye controles de latencia y fallo de dependencias para diagnóstico.

- `GET /api/health`: estado del servicio.
- `GET /api/openapi.json`: documento de referencia de la API.
- `POST /soap/tracking`: consulta SOAP de seguimiento; contrato en `/tracking.wsdl`.

## Estructura

```text
src/                 Interfaz React, estilos y componentes
server/              API, autorización y persistencia SQLite
public/              Imágenes, documentos API y recursos estáticos
.github/workflows/   Validación de compilación
Dockerfile           Imagen de ejecución
docker-compose.yml   Servicio y volumen de datos
```

La persistencia utiliza espacios de trabajo en JSON dentro de SQLite, con vistas SQL para productos, pedidos y movimientos. Las cuentas registradas y sesiones utilizan tablas independientes. Los archivos de datos, dependencias instaladas y variables privadas están excluidos del repositorio.

## Alcance

El sistema ofrece operaciones funcionales de comercio y gestión para ejecución local. Los pagos, saldos financieros, procesamiento de eventos, desconexión del módulo móvil y respuestas de políticas son implementaciones controladas. No incorpora pasarela bancaria, aplicación Android nativa, Kafka/SQS, despliegue cloud, gRPC operativo ni proveedor de IA externo.

Para una instalación expuesta a Internet se requiere adaptar el modelo de cuentas y aislamiento, retirar las cuentas públicas y controles de diagnóstico, e incorporar gestión de secretos, TLS, políticas de sesión y límites adecuados al despliegue.

## Autor

[Luis Sotelo](https://github.com/LuisSotelo0211)
