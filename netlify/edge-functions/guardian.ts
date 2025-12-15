// guardian.ts - Versión Blindada sin Dependencias Externas

export default async (request: Request, context: any) => {
	// 🛡️ BLOQUE DE SEGURIDAD GLOBAL
	// Si algo falla aquí adentro, no crasheamos, mostramos el error en pantalla.
	try {
			const url = new URL(request.url);

			// --- 0. EXCEPCIONES (Archivos estáticos y login) ---
			// Si es un favicon o assets, dejamos pasar sin revisar nada
			if (url.pathname.includes("favicon") || url.pathname.includes(".css") || url.pathname.includes(".js")) {
					return context.next();
			}

			// --- 1. BUSCAR LA "LLAVE" (Token) ---
			// Intentamos leer de la URL o de las Cookies de forma segura
			let token = url.searchParams.get("t");
			
			// Lectura segura de cookies (a veces context.cookies falla si no existe)
			if (!token && context.cookies) {
					token = context.cookies.get("mi_token_acceso");
			}

			// --- MODO DEPURACIÓN VISUAL ---
			// Si no hay token, mostramos la pantalla de Debug en lugar de un error 401 simple
			if (!token) {
					return new Response(`
							<html>
									<body style="font-family: sans-serif; background: #222; color: #fff; padding: 20px;">
											<h1>🕵️ MODO DEBUG: NO TOKEN</h1>
											<p>El Guardián está vivo, pero no ve tu pase.</p>
											<p><strong>URL actual:</strong> ${url.pathname}</p>
											<p><strong>Cookies detectadas:</strong> ${context.cookies ? 'Sistema de cookies activo' : 'Sistema de cookies inactivo'}</p>
											<hr>
											<p>Por favor, usa el portal_acceso.html para generar un enlace.</p>
									</body>
							</html>`, 
							{ headers: { "content-type": "text/html" } }
					);
			}

			// --- 2. GESTIÓN DE COOKIE (Si viene en URL) ---
			if (url.searchParams.get("t")) {
					url.searchParams.delete("t");
					const response = Response.redirect(url.toString(), 302);
					// Cookie simplificada al máximo para evitar errores de sintaxis
					response.headers.set("Set-Cookie", `mi_token_acceso=${token}; Path=/; Max-Age=3600`);
					return response;
			}

			// --- 3. DECODIFICAR TOKEN (La parte peligrosa) ---
			let payload;
			try {
					const parts = token.split(".");
					if (parts.length !== 3) throw new Error("Token incompleto (no tiene 3 partes)");
					
					// Decodificación manual segura para Base64Url
					const base64Url = parts[1];
					const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
					// Fix para padding de base64 si es necesario
					const pad = base64.length % 4;
					const paddedBase64 = pad ? base64 + '='.repeat(4 - pad) : base64;
					
					payload = JSON.parse(atob(paddedBase64));
			} catch (e) {
					// Si el token es basura, lo reportamos sin crashear
					return new Response(`Error decodificando token: ${e.message}`, { status: 400 });
			}

			// --- 4. VALIDACIÓN DE ACCESO ---
			const userRole = payload.role || "invitado";
			
			// >>> TU BACKDOOR (Acceso Maestro) <<<
			// Reemplaza con tu correo real
			if (payload.email === "primomanuelsagrav@GMAIL.COM") {
						return context.next(); // Pasa directo, eres el jefe
			}

			// Niveles normales
			const roleLevels: any = { "invitado": 0, "gratuito": 1, "plata": 2, "oro": 3, "admin": 99 };
			const userLevel = roleLevels[userRole] || 0;

			if (userLevel < 2) { // Requiere Plata
					return new Response("<h1>Acceso Denegado: Nivel insuficiente</h1>", { headers: {"content-type": "text/html"}, status: 403 });
			}

			// Si llegamos aquí, todo bien
			return context.next();

	} catch (criticalError: any) {
			// 🚑 CAPTURA DE EMERGENCIA
			// Si algo explota (Crash), esto lo atrapa y te muestra el error real
			return new Response(
					`CRASH REPORT:\n\nMessage: ${criticalError.message}\nStack: ${criticalError.stack}`,
					{ status: 500 }
			);
	}
};