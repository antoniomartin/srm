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
app.post("/api/unspsc/search", async (req, res) => {
  try {
    const { query } = req.body;
    const ai = getGeminiClient();

    const systemPrompt = `Eres una base de datos inteligente de códigos UNSPSC (United Nations Standard Products and Services Code).
Tu tarea es buscar en el catálogo completo de la clasificación estándar de UNSPSC y devolver coincidencias exactas o de alta relevancia para la consulta del usuario.

El usuario buscará por palabras clave, descripción o por un código parcial (p. ej. "tornillo", "3116", "consultoría", "servicio de limpieza").
Debes devolver hasta 15 de los códigos de 8 dígitos más relevantes del estándar oficial UNSPSC (idealmente de nivel "Clase" o "Commodity").

Debes responder estrictamente con un objeto JSON que coincida exactamente con la siguiente estructura:
{
  "codes": [
    {
      "code": "8-digit string",
      "name": "Nombre o descripción descriptiva en español",
      "segment": "Segmento o categoría general (ej: Manufactura, Servicios, TI, Construcción)"
    }
  ]
}

Asegúrate de que los códigos sean reales de la clasificación estándar de UNSPSC. Si no encuentras nada relevante, devuelve una lista vacía. No incluyas texto de introducción ni bloques de Markdown, solo el JSON puro.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Buscar códigos UNSPSC para la consulta: "${query || ''}"`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0.2,
      }
    });

    const text = response.text || "{}";
    let data;
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

    res.json(data);
  } catch (error) {
    console.error("UNSPSC Search Error:", error);
    res.status(500).json({
      error: "Error al buscar códigos UNSPSC",
      details: error instanceof Error ? error.message : String(error)
    });
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
