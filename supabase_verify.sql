-- ============================================================
-- Erosia - Database Verification Script
-- Run this in Supabase Studio SQL Editor to check what's applied
-- ============================================================

-- 1. TABLES : toutes les tables du schema public
SELECT 'TABLES' AS section;
SELECT table_name, 
       pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) AS size,
       (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) AS cols
FROM information_schema.tables t
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. COLUMNS : structure détaillée des tables
SELECT 'COLUMNS' AS section;
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 3. INDEXES : tous les index
SELECT 'INDEXES' AS section;
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 4. FUNCTIONS : toutes les fonctions
SELECT 'FUNCTIONS' AS section;
SELECT p.proname AS function_name,
       pg_get_function_result(p.oid) AS return_type,
       pg_get_function_arguments(p.oid) AS arguments,
       l.lanname AS language,
       CASE WHEN p.provolatile = 'i' THEN 'IMMUTABLE'
            WHEN p.provolatile = 's' THEN 'STABLE'
            WHEN p.provolatile = 'v' THEN 'VOLATILE'
       END AS volatility
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_language l ON p.prolang = l.oid
WHERE n.nspname = 'public'
  AND p.proname NOT LIKE '%pgroonga%'
ORDER BY p.proname;

-- 5. TRIGGERS
SELECT 'TRIGGERS' AS section;
SELECT event_object_table AS table_name, trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 6. POLICIES (RLS)
SELECT 'RLS POLICIES' AS section;
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 7. ENUMS
SELECT 'ENUMS' AS section;
SELECT t.typname, e.enumlabel
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
ORDER BY t.typname, e.enumsortorder;

-- 8. EXTENSIONS
SELECT 'EXTENSIONS' AS section;
SELECT extname, extversion, extrelocatable FROM pg_extension ORDER BY extname;

-- 9. PUBLICATIONS (realtime)
SELECT 'PUBLICATIONS' AS section;
SELECT pubname, puballtables, pubinsert, pubupdate, pubdelete
FROM pg_publication
ORDER BY pubname;

-- 10. PUBLICATION TABLES (realtime per-table)
SELECT 'PUBLICATION TABLES' AS section;
SELECT p.pubname, t.schemaname, t.tablename
FROM pg_publication_tables t
JOIN pg_publication p ON p.pubname = t.pubname
ORDER BY p.pubname, t.tablename;

-- 11. MIGRATION GAPS : tables attendues vs existantes
SELECT 'MIGRATION CHECK' AS section;
WITH expected_tables (name) AS (
  VALUES
    ('profiles'), ('swipes'), ('matches'), ('messages'), ('flirts'),
    ('blocks'), ('reports'), ('call_logs'), ('user_media'), ('stories'),
    ('story_views'), ('story_reactions'), ('notifications'), ('user_scores'),
    ('quiz_questions'), ('quiz_answers'), ('streaks'), ('level_progress'),
    ('achievements'), ('user_achievements'), ('aura_snapshots'),
    ('call_ratings'), ('events'), ('event_participants'),
    ('push_subscriptions'), ('payment_accounts'), ('call_history'),
    ('space_presence'), ('rooms'), ('room_presence'),
    ('privacy_settings'), ('consent_log'), ('blocked_users'),
    ('safety_tips'), ('rate_limits'), ('gift_transactions'),
    ('gift_catalog'), ('sent_gifts'), ('referrals'),
    ('saved_searches'), ('verification_requests'), ('webhook_events'),
    ('moderation_queue'), ('planned_dates'), ('date_slots'),
    ('date_reminders'), ('compatibility_history'), ('daily_profiles'),
    ('suggested_questions'), ('user_stats')
)
SELECT e.name,
       CASE WHEN t.table_name IS NOT NULL THEN '✅' ELSE '❌ MISSING' END AS status
FROM expected_tables e
LEFT JOIN information_schema.tables t ON t.table_name = e.name AND t.table_schema = 'public'
ORDER BY e.name;

-- 12. PROFILES COLUMNS CHECK (table la plus importante)
SELECT 'PROFILES COLUMNS' AS section;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 13. SUBSCRIPTION STATUS (nombre d'utilisateurs par tier)
SELECT 'SUBSCRIPTION STATS' AS section;
SELECT subscription_tier, count(*) FROM profiles GROUP BY subscription_tier;

-- 14. LAST MIGRATION CHECK (vérifie les fonctions récentes)
SELECT 'RECENT FEATURES CHECK' AS section;
SELECT 'get_upcoming_dates' AS feature,
       EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='public' AND p.proname='get_upcoming_dates') AS applied;
SELECT 'propose_date' AS feature,
       EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='public' AND p.proname='propose_date') AS applied;
SELECT 'notifications_type_check (extended)' AS feature,
       EXISTS(SELECT 1 FROM information_schema.check_constraints cc JOIN information_schema.table_constraints tc ON tc.constraint_name=cc.constraint_name AND tc.constraint_schema=cc.constraint_schema WHERE tc.table_name='notifications' AND POSITION('date_accepted' IN cc.check_clause)>0) AS applied;
SELECT 'idx_date_reminders_pending' AS feature,
       EXISTS(SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_date_reminders_pending') AS applied;
SELECT 'language column' AS feature,
       EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='language') AS applied;
SELECT 'achievements seeded' AS feature,
       COALESCE((SELECT reltuples::int FROM pg_class WHERE relname='achievements' AND relnamespace='public'::regnamespace), -1) AS cnt;
SELECT 'safety_tips seeded' AS feature,
       COALESCE((SELECT reltuples::int FROM pg_class WHERE relname='safety_tips' AND relnamespace='public'::regnamespace), -1) AS cnt;
