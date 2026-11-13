## Browser Storage {#browser-storage}

Para reducir la carga de la API del backend y mejorar el rendimiento, PRUNplanner guarda los datos del juego directamente en tu navegador. This allows for faster access and a smoother user experience. La herramienta también actualiza automáticamente los datos guardados tras un periodo fijo para que sigan al día.

### Storage Categories {#storage-categories}

- **Datos del juego**
  Incluye información mayormente estática, como materiales, edificios, recetas, datos planetarios y detalles de las bolsas. It is sourced from FIO or, in the case of exchange data, calculated by PRUNplanner. Exchange data is refreshed more frequently to ensure accurate profit and cost calculations.

- **Datos de planificación**
  Esta categoría contiene tu información de planificación personal, incluidos tus imperios, planes, preferencias de bolsa y planes compartidos.

- **Datos de FIO**
  Se refiere a tus datos personales del juego, como el almacenamiento y la información de tus emplazamientos. Para acceder a ellos, puedes vincular tu cuenta de Prosperous Universe indicando tu nombre de usuario y una clave de API de FIO. PRUNplanner comprobará periódicamente si hay actualizaciones y sincronizará automáticamente los datos más recientes desde el backend.

---

## Preferences {#preferences}

Las preferencias te permiten guardar ajustes y configuraciones que usas a menudo, para que tu planificación sea más eficiente y personalizada.

Por ejemplo:

- **Imperio predeterminado**
  Tu imperio preferido se carga automáticamente al abrir la vista de imperio, así no tienes que seleccionarlo manualmente cada vez.

- **Umbrales de la vista de consumo**
  Si usas PRUNplanner junto con FIO para vigilar los inventarios de tus bases, puedes definir umbrales rojo y amarillo para los niveles de stock. Estos umbrales te ayudan a saber cuándo enviar naves de reabastecimiento y se guardan en tu navegador para mayor comodidad.

Las preferencias generales de la herramienta pueden gestionarse directamente desde tu perfil o ajustarse en las vistas correspondientes. Los ajustes específicos de cada plan pueden modificarse dentro de cada plan vinculado.
