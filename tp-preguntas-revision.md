# Preguntas sobre el TP — De server-noob a arquitectura en capas

Las siguientes preguntas evalúan la comprensión del recorrido completo del proyecto: desde `server-noob.js` (V1), pasando por `server-noob-mejorada.js` (V2), hasta `server.js` con capas (V3) y la clase `DbPg` (V4).

---

### V1 — server-noob.js

**1.** En `server-noob.js`, cada endpoint crea un `new Client(config)`, hace `await client.connect()`, ejecuta la query, y en el `finally` hace `await client.end()`. Explicá con tus palabras qué problema de performance tiene este enfoque cuando la API recibe muchos requests simultáneos.

Cada vez que llega un request, el servidor crea una conexión nueva con PostgreSQL, la usa para hacer una consulta y luego la cierra. Abrir una conexión es una operación costosa porque implica crear un socket, autenticarse y negociar parámetros con la base de datos. Si llegan muchos requests al mismo tiempo, el servidor tendrá que crear y destruir muchas conexiones simultáneamente, lo que agrega demora a cada petición y puede agotar el límite de conexiones permitidas por PostgreSQL. Por eso este enfoque no escala bien cuando la API recibe mucho tráfico.

**2.** ¿Qué pasa si PostgreSQL está apagado y un request llega a `server-noob.js`? El `client.connect()` falla, y después se ejecuta el `finally` con `await client.end()`. ¿Qué error puede ocurrir y por qué?

Si PostgreSQL está apagado, la instrucción await client.connect() lanza una excepción porque no puede establecer la conexión. Luego se ejecuta el bloque finally, que intenta hacer: await client.end(); Pero como el cliente nunca llegó a conectarse correctamente, llamar a end() sobre ese cliente puede producir un error adicional: Error: Called end on a client that was never connected. Esto ocurre porque se está intentando cerrar una conexión que en realidad nunca se abrió.

**3.** En `server-noob.js`, si un compañero te dice "el endpoint de crear alumno tiene un bug", tenés que buscarlo en un archivo de ~215 líneas. ¿Por qué esto se vuelve un problema más grave a medida que la aplicación crece? Mencioná también qué pasa con Git cuando dos personas trabajan en el mismo archivo.

Con un archivo de unas 215 líneas todavía es posible encontrar un endpoint específico, pero a medida que la aplicación crece y se agregan más entidades y funcionalidades, el archivo puede terminar teniendo cientos o miles de líneas.

En ese caso:

-Encontrar un endpoint con un bug lleva más tiempo.
-Es más difícil entender qué hace cada parte del sistema.
-Mantener el código se vuelve complicado.

Además, cuando dos desarrolladores trabajan sobre el mismo archivo, Git detecta cambios en las mismas líneas o zonas cercanas y aparecen conflictos de merge, que deben resolverse manualmente. Si cada recurso estuviera en un archivo distinto, esos conflictos serían mucho menos frecuentes

**4.** Las queries en `server-noob.js` usan parámetros posicionales (`$1`, `$2`, etc.) en vez de concatenar strings. ¿Qué vulnerabilidad se previene con esto y por qué es importante?

Usar parámetros posicionales ($1, $2, etc.) evita la vulnerabilidad de inyección SQL. Si se concatenaran strings para construir la consulta, un atacante podría enviar texto malicioso para modificar la query, por ejemplo: '; DROP TABLE alumnos; --

Al usar parámetros, la librería pg envía esos valores por separado y los trata únicamente como datos, no como parte del código SQL. De esta manera, el contenido ingresado por el usuario no puede alterar la estructura de la consulta ni ejecutar instrucciones no deseadas.

---

### V2 — server-noob-mejorada.js

**5.** En la versión mejorada se reemplazó `Client` por `Pool`. Explicá la diferencia entre ambos: ¿cómo maneja las conexiones cada uno? ¿Cuándo conviene usar `Client` y cuándo `Pool`?

La diferencia principal está en cómo manejan las conexiones a la base de datos.

Client
-Crea una conexión nueva para cada request.
-Hay que llamar manualmente a connect() para abrirla y a end() para cerrarla.
-Conviene usarlo en programas que se ejecutan una sola vez y terminan, como scripts de migración o de carga de datos.
Pool
-Mantiene un conjunto de conexiones abiertas y las reutiliza.
-Cuando se hace una query, toma una conexión disponible del pool y luego la devuelve.
-Conviene usarlo en servidores y APIs porque evita el costo de abrir y cerrar conexiones constantemente.

