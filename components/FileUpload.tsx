
import React from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isLoading }) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onFileSelect(event.target.files[0]);
    }
  };

  return (
    <div className="mb-6 p-4 bg-gray-800 rounded-lg shadow">
      <label htmlFor="nsf-upload" className="block text-sm font-medium text-gray-300 mb-2">
        Upload NSF File (.nsf)
      </label>
      <input
        id="nsf-upload"
        type="file"
        accept=".nsf"
        onChange={handleFileChange}
        disabled={isLoading}
        className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      />
    </div>
  );
};

export default FileUpload;
