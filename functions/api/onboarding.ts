import { Resend } from "resend";
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
      );
    }

    if (rut.length < 8 || rut.length > 12) {
      return new Response(
        JSON.stringify({ error: "RUT inválido." }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Insert lead into D1
    const result = await env.DB.prepare(
      `INSERT INTO smg_leads (business_name, rut, address, phone, business_type)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(businessName, rut, address, phone, businessType).run();

    console.log("[D1] Lead B2B insertado:", result.meta.last_row_id);

    // Fire & Forget: Send Email via Resend
    if (env.RESEND_API_KEY) {
      context.waitUntil((async () => {
        try {
          const resend = new Resend(env.RESEND_API_KEY);
          await resend.emails.send({
            from: "SMG Onboarding <onboarding@resend.dev>",
            to: "administracion@biteradigital.com",
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
          });
          console.log("[Resend] Email de notificación enviado exitosamente.");
        } catch (emailError) {
          console.error("[Resend] Fallo al enviar email:", emailError);
        }
      })());
    }

    return new Response(
      JSON.stringify({
        message: "Lead registrado exitosamente.",
        leadId: result.meta.last_row_id,
      }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("[D1] Error crítico insertando lead:", error);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor." }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
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
  });
};
