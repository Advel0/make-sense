import React, { useState, useEffect } from 'react';
import './ImportLabelPopup.scss';
import { LabelType } from '../../../data/enums/LabelType';
import { PopupActions } from '../../../logic/actions/PopupActions';
import GenericLabelTypePopup from '../GenericLabelTypePopup/GenericLabelTypePopup';
import { ImportFormatData } from '../../../data/ImportFormatData';
import { FeatureInProgress } from '../../EditorView/FeatureInProgress/FeatureInProgress';
import { AppState } from '../../../store';
import { connect } from 'react-redux';
import { useDropzone } from 'react-dropzone';
import { ImageData, LabelName } from '../../../store/labels/types';
import { updateActiveLabelType, updateImageData, updateLabelNames } from '../../../store/labels/actionCreators';
import { ImporterSpecData } from '../../../data/ImporterSpecData';
import { AnnotationFormatType } from '../../../data/enums/AnnotationFormatType';
import { ILabelFormatData } from '../../../interfaces/ILabelFormatData';
import { submitNewNotification } from '../../../store/notifications/actionCreators';
import { NotificationUtil } from '../../../utils/NotificationUtil';
import { NotificationsDataMap } from '../../../data/info/NotificationsData';
import { DocumentParsingError } from '../../../logic/import/voc/VOCImporter';
import { Notification } from '../../../data/enums/Notification';
import {LabelNamesNotUniqueError} from '../../../logic/import/yolo/YOLOErrors';

interface IProps {
    activeLabelType: LabelType,
    updateImageDataAction: (imageData: ImageData[]) => any,
    updateLabelNamesAction: (labels: LabelName[]) => any,
    updateActiveLabelTypeAction: (activeLabelType: LabelType) => any;
}

