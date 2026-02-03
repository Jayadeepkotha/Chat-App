import React, { useState, useEffect } from 'react';
import { AppView, UserProfile, Gender, FilterOption } from './types';
import { getStableDeviceId, checkSpecificLimit, incrementSpecificUsage, getRemainingSpecificMatches } from './services/deviceService';
import { verifyGender } from './services/verificationService';
import { APP_NAME, MATCH_COOLDOWN_MS } from './constants';
import Button from './components/Button';
import { socketService } from './services/socketService';

import Onboarding from './views/Onboarding';
import CameraView from './components/CameraView';
import ProfileSetup from './views/ProfileSetup';
import ChatView from './views/ChatView';
import CooldownView from './views/CooldownView';

import { Icons } from './constants';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.LANDING);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<{ nickname: string, bio: string, gender: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [matchFilter, setMatchFilter] = useState<FilterOption>('Any');
  const [queueTime, setQueueTime] = useState(0);

  const [lastExitTime, setLastExitTime] = useState(0);

  const [roomId, setRoomId] = useState<string>('');

  const handleCapture = async (base64: string) => {
    setIsProcessing(true);
    setVerificationError('');

    try {
      const [result, deviceId] = await Promise.all([
        verifyGender(base64),
        getStableDeviceId()
      ]);

      setIsProcessing(false);

      if (result.isVerified && result.detectedGender) {
        setUserProfile({
          nickname: '',
          bio: '',
          verifiedGender: result.detectedGender,
          deviceId: deviceId
        });
        setView(AppView.PROFILE_SETUP);
      } else {
        setVerificationError(result.error || "Could not verify gender clearly. Please try better lighting.");
      }
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
      setVerificationError("An error occurred. Please try again.");
    }
  };

  const handleProfileComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    socketService.connect(profile.deviceId);
    // Don't auto-queue. Go to Dashboard to choose.
    setView(AppView.DASHBOARD);
  };

  const startMatching = (preference: FilterOption) => {
    setMatchFilter(preference);
    enterMatchingQueue();
  };

  const enterMatchingQueue = () => {
    const timeSinceLastExit = Date.now() - lastExitTime;
    if (lastExitTime > 0 && timeSinceLastExit < MATCH_COOLDOWN_MS) {
      setView(AppView.COOLDOWN);
      return;
    }

    if (matchFilter !== 'Any' && !checkSpecificLimit()) {
      setMatchFilter('Any');
    }
    setView(AppView.MATCHING);
  };

  const handleChatExit = (shouldNext: boolean) => {
    if (roomId) {
      socketService.leaveChat(roomId);
      setRoomId('');
    }

    setLastExitTime(Date.now());
    socketService.offMatch();
    socketService.offChatEnded();

    if (shouldNext) {
      // User Request: "should again ask find female , find male , any"
      // So instead of auto-queueing, we send them to Dashboard.
      setView(AppView.DASHBOARD);
    } else {
      setView(AppView.DASHBOARD);
    }
  };

  useEffect(() => {
    // Global Match Listener (if any)
    // Removed duplicate onChatEnded here because ChatView handles it gracefully now.

    return () => {
    };
  }, []);

  useEffect(() => {
    let interval: number | undefined;
    if (view === AppView.MATCHING) {
      setQueueTime(0);
      interval = window.setInterval(() => {
        setQueueTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [view]);

  // Replace the "fake matching" useEffect with this:
  useEffect(() => {
    if (view === AppView.MATCHING) {
      // 1. Tell backend we want to queue
      const preference = matchFilter.toLowerCase() as 'male' | 'female' | 'any';
      // Use verified gender or fallback if missing (shouldn't happen if flow is followed)
      const myGender = userProfile?.verifiedGender || 'other';

      socketService.enterQueue({
        preference,
        gender: myGender,
        nickname: userProfile?.nickname || "Anonymous",
        bio: userProfile?.bio || ""
      });

      // 2. Listen for a match
      socketService.onMatch((data: any) => {
        // We found a match! Switch to chat.
        if (matchFilter !== 'Any') {
          incrementSpecificUsage();
        }
        console.log("Joined Room:", data.roomId);
        setRoomId(data.roomId);
        // Save partner info to state (we use a ref or temp state, but actually ChatView needs it)
        // Let's modify setPendingPartner or just use a state variable
        setPartnerProfile(data.partner);
        setView(AppView.CHAT);
      });
    }

    // Cleanup listeners when leaving matching screen
    return () => {
      socketService.offMatch();
    };
  }, [view, matchFilter]);

  if (view === AppView.LANDING) {
    return <Onboarding onStart={() => setView(AppView.VERIFICATION)} />;
  }

  if (view === AppView.VERIFICATION) {
    return (
      <div className="h-screen overflow-hidden flex flex-col justify-center bg-slate-900 p-4">
        {verificationError && (
          <div className="max-w-md mx-auto mb-4 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm text-center">
            {verificationError}
          </div>
        )}
        <CameraView onCapture={handleCapture} isProcessing={isProcessing} />
        <div className="mt-8 text-center">
          <Button variant="ghost" onClick={() => setView(AppView.LANDING)}>Cancel</Button>
        </div>
      </div>
    );
  }

  if (view === AppView.PROFILE_SETUP && userProfile) {
    return (
      <div className="min-h-screen bg-slate-900">
        <ProfileSetup
          detectedGender={userProfile.verifiedGender!}
          deviceId={userProfile.deviceId}
          onComplete={handleProfileComplete}
        />
      </div>
    );
  }

  if (view === AppView.DASHBOARD) {
    const remaining = getRemainingSpecificMatches();
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">Who do you want to find?</h2>
          <p className="text-slate-400 text-sm mt-2">Specific matches remaining: {remaining}/5</p>
        </div>

        <div className="grid grid-cols-1 gap-4 w-full max-w-xs">
          <Button
            onClick={() => startMatching('Female')}
            disabled={remaining <= 0}
            className="!bg-pink-600 hover:!bg-pink-700"
          >
            Find Female {remaining <= 0 && "🔒"}
          </Button>

          <Button
            onClick={() => startMatching('Male')}
            disabled={remaining <= 0}
            className="!bg-blue-600 hover:!bg-blue-700"
          >
            Find Male {remaining <= 0 && "🔒"}
          </Button>

          <Button
            variant="secondary"
            onClick={() => startMatching('Any')}
          >
            Find Anyone (Unlimited)
          </Button>
        </div>

        <div className="pt-8">
          <button
            onClick={() => {
              import('./services/deviceService').then(m => {
                m.resetDeviceId();
                window.location.reload();
              });
            }}
            className="text-xs text-slate-600 underline hover:text-slate-400"
          >
            Debug: Reset Identity
          </button>
        </div>
      </div>
    );
  }

  if (view === AppView.COOLDOWN) {
    return <CooldownView onComplete={() => setView(AppView.MATCHING)} startTime={lastExitTime} />;
  }

  if (view === AppView.MATCHING) {
    const remainingSpecific = getRemainingSpecificMatches();
    const isSpecificLimitReached = remainingSpecific <= 0;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-6 text-center">
        <div className="relative w-32 h-32 mb-8">
          <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-t-teal-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Icons.Sparkles />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Finding a match...</h2>
        <p className="text-slate-400 mb-8">
          Looking for <span className="text-teal-400 font-semibold">{matchFilter}</span> matches
        </p>

        {/* Removed buttons from here, as they are now in Dashboard */}

        <p className="text-xs text-slate-600">Time elapsed: {queueTime}s</p>
        <div className="mt-8">
          <Button variant="secondary" onClick={() => setView(AppView.DASHBOARD)}>Cancel</Button>
        </div>
      </div>
    );
  }

  if (view === AppView.CHAT && userProfile) {
    // Generate a stranger identity
    const strangerDiscriminator = Math.floor(1000 + Math.random() * 9000);
    const strangerName = "AnonUser#" + strangerDiscriminator;

    return (
      <div className="h-screen w-full max-w-2xl mx-auto bg-slate-900 shadow-2xl overflow-hidden relative">
        <ChatView
          roomId={roomId}
          partnerProfile={partnerProfile || {
            nickname: "Unknown",
            bio: "No Data",
            gender: "Unknown"
          }}
          onLeave={() => handleChatExit(false)}
          onNext={() => handleChatExit(true)}
        />
        {/* Debug Status Indicator */}
        <div style={{ position: 'absolute', top: 10, right: 10, padding: 8, background: 'rgba(0,0,0,0.5)', color: '#fff', borderRadius: 4, fontSize: 12 }}>
          Status: {roomId ? 'Matched' : 'Idle'} |
          Socket: {socketService.isConnected ? '✅ Connected' : '❌ Disconnected'} |
          DevID: {userProfile?.deviceId?.substring(0, 6) || 'N/A'}
        </div>
      </div>
    );
  }

  // Fallback state
  if (view === AppView.LIMIT_REACHED) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-6 text-center">
        <div className="bg-slate-800 p-8 rounded-2xl max-w-sm border border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-4">Daily Limit Reached</h2>
          <p className="text-slate-400 mb-6">
            You have used your specific filter matches for today. You can still use the "Any" filter.
          </p>
          <Button onClick={() => setView(AppView.DASHBOARD)}>Return to Dashboard</Button>
        </div>
      </div>
    )
  }

  return <div>Error: Unknown State</div>;
};

export default App;