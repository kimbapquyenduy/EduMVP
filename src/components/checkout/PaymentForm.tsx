'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Label } from '@/components/ui/label'
import { Loader2, CreditCard } from 'lucide-react'
import {
  cardDetailsSchema,
  isCardExpired,
  isCardExpiryTooFar,
  type CardDetailsInput,
} from '@/lib/validations/payment'
import { TestCardHints } from './TestCardHints'

// Extended schema with expiry validation
const paymentFormSchema = cardDetailsSchema.refine(
  (data) => !isCardExpired(data.expMonth, data.expYear),
  { message: 'Thẻ đã hết hạn', path: ['expMonth'] }
).refine(
  (data) => !isCardExpiryTooFar(data.expYear),
  { message: 'Ngày hết hạn không hợp lệ', path: ['expYear'] }
)

interface PaymentFormProps {
  onSubmit: (data: CardDetailsInput) => Promise<void>
  isLoading: boolean
  tierName: string
  price: number
}

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatCardInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16)
  const groups = digits.match(/.{1,4}/g) || []
  return groups.join(' ')
}

function formatExpiryInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length >= 2) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`
  }
  return digits
}

export function PaymentForm({ onSubmit, isLoading, tierName, price }: PaymentFormProps) {
  const form = useForm<CardDetailsInput>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      number: '',
      expMonth: '',
      expYear: '',
      cvv: '',
    },
  })

  const handleSubmit = async (data: CardDetailsInput) => {
    await onSubmit(data)
  }

  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (value: string) => void) => {
    const formatted = formatCardInput(e.target.value)
    const digitsOnly = formatted.replace(/\s/g, '')
    onChange(digitsOnly)
    e.target.value = formatted
  }

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiryInput(e.target.value)
    const [month, year] = formatted.split('/')
    form.setValue('expMonth', month || '')
    form.setValue('expYear', year || '')
    e.target.value = formatted
  }

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg bg-muted">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Gói đã chọn</span>
          <span className="font-medium">{tierName}</span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm text-muted-foreground">Tổng thanh toán</span>
          <span className="text-lg font-bold text-primary">{formatVND(price)}</span>
        </div>
      </div>

      <TestCardHints />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Số thẻ</FormLabel>
                <FormControl>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="1234 5678 9012 3456"
                      className="pl-10"
                      onChange={(e) => handleCardChange(e, field.onChange)}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                      disabled={isLoading}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ngày hết hạn</Label>
              <Input
                placeholder="MM/YY"
                maxLength={5}
                onChange={handleExpiryChange}
                disabled={isLoading}
              />
              {(form.formState.errors.expMonth || form.formState.errors.expYear) && (
                <p className="text-[0.8rem] font-medium text-destructive">
                  {form.formState.errors.expMonth?.message || form.formState.errors.expYear?.message}
                </p>
              )}
            </div>

            <FormField
              control={form.control}
              name="cvv"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CVV</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="123"
                      maxLength={4}
                      type="password"
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                        field.onChange(value)
                      }}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>Thanh toán {formatVND(price)}</>
            )}
          </Button>
        </form>
      </Form>
    </div>
  )
}
