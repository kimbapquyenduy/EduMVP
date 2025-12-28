'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle, AlertCircle, Users, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { PaymentForm } from '@/components/checkout/PaymentForm'
import { Class } from '@/lib/types/database.types'
import { CardDetailsInput } from '@/lib/validations/payment'

interface JoinClassModalProps {
  isOpen: boolean
  onClose: () => void
  classData: Class
  onSuccess?: () => void
}

type Step = 'confirm' | 'payment' | 'success' | 'error'

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function JoinClassModal({
  isOpen,
  onClose,
  classData,
  onSuccess,
}: JoinClassModalProps) {
  const [step, setStep] = useState<Step>('confirm')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isFree = classData.subscription_price === 0

  const handleJoinFree = async () => {
    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: classData.id,
          card: { number: '', expMonth: '', expYear: '', cvv: '' }, // Not needed for free
        }),
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.error || 'Không thể tham gia lớp học')
        setStep('error')
        return
      }

      setStep('success')
      toast.success('Đã tham gia lớp học thành công!')
      onSuccess?.()
    } catch (err) {
      console.error('Join error:', err)
      setError('Đã xảy ra lỗi')
      setStep('error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePayment = async (cardData: CardDetailsInput) => {
    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: classData.id,
          card: cardData,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.error || 'Thanh toán thất bại')
        setStep('error')
        return
      }

      setStep('success')
      toast.success('Đã đăng ký lớp học thành công!')
      onSuccess?.()
    } catch (err) {
      console.error('Payment error:', err)
      setError('Đã xảy ra lỗi khi thanh toán')
      setStep('error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    setStep('confirm')
    setError(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'confirm' && 'Tham gia lớp học'}
            {step === 'payment' && 'Thanh toán'}
            {step === 'success' && 'Thành công'}
            {step === 'error' && 'Lỗi'}
          </DialogTitle>
          {step === 'confirm' && (
            <DialogDescription>{classData.name}</DialogDescription>
          )}
        </DialogHeader>

        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Lớp học</span>
                <span className="font-medium">{classData.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Phí tham gia</span>
                {isFree ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    Miễn phí
                  </Badge>
                ) : (
                  <span className="font-bold text-primary">
                    {formatVND(classData.subscription_price)}/tháng
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>Tham gia cộng đồng và nhận hỗ trợ</span>
            </div>

            {!isFree && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Gia hạn hàng tháng</span>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Hủy
              </Button>
              {isFree ? (
                <Button
                  onClick={handleJoinFree}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    'Tham gia ngay'
                  )}
                </Button>
              ) : (
                <Button
                  onClick={() => setStep('payment')}
                  className="flex-1"
                >
                  Tiếp tục thanh toán
                </Button>
              )}
            </div>
          </div>
        )}

        {step === 'payment' && (
          <div className="space-y-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep('confirm')}
              disabled={isProcessing}
            >
              ← Quay lại
            </Button>

            <PaymentForm
              onSubmit={handlePayment}
              isLoading={isProcessing}
              tierName="Đăng ký lớp học"
              price={classData.subscription_price}
            />
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-6 space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Chào mừng bạn!</h3>
              <p className="text-muted-foreground">
                Bạn đã tham gia lớp {classData.name}
              </p>
            </div>
            <Button onClick={handleClose}>Đóng</Button>
          </div>
        )}

        {step === 'error' && (
          <div className="text-center py-6 space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Có lỗi xảy ra</h3>
              <p className="text-muted-foreground">{error}</p>
            </div>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={() => setStep('confirm')}>
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
