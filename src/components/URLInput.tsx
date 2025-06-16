/**
 * URL input component for entering the website to test
 */

import { useState } from 'react';

const URLInput = ({ url, onUrlChange, onNavigate, isLoading }) => {
  const [inputValue, setInputValue] = useState(url || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onUrlChange(inputValue.trim());
      onNavigate(inputValue.trim());
    }
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    onUrlChange(e.target.value);
  };

  return (
    <div className="space-y-2">
      <label htmlFor="url-input" className="block text-sm font-medium text-gray-700">
        Website URL to Test
      </label>
      
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <input
          id="url-input"
          type="url"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="https://example.com"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          disabled={isLoading}
          required
        />
        
        <button
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Loading...' : 'Navigate'}
        </button>
      </form>
      
      {url && (
        <p className="text-xs text-gray-500">
          Current: <span className="font-mono">{url}</span>
        </p>
      )}
    </div>
  );
};

export default URLInput;
