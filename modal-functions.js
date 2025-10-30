const enhancedModalStyles = `
<style>
  /* Modal Overlay */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(8px);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    opacity: 0;
    animation: fadeIn 0.3s ease forwards;
  }

  @keyframes fadeIn {
    to { opacity: 1; }
  }

  .modal-overlay.closing {
    animation: fadeOut 0.3s ease forwards;
  }

  @keyframes fadeOut {
    to { opacity: 0; }
  }

  /* Modal Container */
  .modal-container {
    background: var(--card-bg);
    backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid var(--border-color);
    border-radius: 24px;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
    max-width: 900px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    position: relative;
    animation: modalSlideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes modalSlideUp {
    from {
      transform: translateY(50px) scale(0.9);
      opacity: 0;
    }
    to {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
  }

  .modal-container.closing {
    animation: modalSlideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes modalSlideDown {
    to {
      transform: translateY(50px) scale(0.9);
      opacity: 0;
    }
  }

  .modal-container.confirmation {
    max-width: 500px;
  }

  /* Modal Header */
  .modal-header {
    padding: 32px 40px 24px;
    border-bottom: 2px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    background: var(--card-bg);
    backdrop-filter: blur(20px);
    z-index: 10;
    border-radius: 24px 24px 0 0;
  }

  .modal-header h2 {
    font-size: 28px;
    font-weight: 800;
    color: var(--text-heading);
    margin: 0;
    background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .modal-close {
    background: rgba(239, 68, 68, 0.1);
    border: 2px solid rgba(239, 68, 68, 0.3);
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 24px;
    color: #ef4444;
    transition: all 0.3s;
    font-weight: bold;
  }

  .modal-close:hover {
    background: rgba(239, 68, 68, 0.2);
    transform: rotate(90deg) scale(1.1);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  }

  /* Unsaved Changes Indicator */
  .unsaved-changes-indicator {
    position: absolute;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #f59e0b, #d97706);
    color: white;
    padding: 8px 20px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 700;
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s;
    z-index: 11;
  }

  .unsaved-changes-indicator.show {
    opacity: 1;
  }

  /* Modal Body */
  .modal-body {
    padding: 40px;
  }

  /* Book Preview */
  .modal-book-preview {
    display: flex;
    gap: 28px;
    margin-bottom: 40px;
    padding: 28px;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(168, 85, 247, 0.1));
    border-radius: 20px;
    border: 2px solid rgba(99, 102, 241, 0.25);
    position: relative;
    overflow: hidden;
  }

  .modal-book-preview::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.08) 50%, transparent 70%);
    animation: shimmer 3s infinite;
  }

  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  .modal-book-preview img {
    width: 120px;
    height: 170px;
    object-fit: cover;
    border-radius: 12px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
    position: relative;
    z-index: 1;
  }

  .modal-book-info {
    flex: 1;
    position: relative;
    z-index: 1;
  }

  .modal-book-info h3 {
    font-size: 22px;
    font-weight: 800;
    color: var(--text-heading);
    margin-bottom: 12px;
    line-height: 1.3;
  }

  .modal-book-info p {
    font-size: 15px;
    color: var(--text-secondary);
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .modal-book-info p strong {
    color: var(--accent-primary);
    font-weight: 700;
    min-width: 85px;
  }

  /* Section Headers */
  .form-section-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 2px solid rgba(99, 102, 241, 0.15);
    position: relative;
  }

  .form-section-header::after {
    content: "";
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 80px;
    height: 2px;
    background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
    border-radius: 2px;
  }

  .form-section-header .icon {
    font-size: 28px;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
  }

  .form-section-header .text {
    flex: 1;
  }

  .form-section-header h3 {
    font-size: 18px;
    font-weight: 800;
    color: var(--text-heading);
    margin: 0 0 4px 0;
  }

  .form-section-header p {
    font-size: 13px;
    color: var(--text-secondary);
    margin: 0;
  }

  /* Form Groups */
  .modal-body .form-group {
    margin-bottom: 28px;
    position: relative;
  }

  .modal-body .form-group label {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
    color: var(--text-primary);
    font-weight: 700;
    font-size: 15px;
  }

  .modal-body .form-group label .required {
    color: #ef4444;
    font-size: 18px;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .modal-body .form-group label .optional {
    font-size: 12px;
    color: var(--text-secondary);
    font-weight: 500;
    background: rgba(99, 102, 241, 0.1);
    padding: 2px 8px;
    border-radius: 8px;
  }

  .modal-body .form-group input,
  .modal-body .form-group select,
  .modal-body .form-group textarea {
    width: 100%;
    padding: 14px 18px;
    background: rgba(15, 23, 42, 0.4);
    border: 2px solid var(--border-color);
    border-radius: 12px;
    color: var(--text-primary);
    font-size: 15px;
    transition: all 0.3s;
    font-family: inherit;
    font-weight: 500;
  }

  body.light-mode .modal-body .form-group input,
  body.light-mode .modal-body .form-group select,
  body.light-mode .modal-body .form-group textarea {
    background: rgba(255, 255, 255, 0.7);
  }

  .modal-body .form-group input:focus,
  .modal-body .form-group select:focus,
  .modal-body .form-group textarea:focus {
    outline: none;
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
    background: rgba(15, 23, 42, 0.5);
    transform: scale(1.01);
  }

  body.light-mode .modal-body .form-group input:focus,
  body.light-mode .modal-body .form-group select:focus,
  body.light-mode .modal-body .form-group textarea:focus {
    background: rgba(255, 255, 255, 0.9);
  }

  .modal-body .form-group textarea {
    resize: vertical;
    min-height: 100px;
    line-height: 1.6;
  }

  .modal-body .form-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
    gap: 20px;
  }

  /* Status Buttons */
  .modal-body .status-buttons {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-top: 12px;
  }

  .modal-body .status-btn {
    padding: 18px 16px;
    background: rgba(99, 102, 241, 0.08);
    border: 2px solid var(--border-color);
    border-radius: 14px;
    color: var(--text-primary);
    font-weight: 700;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    position: relative;
    overflow: hidden;
    text-align: center;
  }

  .modal-body .status-btn .status-icon {
    font-size: 32px;
    transition: transform 0.3s;
  }

  .modal-body .status-btn .status-text {
    font-size: 14px;
    font-weight: 700;
  }

  .modal-body .status-btn .status-desc {
    font-size: 11px;
    font-weight: 500;
    color: var(--text-secondary);
    line-height: 1.3;
  }

  .modal-body .status-btn::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1));
    opacity: 0;
    transition: opacity 0.3s;
  }

  .modal-body .status-btn:hover::before {
    opacity: 1;
  }

  .modal-body .status-btn:hover {
    border-color: var(--accent-primary);
    transform: translateY(-4px);
    box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);
  }

  .modal-body .status-btn:hover .status-icon {
    transform: scale(1.15);
  }

  .modal-body .status-btn.active {
    background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
    border-color: var(--accent-secondary);
    color: white;
    transform: translateY(-4px);
    box-shadow: 0 12px 28px rgba(99, 102, 241, 0.5);
  }

  .modal-body .status-btn.active .status-desc {
    color: rgba(255, 255, 255, 0.9);
  }

  .modal-body .status-btn.active .status-icon {
    transform: scale(1.2);
  }

  .modal-body .status-btn.active::before {
    opacity: 0;
  }

  /* Progress Slider */
  .progress-slider-container {
    margin-top: 12px;
  }

  .progress-slider-wrapper {
    position: relative;
    padding: 24px 0;
  }

  .progress-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 12px;
    border-radius: 6px;
    background: linear-gradient(
      to right,
      var(--accent-primary) 0%,
      var(--accent-primary) var(--progress, 0%),
      rgba(99, 102, 241, 0.2) var(--progress, 0%),
      rgba(99, 102, 241, 0.2) 100%
    );
    outline: none;
    transition: all 0.3s;
    cursor: pointer;
  }

  .progress-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.5);
    transition: all 0.2s;
  }

  .progress-slider::-moz-range-thumb {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.5);
    border: none;
    transition: all 0.2s;
  }

  .progress-slider:hover::-webkit-slider-thumb {
    transform: scale(1.2);
    box-shadow: 0 6px 16px rgba(99, 102, 241, 0.6);
  }

  .progress-slider:hover::-moz-range-thumb {
    transform: scale(1.2);
    box-shadow: 0 6px 16px rgba(99, 102, 241, 0.6);
  }

  .progress-milestones {
    display: flex;
    justify-content: space-between;
    margin-top: 8px;
    padding: 0 4px;
  }

  .milestone {
    font-size: 11px;
    color: var(--text-secondary);
    font-weight: 600;
  }

  .progress-display {
    text-align: center;
    margin-top: 16px;
    font-size: 32px;
    font-weight: 800;
    background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  /* Star Rating */
  .modal-body .star-rating-input {
    display: flex;
    gap: 8px;
    margin-top: 12px;
    justify-content: center;
  }

  .modal-body .star-rating-input button {
    background: none;
    border: none;
    font-size: 40px;
    cursor: pointer;
    color: #475569;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    padding: 4px;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
    position: relative;
  }

  body.light-mode .modal-body .star-rating-input button {
    color: #cbd5e1;
  }

  .modal-body .star-rating-input button:hover {
    transform: scale(1.3) rotate(10deg);
    color: #fbbf24;
  }

  .modal-body .star-rating-input button.active {
    color: #fbbf24;
    transform: scale(1.15);
    filter: drop-shadow(0 4px 8px rgba(251, 191, 36, 0.5));
    animation: starPop 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes starPop {
    0% { transform: scale(0.8); }
    50% { transform: scale(1.3); }
    100% { transform: scale(1.15); }
  }

  .star-rating-input button.active::after {
    content: "✨";
    position: absolute;
    top: -10px;
    right: -10px;
    font-size: 16px;
    animation: sparkle 0.6s ease;
  }

  @keyframes sparkle {
    0% { opacity: 0; transform: scale(0) rotate(0deg); }
    50% { opacity: 1; transform: scale(1.5) rotate(180deg); }
    100% { opacity: 0; transform: scale(0) rotate(360deg); }
  }

  .star-rating-labels {
    display: flex;
    justify-content: space-between;
    margin-top: 12px;
    padding: 0 8px;
  }

  .star-rating-labels span {
    font-size: 12px;
    color: var(--text-secondary);
    font-weight: 600;
  }

  .rating-feedback {
    text-align: center;
    margin-top: 16px;
    padding: 12px;
    background: rgba(99, 102, 241, 0.1);
    border-radius: 12px;
    font-size: 16px;
    font-weight: 700;
    color: var(--accent-primary);
    opacity: 0;
    transform: translateY(-10px);
    transition: all 0.3s;
  }

  .rating-feedback.show {
    opacity: 1;
    transform: translateY(0);
  }

  /* Time Picker */
  .time-picker {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 12px;
  }

  .time-picker button {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 2px solid var(--border-color);
    background: rgba(99, 102, 241, 0.1);
    color: var(--text-primary);
    font-size: 20px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .time-picker button:hover {
    background: rgba(99, 102, 241, 0.2);
    border-color: var(--accent-primary);
    transform: scale(1.1);
  }

  .time-picker button:active {
    transform: scale(0.95);
  }

  .time-picker input {
    flex: 1;
    text-align: center;
    font-size: 24px;
    font-weight: 800;
    padding: 12px;
  }

  .time-presets {
    display: flex;
    gap: 8px;
    margin-top: 12px;
    flex-wrap: wrap;
  }

  .time-preset {
    padding: 8px 16px;
    background: rgba(99, 102, 241, 0.1);
    border: 2px solid var(--border-color);
    border-radius: 20px;
    font-size: 13px;
    font-weight: 700;
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.2s;
  }

  .time-preset:hover {
    background: rgba(99, 102, 241, 0.2);
    border-color: var(--accent-primary);
    transform: translateY(-2px);
  }

  .reading-speed-feedback {
    margin-top: 12px;
    padding: 10px;
    background: rgba(34, 197, 94, 0.1);
    border-radius: 8px;
    font-size: 13px;
    color: #22c55e;
    font-weight: 600;
    text-align: center;
  }

  /* Genre Select */
  .genre-select-wrapper {
    position: relative;
  }

  .genre-dropdown {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 8px;
    background: var(--card-bg);
    border: 2px solid var(--border-color);
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    max-height: 300px;
    overflow-y: auto;
    z-index: 100;
  }

  .genre-dropdown.show {
    display: block;
    animation: dropdownSlide 0.2s ease;
  }

  @keyframes dropdownSlide {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .genre-option {
    padding: 12px 16px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 600;
  }

  .genre-option:hover {
    background: rgba(99, 102, 241, 0.1);
  }

  .genre-icon {
    font-size: 20px;
  }

  .genre-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
    background: rgba(99, 102, 241, 0.15);
    border-radius: 20px;
    font-size: 14px;
    font-weight: 700;
    color: var(--accent-primary);
    margin-top: 8px;
  }

  /* Character Counter */
  .character-counter {
    text-align: right;
    margin-top: 8px;
    font-size: 12px;
    color: var(--text-secondary);
    font-weight: 600;
  }

  .character-counter.warning {
    color: #f59e0b;
  }

  .character-counter.limit {
    color: #ef4444;
  }

  /* Mood Buttons */
  .mood-buttons {
    display: flex;
    gap: 8px;
    margin-top: 12px;
    flex-wrap: wrap;
  }

  .mood-btn {
    padding: 8px 14px;
    background: rgba(99, 102, 241, 0.1);
    border: 2px solid transparent;
    border-radius: 20px;
    font-size: 20px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .mood-btn:hover {
    transform: scale(1.15);
    border-color: var(--accent-primary);
  }

  .mood-btn.selected {
    background: rgba(99, 102, 241, 0.2);
    border-color: var(--accent-primary);
    transform: scale(1.1);
  }

  /* Template Suggestions */
  .template-suggestions {
    display: flex;
    gap: 8px;
    margin-top: 12px;
    flex-wrap: wrap;
  }

  .template-btn {
    padding: 6px 12px;
    background: rgba(99, 102, 241, 0.08);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s;
  }

  .template-btn:hover {
    background: rgba(99, 102, 241, 0.15);
    color: var(--accent-primary);
    transform: translateY(-2px);
  }

  /* Date Quick Actions */
  .date-quick-actions {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }

  .date-quick-btn {
    padding: 6px 12px;
    background: rgba(99, 102, 241, 0.1);
    border: 2px solid var(--border-color);
    border-radius: 16px;
    font-size: 12px;
    font-weight: 700;
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.2s;
  }

  .date-quick-btn:hover {
    background: rgba(99, 102, 241, 0.2);
    border-color: var(--accent-primary);
  }

  .days-ago {
    margin-top: 8px;
    font-size: 13px;
    color: var(--text-secondary);
    font-weight: 600;
  }

  /* Conditional Fields */
  .conditional-fields {
    overflow: hidden;
    max-height: 0;
    opacity: 0;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .conditional-fields.show {
    max-height: 2000px;
    opacity: 1;
  }

  /* Modal Footer */
  .modal-footer {
    padding: 28px 40px 40px;
    display: flex;
    gap: 16px;
    border-top: 2px solid rgba(99, 102, 241, 0.15);
    position: sticky;
    bottom: 0;
    background: var(--card-bg);
    backdrop-filter: blur(20px);
    border-radius: 0 0 24px 24px;
  }

  .modal-footer button {
    flex: 1;
    padding: 16px 28px;
    border: none;
    border-radius: 14px;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
    letter-spacing: 0.3px;
  }

  .modal-footer button::before {
    content: "";
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
    transition: left 0.5s;
  }

  .modal-footer button:hover::before {
    left: 100%;
  }

  .btn-modal-cancel {
    background: linear-gradient(135deg, rgba(100, 116, 139, 0.15), rgba(71, 85, 105, 0.15));
    border: 2px solid rgba(100, 116, 139, 0.35);
    color: var(--text-primary);
    font-weight: 700;
  }

  .btn-modal-cancel:hover {
    background: linear-gradient(135deg, rgba(100, 116, 139, 0.25), rgba(71, 85, 105, 0.25));
    border-color: rgba(100, 116, 139, 0.5);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(100, 116, 139, 0.3);
  }

  .btn-modal-cancel:active {
    transform: translateY(0);
  }

  .btn-modal-save {
    background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
    color: white;
    box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
    border: 2px solid transparent;
    position: relative;
  }

  .btn-modal-save:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 28px rgba(99, 102, 241, 0.5);
  }

  .btn-modal-save:active {
    transform: translateY(-1px);
  }

  .btn-modal-save:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    background: linear-gradient(135deg, rgba(100, 116, 139, 0.3), rgba(71, 85, 105, 0.3));
  }

  .btn-modal-save.saved {
    background: linear-gradient(135deg, #22c55e, #16a34a);
  }

  .save-count {
    position: absolute;
    top: -8px;
    right: -8px;
    background: linear-gradient(135deg, #f59e0b, #d97706);
    color: white;
    font-size: 11px;
    font-weight: 800;
    padding: 4px 8px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(245, 158, 11, 0.4);
    animation: bounce 0.5s ease;
  }

  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }

  .btn-modal-delete {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: white;
    box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
    border: 2px solid transparent;
  }

  .btn-modal-delete:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 28px rgba(239, 68, 68, 0.5);
  }

  .btn-modal-delete:active {
    transform: translateY(-1px);
  }

  /* Confirmation Modal */
  .confirmation-content {
    padding: 24px;
    text-align: center;
  }

  .confirmation-icon {
    font-size: 64px;
    margin-bottom: 20px;
    animation: warningPulse 1.5s ease-in-out infinite;
  }

  @keyframes warningPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }

  .confirmation-message {
    font-size: 18px;
    color: var(--text-primary);
    margin-bottom: 12px;
    font-weight: 600;
  }

  .confirmation-book-title {
    font-size: 20px;
    font-weight: 800;
    color: var(--accent-primary);
    margin-bottom: 16px;
  }

  .confirmation-warning {
    font-size: 14px;
    color: var(--text-secondary);
    margin-bottom: 24px;
  }

  /* Card Action Buttons */
  .book-back-actions {
    display: flex;
    gap: 12px;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 2px solid rgba(99, 102, 241, 0.15);
  }

  .book-back-actions button {
    flex: 1;
    padding: 12px 20px;
    border: none;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    position: relative;
    overflow: hidden;
    letter-spacing: 0.3px;
  }

  .book-back-actions button::before {
    content: "";
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
    transition: left 0.5s;
  }

  .book-back-actions button:hover::before {
    left: 100%;
  }

  .btn-edit-book {
    background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
    color: white;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
    border: 2px solid transparent;
  }

  .btn-edit-book:hover {
    transform: translateY(-3px) scale(1.02);
    box-shadow: 0 8px 20px rgba(99, 102, 241, 0.5);
  }

  .btn-edit-book:active {
    transform: translateY(-1px) scale(1);
  }

  .btn-delete-book {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.1));
    backdrop-filter: blur(10px);
    border: 2px solid rgba(239, 68, 68, 0.4);
    color: #ef4444;
    font-weight: 700;
  }

  .btn-delete-book:hover {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.2));
    border-color: rgba(239, 68, 68, 0.6);
    transform: translateY(-3px) scale(1.02);
    box-shadow: 0 8px 20px rgba(239, 68, 68, 0.4);
  }

  .btn-delete-book:active {
    transform: translateY(-1px) scale(1);
  }

  .book-back-actions button span {
    font-size: 16px;
    transition: transform 0.3s;
  }

  .btn-edit-book:hover span {
    transform: rotate(10deg) scale(1.1);
  }

  .btn-delete-book:hover span {
    transform: scale(1.2);
  }

  /* Scrollbar */
  .modal-container::-webkit-scrollbar {
    width: 8px;
  }

  .modal-container::-webkit-scrollbar-track {
    background: var(--card-bg);
  }

  .modal-container::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, var(--accent-primary), var(--accent-secondary));
    border-radius: 4px;
  }

  .genre-dropdown::-webkit-scrollbar {
    width: 6px;
  }

  .genre-dropdown::-webkit-scrollbar-track {
    background: var(--card-bg);
  }

  .genre-dropdown::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, var(--accent-primary), var(--accent-secondary));
    border-radius: 3px;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .modal-container {
      max-width: 100%;
      max-height: 100vh;
      border-radius: 0;
    }

    .modal-header,
    .modal-body,
    .modal-footer {
      padding: 24px 20px;
    }

    .modal-header h2 {
      font-size: 24px;
    }

    .modal-book-preview {
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 20px;
      gap: 20px;
    }

    .modal-book-preview img {
      width: 100px;
      height: 140px;
    }

    .modal-book-info h3 {
      font-size: 18px;
    }

    .modal-book-info p {
      font-size: 14px;
      justify-content: center;
    }

    .modal-body .form-row {
      grid-template-columns: 1fr;
    }

    .modal-body .status-buttons {
      grid-template-columns: 1fr;
      gap: 10px;
    }

    .modal-body .status-btn {
      padding: 14px;
    }

    .modal-body .status-btn .status-icon {
      font-size: 28px;
    }

    .modal-body .star-rating-input {
      justify-content: center;
      gap: 6px;
    }

    .modal-body .star-rating-input button {
      font-size: 32px;
    }

    .modal-footer {
      flex-direction: column-reverse;
      padding: 20px;
    }

    .modal-footer button {
      width: 100%;
    }

    .time-picker {
      flex-direction: column;
    }

    .time-picker input {
      width: 100%;
    }
  }

  body.modal-open {
    overflow: hidden;
  }

  /* Tooltip */
  [data-tooltip] {
    position: relative;
    cursor: help;
  }

  [data-tooltip]::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%) translateY(-8px);
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    font-size: 12px;
    font-weight: 600;
    border-radius: 8px;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s, transform 0.2s;
    z-index: 1000;
  }

  [data-tooltip]:hover::after {
    opacity: 1;
    transform: translateX(-50%) translateY(-4px);
  }

  /* Loading Spinner */
  .loading-spinner {
    display: inline-block;
    width: 18px;
    height: 18px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
`;


