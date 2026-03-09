/** 승인 요청 유형 */
export const APPROVAL_TYPE = {
  ABSENT: '결석 승인',
  OUTING: '외출 승인',
  EARLY_LEAVE: '조퇴 승인',
} as const;

export type ApprovalType =
  (typeof APPROVAL_TYPE)[keyof typeof APPROVAL_TYPE];

/** 승인 요청 항목 */
export interface ApprovalRequest {
  id: number;
  type: ApprovalType;
  content: string;
  requesterId: number;
  requesterName: string;
  requestDate: string;
}
