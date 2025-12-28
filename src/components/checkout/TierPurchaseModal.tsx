'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { TierCard } from './TierCard'
import { PaymentForm } from './PaymentForm'
import { SubscriptionTier, TierPurchase } from '@/lib/types/database.types'
import { CardDetailsInput } from '@/lib/validations/payment'
import { ProcessPaymentResponse } from '@/lib/types/payment.types'

interface TierPurchaseModalProps {
  isOpen: boolean
  onClose: () => void
  classId: string
  className?: string
  currentTierPurchase?: TierPurchase & { tier: SubscriptionTier } | null
  onSuccess?: (purchase: TierPurchase) => void
}

type Step = 'select' | 'payment' | 'success' | 'error'

export function TierPurchaseModal({
  isOpen,
  onClose,
  classId,
  className,
  currentTierPurchase,
  onSuccess,
}: TierPurchaseModalProps) {
  const [step, setStep] = useState<Step>('select')
  const [tiers, setTiers] = useState<SubscriptionTier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchTiers()
      setStep('select')
      setSelectedTier(null)
      setError(null)
    }
  }, [isOpen, classId])

  const fetchTiers = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/tiers/${classId}`)
      const data = await response.json()

      if (!response.ok) {
        console.error('API error:', data)
        throw new Error(data.error || 'Failed to fetch tiers')
      }

      setTiers(data.tiers || [])
    } catch (err) {
      console.error('Error fetching tiers:', err)
      toast.error(err instanceof Error ? err.message : 'Không thể tải thông tin gói')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTierSelect = (tier: SubscriptionTier) => {
    setSelectedTier(tier)
    setStep('payment')
  }

  const handlePayment = async (cardData: CardDetailsInput) => {
    if (!selectedTier) return

    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId,
          tierId: selectedTier.id,
          card: cardData,
        }),
      })

      const result: ProcessPaymentResponse = await response.json()

      if (!result.success) {
        setError(result.error || 'Thanh toán thất bại')
        setStep('error')
        return
      }

      setStep('success')

      if (result.purchase && onSuccess) {
        onSuccess(result.purchase)
      }

      const lessonText = selectedTier.lesson_unlock_count === null
        ? 'tất cả bài học'
        : `${selectedTier.lesson_unlock_count} bài học`

      toast.success(`Đã mở khóa ${lessonText}!`)
    } catch (err) {
      console.error('Payment error:', err)
      setError('Đã xảy ra lỗi khi xử lý thanh toán')
      setStep('error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBack = () => {
    setStep('select')
    setSelectedTier(null)
    setError(null)
  }

  const handleClose = () => {
    onClose()
  }

  const currentTierLevel = currentTierPurchase?.tier?.tier_level

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'select' && 'Chọn gói học'}
            {step === 'payment' && 'Thanh toán'}
            {step === 'success' && 'Thanh toán thành công'}
            {step === 'error' && 'Thanh toán thất bại'}
          </DialogTitle>
          {className && step === 'select' && (
            <DialogDescription>{className}</DialogDescription>
          )}
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-48 rounded-xl" />
                ))}
              </div>
            ) : (() => {
              // Filter: only show paid tiers (level > 0) that are enabled
              const availableTiers = tiers.filter(
                (t) => t.tier_level > 0 && t.is_enabled
              )
              return availableTiers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Không có gói nào khả dụng
                </p>
              ) : (
                <div className={`grid grid-cols-1 gap-4 ${
                  availableTiers.length === 1 ? 'sm:grid-cols-1 max-w-sm mx-auto' :
                  availableTiers.length === 2 ? 'sm:grid-cols-2 max-w-lg mx-auto' :
                  'sm:grid-cols-3'
                }`}>
                  {availableTiers.map((tier) => (
                    <TierCard
                      key={tier.id}
                      tier={tier}
                      isSelected={selectedTier?.id === tier.id}
                      isOwned={currentTierLevel === tier.tier_level}
                      isHighlighted={tier.tier_level === availableTiers.length}
                      currentTierLevel={currentTierLevel}
                      onSelect={handleTierSelect}
                    />
                  ))}
                </div>
              )
            })()}
          </div>
        )}

        {step === 'payment' && selectedTier && (
          <div className="space-y-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              disabled={isProcessing}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay lại
            </Button>

            <PaymentForm
              onSubmit={handlePayment}
              isLoading={isProcessing}
              tierName={selectedTier.name}
              price={selectedTier.price}
            />
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-8 space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Thanh toán thành công!</h3>
              <p className="text-muted-foreground">
                Bạn đã mở khóa gói {selectedTier?.name}
              </p>
            </div>
            <Button onClick={handleClose}>Đóng</Button>
          </div>
        )}

        {step === 'error' && (
          <div className="text-center py-8 space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Thanh toán thất bại</h3>
              <p className="text-muted-foreground">{error}</p>
            </div>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={handleBack}>
                Thử lại
              </Button>
              <Button variant="ghost" onClick={handleClose}>
                Đóng
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
