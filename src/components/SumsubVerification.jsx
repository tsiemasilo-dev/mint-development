import { useState, useEffect } from "react";

const CameraIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
  </svg>
);

const IdCardIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm1.294 6.336a6.721 6.721 0 0 1-3.17.789 6.721 6.721 0 0 1-3.168-.789 3.376 3.376 0 0 1 6.338 0Z" />
  </svg>
);

const CheckCircleIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const ShieldCheckIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
  </svg>
);

const LoadingSpinner = () => (
  <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
);

const SumsubVerification = ({ onVerified }) => {
  const [verificationStep, setVerificationStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [documentUploaded, setDocumentUploaded] = useState(false);
  const [selfieCompleted, setSelfieCompleted] = useState(false);
  const [verificationComplete, setVerificationComplete] = useState(false);

  const handleDocumentUpload = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setDocumentUploaded(true);
      setIsProcessing(false);
      setVerificationStep(1);
    }, 2000);
  };

  const handleSelfieCapture = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setSelfieCompleted(true);
      setIsProcessing(false);
      setVerificationStep(2);
    }, 2000);
  };

  const handleCompleteVerification = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setVerificationComplete(true);
      setIsProcessing(false);
      if (onVerified) {
        onVerified();
      }
    }, 1500);
  };

  useEffect(() => {
    if (verificationStep === 2 && !verificationComplete) {
      handleCompleteVerification();
    }
  }, [verificationStep]);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              verificationStep >= 0 ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
            }`}>
              {documentUploaded ? <CheckCircleIcon className="w-5 h-5" /> : '1'}
            </div>
            <div className={`h-1 w-12 rounded ${verificationStep >= 1 ? 'bg-emerald-500' : 'bg-slate-200'}`} />
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              verificationStep >= 1 ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
            }`}>
              {selfieCompleted ? <CheckCircleIcon className="w-5 h-5" /> : '2'}
            </div>
            <div className={`h-1 w-12 rounded ${verificationStep >= 2 ? 'bg-emerald-500' : 'bg-slate-200'}`} />
          </div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            verificationComplete ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
          }`}>
            {verificationComplete ? <CheckCircleIcon className="w-5 h-5" /> : '3'}
          </div>
        </div>
        <div className="flex justify-between text-xs text-slate-500">
          <span>ID Document</span>
          <span>Selfie</span>
          <span>Verified</span>
        </div>
      </div>

      {verificationStep === 0 && !documentUploaded && (
        <div className="animate-fade-in">
          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center bg-slate-50/50 mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <IdCardIcon className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-medium text-slate-800 mb-2">Upload ID Document</h3>
            <p className="text-sm text-slate-500 mb-4">
              Take a clear photo of your ID card, passport, or driver's license
            </p>
            <div className="flex flex-col gap-2 text-xs text-slate-400">
              <span>• Ensure all corners are visible</span>
              <span>• Avoid glare and shadows</span>
              <span>• Text must be readable</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDocumentUpload}
            disabled={isProcessing}
            className="w-full py-3.5 px-6 rounded-xl font-medium text-white transition-all duration-200 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}
          >
            {isProcessing ? (
              <>
                <LoadingSpinner />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <CameraIcon className="w-5 h-5" />
                <span>Capture Document</span>
              </>
            )}
          </button>
        </div>
      )}

      {verificationStep === 1 && !selfieCompleted && (
        <div className="animate-fade-in">
          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center bg-slate-50/50 mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <CameraIcon className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-medium text-slate-800 mb-2">Take a Selfie</h3>
            <p className="text-sm text-slate-500 mb-4">
              We need to match your face with your ID document
            </p>
            <div className="flex flex-col gap-2 text-xs text-slate-400">
              <span>• Good lighting on your face</span>
              <span>• Remove glasses if possible</span>
              <span>• Look directly at the camera</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSelfieCapture}
            disabled={isProcessing}
            className="w-full py-3.5 px-6 rounded-xl font-medium text-white transition-all duration-200 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}
          >
            {isProcessing ? (
              <>
                <LoadingSpinner />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <CameraIcon className="w-5 h-5" />
                <span>Take Selfie</span>
              </>
            )}
          </button>
        </div>
      )}

      {verificationStep === 2 && (
        <div className="animate-fade-in text-center">
          {isProcessing ? (
            <div className="py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center animate-pulse">
                <ShieldCheckIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-medium text-slate-800 mb-2">Verifying Identity</h3>
              <p className="text-sm text-slate-500">Please wait while we verify your documents...</p>
            </div>
          ) : verificationComplete ? (
            <div className="py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                <CheckCircleIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-medium text-slate-800 mb-2">Identity Verified</h3>
              <p className="text-sm text-slate-500">Your identity has been successfully verified with Sumsub</p>
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium">
                <CheckCircleIcon className="w-4 h-4" />
                <span>Verification Complete</span>
              </div>
            </div>
          ) : null}
        </div>
      )}

      <div className="mt-6 text-center">
        <p className="text-xs text-slate-400">
          Powered by <span className="font-medium">Sumsub</span> Identity Verification
        </p>
      </div>
    </div>
  );
};

export default SumsubVerification;
