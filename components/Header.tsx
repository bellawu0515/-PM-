
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">PM 任务优先级分析器</h1>
            <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">跨境电商专用版</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-4 text-sm text-slate-600">
          <span className="bg-slate-100 px-2 py-1 rounded border">Gemini AI 强力驱动</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
