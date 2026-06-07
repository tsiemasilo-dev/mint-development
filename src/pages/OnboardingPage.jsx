import React, { useState, useEffect } from "react";
import OriginButton from "../components/OriginButton";
import { supabase } from "../lib/supabase.js";

const OnboardingPage = ({ onCreateAccount, onLogin }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [giftId, setGiftId] = useState(() => localStorage.getItem('mint_pending_gift_id'));
  const [giftDetails, setGiftDetails] = useState(null);

  useEffect(() => {
    const fetchLandingImage = async () => {
      try {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { data, error } = await supabase.storage
          .from('MintAuthImages')
          .list('', {
            limit: 20,
            sortBy: { column: 'name', order: 'asc' }
          });
        
        if (error) throw error;

        if (data && data.length > 0) {
          const imageFiles = data.filter(file => 
            /\.(png|jpe?g|webp|avif)$/i.test(file.name)
          );
          if (imageFiles.length > 0) {
            const randomIndex = Math.floor(Math.random() * imageFiles.length);
            const selectedFile = imageFiles[randomIndex];
            
            const { data: { publicUrl } } = supabase.storage
              .from('MintAuthImages')
              .getPublicUrl(selectedFile.name);
            
            setImageUrl(publicUrl);
            return;
          }
        }
      } catch (err) {
        console.warn("Failed to load dynamic auth image:", err.message);
      }
      
      setImageUrl("/assets/images/onboarding-hero.png");
    };

    fetchLandingImage();
  }, []);

  useEffect(() => {
    if (!giftId) return;
    fetch(`/api/gift/by-id/${giftId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.status) {
          if (['claimed', 'cancelled'].includes(data.status)) {
            localStorage.removeItem('mint_pending_gift_id');
            setGiftId(null);
          } else {
            setGiftDetails(data);
          }
        }
      })
      .catch(() => {});
  }, [giftId]);

  const formatAmount = (cents) => {
    if (!cents) return '';
    return `R${(cents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="h-screen overflow-hidden bg-white">
      <div className="grid h-full grid-rows-2 lg:grid-cols-[1.05fr_1fr] lg:grid-rows-none">
        <div className="order-2 flex h-full flex-col px-6 py-8 lg:order-1 lg:px-16 lg:py-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 animate-on-load delay-1">
              <img src="/assets/mint-logo.svg" alt="Mint logo" className="h-6 w-auto" />
              <span className="mint-brand text-lg font-semibold tracking-[0.12em]">MINT</span>
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center space-y-8">
            <div className="space-y-3 animate-on-load delay-2">
              <h1 className="text-4xl font-semibold text-slate-900 sm:text-5xl">
                Welcome to <span className="mint-brand">Mint</span>
              </h1>
              <p className="text-lg text-slate-600">
                Your money tools are ready when you are.
              </p>
            </div>

            {giftId && (
              <div className="animate-on-load delay-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3.5 flex items-start gap-3">
                <span className="text-2xl leading-none mt-0.5">🎁</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-violet-900">
                    You have an investment gift waiting
                    {giftDetails?.amount ? ` — ${formatAmount(giftDetails.amount)}` : ''}
                  </p>
                  <p className="text-xs text-violet-600 mt-0.5">
                    Log in or create an account to claim it
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-4 animate-on-load delay-3 sm:items-start">
              <OriginButton
                onClick={onLogin}
                circleColor="rgba(148,163,184,0.18)"
                className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-900 shadow-sm sm:w-auto"
              >
                Login
              </OriginButton>

              <OriginButton
                onClick={onCreateAccount}
                circleColor="rgba(255,255,255,0.12)"
                className="inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-slate-900/20 sm:w-auto"
              >
                Create Account
              </OriginButton>
            </div>
          </div>
        </div>

        <div className="order-1 h-full lg:order-2">
          <div className="relative h-full w-full overflow-hidden bg-slate-50 rounded-b-[3.5rem] [clip-path:ellipse(140%_90%_at_50%_0%)] lg:rounded-none lg:[clip-path:none]">
            {imageUrl && (
              <img
                src={imageUrl}
                alt="Person using a phone"
                className="h-full w-full object-cover transition-opacity duration-700 ease-out"
                style={{ opacity: imageLoading ? 0 : 1 }}
                onLoad={() => setImageLoading(false)}
              />
            )}
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-violet-600" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
