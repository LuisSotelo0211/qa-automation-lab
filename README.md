# Tienda Nova · Comercio y operaciones

Tienda Nova es una aplicación de comercio y gestión de operaciones diseñada para practicar pruebas funcionales y automatización web. Reúne compras, inventario, reservas, envíos y componentes interactivos para comprobar flujos completos, validaciones, permisos y estados de error.

## Módulos

| Módulo | Para qué sirve | Qué puedes hacer |
| --- | --- | --- |
| **Tienda** | Explorar el catálogo. | Buscar productos por nombre o código, filtrar por categoría y disponibilidad, ordenar por precio y agregar productos al carrito. |
| **Carrito** | Preparar y confirmar una compra. | Cambiar cantidades, retirar productos, aplicar cupones, completar los datos de entrega y comprobar pagos aprobados o rechazados. |
| **Pedidos** | Consultar las compras realizadas. | Revisar fechas, importes y estados. Los perfiles autorizados pueden reembolsar un pedido y comprobar la devolución de unidades al inventario. |
| **Inventario** | Administrar productos y existencias. | Consultar stock por almacén. Con la cuenta de administración, crear, editar y desactivar productos. |
| **Reservas** | Separar temporalmente unidades disponibles. | Elegir producto, almacén, cantidad y duración; liberar reservas y comprobar su vencimiento. |
| **Movimientos** | Trasladar existencias entre almacenes. | Transferir unidades entre Lima y Arequipa y verificar las cantidades disponibles. |
| **Siniestros** | Gestionar solicitudes y su resolución. | Crear solicitudes, enviarlas a revisión y avanzar por aprobación, rechazo o liquidación según el perfil. |
| **Envíos** | Seguir el estado de una entrega. | Registrar destinatario y dirección, consultar el envío y actualizarlo de creado a tránsito y entregado. |
| **Transferencias** | Practicar movimientos entre cuentas ficticias. | Consultar saldos, transferir importes y comprobar límites, permisos y prevención de operaciones duplicadas. |
| **Componentes** | Trabajar con controles e interacciones de la interfaz. | Gestionar contactos, exportar CSV y probar formularios, diálogos, pestañas, selección múltiple, campos dependientes, progreso, arrastre, formularios embebidos y nuevas ventanas. |
| **Agenda de citas** | Registrar citas en horarios disponibles. | Elegir fecha y hora, completar el consentimiento y comprobar conflictos por horarios duplicados. |
| **Campo móvil** | Gestionar evidencias y entregas. | Adjuntar y descargar archivos PNG, JPEG o TXT. Con un perfil de operaciones, guardar observaciones y confirmar entregas. |
| **Eventos y DLQ** | Consultar eventos e incidencias de procesamiento. | Publicar eventos, procesar pendientes, provocar fallos y recuperar eventos enviados a la cola de errores. |
| **Políticas y datos** | Consultar políticas del servicio y revisar contenido. | Preguntar sobre reservas y cupones, y analizar textos con reglas que identifican ciertos datos sensibles. |
| **Datos y auditoría** | Revisar el historial de operaciones. | Filtrar registros, consultar referencias de seguimiento y exportar inventario. Administración puede restaurar los datos iniciales. |
| **Consola API** | Explorar las respuestas simuladas de las operaciones. | Elegir método y ruta, enviar datos, observar códigos de respuesta, configurar latencia y errores y utilizar claves de idempotencia. |

## Cuentas de acceso

Selecciona **Iniciar sesión** e introduce una de las siguientes cuentas:

| Usuario | Contraseña | Perfil y uso |
| --- | --- | --- |
| `admin` | `Test123!` | Administración de productos, operaciones, auditoría y restauración de datos. |
| `operator` | `Test123!` | Gestión de almacenes, envíos, evidencias y eventos. |
| `customer` | `Test123!` | Compras, reservas y operaciones del primer cliente. |
| `customer2` | `Test123!` | Segundo cliente para comparar permisos y separación de registros. |
| `auditor` | `Test123!` | Consulta de información operativa y auditoría. |

También puedes seleccionar **Crear una cuenta** para registrar un cliente. El usuario admite de 3 a 32 letras, números o guiones bajos; la contraseña requiere de 12 a 128 caracteres y debe coincidir con su confirmación. Las cuentas nuevas tienen perfil cliente.

`locked_user` permite comprobar el mensaje de cuenta bloqueada. Una contraseña incorrecta permite comprobar la validación de acceso.

## Cupones y datos de ejemplo

- **BIENVENIDA10:** aplica un 10 % de descuento al subtotal.
- **ENVIO:** elimina el coste del envío.
- **ACC-001:** cuenta ficticia de `customer`.
- **ACC-002:** cuenta ficticia de `customer2`.

Las cuentas recién registradas no reciben una cuenta financiera. Para practicar transferencias utiliza las cuentas de ejemplo.

## Qué puedes comprobar

La página permite practicar recorridos completos, casos negativos, validaciones de formularios, cambios de estado, acceso por perfil, persistencia de datos, navegación por teclado, diseño adaptable y automatización de interacciones con herramientas como Playwright, Cypress y Selenium.

Los datos se guardan en el navegador y permanecen después de recargar. Cada navegador conserva su propio espacio; borrar los datos del sitio elimina esa información. Restaurar las operaciones conserva las cuentas registradas y el directorio de contactos.

Las cuentas, pagos, saldos y respuestas de la consola son simulaciones para pruebas. Utiliza información ficticia. La consola funciona dentro de la página; no representa una API pública ni ejecuta transacciones reales.
