
import React from 'react';
import { TaskClassification } from '../types';

interface TaskDetailsModalProps {
  task: TaskClassification | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  now: number;
}

const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({ task, onClose, onDelete, now }) => {
  if (!task) return null;

  const getRemainingTime = (dueAt: number | null) => {
    if (!dueAt) return null;
    const diff = dueAt - now;
    const isOverdue = diff < 0;
    const absDiff = Math.abs(diff);
    
    const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    let timeStr = "";
    if (days > 0) timeStr += `${days}天 `;
    timeStr += `${hours}小时`;
    
    return {
      text: isOverdue ? `已逾期：${timeStr}` : `剩余时间：${timeStr}`,
      isOverdue
    };
  };

  const countdown = getRemainingTime(task.dueAt);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex items-start justify-between">
          <div>
            <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 ${
              task.status === 'done' ? 'bg-slate-100 text-slate-400' :
              task.quadrant.startsWith('Q1') ? 'bg-rose-100 text-rose-600' :
              task.quadrant.startsWith('Q2') ? 'bg-indigo-100 text-indigo-600' :
              task.quadrant.startsWith('Q3') ? 'bg-amber-100 text-amber-600' :
              'bg-slate-100 text-slate-600'
            }`}>
              {task.quadrantLabel || task.quadrant} {task.status === 'done' && ' (已完成)'}
            </span>
            <h2 className={`text-xl font-bold text-slate-800 leading-tight ${task.status === 'done' ? 'line-through text-slate-400' : ''}`}>
              {task.originalText}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {task.dueAt && (
            <div className={`p-3 rounded-xl border flex items-center justify-between ${countdown?.isOverdue ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
              <div className="flex items-center gap-3">
                <svg className={`w-5 h-5 ${countdown?.isOverdue ? 'text-rose-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">截止时间</span>
                  <span className={`text-sm font-bold ${countdown?.isOverdue ? 'text-rose-600' : 'text-slate-700'}`}>
                    {new Date(task.dueAt).toLocaleString()}
                  </span>
                </div>
              </div>
              <span className={`text-xs font-bold ${countdown?.isOverdue ? 'text-rose-600' : 'text-slate-500'}`}>
                {countdown?.text}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-slate-600">紧急度 (U)</span>
                <span className="text-xl font-black text-rose-500">{task.uScore}</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-rose-500 h-full rounded-full transition-all duration-1000" style={{ width: `${task.uScore}%` }}></div>
              </div>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed italic border-t border-slate-200/50 pt-2">
                {task.explanation.urgency}
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-slate-600">重要性 (I)</span>
                <span className="text-xl font-black text-indigo-600">{task.iScore}</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full rounded-full transition-all duration-1000" style={{ width: `${task.iScore}%` }}></div>
              </div>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed italic border-t border-slate-200/50 pt-2">
                {task.explanation.importance}
              </p>
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
            <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1">执行建议</h4>
            <p className="text-indigo-900 font-semibold">{task.explanation.nextAction}</p>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 flex items-center justify-between border-t border-slate-100">
          <button
            onClick={() => { onDelete(task.id); onClose(); }}
            className="flex items-center gap-2 text-rose-500 font-bold text-sm hover:text-rose-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            彻底删除
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
          >
            关闭详情
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailsModal;
