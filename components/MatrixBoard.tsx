
import React from 'react';
import { TaskClassification } from '../types';

interface MatrixBoardProps {
  tasks: TaskClassification[];
  onTaskClick: (task: TaskClassification) => void;
  onToggleStatus: (id: string) => void;
  now: number;
}

const MatrixBoard: React.FC<MatrixBoardProps> = ({ tasks, onTaskClick, onToggleStatus, now }) => {
  const openTasks = tasks.filter(t => t.status === 'open');

  const getDueStatus = (dueAt: number | null) => {
    if (!dueAt) return 'none';
    const diff = dueAt - now;
    if (diff < 0) return 'overdue';
    if (new Date(dueAt).toDateString() === new Date(now).toDateString()) return 'today';
    if (diff < 24 * 60 * 60 * 1000) return 'lt24h';
    if (diff < 72 * 60 * 60 * 1000) return 'lt72h';
    return 'none';
  };

  const getDueLabel = (dueAt: number | null) => {
    const status = getDueStatus(dueAt);
    switch (status) {
      case 'overdue': return { text: '⛔ 已逾期', className: 'text-rose-600 bg-rose-50 border-rose-100' };
      case 'today': return { text: '⏰ 今日截止', className: 'text-rose-500 bg-rose-50 border-rose-100' };
      case 'lt24h': return { text: '⚠️ 24h内截止', className: 'text-amber-600 bg-amber-50 border-amber-100' };
      case 'lt72h': return { text: '⚠️ 3天内截止', className: 'text-amber-500 bg-amber-50 border-amber-100' };
      default: return null;
    }
  };

  const sortTasks = (taskList: TaskClassification[]) => {
    return [...taskList].sort((a, b) => {
      const aStatus = getDueStatus(a.dueAt);
      const bStatus = getDueStatus(b.dueAt);

      // Overdue first
      if (aStatus === 'overdue' && bStatus !== 'overdue') return -1;
      if (aStatus !== 'overdue' && bStatus === 'overdue') return 1;

      // Today second
      if (aStatus === 'today' && bStatus !== 'today') return -1;
      if (aStatus !== 'today' && bStatus === 'today') return 1;

      // Earliest dueAt
      if (a.dueAt && b.dueAt) return a.dueAt - b.dueAt;
      if (a.dueAt) return -1;
      if (b.dueAt) return 1;

      // Higher U score
      return b.uScore - a.uScore;
    });
  };

  const getTasksByQuadrant = (q: string) => {
    const qTasks = openTasks.filter((t) => t.quadrant.startsWith(q));
    return sortTasks(qTasks);
  };

  const QuadrantBox = ({ title, q, colorClass, label }: { title: string; q: string; colorClass: string; label: string }) => {
    const qTasks = getTasksByQuadrant(q);
    return (
      <div className={`relative flex flex-col h-full min-h-[350px] border-2 border-dashed border-slate-200 rounded-2xl bg-white p-4 transition-all hover:bg-slate-50/50`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${colorClass}`}>
              {q}
            </span>
            <h3 className="font-bold text-slate-800">{title}</h3>
          </div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">{label}</span>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {qTasks.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-300 italic text-sm text-center px-4">
              暂无待办任务
            </div>
          ) : (
            qTasks.map((task) => {
              const dueTag = getDueLabel(task.dueAt);
              return (
                <div key={task.id} className="group relative flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-white shadow-sm hover:shadow-md hover:border-indigo-200 transition-all">
                  <input
                    type="checkbox"
                    checked={task.status === 'done'}
                    onChange={() => onToggleStatus(task.id)}
                    className="mt-1 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div className="flex-1 cursor-pointer" onClick={() => onTaskClick(task)}>
                    <p className="text-sm font-medium text-slate-700 line-clamp-2 group-hover:text-indigo-600">
                      {task.originalText}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-[10px] font-bold">
                          <span className="text-slate-400">紧急:</span>
                          <span className={task.uScore >= 60 ? 'text-rose-500' : 'text-slate-500'}>{task.uScore}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-bold">
                          <span className="text-slate-400">重要:</span>
                          <span className={task.iScore >= 60 ? 'text-indigo-600' : 'text-slate-500'}>{task.iScore}</span>
                        </div>
                      </div>
                      
                      {dueTag && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${dueTag.className}`}>
                          {dueTag.text}
                        </span>
                      )}
                      
                      {task.dueAt && !dueTag && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(task.dueAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})} 截止
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          待办优先级分析矩阵
        </h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <QuadrantBox title="立即执行" q="Q1" colorClass="bg-rose-500" label="紧急且重要" />
        <QuadrantBox title="制定计划" q="Q2" colorClass="bg-indigo-500" label="重要但不紧急" />
        <QuadrantBox title="授权他人" q="Q3" colorClass="bg-amber-500" label="紧急但不重要" />
        <QuadrantBox title="暂不处理" q="Q4" colorClass="bg-slate-400" label="不紧急不重要" />
      </div>
    </div>
  );
};

export default MatrixBoard;
