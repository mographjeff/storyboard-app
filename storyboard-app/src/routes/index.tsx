import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef, useCallback, useEffect, useId } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export const Route = createFileRoute('/')({
  component: StoryboardApp,
})

// ─── Types ────────────────────────────────────────────────────────────────────

type FieldKey =
  | 'voiceOver'
  | 'action'
  | 'camera'
  | 'music'
  | 'soundEffects'
  | 'link'
  | 'duration'
  | 'directorNotes'

const CUSTOM_FIELDS: FieldKey[] = [
  'camera',
  'music',
  'soundEffects',
  'link',
  'duration',
  'directorNotes',
]

const FIELD_LABELS: Record<FieldKey, string> = {
  voiceOver: 'voice over',
  action: 'action',
  camera: 'camera',
  music: 'music',
  soundEffects: 'sound effects',
  link: 'link',
  duration: 'duration',
  directorNotes: 'director notes',
}

interface Frame {
  id: string
  image: string | null
  voiceOver: string
  action: string
  camera: string
  music: string
  soundEffects: string
  link: string
  duration: string
  directorNotes: string
}

function makeFrame(index: number): Frame {
  return {
    id: `frame-${Date.now()}-${index}`,
    image: null,
    voiceOver: '',
    action: '',
    camera: '',
    music: '',
    soundEffects: '',
    link: '',
    duration: '',
    directorNotes: '',
  }
}

// ─── Auto-expanding textarea ──────────────────────────────────────────────────

function AutoTextarea({
  value,
  onChange,
  placeholder,
  darkMode,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  darkMode: boolean
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto'
      ref.current.style.height = ref.current.scrollHeight + 'px'
    }
  }, [value])
  return (
    <textarea
      ref={ref}
      value={value}
      placeholder={placeholder}
      rows={1}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full resize-none overflow-hidden text-xs leading-relaxed bg-transparent border-none outline-none placeholder-opacity-40 ${
        darkMode ? 'text-gray-200 placeholder-gray-500' : 'text-gray-700 placeholder-gray-400'
      }`}
      style={{ minHeight: '1.75rem' }}
    />
  )
}

// ─── SortableSection row ──────────────────────────────────────────────────────

function SortableSection({
  fieldKey,
  frame,
  onUpdate,
  darkMode,
}: {
  fieldKey: FieldKey
  frame: Frame
  onUpdate: (key: FieldKey, val: string) => void
  darkMode: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `section-${fieldKey}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-1 py-1 border-t ${
        darkMode ? 'border-gray-700' : 'border-gray-100'
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className={`mt-0.5 cursor-grab active:cursor-grabbing flex-shrink-0 opacity-30 hover:opacity-70 transition-opacity touch-none`}
        tabIndex={-1}
        aria-label="drag to reorder section"
      >
        <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
          <circle cx="3" cy="2" r="1.2" />
          <circle cx="7" cy="2" r="1.2" />
          <circle cx="3" cy="7" r="1.2" />
          <circle cx="7" cy="7" r="1.2" />
          <circle cx="3" cy="12" r="1.2" />
          <circle cx="7" cy="12" r="1.2" />
        </svg>
      </button>
      <div className="flex-1 min-w-0">
        <div
          className={`text-[10px] font-medium mb-0.5 ${
            darkMode ? 'text-gray-400' : 'text-gray-400'
          }`}
        >
          {FIELD_LABELS[fieldKey]}
        </div>
        <AutoTextarea
          value={frame[fieldKey] as string}
          onChange={(v) => onUpdate(fieldKey, v)}
          placeholder={FIELD_LABELS[fieldKey]}
          darkMode={darkMode}
        />
      </div>
    </div>
  )
}

// ─── Frame Card ───────────────────────────────────────────────────────────────

