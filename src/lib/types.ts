// Row types for the BoardSathi schema (PRD §5). Keep in sync with
// backend/supabase/migrations — add fields, never remove.

export type ContentStatus = "draft" | "approved" | "published";

export interface Board {
  id: string;
  code: "UP" | "BIHAR";
  name: string;
  name_en: string;
  name_hi: string;
  slug: string;
  class: number;
}

export interface Subject {
  id: string;
  board_id: string;
  code: string;
  name: string;
  name_en: string;
  name_hi: string;
  icon: string | null;
  sort_order: number;
}

export interface Chapter {
  id: string;
  subject_id: string;
  board_id: string;
  title_en: string;
  title_hi: string;
  number: number;
  ncert_ref: string | null;
  source_pdf_url: string | null;
  sort_order: number;
  content_version: number;
}

export interface Concept {
  id: string;
  chapter_id: string;
  name_en: string;
  name_hi: string;
}

export interface Question {
  id: string;
  chapter_id: string;
  concept_id: string | null;
  type: "mcq" | "true_false" | "fill_blank";
  difficulty: "easy" | "medium" | "hard";
  variant_group_id: string | null;
  is_pyq: boolean;
  pyq_years: number[];
  stem_en: string;
  stem_hi: string | null;
  options_en: string[] | null;
  options_hi: string[] | null;
  correct_answer: string;
  explanation_en: string | null;
  explanation_hi: string | null;
  status: ContentStatus;
  content_version: number;
}

export interface AdminUser {
  id: string;
  auth_user_id: string | null;
  email: string;
  role: "owner" | "editor" | "reviewer";
}
