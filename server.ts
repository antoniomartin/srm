/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// In-memory or persisted custom key for Gemini API
let serverCustomApiKey: string = "";

// Initialize custom key from .env if present
const initialEnvKey = (process.env.GEMINI_API_KEY || "").trim();
if (initialEnvKey && initialEnvKey !== "MY_GEMINI_API_KEY") {
  serverCustomApiKey = initialEnvKey;
}

// Safe initializer for Gemini API that never throws on missing key
function getGeminiClient(explicitKey?: string): GoogleGenAI | null {
  const apiKey = (explicitKey || serverCustomApiKey || process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "undefined" || apiKey === "null") {
    return null;
  }
  try {
    return new GoogleGenAI({ apiKey });
  } catch (err) {
    console.warn("Error creating GoogleGenAI instance:", err);
    return null;
  }
}

// API Routes FIRST
const FALLBACK_UNSPSC = [
  // 30: Materiales Estructurales y Construcción
  { code: "30103501", name: "Perfil de acero estructural (Vigas, Canales y Ángulos de Acero)", segment: "Materiales Estructurales y Construcción" },
  { code: "30103500", name: "Materiales de acero estructural", segment: "Materiales Estructurales y Construcción" },
  { code: "30102000", name: "Vigas de madera y madera estructural", segment: "Materiales Estructurales y Construcción" },
  { code: "30200000", name: "Estructuras y componentes prefabricados", segment: "Materiales Estructurales y Construcción" },
  
  // 31: Ferretería y Suministros de Manufactura
  { code: "31161500", name: "Tornillos, pernos y tuercas (Sujeciones y Tornillería)", segment: "Ferretería y Manufactura" },
  { code: "31161600", name: "Arandelas y pasadores de montaje", segment: "Ferretería y Manufactura" },
  { code: "31201500", name: "Adhesivos y selladores industriales", segment: "Ferretería y Manufactura" },
  
  // 39: Equipos y suministros eléctricos
  { code: "39121000", name: "Disyuntores, fusibles y componentes de distribución", segment: "Equipos y Suministros Eléctricos" },
  { code: "39121400", name: "Conectores, terminales y acoples de cables", segment: "Equipos y Suministros Eléctricos" },
  { code: "39121600", name: "Canalizaciones, tubos conduit y accesorios eléctricos", segment: "Equipos y Suministros Eléctricos" },
  { code: "39121700", name: "Accesorios para cables y arneses de cables", segment: "Equipos y Suministros Eléctricos" },
  { code: "39111500", name: "Luminarias e iluminación industrial y de oficinas", segment: "Equipos y Suministros Eléctricos" },

  // 43: Tecnología de la Información, computadores y software
  { code: "43201400", name: "Dispositivos de almacenamiento de datos y discos rígidos", segment: "Tecnología de la Información" },
  { code: "43211500", name: "Computadoras portátiles, de escritorio y servidores", segment: "Tecnología de la Información" },
  { code: "43221500", name: "Equipos de redes y telecomunicaciones (Routers, Switches)", segment: "Tecnología de la Información" },
  { code: "43231500", name: "Software de gestión corporativa (ERP, CRM, Base de Datos)", segment: "Tecnología de la Información" },
  { code: "43232100", name: "Software de desarrollo de sistemas y herramientas de TI", segment: "Tecnología de la Información" },

  // 24: Embalajes y recipientes
  { code: "24121500", name: "Cajas de cartón y embalajes de papel", segment: "Logística y Embalaje" },
  { code: "24112100", name: "Palés y contenedores plásticos/metálicos", segment: "Logística y Embalaje" },

  // 78: Servicios de transporte de carga
  { code: "78101800", name: "Servicios de transporte de carga por carretera", segment: "Logística y Embalaje" },
  { code: "78121605", name: "Servicios de almacenamiento de mercancías y bodegaje", segment: "Logística y Embalaje" },

  // 72 & 76: Mantenimiento, Facilidades y Limpieza
  { code: "72101503", name: "Servicios de HVAC (Calefacción, ventilación y aire acondicionado)", segment: "Servicios de Mantenimiento y Facilidades" },
  { code: "72101511", name: "Servicios de fontanería, gas e instalaciones de agua", segment: "Servicios de Mantenimiento y Facilidades" },
  { code: "72151500", name: "Servicios de instalación eléctrica en edificios", segment: "Servicios de Mantenimiento y Facilidades" },
  { code: "76111500", name: "Servicios de limpieza general de oficinas e industrias", segment: "Servicios de Mantenimiento y Limpieza" },

  // 80 & 84 & 86: Servicios Profesionales
  { code: "80101500", name: "Servicios de consultoría de gestión empresarial y estratégica", segment: "Servicios Profesionales" },
  { code: "84111500", name: "Servicios de auditoría financiera, contabilidad y fiscal", segment: "Servicios Profesionales" },
  { code: "80121500", name: "Servicios de asesoría legal y representación jurídica", segment: "Servicios Profesionales" },
  { code: "86131500", name: "Servicios de formación y capacitación técnica", segment: "Servicios Profesionales" },

  // 46: Seguridad y Calidad
  { code: "46181500", name: "Equipos de protección individual (EPIs, calzado, cascos, guantes)", segment: "Seguridad y Calidad" },
  { code: "80161500", name: "Servicios de consultoría de control de calidad y auditorías", segment: "Seguridad y Calidad" }
];