window.enhancedModalStyles = enhancedModalStyles;





const GENRES = [
  { name: 'Fiction', icon: '📖' },
  { name: 'Non-Fiction', icon: '📚' },
  { name: 'Mystery', icon: '🔍' },
  { name: 'Thriller', icon: '😱' },
  { name: 'Romance', icon: '❤️' },
  { name: 'Science Fiction', icon: '🚀' },
  { name: 'Fantasy', icon: '🐉' },
  { name: 'Biography', icon: '👤' },
  { name: 'History', icon: '📜' },
  { name: 'Self-Help', icon: '💪' },
  { name: 'Business', icon: '💼' },
  { name: 'Science', icon: '🔬' },
  { name: 'Philosophy', icon: '🤔' },
  { name: 'Poetry', icon: '✍️' },
  { name: 'Horror', icon: '👻' },
];

const RATING_LABELS = ['Poor', 'Fair', 'Good', 'Great', 'Excellent'];
const RATING_FEEDBACK = [
  "Not your favorite? That's okay!",
  "It was alright, but not amazing.",
  "A solid read! Enjoyed it overall.",
  "Really great! Highly recommend.",
  "Absolutely loved it! A masterpiece!"
];


let originalData = {};
let changesCount = 0;


function initializeModals() {
  if (!document.getElementById('modal-styles')) {
    const styleEl = document.createElement('div');
    styleEl.id = 'modal-styles';
    styleEl.innerHTML = enhancedModalStyles;
    document.head.appendChild(styleEl);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllModals();
    }
    
    if (e.key >= '1' && e.key <= '5') {
      const activeModal = document.querySelector('.modal-overlay:not(.closing)');
      if (activeModal && document.getElementById('edit-rating-stars')) {
        setEditRating(parseInt(e.key));
      }
    }
  });
}

