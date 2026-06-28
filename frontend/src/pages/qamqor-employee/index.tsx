import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, ChevronLeft, ChevronRight, Camera, AlertTriangle,
  CheckCircle2, Clock, XCircle, Home, ClipboardList, Lock,
  MapPin, Info, ArrowLeft, Utensils,
} from 'lucide-react';
import { useApp } from 'shared/qamqor-context/AppContext';
import { useAuth } from 'shared/auth/session';
import { apiClient, ApiError } from 'shared/api/client';
import { WRITE_OFF_REASONS, STAGES } from 'shared/qamqor-data/seed';
import type { Product, WriteOffRequest } from 'shared/qamqor-data/types';
import type { ReasonCode } from 'shared/api/types';

const REASON_CODE_MAP: Record<string, ReasonCode> = {
  expired: 'EXPIRED',
  'equipment-failure': 'OTHER',
  trimming: 'RAW_WASTE',
  drying: 'RAW_WASTE',
  dropped: 'DROPPED',
  overcooked: 'OVERCOOKED',
  'supplier-defect': 'DAMAGED',
  'short-delivery': 'OTHER',
};

const DEMO_EMPLOYEE = { id: '1001', name: 'Айгерим Сейткали', location: 'Bahandi Mega Silk Way', locationId: 'mega' };

type Tab = 'home' | 'requests';
type FormStep = 'product' | 'quantity' | 'reason' | 'stage' | 'photo' | 'comment' | 'review';
const STEP_ORDER: FormStep[] = ['product', 'quantity', 'reason', 'stage', 'photo', 'comment', 'review'];

function StatusBadge({ status }: { status: WriteOffRequest['status'] }) {
  if (status === 'pending') return (
    <span className="badge badge-orange"><Clock className="w-3 h-3" />На проверке</span>
  );
  if (status === 'approved') return (
    <span className="badge badge-green"><CheckCircle2 className="w-3 h-3" />Одобрено</span>
  );
  return <span className="badge badge-red"><XCircle className="w-3 h-3" />Отклонено</span>;
}

function formatDate(ts: string) {
  const d = new Date(ts);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) + ' ' +
    d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

/* Phone shell — renders children inside a phone-like frame */
function PhoneShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative flex flex-col overflow-hidden"
      style={{
        width: 390,
        height: 844,
        borderRadius: 50,
        boxShadow: '0 0 0 10px #2B2A28, 0 0 0 12px #3A3A38, 0 24px 64px rgba(0,0,0,0.35)',
        background: '#F8F8F8',
      }}
    >
      {/* Notch */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 z-20"
        style={{ width: 120, height: 34, background: '#2B2A28', borderRadius: '0 0 20px 20px' }}
      />
      {/* Status bar */}
      <div
        className="flex items-end justify-between px-6 flex-shrink-0"
        style={{ height: 50, background: '#FEFEFE', paddingBottom: 6 }}
      >
        <span className="text-[12px] font-semibold text-charcoal">9:41</span>
        <span className="text-[12px] font-semibold text-charcoal">●●●</span>
      </div>
      {/* Scrollable content */}
      <div className="flex-1 overflow-hidden flex flex-col" style={{ background: '#F8F8F8' }}>
        {children}
      </div>
      {/* Home bar */}
      <div className="flex items-center justify-center flex-shrink-0" style={{ height: 32, background: '#FEFEFE' }}>
        <div style={{ width: 120, height: 5, borderRadius: 3, background: '#2B2A28', opacity: 0.15 }} />
      </div>
    </div>
  );
}

