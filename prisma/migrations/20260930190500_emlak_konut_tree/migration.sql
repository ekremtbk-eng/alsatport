-- Konut deal types + housing leaves (Sahibinden hierarchy).
INSERT INTO categories (id, parent_id, slug, name, icon, sort_order, nav_hidden, aliases, brands)
VALUES
  ('emlak', NULL, 'emlak', 'Emlak', 'building', 1, false, '{}', '{}')
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  icon = EXCLUDED.icon;

INSERT INTO categories (id, parent_id, slug, name, icon, sort_order, nav_hidden, aliases, brands)
VALUES
  ('emlak-konut', 'emlak', 'konut', 'Konut', 'home', 1, false, ARRAY['estate'], '{}')
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  icon = EXCLUDED.icon;

INSERT INTO categories (id, parent_id, slug, name, icon, sort_order, nav_hidden, aliases, brands)
VALUES
  ('emlak-konut-satilik', 'emlak-konut', 'satilik-konut', 'Satılık', 'key', 10, false, '{}', '{}'),
  ('emlak-konut-kiralik', 'emlak-konut', 'kiralik-konut', 'Kiralık', 'key', 11, false, '{}', '{}'),
  ('emlak-konut-gunluk', 'emlak-konut', 'turistik-gunluk-kiralik', 'Turistik Günlük Kiralık', 'palmtree', 12, false, '{}', '{}'),
  ('emlak-konut-devren', 'emlak-konut', 'devren-satilik-konut', 'Devren Satılık Konut', 'store', 13, false, '{}', '{}')
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  icon = EXCLUDED.icon;

