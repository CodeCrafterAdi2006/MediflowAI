import './Spinner.css'

export default function Spinner({ label }) {
  return (
    <div className="spinner-block">
      <span className="spinner" aria-hidden="true" />
      {label && <p className="spinner-block__label">{label}</p>}
    </div>
  )
}