export default function QamqorEmployee() {
  const navigate = useNavigate();
  const { requests, addRequest } = useApp();
  const { user } = useAuth();

  const [tab, setTab] = useState<Tab>('home');
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState<FormStep>('product');
  const [toast, setToast] = useState('');

  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reasonCode, setReasonCode] = useState('');
  const [stageCode, setStageCode] = useState('');
  const [photoId, setPhotoId] = useState('');
  const [comment, setComment] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [photoFile, setPhotoFile] = useState<{ filename: string; contentType: string; base64: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    apiClient.listProducts()
      .then(list => {
        if (!active) return;
        setProducts(list.map(p => ({ id: p.id, name: p.name, type: p.unit === 'штуки' ? 'unit' : 'weight', unit: p.unit, costPerUnit: p.cost_per_unit })));
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const myRequests = requests.filter(r => r.locationId === DEMO_EMPLOYEE.locationId);
  const product = products.find(p => p.id === productId);
  const TYPICAL_BATCH = 2000;
  const computedWastePercent = product?.type === 'weight' && quantity ? (parseFloat(quantity) / TYPICAL_BATCH) * 100 : undefined;
  const exceedsNorm = product?.wasteNorm !== undefined && computedWastePercent !== undefined ? computedWastePercent > product.wasteNorm : false;
  const availableReasons = product ? WRITE_OFF_REASONS.filter(r => !r.forTypes || r.forTypes.includes(product.type)) : WRITE_OFF_REASONS;
  const selectedReason = WRITE_OFF_REASONS.find(r => r.code === reasonCode);
  const selectedStage = STAGES.find(s => s.code === stageCode);
  const stepIndex = STEP_ORDER.indexOf(step);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  function resetForm() {
    setProductId(''); setQuantity(''); setReasonCode(''); setStageCode('');
    setPhotoId(''); setPhotoFile(null); setComment(''); setStep('product'); setShowForm(false);
  }

  function handlePhotoSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const base64 = result.includes(',') ? result.slice(result.indexOf(',') + 1) : result;
      setPhotoFile({ filename: file.name, contentType: file.type || 'image/jpeg', base64 });
      setPhotoId(file.name);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit() {
    if (!product || !selectedReason || !selectedStage || submitting) return;
    const employeeId = user?.id;
    const outletId = user?.outlet?.id ?? user?.outlet_id ?? null;
    if (!employeeId || !outletId) { showToast('Сессия не найдена — войдите заново'); return; }
    setSubmitting(true);
    let uploadedPhotoId: string | undefined;
    try {
      if (photoFile) {
        const photo = await apiClient.uploadPhoto(outletId, { filename: photoFile.filename, content_base64: photoFile.base64, content_type: photoFile.contentType, taken_at: new Date().toISOString() });
        uploadedPhotoId = photo.id;
      }
      await apiClient.createWriteOff({ outlet_id: outletId, employee_id: employeeId, product_id: product.id, photo_id: uploadedPhotoId, quantity: parseFloat(quantity), unit: product.unit, reason_code: REASON_CODE_MAP[selectedReason.code] ?? 'OTHER', deduction_type: 'NO_DEDUCTION', comment });
    } catch (err) {
      setSubmitting(false);
      showToast(err instanceof ApiError ? `Ошибка: ${err.code}` : 'Ошибка сети');
      return;
    }
    addRequest({
      id: `req-user-${Date.now()}`,
      employeeId, employeeName: user?.name ?? DEMO_EMPLOYEE.name,
      locationId: DEMO_EMPLOYEE.locationId, locationName: user?.outlet?.name ?? DEMO_EMPLOYEE.location,
      productId: product.id, productName: product.name, productType: product.type,
      quantity: parseFloat(quantity), wastePercent: computedWastePercent,
      reasonCode: selectedReason.code, reasonLabel: selectedReason.label,
      stageCode: selectedStage.code, stageLabel: selectedStage.label,
      comment, photoId: uploadedPhotoId ?? photoId ?? '',
      shift: 'Вечерняя (18:00–23:00)', timestamp: new Date().toISOString(),
      status: 'pending', writeOffType: exceedsNorm ? 'with_deduction' : 'no_deduction',
      aiSuggestedType: true, flags: exceedsNorm ? ['exceeds-norm'] : [],
    });
    setSubmitting(false);
    resetForm();
    setTab('requests');
    showToast('Заявка отправлена на проверку');
  }

  function canProceed() {
    if (step === 'product') return !!productId;
    if (step === 'quantity') return !!quantity && parseFloat(quantity) > 0;
    if (step === 'reason') return !!reasonCode;
    if (step === 'stage') return !!stageCode;
    if (step === 'photo') return true;
    if (step === 'comment') return comment.length >= 10;
    return true;
  }
  function nextStep() { const i = STEP_ORDER.indexOf(step); if (i < STEP_ORDER.length - 1) setStep(STEP_ORDER[i + 1]); }
  function prevStep() { const i = STEP_ORDER.indexOf(step); if (i > 0) setStep(STEP_ORDER[i - 1]); else { setShowForm(false); setStep('product'); } }

  /* --- styles shared by selection buttons inside the form --- */
  function selBtn(selected: boolean) {
    return {
      borderColor: selected ? '#198754' : '#F3F3F3',
      background: selected ? 'rgba(25,135,84,0.06)' : '#FEFEFE',
    } as React.CSSProperties;
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-8">
      <button onClick={() => navigate('/')} className="fixed top-6 left-6 flex items-center gap-2 text-muted hover:text-charcoal transition-colors text-[14px] font-medium z-50">
        <ArrowLeft className="w-4 h-4" />На главную
      </button>

      <PhoneShell>
        {!showForm ? (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 px-5 pt-3 pb-4" style={{ background: '#2B2A28' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold text-white" style={{ background: '#198754' }}>
                  {DEMO_EMPLOYEE.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <div className="text-white font-bold text-[14px]">{DEMO_EMPLOYEE.name}</div>
                  <div className="flex items-center gap-1 text-[12px]" style={{ color: '#999' }}>
                    <MapPin className="w-3 h-3" />{DEMO_EMPLOYEE.location.replace('Bahandi ', '')}
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">
              {tab === 'home' && (
                <div className="px-4 py-4 flex flex-col gap-3">
                  {/* New write-off CTA */}
                  <button
                    onClick={() => { setShowForm(true); setStep('product'); }}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl text-white text-left"
                    style={{ background: '#198754' }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>
                      <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-[15px]">Новая заявка на списание</div>
                      <div className="text-[13px] mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>Штучный или весовой товар</div>
                    </div>
                    <ChevronRight className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.5)' }} />
                  </button>

                  {/* Stats */}
                  <div className="card-sm p-4">
                    <p className="section-label mb-3">Статистика · июнь</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Заявок', value: myRequests.length, color: '#2B2A28' },
                        { label: 'Одобрено', value: myRequests.filter(r => r.status === 'approved').length, color: '#198754' },
                        { label: 'Проверка', value: myRequests.filter(r => r.status === 'pending').length, color: '#EA5E1F' },
                      ].map(s => (
                        <div key={s.label} className="text-center">
                          <div className="text-[20px] font-bold" style={{ color: s.color }}>{s.value}</div>
                          <div className="text-[11px] text-muted mt-0.5">{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent */}
                  {myRequests.length > 0 && (
                    <div>
                      <p className="section-label mb-2 px-1">Последние заявки</p>
                      <div className="flex flex-col gap-2">
                        {myRequests.slice(0, 3).map(req => (
                          <div key={req.id} className="card-sm flex items-center gap-3 p-3.5">
                            <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-[11px] font-bold" style={{ background: '#F3F3F3', color: '#999' }}>
                              {req.productName.slice(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] font-semibold text-charcoal truncate">{req.productName}</div>
                              <div className="text-[11px] text-muted">{formatDate(req.timestamp)}</div>
                            </div>
                            <StatusBadge status={req.status} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === 'requests' && (
                <div className="px-4 py-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold text-charcoal text-[14px]">Мои заявки</p>
                    <div className="flex items-center gap-1 text-muted text-[11px]">
                      <Lock className="w-3 h-3" />неизменяемый лог
                    </div>
                  </div>
                  {myRequests.length === 0 && (
                    <div className="text-center py-10 text-muted text-[13px]">Заявок пока нет</div>
                  )}
                  {myRequests.map(req => (
                    <div key={req.id} className="card-sm p-3.5">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-[11px]" style={{ background: '#F3F3F3', color: '#999' }}>
                          {req.productName.slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="text-[13px] font-semibold text-charcoal">{req.productName}</div>
                            <StatusBadge status={req.status} />
                          </div>
                          <div className="text-[11px] text-muted mt-0.5">{req.quantity} {req.productType === 'unit' ? 'шт' : 'г'} · {req.reasonLabel}</div>
                          <div className="text-[11px] text-muted">{formatDate(req.timestamp)}</div>
                          {req.status === 'rejected' && req.rejectionReason && (
                            <div className="mt-1.5 text-[11px] rounded-lg px-2.5 py-1.5" style={{ background: 'rgba(220,53,69,0.08)', color: '#DC3545' }}>
                              Причина: {req.rejectionReason}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom nav */}
            <div className="flex flex-shrink-0" style={{ borderTop: '1px solid #F3F3F3', background: '#FEFEFE' }}>
              {([
                { id: 'home' as Tab, icon: Home, label: 'Главная' },
                { id: 'requests' as Tab, icon: ClipboardList, label: 'Заявки' },
              ] as const).map(t => {
                const Icon = t.icon;
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className="flex-1 flex flex-col items-center py-2.5 gap-1 transition-colors"
                    style={{ color: active ? '#EA5E1F' : '#999' }}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[11px] font-medium">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Form header */}
            <div className="flex-shrink-0 px-5 pt-3 pb-4" style={{ background: '#2B2A28' }}>
              <button onClick={prevStep} className="flex items-center gap-1 text-[13px] mb-3" style={{ color: '#999' }}>
                <ChevronLeft className="w-4 h-4" />{step === 'product' ? 'Отмена' : 'Назад'}
              </button>
              <div className="text-white font-bold text-[15px] mb-3">Новое списание</div>
              {/* Progress bar */}
              <div className="flex gap-1">
                {STEP_ORDER.map((s, i) => (
                  <div key={s} className="h-1 flex-1 rounded-full transition-colors" style={{
                    background: i <= stepIndex ? '#198754' : 'rgba(255,255,255,0.15)',
                    opacity: i === stepIndex ? 1 : i < stepIndex ? 0.7 : 0.3,
                  }} />
                ))}
              </div>
            </div>

            {/* Form body */}
            <div className="flex-1 overflow-y-auto px-4 py-5">
              {step === 'product' && (
                <div>
                  <p className="font-bold text-charcoal text-[15px] mb-1">Выберите товар</p>
                  <p className="text-muted text-[13px] mb-4">Что списываем?</p>
                  <div className="flex flex-col gap-2">
                    {products.map(p => (
                      <button key={p.id} onClick={() => setProductId(p.id)}
                        className="flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all"
                        style={selBtn(productId === p.id)}
                      >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                          style={{ background: p.type === 'unit' ? 'rgba(25,135,84,0.1)' : 'rgba(234,94,31,0.1)', color: p.type === 'unit' ? '#198754' : '#EA5E1F' }}>
                          {p.type === 'unit' ? 'шт' : 'кг'}
                        </div>
                        <div className="flex-1">
                          <div className="text-[13px] font-semibold text-charcoal">{p.name}</div>
                          <div className="text-[11px] text-muted">{p.type === 'unit' ? 'штучный' : 'весовой'}{p.type === 'weight' && p.wasteNorm ? ` · норма ${p.wasteNorm}%` : ''}</div>
                        </div>
                        {productId === p.id && <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: '#198754' }} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 'quantity' && product && (
                <div>
                  <p className="font-bold text-charcoal text-[15px] mb-1">{product.type === 'unit' ? 'Количество (штук)' : 'Масса отхода (граммы)'}</p>
                  <p className="text-muted text-[13px] mb-4">{product.name}</p>
                  <input type="number" className="input text-[20px] font-bold" placeholder="0"
                    value={quantity} onChange={e => setQuantity(e.target.value)} min="0"
                    style={{ borderColor: exceedsNorm ? '#EA5E1F' : undefined }}
                  />
                  {product.type === 'weight' && product.wasteNorm && quantity && (
                    <div className="mt-3 p-3.5 rounded-xl flex gap-2.5"
                      style={{ background: exceedsNorm ? 'rgba(234,94,31,0.08)' : 'rgba(25,135,84,0.08)' }}>
                      {exceedsNorm
                        ? <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#EA5E1F' }} />
                        : <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#198754' }} />}
                      <div>
                        <p className="text-[13px] font-semibold" style={{ color: exceedsNorm ? '#EA5E1F' : '#198754' }}>
                          {exceedsNorm ? `~${computedWastePercent?.toFixed(1)}% — превышение нормы!` : `~${computedWastePercent?.toFixed(1)}% — в норме`}
                        </p>
                        <p className="text-[11px] text-muted mt-0.5">Норма: {product.wasteNorm}%</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {step === 'reason' && (
                <div>
                  <p className="font-bold text-charcoal text-[15px] mb-1">Причина списания</p>
                  <p className="text-muted text-[13px] mb-4">Выберите из списка</p>
                  <div className="flex flex-col gap-2">
                    {availableReasons.map(r => (
                      <button key={r.code} onClick={() => setReasonCode(r.code)}
                        className="flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all"
                        style={selBtn(reasonCode === r.code)}
                      >
                        <div className="flex-1 text-[13px] font-medium text-charcoal">{r.label}</div>
                        {reasonCode === r.code && <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: '#198754' }} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 'stage' && (
                <div>
                  <p className="font-bold text-charcoal text-[15px] mb-1">Этап производства</p>
                  <p className="text-muted text-[13px] mb-4">На каком этапе произошло?</p>
                  <div className="flex flex-col gap-2">
                    {STAGES.map(s => (
                      <button key={s.code} onClick={() => setStageCode(s.code)}
                        className="flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all"
                        style={selBtn(stageCode === s.code)}
                      >
                        <div className="flex-1 text-[13px] font-medium text-charcoal">{s.label}</div>
                        {stageCode === s.code && <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: '#198754' }} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 'photo' && (
                <div>
                  <p className="font-bold text-charcoal text-[15px] mb-1">Фото</p>
                  <p className="text-muted text-[13px] mb-4">Сделайте снимок продукта</p>
                  <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoSelected} />
                  {!photoId ? (
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="w-full h-48 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all"
                      style={{ borderColor: '#198754', background: 'rgba(25,135,84,0.05)' }}
                    >
                      <Camera className="w-10 h-10" style={{ color: '#198754' }} />
                      <span className="text-[14px] font-semibold" style={{ color: '#198754' }}>Сделать фото</span>
                    </button>
                  ) : (
                    <div>
                      <div className="w-full h-48 rounded-xl flex items-center justify-center" style={{ background: 'rgba(25,135,84,0.08)' }}>
                        <Camera className="w-10 h-10" style={{ color: '#198754', opacity: 0.5 }} />
                      </div>
                      <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-[12px]" style={{ background: 'rgba(25,135,84,0.08)', color: '#198754' }}>
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                        фото прикреплено
                      </div>
                      <button onClick={() => { setPhotoId(''); setPhotoFile(null); }} className="mt-1.5 text-[12px] text-muted underline">
                        Переснять
                      </button>
                    </div>
                  )}
                  <div className="mt-4 flex items-start gap-2 text-[12px] text-muted">
                    <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>EXIF-данные формируются приложением и не редактируются.</span>
                  </div>
                </div>
              )}

              {step === 'comment' && (
                <div>
                  <p className="font-bold text-charcoal text-[15px] mb-1">Комментарий</p>
                  <p className="text-muted text-[13px] mb-4">Минимум 10 символов</p>
                  <textarea className="input" rows={5}
                    placeholder="Например: помидоры пришли мягкие, часть с тёмными пятнами..."
                    value={comment} onChange={e => setComment(e.target.value)}
                  />
                  <div className="text-[11px] mt-1 text-right" style={{ color: comment.length >= 10 ? '#198754' : '#999' }}>
                    {comment.length} / 10+
                  </div>
                </div>
              )}

              {step === 'review' && product && selectedReason && selectedStage && (
                <div>
                  <p className="font-bold text-charcoal text-[15px] mb-4">Проверьте заявку</p>
                  <div className="card-sm p-4 flex flex-col gap-3 mb-3">
                    {[
                      { label: 'Товар', value: product.name },
                      { label: 'Количество', value: `${quantity} ${product.type === 'unit' ? 'шт' : 'г'}` },
                      { label: 'Причина', value: selectedReason.label },
                      { label: 'Этап', value: selectedStage.label },
                      { label: 'Фото', value: photoId ? '✓ прикреплено' : '—' },
                      { label: 'Комментарий', value: comment },
                    ].map(row => (
                      <div key={row.label} className="flex gap-3">
                        <span className="text-[12px] text-muted w-24 flex-shrink-0 pt-0.5">{row.label}</span>
                        <span className="text-[13px] font-medium text-charcoal break-words flex-1">{row.value}</span>
                      </div>
                    ))}
                  </div>
                  {exceedsNorm && (
                    <div className="mb-3 p-3 rounded-xl flex items-center gap-2" style={{ background: 'rgba(234,94,31,0.08)' }}>
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#EA5E1F' }} />
                      <p className="text-[12px] font-semibold" style={{ color: '#EA5E1F' }}>Будет отмечена: превышение нормы</p>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-[11px] text-muted">
                    <Lock className="w-3 h-3" />После отправки заявка не редактируется — неизменяемый лог
                  </div>
                </div>
              )}
            </div>

            {/* Footer button */}
            <div className="flex-shrink-0 px-4 pb-4 pt-3" style={{ borderTop: '1px solid #F3F3F3', background: '#FEFEFE' }}>
              {step === 'review' ? (
                <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary">
                  {submitting ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Отправить заявку'}
                </button>
              ) : (
                <button onClick={nextStep} disabled={!canProceed()} className="btn btn-primary">
                  Далее <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </PhoneShell>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
