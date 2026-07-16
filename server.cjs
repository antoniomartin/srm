var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "10mb" }));
var aiClient = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not defined");
    }
    aiClient = new import_genai.GoogleGenAI({ apiKey });
  }
  return aiClient;
}
var FALLBACK_UNSPSC = [
  // 30: Materiales Estructurales y Construcción
  { code: "30103501", name: "Perfil de acero estructural (Vigas, Canales y \xC1ngulos de Acero)", segment: "Materiales Estructurales y Construcci\xF3n" },
  { code: "30103500", name: "Materiales de acero estructural", segment: "Materiales Estructurales y Construcci\xF3n" },
  { code: "30102000", name: "Vigas de madera y madera estructural", segment: "Materiales Estructurales y Construcci\xF3n" },
  { code: "30200000", name: "Estructuras y componentes prefabricados", segment: "Materiales Estructurales y Construcci\xF3n" },
  // 31: Ferretería y Suministros de Manufactura
  { code: "31161500", name: "Tornillos, pernos y tuercas (Sujeciones y Torniller\xEDa)", segment: "Ferreter\xEDa y Manufactura" },
  { code: "31161600", name: "Arandelas y pasadores de montaje", segment: "Ferreter\xEDa y Manufactura" },
  { code: "31201500", name: "Adhesivos y selladores industriales", segment: "Ferreter\xEDa y Manufactura" },
  // 39: Equipos y suministros eléctricos
  { code: "39121000", name: "Disyuntores, fusibles y componentes de distribuci\xF3n", segment: "Equipos y Suministros El\xE9ctricos" },
  { code: "39121400", name: "Conectores, terminales y acoples de cables", segment: "Equipos y Suministros El\xE9ctricos" },
  { code: "39121600", name: "Canalizaciones, tubos conduit y accesorios el\xE9ctricos", segment: "Equipos y Suministros El\xE9ctricos" },
  { code: "39121700", name: "Accesorios para cables y arneses de cables", segment: "Equipos y Suministros El\xE9ctricos" },
  { code: "39111500", name: "Luminarias e iluminaci\xF3n industrial y de oficinas", segment: "Equipos y Suministros El\xE9ctricos" },
  // 43: Tecnología de la Información, computadores y software
  { code: "43201400", name: "Dispositivos de almacenamiento de datos y discos r\xEDgidos", segment: "Tecnolog\xEDa de la Informaci\xF3n" },
  { code: "43211500", name: "Computadoras port\xE1tiles, de escritorio y servidores", segment: "Tecnolog\xEDa de la Informaci\xF3n" },
  { code: "43221500", name: "Equipos de redes y telecomunicaciones (Routers, Switches)", segment: "Tecnolog\xEDa de la Informaci\xF3n" },
  { code: "43231500", name: "Software de gesti\xF3n corporativa (ERP, CRM, Base de Datos)", segment: "Tecnolog\xEDa de la Informaci\xF3n" },
  { code: "43232100", name: "Software de desarrollo de sistemas y herramientas de TI", segment: "Tecnolog\xEDa de la Informaci\xF3n" },
  // 24: Embalajes y recipientes
  { code: "24121500", name: "Cajas de cart\xF3n y embalajes de papel", segment: "Log\xEDstica y Embalaje" },
  { code: "24112100", name: "Pal\xE9s y contenedores pl\xE1sticos/met\xE1licos", segment: "Log\xEDstica y Embalaje" },
  // 78: Servicios de transporte de carga
  { code: "78101800", name: "Servicios de transporte de carga por carretera", segment: "Log\xEDstica y Embalaje" },
  { code: "78121605", name: "Servicios de almacenamiento de mercanc\xEDas y bodegaje", segment: "Log\xEDstica y Embalaje" },
  // 72 & 76: Mantenimiento, Facilidades y Limpieza
  { code: "72101503", name: "Servicios de HVAC (Calefacci\xF3n, ventilaci\xF3n y aire acondicionado)", segment: "Servicios de Mantenimiento y Facilidades" },
  { code: "72101511", name: "Servicios de fontaner\xEDa, gas e instalaciones de agua", segment: "Servicios de Mantenimiento y Facilidades" },
  { code: "72151500", name: "Servicios de instalaci\xF3n el\xE9ctrica en edificios", segment: "Servicios de Mantenimiento y Facilidades" },
  { code: "76111500", name: "Servicios de limpieza general de oficinas e industrias", segment: "Servicios de Mantenimiento y Limpieza" },
  // 80 & 84 & 86: Servicios Profesionales
  { code: "80101500", name: "Servicios de consultor\xEDa de gesti\xF3n empresarial y estrat\xE9gica", segment: "Servicios Profesionales" },
  { code: "84111500", name: "Servicios de auditor\xEDa financiera, contabilidad y fiscal", segment: "Servicios Profesionales" },
  { code: "80121500", name: "Servicios de asesor\xEDa legal y representaci\xF3n jur\xEDdica", segment: "Servicios Profesionales" },
  { code: "86131500", name: "Servicios de formaci\xF3n y capacitaci\xF3n t\xE9cnica", segment: "Servicios Profesionales" },
  // 46: Seguridad y Calidad
  { code: "46181500", name: "Equipos de protecci\xF3n individual (EPIs, calzado, cascos, guantes)", segment: "Seguridad y Calidad" },
  { code: "80161500", name: "Servicios de consultor\xEDa de control de calidad y auditor\xEDas", segment: "Seguridad y Calidad" }
];
function getLocalFallbackSearch(query) {
  const cleanQuery = (query || "").trim().toLowerCase();
  if (!cleanQuery) return { codes: FALLBACK_UNSPSC.slice(0, 10) };
  const cleanNum = cleanQuery.replace(/\D/g, "");
  if (cleanNum.length >= 4) {
    const code8 = cleanNum.padEnd(8, "0");
    const matched = FALLBACK_UNSPSC.find((item) => item.code === code8 || item.code.startsWith(cleanNum));
    if (matched) {
      return { codes: [matched] };
    }
    let name = "C\xF3digo est\xE1ndar UNSPSC";
    let segment = "Otros Suministros";
    const prefix2 = code8.substring(0, 2);
    const prefix4 = code8.substring(0, 4);
    if (prefix2 === "30") {
      segment = "Materiales Estructurales y Construcci\xF3n";
      if (prefix4 === "3010") name = "Perfiles y vigas de acero estructural (Materiales estructurales)";
      else name = "Materiales estructurales de construcci\xF3n";
    } else if (prefix2 === "31") {
      segment = "Ferreter\xEDa y Manufactura";
      if (prefix4 === "3116") name = "Tornillos, pernos, tuercas y elementos de fijaci\xF3n";
      else name = "Componentes y suministros de manufactura";
    } else if (prefix2 === "39") {
      segment = "Equipos y Suministros El\xE9ctricos";
      if (prefix4 === "3912") name = "Equipos de distribuci\xF3n el\xE9ctrica, cables y disyuntores";
      else name = "Suministros el\xE9ctricos";
    } else if (prefix2 === "43") {
      segment = "Tecnolog\xEDa de la Informaci\xF3n";
      if (prefix4 === "4321") name = "Computadoras port\xE1tiles, servidores y perif\xE9ricos";
      else if (prefix4 === "4323") name = "Software corporativo y aplicaciones de gesti\xF3n";
      else name = "Equipos de TI y telecomunicaciones";
    } else if (prefix2 === "72") {
      segment = "Servicios de Mantenimiento y Facilidades";
      name = "Servicios de mantenimiento y reparaci\xF3n de instalaciones";
    } else if (prefix2 === "76") {
      segment = "Servicios de Mantenimiento y Limpieza";
      name = "Servicios de limpieza industrial y de oficinas";
    } else if (prefix2 === "78") {
      segment = "Servicios de Transporte y Log\xEDstica";
      name = "Servicios de transporte de carga y almacenamiento";
    } else if (prefix2 === "80") {
      segment = "Servicios Profesionales";
      name = "Servicios de consultor\xEDa de negocios y gesti\xF3n estrat\xE9gica";
    } else {
      name = `Clasificaci\xF3n UNSPSC (Familia ${prefix4})`;
    }
    return {
      codes: [
        {
          code: code8,
          name,
          segment
        }
      ]
    };
  }
  const keywords = cleanQuery.split(/\s+/).filter(Boolean);
  const results = FALLBACK_UNSPSC.filter((item) => {
    const textToSearch = `${item.code} ${item.name.toLowerCase()} ${item.segment.toLowerCase()}`;
    return keywords.every((kw) => textToSearch.includes(kw));
  });
  return { codes: results.slice(0, 15) };
}
app.post("/api/unspsc/search", async (req, res) => {
  const { query } = req.body;
  try {
    const ai = getGeminiClient();
    const systemPrompt = `Eres una base de datos inteligente e hiper-precisa del cat\xE1logo completo de c\xF3digos UNSPSC (United Nations Standard Products and Services Code).
Tu tarea es buscar en el cat\xE1logo completo de la clasificaci\xF3n est\xE1ndar de UNSPSC y devolver coincidencias exactas o de alta relevancia en espa\xF1ol para la consulta del usuario.

REGLA CLAVE PARA B\xDASQUEDAS NUM\xC9RICAS:
- Si el usuario busca por un c\xF3digo de 8 d\xEDgitos exactos (ej: "30103501") o un c\xF3digo parcial de 4 o 6 d\xEDgitos (ej: "301035", "3010"), DEBES decodificar y devolver ese c\xF3digo con su descripci\xF3n est\xE1ndar oficial o una descripci\xF3n l\xF3gica extremadamente precisa en espa\xF1ol dentro de esa familia.
- NUNCA devuelvas una lista vac\xEDa para b\xFAsquedas num\xE9ricas de 4-8 d\xEDgitos que pertenezcan a segmentos v\xE1lidos.
- Estructura de segmentos y familias clave:
  * Segmento 30: Materiales Estructurales, Componentes y Construcci\xF3n. La familia "3010" son "Materiales estructurales" (por ejemplo: "30103501" es perfil de acero estructural, vigas de acero estructural, vigas H, canales o perfiles de acero).
  * Segmento 31: Componentes y suministros de manufactura. La familia "3116" es "Ferreter\xEDa y elementos de fijaci\xF3n" (por ejemplo: tornillos, tuercas, pernos).
  * Segmento 39: Equipos y suministros el\xE9ctricos (familia 3912 es disyuntores, cables, conectores).
  * Segmento 43: Tecnolog\xEDa de la informaci\xF3n, computadores y software (familia 4321 es computadoras/servidores, familia 4323 es software corporativo).
  * Segmentos 70-95: Servicios profesionales, mantenimiento, log\xEDstica, limpieza, etc. (familia 7210 mantenimiento, familia 7611 limpieza, familia 7810 transporte, familia 8010 consultor\xEDa).

B\xDASQUEDAS POR TEXTO:
- Si el usuario busca por palabras clave en espa\xF1ol (ej: "tornillo", "viga", "perfil acero", "software", "limpieza"), devuelve los c\xF3digos de 8 d\xEDgitos m\xE1s relevantes del est\xE1ndar oficial UNSPSC (hasta 15 coincidencias).

Debes responder estrictamente con un objeto JSON que coincida exactamente con la siguiente estructura:
{
  "codes": [
    {
      "code": "8-digit string",
      "name": "Nombre o descripci\xF3n descriptiva oficial en espa\xF1ol (ej: 'Vigas de acero estructural' o 'Tornillos y pernos')",
      "segment": "Segmento o categor\xEDa general (ej: 'Materiales Estructurales y Construcci\xF3n', 'Ferreter\xEDa y Manufactura', 'Servicios Profesionales')"
    }
  ]
}

No incluyas texto de introducci\xF3n ni bloques de Markdown, solo el JSON puro.`;
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Buscar c\xF3digos UNSPSC para la consulta: "${query || ""}"`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0.1
      }
    });
    const text = response.text || "{}";
    let data = { codes: [] };
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
      return res.status(400).json({ error: "Nombre es obligatorio para el an\xE1lisis" });
    }
    const ai = getGeminiClient();
    const systemPrompt = `Eres un asistente de Inteligencia Artificial experto en SRM (Supplier Relationship Management) y gesti\xF3n de compras profesionales.
Analiza la informaci\xF3n proporcionada sobre el proveedor/contacto y genera un informe ejecutivo conciso pero de alto valor.

El informe debe incluir:
1. **Resumen de Perfil**: Una breve descripci\xF3n del estado y relevancia del proveedor/contacto.
2. **An\xE1lisis de Relaci\xF3n**: An\xE1lisis del historial de interacciones pasadas, identificando cuellos de botella, \xE9xitos o periodos de inactividad.
3. **Recomendaciones de Acci\xF3n**: 2-3 sugerencias concretas sobre qu\xE9 acciones tomar a continuaci\xF3n (p. ej., proponer reuni\xF3n, renovar contrato, negociar tarifas, felicitar cumplea\xF1os, etc.).
4. **Plantilla de Correo/Contacto**: Un borrador de correo personalizado y profesional listo para enviar a este proveedor/contacto seg\xFAn su estado actual.

Mant\xE9n un tono profesional, claro y elegante en espa\xF1ol. Usa formato Markdown con negritas y listas.`;
    const userPrompt = `
Tipo de Entidad: ${entityType === "empresa" ? "Empresa / Proveedor" : "Contacto Individual"}
Nombre: ${name}
Detalles t\xE9cnicos: ${JSON.stringify(details)}
Historial de Interacciones: ${JSON.stringify(history)}

Por favor, genera el an\xE1lisis y recomendaciones detalladas.
`;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7
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
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
//# sourceMappingURL=server.cjs.map
