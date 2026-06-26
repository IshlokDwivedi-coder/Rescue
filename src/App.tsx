import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [isRescuing, setIsRescuing] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [targetTask, setTargetTask] = useState<any | null>(null);

  useEffect(() => {
    fetch("/api/tasks")
      .then(res => res.json())
      .then(data => {
        setTasks(data.tasks);
        const atRisk = data.tasks.find((t: any) => t.isAtRisk);
        if (atRisk) setTargetTask(atRisk);
      });
  }, []);

  const handleRescue = async () => {
    if (!targetTask) return;
    setIsRescuing(true);
    setLogs([]);

    try {
      const response = await fetch("/api/rescue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetTaskId: targetTask.id })
      });

      if (!response.body) throw new Error("No body in response");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n\n");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));
            setLogs(prev => [...prev, data]);
          }
        }
      }
    } catch (e: any) {
      setLogs(prev => [...prev, { type: 'error', message: e.message }]);
    } finally {
      setIsRescuing(false);
    }
  };

  const getLogIcon = (log: any) => {
    switch (log.type) {
      case 'status': return "🧠";
      case 'tool_call': 
        if (log.name === 'breakdown_task') return "🔧";
        if (log.name === 'create_calendar_event') return "📅";
        if (log.name === 'draft_email') return "✉️";
        return "🔄";
      case 'tool_result': return "✅";
      case 'summary': return "✨";
      default: return "🔹";
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans flex flex-col overflow-x-hidden">
      <div className="w-full max-w-[1024px] mx-auto p-6 md:p-10 flex flex-col flex-1 min-h-0">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:justify-between md:items-end mb-12 border-b border-white/10 pb-6 gap-4">
          <div>
            <h1 className="text-6xl font-serif tracking-tighter text-white">Rescue</h1>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mt-2">It doesn't remind you. It rescues you.</p>
          </div>
          <div className="md:text-right">
            <span className="text-[10px] uppercase tracking-widest text-slate-500">System Status</span>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
              <span className="text-sm font-medium">Agentic Loop Ready</span>
            </div>
          </div>
        </header>

        <main className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-8 min-h-0">
          {/* Left Column: Tasks */}
          <div className="col-span-1 md:col-span-4 lg:col-span-4 flex flex-col gap-4">
            <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-2 font-semibold">Critical Inventory</h2>
            
            {tasks.map(task => (
              <div 
                key={task.id} 
                className={task.isAtRisk 
                  ? "relative p-5 bg-red-950/20 border border-red-500/50 rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.15)] transition-all" 
                  : "p-4 bg-white/5 border border-white/10 rounded-xl transition-all"}
                style={{ opacity: !task.isAtRisk && task.risk < 0.2 ? 0.6 : 1 }}
              >
                {task.isAtRisk && (
                  <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded">AT RISK</div>
                )}
                <h3 className={`font-serif text-lg ${task.isAtRisk ? 'text-white' : ''}`}>{task.name}</h3>
                <div className={`mt-${task.isAtRisk ? '3' : '2'} flex justify-between items-${task.isAtRisk ? 'end' : 'center'}`}>
                  {task.isAtRisk ? (
                    <>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase">Due in {task.hours_left_until_deadline}h</p>
                        <p className="text-xl font-mono text-red-400">{task.risk.toFixed(2)} <span className="text-xs">risk</span></p>
                      </div>
                      <div className="w-12 h-1 bg-red-900 rounded-full overflow-hidden mb-1">
                        <div className="h-full bg-red-500" style={{ width: `${Math.min(100, task.risk * 100)}%` }}></div>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-[10px] text-slate-500 uppercase">Due in {task.hours_left_until_deadline}h</p>
                      <p className="text-sm font-mono text-slate-400">{task.risk.toFixed(2)}</p>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Center Column: Agent Activity */}
          <div className="col-span-1 md:col-span-8 lg:col-span-8 flex flex-col gap-6 h-full min-h-[500px]">
            {!logs.length && !isRescuing ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 border border-white/10 rounded-2xl bg-gradient-to-b from-white/5 to-transparent">
                <button 
                  onClick={handleRescue}
                  className="group relative px-10 py-5 bg-red-600 hover:bg-red-500 text-white rounded-full font-bold text-lg tracking-widest transition-all shadow-[0_0_30px_rgba(220,38,38,0.4)]"
                >
                  🚨 RESCUE ME
                  <div className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-20"></div>
                </button>
                <p className="text-[10px] text-slate-500 mt-4 uppercase tracking-widest">Initializing Gemini-2.5-Flash</p>
              </div>
            ) : (
              <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-6 overflow-hidden flex flex-col">
                <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${isRescuing ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`}></span>
                  Agent Execution Log
                </h2>
                
                <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                  <AnimatePresence>
                    {logs.map((log, i) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={i} 
                        className="flex gap-4 items-start"
                      >
                        <div className="text-xl leading-none pt-0.5">{getLogIcon(log)}</div>
                        <div className="flex-1">
                          {log.type === 'status' && (
                            <>
                              <p className="text-sm text-white font-medium">Risk Assessment Initialized</p>
                              <p className="text-xs text-slate-400 mt-1 italic">"{log.message}"</p>
                            </>
                          )}
                          
                          {log.type === 'tool_call' && (
                            <>
                              <p className="text-sm text-white font-medium">
                                {log.name === 'breakdown_task' && "Decomposing Objectives"}
                                {log.name === 'create_calendar_event' && "Optimizer Active: Scheduling"}
                                {log.name === 'draft_email' && "Drafting Contingency Communication"}
                              </p>
                              <div className="text-xs text-slate-400 mt-1">
                                {log.name === 'breakdown_task' && `Task focus: ${log.args.task_name}`}
                                {log.name === 'create_calendar_event' && `Injecting block: ${log.args.title}`}
                                {log.name === 'draft_email' && <span className="text-red-400 tracking-tight">Drafting email to: {log.args.to}</span>}
                              </div>
                            </>
                          )}

                          {log.type === 'tool_result' && (
                            <div className="mt-2 text-xs text-slate-300">
                              <p className="mb-2 italic opacity-80">System: {log.result.message}</p>
                              
                              {/* Artifact visual rendering */}
                              {log.result.sub_steps && (
                                <div className="p-3 bg-black/40 rounded-lg border border-white/5 mt-2">
                                  <ul className="space-y-1.5">
                                    {log.result.sub_steps.map((step: string, idx: number) => (
                                      <li key={idx} className="flex gap-2 items-start">
                                        <span className="text-[10px] text-blue-400 mt-0.5">■</span>
                                        <span>{step}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {log.name === 'draft_email' && log.result.success && (
                                <div className="mt-3 bg-white/5 border border-white/10 rounded-lg p-3">
                                  <h3 className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Draft Generated (Non-Sent)</h3>
                                  <div className="font-serif leading-relaxed text-slate-300 italic p-2 bg-black/30 rounded border border-white/5">
                                    Draft saved in workspace. Requires manual review.
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {log.type === 'summary' && (
                            <div className="mt-2 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-100/90 leading-relaxed text-sm">
                              {log.message}
                            </div>
                          )}

                          {log.type === 'error' && (
                            <div className="mt-2 p-3 bg-red-950/40 border border-red-500/20 rounded-xl text-red-300 text-sm">
                              {log.message}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                    
                    {isRescuing && (
                      <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        className="flex gap-4 items-start animate-pulse"
                      >
                        <div className="text-xl opacity-50">⚙️</div>
                        <div className="flex-1">
                          <p className="text-sm text-slate-400 font-medium">Processing next action...</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        </main>

        <footer className="mt-8 flex justify-between items-center text-[10px] text-slate-600 uppercase tracking-[0.2em]">
          <div>v1.0.4-agentic-beta</div>
          <div className="hidden sm:block">Powered by Gemini-2.5-Flash & Google Cloud Run</div>
          <div>User: Solo-Dev-Hackathon</div>
        </footer>
      </div>
    </div>
  );
}
