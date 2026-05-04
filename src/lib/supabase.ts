import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Child = { id: string; name: string; grade: string; avatar: string; color: string; created_at: string }
export type Subject = { id: string; child_id: string; name: string; emoji: string; color: string; sort_order: number }
export type Textbook = { id: string; child_id: string; subject_id: string; subject_name: string; grade: string; semester: string; sub_subject?: string; lesson_number: string; title: string; section?: string; content?: string; original_url?: string; status: string; created_at: string }
export type StudySession = { id: string; child_id: string; textbook_id?: string; subject_name?: string; activity_type: string; score?: number; total_questions?: number; correct_count?: number; duration_mins?: number; created_at: string }
export type WrongAnswer = { id: string; child_id: string; textbook_id?: string; subject_name?: string; question: string; correct_answer: string; student_answer?: string; knowledge_point?: string; review_count: number; mastered: boolean; created_at: string }
export type ExamAnalysis = { id: string; child_id: string; exam_name?: string; exam_date?: string; image_url?: string; ai_analysis?: any; created_at: string }
export type StudyPlan = { id: string; child_id: string; exam_name: string; exam_date: string; subjects?: any[]; blocked_times?: any[]; daily_plans?: any[]; status: string; created_at: string }
export type StudyStreak = { id: string; child_id: string; current_streak: number; longest_streak: number; last_study_date?: string; total_days: number }
