import { useState, type FormEvent, type ReactNode } from 'react';
import { ApiError } from 'shared/api/client';
import {
  useCreateEmployee,
  useCreateNorm,
  useCreateOutlet,
  useCreateProduct,
  useEmployees,
  useNorms,
  useOutlets,
  useProducts,
  useUpdateEmployee,
} from 'shared/api/queries';
import type { EmployeeDto, UpdateEmployeeBody } from 'shared/api/types';

const UNIT_OPTIONS = ['штуки', 'граммы', 'кг'] as const;
const ROLE_OPTIONS = ['sender', 'reviewer', 'owner'] as const;

function FormError({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <p className="text-xs font-medium mt-1" style={{ color: '#D62828' }}>
      Ошибка: {error instanceof ApiError ? error.code : 'network_error'}
    </p>
  );
}

function SectionShell({
  title,
  loading,
  error,
  children,
  form,
}: {
  title: string;
  loading: boolean;
  error: unknown;
  children: ReactNode;
  form: ReactNode;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
      <div className="card p-4">
        <p className="text-sm font-bold text-text-primary mb-3">{title}</p>
        {loading ? (
          <p className="text-sm text-text-muted">Загрузка…</p>
        ) : error ? (
          <p className="text-sm text-theft">Не удалось загрузить: {error instanceof ApiError ? error.code : 'network_error'}</p>
        ) : (
          children
        )}
      </div>
      <div className="card p-4 self-start">{form}</div>
    </div>
  );
}

export function ProductsTab() {
  const productsQuery = useProducts();
  const createProduct = useCreateProduct();
  const [name, setName] = useState('');
  const [unit, setUnit] = useState<string>(UNIT_OPTIONS[0]);
  const [cost, setCost] = useState('');
  const [normPct, setNormPct] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name) return;
    createProduct.mutate(
      {
        name,
        unit,
        cost_per_unit: parseFloat(cost) || 0,
        norm_waste_pct: normPct ? parseFloat(normPct) : 0,
      },
      {
        onSuccess: () => {
          setName('');
          setCost('');
          setNormPct('');
        },
      },
    );
  }

  const products = productsQuery.data ?? [];

  return (
    <SectionShell
      title="Продукты"
      loading={productsQuery.isLoading}
      error={productsQuery.error}
      form={
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <p className="text-sm font-bold text-text-primary mb-1">Новый продукт</p>
          <input className="text-input" placeholder="Название" value={name} onChange={e => setName(e.target.value)} />
          <select className="select-input" value={unit} onChange={e => setUnit(e.target.value)}>
            {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <input className="text-input" type="number" min="0" step="0.01" placeholder="Себестоимость" value={cost} onChange={e => setCost(e.target.value)} />
          <input className="text-input" type="number" min="0" step="0.1" placeholder="Норма отхода, %" value={normPct} onChange={e => setNormPct(e.target.value)} />
          <button type="submit" className="btn-primary mt-1" disabled={!name || createProduct.isPending}>
            {createProduct.isPending ? 'Добавление…' : 'Добавить продукт'}
          </button>
          <FormError error={createProduct.error} />
        </form>
      }
    >
      {products.length === 0 ? (
        <p className="text-sm text-text-muted">Продуктов пока нет</p>
      ) : (
        <ul className="divide-y divide-stone-100">
          {products.map(p => (
            <li key={p.id} className="py-2 flex items-center justify-between text-sm">
              <span className="font-medium text-text-primary">{p.name}</span>
              <span className="text-text-muted">{p.cost_per_unit} ₸ · {p.unit}</span>
            </li>
          ))}
        </ul>
      )}
    </SectionShell>
  );
}

