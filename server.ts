/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy initializer for Gemini API
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not defined");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
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

app.post("/api/unspsc/search", async (req, res) => {
  const { query } = req.body;
  
  try {
    const ai = getGeminiClient();

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
      model: "gemini-3.5-flash",
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
      } else {
        throw e;
      }
    }

    // Programmatic backup generator if Gemini returned empty
    if (!data || !data.codes || data.codes.length === 0) {
      data = getLocalFallbackSearch(query);
    }

    res.json(data);
  } catch (error) {
    console.warn("Gemini UNSPSC Search failed, using robust local search database fallback:", error);
    const fallbackData = getLocalFallbackSearch(query);
    res.json(fallbackData);
  }
});

app.post("/api/ai-insights", async (req, res) => {
  try {
    const { entityType, name, details, history } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: "Nombre es obligatorio para el análisis" });
    }

    const ai = getGeminiClient();
    
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
Detalles técnicos: ${JSON.stringify(details)}
Historial de Interacciones: ${JSON.stringify(history)}

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

    res.json({ insights: response.text });
  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ 
      error: "Error al generar insights de IA", 
      details: error instanceof Error ? error.message : String(error) 
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
