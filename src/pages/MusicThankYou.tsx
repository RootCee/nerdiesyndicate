import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Seo from '../components/Seo';

export default function MusicThankYou() {
  const location = useLocation();
  const sessionId = useMemo(
    () => new URLSearchParams(location.search).get('session_id'),
    [location.search]
  );
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your purchase and preparing your download...');

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      setMessage('Missing checkout session. Please contact support if you were charged.');
      return;
    }

    let isMounted = true;
    fetch(`/api/music/verify?session_id=${encodeURIComponent(sessionId)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Unable to verify purchase');
        }
        if (!isMounted) return;
        setDownloadUrl(data.downloadUrl);
        setStatus('ready');
        setMessage('Thank you for supporting Buddie Roots. Your album download is ready.');
      })
      .catch((error: Error) => {
        if (!isMounted) return;
        setStatus('error');
        setMessage(error.message || 'Unable to verify purchase');
      });

    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  return (
    <>
      <Seo
        title="BLAQ Purchase Complete | Nerdie Blaq Music"
        description="Purchase confirmation for the BLAQ release."
        path="/music/thank-you"
        noindex
      />
      <section className="relative min-h-screen overflow-hidden px-4 pb-16 pt-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(153,27,27,0.28),_transparent_40%),linear-gradient(180deg,_rgba(9,9,11,0.92),_#09090b)]" />
        <div className="relative z-10 mx-auto max-w-3xl">
          <div className="rounded-[32px] border border-red-900/20 bg-zinc-900/90 p-8 text-center shadow-[0_0_40px_rgba(127,29,29,0.14)] md:p-12">
            <span className="inline-block rounded-full border border-red-800/40 bg-red-900/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-red-400">
              Thank You
            </span>
            <h1 className="mt-6 text-4xl text-white md:text-6xl">BLAQ Purchase Complete</h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-neutral-300 md:text-lg">
              {message}
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              {status === 'ready' && downloadUrl && (
                <a
                  href={downloadUrl}
                  className="inline-flex items-center justify-center rounded-full bg-red-800 px-7 py-3 text-base font-semibold text-white transition hover:bg-red-700"
                >
                  Download Album
                </a>
              )}
              <Link
                to="/music"
                className="inline-flex items-center justify-center rounded-full border border-zinc-700 bg-zinc-950/80 px-7 py-3 text-base font-semibold text-neutral-100 transition hover:border-zinc-500 hover:text-white"
              >
                Back to Music
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
