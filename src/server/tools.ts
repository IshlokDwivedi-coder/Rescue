import { Type, FunctionDeclaration } from "@google/genai";

// 1. Tool definitions for Gemini
export const breakdownTaskTool: FunctionDeclaration = {
  name: "breakdown_task",
  description: "Breaks a complex task into 3-5 concrete sub-steps.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      task_name: { type: Type.STRING, description: "Name of the task to breakdown" },
      deadline: { type: Type.STRING, description: "When the task is due" }
    },
    required: ["task_name", "deadline"]
  }
};

export const createCalendarEventTool: FunctionDeclaration = {
  name: "create_calendar_event",
  description: "Schedules a focus block in the user's calendar.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "Title of the calendar event" },
      start_time: { type: Type.STRING, description: "ISO string for start time" },
      end_time: { type: Type.STRING, description: "ISO string for end time" }
    },
    required: ["title", "start_time", "end_time"]
  }
};

export const draftEmailTool: FunctionDeclaration = {
  name: "draft_email",
  description: "Drafts an email for an extension or coordination. DRAFT ONLY - never sends.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      to: { type: Type.STRING, description: "Recipient email address" },
      subject: { type: Type.STRING, description: "Email subject" },
      body: { type: Type.STRING, description: "Email body content" }
    },
    required: ["to", "subject", "body"]
  }
};

export const agentTools = [breakdownTaskTool, createCalendarEventTool, draftEmailTool];

// 2. Tool implementations (Demo Mode Fallbacks)
export async function executeTool(name: string, args: any): Promise<any> {
  try {
    if (name === "breakdown_task") {
      return {
        success: true,
        sub_steps: [
          "Review materials and gather requirements",
          "Create a rough outline/draft",
          "Execute the main work",
          "Review, refine, and finalize"
        ],
        message: `Successfully broke down '${args.task_name}' into actionable steps.`
      };
    }
    
    if (name === "create_calendar_event") {
      return {
        success: true,
        event_link: "https://calendar.google.com/calendar/u/0/r/eventedit",
        message: `Scheduled focus block: '${args.title}' from ${new Date(args.start_time).toLocaleTimeString()} to ${new Date(args.end_time).toLocaleTimeString()}.`
      };
    }

    if (name === "draft_email") {
      return {
        success: true,
        draft_id: "draft_" + Math.floor(Math.random() * 100000),
        message: `Drafted email to ${args.to} with subject '${args.subject}'.`
      };
    }

    return { error: `Tool ${name} not recognized.` };
  } catch (error: any) {
    return { error: `Error executing ${name}: ${error.message}` };
  }
}

// 3. Risk Engine
export function calculateRisk(estimatedEffortHours: number, hoursLeft: number): number {
  if (hoursLeft <= 0) return 1.0; // Already missed or due right now
  const risk = estimatedEffortHours / hoursLeft;
  // Cap at 1.0
  return Math.min(risk, 1.0);
}

// 4. Seed Data
export const seededTasks = [
  {
    id: "t1",
    name: "Read chapter 4 of Biology",
    estimated_effort_hours: 1.5,
    hours_left_until_deadline: 48,
  },
  {
    id: "t2",
    name: "Complete Math Worksheet",
    estimated_effort_hours: 2,
    hours_left_until_deadline: 24,
  },
  {
    id: "t3",
    name: "ML Assignment: Neural Networks",
    estimated_effort_hours: 8,
    hours_left_until_deadline: 9, // Risk = 8/9 = 0.88 (AT RISK)
  },
  {
    id: "t4",
    name: "Update Resume",
    estimated_effort_hours: 1,
    hours_left_until_deadline: 72,
  }
].map(t => ({
  ...t,
  risk: calculateRisk(t.estimated_effort_hours, t.hours_left_until_deadline),
  isAtRisk: calculateRisk(t.estimated_effort_hours, t.hours_left_until_deadline) > 0.8
}));
