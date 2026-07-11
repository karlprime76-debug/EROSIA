-- Migration v45: Seed achievements + XP rules

INSERT INTO achievements (key, name, description, icon, xp_reward, category) VALUES
  ('first_like', 'Premier like', 'Donne ton premier like', '👍', 10, 'social'),
  ('first_match', 'Premier match', 'Obtiens ton premier match', '💕', 25, 'social'),
  ('ten_matches', 'Dix matches', 'Atteins 10 matches', '🔥', 50, 'social'),
  ('first_message', 'Premier message', 'Envoie ton premier message', '💬', 15, 'social'),
  ('chatty', 'Bavard', 'Envoie 100 messages', '🗣️', 75, 'social'),
  ('first_date', 'Premier rendez-vous', 'Planifie un rendez-vous', '📅', 50, 'dating'),
  ('five_dates', 'Romantique', 'Va à 5 rendez-vous', '🌹', 100, 'dating'),
  ('first_story', 'Première story', 'Publie ta première story', '📸', 20, 'content'),
  ('storyteller', 'Conteur', 'Publie 10 stories', '🎬', 60, 'content'),
  ('early_bird', 'Lève-tôt', 'Connecte-toi avant 8h', '🌅', 15, 'habits'),
  ('night_owl', 'Oiseau de nuit', 'Connecte-toi après minuit', '🦉', 15, 'habits'),
  ('social_butterfly', 'Papillon social', 'Affiche 5 centres d\'intérêt', '🦋', 30, 'profile'),
  ('profile_star', 'Profil complet', 'Remplis toutes les sections du profil', '⭐', 40, 'profile'),
  ('verified', 'Vérifié', 'Vérifie ton identité', '✅', 100, 'trust'),
  ('streak_7', 'Semaine complète', 'Maintiens une série de 7 jours', '📆', 70, 'habits'),
  ('streak_30', 'Mois dédié', 'Maintiens une série de 30 jours', '🏆', 200, 'habits'),
  ('super_liker', 'Super like', 'Envoie un super like', '🌟', 30, 'social'),
  ('gift_giver', 'Généreux', 'Envoie un cadeau', '🎁', 40, 'social'),
  ('level_5', 'Niveau 5', 'Atteins le niveau 5', '🎖️', 0, 'milestones'),
  ('level_10', 'Niveau 10', 'Atteins le niveau 10', '💎', 0, 'milestones')
ON CONFLICT (key) DO NOTHING;
