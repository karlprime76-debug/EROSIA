import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email('Email invalide').max(255),
  password: z.string().min(8, '8 caractères minimum').max(128),
  name: z.string().min(1, 'Nom requis').max(80).transform(v => v.trim()).refine(v => v.length > 0, 'Nom requis'),
  age: z.number().int().min(18, 'Tu dois avoir au moins 18 ans').max(120),
  gender: z.enum(['male', 'female', 'non_binary'], { message: 'Choisis ton genre' }),
  interestedIn: z.array(z.enum(['male', 'female', 'non_binary'])).min(1, 'Sélectionne au moins un genre'),
})

export const sendMessageSchema = z.object({
  matchId: z.string().uuid('matchId invalide'),
  text: z.string().min(1, 'Message requis').max(2000),
  parentId: z.string().uuid().optional(),
})

export const reportSchema = z.object({
  reported_id: z.string().uuid(),
  reason: z.enum(['comportement_inapproprié', 'harcèlement', 'contenu_offensant', 'faux_profil', 'demande_argent', 'spam', 'autre']),
  description: z.string().max(1000).optional(),
  match_id: z.string().uuid().optional(),
  message_id: z.string().uuid().optional(),
})

export const blockSchema = z.object({
  blocked_id: z.string().uuid(),
})

export const consentSchema = z.object({
  action_type: z.string().min(1),
  target_user_id: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const coachSchema = z.object({
  profileId: z.string().min(1, 'profileId requis'),
})

export const icebreakerSchema = z.object({
  targetId: z.string().uuid('targetId invalide'),
})

export const messageSuggestionsSchema = z.object({
  matchId: z.string().uuid('matchId invalide'),
})

export const dateSuggestionsSchema = z.object({
  targetId: z.string().uuid('targetId invalide'),
})

export const behaviorSchema = z.object({
  action: z.enum(['swipe_like', 'swipe_pass', 'swipe_super_like', 'view_profile', 'send_message', 'start_chat', 'report_user', 'block_user', 'share_profile', 'call_start', 'call_end']),
  targetId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const createEventSchema = z.object({
  title: z.string().min(1, 'Titre requis').max(200),
  description: z.string().max(2000).optional(),
  date: z.string().min(1, 'Date requise'),
  location: z.string().max(500).optional(),
  max_participants: z.number().int().min(2).max(1000).optional(),
  category: z.string().max(100).optional(),
})

export const joinEventSchema = z.object({
  event_id: z.string().uuid(),
})

export const createCheckoutSchema = z.object({
  plan: z.enum(['monthly', 'yearly']).optional(),
})

export const createGiftCheckoutSchema = z.object({
  giftId: z.string().uuid(),
  receiverId: z.string().uuid(),
  matchId: z.string().uuid(),
  message: z.string().max(500).optional(),
  phone: z.string().optional(),
  operator: z.string().optional(),
})

export const createCartCheckoutSchema = z.object({
  giftIds: z.array(z.string().uuid()).min(1, 'Au moins un cadeau requis'),
  receiverId: z.string().uuid(),
  matchId: z.string().uuid(),
  message: z.string().max(500).optional(),
  phone: z.string().optional(),
  operator: z.string().optional(),
})

export const createStorySchema = z.object({
  privacy: z.enum(['public', 'close_friends']).optional(),
})

export const updatePrivacySchema = z.object({
  profile_visible: z.boolean().optional(),
  hide_exact_age: z.boolean().optional(),
  hide_exact_distance: z.boolean().optional(),
  story_visibility: z.enum(['public', 'close_friends', 'hidden']).optional(),
  online_status_visibility: z.boolean().optional(),
  read_receipts: z.boolean().optional(),
  blur_photos: z.boolean().optional(),
  first_message_permission: z.enum(['everyone', 'matches_only', 'nobody']).optional(),
  visible_to_compatible_only: z.boolean().optional(),
  auto_block_reported: z.boolean().optional(),
})

export const socialPositionSchema = z.object({
  space_id: z.string().uuid(),
  x: z.number(),
  y: z.number(),
})

export const createRoomSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  space_id: z.string().uuid().optional(),
  max_capacity: z.number().int().min(2).max(500).optional(),
  is_private: z.boolean().optional(),
})

export const createSpaceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  background_url: z.string().url().optional(),
})

export const pushSubscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
})

export const pushSendSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(500),
  url: z.string().optional(),
  userId: z.string().uuid(),
})

export const createNPCchema = z.object({
  zone_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  dialogue: z.string().max(2000).optional(),
  position_x: z.number().optional(),
  position_y: z.number().optional(),
})

export const deleteMatchSchema = z.object({
  matchId: z.string().uuid(),
})

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Mot de passe requis'),
})

export const recomputeEngineSchema = z.object({
  userId: z.string().uuid().optional(),
  engine: z.string().optional(),
  targetId: z.string().uuid().optional(),
})

export const auraBatchSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1, 'Au moins un userId requis'),
})

export const processPayoutSchema = z.object({
  amountCents: z.number().int().positive('Montant invalide'),
})

export const adminPatchSchema = z.object({
  txId: z.string().uuid(),
  status: z.enum(['completed', 'failed']),
})

export const referralUseSchema = z.object({
  code: z.string().min(1, 'Code requis').max(20),
})

export const animationSchema = z.enum(['idle', 'walking', 'standing', 'sitting', 'dancing', 'waving', 'floating'])

export const joinRoomSchema = z.object({
  x: z.number().optional().default(0),
  y: z.number().optional().default(0),
  z: z.number().optional().default(0),
  rotation_y: z.number().optional(),
  animation: animationSchema.optional(),
})

export const updatePositionSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
  rotation_y: z.number().optional(),
  animation: animationSchema.optional(),
})

export const joinSpaceSchema = z.object({
  spaceId: z.string().uuid(),
  x: z.number().optional(),
  y: z.number().optional(),
  z: z.number().optional(),
})