function getLocalFallbackSearch(query: string): any {
  const cleanQuery = (query || "").trim().toLowerCase();
  if (!cleanQuery) return { codes: FALLBACK_UNSPSC.slice(0, 10) };

  // 1. Check if it's a numeric search
  const cleanNum = cleanQuery.replace(/\D/g, '');
  if (cleanNum.length >= 4) {
    const code8 = cleanNum.padEnd(8, '0');
    // Check if we have an exact or close match in our fallback list
    const matched = FALLBACK_UNSPSC.find(item => item.code === code8 || item.code.startsWith(cleanNum));
    if (matched) {
      return { codes: [matched] };
    }

    // Dynamic numeric family code generation
    let name = "Código estándar UNSPSC";
    let segment = "Otros Suministros";
    const prefix2 = code8.substring(0, 2);
    const prefix4 = code8.substring(0, 4);
    
    if (prefix2 === "30") {
      segment = "Materiales Estructurales y Construcción";
      if (prefix4 === "3010") name = "Perfiles y vigas de acero estructural (Materiales estructurales)";
      else name = "Materiales estructurales de construcción";
    } else if (prefix2 === "31") {
      segment = "Ferretería y Manufactura";
      if (prefix4 === "3116") name = "Tornillos, pernos, tuercas y elementos de fijación";
      else name = "Componentes y suministros de manufactura";
    } else if (prefix2 === "39") {
      segment = "Equipos y Suministros Eléctricos";
      if (prefix4 === "3912") name = "Equipos de distribución eléctrica, cables y disyuntores";
      else name = "Suministros eléctricos";
    } else if (prefix2 === "43") {
      segment = "Tecnología de la Información";
      if (prefix4 === "4321") name = "Computadoras portátiles, servidores y periféricos";
      else if (prefix4 === "4323") name = "Software corporativo y aplicaciones de gestión";
      else name = "Equipos de TI y telecomunicaciones";
    } else if (prefix2 === "72") {
      segment = "Servicios de Mantenimiento y Facilidades";
      name = "Servicios de mantenimiento y reparación de instalaciones";
    } else if (prefix2 === "76") {
      segment = "Servicios de Mantenimiento y Limpieza";
      name = "Servicios de limpieza industrial y de oficinas";
    } else if (prefix2 === "78") {
      segment = "Servicios de Transporte y Logística";
      name = "Servicios de transporte de carga y almacenamiento";
    } else if (prefix2 === "80") {
      segment = "Servicios Profesionales";
      name = "Servicios de consultoría de negocios y gestión estratégica";
    } else {
      name = `Clasificación UNSPSC (Familia ${prefix4})`;
    }
    
    return {
      codes: [
        {
          code: code8,
          name: name,
          segment: segment
        }
      ]
    };
  }

  // 2. Keyword text search
  const keywords = cleanQuery.split(/\s+/).filter(Boolean);
  const results = FALLBACK_UNSPSC.filter(item => {
    const textToSearch = `${item.code} ${item.name.toLowerCase()} ${item.segment.toLowerCase()}`;
    return keywords.every(kw => textToSearch.includes(kw));
  });

  return { codes: results.slice(0, 15) };
}

