import { useEffect, useRef } from 'react';

export default function GoogleSignInButton({ clientId, onCredential, onError }) {
  const buttonRef = useRef(null);
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    if (!clientId || !buttonRef.current) return undefined;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (!window.google?.accounts) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response?.credential) {
            onCredentialRef.current(response.credential);
          } else {
            onErrorRef.current('Google sign-in cancelled');
          }
        },
        auto_select: false,
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        width: 280,
      });
    };
    script.onerror = () => onErrorRef.current('Failed to load Google sign-in');
    document.body.appendChild(script);

    return () => {
      script.remove();
      if (window.google?.accounts?.id?.cancel) window.google.accounts.id.cancel();
    };
  }, [clientId]);

  if (!clientId) return null;

  return (
    <div className="flex justify-center">
      <div ref={buttonRef} />
    </div>
  );
}