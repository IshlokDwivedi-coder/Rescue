import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { seededTasks, agentTools, executeTool } from "./src/server/tools.js";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Init Gemini SDK
  let ai: GoogleGenAI | null = null;
  try {
    if (process.env.GEMINI_API_KEY) {
      ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
  } catch (e) {
    console.error("Failed to initialize Gemini:", e);
  }

  // 1. Get Tasks endpoint
  app.get("/api/tasks", (req, res) => {
    res.json({ tasks: seededTasks });
  });

  // 2. Rescue endpoint (Server-Sent Events)
  app.post("/api/rescue", async (req, res) => {
    if (!ai) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured." });
    }

    const { targetTaskId } = req.body;
    const targetTask = seededTasks.find(t => t.id === targetTaskId);

    if (!targetTask) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendEvent = (step: any) => {
      res.write(`data: ${JSON.stringify(step)}\n\n`);
    };

    try {
      sendEvent({ type: 'status', message: `Analyzing risk for: ${targetTask.name}...` });

      const systemPrompt = `You are the Rescue Agent. 
The user is at risk of missing a task: "${targetTask.name}" 
(Effort: ${targetTask.estimated_effort_hours}h, Time left: ${targetTask.hours_left_until_deadline}h).
Your goal is to autonomously save this task.
Reason about the risk first, then act in a sensible order:
1. breakdown_task: Break it into actionable steps.
2. create_calendar_event: Schedule focus blocks to get it done.
3. draft_email: ONLY if the deadline seems unfixable or an extension is needed, draft an email.
Summarize your findings.`;

      let chat = ai.chats.create({
        model: "gemini-2.0-flash",
        config: {
          systemInstruction: systemPrompt,
          tools: [{ functionDeclarations: agentTools }]
        }
      });

      let iteration = 0;
      const MAX_ITERATIONS = 6;
      let response = await chat.sendMessage({ message: "Start rescue protocol." });

      while (iteration < MAX_ITERATIONS) {
        iteration++;
        
        let functionCalls = response.functionCalls;
        
        if (functionCalls && functionCalls.length > 0) {
          const call = functionCalls[0]; // Take the first function call
          
          sendEvent({ type: 'tool_call', name: call.name, args: call.args });
          
          const result = await executeTool(call.name, call.args as any);
          
          sendEvent({ type: 'tool_result', name: call.name, result });

          response = await chat.sendMessage({
            message: [{
              functionResponse: {
                name: call.name,
                response: result
              }
            }]
          });
        } else if (response.text) {
          sendEvent({ type: 'summary', message: response.text });
          break; // Agent finished
        } else {
          break; // Nothing to do
        }
      }

      sendEvent({ type: 'complete', message: "Rescue complete" });
      res.end();
    } catch (error: any) {
      console.warn("Gemini API Error (Quota/Network). Activating robust offline fallback loop.", error.message);
      sendEvent({ type: 'error', message: "API Limit Reached or Network Issue. Activating Simulated Fallback Agent..." });
      
      // Fallback robust loop
      const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

      await sleep(1000);
      const breakdownArgs = { task_name: targetTask.name, deadline: "Soon" };
      sendEvent({ type: 'tool_call', name: 'breakdown_task', args: breakdownArgs });
      const breakdownResult = await executeTool('breakdown_task', breakdownArgs);
      await sleep(1000);
      sendEvent({ type: 'tool_result', name: 'breakdown_task', result: breakdownResult });

      await sleep(1000);
      const calendarArgs = { title: `[RESCUE] Focus: ${targetTask.name}`, start_time: new Date().toISOString(), end_time: new Date(Date.now() + 2*60*60*1000).toISOString() };
      sendEvent({ type: 'tool_call', name: 'create_calendar_event', args: calendarArgs });
      const calendarResult = await executeTool('create_calendar_event', calendarArgs);
      await sleep(1000);
      sendEvent({ type: 'tool_result', name: 'create_calendar_event', result: calendarResult });

      await sleep(1000);
      const emailArgs = { to: "professor@university.edu", subject: `Extension Request: ${targetTask.name}`, body: "Requesting an extension due to unforeseen issues." };
      sendEvent({ type: 'tool_call', name: 'draft_email', args: emailArgs });
      const emailResult = await executeTool('draft_email', emailArgs);
      await sleep(1000);
      sendEvent({ type: 'tool_result', name: 'draft_email', result: emailResult });

      await sleep(1000);
      sendEvent({ type: 'summary', message: `Fallback Protocol Complete. Successfully broke down the task, scheduled focus blocks, and drafted an extension email.` });

      sendEvent({ type: 'complete', message: "Rescue complete" });
      res.end();
    }
  });

  // Vite middleware for development
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
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
