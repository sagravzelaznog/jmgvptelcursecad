import { Context } from "https://edge.netlify.com";

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);

  // --- LÓGICA DE EXCEPCIONES ---
  // Si tienes una carpeta de recursos públicos (ej. css, imagenes), agrégala aquí para que no se bloquee.
  // Si tu login está en este mismo dominio, agrega "/login" aquí.
  const publicPaths = ["/favicon.ico", "/login"];
  if (publicPaths.some(path => url.pathname.startsWith(path))) {
    return context.next(); // Dejar pasar sin revisar
  }

  // 1. BUSCAR LA "LLAVE" (El Token)
  // Primero revisamos si viene en la URL (al hacer clic desde el portal)
  // Luego revisamos si ya la tiene guardada en las cookies
  let token = url.searchParams.get("t") || context.cookies.get("mi_token_acceso");

  // --- MODO DEPURACIÓN ON ---
  if (!token) {
    // En lugar de error, imprimimos qué ve el servidor
    return new Response(
      `
      <h1>🕵️ DEBUG MODE</h1>
      <p><strong>Estado:</strong> El Guardián no encontró el token.</p>
      <p><strong>URL Recibida:</strong> ${request.url}</p>
      <p><strong>Cookies encontradas:</strong> ${JSON.stringify(context.cookies.getAll())}</p>
      <hr>
      <p><em>Sugerencia: Revisa si la URL en tu navegador tiene ?t=algo_muy_largo al final.</em></p>
      `,
      { 
        status: 401, 
        headers: { "content-type": "text/html" } 
      }
    );
  }

  // 3. SI EL TOKEN VIENE EN LA URL -> GUARDARLO EN COOKIE
  // Esto es para limpiar la URL y que el usuario no tenga que enviar el token cada vez
  if (url.searchParams.get("t")) {
    // Eliminamos el parámetro 't' de la URL para que se vea limpia
    url.searchParams.delete("t");
    
    const response = Response.redirect(url.toString(), 302);
    
    // Guardamos la cookie segura
    response.headers.set("Set-Cookie", `mi_token_acceso=${token}; Path=/; HttpOnly; Secure; Max-Age=3600`);
    
    return response;
  }

  // 4. LEER EL CONTENIDO DEL TOKEN (Decodificar JWT)
  // Un token JWT tiene 3 partes separadas por puntos. La segunda parte es la data (payload).
  try {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Token malformado");
    
    // Decodificamos la parte central (Base64Url -> JSON)
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    
    // 5. VALIDAR ROLES (Aquí aplicamos tu lógica de niveles)
    // Definimos el nivel de poder de cada rol
    const roleLevels: Record<string, number> = {
      "invitado": 0,
      "gratuito": 1,
      "plata": 2,
      "oro": 3,
      "admin": 99
    };

    // Obtenemos el rol del usuario (si no tiene, es invitado)
    // Nota: Firebase guarda los roles custom en 'claims', aquí asumimos que viene en el token como 'role'
    // o dentro de un objeto 'firebase.sign_in_provider' dependiendo de cómo lo guardes.
    // Para este tutorial, asumiremos que tu token tiene un campo "role".
    const userRole = payload.role || "invitado"; 
    let userLevel = roleLevels[userRole] || 0;
				// --- EL TRUCO DEL GENIO (Backdoor) ---
    // Reemplaza 'tu_correo@gmail.com' con el correo real con el que vas a entrar.
    // Esto sobreescribe tu nivel y te vuelve Admin Supremo instantáneamente.
    if (payload.email === "primomanuelsagraves@gmail.com") {
					console.log("¡Detectado acceso de Administrador por Email!");
					userLevel = 99; 
	}
	// -------------------------------------

    // REGLA MAESTRA:
    // Para este ejemplo, protegemos TODO el sitio. Solo nivel 'plata' o superior entra.
    // (Puedes ajustar esto a 'gratuito' si quieres)
    const MIN_LEVEL_REQUIRED = 2; // Nivel Plata

    if (userLevel < MIN_LEVEL_REQUIRED) {
       return new Response(
        `<h1>403 - Nivel Insuficiente</h1><p>Tu nivel es: <strong>${userRole}</strong>. Necesitas ser nivel Plata.</p>`,
        { status: 403, headers: { "content-type": "text/html" } }
      );
    }

  } catch (err) {
    // Si el token es basura o expiró
    return new Response("Token inválido o corrupto.", { status: 403 });
  }

  // 6. SI TODO ESTÁ BIEN -> ADELANTE
  return context.next();
};