function closeAllModals() {
  const modals = document.querySelectorAll('.modal-overlay');
  modals.forEach(modal => closeModal(modal));
}

function closeModal(modalElement) {
  modalElement.classList.add('closing');
  modalElement.querySelector('.modal-container').classList.add('closing');
  
  setTimeout(() => {
    modalElement.remove();
    document.body.classList.remove('modal-open');
  }, 300);
}

function handleOverlayClick(event) {
  if (event.target.classList.contains('modal-overlay')) {
    if (changesCount > 0) {
      if (confirm(`You have ${changesCount} unsaved change(s). Close anyway?`)) {
        closeAllModals();
      }
    } else {
      closeAllModals();
    }
  }
}

function trackChange(fieldName, newValue) {
  if (originalData[fieldName] !== newValue) {
    changesCount++;
    updateUnsavedIndicator();
    updateSaveButton();
  }
}

function updateUnsavedIndicator() {
  const indicator = document.querySelector('.unsaved-changes-indicator');
  if (indicator) {
    if (changesCount > 0) {
      indicator.textContent = `${changesCount} unsaved change${changesCount > 1 ? 's' : ''}`;
      indicator.classList.add('show');
    } else {
      indicator.classList.remove('show');
    }
  }
}

function updateSaveButton() {
  const saveBtn = document.getElementById('edit-submit-btn');
  if (saveBtn) {
    if (changesCount === 0) {
      saveBtn.textContent = 'No changes made';
      saveBtn.disabled = true;
    } else {
      saveBtn.innerHTML = `💾 Save ${changesCount} change${changesCount > 1 ? 's' : ''}`;
      saveBtn.disabled = false;
      
      const existingBadge = saveBtn.querySelector('.save-count');
      if (existingBadge) {
        existingBadge.remove();
      }
      
      const countBadge = document.createElement('span');
      countBadge.className = 'save-count';
      countBadge.textContent = changesCount;
      saveBtn.appendChild(countBadge);
    }
  }
}


