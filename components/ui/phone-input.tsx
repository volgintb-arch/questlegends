"use client"

import * as React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface Country {
  code: string
  dialCode: string
  flag: string
  mask: string
  name: string
}

const countries: Country[] = [
  { code: "RU", dialCode: "+7", flag: "🇷🇺", mask: "(___) ___-__-__", name: "Россия" },
  { code: "KZ", dialCode: "+7", flag: "🇰🇿", mask: "(___) ___-__-__", name: "Казахстан" },
  { code: "BY", dialCode: "+375", flag: "🇧🇾", mask: "(__) ___-__-__", name: "Беларусь" },
  { code: "UA", dialCode: "+380", flag: "🇺🇦", mask: "(__) ___-__-__", name: "Украина" },
  { code: "UZ", dialCode: "+998", flag: "🇺🇿", mask: "(__) ___-__-__", name: "Узбекистан" },
  { code: "KG", dialCode: "+996", flag: "🇰🇬", mask: "(___) ___-___", name: "Кыргызстан" },
  { code: "TJ", dialCode: "+992", flag: "🇹🇯", mask: "(__) ___-__-__", name: "Таджикистан" },
  { code: "AM", dialCode: "+374", flag: "🇦🇲", mask: "(__) ___-___", name: "Армения" },
  { code: "GE", dialCode: "+995", flag: "🇬🇪", mask: "(___) ___-___", name: "Грузия" },
  { code: "AZ", dialCode: "+994", flag: "🇦🇿", mask: "(__) ___-__-__", name: "Азербайджан" },
  { code: "MD", dialCode: "+373", flag: "🇲🇩", mask: "(__) ___-___", name: "Молдова" },
  { code: "TR", dialCode: "+90", flag: "🇹🇷", mask: "(___) ___-__-__", name: "Турция" },
  { code: "US", dialCode: "+1", flag: "🇺🇸", mask: "(___) ___-____", name: "США" },
]

function getDigits(value: string): string {
  return value.replace(/\D/g, "")
}

function applyMask(digits: string, mask: string): string {
  let result = ""
  let digitIndex = 0
  for (let i = 0; i < mask.length; i++) {
    if (digitIndex >= digits.length) break
    if (mask[i] === "_") {
      result += digits[digitIndex]
      digitIndex++
    } else {
      result += mask[i]
    }
  }
  return result
}

function getMaxDigits(mask: string): number {
  return (mask.match(/_/g) || []).length
}

function detectCountryFromValue(value: string): Country | null {
  if (!value) return null
  const clean = value.startsWith("+") ? value : "+" + value

  // Sort by dialCode length desc so +375 matches before +3
  const sorted = [...countries].sort((a, b) => b.dialCode.length - a.dialCode.length)
  for (const country of sorted) {
    if (clean.startsWith(country.dialCode)) {
      return country
    }
  }
  return null
}

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  id?: string
  size?: "sm" | "default"
}

export function PhoneInput({
  value,
  onChange,
  className,
  placeholder,
  required,
  disabled,
  id,
  size = "default",
}: PhoneInputProps) {
  const [selectedCountry, setSelectedCountry] = useState<Country>(countries[0])
  const [localDigits, setLocalDigits] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const initializedRef = useRef(false)

  // Parse incoming value on mount/change
  useEffect(() => {
    if (initializedRef.current) return

    if (value) {
      const detected = detectCountryFromValue(value)
      if (detected) {
        setSelectedCountry(detected)
        const afterDial = getDigits(value).slice(getDigits(detected.dialCode).length)
        setLocalDigits(afterDial)
      } else {
        // No country detected, just use digits
        const digits = getDigits(value)
        setLocalDigits(digits)
      }
      initializedRef.current = true
    }
  }, [value])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const emitChange = useCallback(
    (digits: string, country: Country) => {
      if (digits.length === 0) {
        onChange("")
      } else {
        onChange(country.dialCode + digits)
      }
    },
    [onChange],
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    const digits = getDigits(raw)
    const maxDigits = getMaxDigits(selectedCountry.mask)
    const trimmed = digits.slice(0, maxDigits)
    setLocalDigits(trimmed)
    initializedRef.current = true
    emitChange(trimmed, selectedCountry)
  }

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country)
    setIsOpen(false)
    initializedRef.current = true

    // Re-trim digits for new mask
    const maxDigits = getMaxDigits(country.mask)
    const trimmed = localDigits.slice(0, maxDigits)
    setLocalDigits(trimmed)
    emitChange(trimmed, country)

    // Focus back to input
    inputRef.current?.focus()
  }

  const displayValue = localDigits ? applyMask(localDigits, selectedCountry.mask) : ""

  const isSmall = size === "sm"

  return (
    <div className={cn("relative flex", className)} ref={dropdownRef}>
      {/* Country selector button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1 border border-r-0 border-input rounded-l-md bg-muted/50 hover:bg-muted transition-colors shrink-0",
          "focus-visible:border-primary focus-visible:ring-primary/30 focus-visible:ring-[3px] outline-none",
          "disabled:pointer-events-none disabled:opacity-50",
          isSmall ? "px-1.5 py-1 text-xs h-8" : "px-2.5 py-2 text-sm h-9",
        )}
      >
        <span className={isSmall ? "text-sm" : "text-base"}>{selectedCountry.flag}</span>
        <span className={cn("font-medium text-muted-foreground", isSmall ? "text-[10px]" : "text-xs")}>
          {selectedCountry.dialCode}
        </span>
        <ChevronDown size={isSmall ? 10 : 12} className="text-muted-foreground" />
      </button>

      {/* Phone input */}
      <input
        ref={inputRef}
        id={id}
        type="tel"
        value={displayValue}
        onChange={handleInputChange}
        placeholder={placeholder || selectedCountry.mask.replace(/_/g, "0")}
        required={required}
        disabled={disabled}
        className={cn(
          "w-full min-w-0 rounded-r-md rounded-l-none border border-input bg-transparent shadow-xs transition-[color,box-shadow] outline-none",
          "placeholder:text-muted-foreground",
          "focus-visible:border-primary focus-visible:ring-primary/30 focus-visible:ring-[3px]",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          isSmall ? "px-2 py-1 text-xs h-8" : "px-3 py-2 text-sm h-9",
        )}
      />

      {/* Country dropdown */}
      {isOpen && (
        <div
          className={cn(
            "absolute top-full left-0 mt-1 z-[100] w-64 max-h-60 overflow-y-auto",
            "bg-popover border border-border rounded-lg shadow-lg glass-popover",
          )}
        >
          {countries.map((country) => (
            <button
              key={country.code}
              type="button"
              onClick={() => handleCountrySelect(country)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-muted/50 transition-colors",
                selectedCountry.code === country.code && "bg-primary/10 text-primary",
              )}
            >
              <span className="text-base">{country.flag}</span>
              <span className="flex-1 truncate">{country.name}</span>
              <span className="text-xs text-muted-foreground font-medium">{country.dialCode}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
