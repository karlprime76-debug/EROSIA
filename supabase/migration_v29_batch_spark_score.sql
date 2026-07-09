-- Migration v29: Batch spark score RPC — élimine le N+1 du moteur de recommandation

CREATE OR REPLACE FUNCTION batch_spark_score(p_user_id UUID, p_target_ids UUID[])
RETURNS TABLE(target_id UUID, score NUMERIC, explanation TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_age INT;
  v_my_lat DOUBLE PRECISION;
  v_my_lng DOUBLE PRECISION;
  v_my_looking_for TEXT;
  v_my_mood TEXT;
  v_my_interests TEXT[];
  v_my_last_active TIMESTAMPTZ;
BEGIN
  -- Profil utilisateur courant
  SELECT age, latitude, longitude, looking_for, mood, interests, last_active_at
    INTO v_my_age, v_my_lat, v_my_lng, v_my_looking_for, v_my_mood, v_my_interests, v_my_last_active
  FROM profiles WHERE id = p_user_id;

  RETURN QUERY
  WITH
    targets AS (
      SELECT id, age, latitude, longitude, looking_for, mood, interests, last_active_at, is_verified
      FROM profiles WHERE id = ANY(p_target_ids)
    ),
    interest_overlap AS (
      SELECT t.id AS target_id, COUNT(*)::INT AS shared
      FROM targets t
      JOIN profiles p ON p.id = p_user_id
      JOIN LATERAL (
        SELECT unnest(p.interests) AS i
        INTERSECT
        SELECT unnest(t.interests) AS i
      ) overlap ON true
      GROUP BY t.id
    ),
    report_counts AS (
      SELECT target_id, COUNT(*)::INT AS cnt
      FROM reports WHERE target_id = ANY(p_target_ids)
      GROUP BY target_id
    )
  SELECT
    t.id,
    ROUND((
      -- Mood compat (10%)
      CASE
        WHEN v_my_mood = t.mood THEN 0.10
        WHEN (v_my_mood = 'discuter' AND t.mood IN ('chill', 'de_passage'))
          OR (v_my_mood = 'rencontre' AND t.mood IN ('disponible_ce_soir', 'relation_serieuse'))
          OR (v_my_mood = 'disponible_ce_soir' AND t.mood IN ('rencontre', 'relation_serieuse'))
          OR (v_my_mood = 'relation_serieuse' AND t.mood IN ('rencontre', 'discuter'))
          OR (v_my_mood = 'chill' AND t.mood IN ('discuter', 'de_passage'))
          OR (v_my_mood = 'de_passage' AND t.mood IN ('discuter', 'chill'))
        THEN 0.07
        ELSE 0.03
      END
      +
      -- Looking-for compat (10%)
      CASE
        WHEN v_my_looking_for = t.looking_for THEN 0.10
        WHEN (v_my_looking_for = 'serious' AND t.looking_for IN ('fwb', 'open'))
          OR (v_my_looking_for = 'fwb' AND t.looking_for IN ('serious', 'casual', 'open'))
          OR (v_my_looking_for = 'casual' AND t.looking_for IN ('fwb', 'open'))
          OR (v_my_looking_for = 'open' AND t.looking_for IN ('serious', 'fwb', 'casual'))
          OR (v_my_looking_for = 'friendship' AND t.looking_for IN ('casual', 'open'))
        THEN 0.07
        ELSE 0.02
      END
      +
      -- Age compat (15% * 0.20 weight in compat = 3% of total)
      CASE WHEN v_my_age IS NOT NULL AND t.age IS NOT NULL
        THEN GREATEST(0, (1 - ABS(v_my_age - t.age)::NUMERIC / 50)) * 0.03
        ELSE 0
      END
      +
      -- Proximity (5%)
      CASE WHEN v_my_lat IS NOT NULL AND v_my_lng IS NOT NULL
                AND t.latitude IS NOT NULL AND t.longitude IS NOT NULL
        THEN GREATEST(0, 1 - LEAST(
          (6371 * 2 * ASIN(SQRT(
            POWER(SIN(RADIANS(t.latitude - v_my_lat) / 2), 2)
            + COS(RADIANS(v_my_lat)) * COS(RADIANS(t.latitude))
            * POWER(SIN(RADIANS(t.longitude - v_my_lng) / 2), 2)
          )))::NUMERIC / 100, 1
        )) * 0.05
        ELSE 0.025
      END
      +
      -- Interest overlap (5%)
      COALESCE(
        (SELECT LEAST(io.shared::NUMERIC / 10, 1) * 0.05
         FROM interest_overlap io WHERE io.target_id = t.id),
        0
      )
      +
      -- Activity recency (5%)
      CASE
        WHEN t.last_active_at IS NULL THEN 0.01
        WHEN t.last_active_at >= NOW() - INTERVAL '1 day' THEN 0.05
        WHEN t.last_active_at >= NOW() - INTERVAL '3 days' THEN 0.045
        WHEN t.last_active_at >= NOW() - INTERVAL '7 days' THEN 0.035
        WHEN t.last_active_at >= NOW() - INTERVAL '14 days' THEN 0.025
        WHEN t.last_active_at >= NOW() - INTERVAL '30 days' THEN 0.015
        ELSE 0.005
      END
      +
      -- Trust bonus (8%): verified + no reports
      CASE
        WHEN t.is_verified AND (COALESCE((SELECT rc.cnt FROM report_counts rc WHERE rc.target_id = t.id), 0) = 0) THEN 0.08
        WHEN t.is_verified THEN 0.04
        ELSE 0.02
      END
    ), 4) AS score,
    ''::TEXT AS explanation
  FROM targets t;

END;
$$;

GRANT EXECUTE ON FUNCTION batch_spark_score(UUID, UUID[]) TO authenticated;
