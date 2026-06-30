-- Migration v18: Gift catalog seed
-- Inserts a complete catalog of gifts for the boutique

INSERT INTO gifts (name, emoji, price_cents, image_url) VALUES
  -- Petits cadeaux (< 1000 F)
  ('Cœur virtuel', '💜', 150, NULL),
  ('Rose rouge', '🌹', 300, NULL),
  ('Bisou volant', '💋', 200, NULL),
  ('Sticker mignon', '✨', 100, NULL),
  ('Fleur de cerisier', '🌸', 250, NULL),
  ('Cœur qui bat', '💓', 180, NULL),
  ('Petit nuage', '☁️', 120, NULL),
  ('Étoile filante', '⭐', 220, NULL),
  ('Papillon', '🦋', 280, NULL),

  -- Cadeaux moyens (1000 - 5000 F)
  ('Boîte de chocolats', '🍫', 1500, NULL),
  ('Bouquet de fleurs', '💐', 2000, NULL),
  ('Parfum', '🧴', 3500, NULL),
  ('Peluche ours', '🧸', 2500, NULL),
  ('Bague', '💍', 4500, NULL),
  ('Collier', '📿', 3000, NULL),
  ('Montre', '⌚', 4000, NULL),
  ('Livre', '📖', 1500, NULL),
  ('Vin', '🍷', 2200, NULL),
  ('Gâteau', '🎂', 1800, NULL),
  ('Bougies', '🕯️', 800, NULL),
  ('Porte-bonheur', '🍀', 600, NULL),
  ('Masque de beauté', '🧖', 1200, NULL),
  ('Bijoux de cheveux', '💎', 900, NULL),

  -- Grands cadeaux (5000 - 15000 F)
  ('Sac à main', '👛', 8000, NULL),
  ('Chaussures', '👠', 10000, NULL),
  ('Veste', '🧥', 12000, NULL),
  ('Casque audio', '🎧', 7000, NULL),
  ('Montre connectée', '⌚', 15000, NULL),
  ('Parfum de luxe', '🌺', 9000, NULL),
  ('Coffret cadeau', '🎁', 6000, NULL),
  ('Abonnement Premium', '👑', 5000, NULL),

  -- Expériences
  ('Dîner aux chandelles', '🕯️', 10000, NULL),
  ('Cinéma à deux', '🎬', 4000, NULL),
  ('Week-end surprise', '🏖️', 25000, NULL),
  ('Spa journée', '💆', 15000, NULL),
  ('Concert', '🎵', 8000, NULL),
  ('Cours de cuisine', '👨‍🍳', 6000, NULL),
  ('Escape game', '🧩', 5000, NULL),

  -- Cadeaux virtuels
  ('Badge Super Fan', '🏆', 500, NULL),
  ('Cadre photo', '🖼️', 700, NULL),
  ('Carte virtuelle', '💌', 200, NULL),
  ('Super Like', '🔥', 1000, NULL)
ON CONFLICT DO NOTHING;
