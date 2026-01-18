
import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import TaskInput from './components/TaskInput';
import MatrixBoard from './components/MatrixBoard';
import TaskDetailsModal from './components/TaskDetailsModal';
import { TaskClassification } from './types';
import { classifyTask } from './services/geminiService';

const App: React.FC = () => {
  const [tasks, setTasks] = useState<TaskClassification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskClassification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [showCompleted, setShowCompleted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Update "now" every minute to keep due statuses fresh
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem('pm-tasks-classifier-v2');
    if (saved) {
      try {
        setTasks(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse tasks", e);
      }
    }
  }, []);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('pm-tasks-classifier-v2', JSON.stringify(tasks));
  }, [tasks]);

  // --- Guardrails (deterministic) ---
  // LLMs may mis-handle absolute dates if "now" isn't explicit. We still add a local safety net
  // so U/I and quadrant remain consistent with the due-time rules.
  const timeSignalFromDue = (dueAt: number, nowMs: number) => {
    const diff = dueAt - nowMs;
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;
    const threeDays = 72 * oneHour;
    const sevenDays = 7 * oneDay;
    const absDiff = Math.abs(diff);
    if (absDiff <= oneDay) return 60;
    if (absDiff <= threeDays) return 45;
    if (absDiff <= sevenDays) return 30;
    return 10;
  };

  const minImportanceFromText = (text: string) => {
    const t = text.toLowerCase();
    const highRisk = /(受伤|安全|合规|税务|诉讼|立案|财产保全|平台政策|海关|injury|safety|compliance|tax|lawsuit|customs|platform)/i;
    const packaging = /(说明书|外箱|内盒|包装|箱唛|标签|标识|label|ce|rohs)/i;
    const reviews = /(差评|评分|退货|客诉|bad review|rating|return|complaint)/i;
    if (highRisk.test(text)) return 80;
    if (packaging.test(text)) return 70;
    if (reviews.test(text)) return 70;
    return 0;
  };

  const quadrantFromScores = (u: number, i: number) => {
    const U_TH = 60;
    const I_TH = 60;
    if (u >= U_TH && i >= I_TH) return 'Q1' as const;
    if (u < U_TH && i >= I_TH) return 'Q2' as const;
    if (u >= U_TH && i < I_TH) return 'Q3' as const;
    return 'Q4' as const;
  };

  const quadrantLabelMap: Record<'Q1' | 'Q2' | 'Q3' | 'Q4', string> = {
    Q1: '立即执行',
    Q2: '制定计划',
    Q3: '授权他人',
    Q4: '暂不处理'
  };

  const handleClassify = async (text: string, dueAt: number | null) => {
    setIsLoading(true);
    setError(null);
    try {
      // Explicitly pass "now" to help the model compute time deltas.
      const nowMs = Date.now();
      const result = await classifyTask(text, dueAt, nowMs);

      // Apply local guardrails for due-time and obvious high-importance categories.
      let uScore = Number.isFinite(result.u) ? result.u : 0;
      let iScore = Number.isFinite(result.i) ? result.i : 0;
      let urgencyText = result.explanation?.urgency || '';
      let importanceText = result.explanation?.importance || '';

      if (dueAt) {
        const minU = timeSignalFromDue(dueAt, nowMs);
        if (uScore < minU) {
          // Build a short, consistent delta label
          const diffMs = dueAt - nowMs;
          const abs = Math.abs(diffMs);
          const days = Math.floor(abs / (1000 * 60 * 60 * 24));
          const hours = Math.floor((abs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((abs % (1000 * 60 * 60)) / (1000 * 60));
          const deltaStr = `${days > 0 ? `${days}天 ` : ''}${hours}小时 ${minutes}分钟`;
          uScore = minU;
          urgencyText = `截止时间${diffMs < 0 ? '已逾期' : '临近'}（${deltaStr}），按规则时间信号至少应为 +${minU}；已进行系统校正。` + (urgencyText ? ` 原分析：${urgencyText}` : '');
        }
      }

      const minI = minImportanceFromText(text);
      if (minI > 0 && iScore < minI) {
        iScore = minI;
        importanceText = `根据跨境电商行业规则，该类任务重要性通常较高（最低建议 ${minI}）；已进行系统校正。` + (importanceText ? ` 原分析：${importanceText}` : '');
      }

      const q = quadrantFromScores(uScore, iScore);
      const qLabel = `${q} - ${quadrantLabelMap[q]}`;
      const newTask: TaskClassification = {
        id: crypto.randomUUID(),
        originalText: text,
        quadrant: q,
        quadrantLabel: qLabel,
        uScore: uScore,
        iScore: iScore,
        dueAt: dueAt,
        status: 'open',
        completedAt: null,
        explanation: {
          urgency: urgencyText,
          importance: importanceText,
          nextAction: result.explanation?.nextAction || ''
        },
        timestamp: Date.now()
      };
      setTasks(prev => [newTask, ...prev]);
      setSelectedTask(newTask);
    } catch (err: any) {
      console.error(err);
      setError(err.message || '分析失败。请检查网络连接或 API 配置。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleToggleStatus = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const isDone = t.status === 'done';
        return {
          ...t,
          status: isDone ? 'open' : 'done',
          completedAt: isDone ? null : Date.now()
        };
      }
      return t;
    }));
  };

  const clearAll = () => {
    if (window.confirm('确定要清空所有任务吗？此操作不可撤销。')) {
      setTasks([]);
    }
  };

  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks;
    const q = searchQuery.toLowerCase();
    return tasks.filter(t => t.originalText.toLowerCase().includes(q));
  }, [tasks, searchQuery]);

  const openTasks = filteredTasks.filter(t => t.status === 'open');
  const doneTasks = filteredTasks.filter(t => t.status === 'done').sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));

  return (
    <div className="min-h-screen flex flex-col pb-20">
      <Header />
      
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Input and Stats */}
          <div className="lg:col-span-4 space-y-6">
            <TaskInput onClassify={handleClassify} isLoading={isLoading} />
            
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-sm flex items-start gap-3 animate-pulse">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                  统计与搜索
                </h3>
              </div>
              
              <div className="mb-6">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="搜索任务关键词..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <svg className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-slate-50 p-4 rounded-lg text-center">
                  <span className="block text-2xl font-black text-slate-800">{openTasks.length}</span>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">进行中任务</span>
                </div>
                <div className="bg-emerald-50 p-4 rounded-lg text-center">
                  <span className="block text-2xl font-black text-emerald-600">{doneTasks.length}</span>
                  <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-tighter">已完成任务</span>
                </div>
              </div>
              
              <button 
                onClick={clearAll}
                className="w-full py-2 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-400 hover:text-rose-500 hover:border-rose-100 hover:bg-rose-50 transition-all uppercase tracking-widest"
              >
                清空本地所有数据
              </button>
            </div>

            <div className="bg-indigo-900 rounded-xl p-6 text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
              <div className="relative z-10">
                <h4 className="font-bold mb-2">智能决策逻辑</h4>
                <p className="text-xs text-indigo-200 leading-relaxed">
                  紧急度评分已由截止时间强力驱动。建议根据「执行建议」进行合理的任务授权或深度专注。
                </p>
              </div>
              <div className="absolute bottom-0 right-0 w-24 h-24 bg-indigo-500 rounded-full -mr-8 -mb-8 opacity-20 blur-xl"></div>
            </div>
          </div>

          {/* Right Column: Matrix Board & Completed Pool */}
          <div className="lg:col-span-8 space-y-8">
            <MatrixBoard 
              tasks={tasks} 
              onTaskClick={setSelectedTask} 
              onToggleStatus={handleToggleStatus}
              now={now}
            />

            {/* Completed Pool Section */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <button 
                onClick={() => setShowCompleted(!showCompleted)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 text-emerald-600 p-1.5 rounded-lg">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-slate-800">✅ 已完成任务 ({doneTasks.length})</h3>
                </div>
                <svg className={`w-5 h-5 text-slate-400 transition-transform ${showCompleted ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showCompleted && (
                <div className="p-4 border-t border-slate-100 space-y-2 max-h-[400px] overflow-y-auto">
                  {doneTasks.length === 0 ? (
                    <p className="text-center py-8 text-slate-300 italic text-sm">暂无已完成任务</p>
                  ) : (
                    doneTasks.map(task => (
                      <div key={task.id} className="group flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-all opacity-60 hover:opacity-100">
                        <input
                          type="checkbox"
                          checked={true}
                          onChange={() => handleToggleStatus(task.id)}
                          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <div className="flex-1 cursor-pointer" onClick={() => setSelectedTask(task)}>
                          <p className="text-sm font-medium text-slate-500 line-through">
                            {task.originalText}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-slate-300 uppercase">
                              完成于 {new Date(task.completedAt!).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button 
                             onClick={() => handleToggleStatus(task.id)}
                             className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded transition-all"
                             title="恢复为待办"
                           >
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                             </svg>
                           </button>
                           <button 
                             onClick={() => handleDelete(task.id)}
                             className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded transition-all"
                             title="永久删除"
                           >
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                             </svg>
                           </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Task Details Modal */}
      <TaskDetailsModal 
        task={selectedTask} 
        onClose={() => setSelectedTask(null)} 
        onDelete={handleDelete}
        now={now}
      />

      <footer className="fixed bottom-0 left-0 right-0 py-3 bg-white/80 backdrop-blur border-t border-slate-100 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest z-40">
        跨境电商决策引擎 • 专业增强版 V2.0.0
      </footer>
    </div>
  );
};

export default App;

