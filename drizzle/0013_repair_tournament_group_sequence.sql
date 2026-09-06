-- Repair the serial sequence used by tournament_groups and backfill any tournament
-- that was created while the automatic Main Group insert was failing.
SELECT setval(
  pg_get_serial_sequence('tournament_groups', 'id'),
  COALESCE((SELECT MAX(id) FROM tournament_groups), 0) + 1,
  false
);

INSERT INTO tournament_groups (tournament_id, name, sort_order)
SELECT t.id, 'Main Group', 0
FROM tournaments t
WHERE NOT EXISTS (
  SELECT 1
  FROM tournament_groups g
  WHERE g.tournament_id = t.id
);

-- Re-sync once more after the backfill so future inserts always receive a free id.
SELECT setval(
  pg_get_serial_sequence('tournament_groups', 'id'),
  COALESCE((SELECT MAX(id) FROM tournament_groups), 0) + 1,
  false
);
