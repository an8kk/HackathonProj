import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { useDashboard, useAsyncData } from 'shared/qamqor-context/DashboardContext';
import { useApp } from 'shared/qamqor-context/AppContext';
import { PERIOD_LABELS } from 'shared/qamqor-data/types';
import type { DashboardView } from 'shared/qamqor-data/types';

import Sidebar from 'shared/qamqor-dashboard/Sidebar';
import PeriodSwitcher from 'shared/qamqor-dashboard/PeriodSwitcher';
import ExportBar from 'shared/qamqor-dashboard/ExportBar';
import LocationDetailDrawer from 'shared/qamqor-dashboard/LocationDetailDrawer';
import EmployeeDossierDrawer from 'shared/qamqor-dashboard/EmployeeDossierDrawer';

import OverviewView from 'shared/qamqor-dashboard/views/OverviewView';
import LocationsView from 'shared/qamqor-dashboard/views/LocationsView';
import EmployeesView from 'shared/qamqor-dashboard/views/EmployeesView';
import ProductsView from 'shared/qamqor-dashboard/views/ProductsView';
import InvestigationsView from 'shared/qamqor-dashboard/views/InvestigationsView';
import ReconciliationView from 'shared/qamqor-dashboard/views/ReconciliationView';

export default function QamqorDashboard() {
  const navigate = useNavigate();
  const { period, setPeriod, source } = useDashboard();
  const { requests } = useApp();

  const [view, setView] = useState<DashboardView>('overview');
  const [locationId, setLocationId] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  const locations = useAsyncData(() => source.getLocations(period), [source, period]).data ?? [];

  const openLocation = (id: string) => setLocationId(id);
  const openEmployee = (id: string) => setEmployeeId(id);

  return (
    <div className="min-h-screen bg-surface lg:flex">
      <Sidebar active={view} onChange={setView} />

      <main className="flex-1 min-w-0">
        <div className="topbar justify-between no-print">
          <button onClick={() => navigate('/')} className="lg:hidden btn btn-ghost p-1.5 -ml-1">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="hidden lg:block text-[13px] text-muted">
            Дашборд владельца · <span className="text-charcoal font-semibold">{PERIOD_LABELS[period]}</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-end">
            <ExportBar requests={requests} locations={locations} period={period} />
            <PeriodSwitcher period={period} onChange={setPeriod} />
          </div>
        </div>

        <div className="px-5 lg:px-8 py-6 max-w-6xl">
          {view === 'overview' && (
            <OverviewView onOpenLocation={openLocation} onOpenEmployee={openEmployee} onNavigate={setView} />
          )}
          {view === 'locations' && <LocationsView onOpenLocation={openLocation} />}
          {view === 'employees' && <EmployeesView onOpenEmployee={openEmployee} />}
          {view === 'products' && <ProductsView />}
          {view === 'investigations' && (
            <InvestigationsView onOpenLocation={openLocation} onOpenEmployee={openEmployee} />
          )}
          {view === 'reconciliation' && <ReconciliationView onOpenLocation={openLocation} />}
        </div>
      </main>

      {locationId && (
        <LocationDetailDrawer
          locationId={locationId}
          onClose={() => setLocationId(null)}
          onOpenEmployee={openEmployee}
        />
      )}
      {employeeId && (
        <EmployeeDossierDrawer
          employeeId={employeeId}
          onClose={() => setEmployeeId(null)}
          onOpenLocation={openLocation}
        />
      )}
    </div>
  );
}
