import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Star,
  CheckCircle2,
  Check,
  AlertCircle,
  Send,
  Smartphone,
  Tag,
  MessageSquare,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

const APP_SCREENS = [
  { id: 'dashboard', label: '🏠 Home Dashboard' },
  { id: 'circles', label: '👥 Study Circles & Details' },
  { id: 'tasks', label: '📋 Task Management' },
  { id: 'sessions', label: '📅 Study Sessions' },
  { id: 'resources', label: '📚 Shared Resources' },
  { id: 'profile', label: '👤 Profile & Settings' },
  { id: 'auth', label: '🔐 Login / Sign Up' },
  { id: 'general', label: '✨ Overall / General' },
];

const CATEGORIES = [
  { id: 'bug', label: '🐛 Bug Report', color: 'border-feedback-error text-feedback-error bg-feedback-error-light' },
  { id: 'suggestion', label: '💡 Suggestion / Feature', color: 'border-teal text-teal bg-teal-light' },
  { id: 'usability', label: '🎨 UI & Usability', color: 'border-amber text-amber-muted bg-amber-light' },
  { id: 'performance', label: '⚡ Performance', color: 'border-navy text-navy bg-ivory-subtle' },
  { id: 'general', label: '💬 General Feedback', color: 'border-navy/40 text-navy bg-white' },
];

