import { useState, useId, useMemo, useRef, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, ChevronLeft, ChevronRight, Camera, AlertTriangle,
  CheckCircle2, Clock, XCircle, Home, ClipboardList, Lock,
  MapPin, User, Info, ArrowLeft,
} from 'lucide-react';
import { useApp } from 'shared/qamqor-context/AppContext';
import { useAuth } from 'shared/auth/session';
import { ApiError } from 'shared/api/client';
import { useCreateWriteOff, useProducts, useUploadPhoto } from 'shared/api/queries';
import { WRITE_OFF_REASONS, STAGES } from 'shared/qamqor-data/seed';
import type { Product, WriteOffRequest } from 'shared/qamqor-data/types';
import type { ReasonCode } from 'shared/api/types';
// UI reason codes (seed) → backend ReasonCode enum.
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

const PHOTO_PLACEHOLDERS = [
  { id: 'photo-new-A', color: '#E8F5E9', label: 'Помидоры' },
  { id: 'photo-new-B', color: '#FFF3CC', label: 'Котлеты' },
  { id: 'photo-new-C', color: '#FDE8E8', label: 'Продукт' },
];

function PhotoPlaceholder({ id, color }: { id: string; color: string }) {
  return (
    <div
      className="w-full h-48 rounded-xl flex flex-col items-center justify-center gap-2"
      style={{ background: color }}
    >
      <Camera className="w-10 h-10 text-text-muted" />
      <span className="text-sm text-text-muted font-medium">Фото #{id.slice(-1)}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: WriteOffRequest['status'] }) {
  if (status === 'pending') return (
    <span className="badge badge-amber">
      <Clock className="w-3 h-3" /> На проверке
    </span>
  );
  if (status === 'approved') return (
    <span className="badge badge-green">
      <CheckCircle2 className="w-3 h-3" /> Одобрено
    </span>
  );
  return (
    <span className="badge badge-red">
      <XCircle className="w-3 h-3" /> Отклонено
    </span>
  );
}

function formatDate(ts: string) {
  const d = new Date(ts);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) + ' ' +
    d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export default function QamqorEmployee() {
  const navigate = useNavigate();
  const { requests, addRequest } = useApp();
  const { user } = useAuth();
  const uid = useId();

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
  const productsQuery = useProducts();
  const products = useMemo<Product[]>(
    () =>
      (productsQuery.data ?? []).map(p => ({
        id: p.id,
        name: p.name,
        type: p.unit === 'штуки' ? 'unit' : 'weight',
        unit: p.unit,
        costPerUnit: p.cost_per_unit,
      })),
    [productsQuery.data],
  );
  const [photoFile, setPhotoFile] = useState<{ filename: string; contentType: string; base64: string } | null>(null);
  const uploadPhoto = useUploadPhoto();
  const createWriteOff = useCreateWriteOff();
  const submitting = uploadPhoto.isPending || createWriteOff.isPending;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const myRequests = requests.filter(r => r.locationId === DEMO_EMPLOYEE.locationId);

  const product = products.find(p => p.id === productId);

  const TYPICAL_BATCH = 2000;
  const computedWastePercent = product?.type === 'weight' && quantity
    ? (parseFloat(quantity) / TYPICAL_BATCH) * 100
    : undefined;

  const exceedsNorm = product?.wasteNorm !== undefined && computedWastePercent !== undefined
    ? computedWastePercent > product.wasteNorm
    : false;

  const availableReasons = reasonCode ? WRITE_OFF_REASONS :
    product ? WRITE_OFF_REASONS.filter(r => !r.forTypes || r.forTypes.includes(product.type)) : WRITE_OFF_REASONS;

  const selectedReason = WRITE_OFF_REASONS.find(r => r.code === reasonCode);
  const selectedStage = STAGES.find(s => s.code === stageCode);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  function resetForm() {
    setProductId('');
    setQuantity('');
    setReasonCode('');
    setStageCode('');
    setPhotoId('');
    setPhotoFile(null);
    setComment('');
    setStep('product');
    setShowForm(false);
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

  function buildFlags(): string[] {
    const flags: string[] = [];
    if (exceedsNorm) flags.push('exceeds-norm');
    if (reasonCode === 'supplier-defect') flags.push('supplier-anomaly');
    return flags;
  }

  async function handleSubmit() {
    if (!product || !selectedReason || !selectedStage || submitting) return;
    const employeeId = user?.id;
    const outletId = user?.outlet?.id ?? user?.outlet_id ?? null;
    if (!employeeId || !outletId) {
      showToast('Сессия не найдена — войдите заново');
      return;
    }
    let uploadedPhotoId: string | undefined;
    try {
      if (photoFile) {
        const photo = await uploadPhoto.mutateAsync({
          outletId,
          body: {
            filename: photoFile.filename,
            content_base64: photoFile.base64,
            content_type: photoFile.contentType,
            taken_at: new Date().toISOString(),
          },
        });
        uploadedPhotoId = photo.id;
      }
      await createWriteOff.mutateAsync({
        outlet_id: outletId,
        employee_id: employeeId,
        product_id: product.id,
        photo_id: uploadedPhotoId,
        quantity: parseFloat(quantity),
        unit: product.unit,
        reason_code: REASON_CODE_MAP[selectedReason.code] ?? 'OTHER',
        deduction_type: 'NO_DEDUCTION',
        comment,
      });
    } catch (err) {
      showToast(err instanceof ApiError ? `Ошибка: ${err.code}` : 'Ошибка сети');
      return;
    }
    const req: WriteOffRequest = {
      id: `req-user-${Date.now()}`,
      employeeId,
      employeeName: user?.name ?? DEMO_EMPLOYEE.name,
      locationId: DEMO_EMPLOYEE.locationId,
      locationName: user?.outlet?.name ?? DEMO_EMPLOYEE.location,
      productId: product.id,
      productName: product.name,
      productType: product.type,
      quantity: parseFloat(quantity),
      wastePercent: computedWastePercent,
      reasonCode: selectedReason.code,
      reasonLabel: selectedReason.label,
      stageCode: selectedStage.code,
      stageLabel: selectedStage.label,
      comment,
      photoId: uploadedPhotoId ?? photoId ?? '',
      shift: 'Вечерняя (18:00–23:00)',
      timestamp: new Date().toISOString(),
      status: 'pending',
      writeOffType: exceedsNorm ? 'with_deduction' : 'no_deduction',
      aiSuggestedType: true,
      flags: buildFlags(),
    };
    addRequest(req);
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

  function nextStep() {
    const idx = STEP_ORDER.indexOf(step);
    if (idx < STEP_ORDER.length - 1) setStep(STEP_ORDER[idx + 1]);
  }

  function prevStep() {
    const idx = STEP_ORDER.indexOf(step);
    if (idx > 0) setStep(STEP_ORDER[idx - 1]);
    else { setShowForm(false); setStep('product'); }
  }

  const stepIndex = STEP_ORDER.indexOf(step);

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-8">
      <button
        onClick={() => navigate('/')}
        className="fixed top-6 left-6 flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm font-medium z-50"
      >
        <ArrowLeft className="w-4 h-4" />
        На главную
      </button>

      <div className="phone-frame">
        <div className="phone-notch" />
        <div className="phone-inner">
          <div className="phone-statusbar">
            <span className="text-xs font-semibold text-text-primary">9:41</span>
            <span className="text-xs font-semibold text-text-primary">●●●</span>
          </div>

          <div className="phone-content">
            {!showForm ? (
              <>
                <div className="bg-ink px-5 pt-2 pb-5">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-9 h-9 rounded-full bg-amber-DEFAULT flex items-center justify-center">
                      <User className="w-4 h-4 text-ink" />
                    </div>
                    <div>
                      <div className="text-white font-bold text-sm">{DEMO_EMPLOYEE.name}</div>
                      <div className="flex items-center gap-1 text-text-muted text-xs">
                        <MapPin className="w-3 h-3" />
                        {DEMO_EMPLOYEE.location}
                      </div>
                    </div>
                  </div>
                </div>

                {tab === 'home' && (
                  <div className="px-4 py-5 flex flex-col gap-4">
                    <button
                      onClick={() => { setShowForm(true); setStep('product'); }}
                      className="w-full btn-primary py-5 rounded-2xl text-base shadow-lg"
                      style={{ background: '#F5A300', color: '#141210' }}
                    >
                      <Plus className="w-5 h-5" strokeWidth={2.5} />
                      Новое списание
                    </button>

                    <div className="card p-4">
                      <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Моя статистика · июнь</p>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: 'Заявок', value: myRequests.length },
                          { label: 'Одобрено', value: myRequests.filter(r => r.status === 'approved').length },
                          { label: 'На проверке', value: myRequests.filter(r => r.status === 'pending').length },
                        ].map(s => (
                          <div key={s.label} className="text-center">
                            <div className="text-xl font-black text-text-primary">{s.value}</div>
                            <div className="text-xs text-text-muted mt-0.5">{s.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 px-1">Последние заявки</p>
                      <div className="flex flex-col gap-2">
                        {myRequests.slice(0, 3).map(req => (
                          <div key={req.id} className="card p-3.5 flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-bold"
                              style={{ background: '#F6F3EE', color: '#8C8780' }}
                            >
                              {req.productName.slice(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-text-primary truncate">{req.productName}</div>
                              <div className="text-xs text-text-muted">{formatDate(req.timestamp)}</div>
                            </div>
                            <StatusBadge status={req.status} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {tab === 'requests' && (
                  <div className="px-4 py-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-bold text-text-primary">Мои заявки</p>
                      <div className="flex items-center gap-1 text-text-muted text-xs">
                        <Lock className="w-3 h-3" />
                        <span>неизменяемый лог</span>
                      </div>
                    </div>
                    {myRequests.length === 0 && (
                      <div className="text-center py-10 text-text-muted text-sm">
                        Заявок пока нет
                      </div>
                    )}
                    {myRequests.map(req => (
                      <div key={req.id} className="card p-4">
                        <div className="flex items-start gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-xs"
                            style={{ background: '#F6F3EE', color: '#8C8780' }}
                          >
                            {req.productName.slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="text-sm font-semibold text-text-primary">{req.productName}</div>
                              <StatusBadge status={req.status} />
                            </div>
                            <div className="text-xs text-text-muted mt-0.5">
                              {req.quantity} {req.productType === 'unit' ? 'шт' : 'г'} · {req.reasonLabel}
                            </div>
                            <div className="text-xs text-text-muted">{formatDate(req.timestamp)}</div>
                            {req.status === 'rejected' && req.rejectionReason && (
                              <div className="mt-2 text-xs text-theft bg-theft-light rounded-lg px-2.5 py-1.5">
                                Причина: {req.rejectionReason}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col h-full">
                <div className="bg-ink px-5 pt-2 pb-4 flex-shrink-0">
                  <button onClick={prevStep} className="flex items-center gap-1 text-text-muted text-sm mb-3">
                    <ChevronLeft className="w-4 h-4" />
                    {step === 'product' ? 'Отмена' : 'Назад'}
                  </button>
                  <div className="text-white font-bold text-base">Новое списание</div>
                  <div className="flex gap-1 mt-3">
                    {STEP_ORDER.map((s, i) => (
                      <div
                        key={s}
                        className="h-1 flex-1 rounded-full transition-colors"
                        style={{
                          background: i <= stepIndex ? '#F5A300' : 'rgba(255,255,255,0.15)',
                          opacity: i === stepIndex ? 1 : i < stepIndex ? 0.8 : 0.3,
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-5">
                  {step === 'product' && (
                    <div>
                      <p className="text-base font-bold text-text-primary mb-1">Выберите товар</p>
                      <p className="text-sm text-text-muted mb-4">Что списываем?</p>
                      <div className="flex flex-col gap-2">
                        {products.map(p => (
                          <button
                            key={p.id}
                            onClick={() => setProductId(p.id)}
                            className="flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all"
                            style={{
                              borderColor: productId === p.id ? '#F5A300' : '#E0DDD9',
                              background: productId === p.id ? '#FFF3CC' : '#fff',
                            }}
                          >
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                              style={{ background: p.type === 'unit' ? '#E8F5E9' : '#FFF3CC', color: p.type === 'unit' ? '#2E7D32' : '#C47F00' }}
                            >
                              {p.type === 'unit' ? 'шт' : 'кг'}
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-text-primary">{p.name}</div>
                              <div className="text-xs text-text-muted">
                                {p.type === 'unit' ? 'штучный · ' : 'весовой · '}
                                {p.type === 'weight' && p.wasteNorm ? `норма отхода ${p.wasteNorm}%` : `₸${p.costPerUnit}/шт`}
                              </div>
                            </div>
                            {productId === p.id && <CheckCircle2 className="w-5 h-5 text-amber-DEFAULT flex-shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {step === 'quantity' && product && (
                    <div>
                      <p className="text-base font-bold text-text-primary mb-1">
                        {product.type === 'unit' ? 'Количество (штук)' : 'Масса отхода (граммы)'}
                      </p>
                      <p className="text-sm text-text-muted mb-4">{product.name}</p>
                      <input
                        type="number"
                        className={`text-input text-xl font-bold ${exceedsNorm ? 'warn' : ''}`}
                        placeholder={product.type === 'unit' ? '0' : '0 г'}
                        value={quantity}
                        onChange={e => setQuantity(e.target.value)}
                        min="0"
                      />
                      {product.type === 'weight' && product.wasteNorm && quantity && (
                        <div className={`mt-3 p-3.5 rounded-xl flex gap-2.5 ${exceedsNorm ? 'bg-amber-light' : 'bg-success-light'}`}>
                          {exceedsNorm ? (
                            <AlertTriangle className="w-4 h-4 text-amber-DEFAULT flex-shrink-0 mt-0.5" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p className={`text-sm font-semibold ${exceedsNorm ? 'text-amber-dark' : 'text-success'}`}>
                              {exceedsNorm
                                ? `Вы вводите ~${computedWastePercent?.toFixed(1)}% — превышение нормы!`
                                : `Вы вводите ~${computedWastePercent?.toFixed(1)}% — в норме`}
                            </p>
                            <p className="text-xs text-text-muted mt-0.5">
                              Норма отхода для {product.name.toLowerCase()}: {product.wasteNorm}%
                            </p>
                            {exceedsNorm && (
                              <p className="text-xs text-amber-dark mt-1 font-medium">
                                Заявка будет отмечена для проверки менеджером.
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {step === 'reason' && (
                    <div>
                      <p className="text-base font-bold text-text-primary mb-1">Причина списания</p>
                      <p className="text-sm text-text-muted mb-4">Выберите из списка</p>
                      <div className="flex flex-col gap-2">
                        {availableReasons.map(r => (
                          <button
                            key={r.code}
                            onClick={() => setReasonCode(r.code)}
                            className="flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all"
                            style={{
                              borderColor: reasonCode === r.code ? '#F5A300' : '#E0DDD9',
                              background: reasonCode === r.code ? '#FFF3CC' : '#fff',
                            }}
                          >
                            <div className="flex-1 text-sm font-medium text-text-primary">{r.label}</div>
                            {reasonCode === r.code && <CheckCircle2 className="w-5 h-5 text-amber-DEFAULT flex-shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {step === 'stage' && (
                    <div>
                      <p className="text-base font-bold text-text-primary mb-1">Этап производства</p>
                      <p className="text-sm text-text-muted mb-4">На каком этапе произошло?</p>
                      <div className="flex flex-col gap-2">
                        {STAGES.map(s => (
                          <button
                            key={s.code}
                            onClick={() => setStageCode(s.code)}
                            className="flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all"
                            style={{
                              borderColor: stageCode === s.code ? '#F5A300' : '#E0DDD9',
                              background: stageCode === s.code ? '#FFF3CC' : '#fff',
                            }}
                          >
                            <div className="flex-1 text-sm font-medium text-text-primary">{s.label}</div>
                            {stageCode === s.code && <CheckCircle2 className="w-5 h-5 text-amber-DEFAULT flex-shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {step === 'photo' && (
                    <div>
                      <p className="text-base font-bold text-text-primary mb-1">Фото</p>
                      <p className="text-sm text-text-muted mb-4">Сделайте снимок продукта</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handlePhotoSelected}
                      />

                      {!photoId ? (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full h-48 rounded-2xl border-2 border-dashed border-amber-DEFAULT bg-amber-light flex flex-col items-center justify-center gap-3 transition-all hover:bg-amber-light/80"
                        >
                          <Camera className="w-10 h-10 text-amber-dark" />
                          <span className="text-sm font-semibold text-amber-dark">Сделать фото</span>
                        </button>
                      ) : (
                        <div>
                          <PhotoPlaceholder id="A" color="#E8F5E9" />
                          <div
                            className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium"
                            style={{ background: '#E8F5E9', color: '#2E7D32' }}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>фото сделано в приложении · {new Date().toLocaleDateString('ru-RU', {day:'2-digit',month:'2-digit'})} · {DEMO_EMPLOYEE.location.replace('Bahandi ','')}</span>
                          </div>
                          <button onClick={() => { setPhotoId(''); setPhotoFile(null); }} className="mt-2 text-xs text-text-muted underline">
                            Переснять
                          </button>
                        </div>
                      )}

                      <div className="mt-4 flex items-start gap-2 text-xs text-text-muted">
                        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <span>Фото привязывается к заявке автоматически. EXIF-данные (время, точка) формируются приложением и не редактируются.</span>
                      </div>
                    </div>
                  )}

                  {step === 'comment' && (
                    <div>
                      <p className="text-base font-bold text-text-primary mb-1">Комментарий</p>
                      <p className="text-sm text-text-muted mb-4">Минимум 10 символов — опишите ситуацию</p>
                      <textarea
                        className="text-input"
                        rows={5}
                        placeholder="Например: помидоры пришли мягкие, часть с тёмными пятнами, при обрезке ушло больше обычного..."
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                      />
                      <div className={`text-xs mt-1.5 text-right ${comment.length < 10 ? 'text-text-muted' : 'text-success'}`}>
                        {comment.length} / 10+
                      </div>
                    </div>
                  )}

                  {step === 'review' && product && selectedReason && selectedStage && (
                    <div>
                      <p className="text-base font-bold text-text-primary mb-4">Проверьте заявку</p>
                      <div className="card p-4 flex flex-col gap-3">
                        {[
                          { label: 'Товар', value: product.name },
                          { label: 'Количество', value: `${quantity} ${product.type === 'unit' ? 'шт' : 'г'}` },
                          { label: 'Причина', value: selectedReason.label },
                          { label: 'Этап', value: selectedStage.label },
                          { label: 'Фото', value: photoId ? '✓ прикреплено' : '—' },
                          { label: 'Комментарий', value: comment },
                        ].map(row => (
                          <div key={row.label} className="flex gap-3">
                            <span className="text-xs text-text-muted w-24 flex-shrink-0 pt-0.5">{row.label}</span>
                            <span className="text-sm font-medium text-text-primary break-words flex-1">{row.value}</span>
                          </div>
                        ))}
                      </div>

                      {exceedsNorm && (
                        <div className="mt-3 p-3 rounded-xl bg-amber-light flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-dark flex-shrink-0" />
                          <p className="text-xs font-semibold text-amber-dark">Заявка будет отмечена: превышение нормы отхода</p>
                        </div>
                      )}

                      <div className="mt-4 flex items-center gap-1.5 text-xs text-text-muted">
                        <Lock className="w-3 h-3" />
                        <span>После отправки заявка не редактируется — это неизменяемый лог</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-4 pb-4 pt-3 bg-offwhite border-t border-stone-100 flex-shrink-0">
                  {step === 'review' ? (
                    <button onClick={handleSubmit} disabled={submitting} className="w-full btn-primary py-4 text-base rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed">
                      {submitting ? 'Отправка…' : 'Отправить заявку'}
                    </button>
                  ) : (
                    <button
                      onClick={nextStep}
                      disabled={!canProceed()}
                      className="w-full btn-primary py-4 text-base rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Далее
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {!showForm && (
            <div className="bg-white border-t border-stone-100 flex flex-shrink-0" style={{ paddingBottom: '4px' }}>
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
                    style={{ color: active ? '#F5A300' : '#8C8780' }}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{t.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="phone-home bg-white">
            <div className="phone-home-bar" />
          </div>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
