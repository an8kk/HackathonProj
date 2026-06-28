import { useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Smartphone, ClipboardCheck, BarChart3, ChevronRight, TrendingDown } from 'lucide-react';
import { useAuth } from 'shared/auth/session';
import { useLogin } from 'shared/api/queries';
import { ApiError } from 'shared/api/client';
import type { Role } from 'shared/api/types';
const ROLE_ROUTES: Record<Role, string> = {
  sender: '/employee',
  reviewer: '/manager',
  owner: '/dashboard',
};

const roles = [
  {
    path: '/employee',
    pin: '1111',
    icon: Smartphone,
    title: 'Сотрудник',
    subtitle: 'Подать заявку на списание',
    desc: 'Мобильный вид · Повар Айгерим С.',
    accent: '#F5A300',
  },
  {
    path: '/manager',
    pin: '2222',
    icon: ClipboardCheck,
    title: 'Менеджер',
    subtitle: 'Проверить и одобрить заявки',
    desc: 'Рабочий стол · очередь на проверке',
    accent: '#F5A300',
  },
  {
    path: '/dashboard',
    pin: '9999',
    icon: BarChart3,
    title: 'Владелец',
    subtitle: 'Аналитика и контроль сети',
    desc: 'Дашборд · 5 точек · Алматы',
    accent: '#F5A300',
  },
];

export default function QamqorLanding() {
  const navigate = useNavigate();
  const { applySession } = useAuth();
  const loginMutation = useLogin();
  const pinRef = useRef<HTMLInputElement>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const submitting = loginMutation.isPending;
  async function loginWithPin(value: string) {
    if (submitting) return;
    setError('');
    try {
      const user = await loginMutation.mutateAsync(value);
      applySession(user);
      navigate(ROLE_ROUTES[user.role] ?? '/');
    } catch (err) {
      setError(err instanceof ApiError ? err.code : 'network_error');
    }
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    if (!pin) return;
    await loginWithPin(pin.trim());
  }
  return (
    <div className="min-h-screen bg-ink flex flex-col items-center justify-center px-4 py-12">
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'radial-gradient(circle at 25% 25%, #F5A300 0%, transparent 50%), radial-gradient(circle at 75% 75%, #F5A300 0%, transparent 50%)',
        }}
      />

      <div className="relative z-10 w-full max-w-2xl mx-auto flex flex-col items-center">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-DEFAULT flex items-center justify-center shadow-lg shadow-amber-DEFAULT/30">
            <Shield className="w-8 h-8 text-ink" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">Qamqor</h1>
            <p className="text-text-muted text-sm font-medium tracking-widest uppercase mt-0.5">Bahandi · 5 точек</p>
          </div>
        </div>

        <div className="text-center mb-2">
          <p className="text-2xl font-bold text-white leading-snug">
            Форма ловит ошибку.
          </p>
          <p className="text-2xl font-bold leading-snug" style={{ color: '#F5A300' }}>
            Мы ловим вора.
          </p>
        </div>

        <div className="flex gap-6 mt-6 mb-10">
          {[
            { label: 'Точек под контролем', value: '5' },
            { label: 'Недостача · июнь', value: '₸812K' },
            { label: 'Точек в красной зоне', value: '1' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="text-2xl font-black text-amber-DEFAULT">{s.value}</div>
              <div className="text-xs text-text-muted mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        <form onSubmit={handleLogin} className="w-full mb-6">
          <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider text-center mb-2">
            Введите PIN для входа
          </label>
          <div className="flex gap-2">
            <input
              ref={pinRef}
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={pin}
              onChange={e => { setPin(e.target.value); setError(''); }}
              placeholder="PIN"
              className="flex-1 rounded-2xl px-5 py-4 text-white text-lg tracking-widest text-center outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <button
              type="submit"
              disabled={!pin || submitting}
              className="px-6 rounded-2xl font-bold text-ink transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: '#F5A300' }}
            >
              {submitting ? '…' : 'Войти'}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-center text-sm font-medium" style={{ color: '#FF6B6B' }}>
              {error === 'invalid_pin' ? 'Неверный PIN' : `Ошибка: ${error}`}
            </p>
          )}
        </form>
        <div className="w-full flex flex-col gap-4">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider text-center mb-1">
            Демо-вход · нажмите роль для входа
          </p>
          {roles.map(role => {
            const Icon = role.icon;
            return (
              <button
                key={role.path}
                type="button"
                disabled={submitting}
                onClick={() => loginWithPin(role.pin)}
                className="w-full flex items-center gap-5 p-5 rounded-2xl text-left transition-all duration-150 hover:scale-[1.01] active:scale-[0.99]"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(8px)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.border = `1px solid ${role.accent}40`;
                  (e.currentTarget as HTMLElement).style.background = 'rgba(245,163,0,0.06)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.border = '1px solid rgba(255,255,255,0.1)';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(245,163,0,0.15)' }}
                >
                  <Icon className="w-6 h-6" style={{ color: role.accent }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-bold text-lg">{role.title}</div>
                  <div className="text-white/70 text-sm mt-0.5">{role.subtitle}</div>
                  <div className="text-text-muted text-xs mt-1">{role.desc}</div>
                </div>
                <div className="flex flex-col items-end flex-shrink-0">
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-bold mb-1"
                    style={{ background: 'rgba(245,163,0,0.15)', color: role.accent }}
                  >
                    PIN {role.pin}
                  </span>
                  <ChevronRight className="w-5 h-5 text-text-muted" />
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-10 flex items-center gap-2 text-text-muted text-xs">
          <TrendingDown className="w-3.5 h-3.5" />
          <span>Данные засеяны · вход по PIN через бэкенд</span>
        </div>
      </div>
    </div>
  );
}
