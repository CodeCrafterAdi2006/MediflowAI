import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UploadCloud, ImageUp, Sparkles, X, AlertTriangle } from 'lucide-react'
import { useMedication } from '../context/MedicationContext.jsx'
import { SAMPLE_EXTRACTION } from '../data/mockData.js'
import { uploadPrescription } from '../lib/api.js'
import Spinner from './components/Spinner.jsx'
import './UploadPage.css'

export default function UploadPage() {
  const [preview, setPreview] = useState(null)
  const [fileName, setFileName] = useState('')
  const [file, setFile] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [fallbackWarning, setFallbackWarning] = useState(false)
  const inputRef = useRef(null)
  const navigate = useNavigate()
  const { setMedicines, profile } = useMedication()

  function handleFile(f) {
    if (!f || !f.type.startsWith('image/')) return
    setFileName(f.name)
    setFile(f)
    setFallbackWarning(false)
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target.result)
    reader.readAsDataURL(f)
  }

  function onDrop(e) {
    e.preventDefault()
    setDragActive(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  function clearFile() {
    setPreview(null)
    setFileName('')
    setFile(null)
    setFallbackWarning(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function analyze() {
    if (!file) return
    setAnalyzing(true)
    setFallbackWarning(false)

    try {
      setStatusMsg('Uploading prescription...')
      // Small delay so the status message is visible before the heavy AI call
      await new Promise((r) => setTimeout(r, 400))

      setStatusMsg('Analyzing with AI...')
      const mealTimes = profile
        ? { breakfast: profile.breakfast, lunch: profile.lunch, dinner: profile.dinner, bedtime: profile.bedtime }
        : null

      const result = await uploadPrescription(file, mealTimes)

      if (!result.medicines || result.medicines.length === 0) {
        // AI returned nothing parseable — fall back to demo data
        console.warn('[UploadPage] AI returned empty medicines — using demo data fallback.')
        setMedicines(SAMPLE_EXTRACTION)
        setFallbackWarning(true)
      } else {
        setStatusMsg('Building your schedule...')
        await new Promise((r) => setTimeout(r, 300))
        setMedicines(result.medicines)
      }
    } catch (err) {
      console.warn('[UploadPage] Upload failed — falling back to demo data.', err.message)
      setMedicines(SAMPLE_EXTRACTION)
      setFallbackWarning(true)
    }

    setAnalyzing(false)
    setStatusMsg('')
    navigate('/app/review')
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
                <Spinner label={statusMsg || 'Analyzing prescription...'} />
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

      {fallbackWarning && (
        <div className="upload-page__note upload-page__note--warning">
          <AlertTriangle size={15} /> AI analysis unavailable — showing demo data.
          Check that the backend server is running on port 5000.
        </div>
      )}

      <div className="upload-page__note">
        Images are processed securely. Your prescription is used only to build
        your personal schedule and is not stored beyond this session.
      </div>
    </div>
  )
}
