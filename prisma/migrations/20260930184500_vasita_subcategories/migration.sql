-- Extra Vasıta leaves used by the listing wizard (ids match src/data/categories.ts).
INSERT INTO categories (id, parent_id, slug, name, icon, sort_order, nav_hidden, aliases, brands)
VALUES
  ('vasita', NULL, 'vasita', 'Vasıta', 'car', 2, false, '{}', '{}')
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  icon = EXCLUDED.icon;

INSERT INTO categories (id, parent_id, slug, name, icon, sort_order, nav_hidden, aliases, brands)
VALUES
  ('vasita-karavan', 'vasita', 'karavan', 'Karavan', 'tent', 90, false, '{}', '{}'),
  ('vasita-klasik', 'vasita', 'klasik-araclar', 'Klasik Araçlar', 'crown', 91, false, '{}', '{}'),
  ('vasita-hava', 'vasita', 'hava-araclari', 'Hava Araçları', 'plane', 92, false, '{}', '{}'),
  ('vasita-atv', 'vasita', 'atv', 'ATV', 'bike', 93, false, '{}', '{}'),
  ('vasita-utv', 'vasita', 'utv', 'UTV', 'bike', 94, false, '{}', '{}'),
  ('vasita-engelli', 'vasita', 'engelli-plakali-araclar', 'Engelli Plakalı Araçlar', 'access', 95, false, '{}', '{}')
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  icon = EXCLUDED.icon;