function renderGenreDropdown() {
  const dropdown = document.getElementById('genre-dropdown');
  if (dropdown) {
    dropdown.innerHTML = GENRES.map(genre => `
      <div class="genre-option" onclick="selectGenre('${genre.name}', '${genre.icon}')">
        <span class="genre-icon">${genre.icon}</span>
        <span>${genre.name}</span>
      </div>
    `).join('');
  }
}

function showGenreDropdown() {
  const dropdown = document.getElementById('genre-dropdown');
  if (dropdown) {
    dropdown.classList.add('show');
    renderGenreDropdown();
  }
}

function hideGenreDropdown() {
  setTimeout(() => {
    const dropdown = document.getElementById('genre-dropdown');
    if (dropdown) {
      dropdown.classList.remove('show');
    }
  }, 200);
}

function filterGenres(query) {
  const dropdown = document.getElementById('genre-dropdown');
  if (!dropdown) return;
  
  const filtered = GENRES.filter(g => 
    g.name.toLowerCase().includes(query.toLowerCase())
  );
  
  dropdown.innerHTML = filtered.map(genre => `
    <div class="genre-option" onclick="selectGenre('${genre.name}', '${genre.icon}')">
      <span class="genre-icon">${genre.icon}</span>
      <span>${genre.name}</span>
    </div>
  `).join('');
  
  dropdown.classList.add('show');
}