**6.** ¿Qué es un `Router` de Express y qué problema resuelve en esta versión? ¿Por qué las rutas dentro del router no incluyen `/api/alumnos` y solo definen `''` o `'/:id'`?

**7.** En `server-noob-mejorada.js`, el archivo principal tiene solo ~26 líneas. ¿Qué responsabilidad tiene ese archivo ahora? ¿Dónde está la lógica de los endpoints?

**8.** En la versión mejorada desaparece el bloque `finally`. ¿Por qué ya no es necesario cerrar la conexión manualmente al usar `Pool`?

---

### V3 — server.js (arquitectura en capas)

**9.** Nombrá las tres capas de la arquitectura y explicá con tus palabras qué responsabilidad tiene cada una. ¿Cuál conoce los `req` y `res` de Express? ¿Cuál conoce el SQL? ¿Cuál tiene las reglas de negocio?

**10.** En `alumnos-service.js`, la edad del alumno se calcula en el service con una función JavaScript, en vez de calcularla en la query SQL. ¿Por qué se eligió calcularla en el service y no en la base de datos?

Porque la edad es una regla de negocio y no un dato almacenado.

Además:

-Mantiene el SQL más simple.
-Permite modificar fácilmente la forma de calcular la edad.
-La lógica puede reutilizarse desde otros lugares del sistema.

Si estuviera en SQL habría que modificar las queries cada vez que cambie la regla.

**11.** Cuando se crea un alumno con un `id_curso` que no existe, `AlumnosService` llama a `CursosService` para verificarlo. ¿Por qué llama al service de cursos y no directamente al repository de cursos?

Porque las capas deben respetarse. El service de alumnos no debería acceder directamente al repository de cursos.

Usando CursosService:

-Se reutilizan validaciones.
-Se centraliza la lógica de negocio.
-Si mañana CursosService agrega nuevas reglas, todos los consumidores las aplicarán automáticamente.

**12.** ¿Para qué sirve el archivo `.env` y la librería `dotenv`? ¿Qué problema de las versiones anteriores resuelve? ¿Por qué el archivo `.env` no se sube al repositorio de Git?

El archivo .env guarda variables de configuración, por ejemplo:

-DB_HOST=localhost
-DB_USER=postgres
-DB_PASSWORD=1234
-PORT=3000

La librería dotenv carga esas variables en: process.env resolviendo el problema de tener credenciales escritas en el código fuente.

El .env no se sube a Git porque puede contener información sensible, como:

usuarios
contraseñas
claves API

En Git se suele subir un .env-template con valores vacíos.

**13.** ¿Qué hace `LogHelper` y por qué es mejor que usar `console.log(error)` suelto en cada lugar del código?

Centraliza el registro de errores.

En vez de escribir muchas veces: console.log(error);

se usa: LogHelper.logError(error);

Ventajas:

-Evita repetir código.
-Permite cambiar la forma de loguear en un solo lugar.
-Puede guardar errores en archivos además de mostrarlos en consola.

---

### V4 — DbPg y DbMssql

**14.** Mirá `alumnos-repository.js` (versión original) y `alumnos-repository-new.js` (versión refactorizada). ¿Qué código repetido (boilerplate) se eliminó al extraer la clase `DbPg`? Mencioná al menos 3 cosas que ya no aparecen en el repository nuevo.

Al crear DbPg desaparecieron varias cosas repetidas:

-Los imports de pg.
-Los imports de configuración.
-Los imports de LogHelper.
-La variable
-El método
-Todos los bloques
-El acceso manual a:

**15.** La clase `DbPg` tiene 4 métodos: `queryAll`, `queryOne`, `queryReturnId` y `queryRowCount`. ¿Qué devuelve cada uno y en qué tipo de operación SQL se usa cada uno?

queryAll(): Devuelve un array de filas. Se usa típicamente para hacer SELECT de múltiples registros.
queryOne(): Devuelve una sola fila. Se usa típicamente para hacer SELECT por un id específico.
queryReturnId(): Devuelve el id generado. Se usa típicamente para operaciones INSERT ... RETURNING id.
queryRowCount(): Devuelve la cantidad de filas afectadas. Se usa típicamente para operaciones UPDATE y DELETE.