// Dedicated SRM Local Analytical AI Engine
function generateLocalSRMInsights(
  entityType: 'empresa' | 'contacto',
  name: string,
  details: any = {},
  history: any[] = []
): string {
  const isEmpresa = entityType === 'empresa';
  const now = new Date();

  // Sort interactions newest first
  const sortedHistory = [...(history || [])].sort((a, b) => {
    const dateA = new Date(a.date || a.fecha || 0).getTime();
    const dateB = new Date(b.date || b.fecha || 0).getTime();
    return dateB - dateA;
  });

  const totalInteractions = sortedHistory.length;
  let lastContactDate: Date | null = null;
  let daysSinceLastContact: number | null = null;

  if (totalInteractions > 0 && sortedHistory[0].date) {
    const parsed = new Date(sortedHistory[0].date);
    if (!isNaN(parsed.getTime())) {
      lastContactDate = parsed;
      daysSinceLastContact = Math.max(0, Math.floor((now.getTime() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24)));
    }
  }

  // Count interaction types
  const interactionTypes: Record<string, number> = {};
  sortedHistory.forEach(item => {
    const t = (item.type || item.tipo || 'comunicación').toLowerCase();
    interactionTypes[t] = (interactionTypes[t] || 0) + 1;
  });

  // Calculate health score & indicators
  let healthScore = 70;
  const rating = Number(details.calificacion || details.rating || 3);
  healthScore += (rating - 3) * 10;

  const estado = String(details.estado || 'activo').toLowerCase();
  if (estado === 'activo' || estado === 'homologado') healthScore += 10;
  else if (estado === 'en_revision' || estado === 'pendiente' || estado === 'prospecto') healthScore += 0;
  else if (estado === 'inactivo' || estado === 'bloqueado') healthScore -= 25;

  if (daysSinceLastContact !== null) {
    if (daysSinceLastContact <= 30) healthScore += 10;
    else if (daysSinceLastContact > 90) healthScore -= 15;
  } else {
    healthScore -= 10;
  }
  healthScore = Math.max(10, Math.min(100, healthScore));

  let stars = '⭐⭐⭐☆☆';
  if (rating >= 5) stars = '⭐⭐⭐⭐⭐';
  else if (rating >= 4) stars = '⭐⭐⭐⭐☆';
  else if (rating >= 3) stars = '⭐⭐⭐☆☆';
  else if (rating >= 2) stars = '⭐⭐☆☆☆';
  else stars = '⭐☆☆☆☆';

  if (isEmpresa) {
    const sector = details.sector || details.categoria || details.tipo || 'Sector Comercial / Industrial';
    const ciudad = details.ciudad || details.provincia || 'España';
    const cif = details.cif || details.nit || 'No especificado';
    const unspscCodes = details.codigosUNSPSC || details.unspsc || [];
    const certs = details.certificaciones || [];
    const paymentTerms = details.condicionesPago || '30/60 días fecha factura';

    return `### 🏢 1. Resumen de Perfil Ejecutivo
- **Proveedor**: **${name}** (${sector} — ${ciudad})
- **Identificador Fiscal**: \`${cif}\`
- **Índice de Salud SRM**: **${healthScore}/100** (${healthScore >= 75 ? '🟢 Óptimo / Alta Confianza' : healthScore >= 50 ? '🟡 Estable / Supervisión Habitual' : '🔴 En Riesgo / Requiere Atención Inmediata'})
- **Calificación del Proveedor**: ${stars} (${rating}/5)
- **Estado Operativo**: \`${estado.toUpperCase()}\`
- **Condiciones Comerciales**: ${paymentTerms}
${certs.length > 0 ? `- **Certificaciones Registradas**: ${certs.join(', ')}` : ''}
${unspscCodes.length > 0 ? `- **Familias UNSPSC Vinculadas**: ${unspscCodes.slice(0, 3).join(', ')}` : ''}

### 🤝 2. Análisis de Relación y Engagement
- **Interacciones Registradas**: **${totalInteractions}** eventos en el sistema.
${lastContactDate 
  ? `- **Último Contacto**: Hace **${daysSinceLastContact} días** (${lastContactDate.toLocaleDateString('es-ES')}).`
  : `- **Último Contacto**: *Sin interacciones previas registradas.*`}
- **Desglose de Comunicaciones**: ${Object.entries(interactionTypes).map(([k, v]) => `**${k}**: ${v}`).join(' | ') || 'Ninguna registrada'}
- **Diagnóstico de Cadencia**: ${
  daysSinceLastContact === null 
    ? '⚠️ *Sin historial*: Conviene agendar una primera reunión de presentación o formalización de catálogo.'
    : daysSinceLastContact > 60 
      ? '⚠️ *Desconexión detectada*: Han transcurrido más de 60 días sin actividad directa. Se aconseja reactivar contacto para validar disponibilidad y tarifas.'
      : '✅ *Cadencia activa*: La relación mantiene un flujo constante y adecuado para la prevención de incidencias y control de plazos.'
}

### 🎯 3. Recomendaciones Estratégicas de Acción
1. **${daysSinceLastContact === null || daysSinceLastContact > 45 ? 'Planificar Reunión de Coordinación' : 'Revisión Periódica de Acuerdos'}**: Agendar una sesión breve con el interlocutor comercial para validar condiciones vigentes, plazos de entrega y requerimientos del próximo trimestre.
2. **${rating < 3.5 ? 'Plan de Homologación y Calidad' : 'Consolidación de Proveedor Estratégico'}**: ${rating < 3.5 ? 'Identificar motivos de valoración media/baja y solicitar un plan de acciones correctivas.' : 'Explorar acuerdos marco a largo plazo o rappel por volumen acumulado para optimizar el gasto de compras.'}
3. **Gestión Documental y Cumplimiento**: Comprobar la vigencia de fichas técnicas, certificados de calidad y coberturas legales antes de la emisión de nuevos pedidos.

### ✉️ 4. Plantilla de Comunicación Personalizada
**Asunto**: *Seguimiento operativo y actualización de acuerdos comerciales — SRM*

*Estimado equipo de ${name},*

Esperamos que se encuentren muy bien. Nos ponemos en contacto desde el Departamento de Compras con motivo del seguimiento y gestión periódica de nuestros proveedores clave.

Nos gustaría coordinar una breve reunión o llamada de seguimiento en los próximos días con el objetivo de:
- Revisar el estado de nuestras órdenes de compra y niveles de servicio recientes.
- Actualizar el catálogo de referencias y condiciones comerciales para el periodo entrante.
- Garantizar que toda la documentación técnica y de homologación se encuentre debidamente al día.

¿Qué día y franja horaria les resultaría más conveniente la próxima semana para una breve llamada?

Agradecemos de antemano su colaboración y compromiso.

*Atentamente,*  
**Equipo de Gestión de Proveedores (SRM)**`;
  } else {
    const cargo = details.cargo || details.puesto || 'Contacto Comercial';
    const email = details.email || 'correo@proveedor.com';
    const tel = details.telefono || details.movil || 'No registrado';
    const dep = details.departamento || 'Comercial / Ventas';

    return `### 👤 1. Perfil Inteligente del Contacto
- **Nombre**: **${name}**
- **Cargo / Rol**: **${cargo}** (${dep})
- **Datos de Contacto**: Email: \`${email}\` | Teléfono: \`${tel}\`
- **Índice de Actividad**: **${healthScore}/100**
${details.esPrincipal ? '- **Rol Estratégico**: ⭐ **Interlocutor Principal / Decisor Clave**' : ''}

### 💬 2. Análisis del Historial de Interacciones
- **Interacciones Registradas**: **${totalInteractions}** eventos con este contacto.
${lastContactDate 
  ? `- **Último Intercambio**: Hace **${daysSinceLastContact} días** (${lastContactDate.toLocaleDateString('es-ES')}).`
  : `- **Último Intercambio**: *Aún no se han registrado eventos directos con este contacto.*`}
- **Canales más frecuentes**: ${Object.entries(interactionTypes).map(([k, v]) => `**${k}**: ${v}`).join(', ') || 'Pendiente de inicio'}

### 🚀 3. Recomendaciones de Seguimiento
1. **${daysSinceLastContact === null || daysSinceLastContact > 30 ? 'Reanudar Comunicación Directa' : 'Mantener Seguimiento Fluido'}**: Enviar un mensaje breve de cortesía para dar seguimiento a las últimas gestiones y confirmar disponibilidad.
2. **Consolidación de Rol**: Registrar a este contacto como referente para pedidos urgentes, escalado de incidencias o consultas técnicas específicas.

### ✉️ 4. Plantilla de Correo Personalizada
**Asunto**: *Seguimiento comercial / Coordinación de necesidades — SRM*

*Hola ${name.split(' ')[0] || name},*

Espero que estés teniendo una excelente semana.

Te escribo para dar seguimiento a nuestras conversaciones recientes y coordinar conjuntamente las necesidades y solicitudes de suministro que tenemos previstas para las próximas semanas.

¿Tendrías disponibilidad para una breve llamada de 10 minutos entre mañana o pasado para alinearnos?

Quedo a la espera de tus comentarios. ¡Muchas gracias!

*Un cordial saludo,*  
**Gestión de Compras y Proveedores**`;
  }
}