function selectGenre(name, icon) {
  const input = document.getElementById('edit-genre');
  if (input) {
    input.value = name;
    showGenreBadge(name, icon);
    hideGenreDropdown();
    trackChange('genre', name);
  }
}

function showGenreBadge(name, icon) {
  const container = document.getElementById('genre-badge-container');
  if (container) {
    const genreData = GENRES.find(g => g.name === name);
    const displayIcon = icon || (genreData ? genreData.icon : '📖');
    container.innerHTML = `
      <div class="genre-badge">
        <span>${displayIcon}</span>
        <span>${name}</span>
      </div>
    `;
  }
}


function updateProgressDisplay(value) {
  const display = document.getElementById('progress-display');
  const slider = document.getElementById('edit-progress');
  if (display) {
    display.textContent = `${value}%`;
  }
  if (slider) {
    slider.style.setProperty('--progress', `${value}%`);
  }
}


function adjustTime(amount) {
  const input = document.getElementById('edit-reading-time');
  if (input) {
    const current = parseFloat(input.value) || 0;
    const newValue = Math.max(0, current + amount);
    input.value = newValue;
    trackChange('readingTime', newValue);
    
    const pageText = document.querySelector('.modal-book-info p:nth-child(3)');
    const pages = pageText ? parseInt(pageText.textContent.match(/\d+/)?.[0] || 0) : 0;
    updateReadingSpeed(newValue, pages);
  }
}

function adjustTotalTime(amount) {
  const input = document.getElementById('edit-total-reading-time');
  if (input) {
    const current = parseFloat(input.value) || 0;
    input.value = Math.max(0, current + amount);
    trackChange('readingTime', input.value);
  }
}

function setTime(hours) {
  const input = document.getElementById('edit-reading-time');
  if (input) {
    input.value = hours;
    trackChange('readingTime', hours);
    
    const pageText = document.querySelector('.modal-book-info p:nth-child(3)');
    const pages = pageText ? parseInt(pageText.textContent.match(/\d+/)?.[0] || 0) : 0;
    updateReadingSpeed(hours, pages);
  }
}

function setTotalTime(hours) {
  const input = document.getElementById('edit-total-reading-time');
  if (input) {
    input.value = hours;
    trackChange('readingTime', hours);
  }
}

function updateReadingSpeed(hours, pages) {
  const feedback = document.getElementById('reading-speed-feedback');
  if (feedback && hours > 0 && pages > 0) {
    const pagesPerHour = Math.round(pages / hours);
    feedback.textContent = `📊 That's about ${pagesPerHour} pages/hour!`;
    feedback.style.display = 'block';
  } else if (feedback) {
    feedback.style.display = 'none';
  }
}


function setEditRating(rating) {
  window.currentEditRating = rating;
  document.getElementById('edit-rating').value = rating;

  const stars = document.querySelectorAll('#edit-rating-stars button');
  stars.forEach((star, index) => {
    if (index < rating) {
      star.classList.add('active');
    } else {
      star.classList.remove('active');
    }
  });
  
  showRatingFeedback(rating);
}

function showRatingFeedback(rating) {
  const feedback = document.getElementById('rating-feedback');
  if (feedback && rating > 0) {
    feedback.textContent = `⭐ ${RATING_FEEDBACK[rating - 1]}`;
    feedback.classList.add('show');
  }
}


function setToday() {
  const input = document.getElementById('edit-finish-date');
  if (input) {
    const today = new Date().toISOString().split('T')[0];
    input.value = today;
    updateDaysAgo(today);
    trackChange('lastReadDate', today);
  }
}

function setYesterday() {
  const input = document.getElementById('edit-finish-date');
  if (input) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    input.value = dateStr;
    updateDaysAgo(dateStr);
    trackChange('lastReadDate', dateStr);
  }
}

function updateDaysAgo(dateStr) {
  const display = document.getElementById('days-ago');
  if (display && dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    const diffTime = Math.abs(today - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      display.textContent = '📅 Finished today';
    } else if (diffDays === 1) {
      display.textContent = '📅 Finished yesterday';
    } else {
      display.textContent = `📅 Finished ${diffDays} days ago`;
    }
  }
}

function updateDaysAgoCurrent(dateStr) {
  const display = document.getElementById('days-ago-current');
  if (display && dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    const diffTime = Math.abs(today - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      display.textContent = '📅 Last read today';
    } else if (diffDays === 1) {
      display.textContent = '📅 Last read yesterday';
    } else {
      display.textContent = `📅 Last read ${diffDays} days ago`;
    }
  }
}