**16.** En los repositories nuevos, la clase se importa como `import Db from './db-pg.js'` (con el nombre `Db`, no `DbPg`). ¿Por qué se usa ese nombre genérico? ¿Qué pasa si mañana querés cambiar de PostgreSQL a SQL Server — cuántas líneas del repository tenés que modificar?

Se usa un nombre genérico para desacoplar el repository del motor de base de datos. Hoy se usa import Db from './db-pg.js' y mañana se puede cambiar a import Db from './db-mssql.js'. Al hacer esto, en el repository solo habría que modificar una línea, que es el import, mientras que todo lo demás permanece exactamente igual.

---

### "¿Dónde lo pondrías?" — Situaciones prácticas

En cada situación, indicá en qué capa lo pondrías (controller, service o repository) y explicá por qué.

**17.** Necesitás agregar un nuevo endpoint `GET /api/alumnos/curso/:idCurso` que devuelva todos los alumnos de un curso. La query sería `SELECT * FROM alumnos WHERE id_curso = $1`. ¿Dónde pondrías esa query? ¿Dónde pondrías la ruta del endpoint? ¿Agregarías algo en el service?

Para el endpoint GET /api/alumnos/curso/:idCurso, las responsabilidades se dividen La Query SQL se ubica en el Repository, utilizando por ejemplo SELECT * FROM alumnos WHERE id_curso = $1. La ruta del endpoint se define en el Controller mediante router.get('/curso/:idCurso'). En el Service sí se agrega código, sumando un método como getByCursoIdAsync(idCurso) aunque solo delegue la tarea al repository, ya que esto mantiene consistente la arquitectura.

**18.** El cliente pide que al crear un alumno, si no se manda `fecha_nacimiento`, el sistema ponga la fecha de hoy por defecto. ¿En qué capa pondrías esa lógica y por qué? ¿Es una regla de negocio o es algo de la base de datos?

La asignación de la fecha de hoy por defecto se pondría en el Service. El código sería si no existe entity.fecha_nacimiento, entonces entity.fecha_nacimiento es igual a new Date(). Esto se debe a que es una regla de negocio y no depende de PostgreSQL ni de cómo se almacenen los datos en la base de datos.

**19.** Necesitás que al eliminar un curso, se verifique primero que no tenga alumnos asociados, y si tiene, devolver un error `400` con el mensaje "No se puede eliminar el curso porque tiene alumnos asociados". ¿Dónde pondrías la verificación (la consulta de si tiene alumnos)? ¿Dónde pondrías el `throw new Error(...)`? ¿Y dónde se atraparía ese error para devolver el `400`?

Para cumplir con la regla de no eliminar cursos con alumnos, las tareas se reparten en tres partes. La consulta para verificar alumnos asociados se hace en el Repository con un SELECT COUNT(*) FROM alumnos WHERE id_curso = $1. El throw del error se realiza en el Service lanzando el mensaje de que no se puede eliminar el curso porque tiene alumnos asociados. El error se devuelve por el Controller dentro de un bloque catch que responde con un estado 400 y envía el mensaje del error.

**20.** Te piden agregar un endpoint que devuelva un resumen por curso: nombre del curso, cantidad de alumnos, y el promedio de edad de esos alumnos. ¿Qué parte resolvés con SQL (en el repository) y qué parte resolvés con lógica (en el service)? ¿O se puede resolver todo en una sola capa?

Para realizar el resumen por curso, la mejor solución es repartir responsabilidades. El Repository se encarga de obtener la información necesaria mediante SQL, como el nombre del curso, los alumnos del curso, las fechas de nacimiento o incluso la cantidad de alumnos usando COUNT(*). El Service se encarga de calcular el promedio de edad, ya que la edad es una regla de negocio y se procesa mediante una fórmula como promedio igual a suma de edades dividido cantidad de alumnos. Aunque esto también podría resolverse completamente en SQL usando AVG y funciones de extracción de año, eso mezclaría la lógica de negocio con el acceso a datos, por lo que mantener el promedio de edad en el Service es la opción más alineada con esta arquitectura.
