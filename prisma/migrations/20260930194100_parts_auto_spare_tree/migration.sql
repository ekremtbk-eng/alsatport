-- Yedek Parça (Otomotiv Ekipmanları) vehicle-type leaves.
INSERT INTO categories (id, parent_id, slug, name, icon, sort_order, nav_hidden, aliases, brands)
VALUES
  ('parts', NULL, 'yedek-parca', 'Yedek Parça, Aksesuar, Donanım & Tuning', 'cog', 3, false, '{}', '{}')
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  icon = EXCLUDED.icon;

INSERT INTO categories (id, parent_id, slug, name, icon, sort_order, nav_hidden, aliases, brands)
VALUES
  ('parts-auto', 'parts', 'otomotiv-ekipmanlari', 'Otomotiv Ekipmanları', 'wrench', 1, false, '{}', '{}')
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  icon = EXCLUDED.icon;

INSERT INTO categories (id, parent_id, slug, name, icon, sort_order, nav_hidden, aliases, brands)
VALUES
  ('parts-auto-spare', 'parts-auto', 'yedek-parca-oto', 'Yedek Parça', 'cog', 1, false, '{}', '{}')
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  icon = EXCLUDED.icon;

INSERT INTO categories (id, parent_id, slug, name, icon, sort_order, nav_hidden, aliases, brands)
VALUES
  ('parts-auto-spare-auto', 'parts-auto-spare', 'yedek-otomobil-arazi', 'Otomobil & Arazi Aracı', 'car', 10, false, '{}', '{}'),
  ('parts-auto-spare-van', 'parts-auto-spare', 'yedek-minivan-panelvan', 'Minivan & Panelvan', 'van', 11, false, '{}', '{}'),
  ('parts-auto-spare-ticari', 'parts-auto-spare', 'yedek-ticari-arac', 'Ticari Araçlar', 'truck', 12, false, '{}', '{}'),
  ('parts-auto-spare-karavan', 'parts-auto-spare', 'yedek-karavan', 'Karavan', 'tent', 13, false, '{}', '{}'),
  ('parts-auto-spare-gokart', 'parts-auto-spare', 'yedek-go-kart', 'Go Kart', 'flag', 14, false, '{}', '{}')
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  icon = EXCLUDED.icon;

UPDATE listings SET category_id = 'parts-auto-spare-auto' WHERE category_id = 'parts-auto-spare';