function setLastReadTodayCurrent() {
  const input = document.getElementById('edit-last-read-current');
  if (input) {
    const today = new Date().toISOString().split('T')[0];
    input.value = today;
    updateDaysAgoCurrent(today);
    trackChange('lastReadDate', today);
  }
}

function setLastReadYesterdayCurrent() {
  const input = document.getElementById('edit-last-read-current');
  if (input) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    input.value = dateStr;
    updateDaysAgoCurrent(dateStr);
    trackChange('lastReadDate', dateStr);
  }
}


function updateCharCount(textarea) {
  const counter = document.getElementById('char-counter');
  if (counter) {
    const count = textarea.value.length;
    const max = 1000;
    counter.textContent = `${count} / ${max}`;
    
    counter.classList.remove('warning', 'limit');
    
    if (count > max * 0.9) {
      counter.classList.add('warning');
    }
    
    if (count >= max) {
      counter.classList.add('limit');
    }
  }
}

function toggleMood(button, emoji) {
  button.classList.toggle('selected');
  const textarea = document.getElementById('edit-notes');
  if (textarea && button.classList.contains('selected')) {
    textarea.value += ` ${emoji}`;
    updateCharCount(textarea);
    trackChange('notes', textarea.value);
  }
}

function insertTemplate(template) {
  const textarea = document.getElementById('edit-notes');
  if (textarea) {
    const cursorPos = textarea.selectionStart;
    const textBefore = textarea.value.substring(0, cursorPos);
    const textAfter = textarea.value.substring(cursorPos);
    textarea.value = textBefore + template + textAfter;
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = cursorPos + template.length;
    updateCharCount(textarea);
    trackChange('notes', textarea.value);
  }
}


function selectEditStatus(status) {
  window.currentEditStatus = status;
  
  document.querySelectorAll('.modal-overlay .status-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.status === status) {
      btn.classList.add('active');
    }
  });

  const currentlyReadingFields = document.getElementById('edit-currently-reading-fields');
  const finishedFields = document.getElementById('edit-finished-fields');

  if (status === 'Currently Reading') {
    currentlyReadingFields.classList.add('show');
    finishedFields.classList.remove('show');
  } else if (status === 'Finished') {
    currentlyReadingFields.classList.remove('show');
    finishedFields.classList.add('show');
    
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('edit-finish-date');
    if (dateInput && !dateInput.value) {
      dateInput.value = today;
      updateDaysAgo(today);
    }
  } else {
    currentlyReadingFields.classList.remove('show');
    finishedFields.classList.remove('show');
  }
  
  trackChange('status', status);
}


