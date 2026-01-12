interface ProgressBarProps {
  progress: number // 0-100
  className?: string
}

export function ProgressBar({ progress, className = '' }: ProgressBarProps) {
  return (
    <div className={`w-full bg-gray-200 rounded-full h-2.5 ${className}`}>
      <div
        className="bg-blue-600 h-2.5 rounded-full transition-all"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  )
}