function FrameCard({
  frame,
  index,
  sectionOrder,
  enabledFields,
  onUpdate,
  onImageUpload,
  darkMode,
  isOverlay,
}: {
  frame: Frame
  index: number
  sectionOrder: FieldKey[]
  enabledFields: Set<FieldKey>
  onUpdate: (id: string, key: FieldKey, val: string) => void
  onImageUpload: (id: string, dataUrl: string) => void
  darkMode: boolean
  isOverlay?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: frame.id })

  const style = isOverlay
    ? {}
    : {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
      }

  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) {
        onImageUpload(frame.id, e.target.result as string)
      }
    }
    reader.readAsDataURL(file)
  }

  const [dragOver, setDragOver] = useState(false)

  const visibleSections = sectionOrder.filter(
    (k) => k === 'voiceOver' || k === 'action' || enabledFields.has(k),
  )

  // Section-level DnD sensors (we'll just render sections, reorder is global)
  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={style}
      className={`rounded-xl flex flex-col overflow-hidden shadow-sm border ${
        darkMode
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white border-gray-200'
      } ${isOverlay ? 'rotate-2 shadow-2xl' : ''}`}
    >
      {/* Frame number + drag handle — entire bar is draggable */}
      <div
        {...attributes}
        {...listeners}
        className={`flex items-center justify-between px-3 py-2 border-b cursor-grab active:cursor-grabbing touch-none select-none ${
          darkMode ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-100 hover:bg-gray-50'
        } transition-colors`}
        aria-label="drag to reorder frame"
      >
        <span
          className={`text-xs font-semibold tracking-widest ${
            darkMode ? 'text-gray-400' : 'text-gray-400'
          }`}
        >
          {String(index + 1).padStart(2, '0')}
        </span>
        <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor" className={`${darkMode ? 'text-gray-500' : 'text-gray-400'} opacity-60`}>
          <rect y="0" width="14" height="1.5" rx="1" />
          <rect y="4" width="14" height="1.5" rx="1" />
          <rect y="8" width="14" height="1.5" rx="1" />
        </svg>
      </div>

      {/* 16:9 image area */}
      <div
        className={`relative w-full cursor-pointer group ${
          dragOver
            ? darkMode
              ? 'bg-blue-900/30'
              : 'bg-blue-50'
            : ''
        }`}
        style={{ paddingBottom: '56.25%' }}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const file = e.dataTransfer.files[0]
          if (file?.type.startsWith('image/')) handleFile(file)
        }}
      >
        {frame.image ? (
          <img
            src={frame.image}
            alt={`frame ${index + 1}`}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center gap-1 ${
              darkMode ? 'bg-gray-900/60' : 'bg-gray-50'
            } group-hover:opacity-80 transition-opacity`}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className={darkMode ? 'text-gray-600' : 'text-gray-300'}
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
            <span
              className={`text-[10px] ${darkMode ? 'text-gray-600' : 'text-gray-300'}`}
            >
              click or drop image
            </span>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
      </div>

      {/* Sections */}
      <div className="px-3 pb-3 flex-1">
        <SortableContext
          items={visibleSections.map((k) => `section-${k}`)}
          strategy={verticalListSortingStrategy}
        >
          {visibleSections.map((fieldKey) => (
            <SortableSection
              key={fieldKey}
              fieldKey={fieldKey}
              frame={frame}
              onUpdate={(key, val) => onUpdate(frame.id, key, val)}
              darkMode={darkMode}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}

// ─── Share Modal ──────────────────────────────────────────────────────────────

function ShareModal({
  onClose,
  darkMode,
  onExportPDF,
}: {
  onClose: () => void
  darkMode: boolean
  onExportPDF: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [teamEmail, setTeamEmail] = useState('')
  const link = typeof window !== 'undefined' ? window.location.href : ''

  function copyLink() {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative w-full max-w-md rounded-2xl shadow-2xl p-6 ${
          darkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'
        }`}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold">share & export</h2>
          <button
            onClick={onClose}
            className={`opacity-50 hover:opacity-100 transition-opacity`}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Shareable link */}
        <div className="mb-5">
          <p className={`text-xs mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            shareable link
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={link}
              className={`flex-1 text-xs px-3 py-2 rounded-lg border ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-gray-300'
                  : 'bg-gray-50 border-gray-200 text-gray-600'
              } outline-none`}
            />
            <button
              onClick={copyLink}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                copied
                  ? 'bg-green-500 text-white'
                  : darkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {copied ? 'copied!' : 'copy'}
            </button>
          </div>
        </div>

        {/* Team members */}
        <div className="mb-5">
          <p className={`text-xs mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            invite team member
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              value={teamEmail}
              onChange={(e) => setTeamEmail(e.target.value)}
              placeholder="email address"
              className={`flex-1 text-xs px-3 py-2 rounded-lg border outline-none ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-500'
                  : 'bg-gray-50 border-gray-200 text-gray-700 placeholder-gray-400'
              }`}
            />
            <button
              className={`px-3 py-2 rounded-lg text-xs font-medium ${
                darkMode
                  ? 'bg-blue-600 hover:bg-blue-500 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              invite
            </button>
          </div>
        </div>

        {/* Divider */}
        <div
          className={`border-t mb-5 ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}
        />

        {/* PDF Export */}
        <div>
          <button
            onClick={onExportPDF}
            className="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
          >
            export pdf
          </button>
          {darkMode && (
            <p className={`text-[10px] mt-2 text-center ${darkMode ? 'text-yellow-400/80' : 'text-gray-400'}`}>
              ☀ switch to light mode for a clean white background before exporting
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

function StoryboardApp() {
  const [darkMode, setDarkMode] = useState(true)
  const [columns, setColumns] = useState(3)
  const [projectTitle, setProjectTitle] = useState('untitled project')
  const [frames, setFrames] = useState<Frame[]>(() =>
    Array.from({ length: 6 }, (_, i) => makeFrame(i)),
  )
  const [enabledFields, setEnabledFields] = useState<Set<FieldKey>>(
    new Set(['voiceOver', 'action']),
  )
  const [sectionOrder, setSectionOrder] = useState<FieldKey[]>([
    'voiceOver',
    'action',
    ...CUSTOM_FIELDS,
  ])
  const [showFieldMenu, setShowFieldMenu] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [draggingSection, setDraggingSection] = useState(false)

  const boardRef = useRef<HTMLDivElement>(null)
  const fieldMenuRef = useRef<HTMLDivElement>(null)

  // Close field menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        fieldMenuRef.current &&
        !fieldMenuRef.current.contains(e.target as Node)
      ) {
        setShowFieldMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  // ── Frame DnD ──
  function handleFrameDragStart(event: DragStartEvent) {
    const id = event.active.id as string
    if (id.startsWith('section-')) {
      setDraggingSection(true)
    } else {
      setActiveDragId(id)
    }
  }

  function handleFrameDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveDragId(null)
    setDraggingSection(false)
    if (!over || active.id === over.id) return

    const aid = active.id as string
    const oid = over.id as string

    if (aid.startsWith('section-') && oid.startsWith('section-')) {
      const aKey = aid.replace('section-', '') as FieldKey
      const oKey = oid.replace('section-', '') as FieldKey
      setSectionOrder((prev) => {
        const ai = prev.indexOf(aKey)
        const oi = prev.indexOf(oKey)
        return arrayMove(prev, ai, oi)
      })
    } else if (!aid.startsWith('section-') && !oid.startsWith('section-')) {
      setFrames((prev) => {
        const ai = prev.findIndex((f) => f.id === aid)
        const oi = prev.findIndex((f) => f.id === oid)
        return arrayMove(prev, ai, oi)
      })
    }
  }

  function toggleField(key: FieldKey) {
    setEnabledFields((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  function updateFrame(id: string, key: FieldKey, val: string) {
    setFrames((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [key]: val } : f)),
    )
  }

  function uploadImage(id: string, dataUrl: string) {
    setFrames((prev) =>
      prev.map((f) => (f.id === id ? { ...f, image: dataUrl } : f)),
    )
  }

  function addFrame() {
    setFrames((prev) => [...prev, makeFrame(prev.length)])
  }

  function insertFrame(afterIndex: number) {
    setFrames((prev) => {
      const newFrame = makeFrame(prev.length)
      const next = [...prev]
      next.splice(afterIndex + 1, 0, newFrame)
      return next
    })
  }

  // ── PDF Export ──
  async function exportPDF() {
    if (typeof window === 'undefined') return
    const { default: jsPDF } = await import('jspdf')
    const { default: html2canvas } = await import('html2canvas')

    const cards = boardRef.current?.querySelectorAll('[data-frame-card]')
    if (!cards?.length) return

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const margin = 10
    const gap = 6
    const colW = (pageW - margin * 2 - gap) / 2

    let col = 0
    let curY = margin
    let maxRowH = 0
    let isFirstCard = true

    for (let i = 0; i < cards.length; i++) {
      const el = cards[i] as HTMLElement
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: darkMode ? '#1f2937' : '#ffffff' })
      const imgData = canvas.toDataURL('image/png')
      const ratio = canvas.height / canvas.width
      const w = colW
      const h = w * ratio

      // Check if we need a new page
      if (!isFirstCard && col === 0 && curY + h > pageH - margin) {
        pdf.addPage()
        curY = margin
        maxRowH = 0
      }

      const x = margin + col * (colW + gap)

      pdf.addImage(imgData, 'PNG', x, curY, w, h)
      maxRowH = Math.max(maxRowH, h)
      isFirstCard = false

      if (col === 1) {
        // Move to next row
        curY += maxRowH + gap
        maxRowH = 0
        col = 0
      } else {
        col = 1
      }
    }

    pdf.save(`${projectTitle.replace(/\s+/g, '-')}.pdf`)
    setShowShareModal(false)
  }

  const activeFrame = activeDragId
    ? frames.find((f) => f.id === activeDragId)
    : null

  const bg = darkMode ? 'bg-gray-950' : 'bg-gray-50'
  const toolbarBg = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
  const iconColor = darkMode ? 'text-gray-300' : 'text-gray-600'

  const gridCols: Record<number, string> = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
  }

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-200`}>
      {/* Toolbar */}
      <div
        className={`sticky top-0 z-40 border-b ${toolbarBg} px-4 py-2 flex items-center gap-3 flex-wrap`}
      >
        {/* Project title */}
        <input
          value={projectTitle}
          onChange={(e) => setProjectTitle(e.target.value)}
          className={`text-sm font-semibold bg-transparent border-none outline-none min-w-0 flex-1 ${
            darkMode ? 'text-gray-100' : 'text-gray-800'
          }`}
          style={{ maxWidth: '280px' }}
        />

        <div className="flex items-center gap-2 ml-auto flex-shrink-0">
          {/* Columns selector */}
          <div className="flex items-center gap-1">
            {[2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setColumns(n)}
                className={`w-6 h-6 text-xs rounded transition-colors ${
                  columns === n
                    ? 'bg-blue-500 text-white'
                    : darkMode
                      ? 'text-gray-400 hover:text-gray-200'
                      : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          {/* + Add field */}
          <div className="relative" ref={fieldMenuRef}>
            <button
              onClick={() => setShowFieldMenu((v) => !v)}
              title="add field"
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                darkMode
                  ? 'hover:bg-gray-700 text-gray-400'
                  : 'hover:bg-gray-100 text-gray-500'
              }`}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>

            {showFieldMenu && (
              <div
                className={`absolute right-0 top-full mt-1 w-44 rounded-xl shadow-xl border py-1 z-50 ${
                  darkMode
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-gray-100'
                }`}
              >
                {CUSTOM_FIELDS.map((key) => (
                  <button
                    key={key}
                    onClick={() => toggleField(key)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors ${
                      darkMode
                        ? 'hover:bg-gray-700 text-gray-300'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <span>{FIELD_LABELS[key]}</span>
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                        enabledFields.has(key)
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : darkMode
                            ? 'border-gray-600'
                            : 'border-gray-300'
                      }`}
                    >
                      {enabledFields.has(key) && (
                        <svg
                          width="8"
                          height="8"
                          viewBox="0 0 10 10"
                          fill="none"
                          stroke="white"
                          strokeWidth="2"
                        >
                          <path d="M1.5 5l2.5 2.5 4.5-4" />
                        </svg>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dark/Light toggle */}
          <button
            onClick={() => setDarkMode((v) => !v)}
            title={darkMode ? 'switch to light mode' : 'switch to dark mode'}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
              darkMode
                ? 'hover:bg-gray-700 text-yellow-400'
                : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            {darkMode ? (
              /* Sun icon */
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            ) : (
              /* Moon icon */
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

          {/* Share / Export — paper plane */}
          <button
            onClick={() => setShowShareModal(true)}
            title="share & export"
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
              darkMode
                ? 'hover:bg-gray-700 text-gray-400'
                : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 2 11 13" />
              <path d="m22 2-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleFrameDragStart}
          onDragEnd={handleFrameDragEnd}
        >
          <SortableContext
            items={frames.map((f) => f.id)}
            strategy={rectSortingStrategy}
          >
            <div
              ref={boardRef}
              className={`grid gap-4 ${gridCols[columns] ?? 'grid-cols-3'}`}
            >
              {frames.map((frame, i) => (
                <div key={frame.id} className="relative group/insert" data-frame-card>
                  <FrameCard
                    frame={frame}
                    index={i}
                    sectionOrder={sectionOrder}
                    enabledFields={enabledFields}
                    onUpdate={updateFrame}
                    onImageUpload={uploadImage}
                    darkMode={darkMode}
                  />
                  {/* Insert frame button — appears between frames */}
                  {i < frames.length - 1 && (
                    <button
                      onClick={() => insertFrame(i)}
                      className={`absolute -right-2 top-1/2 -translate-y-1/2 translate-x-full z-10 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold opacity-0 group-hover/insert:opacity-100 transition-opacity shadow-md ${
                        darkMode
                          ? 'bg-blue-600 text-white hover:bg-blue-500'
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                      title="insert frame"
                    >
                      +
                    </button>
                  )}
                </div>
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeFrame && (
              <FrameCard
                frame={activeFrame}
                index={frames.findIndex((f) => f.id === activeFrame.id)}
                sectionOrder={sectionOrder}
                enabledFields={enabledFields}
                onUpdate={() => {}}
                onImageUpload={() => {}}
                darkMode={darkMode}
                isOverlay
              />
            )}
          </DragOverlay>
        </DndContext>

        {/* Add frame button */}
        <button
          onClick={addFrame}
          className={`mt-4 w-full py-3 rounded-xl border-2 border-dashed text-sm transition-colors ${
            darkMode
              ? 'border-gray-700 text-gray-600 hover:border-gray-500 hover:text-gray-400'
              : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-500'
          }`}
        >
          + add frame
        </button>
      </div>

      {showShareModal && (
        <ShareModal
          onClose={() => setShowShareModal(false)}
          darkMode={darkMode}
          onExportPDF={exportPDF}
        />
      )}
    </div>
  )
}
