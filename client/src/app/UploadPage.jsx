import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UploadCloud, ImageUp, Sparkles, X, AlertTriangle } from 'lucide-react'
import { useMedication } from '../context/MedicationContext.jsx'
import { SAMPLE_EXTRACTION } from '../data/mockData.js'
import { uploadPrescription } from '../lib/api.js'
import imageCompression from 'browser-image-compression'
import Spinner from './components/Spinner.jsx'
import './UploadPage.css'

export default function UploadPage() {
  const [preview, setPreview] = useState(null)
  const [fileName, setFileName] = useState('')
  const [file, setFile] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [fallbackWarning, setFallbackWarning] = useState(false)
  const inputRef = useRef(null)
  const navigate = useNavigate()
  const { setMedicines, profile } = useMedication()

  function handleFile(f) {
    if (!f || !f.type.startsWith('image/')) return
    setFileName(f.name)
    setFile(f)
    setFallbackWarning(false)
    setErrorMsg('')
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
      setStatusMsg('Compressing image for upload...')
      const options = {
        maxSizeMB: 1, // Keep under 1MB to avoid Vercel 4.5MB serverless limit
        maxWidthOrHeight: 1920,
        useWebWorker: true
      }
      const compressedFile = await imageCompression(file, options)

      setStatusMsg('Uploading prescription...')
      // Small delay so the status message is visible before the heavy AI call
      await new Promise((r) => setTimeout(r, 400))

      setStatusMsg('Analyzing with AI...')
      const mealTimes = profile
        ? { breakfast: profile.breakfast, lunch: profile.lunch, dinner: profile.dinner, bedtime: profile.bedtime }
        : null

      const result = await uploadPrescription(compressedFile, mealTimes)

      if (!result.medicines || result.medicines.length === 0) {
        setErrorMsg(result.error || 'No valid prescription or medication label detected in this image. Please upload a clear photo of a medical prescription.')
        setAnalyzing(false)
        setStatusMsg('')
        return
      }

      setStatusMsg('Building your schedule...')
      await new Promise((r) => setTimeout(r, 300))
      setMedicines(result.medicines)
      setAnalyzing(false)
      setStatusMsg('')
      navigate('/app/review')
    } catch (err) {
      console.warn('[UploadPage] Upload error:', err.message)
      setErrorMsg(err.message || 'Failed to process image. Please upload a clear prescription photo.')
      setAnalyzing(false)
      setStatusMsg('')
    }
  }

  return (
    <div className="upload-page">
      <div className="upload-page__head">
        <span className="eyebrow">Step 1 of 4</span>
        <h1>Upload a prescription</h1>
        <p>Take a clear photo of the handwritten prescription, or upload one from your device.</p>
      </div>

      {errorMsg && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px', color: '#f87171', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
            <AlertTriangle size={18} style={{ color: '#ef4444' }} />
            <span>{errorMsg.includes('Server AI') || errorMsg.includes('Configuration') || errorMsg.includes('Environment') || errorMsg.includes('failed') ? 'AI Server Configuration / Processing Error' : 'Non-Prescription / Unreadable Image'}</span>
          </div>
          <p style={{ margin: 0, color: '#fca5a5' }}>{errorMsg}</p>
          <button
            onClick={() => { setMedicines(SAMPLE_EXTRACTION); navigate('/app/review'); }}
            style={{ alignSelf: 'flex-start', background: 'transparent', border: 'none', color: '#60a5fa', textDecoration: 'underline', cursor: 'pointer', fontSize: '13px', padding: 0, marginTop: '4px' }}
          >
            Or click here to load sample demo prescription data →
          </button>
        </div>
      )}

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
