import { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function Input({ label, className = '', ...props }: InputProps) {
  return (
    <div>
      {label && (
        <label htmlFor={props.id} className="block text-sm font-medium mb-1">
          {label}
        </label>
      )}
      <input
        className={`block w-full px-3 py-2 border border-gray-300 rounded-md ${className}`}
        {...props}
      />
    </div>
  )
}