// AI Status & Configuration Endpoints
app.get("/api/ai/status", (req, res) => {
  const envKey = (process.env.GEMINI_API_KEY || "").trim();
  const hasEnvKey = Boolean(envKey && envKey !== "MY_GEMINI_API_KEY");
  const hasCustomKey = Boolean(serverCustomApiKey);
  res.json({
    configured: hasEnvKey || hasCustomKey,
    source: hasCustomKey ? "custom" : (hasEnvKey ? "env" : "local_engine"),
    model: "gemini-2.5-flash",
    fallbackAvailable: true
  });
});

app.post("/api/ai/config", (req, res) => {
  const { apiKey } = req.body;
  if (typeof apiKey === "string") {
    serverCustomApiKey = apiKey.trim();
    if (serverCustomApiKey) {
      process.env.GEMINI_API_KEY = serverCustomApiKey;
      try {
        const envPath = path.join(process.cwd(), ".env");
        let envContent = "";
        if (fs.existsSync(envPath)) {
          envContent = fs.readFileSync(envPath, "utf-8");
        }
        if (envContent.includes("GEMINI_API_KEY=")) {
          envContent = envContent.replace(/GEMINI_API_KEY=.*/, `GEMINI_API_KEY="${serverCustomApiKey}"`);
        } else {
          envContent += `\nGEMINI_API_KEY="${serverCustomApiKey}"\n`;
        }
        fs.writeFileSync(envPath, envContent, "utf-8");
      } catch (e) {
        console.warn("Could not persist GEMINI_API_KEY to .env:", e);
      }
    } else {
      // Clear key
      delete process.env.GEMINI_API_KEY;
    }
  }
  res.json({ 
    success: true, 
    configured: Boolean(serverCustomApiKey) 
  });
});

