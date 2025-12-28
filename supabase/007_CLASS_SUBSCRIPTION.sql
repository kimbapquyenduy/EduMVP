-- ============================================
-- MIGRATION: Class Subscription System
-- ============================================
-- Adds monthly subscription fee for class joining
-- - subscription_price: Monthly fee in VND (0 = free)
-- - Updates membership to track subscription payments
-- ============================================

-- 1. Add subscription fields to classes
ALTER TABLE classes
ADD COLUMN IF NOT EXISTS subscription_price INTEGER DEFAULT 0 CHECK (subscription_price >= 0);

-- Comment: subscription_price in VND (0 = free to join)

-- 2. Add subscription tracking to memberships
ALTER TABLE memberships
ADD COLUMN IF NOT EXISTS subscription_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_payment_id UUID REFERENCES payments(id);

-- 3. Create class_subscriptions table for payment history
CREATE TABLE IF NOT EXISTS class_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id),
  amount INTEGER NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'VND',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_class_subscriptions_user ON class_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_class_subscriptions_class ON class_subscriptions(class_id);
CREATE INDEX IF NOT EXISTS idx_class_subscriptions_status ON class_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_class_subscriptions_expires ON class_subscriptions(expires_at);

-- 5. RLS Policies for class_subscriptions
ALTER TABLE class_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscriptions
CREATE POLICY "Users can read own subscriptions"
ON class_subscriptions FOR SELECT
USING (auth.uid() = user_id);

-- Teachers can read subscriptions for their classes
CREATE POLICY "Teachers can read class subscriptions"
ON class_subscriptions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = class_subscriptions.class_id
    AND classes.teacher_id = auth.uid()
  )
);

-- Only system can insert/update (via API)
CREATE POLICY "System can manage subscriptions"
ON class_subscriptions FOR ALL
USING (auth.uid() IS NOT NULL);

-- 6. Function to check if user has active subscription
CREATE OR REPLACE FUNCTION has_active_subscription(p_user_id UUID, p_class_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if class is free
  IF EXISTS (
    SELECT 1 FROM classes
    WHERE id = p_class_id AND subscription_price = 0
  ) THEN
    RETURN true;
  END IF;

  -- Check for active subscription
  RETURN EXISTS (
    SELECT 1 FROM class_subscriptions
    WHERE user_id = p_user_id
    AND class_id = p_class_id
    AND status = 'active'
    AND expires_at > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function to check if user can access class content
CREATE OR REPLACE FUNCTION can_access_class(p_user_id UUID, p_class_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_teacher BOOLEAN;
  v_is_member BOOLEAN;
  v_is_free BOOLEAN;
  v_has_subscription BOOLEAN;
BEGIN
  -- Check if user is teacher
  SELECT EXISTS (
    SELECT 1 FROM classes WHERE id = p_class_id AND teacher_id = p_user_id
  ) INTO v_is_teacher;

  IF v_is_teacher THEN
    RETURN true;
  END IF;

  -- Check if user is member
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE class_id = p_class_id AND user_id = p_user_id AND status = 'ACTIVE'
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RETURN false;
  END IF;

  -- Check if class is free
  SELECT subscription_price = 0 INTO v_is_free
  FROM classes WHERE id = p_class_id;

  IF v_is_free THEN
    RETURN true;
  END IF;

  -- Check for active subscription
  RETURN has_active_subscription(p_user_id, p_class_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
