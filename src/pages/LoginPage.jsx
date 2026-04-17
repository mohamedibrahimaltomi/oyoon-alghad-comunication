import React, { useState } from 'react';
import { LogIn } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

export default function LoginPage() {
  const { signIn, branding } = useApp();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    const { error: signInError } = await signIn(form);
    if (signInError) setError(signInError.message || 'تعذر تسجيل الدخول');
    setLoading(false);
  };

  return (
    <div className="login-shell">
      <div className="login-card card">
        <div className="login-brand">
          {branding.logo_data_url ? <img src={branding.logo_data_url} className="brand-logo" alt="logo" /> : <div className="brand-mark large">ع</div>}
          <h1>{branding.company_name}</h1>
          <p>{branding.company_tagline}</p>
        </div>
        <form className="form-grid" onSubmit={onSubmit}>
          <label>
            البريد الإلكتروني
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </label>
          <label>
            كلمة المرور
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </label>
          {error ? <div className="alert error">{error}</div> : null}
          <button className="primary-btn" type="submit" disabled={loading}>
            <LogIn size={18} />
            <span>{loading ? 'جارٍ الدخول...' : 'دخول النظام'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
