-- ============================================================
-- Migration v41: Rendez-vous (Date Planning) System
-- ============================================================

-- 1. planned_dates — core scheduling table
CREATE TABLE IF NOT EXISTS planned_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  proposer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  proposee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','declined','cancelled','rescheduled','completed','confirmed')),
  category TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN ('restaurant','cafe','cinema','bar','walk','hotel','other')),
  location TEXT,
  note TEXT CHECK (char_length(note) <= 500),
  cancelled_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  cancel_reason TEXT CHECK (char_length(cancel_reason) <= 300),
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_planned_dates_match ON planned_dates(match_id);
CREATE INDEX idx_planned_dates_proposer ON planned_dates(proposer_id);
CREATE INDEX idx_planned_dates_proposee ON planned_dates(proposee_id);
CREATE INDEX idx_planned_dates_status ON planned_dates(status);

-- 2. date_slots — proposed time slots per date
CREATE TABLE IF NOT EXISTS date_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date_id UUID NOT NULL REFERENCES planned_dates(id) ON DELETE CASCADE,
  proposed_date DATE NOT NULL,
  proposed_time TIME NOT NULL,
  accepted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_date_slots_date ON date_slots(date_id);

-- 3. date_reminders — auto reminders
CREATE TABLE IF NOT EXISTS date_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date_id UUID NOT NULL REFERENCES planned_dates(id) ON DELETE CASCADE,
  remind_at TIMESTAMPTZ NOT NULL,
  sent BOOLEAN NOT NULL DEFAULT false,
  type TEXT NOT NULL CHECK (type IN ('24h','2h','30min')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_date_reminders_date ON date_reminders(date_id);
CREATE INDEX idx_date_reminders_pending ON date_reminders(sent, remind_at)
  WHERE sent = false AND remind_at <= now();

-- 4. RLS Policies
ALTER TABLE planned_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE date_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE date_reminders ENABLE ROW LEVEL SECURITY;

-- planned_dates: participants only
CREATE POLICY "Users can view dates they participate in"
  ON planned_dates FOR SELECT
  USING (auth.uid() IN (proposer_id, proposee_id));

CREATE POLICY "Users can propose dates"
  ON planned_dates FOR INSERT
  WITH CHECK (auth.uid() = proposer_id);

CREATE POLICY "Users can update dates they participate in"
  ON planned_dates FOR UPDATE
  USING (auth.uid() IN (proposer_id, proposee_id));

CREATE POLICY "Users can delete dates they participate in"
  ON planned_dates FOR DELETE
  USING (auth.uid() IN (proposer_id, proposee_id));

-- date_slots: via date ownership
CREATE POLICY "Users can view slots for their dates"
  ON date_slots FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM planned_dates WHERE id = date_id
    AND auth.uid() IN (proposer_id, proposee_id)
  ));

CREATE POLICY "Proposer can create slots"
  ON date_slots FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM planned_dates WHERE id = date_id
    AND auth.uid() = proposer_id
  ));

CREATE POLICY "Users can update slots for their dates"
  ON date_slots FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM planned_dates WHERE id = date_id
    AND auth.uid() IN (proposer_id, proposee_id)
  ));

CREATE POLICY "Proposer can delete slots"
  ON date_slots FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM planned_dates WHERE id = date_id
    AND auth.uid() = proposer_id
  ));

-- date_reminders: via date ownership
CREATE POLICY "Users can view reminders for their dates"
  ON date_reminders FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM planned_dates WHERE id = date_id
    AND auth.uid() IN (proposer_id, proposee_id)
  ));

CREATE POLICY "System can manage reminders"
  ON date_reminders FOR ALL
  USING (auth.role() = 'service_role');

-- 5. Functions
CREATE OR REPLACE FUNCTION get_upcoming_dates(p_user_id UUID)
RETURNS TABLE (
  id UUID, match_id UUID, category TEXT, location TEXT, note TEXT,
  status TEXT, proposer_id UUID, proposee_id UUID,
  slots JSONB, confirmed_at TIMESTAMPTZ,
  match_user_id UUID, match_user_name TEXT, match_user_photo TEXT,
  created_at TIMESTAMPTZ
) LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pd.id, pd.match_id, pd.category, pd.location, pd.note,
    pd.status, pd.proposer_id, pd.proposee_id,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'id', ds.id, 'proposed_date', ds.proposed_date,
        'proposed_time', ds.proposed_time::TEXT, 'accepted', ds.accepted
      ) ORDER BY ds.proposed_date, ds.proposed_time)
      FROM date_slots ds WHERE ds.date_id = pd.id),
      '[]'::jsonb
    ) AS slots,
    pd.confirmed_at,
    CASE WHEN pd.proposer_id = p_user_id THEN pd.proposee_id ELSE pd.proposer_id END AS match_user_id,
    CASE WHEN pd.proposer_id = p_user_id THEN pr2.name ELSE pr1.name END AS match_user_name,
    CASE WHEN pd.proposer_id = p_user_id THEN pr2.photos[1] ELSE pr1.photos[1] END AS match_user_photo,
    pd.created_at
  FROM planned_dates pd
  JOIN profiles pr1 ON pr1.id = pd.proposer_id
  JOIN profiles pr2 ON pr2.id = pd.proposee_id
  WHERE (pd.proposer_id = p_user_id OR pd.proposee_id = p_user_id)
    AND pd.status IN ('pending','accepted','confirmed')
  ORDER BY pd.created_at DESC;
