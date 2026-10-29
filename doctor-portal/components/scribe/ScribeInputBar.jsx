import { useEffect, useRef, useState } from 'react';
import { Send, Mic, MicOff, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePatient } from '../../context/PatientContext';

export default function ScribeInputBar() {
  const [shorthand, setShorthand] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [voiceError, setVoiceError] = useState('');
  const recognitionRef = useRef(null);
  const voiceBaseTextRef = useRef('');
  const { token } = useAuth();
  const { patientData, addOptimisticImpression, fetchPatientContext } = usePatient();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      setVoiceError('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceError('');
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = 0; i < event.results.length; i += 1) {
        const transcript = event.results[i][0]?.transcript?.trim();
        if (!transcript) continue;

        if (event.results[i].isFinal) {
          finalTranscript += `${transcript} `;
        } else {
          interimTranscript += `${transcript} `;
        }
      }

      setShorthand(
        [voiceBaseTextRef.current, finalTranscript.trim(), interimTranscript.trim()]
          .filter(Boolean)
          .join(' ')
      );
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setVoiceError('Microphone permission was blocked. Allow microphone access and try again.');
      } else if (event.error === 'no-speech') {
        setVoiceError('No speech detected. Tap the mic and try again.');
      } else {
        setVoiceError('Voice input stopped unexpectedly. Tap the mic to retry.');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
      recognitionRef.current = null;
    };
  }, []);

  const toggleVoiceInput = () => {
    if (!speechSupported || !recognitionRef.current) {
      setVoiceError('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      return;
    }

    voiceBaseTextRef.current = shorthand.trim();
    setVoiceError('');

    try {
      recognitionRef.current.start();
    } catch {
      recognitionRef.current.stop();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!shorthand.trim() || !patientData?.id || isSubmitting) return;
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const currentText = shorthand;
    setShorthand('');
    setIsSubmitting(true);

    try {
      // 1. Add optimistic UI update
      addOptimisticImpression({
        description: currentText,
        specialty: { display: 'Processing...' }
      });

      // 2. Make API call
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
      const res = await fetch(`${baseUrl}/agents/scribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          shorthandText: currentText,
          patientId: patientData.id
        })
      });

      if (!res.ok) throw new Error('Scribe submission failed');

      // 3. Re-fetch context to get true state (and potentially updated summary)
      await fetchPatientContext(patientData.id);

    } catch (error) {
      console.error('Scribe Error:', error);
      // In a real app, we'd handle the rollback of optimistic UI here
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 md:left-64 right-0 p-4 bg-gradient-to-t from-background via-background/95 to-transparent backdrop-blur-sm z-30 pointer-events-none">
      <div className="max-w-4xl mx-auto pointer-events-auto">
        <form 
          onSubmit={handleSubmit}
          className="bg-surface border border-border shadow-2xl rounded-2xl p-2 flex items-end gap-2 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50 transition-all"
        >
          <button 
            type="button" 
            onClick={toggleVoiceInput}
            disabled={isSubmitting}
            className={`p-3 rounded-xl transition-colors ${
              isListening
                ? 'bg-danger/15 text-danger hover:bg-danger/20'
                : speechSupported
                  ? 'text-text-muted hover:text-white'
                  : 'text-text-muted/50'
            }`}
            title={isListening ? 'Stop voice scribe' : 'Start voice scribe'}
            aria-label={isListening ? 'Stop voice scribe' : 'Start voice scribe'}
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          
          <textarea
            value={shorthand}
            onChange={(e) => setShorthand(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Type clinical shorthand... (e.g., pt presents with c/o cp x 2 days. hr 95. plan: ekg, trops)"
            className="flex-1 max-h-32 min-h-[44px] bg-transparent border-none outline-none text-sm text-text-primary placeholder:text-text-muted py-3 resize-none custom-scrollbar"
            rows={1}
          />

          <button 
            type="submit" 
            disabled={!shorthand.trim() || isSubmitting}
            className={`p-3 rounded-xl flex items-center justify-center transition-all ${
              shorthand.trim() && !isSubmitting
                ? 'bg-primary text-white hover:bg-primary-hover shadow-md shadow-primary/20' 
                : 'bg-surface text-text-muted'
            }`}
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </form>
        <p className={`text-center text-[10px] mt-2 ${voiceError ? 'text-danger' : 'text-text-muted'}`}>
          {voiceError || (isListening
            ? 'Listening... speak naturally, then tap the mic again to stop.'
            : 'AI Scribe uses secure LLMs to map shorthand to FHIR ClinicalImpressions. Do not enter full PHI.')}
        </p>
      </div>
    </div>
  );
}
