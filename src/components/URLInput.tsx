/**
 * URL input component for entering the website to test
 */

import { useState } from 'react';

interface URLInputProps {
  url: string;
  onUrlChange: (url: string) => void;
  onNavigate: () => void;
  isLoading: boolean;
}

const URLInput: React.FC<URLInputProps> = ({ url, onUrlChange, onNavigate, isLoading }) => {
  const [inputValue, setInputValue] = useState(url || '');

  interface NormalizeUrlFn {
    (input: string): string;
  }

  const normalizeUrl: NormalizeUrlFn = (input) => {
    const trimmed = input.trim();
    if (!trimmed) return '';

    // Add https:// if no protocol specified
    if (!trimmed.match(/^https?:\/\//)) {
      return `https://${trimmed}`;
    }
    return trimmed;
  };

  interface HandleSubmitEvent extends React.FormEvent<HTMLFormElement> { }

  const handleSubmit = (e: HandleSubmitEvent): void => {
    e.preventDefault();
    if (inputValue.trim()) {
      const normalizedUrl = normalizeUrl(inputValue);
      onUrlChange(normalizedUrl);
      onNavigate();
    }
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    if (value.trim()) {
      const normalizedUrl = normalizeUrl(value);
      onUrlChange(normalizedUrl);
    } else {
      onUrlChange('');
    }
  };  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-lg font-medium text-gray-900 mb-3 text-center">Website Start URL</h3>      <div className="flex justify-center">
        <form onSubmit={handleSubmit} className="flex space-x-2 items-center w-full max-w-6xl">
          <div className="relative flex-1">
            <input
              id="url-input"
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              placeholder="URL"
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-left"
              disabled={isLoading}
              required
            />
            {inputValue && (
              <button
                type="button"
                onClick={() => {
                  setInputValue('');
                  onUrlChange('');
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                title="Clear URL"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="px-8 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            {isLoading ? 'Loading...' : 'Start'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default URLInput;
