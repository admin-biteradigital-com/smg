import type { PagesFunction, D1Database } from "@cloudflare/workers-types";

interface Env {
  DB: D1Database;
  RESEND_API_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.json() as Record<string, unknown>;

    // Validate required fields
    const { businessName, rut, address, phone, businessType } = body as {
      businessName: string;
      rut: string;
      address: string;
      phone: string;
      businessType: string;
    };

    if (!businessName || !rut || !address || !phone || !businessType) {
      return new Response(
        JSON.stringify({ error: "Todos los campos son obligatorios." }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      ) as unknown as globalThis.Response;
    }

    if (rut.length < 8 || rut.length > 12) {
      return new Response(
        JSON.stringify({ error: "RUT inválido." }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      ) as unknown as globalThis.Response;
    }

    // Insert lead into D1
    const result = await env.DB.prepare(
      `INSERT INTO smg_leads (business_name, rut, address, phone, business_type)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(businessName, rut, address, phone, businessType).run();

    console.log("[D1] Lead B2B insertado:", result.meta.last_row_id);

    // Send Email via Resend natively (bypass SDK Edge bugs)
    let emailStatus = "Saltado (No hay API Key configurada)";
    
    if (env.RESEND_API_KEY) {
      try {
        const emailPayload = {
          from: "SMG Onboarding <onboarding@resend.dev>",
          to: "administracion@biteradigital.com", // This MUST match the Resend verified email
          subject: `🚀 Alta Comercial: ${businessName} (${businessType})`,
          html: `
            <h2>Nuevo Lead B2B Capturado</h2>
            <p>Un nuevo cliente ha completado el formulario de alta comercial en la Landing Page.</p>
            <ul>
              <li><strong>Razón Social/Local:</strong> ${businessName}</li>
              <li><strong>RUT:</strong> ${rut}</li>
              <li><strong>Dirección:</strong> ${address}</li>
              <li><strong>Teléfono:</strong> ${phone}</li>
              <li><strong>Rubro:</strong> ${businessType}</li>
            </ul>
            <p>Revisa la base de datos D1 en Cloudflare para más detalles.</p>
          `,
        };

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${env.RESEND_API_KEY}`
          },
          body: JSON.stringify(emailPayload)
        });

        const data = (await res.json()) as Record<string, unknown>;

        if (!res.ok) {
          console.error("[Resend] API Error:", data);
          emailStatus = `Fallo HTTP Resend: ${data.message || res.statusText}`;
        } else {
          console.log("[Resend] Email de notificación enviado exitosamente.", data);
          emailStatus = `Enviado OK (ID: ${data.id})`;
        }
      } catch (emailError: unknown) {
        console.error("[Resend] Excepción Fatal al enviar email:", emailError);
        emailStatus = `Excepción Fetch: ${emailError instanceof Error ? emailError.message : String(emailError)}`;
      }
    }

    return new Response(
      JSON.stringify({
        message: "Lead registrado exitosamente.",
        leadId: result.meta.last_row_id,
        email_status: emailStatus
      }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    ) as unknown as globalThis.Response;
  } catch (error: unknown) {
    console.error("[D1] Error crítico insertando lead:", error);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor." }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    ) as unknown as globalThis.Response;
  }
};

// Handle CORS preflight
export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  }) as unknown as globalThis.Response;
};
