-- Migration: Add subscription_plan to stores table
-- Description: Adds a column to track subscription plan (free/premium)
-- Created: 2026-01-15

ALTER TABLE stores ADD COLUMN subscription_plan ENUM('free', 'premium') DEFAULT 'free' AFTER logo_url;
CREATE INDEX idx_subscription_plan ON stores(subscription_plan);
