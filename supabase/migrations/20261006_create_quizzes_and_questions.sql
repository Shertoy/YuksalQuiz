-- Migration: 20261006_create_quizzes_and_questions.sql
-- Creates `quizzes` and `questions` tables for user-generated quizzes and AI importer

CREATE TABLE IF NOT EXISTS public.quizzes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'unlisted', 'private')),
    creator_id TEXT NOT NULL,
    creator_name TEXT,
    total_questions INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quizzes_creator_id ON public.quizzes (creator_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_visibility ON public.quizzes (visibility);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_at ON public.quizzes (created_at DESC);

CREATE TABLE IF NOT EXISTS public.questions (
    id TEXT PRIMARY KEY,
    quiz_id TEXT NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON public.questions (quiz_id);
CREATE INDEX IF NOT EXISTS idx_questions_order ON public.questions (quiz_id, order_index ASC);

-- Enable RLS
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- quizzes policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quizzes' AND policyname = 'Allow public read quizzes') THEN
        CREATE POLICY "Allow public read quizzes" ON public.quizzes FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quizzes' AND policyname = 'Allow public insert quizzes') THEN
        CREATE POLICY "Allow public insert quizzes" ON public.quizzes FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quizzes' AND policyname = 'Allow public update quizzes') THEN
        CREATE POLICY "Allow public update quizzes" ON public.quizzes FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quizzes' AND policyname = 'Allow public delete quizzes') THEN
        CREATE POLICY "Allow public delete quizzes" ON public.quizzes FOR DELETE USING (true);
    END IF;

    -- questions policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'questions' AND policyname = 'Allow public read questions') THEN
        CREATE POLICY "Allow public read questions" ON public.questions FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'questions' AND policyname = 'Allow public insert questions') THEN
        CREATE POLICY "Allow public insert questions" ON public.questions FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'questions' AND policyname = 'Allow public update questions') THEN
        CREATE POLICY "Allow public update questions" ON public.questions FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'questions' AND policyname = 'Allow public delete questions') THEN
        CREATE POLICY "Allow public delete questions" ON public.questions FOR DELETE USING (true);
    END IF;
END $$;
