import React, { useState } from 'react';
import { ChevronLeft, Sparkles, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { LogoutButton } from './LogoutButton';
import type { CoreRealm, QuizAnswer } from '../App';

interface QuizFlowProps {
  onComplete: (answers: QuizAnswer[]) => void;
  onBack: () => void;
  onLogout?: () => Promise<void>;
}

const QUIZ_QUESTIONS = [
  {
    id: 1,
    text: "You find yourself in a digital space that feels alive. What draws you in first?",
    options: [
      { text: "The endless reflections bouncing between crystalline surfaces", realm: "mirrorcore" as CoreRealm },
      { text: "The warm glow emanating from floating ember-like pixels", realm: "embercore" as CoreRealm },
      { text: "The deep, velvety darkness that seems to whisper secrets", realm: "shadowcore" as CoreRealm }
    ]
  },
  {
    id: 2,
    text: "A mysterious figure approaches you in this realm. How do they appear?",
    options: [
      { text: "As a shimmering, translucent being that shifts like liquid mercury", realm: "mirrorcore" as CoreRealm },
      { text: "As a radiant entity wrapped in dancing flames of pure light", realm: "embercore" as CoreRealm },
      { text: "As a silhouette outlined in starlight against the cosmic void", realm: "shadowcore" as CoreRealm }
    ]
  },
  {
    id: 3,
    text: "You're offered a gift that will enhance your journey. Which calls to you?",
    options: [
      { text: "A prism that reveals hidden truths in every reflection", realm: "mirrorcore" as CoreRealm },
      { text: "A phoenix feather that ignites transformation within", realm: "embercore" as CoreRealm },
      { text: "A void-black pearl that contains the wisdom of shadows", realm: "shadowcore" as CoreRealm }
    ]
  },
  {
    id: 4,
    text: "The realm begins to shift around you. What transformation occurs?",
    options: [
      { text: "Reality fractures into infinite kaleidoscopic possibilities", realm: "mirrorcore" as CoreRealm },
      { text: "Everything around you begins to glow with inner fire", realm: "embercore" as CoreRealm },
      { text: "The space dissolves into a beautiful, star-filled abyss", realm: "shadowcore" as CoreRealm }
    ]
  },
  {
    id: 5,
    text: "You encounter a portal to another dimension. What do you see through it?",
    options: [
      { text: "A hall of mirrors where each reflection shows a different you", realm: "mirrorcore" as CoreRealm },
      { text: "A forge of creation where new worlds are born from flame", realm: "embercore" as CoreRealm },
      { text: "A twilight garden where impossible flowers bloom in darkness", realm: "shadowcore" as CoreRealm }
    ]
  },
  {
    id: 6,
    text: "As your journey nears its end, what final truth resonates with your soul?",
    options: [
      { text: "Identity is fluid, truth is multifaceted, beauty lies in change", realm: "mirrorcore" as CoreRealm },
      { text: "Passion fuels growth, energy creates life, light conquers all", realm: "embercore" as CoreRealm },
      { text: "Mystery holds power, depth reveals wisdom, darkness nurtures dreams", realm: "shadowcore" as CoreRealm }
    ]
  }
];

export function QuizFlow({ onComplete, onBack, onLogout }: QuizFlowProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const question = QUIZ_QUESTIONS[currentQuestion];
  const progress = ((currentQuestion + 1) / QUIZ_QUESTIONS.length) * 100;

  const handleOptionSelect = (optionIndex: number, realm: CoreRealm) => {
    setSelectedOption(optionIndex);
    
    setTimeout(() => {
      const newAnswer: QuizAnswer = {
        questionId: question.id,
        selectedRealm: realm
      };
      
      const updatedAnswers = [...answers, newAnswer];
      setAnswers(updatedAnswers);
      
      if (currentQuestion < QUIZ_QUESTIONS.length - 1) {
        setIsAnimating(true);
        setTimeout(() => {
          setCurrentQuestion(currentQuestion + 1);
          setSelectedOption(null);
          setIsAnimating(false);
        }, 300);
      } else {
        // Quiz complete
        setTimeout(() => {
          onComplete(updatedAnswers);
        }, 800);
      }
    }, 600);
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setAnswers(answers.slice(0, -1));
      setSelectedOption(null);
    } else {
      onBack();
    }
  };

  return (
    <div className="min-h-screen bg-midnight-black relative overflow-hidden">
      {/* Header with back button and logout */}
      <div className="relative z-20 flex items-center justify-between p-4 md:p-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="gap-2 text-muted-lavender hover:text-pearl-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="font-body">Back</span>
        </Button>

        {/* Logout button in header */}
        {onLogout && (
          <LogoutButton 
            onLogout={onLogout}
            variant="ghost"
            size="sm"
            showText={false}
            className="text-muted-lavender hover:text-glitch-red"
          />
        )}
      </div>

      {/* Progress bar */}
      <div className="relative z-10 px-4 md:px-6 mb-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="font-body text-sm text-muted-lavender">
              Question {currentQuestion + 1} of {QUIZ_QUESTIONS.length}
            </span>
            <span className="font-body text-sm text-muted-lavender">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-midnight-black/50 rounded-full h-2 border border-muted-lavender/20">
            <div 
              className="bg-gradient-to-r from-neon-lilac to-electric-blue h-full rounded-full transition-all duration-500 ease-out pulse-glow"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question content */}
      <div className="relative z-10 px-4 md:px-6 flex-1">
        <div className="max-w-2xl mx-auto">
          <div className={`transition-all duration-300 ${isAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
            {/* Question */}
            <div className="text-center mb-12">
              <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-neon-lilac/20 to-electric-blue/20 border-2 border-neon-lilac/40">
                <Sparkles className="w-8 h-8 text-neon-lilac animate-pulse" />
              </div>
              
              <h2 className="font-headline text-2xl md:text-3xl text-pearl-white mb-4 leading-tight">
                {question.text}
              </h2>
            </div>

            {/* Options */}
            <div className="space-y-4">
              {question.options.map((option, index) => {
                const isSelected = selectedOption === index;
                const realmColors = {
                  mirrorcore: 'from-electric-blue/20 to-neon-lilac/20 border-electric-blue/40',
                  embercore: 'from-soft-blush/20 to-neon-lilac/20 border-soft-blush/40',
                  shadowcore: 'from-muted-lavender/20 to-electric-blue/20 border-muted-lavender/40'
                };
                
                return (
                  <button
                    key={index}
                    onClick={() => handleOptionSelect(index, option.realm)}
                    disabled={selectedOption !== null}
                    className={`
                      w-full p-6 rounded-2xl border-2 transition-all duration-300 text-left
                      ${isSelected 
                        ? `bg-gradient-to-r ${realmColors[option.realm]} scale-102 dreamy-glow` 
                        : 'bg-midnight-black/30 border-muted-lavender/20 hover:border-muted-lavender/40 hover:bg-midnight-black/50'
                      }
                      ${selectedOption !== null && !isSelected ? 'opacity-50' : ''}
                      group cursor-pointer
                    `}
                  >
                    <p className="font-body text-base md:text-lg text-pearl-white leading-relaxed group-hover:text-pearl-white transition-colors">
                      {option.text}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Ambient background effects */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-midnight-black via-purple-950/30 to-indigo-950/40" />
        
        {/* Floating orbs */}
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-neon-lilac/10 rounded-full blur-3xl animate-pulse float" />
        <div className="absolute bottom-1/3 right-1/4 w-24 h-24 bg-electric-blue/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 right-1/3 w-20 h-20 bg-soft-blush/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '4s' }} />
      </div>
    </div>
  );
}