$$;

-- 6. Auto-reminder trigger function
CREATE OR REPLACE FUNCTION create_date_reminders()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create reminders for 24h, 2h, and 30min before the earliest accepted slot
  INSERT INTO date_reminders (date_id, remind_at, type)
  SELECT
    NEW.id,
    (ds.proposed_date + ds.proposed_time) - interval '24 hours',
    '24h'
  FROM date_slots ds WHERE ds.date_id = NEW.id AND ds.accepted = true
  UNION ALL
  SELECT
    NEW.id,
    (ds.proposed_date + ds.proposed_time) - interval '2 hours',
    '2h'
  FROM date_slots ds WHERE ds.date_id = NEW.id AND ds.accepted = true
  UNION ALL
  SELECT
    NEW.id,
    (ds.proposed_date + ds.proposed_time) - interval '30 minutes',
    '30min'
  FROM date_slots ds WHERE ds.date_id = NEW.id AND ds.accepted = true;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_date_reminders
  AFTER UPDATE OF status ON planned_dates
  FOR EACH ROW
  WHEN (NEW.status = 'confirmed')
  EXECUTE FUNCTION create_date_reminders();

-- 7. Update auto-notification on date accepted/confirmed
CREATE OR REPLACE FUNCTION notify_date_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'accepted' THEN
    INSERT INTO notifications (user_id, type, title, message, metadata, actor_id)
    VALUES (
      NEW.proposer_id, 'date_accepted',
      'Rendez-vous accepté !',
      (SELECT name FROM profiles WHERE id = NEW.proposee_id) || ' a accepté ton invitation.',
      jsonb_build_object('date_id', NEW.id, 'match_id', NEW.match_id),
      NEW.proposee_id
    );
  ELSIF NEW.status = 'confirmed' THEN
    INSERT INTO notifications (user_id, type, title, message, metadata, actor_id)
    VALUES
    (NEW.proposer_id, 'date_confirmed',
     'Rendez-vous confirmé',
     'Ton rendez-vous est confirmé. Prépare-toi !',
     jsonb_build_object('date_id', NEW.id, 'match_id', NEW.match_id),
     NEW.proposee_id),
    (NEW.proposee_id, 'date_confirmed',
     'Rendez-vous confirmé',
     'Ton rendez-vous est confirmé. Prépare-toi !',
     jsonb_build_object('date_id', NEW.id, 'match_id', NEW.match_id),
     NEW.proposer_id);
  ELSIF NEW.status = 'cancelled' THEN
    INSERT INTO notifications (user_id, type, title, message, metadata, actor_id)
    VALUES (
      CASE WHEN NEW.cancelled_by = NEW.proposer_id THEN NEW.proposee_id ELSE NEW.proposer_id END,
      'date_cancelled',
      'Rendez-vous annulé',
      'Un rendez-vous a été annulé.',
      jsonb_build_object('date_id', NEW.id, 'match_id', NEW.match_id),
      NEW.cancelled_by
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_date_event
  AFTER UPDATE OF status ON planned_dates
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_date_event();

-- 8. Extend notifications CHECK constraint to include new types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('match','flirt','message','super_like','verification','gift',
                  'date_accepted','date_confirmed','date_cancelled',
                  'story_liked','story_replied','profile_view','compatible_nearby',
                  'online_now','birthday','level_up','badge_earned'));

-- 9. Date propose RPC (atomic creation of date + slots)
CREATE OR REPLACE FUNCTION propose_date(
  p_match_id UUID,
  p_proposer_id UUID,
  p_category TEXT,
  p_location TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_slots JSONB DEFAULT '[]'::jsonb
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proposee_id UUID;
  v_date_id UUID;
  v_result JSONB;
  v_slot JSONB;
BEGIN
  -- Get proposee
  SELECT CASE WHEN user1_id = p_proposer_id THEN user2_id ELSE user1_id END
  INTO v_proposee_id
  FROM matches WHERE id = p_match_id;
  IF v_proposee_id IS NULL THEN RAISE EXCEPTION 'Match introuvable'; END IF;

  -- Create date
  INSERT INTO planned_dates (match_id, proposer_id, proposee_id, category, location, note, status)
  VALUES (p_match_id, p_proposer_id, v_proposee_id, p_category, p_location, p_note, 'pending')
  RETURNING id INTO v_date_id;

  -- Create slots
  FOR v_slot IN SELECT * FROM jsonb_array_elements(p_slots)
  LOOP
    INSERT INTO date_slots (date_id, proposed_date, proposed_time)
    VALUES (v_date_id, (v_slot->>'proposed_date')::DATE, (v_slot->>'proposed_time')::TIME);
  END LOOP;

  -- Return result with joined data
  SELECT jsonb_build_object(
    'id', pd.id,
    'match_id', pd.match_id,
    'proposer_id', pd.proposer_id,
    'proposee_id', pd.proposee_id,
    'status', pd.status,
    'category', pd.category,
    'location', pd.location,
    'note', pd.note,
    'created_at', pd.created_at,
    'match_user_name', pr.name,
    'match_user_photo', pr.photos[1]
  ) INTO v_result
  FROM planned_dates pd
  JOIN profiles pr ON pr.id = v_proposee_id
  WHERE pd.id = v_date_id;

  RETURN v_result;
END;
$$;

-- 10. Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE planned_dates;
ALTER PUBLICATION supabase_realtime ADD TABLE date_slots;
