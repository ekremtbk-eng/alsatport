-- Motosiklet Ekipmanları tree (Sahibinden: gear + spare + acc + electronics + tires).
INSERT INTO categories (id, parent_id, slug, name, icon, sort_order, nav_hidden, aliases, brands)
VALUES
  ('parts', NULL, 'yedek-parca', 'Yedek Parça, Aksesuar, Donanım & Tuning', 'cog', 3, false, '{}', '{}')
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  icon = EXCLUDED.icon;

INSERT INTO categories (id, parent_id, slug, name, icon, sort_order, nav_hidden, aliases, brands)
VALUES
  ('parts-moto', 'parts', 'motosiklet-ekipmanlari', 'Motosiklet Ekipmanları', 'bike', 2, false, '{}', '{}')
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  icon = EXCLUDED.icon;

INSERT INTO categories (id, parent_id, slug, name, icon, sort_order, nav_hidden, aliases, brands)
VALUES
  ('parts-moto-gear', 'parts-moto', 'kask-kiyafet-ekipman', 'Kask, Kıyafet & Ekipman', 'shield', 1, false, ARRAY['kask-mont'], '{}')
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  aliases = EXCLUDED.aliases;

INSERT INTO categories (id, parent_id, slug, name, icon, sort_order, nav_hidden, aliases, brands)
VALUES
  ('parts-moto-gear-boots', 'parts-moto-gear', 'moto-ayakkabi-bot', 'Ayakkabı & Bot', 'footprints', 10, false, '{}', '{}'),
  ('parts-moto-gear-helmet', 'parts-moto-gear', 'moto-kask', 'Kask', 'shield', 11, false, '{}', '{}'),
  ('parts-moto-gear-jacket', 'parts-moto-gear', 'moto-mont', 'Mont', 'shirt', 12, false, '{}', '{}'),
  ('parts-moto-gear-pants', 'parts-moto-gear', 'moto-pantolon', 'Pantolon', 'shirt', 13, false, '{}', '{}'),
  ('parts-moto-gear-sweat', 'parts-moto-gear', 'moto-sweatshirt', 'Sweatshirt', 'shirt', 14, false, '{}', '{}'),
  ('parts-moto-gear-tee', 'parts-moto-gear', 'moto-tisort', 'Tişört', 'shirt', 15, false, '{}', '{}'),
  ('parts-moto-gear-suit', 'parts-moto-gear', 'moto-tulum', 'Tulum', 'shirt', 16, false, '{}', '{}'),
  ('parts-moto-gear-rain', 'parts-moto-gear', 'moto-yagmurluk', 'Yağmurluk', 'cloud', 17, false, '{}', '{}')
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  icon = EXCLUDED.icon;

INSERT INTO categories (id, parent_id, slug, name, icon, sort_order, nav_hidden, aliases, brands)
VALUES
  ('parts-moto-spare', 'parts-moto', 'moto-yedek-parca', 'Yedek Parça', 'cog', 2, false, '{}', '{}'),
  ('parts-moto-acc', 'parts-moto', 'moto-aksesuar', 'Aksesuar & Tuning', 'sparkles', 3, false, '{}', '{}'),
  ('parts-moto-elec', 'parts-moto', 'moto-elektronik', 'Elektronik Ekipman', 'cpu', 4, false, '{}', '{}'),
  ('parts-moto-tire', 'parts-moto', 'moto-jant-lastik', 'Jant & Lastik', 'circle', 5, false, '{}', '{}')
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  icon = EXCLUDED.icon;

UPDATE listings SET category_id = 'parts-moto-gear-helmet' WHERE category_id = 'parts-moto-gear';
