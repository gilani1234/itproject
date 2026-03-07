export function DashboardPage() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-2xl bg-slate-900 p-6 ring-1 ring-slate-800">
        <div className="text-sm text-slate-400">Баллы за неделю</div>
        <div className="mt-3 text-5xl font-bold text-emerald-400">+124</div>
      </div>
      <div className="rounded-2xl bg-slate-900 p-6 ring-1 ring-slate-800">
        <div className="text-sm text-slate-400">Задач в спринте</div>
        <div className="mt-3 text-5xl font-bold">
          14 <span className="text-3xl text-slate-500">/ 18</span>
        </div>
      </div>
      <div className="rounded-2xl bg-slate-900 p-6 ring-1 ring-slate-800">
        <div className="text-sm text-slate-400">Средний рейтинг команды</div>
        <div className="mt-3 text-5xl font-bold text-emerald-400">4.8</div>
      </div>
      <div className="rounded-2xl bg-slate-900 p-6 ring-1 ring-slate-800">
        <div className="text-sm text-slate-400">Следующий спринт</div>
        <div className="mt-4 text-3xl font-bold">через 3 дня</div>
      </div>
    </div>
  );
}

