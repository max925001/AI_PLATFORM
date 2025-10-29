"use client";

import Image from "next/image";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { generateNextResponse } from "@/lib/actions/interview.action";
import { createFeedback } from "@/lib/actions/general.action";
import { Mic, MicOff, Volume2, Loader2 } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/client";

enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
}

interface SavedMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

interface AgentProps {
  userName: string;
  userId: string;
  interviewId?: string; // Optional for generate/direct starts
  feedbackId?: string;
  type: string;
  questions?: string[];
}

const Agent = ({
  userName,
  userId,
  interviewId,
  feedbackId,
  type,
  questions,
}: AgentProps) => {
  const router = useRouter();
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showSpeakButton, setShowSpeakButton] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastMessage, setLastMessage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [statusText, setStatusText] = useState("");
  // NEW: For accumulating user transcript during continuous listening
  const [userTranscript, setUserTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthesisQueueRef = useRef<string[]>([]);
  const messagesRef = useRef<SavedMessage[]>([]);
  const isInitialGreetingRef = useRef(true);
  const ttsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const speakingStartRef = useRef<number>(0);
  // NEW: For 3-second silence detection timer
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Types for Web Speech API
  interface SpeechRecognitionEvent {
    results: SpeechRecognitionResultList;
  }
  interface SpeechRecognitionErrorEvent {
    error: string;
  }
  interface SpeechRecognitionResultList {
    [index: number]: SpeechRecognitionResult;
  }
  interface SpeechRecognitionResult {
    [index: number]: SpeechRecognitionAlternative;
  }
  interface SpeechRecognitionAlternative {
    transcript: string;
  }

  // NEW: Detect silence after 3 seconds of no new speech
  const detectSilence = useCallback((finalTranscript: string) => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    // Set 3-second timer for silence
    silenceTimeoutRef.current = setTimeout(() => {
      if (finalTranscript.trim()) {
        console.log('Silence detected after 3s. Processing user response:', finalTranscript);
        setStatusText("Processing your response...");
        const newMessage = { role: 'user' as const, content: finalTranscript };
        const updatedMessages = [...messagesRef.current, newMessage];
        setMessages(updatedMessages);
        setLastMessage(finalTranscript);
        setUserTranscript(""); // Reset for next turn
        setIsListening(false);

        // Stop recognition after processing
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }

        const fullHistory = updatedMessages.map(m => `${m.role}: ${m.content}`).join('\n');
        handleAIResponse(updatedMessages, finalTranscript, fullHistory);
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
    }, 3000); // FIXED: 3 seconds
  }, [setMessages, setLastMessage, setIsListening]);

  // Sync ref with state
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Request mic permission
  const requestMicPermission = async () => {
    try {
      setStatusText("Requesting microphone permission...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissionGranted(true);
      setStatusText("Permission granted. Starting interview...");
      console.log('Mic permission granted');
      return true;
    } catch (err) {
      console.error('Mic permission denied:', err);
      setError('Microphone access denied. Go to browser settings > Privacy > Microphone > Allow for this site.');
      setStatusText("Permission denied. Please enable mic in settings.");
      return false;
    }
  };

  // FIXED: Updated createRecognition for continuous listening + silence detection
  const createRecognition = useCallback(() => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setError('Speech Recognition not supported. Use Chrome or Edge.');
      return null;
    }

    // Always clean up existing first
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    const recognition = new SpeechRecognitionAPI() as SpeechRecognition;
    recognition.lang = 'en-US';
    recognition.continuous = true; // FIXED: Enable continuous for real-time
    recognition.interimResults = true; // FIXED: Enable interim for streaming
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('Listening started (continuous)');
      setIsListening(true);
      setShowSpeakButton(false);
      setStatusText("Listening... Speak now! (3s pause to process)"); // UPDATED: Note for 3s
      setIsSpeaking(false);
      setUserTranscript(""); // Reset transcript on start
    };

    // FIXED: Accumulate transcript and detect silence
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = "";
      let finalTranscript = userTranscript; // Start with existing

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      // Append to state (interim shows live, but we use full for processing)
      setUserTranscript(finalTranscript + interimTranscript);
      console.log('Live transcript:', finalTranscript + interimTranscript);

      // Reset silence timer on any speech
      detectSilence(finalTranscript + interimTranscript);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.log("STT error:", event.error);
      setIsListening(false);
      setShowSpeakButton(true);
      setStatusText("Listening error. Tap mic to retry.");
      if (event.error === 'not-allowed') {
        setError('Mic access denied. Enable in browser settings.');
      } else if (event.error !== 'aborted') {
        setError(`Listening error: ${event.error}. Tap to retry.`);
      }
      // Clean up timer on error
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      console.log('Listening ended');
      setIsListening(false);
      setShowSpeakButton(true);
      setStatusText("Ready to speak? Tap the mic.");
      // Clean up timer on end
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    return recognition;
  }, [setMessages, setLastMessage, setIsListening, userTranscript, detectSilence]); // Added deps for transcript/timer

  // Start listening - always recreate if needed
  const startListening = useCallback(() => {
    if (callStatus !== CallStatus.ACTIVE || isSpeaking || isListening) {
      console.log('Cannot start listening - invalid state:', { active: callStatus === CallStatus.ACTIVE, speaking: isSpeaking, listening: isListening });
      if (isSpeaking) {
        setStatusText("AI is speaking. Please wait.");
      } else {
        setStatusText("Invalid state. Tap again.");
      }
      return;
    }

    // Always recreate for reliability
    console.log('Starting STT - forcing fresh recognition');
    setStatusText("Starting to listen...");
    const recognition = createRecognition();
    if (!recognition) {
      setError('Failed to create speech recognition.');
      setShowSpeakButton(true);
      return;
    }

    setTimeout(() => {
      if (recognitionRef.current) {
        speechSynthesis.cancel();
        recognitionRef.current.start();
        console.log('Recognition started successfully (continuous)');
      } else {
        console.log('Recognition stale or invalid, retrying...');
        setError('Microphone setup failed. Tap mic again.');
        setShowSpeakButton(true);
      }
    }, 150); // Slightly longer delay
  }, [callStatus, isSpeaking, isListening, createRecognition]);

  // Cleanup on unmount - FIXED: Added silence timer cleanup
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      speechSynthesis.cancel();
      if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);
    };
  }, []);

  // Global watcher for stuck isSpeaking
  useEffect(() => {
    if (isSpeaking && speakingStartRef.current > 0) {
      const elapsed = Date.now() - speakingStartRef.current;
      if (elapsed > 30000) {
        console.log('Global speaking timeout - forcing end');
        setIsSpeaking(false);
        setStatusText("Your turn. Tap mic to respond.");
        setShowSpeakButton(true);
        speechSynthesis.cancel();
        if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);
      }
    }
  }, [isSpeaking]);

  // TTS queue
  useEffect(() => {
    if (synthesisQueueRef.current.length > 0 && !isSpeaking) {
      speakNext();
    }
  }, [isSpeaking]);

  const speakNext = () => {
    if (synthesisQueueRef.current.length === 0) {
      setIsSpeaking(false);
      speakingStartRef.current = 0;
      if (ttsTimeoutRef.current) {
        clearTimeout(ttsTimeoutRef.current);
        ttsTimeoutRef.current = null;
      }
      console.log('AI speech complete');
      setStatusText("Your turn. Tap mic to respond.");
      if (callStatus === CallStatus.ACTIVE) {
        if (isInitialGreetingRef.current) isInitialGreetingRef.current = false;
        setTimeout(() => setShowSpeakButton(true), 500);
      }
      return;
    }

    setIsSpeaking(true);
    speakingStartRef.current = Date.now();
    setShowSpeakButton(false);
    const text = synthesisQueueRef.current.shift()!;
    console.log('AI speaking:', text);
    setStatusText("AI responding...");
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.volume = 1;

    // Dynamic timeout based on text length - more generous for large responses
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    const charCount = text.length;
    const estimatedMs = Math.max(12000, wordCount * 500 + charCount * 20); // Adjusted: 2 words/sec + char buffer, min 12s

    utterance.onstart = () => {
      console.log('TTS started');
      setStatusText("AI speaking...");
      ttsTimeoutRef.current = setTimeout(() => {
        console.log('TTS timeout - forcing end');
        setIsSpeaking(false);
        speakingStartRef.current = 0;
        setStatusText("Your turn. Tap mic to respond.");
        setShowSpeakButton(true);
        speechSynthesis.cancel();
      }, estimatedMs);
    };
    utterance.onend = () => {
      console.log('TTS ended');
      speakingStartRef.current = 0;
      if (ttsTimeoutRef.current) {
        clearTimeout(ttsTimeoutRef.current);
        ttsTimeoutRef.current = null;
      }
      setIsSpeaking(false);
      // Ensure button shows after end
      setTimeout(() => setShowSpeakButton(true), 300);
      setStatusText("Your turn. Tap mic to respond.");
    };
    utterance.onerror = (e: SpeechSynthesisErrorEvent) => {
      console.log('TTS error:', e.error);
      speakingStartRef.current = 0;
      if (ttsTimeoutRef.current) {
        clearTimeout(ttsTimeoutRef.current);
        ttsTimeoutRef.current = null;
      }
      setIsSpeaking(false);
      setShowSpeakButton(true);
      if (e.error === 'interrupted') {
        setStatusText("Speech interrupted. Tap mic to continue.");
      } else {
        setStatusText("Speech error. Tap mic to continue.");
        console.error('TTS error details:', e);
      }
      // Only continue queue if not user-interrupted and queue has items
      if (synthesisQueueRef.current.length > 0 && e.error !== 'interrupted') {
        speakNext();
      }
    };
    speechSynthesis.speak(utterance);
  };

  const handleAIResponse = async (updatedMessages: SavedMessage[], userResponse: string, fullHistory: string) => {
    setIsGenerating(true);
    setStatusText("AI thinking...");
    try {
      const techStack = questions?.join(', ') || 'General';
      const preGenQuestions = questions?.map(q => `- ${q}`).join('\n') || 'N/A';
      const prompt = `You are a professional AI interviewer for a ${type} interview. 
      User: ${userName}, Tech Stack: ${techStack}.
      Questions: ${preGenQuestions}.
      History: ${fullHistory}
      Respond as interviewer: Confirm details if needed, then ask a relevant question from list or follow-up based on previous responses. Concise, 1-2 sentences, end with question. Plain text.`;

      console.log('Sending to Gemini:', prompt.substring(0, 100) + '...');
      const aiResponse = await generateNextResponse({ prompt, context: fullHistory });
      console.log('Gemini response:', aiResponse);
      setIsGenerating(false);
      if (aiResponse) {
        const newMessage = { role: 'assistant' as const, content: aiResponse };
        setMessages((prev) => [...prev, newMessage]);
        setLastMessage(aiResponse);
        synthesisQueueRef.current.push(aiResponse);
        speakNext();
      } else {
        throw new Error('No response from AI');
      }
    } catch (err) {
      console.error('Gemini error details:', err);
      setIsGenerating(false);
      setError('AI failed to respond. Check if GEMINI_API_KEY is set in .env.local. Fallback used.');
      const fallback = "Thanks for sharing. Let's continue: " + (questions?.[0] || "Tell me about your skills.");
      const newMessage = { role: 'assistant' as const, content: fallback };
      setMessages((prev) => [...prev, newMessage]);
      setLastMessage(fallback);
      synthesisQueueRef.current.push(fallback);
      speakNext();
    }
  };

  // FIXED: Feedback useEffect - Always generate (removed type="generate" skip)
  useEffect(() => {
    if (messages.length > 0) setLastMessage(messages[messages.length - 1].content);

    const handleGenerateFeedback = async (msgs: SavedMessage[]) => {
      console.log("Generating feedback...");
      const res = await createFeedback({
        interviewId, // Optional - creates new if missing
        userId: userId!,
        transcript: msgs,
        feedbackId,
        type, // For new interview creation
        questions,
      });

      if (res.success && res.interviewId) {
        router.push(`/interview/${res.interviewId}/feedback`); // Navigate to new/returned ID
      } else {
        console.error("Feedback generation failed");
        router.push("/"); // Fallback to home
      }
    };

    if (callStatus === CallStatus.FINISHED) {
      // FIXED: Always generate feedback, regardless of type
      handleGenerateFeedback(messages);
    }
  }, [messages, callStatus, feedbackId, interviewId, router, type, userId, questions]); // Added questions dep

  const handleCall = async () => {
    console.log('Starting interview');
    setCallStatus(CallStatus.CONNECTING);
    setError(null);
    setMessages([]);
    setLastMessage("");
    setIsListening(false);
    setIsSpeaking(false);
    setShowSpeakButton(false);
    setIsGenerating(false);
    setPermissionGranted(false);
    setStatusText("");
    setUserTranscript(""); // FIXED: Reset transcript
    synthesisQueueRef.current = [];
    if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current); // FIXED: Reset timer
    speakingStartRef.current = 0;
    isInitialGreetingRef.current = true;

    const hasPermission = await requestMicPermission();
    if (!hasPermission) {
      setCallStatus(CallStatus.INACTIVE);
      return;
    }

    const welcomeMsg = `Hello ${userName}! Welcome to your mock interview for ${type}. Ready? Tap the mic after I speak.`;
    const initialMessage = { role: 'assistant' as const, content: welcomeMsg };
    setMessages([initialMessage]);
    setLastMessage(welcomeMsg);
    synthesisQueueRef.current.push(welcomeMsg);

    setCallStatus(CallStatus.ACTIVE);
    speakNext();
  };

  const handleSpeak = () => {
    setStatusText("Starting to listen...");
    if (!permissionGranted) {
      requestMicPermission().then(hasPerm => {
        if (hasPerm) startListening();
      });
      return;
    }
    startListening();
  };

  const handleDisconnect = () => {
    console.log('Ending interview');
    setCallStatus(CallStatus.FINISHED); // Triggers useEffect for feedback
    setIsListening(false);
    setIsSpeaking(false);
    setShowSpeakButton(false);
    speechSynthesis.cancel();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current); // FIXED: Reset timer
    speakingStartRef.current = 0;
    isInitialGreetingRef.current = true;
    setStatusText("Generating feedback..."); // UI feedback
  };

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button className="btn-call" onClick={() => setError(null)}>
          Retry Call
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="call-view">
        <div className={cn("card-interviewer", isSpeaking && "ring-2 ring-green-500 animate-pulse")}>
          <div className="avatar">
            <Image src="/ai-avatar.png" alt="AI" width={65} height={54} className="object-cover" />
          </div>
          <h3>AI Interviewer</h3>
        </div>

        <div className={cn("card-border", isListening && "ring-2 ring-green-500 animate-pulse")}>
          <div className="card-content">
            <Image src="/user-avatar.png" alt="User" width={539} height={539} className="rounded-full object-cover size-[120px]" />
            <h3>{userName}</h3>
            <div className="flex flex-col items-center gap-1 mt-2">
              {isSpeaking ? (
                <Volume2 className="h-5 w-5 animate-pulse text-green-500 " title="AI Speaking" />
              ) : isListening ? (
                <Mic className="h-5 w-5 animate-pulse text-blue-500" title="Listening" />
              ) : isGenerating ? (
                <Loader2 className="h-5 w-5 animate-spin text-purple-500" title="AI Thinking" />
              ) : showSpeakButton ? (
                <button onClick={handleSpeak} className="p-1 rounded-full bg-blue-100 hover:bg-blue-200">
                  <Mic className="h-5 w-5 text-blue-600 cursor-pointer" />
                </button>
              ) : (
                <MicOff className="h-5 w-5 text-gray-400" title="Ready" />
              )}
              {isListening && <p className="text-xs text-blue-500">Speak now! (3s pause to process)</p>} {/* FIXED: Updated note */}
              {showSpeakButton && <p className="text-xs text-gray-500">Tap to speak</p>}
              {isGenerating && <p className="text-xs text-purple-500">AI thinking...</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="transcript-border">
        <div className="transcript">
          {messages.length > 0 && (
            <p key={lastMessage} className={cn("transition-opacity duration-500 opacity-0 animate-fadeIn opacity-100")}>
              {lastMessage}
            </p>
          )}
        </div>
      </div>

      {statusText && <p className="text-center text-sm text-muted-foreground mb-4">{statusText}</p>}

      <div className="w-full flex justify-center">
        {callStatus !== "ACTIVE" ? (
          <button className="relative btn-call" onClick={handleCall}>
            <span className={cn("absolute animate-ping rounded-full opacity-75", callStatus !== "CONNECTING" && "hidden")} />
            <span className="relative">{callStatus === "INACTIVE" || callStatus === "FINISHED" ? "Start Interview" : "Connecting..."}</span>
          </button>
        ) : (
          <button className="btn-disconnect cursor-pointer" onClick={handleDisconnect}>
            End Interview
          </button>
        )}
      </div>
    </>
  );
};

export default Agent;