export function NormsTab() {
  const normsQuery = useNorms({});
  const productsQuery = useProducts();
  const outletsQuery = useOutlets();
  const createNorm = useCreateNorm();
  const [productId, setProductId] = useState('');
  const [outletId, setOutletId] = useState('');
  const [maxPct, setMaxPct] = useState('');

  const products = productsQuery.data ?? [];
  const outlets = outletsQuery.data ?? [];

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!productId || !maxPct) return;
    createNorm.mutate(
      {
        product_id: productId,
        outlet_id: outletId || null,
        max_waste_pct: parseFloat(maxPct),
      },
      { onSuccess: () => setMaxPct('') },
    );
  }

  const norms = normsQuery.data ?? [];

  return (
    <SectionShell
      title="Нормы отхода"
      loading={normsQuery.isLoading}
      error={normsQuery.error}
      form={
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <p className="text-sm font-bold text-text-primary mb-1">Новая норма</p>
          <select className="select-input" value={productId} onChange={e => setProductId(e.target.value)}>
            <option value="">— продукт —</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className="select-input" value={outletId} onChange={e => setOutletId(e.target.value)}>
            <option value="">Все точки</option>
            {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <input className="text-input" type="number" min="0" step="0.1" placeholder="Макс. отход, %" value={maxPct} onChange={e => setMaxPct(e.target.value)} />
          <button type="submit" className="btn-primary mt-1" disabled={!productId || !maxPct || createNorm.isPending}>
            {createNorm.isPending ? 'Добавление…' : 'Добавить норму'}
          </button>
          <FormError error={createNorm.error} />
        </form>
      }
    >
      {norms.length === 0 ? (
        <p className="text-sm text-text-muted">Норм пока нет</p>
      ) : (
        <ul className="divide-y divide-stone-100">
          {norms.map(n => (
            <li key={n.id} className="py-2 flex items-center justify-between text-sm">
              <span className="font-medium text-text-primary">{products.find(p => p.id === n.product_id)?.name ?? n.product_id}</span>
              <span className="text-text-muted">{n.max_waste_pct}%</span>
            </li>
          ))}
        </ul>
      )}
    </SectionShell>
  );
}

export function OutletsTab() {
  const outletsQuery = useOutlets();
  const createOutlet = useCreateOutlet();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [iikoStoreId, setIikoStoreId] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name) return;
    createOutlet.mutate(
      { name, address: address || undefined, iiko_store_id: iikoStoreId || null },
      {
        onSuccess: () => {
          setName('');
          setAddress('');
          setIikoStoreId('');
        },
      },
    );
  }

  const outlets = outletsQuery.data ?? [];

  return (
    <SectionShell
      title="Точки"
      loading={outletsQuery.isLoading}
      error={outletsQuery.error}
      form={
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <p className="text-sm font-bold text-text-primary mb-1">Новая точка</p>
          <input className="text-input" placeholder="Название" value={name} onChange={e => setName(e.target.value)} />
          <input className="text-input" placeholder="Адрес" value={address} onChange={e => setAddress(e.target.value)} />
          <input className="text-input" placeholder="iiko store id" value={iikoStoreId} onChange={e => setIikoStoreId(e.target.value)} />
          <button type="submit" className="btn-primary mt-1" disabled={!name || createOutlet.isPending}>
            {createOutlet.isPending ? 'Добавление…' : 'Добавить точку'}
          </button>
          <FormError error={createOutlet.error} />
        </form>
      }
    >
      {outlets.length === 0 ? (
        <p className="text-sm text-text-muted">Точек пока нет</p>
      ) : (
        <ul className="divide-y divide-stone-100">
          {outlets.map(o => (
            <li key={o.id} className="py-2 flex items-center justify-between text-sm">
              <span className="font-medium text-text-primary">{o.name}</span>
              <span className="text-text-muted">{o.address || '—'}</span>
            </li>
          ))}
        </ul>
      )}
    </SectionShell>
  );
}

