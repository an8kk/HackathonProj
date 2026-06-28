import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Store, Users, Package, ShieldAlert, Scale, Shield, ArrowLeft, Settings,
} from 'lucide-react';
import type { DashboardView } from 'shared/qamqor-data/types';
import { useInvestigations } from 'shared/qamqor-context/InvestigationsContext';
import { useAuth } from 'shared/auth/session';

interface NavItem {
  view: DashboardView;
  label: string;
  icon: typeof LayoutDashboard;
}

const NAV: NavItem[] = [
  { view: 'overview', label: 'Обзор', icon: LayoutDashboard },
  { view: 'locations', label: 'Точки', icon: Store },
  { view: 'employees', label: 'Сотрудники', icon: Users },
  { view: 'products', label: 'Продукты', icon: Package },
  { view: 'investigations', label: 'Расследования', icon: ShieldAlert },
  { view: 'reconciliation', label: 'Сверка', icon: Scale },
];

export default function Sidebar({
  active,
  onChange,
}: {
  active: DashboardView;
  onChange: (v: DashboardView) => void;
}) {
  const navigate = useNavigate();
  const { openCount } = useInvestigations();
  const { user } = useAuth();

  return (
    <aside className="bg-ink text-white flex flex-col w-full lg:w-60 lg:min-h-screen lg:sticky lg:top-0 no-print">
      {/* Brand */}
      <div className="px-5 py-5 flex items-center gap-2 border-b border-white/10">
        <Shield className="w-5 h-5 text-amber-DEFAULT" />
        <span className="font-black text-lg">Qamqor</span>
        <span className="text-[10px] text-white/40 ml-auto">Bahandi</span>
      </div>

      {/* Nav */}
      <nav className="flex lg:flex-col gap-1 px-3 py-3 overflow-x-auto lg:overflow-visible">
        {NAV.map((item) => {
          const isActive = active === item.view;
          const Icon = item.icon;
          const showBadge = item.view === 'investigations' && openCount > 0;
          return (
            <button
              key={item.view}
              onClick={() => onChange(item.view)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors flex-shrink-0 whitespace-nowrap"
              style={{
                background: isActive ? 'rgba(245,163,0,0.15)' : 'transparent',
                color: isActive ? '#F5A300' : 'rgba(255,255,255,0.65)',
              }}
            >
              <Icon className="w-[18px] h-[18px] flex-shrink-0" />
              <span>{item.label}</span>
              {showBadge && (
                <span className="ml-auto text-[10px] font-bold bg-amber-DEFAULT text-ink rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                  {openCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      {/* Admin panel — только владельцу */}
      {user?.role === 'owner' && (
        <button
          onClick={() => navigate('/admin')}
          className="mt-auto flex items-center gap-3 mx-3 mb-1 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors flex-shrink-0 whitespace-nowrap bg-amber-DEFAULT/15 text-amber-DEFAULT hover:bg-amber-DEFAULT/25"
        >
          <Settings className="w-[18px] h-[18px] flex-shrink-0" />
          <span>Управление</span>
        </button>
      )}

      {/* Back to home */}
      <button
        onClick={() => navigate('/')}
        className="mt-auto hidden lg:flex items-center gap-2 px-5 py-4 text-white/40 hover:text-white text-sm transition-colors border-t border-white/10"
      >
        <ArrowLeft className="w-4 h-4" />
        На главную
      </button>
    </aside>
  );
}
