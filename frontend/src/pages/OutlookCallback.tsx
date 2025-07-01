import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function OutlookCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      
      if (!code || !state) {
        setError('Authorization code or state not found');
        return;
      }

      try {
        // Redirect to backend callback URL with the code and state
        window.location.href = `http://localhost:8000/api/mail-accounts/outlook/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
      } catch (err) {
        console.error('Outlook callback error:', err);
        setError('Outlook hesabı eklenirken bir hata oluştu');
        setTimeout(() => navigate('/dashboard/add-account'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-xl rounded-lg sm:px-10">
            <div className="text-center">
              <p className="text-red-600">{error}</p>
              <p className="mt-2 text-sm text-gray-500">
                Hesap ekleme sayfasına yönlendiriliyorsunuz...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl rounded-lg sm:px-10">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
            <p className="mt-4 text-sm text-gray-500">
              Outlook hesabınız ekleniyor...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 