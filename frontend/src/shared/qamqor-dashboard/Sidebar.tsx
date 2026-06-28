import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Store, Users, Package, ShieldAlert, Scale, Utensils, ArrowLeft,
} from 'lucide-react';
import type { DashboardView } from 'shared/qamqor-data/types';
import { useInvestigations } from 'shared/qamqor-context/InvestigationsContext';

interface NavItem { view: DashboardView; label: string; icon: typeof LayoutDashboard; }

const NAV: NavItem[] = [
  { view: 'overview', label: 'Обзор', icon: LayoutDashboard },
  { view: 'locations', label: 'Точки', icon: Store },
  { view: 'employees', label: 'Сотрудники', icon: Users },
  { view: 'products', label: 'Продукты', icon: Package },
  { view: 'investigations', label: 'Расследования', icon: ShieldAlert },
  { view: 'reconciliation', label: 'Сверка', icon: Scale },
];

export default function Sidebar({ active, onChange }: { active: DashboardView; onChange: (v: DashboardView) => void }) {
  const navigate = useNavigate();
  const { openCount } = useInvestigations();

  return (
    <aside className="sidebar no-print">
      {/* Brand */}
      <div className="px-5 py-4 flex items-center gap-2.5" style={{ borderBottom: '1px solid #F3F3F3' }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#198754' }}>
          <Utensils className="w-4 h-4 text-white" strokeWidth={2} />
        </div>
        <span className="font-bold text-charcoal text-[15px]">Bahandi</span>
        <span className="text-[11px] text-muted ml-auto">Owner</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 px-3 py-3">
        {NAV.map(item => {
          const isActive = active === item.view;
          const Icon = item.icon;
          const showBadge = item.view === 'investigations' && openCount > 0;
          return (
            <button
              key={item.view}
              onClick={() => onChange(item.view)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[14px] font-medium transition-colors"
              style={{
                background: isActive ? 'rgba(25,135,84,0.08)' : 'transparent',
                color: isActive ? '#198754' : '#2B2A28',
              }}
            >
              <Icon className="w-[17px] h-[17px] flex-shrink-0" style={{ opacity: isActive ? 1 : 0.5 }} />
              <span>{item.label}</span>
              {showBadge && (
                <span className="ml-auto text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center" style={{ background: '#DC3545', color: '#fff' }}>
                  {openCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <button
        onClick={() => navigate('/')}
        className="mt-auto flex items-center gap-2 px-5 py-4 text-[13px] text-muted hover:text-charcoal transition-colors"
        style={{ borderTop: '1px solid #F3F3F3' }}
      >
        <ArrowLeft className="w-4 h-4" />На главную
      </button>
    </aside>
  );
}
