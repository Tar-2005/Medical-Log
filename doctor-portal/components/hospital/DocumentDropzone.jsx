'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePatient } from '../../context/PatientContext';

export default function DocumentDropzone({ patientId, onProcessed }) {
  const { token } = useAuth();
  const { addOptimisticUpload } = usePatient();
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setError('');
    setUploadSuccess(false);
    setResult(null);
    
    if (rejectedFiles.length > 0) {
      setError('Invalid file type. Please upload a DOCX, PDF, PNG, JPG, or JPEG file.');
      return;
    }

    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      
      // Create thumbnail preview for images
      if (selectedFile.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(selectedFile));
      } else {
        setPreviewUrl(null);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024
  });

  const handleExtractData = async () => {
    if (!file) return;
    if (!patientId?.trim()) {
      setError('Enter a patient ID before processing the document.');
      return;
    }

    setIsUploading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('document', file);
    formData.append('patientId', patientId.trim());

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch(`${baseUrl}/agents/analyst`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Failed to extract data. Ensure OCR and the local AI model are running.');
      }

      const data = await response.json();
      setResult(data);
      setUploadSuccess(true);
      // Instantly add the document to the doctor's timeline (optimistic update)
      addOptimisticUpload?.(file.name, data?.count ?? 0, data?.observations?.[0]?.document_url);
      onProcessed?.(data);
    } catch (err) {
      setError(err.message || 'An error occurred during extraction.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (e) => {
    e.stopPropagation();
    setFile(null);
    setPreviewUrl(null);
    setUploadSuccess(false);
    setResult(null);
    setError('');
  };

  return (
    <div className="w-full max-w-3xl mx-auto mb-8">
      <div className="bg-surface rounded-2xl shadow-xl border border-border overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-background/50">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <UploadCloud size={20} className="text-primary" />
            Historic Record Digitization
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Securely upload external medical records. Our local AI analyst will securely extract and map the data to the FHIR timeline.
          </p>
        </div>

        {/* Dropzone Area */}
        <div className="p-6">
          {!file ? (
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-surface-hover'}`}
            >
              <input {...getInputProps()} />
              <div className="mx-auto w-16 h-16 bg-background rounded-full flex items-center justify-center mb-4 shadow-sm border border-border text-text-muted">
                <UploadCloud size={28} />
              </div>
              <p className="text-text-primary font-medium mb-1">
                Drag & drop a document here
              </p>
              <p className="text-text-muted text-sm">
                Supported formats: .docx, .pdf, .png, .jpg, .jpeg (Max 10MB)
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              {/* Preview Area */}
              <div className="relative w-full max-w-sm rounded-lg border border-border overflow-hidden bg-background mb-6 flex justify-center items-center min-h-[200px]">
                {previewUrl ? (
                  <Image
                    src={previewUrl}
                    alt="Document Preview"
                    width={320}
                    height={300}
                    unoptimized
                    className="max-h-[300px] w-auto object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center text-text-muted p-10">
                    <FileText size={64} className="mb-4 opacity-50" />
                    <span className="font-mono text-sm">{file.name}</span>
                  </div>
                )}
                <button 
                  onClick={removeFile}
                  disabled={isUploading}
                  className="absolute top-2 right-2 bg-danger/90 text-white text-xs px-2 py-1 rounded hover:bg-danger transition-colors"
                >
                  Remove
                </button>
              </div>

              {/* Status and Action */}
              {error && (
                <div className="mb-4 text-sm text-danger text-center bg-danger/10 p-3 rounded-lg w-full">
                  {error}
                </div>
              )}

              {uploadSuccess ? (
                <div className="flex flex-col items-center text-success mb-2">
                  <CheckCircle2 size={48} className="mb-2" />
                  <p className="font-medium text-lg">Extraction Complete</p>
                  <p className="text-sm text-text-muted text-center mt-1">
                    {result?.count ?? 0} observation{result?.count === 1 ? '' : 's'} structured into FHIR and appended to the patient timeline.
                  </p>
                  <button 
                    onClick={removeFile}
                    className="mt-6 text-sm text-primary hover:underline"
                  >
                    Upload another document
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleExtractData}
                  disabled={isUploading}
                  className={`w-full py-3 px-6 rounded-xl font-medium text-white flex items-center justify-center gap-2 transition-all
                    ${isUploading ? 'bg-primary/70 cursor-not-allowed' : 'bg-primary hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/20'}`}
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Vision AI is Extracting FHIR Data...
                    </>
                  ) : (
                    <>
                      <FileText size={20} />
                      Extract Data via AI Analyst
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
