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
