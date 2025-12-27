
import { SusiData } from '../types';

const SHEET_ID = '1UUPQAt7sRay4XhGTiacPKpL0jRxwCs9oUP2PB6HnVvI';
const SHEET_NAME = '2026수시';
const DATA_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?&sheet=${encodeURIComponent(SHEET_NAME)}&tq=select *`;

export const fetchSusiData = async (): Promise<SusiData[]> => {
  try {
    const response = await fetch(DATA_URL);
    const text = await response.text();
    
    const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\((.*)\);/s);
    if (!jsonMatch) throw new Error("데이터 형식이 올바르지 않습니다.");
    
    const jsonData = JSON.parse(jsonMatch[1]);
    const rows = jsonData.table.rows;

    const getValue = (row: any, index: number) => {
      if (!row.c[index]) return null;
      return row.c[index].v;
    };

    // 이미지 기반 컬럼 매핑:
    // D(3): 이름, F(5): 지역, G(6): 대학명, I(8): 전형유형, K(10): 모집단위, L(11): 일반등급, M(12): 최종단계
    return rows.map((row: any, rowIndex: number) => {
      const data: SusiData = {
        id: `row-${rowIndex}`,
        studentName: String(getValue(row, 3) || '익명'),
        region: String(getValue(row, 5) || '미지정'),
        university: String(getValue(row, 6) || ''),
        admissionType: String(getValue(row, 8) || ''),
        major: String(getValue(row, 10) || ''),
        grade: Number(getValue(row, 11) || 0),
        result: String(getValue(row, 12) || '진행중'),
        raw: row.c.map((cell: any) => cell?.v)
      };
      return data;
    }).filter((d: SusiData) => d.university && d.university !== '대학명' && d.university !== '대학교');
  } catch (error) {
    console.error("데이터 로딩 오류:", error);
    throw error;
  }
};