async function openEditModal(bookId) {
  try {
    const book = await api.getBook(bookId);
    
    originalData = {
      status: book.status,
      genre: book.genre,
      progress: book.progress,
      readingTime: book.reading_time,
      rating: book.rating,
      lastReadDate: book.last_read_date,
      notes: book.notes
    };
    changesCount = 0;
    
    const modalHTML = `
      <div class="modal-overlay" onclick="handleOverlayClick(event)">
        <div class="modal-container">
          <div class="unsaved-changes-indicator"></div>
          
          <div class="modal-header">
            <h2>✏️ Edit Book</h2>
            <button class="modal-close" onclick="closeAllModals()">×</button>
          </div>
          
          <div class="modal-body">
            <div class="modal-book-preview">
              <img src="${book.cover_url || 'https://via.placeholder.com/120x170?text=No+Cover'}" alt="${book.title}">
              <div class="modal-book-info">
                <h3>${book.title}</h3>
                <p><strong>Author:</strong> ${book.author}</p>
                <p><strong>Pages:</strong> ${book.pages || 'Unknown'}</p>
                ${book.publisher ? `<p><strong>Publisher:</strong> ${book.publisher}</p>` : ''}
              </div>
            </div>

            <form id="edit-book-form" onsubmit="handleEditSubmit(event, ${bookId})">
              <div class="form-section-header">
                <span class="icon">📊</span>
                <div class="text">
                  <h3>Reading Status</h3>
                  <p>Update your current reading status</p>
                </div>
              </div>

              <div class="form-group">
                <div class="status-buttons">
                  <button type="button" class="status-btn ${book.status === 'Currently Reading' ? 'active' : ''}" 
                    data-status="Currently Reading" onclick="selectEditStatus('Currently Reading')">
                    <span class="status-icon">📖</span>
                    <span class="status-text">Currently Reading</span>
                    <span class="status-desc">Track your progress</span>
                  </button>
                  <button type="button" class="status-btn ${book.status === 'Finished' ? 'active' : ''}" 
                    data-status="Finished" onclick="selectEditStatus('Finished')">
                    <span class="status-icon">✅</span>
                    <span class="status-text">Finished</span>
                    <span class="status-desc">Rate and review</span>
                  </button>
                  <button type="button" class="status-btn ${book.status === 'Want to Read' ? 'active' : ''}" 
                    data-status="Want to Read" onclick="selectEditStatus('Want to Read')">
                    <span class="status-icon">📝</span>
                    <span class="status-text">Want to Read</span>
                    <span class="status-desc">Add to wishlist</span>
                  </button>
                </div>
              </div>

              <div class="form-section-header" style="margin-top: 40px;">
                <span class="icon">📖</span>
                <div class="text">
                  <h3>Reading Details</h3>
                  <p>Track your reading journey</p>
                </div>
              </div>

              <div class="form-group">
                <label for="edit-genre">
                  🎭 Genre
                  <span class="optional">Optional</span>
                </label>
                <div class="genre-select-wrapper">
                  <input type="text" id="edit-genre" value="${book.genre || ''}" 
                    placeholder="Select or type a genre..." 
                    onfocus="showGenreDropdown()" 
                    oninput="filterGenres(this.value); trackChange('genre', this.value)">
                  <div class="genre-dropdown" id="genre-dropdown"></div>
                </div>
                <div id="genre-badge-container"></div>
              </div>

              <div id="edit-currently-reading-fields" class="conditional-fields ${book.status === 'Currently Reading' ? 'show' : ''}">
                <div class="form-group">
                  <label for="edit-progress">
                    📈 Reading Progress
                    <span data-tooltip="Drag the slider to update your progress">ℹ️</span>
                  </label>
                  <div class="progress-slider-container">
                    <div class="progress-slider-wrapper">
                      <input type="range" class="progress-slider" id="edit-progress" 
                        min="0" max="100" value="${book.progress || 0}" 
                        oninput="updateProgressDisplay(this.value); trackChange('progress', this.value)"
                        style="--progress: ${book.progress || 0}%">
                      <div class="progress-milestones">
                        <span class="milestone">0%</span>
                        <span class="milestone">25%</span>
                        <span class="milestone">50%</span>
                        <span class="milestone">75%</span>
                        <span class="milestone">100%</span>
                      </div>
                    </div>
                    <div class="progress-display" id="progress-display">${book.progress || 0}%</div>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label for="edit-reading-time">
                      ⏱️ Reading Time
                      <span data-tooltip="Use +/- buttons or type directly">ℹ️</span>
                    </label>
                    <div class="time-picker">
                      <button type="button" onclick="adjustTime(-0.5)">−</button>
                      <input type="number" id="edit-reading-time" min="0" step="0.5" 
                        value="${book.reading_time || 0}" 
                        oninput="updateReadingSpeed(this.value, ${book.pages}); trackChange('readingTime', this.value)">
                      <button type="button" onclick="adjustTime(0.5)">+</button>
                    </div>
                    <div class="time-presets">
                      <span class="time-preset" onclick="setTime(0.5)">30 min</span>
                      <span class="time-preset" onclick="setTime(1)">1 hour</span>
                      <span class="time-preset" onclick="setTime(2)">2 hours</span>
                      <span class="time-preset" onclick="setTime(5)">5 hours</span>
                    </div>
                    <div class="reading-speed-feedback" id="reading-speed-feedback"></div>
                  </div>

                  <div class="form-group">
                    <label for="edit-last-read-current">
                      📅 Last Read Date
                      <span data-tooltip="Track when you last read this book">ℹ️</span>
                    </label>
                    <input type="date" id="edit-last-read-current" value="${book.last_read_date ? book.last_read_date.split('T')[0] : ''}"
                      oninput="updateDaysAgoCurrent(this.value); trackChange('lastReadDate', this.value)">
                    <div class="date-quick-actions">
                      <span class="date-quick-btn" onclick="setLastReadTodayCurrent()">📅 Today</span>
                      <span class="date-quick-btn" onclick="setLastReadYesterdayCurrent()">⏮️ Yesterday</span>
                    </div>
                    <div class="days-ago" id="days-ago-current"></div>
                  </div>
                </div>
              </div>

              <div id="edit-finished-fields" class="conditional-fields ${book.status === 'Finished' ? 'show' : ''}">
                <div class="form-group">
                  <label>
                    ⭐ Your Rating
                    <span class="required">*</span>
                  </label>
                  <div class="star-rating-input" id="edit-rating-stars">
                    ${[1,2,3,4,5].map(i => `
                      <button type="button" class="${i <= (book.rating || 0) ? 'active' : ''}" 
                        onclick="setEditRating(${i}); trackChange('rating', ${i})">★</button>
                    `).join('')}
                  </div>
                  <input type="hidden" id="edit-rating" value="${book.rating || 0}">
                  <div class="star-rating-labels">
                    ${RATING_LABELS.map(label => `<span>${label}</span>`).join('')}
                  </div>
                  <div class="rating-feedback" id="rating-feedback"></div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label for="edit-finish-date">
                      📅 Date Finished
                      <span class="optional">Optional</span>
                    </label>
                    <input type="date" id="edit-finish-date" value="${book.last_read_date ? book.last_read_date.split('T')[0] : ''}"
                      oninput="updateDaysAgo(this.value); trackChange('lastReadDate', this.value)">
                    <div class="date-quick-actions">
                      <span class="date-quick-btn" onclick="setToday()">📅 Today</span>
                      <span class="date-quick-btn" onclick="setYesterday()">⏮️ Yesterday</span>
                    </div>
                    <div class="days-ago" id="days-ago"></div>
                  </div>

                  <div class="form-group">
                    <label for="edit-total-reading-time">
                      ⏱️ Total Reading Time
                      <span class="optional">Optional</span>
                    </label>
                    <div class="time-picker">
                      <button type="button" onclick="adjustTotalTime(-0.5)">−</button>
                      <input type="number" id="edit-total-reading-time" min="0" step="0.5" 
                        value="${book.reading_time || 0}"
                        oninput="trackChange('readingTime', this.value)">
                      <button type="button" onclick="adjustTotalTime(0.5)">+</button>
                    </div>
                    <div class="time-presets">
                      <span class="time-preset" onclick="setTotalTime(1)">1 hour</span>
                      <span class="time-preset" onclick="setTotalTime(5)">5 hours</span>
                      <span class="time-preset" onclick="setTotalTime(10)">10 hours</span>
                      <span class="time-preset" onclick="setTotalTime(20)">20 hours</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="form-section-header" style="margin-top: 40px;">
                <span class="icon">💭</span>
                <div class="text">
                  <h3>Personal Notes</h3>
                  <p>Share your thoughts and reflections</p>
                </div>
              </div>

              <div class="form-group">
                <label for="edit-notes">
                  📝 Notes
                  <span class="optional">Optional</span>
                </label>
                <div class="mood-buttons">
                  <span class="mood-btn" onclick="toggleMood(this, '😍')" title="Loved it!">😍</span>
                  <span class="mood-btn" onclick="toggleMood(this, '❤️')" title="Heart">❤️</span>
                  <span class="mood-btn" onclick="toggleMood(this, '🤔')" title="Thought-provoking">🤔</span>
                  <span class="mood-btn" onclick="toggleMood(this, '😴')" title="Boring">😴</span>
                  <span class="mood-btn" onclick="toggleMood(this, '🤯')" title="Mind-blowing">🤯</span>
                  <span class="mood-btn" onclick="toggleMood(this, '😢')" title="Emotional">😢</span>
                  <span class="mood-btn" onclick="toggleMood(this, '😂')" title="Funny">😂</span>
                </div>
                <div class="template-suggestions">
                  <span class="template-btn" onclick="insertTemplate('What I loved: ')">💖 What I loved...</span>
                  <span class="template-btn" onclick="insertTemplate('Favorite quote: ')">💬 Favorite quote...</span>
                  <span class="template-btn" onclick="insertTemplate('Key takeaway: ')">🔑 Key takeaway...</span>
                </div>
                <textarea id="edit-notes" placeholder="Share your thoughts, favorite quotes, or key takeaways..." 
                  maxlength="1000" oninput="updateCharCount(this); trackChange('notes', this.value)">${book.notes || ''}</textarea>
                <div class="character-counter" id="char-counter">0 / 1000</div>
              </div>
            </form>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-modal-cancel" onclick="closeAllModals()">Cancel</button>
            <button type="submit" form="edit-book-form" class="btn-modal-save" id="edit-submit-btn">
              💾 Save Changes
            </button>
          </div>
        </div>
      </div>
    `;

    const modalDiv = document.createElement('div');
    modalDiv.innerHTML = modalHTML;
    document.body.appendChild(modalDiv.firstElementChild);
    document.body.classList.add('modal-open');

    window.currentEditStatus = book.status;
    window.currentEditRating = book.rating || 0;

    setTimeout(() => {
      const notesField = document.getElementById('edit-notes');
      if (notesField) {
        updateCharCount(notesField);
      }
      
      const dateFieldCurrent = document.getElementById('edit-last-read-current');
      if (dateFieldCurrent) {
        if (!dateFieldCurrent.value) {
          const today = new Date().toISOString().split('T')[0];
          dateFieldCurrent.value = today;
        }
        updateDaysAgoCurrent(dateFieldCurrent.value);
      }

      const dateField = document.getElementById('edit-finish-date');
      if (dateField && dateField.value) {
        updateDaysAgo(dateField.value);
      }

      const timeField = document.getElementById('edit-reading-time');
      if (timeField && timeField.value && book.pages) {
        updateReadingSpeed(timeField.value, book.pages);
      }

      if (book.genre) {
        showGenreBadge(book.genre);
      }

      if (book.rating) {
        showRatingFeedback(book.rating);
      }

      renderGenreDropdown();
    }, 100);

  } catch (error) {
    console.error('Failed to load book:', error);
    showNotification('Failed to load book details', 'error');
  }
}


