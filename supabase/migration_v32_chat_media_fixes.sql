-- Migration v32 — Chat media fixes
-- Ajoute les colonnes manquantes, corrige les RLS, sécurise le storage,
-- et gère les photos à vue unique (view_once).

-- 1. Colonnes manquantes sur messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS view_once BOOLEAN DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_for_all BOOLEAN DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS gif_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to UUID REFERENCES messages(id);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_preview TEXT;

-- 2. DELETE RLS : restreindre aux messages dont on est l'expéditeur
DROP POLICY IF EXISTS "Users can delete messages in their matches" ON messages;
CREATE POLICY "Users can delete own messages" ON messages
  FOR DELETE USING (auth.uid() = sender_id);

-- 3. Fonction helper pour vérifier qu'un utilisateur participe à un match
CREATE OR REPLACE FUNCTION public.is_chat_participant(p_user_id UUID, p_object_name TEXT)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match_id UUID;
BEGIN
  -- Le nom de l'objet suit le pattern {bucket_prefix}/{matchId}/...
  -- ex: "chat_audio/abc-123/file.webm" ou "chat/abc-123/file.jpg"
  v_match_id := split_part(p_object_name, '/', 2)::UUID;
  RETURN EXISTS (
    SELECT 1 FROM matches
    WHERE id = v_match_id
    AND (user1_id = p_user_id OR user2_id = p_user_id)
  );
EXCEPTION WHEN others THEN
  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- 4. Politiques storage pour chat_audio
DROP POLICY IF EXISTS "Public read audio" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload audio" ON storage.objects;

CREATE POLICY "Match participants can read audio" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'chat_audio'
    AND (auth.role() = 'service_role' OR is_chat_participant(auth.uid(), name))
  );

CREATE POLICY "Auth upload audio" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'chat_audio'
    AND auth.role() = 'authenticated'
    AND is_chat_participant(auth.uid(), name)
  );

CREATE POLICY "Users can update own audio" ON storage.objects
  FOR UPDATE USING (bucket_id = 'chat_audio' AND auth.uid() = owner);

CREATE POLICY "Users can delete own audio" ON storage.objects
  FOR DELETE USING (bucket_id = 'chat_audio' AND auth.uid() = owner);

-- 5. Politiques storage pour chat_photos (remplacer SELECT public par scoped)
DROP POLICY IF EXISTS "Chat photos public read" ON storage.objects;

CREATE POLICY "Match participants can read photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'chat_photos'
    AND (auth.role() = 'service_role' OR is_chat_participant(auth.uid(), name))
  );

CREATE POLICY "Auth upload chat photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'chat_photos'
    AND auth.role() = 'authenticated'
    AND is_chat_participant(auth.uid(), name)
  );

-- 6. Trigger : à la lecture d'un message view_once, efface l'image
CREATE OR REPLACE FUNCTION public.handle_view_once_read()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.view_once = true AND NEW.read_at IS NOT NULL AND OLD.read_at IS NULL THEN
    NEW.image_url = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_view_once_read ON messages;
CREATE TRIGGER trg_view_once_read
  BEFORE UPDATE OF read_at ON messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_view_once_read();

-- 7. Amélioration de cleanup_expired_messages
CREATE OR REPLACE FUNCTION public.cleanup_expired_messages()
RETURNS int4
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int4;
BEGIN
  DELETE FROM messages WHERE expires_at IS NOT NULL AND expires_at < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;
