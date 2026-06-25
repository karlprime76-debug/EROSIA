-- Seed quiz questions for compatibility quiz
INSERT INTO quiz_questions (question, options, category) VALUES
(
  'Quel type de relation recherchez-vous principalement ?',
  '[{"text": "Une relation sérieuse et durable", "trait": "serious"}, {"text": "Une aventure sans lendemain", "trait": "casual"}, {"text": "Je découvre selon les personnes", "trait": "open"}, {"text": "Une amitié qui pourrait évoluer", "trait": "friendship"}]',
  'Relation'
),
(
  'Comment décririez-vous votre façon de communiquer ?',
  '[{"text": "Directe et honnête", "trait": "direct"}, {"text": "Douce et attentionnée", "trait": "gentle"}, {"text": "J''écoute beaucoup", "trait": "listener"}, {"text": "J''ai besoin de temps", "trait": "reserved"}]',
  'Communication'
),
(
  'Quel est votre langage de l''amour principal ?',
  '[{"text": "Les paroles valorisantes", "trait": "words"}, {"text": "Le contact physique", "trait": "touch"}, {"text": "Les moments de qualité", "trait": "time"}, {"text": "Les attentions et cadeaux", "trait": "gifts"}]',
  'Amour'
),
(
  'Que faites-vous un samedi soir idéal ?',
  '[{"text": "Restaurant puis balade en ville", "trait": "social"}, {"text": "Film/série au chaud à deux", "trait": "cozy"}, {"text": "Soirée entre amis", "trait": "party"}, {"text": "Activité originale ou culturelle", "trait": "adventurous"}]',
  'Style de vie'
),
(
  'À quelle fréquence aimez-vous sortir ?',
  '[{"text": "Presque tous les jours", "trait": "very_social"}, {"text": "Quelques fois par semaine", "trait": "moderate"}, {"text": "Le week-end seulement", "trait": "weekend"}, {"text": "Rarement, je préfère le calme", "trait": "homebody"}]',
  'Style de vie'
),
(
  'Quel est votre rapport à l''engagement ?',
  '[{"text": "Je sais ce que je veux et je m''investis", "trait": "committed"}, {"text": "J''ai besoin de temps pour être sûr(e)", "trait": "cautious"}, {"text": "Je préfère rester libre", "trait": "free"}, {"text": "Ça dépend de la personne", "trait": "flexible"}]',
  'Relation'
),
(
  'Quel trait de caractère admirez-vous le plus ?',
  '[{"text": "L''humour et la légèreté", "trait": "humor"}, {"text": "La bienveillance et l''écoute", "trait": "kindness"}, {"text": "L''ambition et la détermination", "trait": "ambition"}, {"text": "La spontanéité et l''aventure", "trait": "spontaneous"}]',
  'Personnalité'
),
(
  'Comment gérez-vous les conflits ?',
  '[{"text": "J''en parle immédiatement", "trait": "confront"}, {"text": "J''ai besoin de réfléchir d''abord", "trait": "reflect"}, {"text": "Je cherche un compromis", "trait": "compromise"}, {"text": "J''évite les conflits", "trait": "avoid"}]',
  'Communication'
),
(
  'À quel point êtes-vous démonstratif(ve) ?',
  '[{"text": "Très démonstratif(ve), je montre mon affection", "trait": "very_affectionate"}, {"text": "Plutôt démonstratif(ve)", "trait": "affectionate"}, {"text": "Modéré(e), j''y vais doucement", "trait": "moderate_affection"}, {"text": "Plutôt réservé(e)", "trait": "reserved_affection"}]',
  'Amour'
),
(
  'Quel genre d''avenir imaginez-vous ?',
  '[{"text": "Un mariage et des enfants", "trait": "family"}, {"text": "Voyager et découvrir le monde", "trait": "travel"}, {"text": "Construire quelque chose ensemble", "trait": "build"}, {"text": "Vivre l''instant présent", "trait": "present"}]',
  'Relation'
);