async function handleEditSubmit(event, bookId) {
  event.preventDefault();

  if (!window.currentEditStatus) {
    showNotification('Please select a reading status', 'error');
    return;
  }

  if (window.currentEditStatus === 'Finished' && window.currentEditRating === 0) {
    showNotification('Please rate the book before saving', 'error');
    document.getElementById('edit-rating-stars').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const submitBtn = document.getElementById('edit-submit-btn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="loading-spinner"></span> Saving...';

  try {
    const updates = {
      status: window.currentEditStatus,
      genre: document.getElementById('edit-genre').value || 'Unknown'
    };

    if (window.currentEditStatus === 'Currently Reading') {
      updates.progress = parseInt(document.getElementById('edit-progress').value) || 0;
      updates.readingTime = parseFloat(document.getElementById('edit-reading-time').value) || 0;
      
      const lastReadCurrent = document.getElementById('edit-last-read-current');
      if (lastReadCurrent && lastReadCurrent.value) {
        updates.lastReadDate = lastReadCurrent.value;
      }
    } else if (window.currentEditStatus === 'Finished') {
      updates.rating = window.currentEditRating;
      updates.lastReadDate = document.getElementById('edit-finish-date').value;
      updates.readingTime = parseFloat(document.getElementById('edit-total-reading-time').value) || 0;
      updates.progress = 100;
    }

    const notes = document.getElementById('edit-notes').value.trim();
    if (notes) {
      updates.notes = notes;
    }

    await api.updateBook(bookId, updates);

    submitBtn.innerHTML = '✓ Saved!';
    submitBtn.classList.add('saved');
    
    showNotification('✅ Book updated successfully!', 'success');
    
    setTimeout(() => {
      closeAllModals();
      loadBooksFromAPI();
    }, 1000);

  } catch (error) {
    console.error('Failed to update book:', error);
    showNotification('Failed to update book', 'error');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '💾 Save Changes';
  }
}


function openDeleteModal(bookId, bookTitle) {
  const modalHTML = `
    <div class="modal-overlay" onclick="handleOverlayClick(event)">
      <div class="modal-container confirmation">
        <div class="modal-header">
          <h2>🗑️ Delete Book</h2>
          <button class="modal-close" onclick="closeAllModals()">×</button>
        </div>
        
        <div class="confirmation-content">
          <div class="confirmation-icon">⚠️</div>
          <div class="confirmation-message">Are you sure you want to delete</div>
          <div class="confirmation-book-title">"${bookTitle}"</div>
          <div class="confirmation-warning">This action cannot be undone.</div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-modal-cancel" onclick="closeAllModals()">Cancel</button>
          <button type="button" class="btn-modal-delete" onclick="handleDelete(${bookId})">
            🗑️ Delete Book
          </button>
        </div>
      </div>
    </div>
  `;

  const modalDiv = document.createElement('div');
  modalDiv.innerHTML = modalHTML;
  document.body.appendChild(modalDiv.firstElementChild);
  document.body.classList.add('modal-open');
}


async function handleDelete(bookId) {
  const deleteBtn = event.target;
  deleteBtn.disabled = true;
  deleteBtn.innerHTML = '<span class="loading-spinner"></span> Deleting...';

  try {
    await api.deleteBook(bookId);
    
    showNotification('✅ Book deleted successfully!', 'success');
    closeAllModals();
    
    await loadBooksFromAPI();

  } catch (error) {
    console.error('Failed to delete book:', error);
    showNotification('Failed to delete book', 'error');
    deleteBtn.disabled = false;
    deleteBtn.innerHTML = '🗑️ Delete Book';
  }
}


window.initializeModals = initializeModals;
window.openEditModal = openEditModal;
window.openDeleteModal = openDeleteModal;
window.closeAllModals = closeAllModals;
window.handleOverlayClick = handleOverlayClick;
window.selectEditStatus = selectEditStatus;
window.setEditRating = setEditRating;
window.handleEditSubmit = handleEditSubmit;
window.handleDelete = handleDelete;
window.showGenreDropdown = showGenreDropdown;
window.hideGenreDropdown = hideGenreDropdown;
window.filterGenres = filterGenres;
window.selectGenre = selectGenre;
window.updateProgressDisplay = updateProgressDisplay;
window.adjustTime = adjustTime;
window.adjustTotalTime = adjustTotalTime;
window.setTime = setTime;
window.setTotalTime = setTotalTime;
window.setToday = setToday;
window.setYesterday = setYesterday;
window.updateDaysAgo = updateDaysAgo;
window.setLastReadTodayCurrent = setLastReadTodayCurrent;
window.setLastReadYesterdayCurrent = setLastReadYesterdayCurrent;
window.updateDaysAgoCurrent = updateDaysAgoCurrent;
window.updateCharCount = updateCharCount;
window.toggleMood = toggleMood;
window.insertTemplate = insertTemplate;
window.trackChange = trackChange;