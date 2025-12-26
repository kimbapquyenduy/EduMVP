'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronUp, Copy, Check, AlertCircle, CheckCircle } from 'lucide-react'
import { TEST_CARDS } from '@/lib/types/payment.types'

interface TestCard {
  number: string
  result: 'success' | 'fail'
  description: string
}

const testCards: TestCard[] = [
  {
    number: TEST_CARDS.SUCCESS,
    result: 'success',
    description: 'Thanh toán thành công',
  },
  {
    number: TEST_CARDS.DECLINED,
    result: 'fail',
    description: 'Thẻ bị từ chối',
  },
]

function formatCardNumber(number: string): string {
  return number.replace(/(.{4})/g, '$1 ').trim()
}

export function TestCardHints() {
  const [isOpen, setIsOpen] = useState(false)
  const [copiedCard, setCopiedCard] = useState<string | null>(null)

  const copyToClipboard = async (number: string) => {
    try {
      await navigator.clipboard.writeText(number)
      setCopiedCard(number)
      setTimeout(() => setCopiedCard(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="rounded-lg border bg-amber-50 border-amber-200">
      <button
        type="button"
        className="w-full flex items-center justify-between p-3 text-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
            TEST MODE
          </Badge>
          <span className="text-sm text-amber-700">Thẻ thử nghiệm</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-amber-600" />
        ) : (
          <ChevronDown className="w-4 h-4 text-amber-600" />
        )}
      </button>

      {isOpen && (
        <div className="px-3 pb-3 space-y-2">
          {testCards.map((card) => (
            <div
              key={card.number}
              className="flex items-center justify-between p-2 rounded bg-white border"
            >
              <div className="flex items-center gap-2">
                {card.result === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
                <div>
                  <p className="text-sm font-mono">{formatCardNumber(card.number)}</p>
                  <p className="text-xs text-muted-foreground">{card.description}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(card.number)}
              >
                {copiedCard === card.number ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          ))}
          <p className="text-xs text-amber-600 text-center pt-1">
            Sử dụng MM/YY bất kỳ trong tương lai và CVV 3 số
          </p>
        </div>
      )}
    </div>
  )
}
