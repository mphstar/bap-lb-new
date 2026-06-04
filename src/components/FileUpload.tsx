import React, { useRef, useState } from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { useDialog } from '@/context/DialogContext';

interface FileUploadProps {
    onFileSelect: (file: File) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect }) => {
    const [dragActive, setDragActive] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState<string | null>(null);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const { showAlert } = useDialog();

    const handleFile = (file: File) => {
        if (file.name.endsWith('.xlsx')) {
            setFileName(file.name);
            onFileSelect(file);
        } else {
            showAlert("Format File Salah", "Harap unggah file spreadsheet dalam format .xlsx");
        }
    }

    return (
        <div className="w-full max-w-xl mx-auto p-6">
            <div
                className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors
          ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
            >
                <input
                    ref={inputRef}
                    type="file"
                    className="hidden"
                    accept=".xlsx"
                    onChange={handleChange}
                />

                {fileName ? (
                    <div className="flex flex-col items-center text-green-600">
                        <FileSpreadsheet className="w-12 h-12 mb-3" />
                        <p className="text-lg font-medium">{fileName}</p>
                        <p className="text-sm text-gray-500 mt-1">Click to replace</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center text-gray-500">
                        <Upload className="w-12 h-12 mb-3" />
                        <p className="text-lg font-medium">Click or drag Excel file here</p>
                        <p className="text-sm mt-1">Supports .xlsx</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FileUpload;
