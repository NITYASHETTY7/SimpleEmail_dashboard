import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';

interface LoginViewProps {
  onLoginSuccess?: () => void;
}

// 1. Google SVG Icon
const GoogleIcon: React.FC = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

// 2. Real Google OAuth Button (MUST be inside GoogleOAuthProvider)
const RealGoogleOAuthButton: React.FC<{
  onSuccess: (googleUser: any) => void;
  onError: (errMsg: string) => void;
}> = ({ onSuccess, onError }) => {
  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const googleUser = await res.json();
        if (googleUser && googleUser.email) {
          onSuccess(googleUser);
        } else {
          onError('Could not fetch profile from Google.');
        }
      } catch (err: any) {
        onError('Google profile fetch failed: ' + err.message);
      }
    },
    onError: (errorResponse) => {
      console.error('Google OAuth Error:', errorResponse);
      onError(
        'Google Login was cancelled or blocked. If on Vercel, ensure your Vercel domain is added to Authorised JavaScript Origins in Google Cloud Console.'
      );
    },
  });

  return (
    <button
      type="button"
      onClick={() => loginWithGoogle()}
      className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-[#E8F8EE] hover:bg-[#DCF3E5] text-[#1f2937] text-sm font-medium transition-all shadow-sm active:scale-[0.99]"
    >
      <GoogleIcon />
      <span>Login with Google</span>
    </button>
  );
};

// 3. Fallback Instant Sign-In Button (used when no Google Client ID is configured)
const FallbackGoogleButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-[#E8F8EE] hover:bg-[#DCF3E5] text-[#1f2937] text-sm font-medium transition-all shadow-sm active:scale-[0.99]"
  >
    <GoogleIcon />
    <span>Login with Google</span>
  </button>
);

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const { loginWithGoogleToken } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const hasRealClientId =
    typeof envClientId === 'string' &&
    envClientId.length > 25 &&
    !envClientId.includes('demo') &&
    envClientId.includes('.apps.googleusercontent.com');

  const handleGoogleSuccess = async (googleUser: any) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const payload = {
        email: googleUser.email,
        name: googleUser.name || googleUser.email.split('@')[0],
        picture:
          googleUser.picture ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        sub: googleUser.sub || 'google-user-' + Date.now(),
      };
      const token = btoa(JSON.stringify(payload));
      await loginWithGoogleToken(token);
      onLoginSuccess?.();
    } catch (err: any) {
      setAuthError('Authentication failed: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFallbackLogin = async (customEmail?: string) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const userEmail = (customEmail || email || 'oliver.brown@domain.io').trim();
      let userName = userEmail.split('@')[0];
      if (userEmail.toLowerCase().includes('superadmin')) {
        userName = 'Super Admin';
      } else if (userEmail.toLowerCase().includes('oliver')) {
        userName = 'Oliver Brown';
      } else if (userEmail.toLowerCase().includes('nitya')) {
        userName = 'Nitya Shetty';
      }

      const payload = {
        email: userEmail,
        name: userName,
        picture:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        sub: 'user-' + Date.now(),
      };
      const token = btoa(JSON.stringify(payload));
      await loginWithGoogleToken(token);
      onLoginSuccess?.();
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      return;
    }
    handleFallbackLogin(email);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#FFFFFF]">
      <div className="w-full max-w-[440px] rounded-2xl border border-gray-200/80 bg-white p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        {/* Title */}
        <h1 className="text-3xl font-bold text-center text-[#111827] mb-7 tracking-tight">
          Login
        </h1>

        {authError && (
          <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 leading-relaxed">
            {authError}
          </div>
        )}

        {/* Login with Google Button */}
        {hasRealClientId ? (
          <GoogleOAuthProvider clientId={envClientId}>
            <RealGoogleOAuthButton
              onSuccess={handleGoogleSuccess}
              onError={(msg) => setAuthError(msg)}
            />
          </GoogleOAuthProvider>
        ) : (
          <FallbackGoogleButton onClick={() => handleFallbackLogin()} />
        )}

        {/* Divider */}
        <div className="relative flex items-center justify-center my-6">
          <div className="border-t border-gray-200 w-full" />
          <span className="bg-white px-3 text-xs text-gray-400 font-normal absolute whitespace-nowrap">
            or sign up through email
          </span>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleEmailSubmit} className="space-y-4" autoComplete="off">
          <div>
            <input
              type="email"
              name="email"
              autoComplete="off"
              placeholder="Email ID"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3.5 text-sm rounded-xl bg-[#F3F5F7] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#00AA4F] transition-all border-none"
            />
          </div>

          <div>
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3.5 text-sm rounded-xl bg-[#F3F5F7] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#00AA4F] transition-all border-none"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-xl bg-[#00AA4F] hover:bg-[#009243] text-white text-sm font-semibold transition-all shadow-sm active:scale-[0.99] mt-2 disabled:opacity-60"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};
