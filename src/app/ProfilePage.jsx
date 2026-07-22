import { useState } from 'react'
import { Check, Coffee, Sandwich, Soup, Moon, User, Mail } from 'lucide-react'
import { useMedication } from '../context/MedicationContext.jsx'
import './ProfilePage.css'

export default function ProfilePage() {
  const { profile, updateProfile } = useMedication()
  const [form, setForm] = useState(profile)
  const [saved, setSaved] = useState(false)

  function setField(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    setSaved(false)
  }

  function save(e) {
    e.preventDefault()
    updateProfile(form)
    setSaved(true)
  }

  return (
    <div className="profile-page">
      <div className="profile-page__head">
        <span className="eyebrow">Settings</span>
        <h1>Profile & meal settings</h1>
        <p>
          Meal times power your before/after-food reminders, and your caregiver's details are
          used to route alerts.
        </p>
      </div>

      <form className="profile-page__form" onSubmit={save}>
        <section className="profile-section">
          <h2>Standard meal times</h2>
          <p className="profile-section__hint">
            Used to time "before food" and "after food" reminders around your usual routine.
          </p>

          <div className="profile-grid">
            <label className="profile-field">
              <span><Coffee size={15} /> Breakfast</span>
              <input
                type="time"
                value={form.breakfast}
                onChange={(e) => setField('breakfast', e.target.value)}
              />
            </label>
            <label className="profile-field">
              <span><Sandwich size={15} /> Lunch</span>
              <input
                type="time"
                value={form.lunch}
                onChange={(e) => setField('lunch', e.target.value)}
              />
            </label>
            <label className="profile-field">
              <span><Soup size={15} /> Dinner</span>
              <input
                type="time"
                value={form.dinner}
                onChange={(e) => setField('dinner', e.target.value)}
              />
            </label>
            <label className="profile-field">
              <span><Moon size={15} /> Bedtime</span>
              <input
                type="time"
                value={form.bedtime}
                onChange={(e) => setField('bedtime', e.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="profile-section">
          <h2>Caregiver contact</h2>
          <p className="profile-section__hint">
            Who should be notified if a dose is overdue.
          </p>

          <div className="profile-grid profile-grid--two">
            <label className="profile-field">
              <span><User size={15} /> Caregiver name</span>
              <input
                type="text"
                placeholder="e.g. Radhika Shah"
                value={form.caregiverName}
                onChange={(e) => setField('caregiverName', e.target.value)}
              />
            </label>
            <label className="profile-field">
              <span><Mail size={15} /> Caregiver email</span>
              <input
                type="email"
                placeholder="e.g. radhika@example.com"
                value={form.caregiverEmail}
                onChange={(e) => setField('caregiverEmail', e.target.value)}
              />
            </label>
          </div>
        </section>

        <div className="profile-page__actions">
          {saved && (
            <span className="profile-page__saved">
              <Check size={15} /> Saved
            </span>
          )}
          <button type="submit" className="btn btn-primary">Save changes</button>
        </div>
      </form>
    </div>
  )
}
