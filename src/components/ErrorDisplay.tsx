/**
 * Error display component for showing user-friendly error messages
 */

import React from 'react';

interface ErrorDisplayProps {
  error: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error }) => {
  return (
    <div className="status-error rounded-md p-4">
      <div className="flex">
        <div className="ml-3">
          <h3 className="text-base font-medium">
            Error
          </h3>
          <div className="mt-2 text-base opacity-90">
            {error}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;
