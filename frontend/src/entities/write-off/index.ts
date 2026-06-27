export type WriteOffStatus = 'pending' | 'approved' | 'rejected';
export type WriteOffType = 'shtuchny' | 'vesovoy';

export type WriteOff = {
  id: string;
  employeeName: string;
  outletName: string;
  productName: string;
  type: WriteOffType;
  quantity: number;
  unit: string;
  reasonCode: string;
  comment: string | null;
  photoUrl: string | null;
  status: WriteOffStatus;
  createdAt: string;
  reviewedAt: string | null;
  reviewerName: string | null;
  rejectionReason: string | null;
};

export const REASON_LABELS: Record<string, string> = {
  DAMAGED: 'Повреждён',
  EXPIRED: 'Истёк срок',
  OVERCOOKED: 'Пережарен',
  RAW_WASTE: 'Сырьевые отходы',
  OTHER: 'Другое',
};

export const STATUS_LABELS: Record<WriteOffStatus, string> = {
  pending: 'На проверке',
  approved: 'Одобрено',
  rejected: 'Отклонено',
};