INSERT INTO categories (id, parent_id, slug, name, icon, sort_order, nav_hidden, aliases, brands)
VALUES
  ('emlak-konut-satilik-daire', 'emlak-konut-satilik', 'satilik-daire', 'Daire', 'home', 20, false, ARRAY['daire','emlak-konut-daire'], '{}'),
  ('emlak-konut-satilik-residence', 'emlak-konut-satilik', 'satilik-residence', 'Rezidans', 'buildings', 21, false, ARRAY['residence','emlak-konut-residence'], '{}'),
  ('emlak-konut-satilik-mustakil-ev', 'emlak-konut-satilik', 'satilik-mustakil-ev', 'Müstakil Ev', 'home', 22, false, ARRAY['mustakil-ev','emlak-konut-mustakil'], '{}'),
  ('emlak-konut-satilik-villa', 'emlak-konut-satilik', 'satilik-villa', 'Villa', 'hotel', 23, false, ARRAY['villa','emlak-konut-villa'], '{}'),
  ('emlak-konut-satilik-ciftlik-evi', 'emlak-konut-satilik', 'satilik-ciftlik-evi', 'Çiftlik Evi', 'trees', 24, false, ARRAY['ciftlik-evi'], '{}'),
  ('emlak-konut-satilik-kosk-konak', 'emlak-konut-satilik', 'satilik-kosk-konak', 'Köşk & Konak', 'landmark', 25, false, ARRAY['kosk-konak'], '{}'),
  ('emlak-konut-satilik-yali', 'emlak-konut-satilik', 'satilik-yali', 'Yalı', 'palmtree', 26, false, ARRAY['yali'], '{}'),
  ('emlak-konut-satilik-yali-dairesi', 'emlak-konut-satilik', 'satilik-yali-dairesi', 'Yalı Dairesi', 'home', 27, false, ARRAY['yali-dairesi'], '{}'),
  ('emlak-konut-satilik-yazlik', 'emlak-konut-satilik', 'satilik-yazlik', 'Yazlık', 'palmtree', 28, false, ARRAY['yazlik','emlak-konut-yazlik'], '{}'),
  ('emlak-konut-kiralik-daire', 'emlak-konut-kiralik', 'kiralik-daire', 'Daire', 'home', 30, false, ARRAY['daire'], '{}'),
  ('emlak-konut-kiralik-residence', 'emlak-konut-kiralik', 'kiralik-residence', 'Rezidans', 'buildings', 31, false, ARRAY['residence'], '{}'),
  ('emlak-konut-kiralik-mustakil-ev', 'emlak-konut-kiralik', 'kiralik-mustakil-ev', 'Müstakil Ev', 'home', 32, false, ARRAY['mustakil-ev'], '{}'),
  ('emlak-konut-kiralik-villa', 'emlak-konut-kiralik', 'kiralik-villa', 'Villa', 'hotel', 33, false, ARRAY['villa'], '{}'),
  ('emlak-konut-kiralik-ciftlik-evi', 'emlak-konut-kiralik', 'kiralik-ciftlik-evi', 'Çiftlik Evi', 'trees', 34, false, ARRAY['ciftlik-evi'], '{}'),
  ('emlak-konut-kiralik-kosk-konak', 'emlak-konut-kiralik', 'kiralik-kosk-konak', 'Köşk & Konak', 'landmark', 35, false, ARRAY['kosk-konak'], '{}'),
  ('emlak-konut-kiralik-yali', 'emlak-konut-kiralik', 'kiralik-yali', 'Yalı', 'palmtree', 36, false, ARRAY['yali'], '{}'),
  ('emlak-konut-kiralik-yali-dairesi', 'emlak-konut-kiralik', 'kiralik-yali-dairesi', 'Yalı Dairesi', 'home', 37, false, ARRAY['yali-dairesi'], '{}'),
  ('emlak-konut-kiralik-yazlik', 'emlak-konut-kiralik', 'kiralik-yazlik', 'Yazlık', 'palmtree', 38, false, ARRAY['yazlik'], '{}'),
  ('emlak-konut-gunluk-daire', 'emlak-konut-gunluk', 'gunluk-kiralik-daire', 'Daire', 'home', 40, false, ARRAY['daire'], '{}'),
  ('emlak-konut-gunluk-residence', 'emlak-konut-gunluk', 'gunluk-kiralik-residence', 'Rezidans', 'buildings', 41, false, ARRAY['residence'], '{}'),
  ('emlak-konut-gunluk-mustakil-ev', 'emlak-konut-gunluk', 'gunluk-kiralik-mustakil-ev', 'Müstakil Ev', 'home', 42, false, ARRAY['mustakil-ev'], '{}'),
  ('emlak-konut-gunluk-villa', 'emlak-konut-gunluk', 'gunluk-kiralik-villa', 'Villa', 'hotel', 43, false, ARRAY['villa'], '{}'),
  ('emlak-konut-gunluk-ciftlik-evi', 'emlak-konut-gunluk', 'gunluk-kiralik-ciftlik-evi', 'Çiftlik Evi', 'trees', 44, false, ARRAY['ciftlik-evi'], '{}'),
  ('emlak-konut-gunluk-kosk-konak', 'emlak-konut-gunluk', 'gunluk-kiralik-kosk-konak', 'Köşk & Konak', 'landmark', 45, false, ARRAY['kosk-konak'], '{}'),
  ('emlak-konut-gunluk-yali', 'emlak-konut-gunluk', 'gunluk-kiralik-yali', 'Yalı', 'palmtree', 46, false, ARRAY['yali'], '{}'),
  ('emlak-konut-gunluk-yali-dairesi', 'emlak-konut-gunluk', 'gunluk-kiralik-yali-dairesi', 'Yalı Dairesi', 'home', 47, false, ARRAY['yali-dairesi'], '{}'),
  ('emlak-konut-gunluk-yazlik', 'emlak-konut-gunluk', 'gunluk-kiralik-yazlik', 'Yazlık', 'palmtree', 48, false, ARRAY['yazlik'], '{}'),
  ('emlak-konut-devren-daire', 'emlak-konut-devren', 'devren-satilik-daire', 'Daire', 'home', 50, false, ARRAY['daire'], '{}'),
  ('emlak-konut-devren-residence', 'emlak-konut-devren', 'devren-satilik-residence', 'Rezidans', 'buildings', 51, false, ARRAY['residence'], '{}'),
  ('emlak-konut-devren-mustakil-ev', 'emlak-konut-devren', 'devren-satilik-mustakil-ev', 'Müstakil Ev', 'home', 52, false, ARRAY['mustakil-ev'], '{}'),
  ('emlak-konut-devren-villa', 'emlak-konut-devren', 'devren-satilik-villa', 'Villa', 'hotel', 53, false, ARRAY['villa'], '{}'),
  ('emlak-konut-devren-ciftlik-evi', 'emlak-konut-devren', 'devren-satilik-ciftlik-evi', 'Çiftlik Evi', 'trees', 54, false, ARRAY['ciftlik-evi'], '{}'),
  ('emlak-konut-devren-kosk-konak', 'emlak-konut-devren', 'devren-satilik-kosk-konak', 'Köşk & Konak', 'landmark', 55, false, ARRAY['kosk-konak'], '{}'),
  ('emlak-konut-devren-yali', 'emlak-konut-devren', 'devren-satilik-yali', 'Yalı', 'palmtree', 56, false, ARRAY['yali'], '{}'),
  ('emlak-konut-devren-yali-dairesi', 'emlak-konut-devren', 'devren-satilik-yali-dairesi', 'Yalı Dairesi', 'home', 57, false, ARRAY['yali-dairesi'], '{}'),
  ('emlak-konut-devren-yazlik', 'emlak-konut-devren', 'devren-satilik-yazlik', 'Yazlık', 'palmtree', 58, false, ARRAY['yazlik'], '{}')
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  aliases = EXCLUDED.aliases;

UPDATE listings SET category_id = 'emlak-konut-satilik-daire' WHERE category_id = 'emlak-konut-daire';
UPDATE listings SET category_id = 'emlak-konut-satilik-residence' WHERE category_id = 'emlak-konut-residence';
UPDATE listings SET category_id = 'emlak-konut-satilik-villa' WHERE category_id = 'emlak-konut-villa';
UPDATE listings SET category_id = 'emlak-konut-satilik-mustakil-ev' WHERE category_id = 'emlak-konut-mustakil';
UPDATE listings SET category_id = 'emlak-konut-satilik-yazlik' WHERE category_id = 'emlak-konut-yazlik';
