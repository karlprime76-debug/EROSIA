-- Migration v22: Add missing get_compatibility RPC function
-- This function was defined in schema_v13_audit_fixes.sql but never deployed

DROP FUNCTION IF EXISTS get_compatibility(uuid,uuid);

CREATE FUNCTION get_compatibility(user_a_id UUID, user_b_id UUID)
RETURNS REAL AS $$
DECLARE
  score REAL;
  age_factor REAL;
  distance_factor REAL;
  interest_factor REAL;
  looking_factor REAL;
  user_a RECORD;
  user_b RECORD;
  lat1 DOUBLE PRECISION;
  lng1 DOUBLE PRECISION;
  lat2 DOUBLE PRECISION;
  lng2 DOUBLE PRECISION;
  dist DOUBLE PRECISION;
  user_interests TEXT[];
  target_interests TEXT[];
  shared_count INT;
  union_count INT;
BEGIN
  SELECT age, latitude, longitude, looking_for, interests INTO user_a
  FROM profiles WHERE id = user_a_id;
  SELECT age, latitude, longitude, looking_for, interests INTO user_b
  FROM profiles WHERE id = user_b_id;

  IF user_a.id IS NULL OR user_b.id IS NULL THEN
    RETURN 0;
  END IF;

  -- Age factor (15%)
  IF user_a.age IS NOT NULL AND user_b.age IS NOT NULL THEN
    age_factor := GREATEST(0, 1 - ABS(user_a.age - user_b.age) / 50.0);
  ELSE
    age_factor := 0.5;
  END IF;

  -- Distance factor (20%)
  lat1 := user_a.latitude; lng1 := user_a.longitude;
  lat2 := user_b.latitude; lng2 := user_b.longitude;
  IF lat1 IS NOT NULL AND lng1 IS NOT NULL AND lat2 IS NOT NULL AND lng2 IS NOT NULL THEN
    dist := 6371 * 2 * ASIN(LEAST(1, SQRT(
      SIN((lat2 - lat1) * PI() / 360)^2 +
      COS(lat1 * PI() / 180) * COS(lat2 * PI() / 180) *
      SIN((lng2 - lng1) * PI() / 360)^2
    )));
    distance_factor := GREATEST(0, 1 - LEAST(dist, 500) / 500.0);
  ELSE
    distance_factor := 0.5;
  END IF;

  -- Interest factor (25%)
  user_interests := COALESCE(user_a.interests, '{}');
  target_interests := COALESCE(user_b.interests, '{}');
  IF array_length(user_interests, 1) > 0 AND array_length(target_interests, 1) > 0 THEN
    SELECT COUNT(*) INTO shared_count
    FROM (
      SELECT unnest(user_interests)
      INTERSECT
      SELECT unnest(target_interests)
    ) s;
    SELECT COUNT(DISTINCT u) INTO union_count
    FROM (
      SELECT unnest(user_interests) AS u
      UNION
      SELECT unnest(target_interests)
    ) s;
    interest_factor := CASE WHEN union_count > 0 THEN shared_count::REAL / union_count ELSE 0 END;
  ELSE
    interest_factor := 0.5;
  END IF;

  -- Looking for factor (15%)
  IF user_a.looking_for IS NOT NULL AND user_b.looking_for IS NOT NULL THEN
    IF user_a.looking_for = user_b.looking_for THEN
      looking_factor := 1.0;
    ELSE
      looking_factor := 0.5;
    END IF;
  ELSE
    looking_factor := 0.5;
  END IF;

  -- Composite: weights = age:15%, distance:20%, interests:25%, looking:15%, language:5%, personality:15%, activity:5%
  score := age_factor * 0.15 + distance_factor * 0.20 + interest_factor * 0.25 + looking_factor * 0.15 + 0.05;

  RETURN ROUND(score::REAL, 3);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_compatibility(uuid,uuid) TO authenticated;
