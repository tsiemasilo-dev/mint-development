import React, { useEffect, useState } from 'react';
import { ArrowLeft, Smartphone, Monitor, Globe, LogOut, Shield, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

const parseUserAgent = (ua) => {
  if (!ua) return { device: 'Unknown Device', browser: 'Unknown Browser', os: 'Unknown OS', isMobile: false };

  let browser = 'Unknown Browser';
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';

  let os = 'Unknown OS';
  if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Linux')) os = 'Linux';

  const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const device = isMobile ? 'Mobile Device' : 'Desktop';

  return { device, browser, os, isMobile };
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'Unknown';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Unknown';
  }
};

const ActiveSessionsPage = ({ onNavigate, onBack }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  useEffect(() => {
    const loadSession = async () => {
      try {
        if (!supabase) {
          setLoading(false);
          return;
        }
        const { data } = await supabase.auth.getSession();
        setSession(data?.session || null);
      } catch (err) {
        console.error('Failed to load session:', err);
      } finally {
        setLoading(false);
      }
    };
    loadSession();
  }, []);

  const handleSignOutOthers = async () => {
    try {
      if (!supabase) return;
      await supabase.auth.signOut({ scope: 'others' });
      showToast('Logged out of all other devices');
    } catch (err) {
      console.error('Failed to sign out others:', err);
      showToast('Failed to log out other devices', 'error');
    }
  };

  const handleSignOutGlobal = async () => {
    try {
      if (!supabase) return;
      await supabase.auth.signOut({ scope: 'global' });
      onNavigate?.('auth');
    } catch (err) {
      console.error('Failed to sign out globally:', err);
      onNavigate?.('auth');
    }
  };

  const uaInfo = parseUserAgent(navigator.userAgent);
  const loginTime = session?.user?.last_sign_in_at || session?.user?.created_at;
  const DeviceIcon = uaInfo.isMobile ? Smartphone : Monitor;

  return (
    <div className="min-h-screen bg-slate-50 px-6 pt-12 pb-24">
      {toast.show && (
        <div
          className={`fixed left-1/2 top-4 z-50 -translate-x-1/2 transform rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      <header className="mb-8 flex items-center gap-3">
        <button
          type="button"
          onClick={() => (onBack ? onBack() : onNavigate?.('settings'))}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm transition active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold text-slate-900">Active Sessions</h1>
      </header>

      {loading ? (
        <div className="space-y-4">
          <div className="h-32 animate-pulse rounded-2xl bg-white shadow-sm" />
          <div className="h-14 animate-pulse rounded-2xl bg-white shadow-sm" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Shield className="h-5 w-5 text-slate-700" />
              <h2 className="text-base font-semibold text-slate-900">Current Session</h2>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                  <DeviceIcon className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      {uaInfo.browser} on {uaInfo.os}
                    </span>
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Active
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{uaInfo.device}</p>
                  {loginTime && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="h-3 w-3" />
                      <span>Signed in {formatDate(loginTime)}</span>
                    </div>
                  )}
                  <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                    <Globe className="h-3 w-3" />
                    <span>{session?.user?.email || 'Unknown email'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOutOthers}
            className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm transition active:scale-[0.99]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">
              <LogOut className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <h2 className="text-base font-semibold text-slate-900">Log out other devices</h2>
              <p className="text-sm text-slate-500">Sign out of all other sessions</p>
            </div>
          </button>

          <button
            type="button"
            onClick={handleSignOutGlobal}
            className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm transition active:scale-[0.99]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
              <LogOut className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <h2 className="text-base font-semibold text-red-600">Log out everywhere</h2>
              <p className="text-sm text-slate-500">Sign out of all devices including this one</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

export default ActiveSessionsPage;