app.post("/api/unspsc/search", async (req, res) => {
  const { query, apiKey } = req.body;
  const headerKey = req.headers['x-gemini-api-key'] as string | undefined;
  
  try {
    const ai = getGeminiClient(apiKey || headerKey);

    if (ai) {
      const systemPrompt = `Eres una base de datos inteligente e hiper-precisa del catálogo completo de códigos UNSPSC (United Nations Standard Products and Services Code).
Tu tarea es buscar en el catálogo completo de la clasificación estándar de UNSPSC y devolver coincidencias exactas o de alta relevancia en español para la consulta del usuario.

REGLA CLAVE PARA BÚSQUEDAS NUMÉRICAS:
- Si el usuario busca por un código de 8 dígitos exactos (ej: "30103501") o un código parcial de 4 o 6 dígitos (ej: "301035", "3010"), DEBES decodificar y devolver ese código con su descripción estándar oficial o una descripción lógica extremadamente precisa en español dentro de esa familia.
- NUNCA devuelvas una lista vacía para búsquedas numéricas de 4-8 dígitos que pertenezcan a segmentos válidos.
- Estructura de segmentos y familias clave:
  * Segmento 30: Materiales Estructurales, Componentes y Construcción. La familia "3010" son "Materiales estructurales" (por ejemplo: "30103501" es perfil de acero estructural, vigas de acero estructural, vigas H, canales o perfiles de acero).
  * Segmento 31: Componentes y suministros de manufactura. La familia "3116" es "Ferretería y elementos de fijación" (por ejemplo: tornillos, tuercas, pernos).
  * Segmento 39: Equipos y suministros eléctricos (familia 3912 es disyuntores, cables, conectores).
  * Segmento 43: Tecnología de la información, computadores y software (familia 4321 es computadoras/servidores, familia 4323 es software corporativo).
  * Segmentos 70-95: Servicios profesionales, mantenimiento, logística, limpieza, etc. (familia 7210 mantenimiento, familia 7611 limpieza, familia 7810 transporte, familia 8010 consultoría).

BÚSQUEDAS POR TEXTO:
- Si el usuario busca por palabras clave en español (ej: "tornillo", "viga", "perfil acero", "software", "limpieza"), devuelve los códigos de 8 dígitos más relevantes del estándar oficial UNSPSC (hasta 15 coincidencias).

Debes responder estrictamente con un objeto JSON que coincida exactamente con la siguiente estructura:
{
  "codes": [
    {
      "code": "8-digit string",
      "name": "Nombre o descripción descriptiva oficial en español (ej: 'Vigas de acero estructural' o 'Tornillos y pernos')",
      "segment": "Segmento o categoría general (ej: 'Materiales Estructurales y Construcción', 'Ferretería y Manufactura', 'Servicios Profesionales')"
    }
  ]
}

No incluyas texto de introducción ni bloques de Markdown, solo el JSON puro.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: `Buscar códigos UNSPSC para la consulta: "${query || ''}"`,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          temperature: 0.1,
        }
      });

      const text = response.text || "{}";
      let data: any = { codes: [] };
      try {
        data = JSON.parse(text.trim());
      } catch (e) {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          data = JSON.parse(match[0]);
        }
      }

      if (data && data.codes && data.codes.length > 0) {
        return res.json(data);
      }
    }

    // Use local fallback
    const fallbackData = getLocalFallbackSearch(query);
    return res.json(fallbackData);
  } catch (error) {
    console.warn("Gemini UNSPSC Search failed, using robust local search database fallback:", error);
    const fallbackData = getLocalFallbackSearch(query);
    return res.json(fallbackData);
  }
});

app.post("/api/ai-insights", async (req, res) => {
  try {
    const { entityType, name, details, history, apiKey: bodyApiKey } = req.body;
    const headerKey = req.headers['x-gemini-api-key'] as string | undefined;
    const customKey = bodyApiKey || headerKey;
    
    if (!name) {
      return res.status(400).json({ error: "Nombre es obligatorio para el análisis" });
    }

    const ai = getGeminiClient(customKey);
    
    if (ai) {
      try {
        const systemPrompt = `Eres un asistente de Inteligencia Artificial experto en SRM (Supplier Relationship Management) y gestión de compras profesionales.
Analiza la información proporcionada sobre el proveedor/contacto y genera un informe ejecutivo conciso pero de alto valor.

El informe debe incluir:
1. **Resumen de Perfil**: Una breve descripción del estado y relevancia del proveedor/contacto.
2. **Análisis de Relación**: Análisis del historial de interacciones pasadas, identificando cuellos de botella, éxitos o periodos de inactividad.
3. **Recomendaciones de Acción**: 2-3 sugerencias concretas sobre qué acciones tomar a continuación (p. ej., proponer reunión, renovar contrato, negociar tarifas, felicitar cumpleaños, etc.).
4. **Plantilla de Correo/Contacto**: Un borrador de correo personalizado y profesional listo para enviar a este proveedor/contacto según su estado actual.

Mantén un tono profesional, claro y elegante en español. Usa formato Markdown con negritas y listas.`;

        const userPrompt = `
Tipo de Entidad: ${entityType === 'empresa' ? 'Empresa / Proveedor' : 'Contacto Individual'}
Nombre: ${name}
Detalles técnicos: ${JSON.stringify(details || {})}
Historial de Interacciones: ${JSON.stringify(history || [])}

Por favor, genera el análisis y recomendaciones detalladas.
`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: userPrompt,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.7,
          }
        });

        if (response.text) {
          return res.json({ 
            insights: response.text,
            source: "gemini",
            model: "gemini-2.5-flash"
          });
        }
      } catch (geminiError: any) {
        console.warn("Gemini API call failed, falling back to SRM analytical engine:", geminiError?.message || geminiError);
      }
    }

    // Guaranteed heuristic AI fallback - ALWAYS succeeds with rich insights
    const fallbackInsights = generateLocalSRMInsights(entityType, name, details, history);
    return res.json({ 
      insights: fallbackInsights,
      source: "local_engine",
      isFallback: true,
      notice: !ai
        ? "Informe generado con el motor analítico SRM integrado. Para análisis con Gemini 2.5 Flash en tiempo real, puedes configurar tu clave API de Google AI Studio."
        : "Gemini temporalmente no disponible; informe generado con el motor analítico SRM integrado."
    });
  } catch (error) {
    console.error("AI Insights Error:", error);
    // Even on unexpected internal error, return a fallback instead of failing with 500
    const emergencyInsights = generateLocalSRMInsights(req.body?.entityType || 'empresa', req.body?.name || 'Entidad', req.body?.details, req.body?.history);
    return res.json({ 
      insights: emergencyInsights,
      source: "local_engine",
      isFallback: true 
    });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
