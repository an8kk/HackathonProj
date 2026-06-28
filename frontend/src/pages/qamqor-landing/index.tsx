import { useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, ClipboardCheck, BarChart3, ChevronRight, Lock, Utensils } from 'lucide-react';
import { useAuth } from 'shared/auth/session';
import { ApiError } from 'shared/api/client';
import type { Role } from 'shared/api/types';

const ROLE_ROUTES: Record<Role, string> = {
  sender: '/employee',
  reviewer: '/manager',
  owner: '/dashboard',
};

const roles = [
  { path: '/employee', icon: Smartphone, title: 'Сотрудник', subtitle: 'Подать заявку на списание' },
  { path: '/manager', icon: ClipboardCheck, title: 'Менеджер', subtitle: 'Проверить и одобрить заявки' },
  { path: '/dashboard', icon: BarChart3, title: 'Владелец', subtitle: 'Аналитика и контроль сети' },
];

export default function QamqorLanding() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const pinRef = useRef<HTMLInputElement>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    if (!pin || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const user = await login(pin);
      navigate(ROLE_ROUTES[user.role] ?? '/');
    } catch (err) {
      setError(err instanceof ApiError ? err.code : 'network_error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm flex flex-col">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: '#198754' }}>
            <Utensils className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <span className="text-xl font-bold text-charcoal">Bahandi</span>
          <span className="text-xl font-normal text-muted">Reporter</span>
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-charcoal mb-1">Вход</h1>
        <p className="text-muted text-[15px] mb-8">Введите PIN-код для входа</p>

        {/* Login card */}
        <div className="card p-5 mb-6">
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                ref={pinRef}
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={pin}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setPin(e.target.value); setError(''); }}
                placeholder="PIN-код"
                maxLength={6}
                className="input pl-10"
              />
            </div>

            {error && (
              <p className="text-[13px] font-medium" style={{ color: '#DC3545' }}>
                {error === 'invalid_pin' ? 'Неверный PIN-код' : 'Не удалось войти. Проверьте подключение.'}
              </p>
            )}

            <button
              type="submit"
              disabled={!pin || submitting}
              className="btn btn-primary"
            >
              {submitting ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : 'Войти'}
            </button>

            <p className="text-[12px] text-muted">
              Демо: <span className="font-mono">1111</span> · <span className="font-mono">2222</span> · <span className="font-mono">9999</span> · <span className="font-mono">3333</span>
            </p>
          </form>
        </div>

        {/* Role list */}
        <p className="section-label mb-3">Роли в системе</p>
        <div className="flex flex-col gap-2">
          {roles.map(role => {
            const Icon = role.icon;
            return (
              <button
                key={role.path}
                type="button"
                onClick={() => pinRef.current?.focus()}
                className="card-sm flex items-center gap-4 p-4 text-left w-full transition-colors hover:bg-surface-hover"
              >
                <div className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(25,135,84,0.1)' }}>
                  <Icon className="w-5 h-5" style={{ color: '#198754' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-charcoal text-[15px]">{role.title}</div>
                  <div className="text-muted text-[13px] mt-0.5">{role.subtitle}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted flex-shrink-0" />
              </button>
            );
          })}
        </div>

        <p className="text-[12px] text-muted text-center mt-10">Bahandi Burger © 2025</p>
      </div>
    </div>
  );
}