const ImportLabelPopup: React.FC<IProps> = (
    {
        activeLabelType,
        updateImageDataAction,
        updateLabelNamesAction,
        updateActiveLabelTypeAction
    }) => {
    const resolveFormatType = (labelType: LabelType): AnnotationFormatType => {
        const possibleImportFormats = ImportFormatData[labelType];
        return possibleImportFormats.length === 1 ? possibleImportFormats[0].type : null;
    };

    const [labelType, setLabelType] = useState(activeLabelType);
    const [formatType, setFormatType] = useState(resolveFormatType(activeLabelType));
    const [loadedLabelNames, setLoadedLabelNames] = useState([]);
    const [loadedImageData, setLoadedImageData] = useState([]);
    const [annotationsLoadedError, setAnnotationsLoadedError] = useState(null);

    const resolveNotification = (error: Error): Notification => {
        if (error instanceof DocumentParsingError) {
            return Notification.ANNOTATION_FILE_PARSE_ERROR
        }
        if (error instanceof LabelNamesNotUniqueError) {
            return Notification.NON_UNIQUE_LABEL_NAMES_ERROR
        }
        return Notification.ANNOTATION_IMPORT_ASSERTION_ERROR
    }

    const onLabelTypeChange = (type: LabelType) => {
        setLabelType(type);
        setFormatType(resolveFormatType(type));
        setLoadedLabelNames([]);
        setLoadedImageData([]);
        setAnnotationsLoadedError(null);
    };

    const onAnnotationLoadSuccess = (imagesData: ImageData[], labelNames: LabelName[]) => {
        setLoadedLabelNames(labelNames);
        setLoadedImageData(imagesData);
        setAnnotationsLoadedError(null);
    };
    
    const onAnnotationsLoadFailure = (error?: Error) => {
        setLoadedLabelNames([]);
        setLoadedImageData([]);
        setAnnotationsLoadedError(error);
        const notification = resolveNotification(error)
        submitNewNotification(NotificationUtil.createErrorNotification(NotificationsDataMap[notification]));
    };



    const onAccept = (type: LabelType) => {
        if (loadedLabelNames.length !== 0 && loadedImageData.length !== 0) {
            updateImageDataAction(loadedImageData);
            updateLabelNamesAction(loadedLabelNames);
            updateActiveLabelTypeAction(type);
            PopupActions.close();
        }
    };

    const onReject = (_: LabelType) => {
        PopupActions.close();
    };

    const onAnnotationFormatChange = (format: AnnotationFormatType) => {
        setFormatType(format);
    };
    
// ---
    const [LabelPaths, setLabelPaths] = useState({});
    const [labelVersions, setLabelVersions] = useState({});
    const [labelFiles, setLabelFiles] = useState([]);
    // Fetch image file locations from the server
    useEffect(() => {
        fetch('serverurl/get-labels')  // Replace with the correct server API that returns image file paths
            .then(response => response.json())
            .then(data => {
                setLabelPaths(data);
                setLabelVersions(Object.keys(data).reduce((acc, key) => {
                    acc[key] = false;
                    return acc;
                  }, {}));
            })
            .catch(error => {
                console.error('Error fetching labels:', error);
            });
    }, []);

    // Load image files from URLs and convert them into File objects
    const loadLabelFiles = async (labelPaths: string[]) => {
        const files: File[] = [];
        for (const labelPath of labelPaths) {
            try {
                const response = await fetch(`${labelPath}`);  // Assuming `/images/{imagePath}` is the URL to fetch the image
                const blob = await response.blob();
                const file = new File([blob], labelPath, { type: blob.type });
                files.push(file);
            } catch (error) {
                console.error(`Failed to load image ${labelPath}:`, error);
            }
        }
        // setLabelFiles(files);
    };


    const concatenateFiles = async function concatenateFiles(files) {
        const fileContents = [];
      
        // Read the contents of each file as text (or you could use other formats like blob)
        for (const file of files) {
          const content = await file.text();  // Using .text() to read file content
          fileContents.push(content);
        }
        
        console.log(fileContents)
        // Concatenate the file contents
        const concatenatedContent = fileContents.join("");
      
        // Create a new Blob with the concatenated content
        const concatenatedBlob = new Blob([concatenatedContent], { type: "text/plain" });
      
        // You can create a new File if needed (for example, to download it)
        const concatenatedFile = new File([concatenatedBlob], files[0].name, { type: "text/plain" });
      
        return concatenatedFile;
    }
    
    const extractLeadingNumber = function (content: string): number {
        const lines = content.split('\n');
        const lastLine = lines[lines.length - 2]; // Last non-empty line (skip empty at end)
        const leadingNumber = parseInt(lastLine.trim().split(' ')[0], 10); // Get the first number
        return leadingNumber;
    }
    

    const handleChange = async (e, version) => {  
        toggleItemCompletion(version);
    
        // Check if labelVersions[version] exists
        if (!labelVersions[version]) {
            const paths = LabelPaths[version];
            const files = [];
    
            // Fetch all files asynchronously
            for (const labelPath of paths) {
                try {
                    const response = await fetch(labelPath);  // Fetch the label from the provided path
                    const blob = await response.blob();  // Convert response to Blob
                    const file = new File([blob], labelPath, { type: blob.type });
                    files.push(file);  // Add the file to the array
                } catch (error) {
                    console.error(`Failed to load image ${labelPath}:`, error);
                }
            }
    
            // Map over the files and get just the name without the path
            const newFiles = files.map(file => {
                const fileName = file.name.split('/').pop();  // Get only the filename (without path)
                return new File([file], fileName, { type: file.type });
            });
    
            // Now update the state with the new files
            setLabelFiles(prevFiles => {
                const updatedFiles = [...prevFiles];
    
                // Process each new file
                const processFiles = async () => {
                    // Loop over new files
                    for (const newFile of newFiles) {
                        // Check if a file with the same name already exists in the state
                        const existingFileIndex = updatedFiles.findIndex(file => file.name === newFile.name);
    
                        if (existingFileIndex !== -1) {
                            // If file exists, concatenate the contents
                            const existingFile = updatedFiles[existingFileIndex];
    
                            try {
                                // Read both file contents asynchronously
                                let [existingContent, newContent] = await Promise.all([
                                    existingFile.text(),  // Read existing file content
                                    newFile.text()         // Read new file content
                                ]);
                                if (newFile.name != 'labels.txt') {
                                    const leadingNumber = extractLeadingNumber(existingContent)
                                    console.log(leadingNumber)
                                    if (true) {
                                        newContent = newContent.split('\n').map(line =>{
                                            return line.replace(/^0\s/, `${leadingNumber+1} `)
                                        }).join('\n')
                                    }
                                }
                                const concatenatedContent = existingContent + '\n' + newContent;
                                console.log(concatenatedContent)
                                // Create a new file with the concatenated content
                                const concatenatedFile = new File([concatenatedContent], newFile.name, {
                                    type: newFile.type,
                                });
    
                                // Replace the existing file with the concatenated one
                                updatedFiles[existingFileIndex] = concatenatedFile;
                            } catch (error) {
                                console.error("Error concatenating files:", error);
                            }
                        } else {
                            // If no file with the same name exists, add the new file to the list
                            updatedFiles.push(newFile);
                        }
                    }
    
                    // Set the new updated state after all files are processed
                    setLabelFiles([...updatedFiles]);
    
                    // Log the concatenated content (optional)
                    console.log("Files processed and state updated");
    
                    // Call the importer after all files are processed
                    const importer = new (ImporterSpecData[formatType])([labelType]);
                    importer.import(updatedFiles, onAnnotationLoadSuccess, onAnnotationsLoadFailure);
                };
    
                // Process files asynchronously
                processFiles();
                
                // Return the updated files for future use
                return updatedFiles;
            });
        }
    };
    
    
    const toggleItemCompletion = (version) => {
        setLabelVersions((prevCheckedItems) => ({
            ...prevCheckedItems,
            [version]: !prevCheckedItems[version], // Toggle the checked value
          }));
    };
// ---

    const getDropZoneContent = () => {
        if (annotationsLoadedError) {
            return <>
                
                <img
                    draggable={false}
                    alt={'upload'}
                    src={'ico/box-opened.png'}
                />
                <p className='extraBold'>Annotation import was unsuccessful</p>
                {annotationsLoadedError.message}
                <p className='extraBold'>Try again</p>
            </>;
        } else {
            return <>
                <img
                    draggable={false}
                    alt={'upload'}
                    src={'ico/box-opened.png'}
                />
                {/* Checkbox list */}
                <div className='Options'>
                    {Object.keys(labelVersions).map((version)=>{
                        return <div className='OptionsItem'  key={version}>
                        <input type="checkbox" checked={labelVersions[version]} onChange={(e) => handleChange(e, version)}/>
                           {version}
                    </div>
                    })}
                </div>
            </>;
        }
    };

    const getOptions = (exportFormatData: ILabelFormatData[]) => {
        return exportFormatData.map((entry: ILabelFormatData) => {
            return <div
                className='OptionsItem'
                onClick={() => onAnnotationFormatChange(entry.type)}
                key={entry.type}
            >
                {entry.type === formatType ?
                    <img
                        draggable={false}
                        src={'ico/checkbox-checked.png'}
                        alt={'checked'}
                    /> :
                    <img
                        draggable={false}
                        src={'ico/checkbox-unchecked.png'}
                        alt={'unchecked'}
                    />}
                {entry.label}
            </div>;
        });
    };

    const renderInternalContent = (type: LabelType) => {
        if (!formatType && ImportFormatData[type].length !== 0) {
            return <>
                <div className='Message'>
                    Select file format you would like to use to import labels.
                </div>,
                <div className='Options'>
                    {getOptions(ImportFormatData[type])}
                </div>
            </>;
        }
        const importFormatData = ImportFormatData[type];
        return importFormatData.length === 0 ?
            <FeatureInProgress /> :
            <div className="DropZone">
                {getDropZoneContent()}
            </div>;
    };

    return (
        <GenericLabelTypePopup
            activeLabelType={labelType}
            title={`Import ${labelType.toLowerCase()} annotations`}
            onLabelTypeChange={onLabelTypeChange}
            acceptLabel={'Import'}
            onAccept={onAccept}
            skipAcceptButton={ImportFormatData[labelType].length === 0}
            disableAcceptButton= {Object.values(labelVersions).filter(value => value === true).length == 0} //{labelVersions.length === 0 || loadedLabelNames.length === 0 || !!annotationsLoadedError}
            rejectLabel={'Cancel'}
            onReject={onReject}
            renderInternalContent={renderInternalContent}
        />
    );
};

const mapDispatchToProps = {
    updateImageDataAction: updateImageData,
    updateLabelNamesAction: updateLabelNames,
    updateActiveLabelTypeAction: updateActiveLabelType
};

const mapStateToProps = (state: AppState) => ({
    activeLabelType: state.labels.activeLabelType,
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(ImportLabelPopup);
