'use client'

import { LessonStep, PdfStepContent } from '@/lib/types/types'
import { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { stepsApi } from '@/lib/api/steps'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

interface PdfStepProps {
  step: LessonStep
}

export function PdfStep({ step }: PdfStepProps) {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [loading, setLoading] = useState(false)
  const content = step.content as PdfStepContent

  const handleNext = async () => {
    setLoading(true)
    try {
      await stepsApi.completeStep(step.step_id)
    } catch (error) {
      console.error('Ошибка завершения шага:', error)
    } finally {
      setLoading(false)
    }
  }

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">{content.title}</h2>
      <div className="mb-4 flex items-center gap-4">
        <button
          onClick={() => setPageNumber((prev) => Math.max(1, prev - 1))}
          disabled={pageNumber <= 1}
          className="px-4 py-2 bg-gray-200 rounded-md disabled:opacity-50"
        >
          Предыдущая
        </button>
        <span>
          Страница {pageNumber} из {numPages || '?'}
        </span>
        <button
          onClick={() => setPageNumber((prev) => Math.min(numPages || 1, prev + 1))}
          disabled={pageNumber >= (numPages || 1)}
          className="px-4 py-2 bg-gray-200 rounded-md disabled:opacity-50"
        >
          Следующая
        </button>
      </div>
      <div className="border border-gray-300 mb-6">
        <Document
          file={content.pdf_url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<div className="p-8">Загрузка PDF...</div>}
        >
          <Page pageNumber={pageNumber} width={800} />
        </Document>
      </div>
      <button
        onClick={handleNext}
        disabled={loading}
        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Загрузка...' : 'Далее'}
      </button>
    </div>
  )
}

