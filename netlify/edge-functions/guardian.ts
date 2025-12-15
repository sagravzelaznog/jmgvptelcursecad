// guardian.ts - VERSIÓN CORREGIDA (FIX IMMUTABLE HEADERS)

export default async (request: Request, context: any) => {
	try {
			const url = new URL(request.url);

			// --- 0. EXCEPCIONES (Archivos estáticos y login) ---
			if (url.pathname.includes("favicon") || url.pathname.includes(".css") || url.pathname.includes(".js")) {
					return context.next();
			}

			// --- 1. BUSCAR LA "LLAVE" (Token) ---
			let token = url.searchParams.get("t");
			
			// Si no está en URL, buscamos en cookies
			if (!token && context.cookies) {
					token = context.cookies.get("mi_token_acceso");
			}

			// --- MODO DEBUG SI NO HAY TOKEN ---
			if (!token) {
					return new Response(`
							<html>
									<body style="font-family: sans-serif; background: #222; color: #fff; padding: 20px;">
											<h1>🕵️ MODO DEBUG: NO TOKEN</h1>
											<p>El Guardián no ve tu pase.</p>
											<p><strong>URL actual:</strong> ${url.pathname}</p>
											<hr>
											<p>Usa el portal_acceso.html para entrar.</p>
									</body>
							</html>`, 
							{ headers: { "content-type": "text/html" } }
					);
			}

			// --- 2. GESTIÓN DE COOKIE (CORREGIDO AQUÍ) ---
			// Si el token viene en la URL, lo guardamos en cookie y limpiamos la URL
			if (url.searchParams.get("t")) {
					url.searchParams.delete("t");
					
					// CAMBIO IMPORTANTE: Creamos la respuesta MANUALMENTE
					// para poder poner Location (Redirección) y Set-Cookie al mismo tiempo.
					return new Response(null, {
							status: 302,
							headers: {
									"Location": url.toString(),
									"Set-Cookie": `mi_token_acceso=${token}; Path=/; Max-Age=3600; SameSite=Lax`
							}
					});
			}

			// --- 3. DECODIFICAR TOKEN ---
			let payload;
			try {
					const parts = token.split(".");
					if (parts.length !== 3) throw new Error("Token incompleto");
					const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
					const pad = base64.length % 4;
					const paddedBase64 = pad ? base64 + '='.repeat(4 - pad) : base64;
					payload = JSON.parse(atob(paddedBase64));
			} catch (e) {
					return new Response(`Error token: ${e.message}`, { status: 400 });
			}

			// --- 4. VALIDACIÓN DE ACCESO ---
			const userRole = payload.role || "invitado";
			
			// >>> ⚠️ TU BACKDOOR (IMPORTANTE: PON TU CORREO REAL ABAJO) <<<
			if (payload.email === "primomanuelsagrav@gmail.com") {
						return context.next(); // Pasa directo
			}
			// >>> ------------------------------------------------ <<<

			// Niveles normales
			const roleLevels: any = { "invitado": 0, "gratuito": 1, "plata": 2, "oro": 3, "admin": 99 };
			const userLevel = roleLevels[userRole] || 0;

			if (userLevel < 2) { 
					return new Response("<h1>Acceso Denegado: Nivel insuficiente</h1>", { headers: {"content-type": "text/html"}, status: 403 });
			}

			return context.next();

	} catch (criticalError: any) {
			return new Response(
					`CRASH REPORT:\n\nMessage: ${criticalError.message}\nStack: ${criticalError.stack}`,
					{ status: 500 }
			);
	}
};