# Cloudflare WAF & Security Configuration

Para completar la **STORY 4.4** (ISO 27001 / Ciberseguridad), sigue estos pasos en el **Cloudflare Dashboard** de tu zona (`biteradigital.com` o el dominio de SMG):

## 1. Web Application Firewall (WAF)
- Ve a **Security** > **WAF** > **Managed rules**.
- Habilita las "Cloudflare Managed Ruleset" para bloquear vulnerabilidades OWASP (Inyecciones SQL, XSS, etc.).
- Asegúrate de configurarlas inicialmente en modo **Log** por 48 horas, y luego cambia a **Block** para evitar falsos positivos en tu frontend responsivo.

## 2. Bot Management (Anti-Bot)
- Ve a **Security** > **Bots**.
- Activa **Super Bot Fight Mode** (si aplica para tu plan) o la protección gratuita contra bots.
- Configura "Definitely automated" a **Block** y "Likely automated" a **Managed Challenge** (Turnstile).

## 3. Rate Limiting
- Ve a **Security** > **WAF** > **Rate limiting rules**.
- Crea una regla para tu API endpoint (`/api/onboarding`):
  - **URI Path** equals `/api/onboarding`
  - **Method** equals `POST`
  - **Rate**: 5 requests por 1 minute.
  - **Action**: Block o Manage Challenge por 1 hour.

## 4. Cabeceras Implementadas en Código
- Content-Security-Policy (CSP) ha sido configurado en estricto en el archivo `public/_headers` del repositorio para prever ejecución de scripts de terceros no autorizados.
