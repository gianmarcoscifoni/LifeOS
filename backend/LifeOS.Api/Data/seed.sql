-- LifeOS Seed Data
-- Run AFTER migrations: psql -d lifeos_dev -f seed.sql

-- 1. Life domains
INSERT INTO life_domains (id, name, icon, status, priority, created_at, updated_at) VALUES
  (gen_random_uuid(), 'Career',           NULL, 'active', 1, NOW(), NOW()),
  (gen_random_uuid(), 'Health & Fitness', NULL, 'active', 2, NOW(), NOW()),
  (gen_random_uuid(), 'Spirituality',     NULL, 'active', 3, NOW(), NOW()),
  (gen_random_uuid(), 'Relationships',    NULL, 'active', 4, NOW(), NOW()),
  (gen_random_uuid(), 'Finances',         NULL, 'active', 5, NOW(), NOW()),
  (gen_random_uuid(), 'Personal Brand',   NULL, 'active', 6, NOW(), NOW()),
  (gen_random_uuid(), 'Digital Aura',     NULL, 'active', 7, NOW(), NOW()),
  (gen_random_uuid(), 'Education',        NULL, 'active', 8, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 2. Life phases
INSERT INTO life_phases (id, name, start_date, end_date, lesson_learned, energy_level, created_at) VALUES
  (gen_random_uuid(), 'Teenager stagnation',     '2012-09-01', '2018-06-01',
   'Comfort zone is a slow death. Avoiding pain means avoiding life.', 'low', NOW()),
  (gen_random_uuid(), 'First programming jobs',  '2018-09-01', '2020-01-01',
   'Trust the process even without a plan. Action beats perfection.', 'medium', NOW()),
  (gen_random_uuid(), 'University + remote grind','2020-01-01', '2022-01-01',
   'Pain and productivity coexist. Burnout is real but survivable.', 'low', NOW()),
  (gen_random_uuid(), 'Madrid Erasmus',           '2022-01-01', '2022-06-30',
   'Exposure to discomfort is the only way to grow. Spiritual reawakening.', 'high', NOW()),
  (gen_random_uuid(), 'Return and reset',         '2022-07-01', '2023-09-01',
   'Degree completed. Ready to stop being junior.', 'medium', NOW()),
  (gen_random_uuid(), 'EY era - current',         '2023-09-01', NULL,
   'Big Four environment. Building leverage for sovereign career.', 'high', NOW())
ON CONFLICT DO NOTHING;

-- 3. Brand profile
INSERT INTO brand_profiles (id, codename, global_level, total_xp, title, tier,
  origin_story, mission_statement, created_at, updated_at) VALUES
  (gen_random_uuid(), 'sovereign_engineer', 1, 0, 'Aspiring Engineer', 'bronze',
   'From years of stagnation to Madrid rebirth to Big Four. A sharp mind that wasted its teens and is now building at full speed.',
   'Build a sovereign engineering career with 200K+ compensation, full remote, property ownership, and industry voice status.',
   NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 4. Brand stats (6 core attributes) - uses subquery to get profile id
INSERT INTO brand_stats (id, profile_id, stat_name, base_value, current_value, max_value)
SELECT gen_random_uuid(), bp.id, s.stat_name, s.base_val, s.curr_val, 100
FROM brand_profiles bp,
(VALUES
  ('aesthetics', 70, 70),
  ('charisma',   40, 40),
  ('intellect',  75, 75),
  ('craft',      55, 55),
  ('resilience', 50, 50),
  ('reach',      5,  5)
) AS s(stat_name, base_val, curr_val)
WHERE bp.codename = 'sovereign_engineer'
ON CONFLICT (profile_id, stat_name) DO NOTHING;

-- 5. Skill trees (6 branches)
INSERT INTO skill_trees (id, profile_id, name, tree_level, tree_xp, xp_to_next, created_at)
SELECT gen_random_uuid(), bp.id, t.name, 1, 0, 1000, NOW()
FROM brand_profiles bp,
(VALUES
  ('Thought Leadership'),
  ('Visual Identity'),
  ('Technical Authority'),
  ('Networking'),
  ('Content Creation'),
  ('Entrepreneurship')
) AS t(name)
WHERE bp.codename = 'sovereign_engineer'
ON CONFLICT DO NOTHING;

-- 6. Brand pillars (5 editorial positions)
INSERT INTO brand_pillars (id, profile_id, name, thesis, weight_pct, status, created_at)
SELECT gen_random_uuid(), bp.id, p.name, p.thesis, p.weight, 'active', NOW()
FROM brand_profiles bp,
(VALUES
  ('Extinction Gradient',
   'AI will create a gradient of professional extinction, not a binary event.', 25),
  ('Vibe-Coding Debt Bomb',
   'Low-code AI tools create invisible technical debt that will explode.', 20),
  ('Homogenization Crisis',
   'AI-generated sameness is killing creative differentiation.', 20),
  ('Fourth Ego Injury',
   'AI is the next Copernican blow to human self-image.', 15),
  ('Sovereign Engineer Thesis',
   'The future belongs to engineers who own their tools, brand, and distribution.', 20)
) AS p(name, thesis, weight)
WHERE bp.codename = 'sovereign_engineer'
ON CONFLICT DO NOTHING;

-- 7. Platforms
INSERT INTO platforms (id, profile_id, name, handle, status, priority, created_at)
SELECT gen_random_uuid(), bp.id, p.name, p.handle, p.status, p.prio, NOW()
FROM brand_profiles bp,
(VALUES
  ('LinkedIn',          '@gianmarco',      'active',  1),
  ('Instagram',         '@gianmarco',      'active',  2),
  ('Medium',            '@gianmarco',      'planned', 3),
  ('GitHub',            '@gianmarco',      'active',  4),
  ('Personal Website',  'digitalaura.dev', 'planned', 5),
  ('X / Twitter',       '@gianmarco',      'planned', 6)
) AS p(name, handle, status, prio)
WHERE bp.codename = 'sovereign_engineer'
ON CONFLICT DO NOTHING;

-- 8. Initial finance record
INSERT INTO finances (id, current_ral, target_ral, savings, monthly_burn, currency, updated_at) VALUES
  (gen_random_uuid(), 0, 200000, 0, 2000, 'EUR', NOW())
ON CONFLICT DO NOTHING;
