export interface Student {
  cardNumber: string;
  qrCode: string;
  studentId: string;
  className: string;
  name: string;
}

export const MOCK_STUDENTS: Student[] = [
  {
    cardNumber: 'A33E6CA3',
    qrCode: 'QR-DS-240101',
    studentId: '250101',
    className: 'A반',
    name: '김예진',
  },
  {
    cardNumber: '9876543210',
    qrCode: 'http://qr.kakao.com/talk/ayZpMTPa2BIBn73Wg3PwYzjHmz0-',
    studentId: '250202',
    className: 'B반',
    name: '이진규',
  },
  {
    cardNumber: '5555666677',
    qrCode: 'QR-DS-240103',
    studentId: '111111',
    className: 'A반',
    name: '김경진',
  },
];
