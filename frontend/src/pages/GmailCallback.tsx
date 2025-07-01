import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { mailAccountService } from '../services/mailAccountService';
import toast from 'react-hot-toast';

export default function GmailCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const token = localStorage.getItem('token');
      
      if (!code) {
        setError('Authorization code not found');
        return;
      }

      if (!token) {
        setError('Not authenticated');
        navigate('/login');
        return;
      }

      try {
        const result = await mailAccountService.handleCallback(code);
        toast.success(`${result.email} hesabı başarıyla eklendi`);
        navigate('/dashboard');
      } catch (err) {
        console.error('Gmail callback error:', err);
        setError('Gmail hesabı eklenirken bir hata oluştu');
        setTimeout(() => navigate('/add-account'), 3000);
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
                {error === 'Not authenticated' 
                  ? 'Lütfen tekrar giriş yapın'
                  : 'Hesap ekleme sayfasına yönlendiriliyorsunuz...'}
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
              Gmail hesabınız ekleniyor...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 