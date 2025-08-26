import React from 'react';

interface AuthenticationDetourPanelProps {
  isVisible: boolean;
  targetUrl: string;
  onContinue: () => void;
  onCancel: () => void;
}

/**
 * Floating panel that appears during authentication detour.
 * Allows user to manually control when to proceed with recording.
 */
export const AuthenticationDetourPanel: React.FC<AuthenticationDetourPanelProps> = ({
  isVisible,
  targetUrl,
  onContinue,
  onCancel
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4 border-l-4 border-blue-500">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              🔐 Authentication Required
            </h3>
            
            <p className="text-sm text-gray-600 mb-4">
              A browser window has opened for <strong>{new URL(targetUrl).hostname}</strong>.
              Please sign in to the website, then click <strong>Continue Recording</strong> below.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
              <div className="text-xs font-medium text-blue-800 mb-1">Instructions:</div>
              <ol className="text-xs text-blue-700 space-y-1">
                <li>1. Sign in to the website in the browser window</li>
                <li>2. Verify you can access authenticated content</li>
                <li>3. Click "Continue Recording" below</li>
              </ol>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={onContinue}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                ✅ Continue Recording
              </button>
              
              <button
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
