// src/pages/riders/EditRiderModal.tsx
import React, { useEffect, useState } from 'react';
import { XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { updateRider } from '../../services/riderService';
import type { RiderWithAccount } from '../../types';

interface EditRiderForm {
  full_name: string;
  email: string;
  phone: string;
  vehicle_type: string;
  vehicle_registration: string;
  driving_license_no: string;
  license_expiry_date: string;
  national_id: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
}

interface Props {
  isOpen: boolean;
  rider: RiderWithAccount | null;
  onClose: () => void;
  onSaved: () => void;
}

const FIELD_ROWS: [keyof EditRiderForm, string, string][] = [
  ['full_name', 'Full Name', 'text'],
  ['email', 'Email', 'email'],
  ['phone', 'Phone', 'tel'],
  ['vehicle_registration', 'Vehicle Registration', 'text'],
  ['driving_license_no', 'Driving License No.', 'text'],
  ['license_expiry_date', 'License Expiry', 'date'],
  ['national_id', 'National ID', 'text'],
  ['emergency_contact_name', 'Emergency Contact Name', 'text'],
  ['emergency_contact_phone', 'Emergency Contact Phone', 'tel'],
];

function riderToForm(rider: RiderWithAccount): EditRiderForm {
  return {
    full_name: rider.full_name?.trim() || [rider.first_name, rider.last_name].filter(Boolean).join(' ') || '',
    email: rider.email || rider.account?.email || '',
    phone: rider.phone || rider.phone_number || rider.account?.phone_number || '',
    vehicle_type: rider.vehicle_type || 'motorcycle',
    vehicle_registration: rider.vehicle_registration || '',
    driving_license_no: rider.driving_license_no || '',
    license_expiry_date: rider.license_expiry_date ? rider.license_expiry_date.slice(0, 10) : '',
    national_id: rider.national_id || '',
    emergency_contact_name: rider.emergency_contact_name || '',
    emergency_contact_phone: rider.emergency_contact_phone || '',
  };
}

export default function EditRiderModal({ isOpen, rider, onClose, onSaved }: Props) {
  const [form, setForm] = useState<EditRiderForm | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (rider) setForm(riderToForm(rider));
  }, [rider]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [isOpen, saving, onClose]);

  if (!isOpen || !rider || !form) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateRider(rider.rider_id, form);
      toast.success('Rider updated successfully');
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update rider');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Edit Rider</h2>
            <p className="text-xs text-gray-400 mt-0.5">Rider #{rider.rider_id}</p>
          </div>
          <button onClick={() => !saving && onClose()} disabled={saving}>
            <XCircle className="w-6 h-6 text-gray-400 hover:text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FIELD_ROWS.map(([key, label, type]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
                <input
                  type={type}
                  value={form[key]}
                  onChange={(e) => setForm((f) => f && ({ ...f, [key]: e.target.value }))}
                  disabled={saving}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Vehicle Type</label>
              <select
                value={form.vehicle_type}
                onChange={(e) => setForm((f) => f && ({ ...f, vehicle_type: e.target.value }))}
                disabled={saving}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
              >
                {[['motorcycle', 'Motorcycle'], ['bicycle', 'Bicycle'], ['tuk_tuk', 'Tuk Tuk'], ['van', 'Van'], ['pickup', 'Pickup']].map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={() => !saving && onClose()}
              disabled={saving}
              className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
