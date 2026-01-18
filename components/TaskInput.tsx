
import React, { useState } from 'react';

interface TaskInputProps {
  onClassify: (text: string, dueAt: number | null) => void;
  isLoading: boolean;
}

const TaskInput: React.FC<TaskInputProps> = ({ onClassify, isLoading }) => {
  const [task, setTask] = useState('');
  const [dueDate, setDueDate] = useState<string>('');
  const [dueTime, setDueTime] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (task.trim() && !isLoading) {
      let finalDue: number | null = null;
      if (dueDate) {
        // Default time to 18:00 if not set
        const timeStr = dueTime || '18:00';
        finalDue = new Date(`${dueDate}T${timeStr}`).getTime();
      }
      onClassify(task, finalDue);
      setTask('');
      setDueDate('');
      setDueTime('');
    }
  };

  const setQuickDue = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const dateStr = d.toISOString().split('T')[0];
    setDueDate(dateStr);
    setDueTime('18:00');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8 transition-all hover:shadow-md">
      <form onSubmit={handleSubmit}>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          输入待分析的任务描述
        </label>
        <textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="例如：亚马逊美国站 Listing 被判违规阻塞，需要完成申诉..."
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 resize-none h-24"
          disabled={isLoading}
        />

        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase">截止日期:</span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={() => setQuickDue(0)}
                className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded hover:bg-slate-200 transition-colors"
              >
                今天
              </button>
              <button 
                type="button" 
                onClick={() => setQuickDue(1)}
                className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded hover:bg-slate-200 transition-colors"
              >
                明天
              </button>
              <button 
                type="button" 
                onClick={() => setQuickDue(7)}
                className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded hover:bg-slate-200 transition-colors"
              >
                本周
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <button
            type="submit"
            disabled={!task.trim() || isLoading}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold transition-all ${
              task.trim() && !isLoading
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                分析中...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                开始分类
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TaskInput;
