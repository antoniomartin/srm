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