export const FeedbackPage: React.FC = () => {
  const navigate = useNavigate();
  const { submitFeedback } = useAppData();

  const [selectedScreen, setSelectedScreen] = useState('dashboard');
  const [selectedCategory, setSelectedCategory] = useState('bug');
  const [description, setDescription] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<{
    screenName: string;
    category: string;
    description: string;
    rating: number | null;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [formError, setFormError] = useState('');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!description.trim() || description.trim().length < 5) {
      setFormError('Please provide a short description (at least 5 characters).');
      return;
    }

    setFormError('');

    try {
      setIsSubmitting(true);
      const screenObj = APP_SCREENS.find((s) => s.id === selectedScreen);
      const categoryObj = CATEGORIES.find((c) => c.id === selectedCategory);

      const screenLabel = screenObj ? screenObj.label.replace(/^[^\s]+\s/, '') : 'General';
      const categoryLabel = categoryObj ? categoryObj.label.replace(/^[^\s]+\s/, '') : 'General Feedback';

      await submitFeedback({
        screenName: screenLabel,
        category: categoryLabel,
        comments: description.trim(),
        rating: rating,
      });

      setSubmittedData({
        screenName: screenLabel,
        category: categoryLabel,
        description: description.trim(),
        rating,
      });

      showToast('Thank you! Your feedback has been recorded.');
    } catch {
      showToast('Could not record feedback. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSubmittedData(null);
    setDescription('');
    setRating(null);
    setSelectedScreen('dashboard');
    setSelectedCategory('bug');
    setFormError('');
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold transition-all ${
            toastMessage.type === 'success'
              ? 'bg-feedback-success-light border-feedback-success/30 text-feedback-success'
              : 'bg-feedback-error-light border-feedback-error/30 text-feedback-error'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <Check className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 -ml-1.5 text-navy hover:bg-black/5 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold mb-2"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <h2 className="text-xl sm:text-2xl font-extrabold text-navy tracking-tight">
          Beta Feedback &amp; Bug Reports
        </h2>
        <p className="text-xs text-navy/50 mt-0.5">
          Help us refine StudyCircle for your courses and study circles. All submissions are stored privately.
        </p>
      </div>

      {submittedData ? (
        /* Confirmation Message Screen */
        <Card className="p-6 sm:p-8 text-center space-y-5 animate-fade-in">
          <div className="w-14 h-14 bg-feedback-success-light rounded-2xl flex items-center justify-center mx-auto text-feedback-success shadow-xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-navy">Feedback Received!</h3>
            <p className="text-xs text-navy/60 max-w-sm mx-auto mt-1 leading-relaxed">
              Thank you for testing StudyCircle. Your report has been securely saved to the database for the developer team.
            </p>
          </div>

          {/* Submission Summary Box */}
          <div className="p-4 bg-ivory-subtle rounded-xl text-left border border-ivory-border space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-ivory-border pb-2">
              <span className="text-navy/50 font-medium">Screen:</span>
              <span className="font-bold text-navy">{submittedData.screenName}</span>
            </div>
            <div className="flex items-center justify-between border-b border-ivory-border pb-2">
              <span className="text-navy/50 font-medium">Category:</span>
              <Badge variant="teal" size="sm">{submittedData.category}</Badge>
            </div>
            {submittedData.rating !== null && (
              <div className="flex items-center justify-between border-b border-ivory-border pb-2">
                <span className="text-navy/50 font-medium">Experience Rating:</span>
                <span className="font-bold text-amber">
                  {'★'.repeat(submittedData.rating)}{'☆'.repeat(5 - submittedData.rating)} ({submittedData.rating}/5)
                </span>
              </div>
            )}
            <div>
              <span className="text-navy/50 font-medium block mb-1">Description:</span>
              <p className="text-navy bg-white p-2.5 rounded-lg border border-ivory-border italic text-[11px] leading-relaxed">
                "{submittedData.description}"
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-2.5">
            <Button
              variant="secondary"
              onClick={handleResetForm}
              leftIcon={<RotateCcw className="w-4 h-4" />}
            >
              Submit Another Report
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate('/dashboard')}
            >
              Return to Dashboard
            </Button>
          </div>
        </Card>
      ) : (
        /* Feedback Submission Form */
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. Screen Selector */}
          <Card className="p-4 sm:p-5 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Smartphone className="w-4 h-4 text-teal" />
              <label className="text-xs font-bold text-navy uppercase tracking-wider">
                1. Where did you find this?
              </label>
            </div>
            <p className="text-[11px] text-navy/50 mb-2">
              Select the screen or feature related to your feedback.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {APP_SCREENS.map((s) => {
                const isSelected = selectedScreen === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedScreen(s.id)}
                    className={`min-h-[44px] p-2.5 rounded-xl text-left text-xs font-semibold border transition-all btn-press flex items-center justify-between ${
                      isSelected
                        ? 'border-teal bg-teal-light text-teal shadow-xs'
                        : 'border-ivory-border bg-white text-navy/70 hover:bg-ivory-subtle'
                    }`}
                  >
                    <span>{s.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-teal" />}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* 2. Category Selector */}
          <Card className="p-4 sm:p-5 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Tag className="w-4 h-4 text-amber" />
              <label className="text-xs font-bold text-navy uppercase tracking-wider">
                2. Category
              </label>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all btn-press flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-navy text-white border-navy shadow-xs'
                        : 'bg-white border-ivory-border text-navy/70 hover:bg-ivory-subtle'
                    }`}
                  >
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* 3. Short Description */}
          <Card className="p-4 sm:p-5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-teal" />
                <label className="text-xs font-bold text-navy uppercase tracking-wider">
                  3. Short Description <span className="text-feedback-error">*</span>
                </label>
              </div>
              <span className="text-[11px] font-mono text-navy/40">
                {description.length}/500
              </span>
            </div>
            <textarea
              rows={4}
              maxLength={500}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (formError) setFormError('');
              }}
              placeholder="What happened? What did you expect? Any steps to reproduce or suggestion details..."
              className="w-full bg-ivory-subtle border border-transparent rounded-input p-3 text-base sm:text-sm text-navy placeholder:text-navy/30 focus:outline-none focus:border-teal focus:bg-white resize-none"
              required
            />
            {formError && (
              <p className="text-[11px] font-medium text-feedback-error flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{formError}</span>
              </p>
            )}
          </Card>

          {/* 4. Optional Experience Rating */}
          <Card className="p-4 sm:p-5 text-center space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-navy uppercase tracking-wider">
                4. Experience Rating <span className="text-navy/40 font-normal">(Optional)</span>
              </span>
              {rating !== null && (
                <button
                  type="button"
                  onClick={() => setRating(null)}
                  className="text-[11px] text-navy/40 hover:text-navy hover:underline"
                >
                  Clear Rating
                </button>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 py-1">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = (hoverRating || rating || 0) >= star;
                return (
                  <button
                    type="button"
                    key={star}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="min-h-[44px] min-w-[44px] p-1 text-2xl sm:text-3xl transition-transform hover:scale-110 active:scale-95 focus:outline-none flex items-center justify-center"
                    title={`${star} star${star > 1 ? 's' : ''}`}
                  >
                    <Star
                      className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                        isFilled
                          ? 'text-amber fill-amber'
                          : 'text-ivory-border-strong hover:text-amber/40'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-navy/50">
              {rating
                ? `${rating} of 5 stars selected`
                : 'Tap a star if you want to leave an overall score, or skip this step'}
            </p>
          </Card>

          {/* Privacy Notice */}
          <div className="p-3 bg-ivory-subtle rounded-xl border border-ivory-border text-[11px] text-navy/50 leading-relaxed">
            🔒 <strong className="text-navy font-semibold">Privacy Protection:</strong> Row Level Security policies ensure your feedback is kept private and only accessible to authorized developers.
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={isSubmitting || !description.trim()}
            leftIcon={<Send className="w-4 h-4" />}
          >
            {isSubmitting ? 'Recording Feedback...' : 'Submit Feedback'}
          </Button>
        </form>
      )}
    </div>
  );
};
