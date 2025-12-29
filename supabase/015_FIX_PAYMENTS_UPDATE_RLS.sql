-- ============================================
-- FIX: Add missing permissions for payments table
-- Run this in Supabase SQL Editor
-- Issue: Payment processing fails - missing GRANT and UPDATE policy
-- ============================================

-- Grant ALL necessary permissions on payments table
GRANT SELECT, INSERT, UPDATE ON payments TO authenticated;

-- Drop existing UPDATE policies if any
DROP POLICY IF EXISTS "users_update_own_payments" ON payments;
DROP POLICY IF EXISTS "payments_update_own" ON payments;

-- Allow users to update their own payments (for status changes)
CREATE POLICY "payments_update_own" ON payments
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Verification
SELECT 'payments' as table_name, policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'payments';
