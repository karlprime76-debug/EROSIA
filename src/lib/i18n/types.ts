export type Locale = 'fr' | 'en'

export interface Translations {
  // Navigation
  nav_discover: string
  nav_matches: string
  nav_stories: string
  nav_notifications: string
  nav_dates: string
  nav_boutique: string
  nav_profile: string

  // Discover / Cards
  discover_title: string
  discover_empty: string
  discover_empty_desc: string
  discover_filters: string
  discover_advanced_search: string
  discover_modify_filters: string
  discover_super_like: string
  discover_pass: string
  discover_flirt: string
  discover_unverified: string
  discover_no_photo: string

  // Matches
  matches_title: string
  matches_empty: string
  matches_empty_desc: string
  matches_new: string
  matches_chat: string
  matches_say_hi: string

  // Chat
  chat_title: string
  chat_input_placeholder: string
  chat_send: string
  chat_today: string
  chat_yesterday: string
  chat_online: string
  chat_offline: string
  chat_typing: string

  // Stories
  stories_title: string
  stories_create: string
  stories_my_story: string
  stories_no_stories: string
  stories_reply: string
  stories_archive: string
  stories_delete: string
  stories_react: string
  stories_mute: string
  stories_unmute: string

  // Dates / Rendez-vous
  dates_title: string
  dates_upcoming: string
  dates_history: string
  dates_empty: string
  dates_empty_history: string
  dates_propose: string
  dates_accept: string
  dates_decline: string
  dates_cancel: string
  dates_confirm: string
  dates_pending: string
  dates_accepted: string
  dates_confirmed: string
  dates_declined: string
  dates_cancelled: string
  dates_completed: string
  dates_select_slot: string
  dates_no_slots: string

  // Search
  search_title: string
  search_placeholder: string
  search_filters: string
  search_save: string
  search_save_dialog: string
  search_saved: string
  search_empty: string
  search_empty_desc: string
  search_reset: string
  search_apply: string
  search_age: string
  search_gender: string
  search_city: string
  search_height: string
  search_smoker: string
  search_drinker: string
  search_kids: string
  search_pets: string
  search_languages: string
  search_sports: string
  search_music: string
  search_education: string
  search_all: string
  search_male: string
  search_female: string
  search_other: string
  search_indifferent: string
  search_yes: string
  search_no: string
  search_sometimes: string
  search_open: string

  // Notifications
  notif_title: string
  notif_empty: string
  notif_empty_desc: string
  notif_mark_all_read: string
  notif_like: string
  notif_super_like: string
  notif_match: string
  notif_flirt: string
  notif_message: string
  notif_story_reply: string
  notif_date_proposal: string
  notif_date_accepted: string
  notif_date_reminder: string
  notif_date_cancelled: string
  notif_gift: string
  notif_visit: string
  notif_level_up: string
  notif_achievement: string
  notif_verification: string

  // Profile / Island
  profile_title: string
  profile_edit: string
  profile_save: string
  profile_cancel: string
  profile_verify: string
  profile_verified: string
  profile_unverified: string
  profile_premium: string
  profile_photos: string
  profile_bio: string
  profile_interests: string
  profile_settings: string
  profile_privacy: string
  profile_appearance: string
  profile_help: string
  profile_logout: string
  profile_admin: string
  profile_stats: string
  profile_coach: string
  profile_travel: string

  // Stats
  stats_title: string
  stats_level: string
  stats_xp: string
  stats_total: string
  stats_matches: string
  stats_messages: string
  stats_dates: string
  stats_views: string
  stats_gifts: string
  stats_streak: string
  stats_swipes: string
  stats_stories: string
  stats_engagement: string
  stats_response_rate: string
  stats_response_time: string
  stats_likes_24h: string
  stats_likes_7d: string

  // Coach
  coach_title: string
  coach_score: string
  coach_strengths: string
  coach_suggestions: string
  coach_retry: string
  coach_loading: string
  coach_error: string
  coach_retry_btn: string
  coach_reanalyze: string

  // Travel
  travel_title: string
  travel_desc: string
  travel_toggle: string
  travel_city: string
  travel_city_placeholder: string
  travel_save: string
  travel_active_desc: string
  travel_disabled: string
  travel_enabled: string

  // Settings
  settings_title: string
  settings_language: string
  settings_notifications: string
  settings_privacy: string
  settings_appearance: string
  settings_delete_account: string
  settings_logout: string
  settings_theme_light: string
  settings_theme_dark: string
  settings_theme_system: string

  // Auth
  auth_login: string
  auth_register: string
  auth_email: string
  auth_password: string
  auth_forgot: string
  auth_reset: string
  auth_logout: string

  // General
  general_loading: string
  general_error: string
  general_success: string
  general_save: string
  general_cancel: string
  general_delete: string
  general_confirm: string
  general_back: string
  general_search: string
  general_filter: string
  general_no_results: string
  general_view_all: string
  general_more: string
  general_less: string

  // Premium
  premium_title: string
  premium_desc: string
  premium_unlimited: string
  premium_verify: string
  premium_boost: string
  premium_monthly: string
  premium_yearly: string
  premium_subscribe: string

  // Events
  events_title: string
  events_create: string
  events_join: string
  events_leave: string
  events_empty: string
  events_participants: string
}

export type TranslationKey = keyof Translations
