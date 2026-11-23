import { describe, it, expect } from 'vitest';
import { classify, COUNCIL_RULES, LOCAL_RULES } from '../scripts/lib/classify.mjs';

describe('classify 議會', () => {
  it('先命中先贏：規則表第一條是 council-hall', () => {
    expect(COUNCIL_RULES[0].element).toBe('council-hall');
    expect(classify({ island: '議會', title: '115年總預算審查：營養午餐' }).element).toBe('council-hall');
  });
  it('命中關鍵字回傳 matched', () => {
    expect(classify({ island: '議會', title: '新北營養午餐用油全面檢驗' })).toEqual({ element: 'lunch-tray', matched: '營養午餐' });
  });
  it('都不中 → sign', () => {
    expect(classify({ island: '議會', title: '香菜日快樂' })).toEqual({ element: 'sign', matched: null });
  });
  it('議會不用地方島的規則', () => {
    expect(classify({ island: '議會', title: '公車班次', placeKind: '學校' }).element).toBe('sign');
  });
});

describe('classify 地方島', () => {
  it('災害型 repair 在 school 之前', () => {
    expect(LOCAL_RULES[0].element).toBe('repair');
    expect(classify({ island: '淡水', title: '颱風後坪頂國小邊坡坍方' })).toEqual({ element: 'repair', matched: '颱風' });
  });
  it('泛工程字（工程／完工）排在最後，學校先搶', () => {
    expect(classify({ island: '淡水', title: '竹圍國小操場整建工程完工' }).element).toBe('school');
  });
  it('關鍵字不分大小寫', () => {
    expect(classify({ island: '八里', title: '左岸增設YouBike2.0' })).toEqual({ element: 'transit', matched: 'youbike' });
  });
  it('單字「橋」不算 bridge（板橋）', () => {
    expect(classify({ island: '淡水', title: '機場快線、板橋快線站點更精簡' }).element).toBe('sign');
    expect(classify({ island: '八里', title: '淡江大橋八里端自行車道' }).element).toBe('bridge');
  });
  it('kind 只在所有關鍵字都不中時才用', () => {
    expect(classify({ island: '八里', title: '台北港職場教保中心', placeKind: '港口' })).toEqual({ element: 'port', matched: 'kind:港口' });
    expect(classify({ island: '八里', title: '商港公園增設YouBike', placeKind: '港口' }).element).toBe('transit');
  });
  it('都不中、kind 也沒對應 → sign', () => {
    expect(classify({ island: '三芝', title: '衛生所X光機換新', placeKind: '衛生所' })).toEqual({ element: 'sign', matched: null });
    expect(classify({ island: '三芝', title: '衛生所X光機換新' })).toEqual({ element: 'sign', matched: null });
  });
});
