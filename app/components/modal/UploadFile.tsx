import React, { useState } from "react";
import {
    Box,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    IconButton
} from "@mui/material";
import { useForm } from "react-hook-form";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import CloseIcon from "@mui/icons-material/Close";
import { useTranslation } from 'react-i18next';

interface UploadFileProps {
    open: boolean;
    onClose: () => void;
    onUploadFile: (file: File) => void;
    allowedTypes?: string[];
    title: string | undefined;
    errorsAPI?: Record<string, string[]>;
    sampleFileUrl?: string;
}

const defaultAllowedTypes = ["xlsx", "csv", "jpeg", "png", "jpg", "pdf", "doc", "docx"];

const UploadFileModal: React.FC<UploadFileProps> = ({
    open,
    onClose,
    onUploadFile,
    allowedTypes = defaultAllowedTypes,
    title,
    errorsAPI = {},
    sampleFileUrl,
}) => {
    const { t } = useTranslation();

    const { register, handleSubmit, setError, clearErrors, formState: { errors } } = useForm<{ file: FileList }>();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const validateFile = (file: File) => {
        const fileExtension = file.name.split(".").pop()?.toLowerCase();
        return fileExtension && allowedTypes.includes(fileExtension);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;

        if (!file) {
            setSelectedFile(null);
            setError("file", { type: "manual", message: t('validation.fileIsRequired') });
            return;
        }

        if (!validateFile(file)) {
            setSelectedFile(null);
            setError("file", { type: "manual", message: t('validation.invalidFileFormat') });

            return;
        }

        setSelectedFile(file);
        clearErrors("file");
    };

    const onSubmit = () => {
        if (selectedFile) {
            onUploadFile(selectedFile);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" >
            <DialogTitle sx={{ backgroundColor: '#34495e', color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>
                {title || t('common.uploadFile')}
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{ color: '#ffffff', position: "absolute", right: 8, top: 8 }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent>
                {errorsAPI && (
                    <div style={{ color: 'red', marginBottom: '1rem' }}>
                        {Object.entries(errorsAPI).map(([key, value]) => (
                            <ul key={key} style={{ marginBottom: '10px' }}>
                                <li>
                                    <span>
                                        <strong>{key}:</strong> {value}
                                    </span>
                                </li>
                            </ul>
                        ))}
                    </div>
                )}
                <Box sx={{ padding: '30px 0' }}>
                    <input
                        type="file"
                        {...register("file", { required: "Plik jest wymagany" })}
                        accept={allowedTypes.map(ext => `.${ext}`).join(",")}
                        style={{ display: "none" }}
                        id="file-input"
                        onChange={handleFileChange}
                    />
                    <label htmlFor="file-input">
                        <Button
                            variant="contained"
                            component="span"
                            startIcon={<CloudUploadIcon />}
                            fullWidth

                        >
                            {t('common.button.chooseFile')}
                        </Button>
                    </label>

                    {sampleFileUrl && (
                        <Button
                            href={sampleFileUrl}
                            download
                            variant="outlined"
                            startIcon={<FileDownloadOutlinedIcon />}
                            fullWidth
                            sx={{ mt: 2 }}
                        >
                            {t('common.button.downloadSampleFile')}
                        </Button>
                    )}

                    {selectedFile && (
                        <TextField
                            value={selectedFile.name}
                            fullWidth
                            margin="normal"
                        />
                    )}

                    <div>
                        {/* Progress percent upload on client , no on backend */}
                    </div>
                </Box>

                <Box>
                    {errors.file && (
                        <p style={{ color: "red", fontSize: "14px" }}>{errors.file.message}</p>
                    )}
                </Box>
            </DialogContent>

            <DialogActions>
                <Button
                    onClick={onClose}
                    variant="contained"
                    sx={{ backgroundColor: '#999a99', color: 'white', fontWeight: 'bold' }}
                >
                    {t('common.button.cancel')}
                </Button>
                <Button
                    onClick={handleSubmit(onSubmit)}
                    variant="contained"
                    disabled={!selectedFile}
                    sx={{ backgroundColor: '#34495e', color: 'white', fontWeight: 'bold' }}
                >
                    {t('common.button.sendFile')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default UploadFileModal;
