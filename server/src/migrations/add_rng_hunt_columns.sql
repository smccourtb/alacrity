-- Migration: Add RNG hunt columns to hunts table
ALTER TABLE hunts ADD COLUMN encounter_type TEXT;
ALTER TABLE hunts ADD COLUMN tsv INTEGER;
ALTER TABLE hunts ADD COLUMN target_nature TEXT;
ALTER TABLE hunts ADD COLUMN target_ability TEXT;
ALTER TABLE hunts ADD COLUMN target_ivs TEXT;
ALTER TABLE hunts ADD COLUMN target_frame INTEGER;
ALTER TABLE hunts ADD COLUMN current_frame INTEGER NOT NULL DEFAULT 0;
ALTER TABLE hunts ADD COLUMN perfect_iv_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE hunts ADD COLUMN is_shiny_locked INTEGER NOT NULL DEFAULT 0;
ALTER TABLE hunts ADD COLUMN has_shiny_charm INTEGER NOT NULL DEFAULT 0;
