import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UploadCloud, ImageUp, Sparkles, X } from 'lucide-react'
import { useMedication } from '../context/MedicationContext.jsx'
import { SAMPLE_EXTRACTION } from '../data/mockData.js'
import Spinner from './components/Spinner.jsx'
import './UploadPage.css'

export default function UploadPage() {
  const [preview, setPreview] = useState(null)
  const [fileName, setFileName] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const inputRef = useRef(null)
  const navigate = useNavigate()
  const { setMedicines } = useMedication()

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target.result)
    reader.readAsDataURL(file)
  }

  function onDrop(e) {
    e.preventDefault()
    setDragActive(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  function clearFile() {
    setPreview(null)
    setFileName('')
    if (inputRef.current) inputRef.current.value = ''
  }

  function analyze() {
    setAnalyzing(true)
    // Simulated OCR + AI parse delay — this prototype has no backend,
    // so we hand off to the same sample extraction the Review screen expects.
    setTimeout(() => {
      setMedicines(SAMPLE_EXTRACTION)
      setAnalyzing(false)
      navigate('/app/review')
    }, 1600)
  }

  return (
    <div className="upload-page">
      <div className="upload-page__head">
        <span className="eyebrow">Step 1 of 4</span>
        <h1>Upload a prescription</h1>
        <p>Take a clear photo of the handwritten prescription, or upload one from your device.</p>
      </div>

      {!preview ? (
        <div
          className={`upload-page__drop ${dragActive ? 'upload-page__drop--active' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <div className="upload-page__drop-icon">
            <UploadCloud size={28} strokeWidth={1.8} />
          </div>
          <p className="upload-page__drop-title">Drag & drop a prescription image here</p>
          <p className="upload-page__drop-sub">or click to browse · JPG, PNG up to 10MB</p>
        </div>
      ) : (
        <div className="upload-page__preview-card">
          <div className={`upload-page__preview ${analyzing ? 'upload-page__preview--scanning' : ''}`}>
            <img src={preview} alt="Uploaded prescription preview" />
            {analyzing && (
              <div className="upload-page__scanline">
                <Sparkles size={14} />
              </div>
            )}
          </div>
          <div className="upload-page__preview-meta">
            <div>
              <p className="upload-page__filename">{fileName}</p>
              {analyzing ? (
                <Spinner label="Analyzing prescription..." />
              ) : (
                <p className="upload-page__hint">Ready to analyze</p>
              )}
            </div>
            {!analyzing && (
              <button className="upload-page__clear" onClick={clearFile} aria-label="Remove image">
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="upload-page__actions">
        <button
          className="btn btn-secondary"
          onClick={() => inputRef.current?.click()}
          disabled={analyzing}
        >
          <ImageUp size={17} /> {preview ? 'Choose a different image' : 'Browse files'}
        </button>
        <button
          className="btn btn-primary"
          onClick={analyze}
          disabled={!preview || analyzing}
        >
          <Sparkles size={17} /> {analyzing ? 'Analyzing…' : 'Analyze prescription'}
        </button>
      </div>

      <div className="upload-page__note">
        <strong>Prototype note:</strong> no image is sent anywhere — this demo simulates the AI
        extraction step and hands off to the Review screen with sample data.
      </div>
    </div>
  )
}
