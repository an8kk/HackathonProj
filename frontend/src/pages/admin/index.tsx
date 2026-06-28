import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Package, Percent, Store, Users, Plug } from 'lucide-react';
import { useAuth } from 'shared/auth/session';
import IntegrationStatus from 'widgets/integration-status';
import { EmployeesTab, NormsTab, OutletsTab, ProductsTab } from './tabs';

type AdminTab = 'products' | 'norms' | 'outlets' | 'employees' | 'integrations';

const TABS: { id: AdminTab; label: string; icon: typeof Package }[] = [
  { id: 'products', label: 'Продукты', icon: Package },
  { id: 'norms', label: 'Нормы', icon: Percent },
  { id: 'outlets', label: 'Точки', icon: Store },
  { id: 'employees', label: 'Сотрудники', icon: Users },
  { id: 'integrations', label: 'Интеграции', icon: Plug },
];

export default function AdminPanel() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<AdminTab>('products');

  // Owner-only route — bounce everyone else back to the landing page.
  if (user?.role !== 'owner') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-offwhite">
      <div className="bg-ink text-white">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4 mb-4">
            <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" />
              На главную
            </button>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-DEFAULT" />
              <span className="font-bold text-sm text-white/80">Qamqor · Админ</span>
            </div>
          </div>
          <h1 className="text-2xl font-black">Панель владельца</h1>
          <p className="text-text-muted text-sm mt-0.5">Справочники · нормы · сотрудники · интеграции</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="flex flex-wrap gap-2 mb-5">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  tab === t.id ? 'bg-ink text-white' : 'bg-white text-text-muted hover:bg-stone-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === 'products' && <ProductsTab />}
        {tab === 'norms' && <NormsTab />}
        {tab === 'outlets' && <OutletsTab />}
        {tab === 'employees' && <EmployeesTab />}
        {tab === 'integrations' && <IntegrationStatus />}
      </div>
    </div>
  );
}
