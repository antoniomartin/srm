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
var import_fs = __toESM(require("fs"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "10mb" }));
var serverCustomApiKey = "";
var initialEnvKey = (process.env.GEMINI_API_KEY || "").trim();
if (initialEnvKey && initialEnvKey !== "MY_GEMINI_API_KEY") {
  serverCustomApiKey = initialEnvKey;
}
function getGeminiClient(explicitKey) {
  const apiKey = (explicitKey || serverCustomApiKey || process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "undefined" || apiKey === "null") {
    return null;
  }
  try {
    return new import_genai.GoogleGenAI({ apiKey });
  } catch (err) {
    console.warn("Error creating GoogleGenAI instance:", err);
    return null;
  }
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
function generateLocalSRMInsights(entityType, name, details = {}, history = []) {
  const isEmpresa = entityType === "empresa";
  const now = /* @__PURE__ */ new Date();
  const sortedHistory = [...history || []].sort((a, b) => {
    const dateA = new Date(a.date || a.fecha || 0).getTime();
    const dateB = new Date(b.date || b.fecha || 0).getTime();
    return dateB - dateA;
  });
  const totalInteractions = sortedHistory.length;
  let lastContactDate = null;
  let daysSinceLastContact = null;
  if (totalInteractions > 0 && sortedHistory[0].date) {
    const parsed = new Date(sortedHistory[0].date);
    if (!isNaN(parsed.getTime())) {
      lastContactDate = parsed;
      daysSinceLastContact = Math.max(0, Math.floor((now.getTime() - lastContactDate.getTime()) / (1e3 * 60 * 60 * 24)));
    }
  }
  const interactionTypes = {};
  sortedHistory.forEach((item) => {
    const t = (item.type || item.tipo || "comunicaci\xF3n").toLowerCase();
    interactionTypes[t] = (interactionTypes[t] || 0) + 1;
  });
  let healthScore = 70;
  const rating = Number(details.calificacion || details.rating || 3);
  healthScore += (rating - 3) * 10;
  const estado = String(details.estado || "activo").toLowerCase();
  if (estado === "activo" || estado === "homologado") healthScore += 10;
  else if (estado === "en_revision" || estado === "pendiente" || estado === "prospecto") healthScore += 0;
  else if (estado === "inactivo" || estado === "bloqueado") healthScore -= 25;
  if (daysSinceLastContact !== null) {
    if (daysSinceLastContact <= 30) healthScore += 10;
    else if (daysSinceLastContact > 90) healthScore -= 15;
  } else {
    healthScore -= 10;
  }
  healthScore = Math.max(10, Math.min(100, healthScore));
  let stars = "\u2B50\u2B50\u2B50\u2606\u2606";
  if (rating >= 5) stars = "\u2B50\u2B50\u2B50\u2B50\u2B50";
  else if (rating >= 4) stars = "\u2B50\u2B50\u2B50\u2B50\u2606";
  else if (rating >= 3) stars = "\u2B50\u2B50\u2B50\u2606\u2606";
  else if (rating >= 2) stars = "\u2B50\u2B50\u2606\u2606\u2606";
  else stars = "\u2B50\u2606\u2606\u2606\u2606";
  if (isEmpresa) {
    const sector = details.sector || details.categoria || details.tipo || "Sector Comercial / Industrial";
    const ciudad = details.ciudad || details.provincia || "Espa\xF1a";
    const cif = details.cif || details.nit || "No especificado";
    const unspscCodes = details.codigosUNSPSC || details.unspsc || [];
    const certs = details.certificaciones || [];
    const paymentTerms = details.condicionesPago || "30/60 d\xEDas fecha factura";
    return `### \u{1F3E2} 1. Resumen de Perfil Ejecutivo
- **Proveedor**: **${name}** (${sector} \u2014 ${ciudad})
- **Identificador Fiscal**: \`${cif}\`
- **\xCDndice de Salud SRM**: **${healthScore}/100** (${healthScore >= 75 ? "\u{1F7E2} \xD3ptimo / Alta Confianza" : healthScore >= 50 ? "\u{1F7E1} Estable / Supervisi\xF3n Habitual" : "\u{1F534} En Riesgo / Requiere Atenci\xF3n Inmediata"})
- **Calificaci\xF3n del Proveedor**: ${stars} (${rating}/5)
- **Estado Operativo**: \`${estado.toUpperCase()}\`
- **Condiciones Comerciales**: ${paymentTerms}
${certs.length > 0 ? `- **Certificaciones Registradas**: ${certs.join(", ")}` : ""}
${unspscCodes.length > 0 ? `- **Familias UNSPSC Vinculadas**: ${unspscCodes.slice(0, 3).join(", ")}` : ""}

### \u{1F91D} 2. An\xE1lisis de Relaci\xF3n y Engagement
- **Interacciones Registradas**: **${totalInteractions}** eventos en el sistema.
${lastContactDate ? `- **\xDAltimo Contacto**: Hace **${daysSinceLastContact} d\xEDas** (${lastContactDate.toLocaleDateString("es-ES")}).` : `- **\xDAltimo Contacto**: *Sin interacciones previas registradas.*`}
- **Desglose de Comunicaciones**: ${Object.entries(interactionTypes).map(([k, v]) => `**${k}**: ${v}`).join(" | ") || "Ninguna registrada"}
- **Diagn\xF3stico de Cadencia**: ${daysSinceLastContact === null ? "\u26A0\uFE0F *Sin historial*: Conviene agendar una primera reuni\xF3n de presentaci\xF3n o formalizaci\xF3n de cat\xE1logo." : daysSinceLastContact > 60 ? "\u26A0\uFE0F *Desconexi\xF3n detectada*: Han transcurrido m\xE1s de 60 d\xEDas sin actividad directa. Se aconseja reactivar contacto para validar disponibilidad y tarifas." : "\u2705 *Cadencia activa*: La relaci\xF3n mantiene un flujo constante y adecuado para la prevenci\xF3n de incidencias y control de plazos."}

### \u{1F3AF} 3. Recomendaciones Estrat\xE9gicas de Acci\xF3n
1. **${daysSinceLastContact === null || daysSinceLastContact > 45 ? "Planificar Reuni\xF3n de Coordinaci\xF3n" : "Revisi\xF3n Peri\xF3dica de Acuerdos"}**: Agendar una sesi\xF3n breve con el interlocutor comercial para validar condiciones vigentes, plazos de entrega y requerimientos del pr\xF3ximo trimestre.
2. **${rating < 3.5 ? "Plan de Homologaci\xF3n y Calidad" : "Consolidaci\xF3n de Proveedor Estrat\xE9gico"}**: ${rating < 3.5 ? "Identificar motivos de valoraci\xF3n media/baja y solicitar un plan de acciones correctivas." : "Explorar acuerdos marco a largo plazo o rappel por volumen acumulado para optimizar el gasto de compras."}
3. **Gesti\xF3n Documental y Cumplimiento**: Comprobar la vigencia de fichas t\xE9cnicas, certificados de calidad y coberturas legales antes de la emisi\xF3n de nuevos pedidos.

### \u2709\uFE0F 4. Plantilla de Comunicaci\xF3n Personalizada
**Asunto**: *Seguimiento operativo y actualizaci\xF3n de acuerdos comerciales \u2014 SRM*

*Estimado equipo de ${name},*

Esperamos que se encuentren muy bien. Nos ponemos en contacto desde el Departamento de Compras con motivo del seguimiento y gesti\xF3n peri\xF3dica de nuestros proveedores clave.

Nos gustar\xEDa coordinar una breve reuni\xF3n o llamada de seguimiento en los pr\xF3ximos d\xEDas con el objetivo de:
- Revisar el estado de nuestras \xF3rdenes de compra y niveles de servicio recientes.
- Actualizar el cat\xE1logo de referencias y condiciones comerciales para el periodo entrante.
- Garantizar que toda la documentaci\xF3n t\xE9cnica y de homologaci\xF3n se encuentre debidamente al d\xEDa.

\xBFQu\xE9 d\xEDa y franja horaria les resultar\xEDa m\xE1s conveniente la pr\xF3xima semana para una breve llamada?

Agradecemos de antemano su colaboraci\xF3n y compromiso.

*Atentamente,*  
**Equipo de Gesti\xF3n de Proveedores (SRM)**`;
  } else {
    const cargo = details.cargo || details.puesto || "Contacto Comercial";
    const email = details.email || "correo@proveedor.com";
    const tel = details.telefono || details.movil || "No registrado";
    const dep = details.departamento || "Comercial / Ventas";
    return `### \u{1F464} 1. Perfil Inteligente del Contacto
- **Nombre**: **${name}**
- **Cargo / Rol**: **${cargo}** (${dep})
- **Datos de Contacto**: Email: \`${email}\` | Tel\xE9fono: \`${tel}\`
- **\xCDndice de Actividad**: **${healthScore}/100**
${details.esPrincipal ? "- **Rol Estrat\xE9gico**: \u2B50 **Interlocutor Principal / Decisor Clave**" : ""}

### \u{1F4AC} 2. An\xE1lisis del Historial de Interacciones
- **Interacciones Registradas**: **${totalInteractions}** eventos con este contacto.
${lastContactDate ? `- **\xDAltimo Intercambio**: Hace **${daysSinceLastContact} d\xEDas** (${lastContactDate.toLocaleDateString("es-ES")}).` : `- **\xDAltimo Intercambio**: *A\xFAn no se han registrado eventos directos con este contacto.*`}
- **Canales m\xE1s frecuentes**: ${Object.entries(interactionTypes).map(([k, v]) => `**${k}**: ${v}`).join(", ") || "Pendiente de inicio"}

### \u{1F680} 3. Recomendaciones de Seguimiento
1. **${daysSinceLastContact === null || daysSinceLastContact > 30 ? "Reanudar Comunicaci\xF3n Directa" : "Mantener Seguimiento Fluido"}**: Enviar un mensaje breve de cortes\xEDa para dar seguimiento a las \xFAltimas gestiones y confirmar disponibilidad.
2. **Consolidaci\xF3n de Rol**: Registrar a este contacto como referente para pedidos urgentes, escalado de incidencias o consultas t\xE9cnicas espec\xEDficas.

### \u2709\uFE0F 4. Plantilla de Correo Personalizada
**Asunto**: *Seguimiento comercial / Coordinaci\xF3n de necesidades \u2014 SRM*

*Hola ${name.split(" ")[0] || name},*

Espero que est\xE9s teniendo una excelente semana.

Te escribo para dar seguimiento a nuestras conversaciones recientes y coordinar conjuntamente las necesidades y solicitudes de suministro que tenemos previstas para las pr\xF3ximas semanas.

\xBFTendr\xEDas disponibilidad para una breve llamada de 10 minutos entre ma\xF1ana o pasado para alinearnos?

Quedo a la espera de tus comentarios. \xA1Muchas gracias!

*Un cordial saludo,*  
**Gesti\xF3n de Compras y Proveedores**`;
  }
}
app.get("/api/ai/status", (req, res) => {
  const envKey = (process.env.GEMINI_API_KEY || "").trim();
  const hasEnvKey = Boolean(envKey && envKey !== "MY_GEMINI_API_KEY");
  const hasCustomKey = Boolean(serverCustomApiKey);
  res.json({
    configured: hasEnvKey || hasCustomKey,
    source: hasCustomKey ? "custom" : hasEnvKey ? "env" : "local_engine",
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
        const envPath = import_path.default.join(process.cwd(), ".env");
        let envContent = "";
        if (import_fs.default.existsSync(envPath)) {
          envContent = import_fs.default.readFileSync(envPath, "utf-8");
        }
        if (envContent.includes("GEMINI_API_KEY=")) {
          envContent = envContent.replace(/GEMINI_API_KEY=.*/, `GEMINI_API_KEY="${serverCustomApiKey}"`);
        } else {
          envContent += `
GEMINI_API_KEY="${serverCustomApiKey}"
`;
        }
        import_fs.default.writeFileSync(envPath, envContent, "utf-8");
      } catch (e) {
        console.warn("Could not persist GEMINI_API_KEY to .env:", e);
      }
    } else {
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
  const headerKey = req.headers["x-gemini-api-key"];
  try {
    const ai = getGeminiClient(apiKey || headerKey);
    if (ai) {
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
        model: "gemini-2.5-flash-lite",
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
        }
      }
      if (data && data.codes && data.codes.length > 0) {
        return res.json(data);
      }
    }
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
    const headerKey = req.headers["x-gemini-api-key"];
    const customKey = bodyApiKey || headerKey;
    if (!name) {
      return res.status(400).json({ error: "Nombre es obligatorio para el an\xE1lisis" });
    }
    const ai = getGeminiClient(customKey);
    if (ai) {
      try {
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
Detalles t\xE9cnicos: ${JSON.stringify(details || {})}
Historial de Interacciones: ${JSON.stringify(history || [])}

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
        if (response.text) {
          return res.json({
            insights: response.text,
            source: "gemini",
            model: "gemini-2.5-flash"
          });
        }
      } catch (geminiError) {
        console.warn("Gemini API call failed, falling back to SRM analytical engine:", geminiError?.message || geminiError);
      }
    }
    const fallbackInsights = generateLocalSRMInsights(entityType, name, details, history);
    return res.json({
      insights: fallbackInsights,
      source: "local_engine",
      isFallback: true,
      notice: !ai ? "Informe generado con el motor anal\xEDtico SRM integrado. Para an\xE1lisis con Gemini 2.5 Flash en tiempo real, puedes configurar tu clave API de Google AI Studio." : "Gemini temporalmente no disponible; informe generado con el motor anal\xEDtico SRM integrado."
    });
  } catch (error) {
    console.error("AI Insights Error:", error);
    const emergencyInsights = generateLocalSRMInsights(req.body?.entityType || "empresa", req.body?.name || "Entidad", req.body?.details, req.body?.history);
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
