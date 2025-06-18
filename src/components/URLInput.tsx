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
  };

  return (
    <div className="space-y-4">
      <label htmlFor="url-input" className="block text-med font-medium text-gray-700 text-left">
        Website Start URL
      </label>
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <input
          id="url-input"
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="URL"
          className="flex-1 max-w-2xl px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-left"
          disabled={isLoading}
          required
        />

        <button
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          className="px-8 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Loading...' : 'Start'}
        </button>
      </form>
    </div>
  );
};

export default URLInput;
