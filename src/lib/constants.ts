export const SUBJECTS = [
  { name: '國語', emoji: '📖', color: '#f0b429' },
  { name: '英文', emoji: '🔤', color: '#4f7ef5' },
  { name: '數學', emoji: '📐', color: '#34d399' },
  { name: '理化', emoji: '🔬', color: '#fb923c' },
  { name: '社會', emoji: '🌏', color: '#a78bfa' },
]
export const GRADES = ['國一', '國二', '國三', '國小四年級', '國小五年級', '國小六年級']
export const SEMESTERS = ['上學期', '下學期']
export const SUB_SUBJECTS: Record<string, string[]> = { '社會': ['地理', '歷史', '公民'] }
export const DIFFICULTY_LEVELS = [
  { value: 'basic', label: '基礎', desc: '基本概念題' },
  { value: 'medium', label: '中等', desc: '應用理解題' },
  { value: 'advanced', label: '進階', desc: '綜合分析題' },
  { value: 'exam', label: '會考', desc: '模擬會考題型' },
]
export const QUIZ_MODES = [
  { value: 'summary', label: '重點整理', emoji: '📋', desc: 'AI 自動萃取必考知識點' },
  { value: 'fill', label: '填空複習', emoji: '✏️', desc: '自動挖空關鍵詞，即時批改' },
  { value: 'exam', label: '模擬考卷', emoji: '📝', desc: '全選擇題，計時模式（仿真段考）' },
  { value: 'knowledge', label: '知識點攻略', emoji: '🔊', desc: 'AI 說明每個知識點，再出例題' },
]
export const SUBJECT_COLOR_MAP: Record<string, string> = { '國語':'#f0b429','英文':'#4f7ef5','數學':'#34d399','理化':'#fb923c','社會':'#a78bfa' }
export function getSubjectColor(name: string): string { return SUBJECT_COLOR_MAP[name] ?? '#64748b' }
export function getSubjectEmoji(name: string): string { return SUBJECTS.find(s => s.name === name)?.emoji ?? '📚' }