function EmployeeRow({ employee }: { employee: EmployeeDto }) {
  const updateEmployee = useUpdateEmployee();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(employee.name);
  const [role, setRole] = useState<string>(employee.role);
  const [pin, setPin] = useState('');

  function resetForm() {
    setName(employee.name);
    setRole(employee.role);
    setPin('');
  }

  function handleSave() {
    const body: UpdateEmployeeBody = {};
    if (name !== employee.name) body.name = name;
    if (role !== employee.role) body.role = role;
    if (pin) body.pin = pin;
    if (Object.keys(body).length === 0) {
      setEditing(false);
      return;
    }
    updateEmployee.mutate(
      { id: employee.id, body },
      {
        onSuccess: () => {
          setPin('');
          setEditing(false);
        },
      },
    );
  }

  function toggleActive() {
    updateEmployee.mutate({ id: employee.id, body: { active: !employee.active } });
  }

  if (editing) {
    return (
      <li className="py-3 flex flex-col gap-2 text-sm">
        <input className="text-input" placeholder="Имя" value={name} onChange={e => setName(e.target.value)} />
        <select className="select-input" value={role} onChange={e => setRole(e.target.value)}>
          {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <input className="text-input" placeholder="Новый PIN (необязательно)" value={pin} onChange={e => setPin(e.target.value)} />
        <div className="flex items-center gap-3">
          <button type="button" className="btn-primary" onClick={handleSave} disabled={updateEmployee.isPending}>
            {updateEmployee.isPending ? 'Сохранение…' : 'Сохранить'}
          </button>
          <button
            type="button"
            className="text-sm font-semibold text-text-muted hover:text-text-primary"
            onClick={() => {
              resetForm();
              setEditing(false);
            }}
          >
            Отмена
          </button>
        </div>
        <FormError error={updateEmployee.error} />
      </li>
    );
  }

  return (
    <li className="py-2 flex items-center justify-between gap-3 text-sm">
      <div className="min-w-0">
        <span className={`font-medium ${employee.active ? 'text-text-primary' : 'text-text-muted line-through'}`}>
          {employee.name}
        </span>
        <span className="text-text-muted"> · {employee.role}</span>
        {employee.outlet && <span className="text-text-muted"> · {employee.outlet.name}</span>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            employee.active ? 'bg-success-light text-success' : 'bg-stone-100 text-text-muted'
          }`}
        >
          {employee.active ? 'активен' : 'отключён'}
        </span>
        <button type="button" className="text-sm font-semibold text-amber-dark hover:underline" onClick={() => setEditing(true)}>
          Изменить
        </button>
        <button
          type="button"
          className="text-sm font-semibold text-text-muted hover:text-theft"
          onClick={toggleActive}
          disabled={updateEmployee.isPending}
        >
          {employee.active ? 'Отключить' : 'Включить'}
        </button>
      </div>
    </li>
  );
}

export function EmployeesTab() {
  const employeesQuery = useEmployees();
  const outletsQuery = useOutlets();
  const createEmployee = useCreateEmployee();
  const [outletId, setOutletId] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<string>(ROLE_OPTIONS[0]);
  const [pin, setPin] = useState('');

  const outlets = outletsQuery.data ?? [];

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!outletId || !name || !pin) return;
    createEmployee.mutate(
      { outlet_id: outletId, name, role, pin },
      {
        onSuccess: () => {
          setName('');
          setPin('');
        },
      },
    );
  }

  const employees = employeesQuery.data ?? [];

  return (
    <SectionShell
      title="Сотрудники"
      loading={employeesQuery.isLoading}
      error={employeesQuery.error}
      form={
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <p className="text-sm font-bold text-text-primary mb-1">Новый сотрудник</p>
          <select className="select-input" value={outletId} onChange={e => setOutletId(e.target.value)}>
            <option value="">— точка —</option>
            {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <input className="text-input" placeholder="Имя" value={name} onChange={e => setName(e.target.value)} />
          <select className="select-input" value={role} onChange={e => setRole(e.target.value)}>
            {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <input className="text-input" placeholder="PIN" value={pin} onChange={e => setPin(e.target.value)} />
          <button type="submit" className="btn-primary mt-1" disabled={!outletId || !name || !pin || createEmployee.isPending}>
            {createEmployee.isPending ? 'Добавление…' : 'Добавить сотрудника'}
          </button>
          <FormError error={createEmployee.error} />
        </form>
      }
    >
      {employees.length === 0 ? (
        <p className="text-sm text-text-muted">Сотрудников пока нет</p>
      ) : (
        <ul className="divide-y divide-stone-100">
          {employees.map(emp => (
            <EmployeeRow key={emp.id} employee={emp} />
          ))}
        </ul>
      )}
    </SectionShell>
  );
}
