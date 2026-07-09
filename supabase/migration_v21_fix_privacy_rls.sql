-- Migration v21: Fix privacy_settings RLS - replace permissive policy with security definer function

-- Drop the overly permissive policy that allows ANY authenticated user to SELECT all rows
DROP POLICY IF EXISTS "Authenticated can SELECT privacy_settings for checks" ON privacy_settings;

-- Create security definer function for cross-user privacy checks
-- This function returns only the fields needed by the application
-- and uses SECURITY DEFINER to bypass RLS safely
CREATE OR REPLACE FUNCTION public.get_privacy_check_data(target_user_ids uuid[])
RETURNS TABLE (
  user_id uuid,
  story_visibility text,
  first_message_permission text,
  read_receipts boolean,
  visible_to_compatible_only boolean,
  online_status_visibility boolean
) LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.user_id,
    ps.story_visibility,
    ps.first_message_permission,
    ps.read_receipts,
    ps.visible_to_compatible_only,
    ps.online_status_visibility
  FROM public.privacy_settings ps
  WHERE ps.user_id = ANY(target_user_ids);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_privacy_check_data(uuid[]) TO authenticated;
