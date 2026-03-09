/** 회원 요약 정보 */
export interface MemberSummary {
  id: number;
  name: string;
  phone: string | null;
  branchId: number;
}
